import { describe, expect, it } from 'vitest';
import demo from '../../docs/examples/lighthouse-demo.json';
import {
  applyEffects,
  buildIndex,
  choiceState,
  choose,
  currentNode,
  describeCondition,
  enterItem,
  evaluate,
  findStart,
  next,
  pickOutcome,
  startPlay,
  type PlayState,
  type StoryIndex,
} from './core.js';
import type { Choice } from '../types';
import { migrateProject } from '../project';

const idx = buildIndex(demo as never);
const at = (s: PlayState) => currentNode(idx, s)?.id ?? null;
const rngHold = () => 0.9; // weights fail:1 hold:2 → 0.9*3 = 2.7 → "hold"
const rngFail = () => 0.1;

/** Chapter → scene → first decision. */
function toFirstDecision(): PlayState {
  let s = startPlay(idx, 'arc-main');
  expect(at(s)).toBe('ch1');
  s = next(idx, s);
  s = next(idx, s);
  expect(at(s)).toBe('d1');
  return s;
}
function choiceOf(index: StoryIndex, s: PlayState, id: string): Choice {
  return (currentNode(index, s)!.data.choices as Choice[]).find((c) => c.id === id)!;
}

describe('variables, effects and conditions', () => {
  const vars = { a: 1, flag: false, name: 'x' };
  it('applies effects without mutating input', () => {
    const out = applyEffects(
      [
        { id: '1', varId: 'a', op: 'add', value: 2 },
        { id: '2', varId: 'flag', op: 'toggle' },
        { id: '3', varId: 'name', op: 'set', value: 'Mira' },
        { id: '4', varId: 'deleted', op: 'set', value: 5 },
      ],
      vars
    );
    expect(out).toEqual({ a: 3, flag: true, name: 'Mira' });
    expect(vars.a).toBe(1);
  });
  it('evaluates all / any and treats deleted variables as false', () => {
    const c = (mode: 'all' | 'any') => ({
      mode,
      clauses: [
        { id: '1', varId: 'a', cmp: '>=' as const, value: 1 },
        { id: '2', varId: 'flag', cmp: '==' as const, value: true },
      ],
    });
    expect(evaluate(c('all'), vars)).toBe(false);
    expect(evaluate(c('any'), vars)).toBe(true);
    expect(evaluate(undefined, vars)).toBe(true);
    expect(evaluate({ mode: 'all', clauses: [{ id: 'x', varId: 'gone', cmp: '==', value: 1 }] }, vars)).toBe(false);
  });
  it('describes conditions with variable names', () => {
    expect(
      describeCondition({ mode: 'all', clauses: [{ id: '1', varId: 'trust', cmp: '>=', value: 2 }] }, idx.variables)
    ).toBe('trust_mira ≥ 2');
  });
  it('picks weighted outcomes', () => {
    const outs = [
      { id: 'a', label: 'A', weight: 1 },
      { id: 'b', label: 'B', weight: 3 },
    ];
    expect(pickOutcome(outs, () => 0.2)!.id).toBe('a');
    expect(pickOutcome(outs, () => 0.3)!.id).toBe('b');
    expect(pickOutcome([{ id: 'z', label: '', weight: 0 }], () => 0.5)!.id).toBe('z');
  });
});

describe('Lighthouse demo: branches rejoin but remember', () => {
  it('"Let her in" → key can be given → good ending', () => {
    let s = choose(idx, toFirstDecision(), 'let', rngHold);
    expect(s.vars.trust).toBe(2);
    expect(at(s)).toBe('mira1'); // all three choices rejoin here
    s = next(idx, s, rngHold); // silent? no: lamp is "reveal"
    expect(at(s)).toBe('lamp');
    expect(s.roll?.outcomeId).toBe('hold');
    s = next(idx, s, rngHold);
    expect(at(s)).toBe('d2');
    expect(choiceState(choiceOf(idx, s, 'give'), s.vars)).toEqual({ available: true, visible: true });
    expect(choiceState(choiceOf(idx, s, 'out'), s.vars).visible).toBe(false);
    s = choose(idx, s, 'give');
    expect(s.vars.has_key).toBe(true);
    expect(at(s)).toBe('endGood'); // passed silently through the Condition node
  });

  it('"Talk through the door" → key choice is locked but visible → neutral ending', () => {
    let s = choose(idx, toFirstDecision(), 'talk');
    s = next(idx, next(idx, s, rngHold), rngHold);
    expect(at(s)).toBe('d2');
    expect(choiceState(choiceOf(idx, s, 'give'), s.vars)).toEqual({ available: false, visible: true });
    expect(choose(idx, s, 'give')).toBe(s); // locked choice can't be taken
    s = choose(idx, s, 'keep');
    expect(at(s)).toBe('endMid');
  });

  it('"Ignore the knock" → hidden choice appears → bad ending', () => {
    let s = choose(idx, toFirstDecision(), 'ignore');
    expect(s.vars.trust).toBe(-1);
    s = next(idx, next(idx, s, rngHold), rngHold);
    expect(choiceState(choiceOf(idx, s, 'out'), s.vars)).toEqual({ available: true, visible: true });
    s = choose(idx, s, 'keep');
    expect(at(s)).toBe('endBad');
  });

  it('a failed lamp roll takes the other branch', () => {
    let s = choose(idx, toFirstDecision(), 'let');
    s = next(idx, s, rngFail);
    expect(s.roll?.outcomeId).toBe('fail');
    s = next(idx, s, rngFail);
    expect(at(s)).toBe('mira2');
  });

  it('endings stop the player', () => {
    let s = choose(idx, toFirstDecision(), 'let');
    s = next(idx, next(idx, s, rngHold), rngHold);
    s = choose(idx, s, 'give');
    expect(next(idx, s)).toBe(s);
  });
});

