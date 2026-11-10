import { describe, expect, it } from 'vitest';
import {
  becomeClass,
  buildIndex,
  choiceState,
  choose,
  classOptions,
  currentClasses,
  currentNode,
  describeCondition,
  describeEffects,
  evaluate,
  loadSave,
  next,
  pickClass,
  startPlay,
} from './core.js';
import type { ClassDef, Condition, VariableDef } from '../types';
import { migrateProject } from '../project';
import { exploreRoutes } from '../analysis/explore';

const variables: VariableDef[] = [
  { id: 'str', name: 'strength', type: 'number', initial: 1 },
  { id: 'mana', name: 'mana', type: 'number', initial: 0 },
  { id: 'sword', name: 'sword', type: 'bool', initial: false },
  { id: 'shield', name: 'shield', type: 'bool', initial: false },
];
const fx = (varId: string, op: 'set' | 'add', value: number | boolean) => ({ id: `${varId}-${op}`, varId, op, value });
const classes: ClassDef[] = [
  { id: 'war', name: 'Warrior', icon: '⚔️', effects: [fx('str', 'set', 8), fx('sword', 'set', true)] },
  { id: 'mage', name: 'Mage', icon: '🔥', effects: [fx('mana', 'set', 10)] },
  { id: 'knight', name: 'Knight', parentId: 'war', effects: [fx('shield', 'set', true), fx('str', 'add', 1)] },
  { id: 'pyro', name: 'Pyromancer', parentId: 'mage', effects: [fx('mana', 'add', 5)] },
];
const base = { str: 1, mana: 0, sword: false, shield: false };

describe('becoming a class', () => {
  it('a class runs its effects', () => {
    const v = becomeClass(classes, base, 'war');
    expect(v).toMatchObject({ '@class': 'war', '@subclass': '', str: 8, sword: true });
  });
  it('a promotion (already in the parent) runs only the sub-class effects', () => {
    const warrior = { ...becomeClass(classes, base, 'war'), str: 11 }; // earned +3 on the way
    const v = becomeClass(classes, warrior, 'knight');
    expect(v).toMatchObject({ '@class': 'war', '@subclass': 'knight', str: 12, shield: true });
  });
  it('a sub-class from nothing runs the parent first, then the sub-class', () => {
    const v = becomeClass(classes, base, 'knight');
    expect(v).toMatchObject({ '@class': 'war', '@subclass': 'knight', str: 9, sword: true, shield: true });
  });
  it('switching class clears the sub-class and keeps old values', () => {
    const v = becomeClass(classes, becomeClass(classes, base, 'knight'), 'mage');
    expect(v).toMatchObject({ '@class': 'mage', '@subclass': '', mana: 10, sword: true });
  });
  it('unknown class does nothing; "become" inside class effects is ignored', () => {
    expect(becomeClass(classes, base, 'nope')).toBe(base);
    const loop: ClassDef[] = [{ id: 'a', name: 'A', effects: [{ id: 'x', varId: '', op: 'become', value: 'a' }, fx('str', 'set', 3)] }];
    expect(becomeClass(loop, base, 'a')).toMatchObject({ '@class': 'a', str: 3 });
  });
  it('currentClasses lists class then sub-class', () => {
    expect(currentClasses(classes, becomeClass(classes, base, 'pyro')).map((c) => c.name)).toEqual(['Mage', 'Pyromancer']);
    expect(currentClasses(classes, base)).toEqual([]);
  });
});

describe('class rules', () => {
  const isMage: Condition = { mode: 'all', clauses: [{ id: '1', kind: 'class', classId: 'mage', cmp: '==', varId: '', value: '' }] };
  const notMage: Condition = { mode: 'all', clauses: [{ id: '1', kind: 'class', classId: 'mage', cmp: '!=', varId: '', value: '' }] };
  it('a parent class includes its sub-classes', () => {
    expect(evaluate(isMage, becomeClass(classes, base, 'mage'))).toBe(true);
    expect(evaluate(isMage, becomeClass(classes, base, 'pyro'))).toBe(true);
    expect(evaluate(isMage, becomeClass(classes, base, 'war'))).toBe(false);
    expect(evaluate(isMage, base)).toBe(false);
    expect(evaluate(notMage, base)).toBe(true);
  });
  it('describes rules and effects with class names', () => {
    expect(describeCondition(isMage, variables, classes)).toBe('🔥 Mage');
    expect(describeCondition(notMage, variables, classes)).toBe('not 🔥 Mage');
    expect(describeEffects([{ id: 'b', varId: '', op: 'become', value: 'war' }], variables, classes)).toBe('become ⚔️ Warrior');
    expect(describeCondition(isMage, variables, [])).toBe('(deleted class)');
  });
});

