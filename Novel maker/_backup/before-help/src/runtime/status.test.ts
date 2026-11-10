import { describe, expect, it } from 'vitest';
import { buildIndex, choose, hudAfter, loadSave, next, startAt, startPlay, statusGroupNames, statusView } from './core.js';
import type { VariableDef } from '../types';
import { migrateProject } from '../project';

const defs: VariableDef[] = [
  { id: 'key', name: 'old_key', type: 'bool', initial: false, show: { group: 'Items', icon: '🗝️' } },
  { id: 'coins', name: 'coins', type: 'number', initial: 0, show: { group: 'items', label: 'Gold coins' } },
  { id: 'str', name: 'strength', type: 'number', initial: 0, show: { group: 'Power', max: 10 } },
  { id: 'title', name: 'title', type: 'text', initial: '', show: { group: 'Abilities' } },
  { id: 'secret', name: 'secret', type: 'number', initial: 5 }, // not shown to readers
];

describe('statusView', () => {
  it('hides what you do not have, keeps bars, groups in variable order (ignoring case)', () => {
    const v = statusView(defs, { key: false, coins: 0, str: 0, title: '', secret: 5 });
    expect(v.map((g) => g.name)).toEqual(['Items', 'Power', 'Abilities']);
    expect(v[0].rows).toEqual([]); // no key, 0 coins
    expect(v[1].rows).toEqual([{ id: 'str', label: 'strength', icon: '', type: 'number', value: 0, max: 10 }]);
    expect(v[2].rows).toEqual([]);
  });
  it('shows items once you have them, with labels and icons', () => {
    const v = statusView(defs, { key: true, coins: 12, str: 7, title: 'Keeper' });
    expect(v[0].rows.map((r) => [r.icon, r.label, r.value])).toEqual([
      ['🗝️', 'old key', true],
      ['', 'Gold coins', 12],
    ]);
    expect(v[2].rows[0].value).toBe('Keeper');
  });
  it('picks groups in the order asked, skipping unknown ones', () => {
    const v = statusView(defs, {}, ['power', ' ITEMS ', 'Nope']);
    expect(v.map((g) => g.name)).toEqual(['Power', 'Items']);
  });
  it('lists group names in use', () => {
    expect(statusGroupNames(defs)).toEqual(['Items', 'Power', 'Abilities']);
    expect(statusGroupNames([])).toEqual([]);
  });
});

describe('HUD', () => {
  const story = buildIndex({
    variables: defs,
    arcs: [
      {
        id: 'A',
        name: 'A',
        nodes: [
          { id: 'c', type: 'chapter', position: { x: 0, y: 0 }, data: { kind: 'chapter', name: 'One' } },
          { id: 's1', type: 'scene', data: { kind: 'scene', hud: { mode: 'show', groups: ['Items'] } } },
          {
            id: 'st',
            type: 'status',
            data: { kind: 'status', title: 'Found!', groups: [], savePoint: true, onEnter: [{ id: 'f', varId: 'key', op: 'set', value: true }] },
          },
          { id: 'd', type: 'decision', data: { kind: 'decision', choices: [{ id: 'x', label: 'x' }] } },
          { id: 'q', type: 'dialog', data: { kind: 'dialog', hud: { mode: 'hide' } } },
          { id: 'e', type: 'end', data: { kind: 'end' } },
        ],
        edges: [
          { source: 'c', target: 's1' },
          { source: 's1', target: 'st' },
          { source: 'st', target: 'd' },
          { source: 'd', sourceHandle: 'choice-x', target: 'q' },
          { source: 'q', target: 'e' },
        ],
      },
    ],
  });

  it('is off at the start, turns on, carries forward, turns off', () => {
    let s = startPlay(story, 'A');
    expect(s.hud).toBeNull();
    s = next(story, s);
    expect(s.hud).toEqual(['Items']);
    s = next(story, s); // Status card: a normal reader card, on-enter applied first
    expect(s.currentId).toBe('st');
    expect(s.vars.key).toBe(true);
    expect(s.hud).toEqual(['Items']); // card without a setting keeps it
    s = next(story, s);
    expect(s.currentId).toBe('d');
    s = choose(story, s, 'x');
    expect(s.hud).toBeNull();
    s = next(story, s);
    expect(s.currentId).toBe('e');
    expect(s.hud).toBeNull();
    // a Status card can be a save point; going back restores the HUD too
    const back = loadSave(s);
    expect(back.currentId).toBe('st');
    expect(back.hud).toEqual(['Items']);
  });

  it('"Play from here" can start with a HUD', () => {
    const s = startAt(story, 'A', 'd', {}, undefined, undefined, null, ['Power']);
    expect(s.hud).toEqual(['Power']);
  });

  it('hudAfter: keep / show all / hide', () => {
    expect(hudAfter({ id: 'n', data: {} }, ['Items'])).toEqual(['Items']);
    expect(hudAfter({ id: 'n', data: { hud: { mode: 'show', groups: [] } } }, null)).toEqual([]);
    expect(hudAfter({ id: 'n', data: { hud: { mode: 'hide' } } }, ['Items'])).toBeNull();
  });
});

describe('saved projects keep "Show to reader"', () => {
  it('migrateProject keeps show settings and drops malformed bits', () => {
    const p = migrateProject({
      version: 3,
      meta: { title: 't' },
      activeArcId: 'A',
      arcs: [{ id: 'A', name: 'A', nodes: [], edges: [] }],
      variables: [
        { id: '1', name: 'hp', type: 'number', initial: 3, show: { group: ' Power ', max: '10', icon: '❤️' } },
        { id: '2', name: 'x', type: 'bool', initial: false, show: { group: '', max: -1, label: '  ' } },
        { id: '3', name: 'y', type: 'bool', initial: false },
      ],
    });
    expect(p!.variables[0].show).toEqual({ group: 'Power', max: 10, icon: '❤️' });
    expect(p!.variables[1].show).toEqual({ group: 'Items' });
    expect(p!.variables[2].show).toBeUndefined();
  });
});