describe('saved stories keep their rules', () => {
  it('the demo plays the same after load/migration (effects + conditions survive)', () => {
    const m = buildIndex(migrateProject(JSON.parse(JSON.stringify(demo))));
    let s = startPlay(m, 'arc-main');
    s = next(m, next(m, s));
    s = choose(m, s, 'talk');
    expect(s.vars.trust).toBe(1);
    s = next(m, next(m, s, rngHold), rngHold);
    expect(choiceState(choiceOf(m, s, 'give'), s.vars)).toEqual({ available: false, visible: true });
    expect(choiceState(choiceOf(m, s, 'out'), s.vars).visible).toBe(false);
  });
});

describe('loops, portals and routing guards', () => {
  const story = buildIndex({
    variables: [{ id: 'n', name: 'n', type: 'number', initial: 0 }],
    arcs: [
      {
        id: 'A',
        name: 'A',
        nodes: [
          { id: 'L', type: 'loop', position: { x: 0, y: 0 }, data: { kind: 'loop', items: [{ id: 'i1' }, { id: 'i2' }] } },
          { id: 'x1', type: 'dialog', data: { kind: 'dialog', onEnter: [{ id: 'f', varId: 'n', op: 'add', value: 1 }] } },
          { id: 'x2', type: 'dialog', data: { kind: 'dialog' } },
          { id: 'P', type: 'portal', data: { kind: 'portal', targetArcId: 'B' } },
        ],
        edges: [
          { source: 'L', sourceHandle: 'item-i1', target: 'x1' },
          { source: 'L', sourceHandle: 'item-i2', target: 'x2' },
          { source: 'x1', sourceHandle: 'out', target: 'L' },
          { source: 'x2', sourceHandle: 'out', target: 'L' },
          { source: 'L', sourceHandle: 'done', target: 'P' },
        ],
      },
      {
        id: 'B',
        name: 'B',
        nodes: [
          { id: 'c1', type: 'condition', position: { x: 0, y: 0 }, data: { kind: 'condition', branches: [] } },
          { id: 'c2', type: 'condition', data: { kind: 'condition', branches: [] } },
        ],
        edges: [
          { source: 'c1', sourceHandle: 'else', target: 'c2' },
          { source: 'c2', sourceHandle: 'else', target: 'c1' },
        ],
      },
    ],
  });
  it('completes a loop in any order, applies on-enter effects, crosses a portal', () => {
    let s = startPlay(story, 'A');
    expect(s.currentId).toBe('L');
    s = enterItem(story, s, 'i2');
    s = next(story, s);
    expect(s.currentId).toBe('L');
    s = enterItem(story, s, 'i1');
    expect(s.vars.n).toBe(1);
    s = next(story, s); // loop complete → done → portal → arc B → routing cycle
    expect(s.arcId).toBe('B');
    expect(s.currentId).toBeNull(); // cycle of silent nodes ends instead of hanging
  });
});

describe('findStart', () => {
  it('prefers the leftmost unconnected chapter', () => {
    const s = findStart(
      [
        { id: 'stray', type: 'dialog', position: { x: -500, y: 0 }, data: {} },
        { id: 'c2', type: 'chapter', position: { x: 300, y: 0 }, data: {} },
        { id: 'c1', type: 'chapter', position: { x: 0, y: 0 }, data: {} },
      ],
      []
    );
    expect(s!.id).toBe('c1');
  });
});