describe('Choose class card + become effect in a story', () => {
  const story = {
    variables,
    classes,
    arcs: [
      {
        id: 'A',
        name: 'A',
        nodes: [
          { id: 'pick', type: 'classpick', position: { x: 0, y: 0 }, data: { kind: 'classpick', mode: 'class', options: [], savePoint: true } },
          {
            id: 'd',
            type: 'decision',
            data: {
              kind: 'decision',
              choices: [
                { id: 'fire', label: 'Cast fire', condition: { mode: 'all', clauses: [{ id: 'c', kind: 'class', classId: 'mage', cmp: '==', varId: '', value: '' }] } },
                { id: 'temple', label: 'Go to the temple' },
              ],
            },
          },
          { id: 'sub', type: 'classpick', data: { kind: 'classpick', mode: 'subclass', options: [] } },
          { id: 'end1', type: 'end', data: { kind: 'end', title: 'Fire' } },
          { id: 'end2', type: 'end', data: { kind: 'end', title: 'Temple' } },
        ],
        edges: [
          { source: 'pick', target: 'd' },
          { source: 'd', sourceHandle: 'choice-fire', target: 'end1' },
          { source: 'd', sourceHandle: 'choice-temple', target: 'sub' },
          { source: 'sub', target: 'end2' },
        ],
      },
    ],
  };
  const idx = buildIndex(story as never);

  it('offers top-level classes, waits for a pick, then continues', () => {
    const s = startPlay(idx, 'A');
    expect(classOptions(idx, s, currentNode(idx, s)).map((c) => c.id)).toEqual(['war', 'mage']);
    expect(next(idx, s)).toBe(s); // Next does nothing while there is something to pick
    expect(pickClass(idx, s, 'knight')).toBe(s); // not offered here
    const m = pickClass(idx, s, 'mage');
    expect(m.currentId).toBe('d');
    expect(m.vars).toMatchObject({ '@class': 'mage', mana: 10 });
    const fire = (currentNode(idx, m)!.data.choices as never[])[0];
    expect(choiceState(fire, m.vars).available).toBe(true);
    // save point on the pick card → going back lets you choose again, class cleared
    const back = loadSave(choose(idx, m, 'fire'));
    expect(back.currentId).toBe('pick');
    expect(back.vars['@class']).toBeUndefined();
  });

  it('sub-class mode offers only sub-classes of the current class; nothing to offer → Next', () => {
    const w = choose(idx, pickClass(idx, startPlay(idx, 'A'), 'war'), 'temple');
    expect(w.currentId).toBe('sub');
    expect(classOptions(idx, w, currentNode(idx, w)).map((c) => c.id)).toEqual(['knight']);
    expect(pickClass(idx, w, 'pyro')).toBe(w);
    const k = pickClass(idx, w, 'knight');
    expect(k.currentId).toBe('end2');
    expect(k.vars).toMatchObject({ '@class': 'war', '@subclass': 'knight', str: 9 });
  });

  it('the route explorer tries every class and lists the classes per ending', () => {
    const arcs = story.arcs.map((a) => ({ ...a, nodes: a.nodes.map((n, i) => ({ position: { x: i * 100, y: 0 }, ...n })) }));
    const p = migrateProject({ version: 3, meta: { title: 't' }, activeArcId: 'A', arcs, variables, classes });
    const r = exploreRoutes(p);
    const byTitle = Object.fromEntries(r.endings.map((e) => [e.label, e]));
    expect(byTitle.Fire.reachable).toBe(true);
    expect(byTitle.Fire.classes).toEqual(['🔥 Mage']);
    expect(byTitle.Temple.classes).toEqual(['⚔️ Warrior · Knight', '🔥 Mage · Pyromancer']);
    expect(r.alwaysLocked).toEqual([]);
  });
});

describe('saved projects keep classes', () => {
  it('migrateClasses keeps good data and frees orphan sub-classes', () => {
    const p = migrateProject({
      version: 3,
      meta: { title: 't' },
      activeArcId: 'A',
      arcs: [{ id: 'A', name: 'A', nodes: [], edges: [] }],
      variables: [],
      classes: [
        { id: 'a', name: 'A', icon: ' 🔥 ', effects: [fx('x', 'set', 1)] },
        { id: 'b', name: 'B', parentId: 'a' },
        { id: 'c', name: 'C', parentId: 'gone', effects: 'junk' },
      ],
    });
    expect(p.classes).toEqual([
      { id: 'a', name: 'A', icon: '🔥', effects: [fx('x', 'set', 1)] },
      { id: 'b', name: 'B', parentId: 'a', effects: [] },
      { id: 'c', name: 'C', effects: [] },
    ]);
    expect(migrateProject({ version: 3, arcs: [{ id: 'A', name: 'A', nodes: [], edges: [] }] }).classes).toEqual([]);
  });
});
