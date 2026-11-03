import { describe, expect, it } from 'vitest';
import demo from '../../docs/examples/lighthouse-demo.json';
import { migrateProject, type Project } from '../project';
import { exploreRoutes, replayRoute, endingLabels } from './explore';
import { validateProject } from './validate';
import { buildIndex, currentNode } from '../engine';

const lighthouse = (): Project => migrateProject(JSON.parse(JSON.stringify(demo)));

// tiny builder: arc of nodes with edges [source, target, handle?]
function project(nodes: { id: string; type: string; data?: Record<string, unknown>; x?: number }[], edges: [string, string, string?][], extra: Partial<Project> = {}): Project {
  return migrateProject({
    version: 3,
    activeArcId: 'A',
    variables: [],
    ...extra,
    arcs: [
      {
        id: 'A',
        name: 'Arc 1',
        nodes: nodes.map((n, i) => ({ id: n.id, type: n.type, position: { x: n.x ?? i * 100, y: 0 }, data: { kind: n.type, ...(n.data ?? {}) } })),
        edges: edges.map(([s, t, h], i) => ({ id: 'e' + i, source: s, target: t, sourceHandle: h ?? null })),
      },
      ...((extra.arcs as Project['arcs']) ?? []),
    ],
  });
}

describe('validateProject', () => {
  it('the Lighthouse demo has no errors or warnings', () => {
    const issues = validateProject(lighthouse()).filter((i) => i.severity !== 'note');
    expect(issues).toEqual([]);
  });

  it('finds dead ends, unwired choices, unreachable cards, double wires and deleted variables', () => {
    const p = project(
      [
        { id: 'c', type: 'chapter', data: { name: 'C' }, x: 0 },
        { id: 'd', type: 'decision', data: { prompt: '', choices: [{ id: 'a', label: 'A', condition: { mode: 'all', clauses: [{ id: 'x', varId: 'gone', cmp: '==', value: 1 }] } }, { id: 'b', label: '' }] } },
        { id: 'talk', type: 'dialog', data: { character: '', text: 'hi' } },
        { id: 'lost', type: 'dialog', data: { character: '', text: 'nobody comes here' } },
        { id: 'p', type: 'portal', data: { targetArcId: 'deleted' } },
      ],
      [
        ['c', 'd'],
        ['d', 'talk', 'choice-a'],
        ['d', 'p', 'choice-a'],
        ['lost', 'talk'],
      ]
    );
    const msgs = validateProject(p).map((i) => `${i.severity}:${i.nodeId ?? '-'}:${i.message}`);
    expect(msgs).toContain('warning:talk:The story stops here without an Ending card.');
    expect(msgs).toContain('warning:d:Choice 2 isn’t connected.');
    expect(msgs).toContain('warning:d:Choice 1 “A” has 2 wires; only the first is followed.');
    expect(msgs).toContain('warning:lost:No route reaches this card.');
    expect(msgs.filter((m) => m.includes('No route reaches')).length).toBe(1);
    expect(msgs).toContain('error:p:Go to Arc points to an arc that was deleted.');
    expect(msgs).toContain('error:d:Uses a deleted or unset variable (choice 1).');
    expect(msgs).toContain('note:d:Decision has no question.');
    expect(msgs).toContain('note:d:Choice 2 has no text.');
  });

  it('reports an arc nothing leads to, and duplicate variable names', () => {
    const p = project([{ id: 'c', type: 'end', data: {} }], [], {
      variables: [
        { id: 'v1', name: 'gold', type: 'number', initial: 0 },
        { id: 'v2', name: 'gold', type: 'number', initial: 0 },
      ],
      arcs: [{ id: 'B', name: 'Side story', nodes: [{ id: 'x', type: 'end', position: { x: 0, y: 0 }, data: { kind: 'end', title: '', description: '' } }], edges: [] }] as never,
    });
    const msgs = validateProject(p).map((i) => i.message);
    expect(msgs).toContain('Arc “Side story” is never reached — no “Go to Arc” card leads here.');
    expect(msgs.some((m) => m.startsWith('2 variables are called “gold”'))).toBe(true);
    expect(msgs).not.toContain('No route reaches this card.'); // covered by the arc warning
  });
});

describe('exploreRoutes', () => {
  it('Lighthouse: every ending reachable, route counts, shortest route replays to the ending', () => {
    const p = lighthouse();
    const r = exploreRoutes(p);
    expect(r.truncated).toBe(false);
    expect(r.hasLoops).toBe(false);
    const by = Object.fromEntries(r.endings.map((e) => [e.nodeId, e]));
    expect(by.endGood.reachable && by.endBad.reachable && by.endMid.reachable).toBe(true);
    expect([by.endGood.routes, by.endMid.routes, by.endBad.routes]).toEqual([2, 4, 4]);
    expect(r.alwaysLocked).toEqual([]);
    expect(r.openEnds).toBe(0);
    // shortest route to the good ending: "Let her in" … "Give her the key"
    const choices = by.endGood.shortest!.steps.filter((s) => s.action.type === 'choose').map((s) => (s.action as { choiceId: string }).choiceId);
    expect(choices).toEqual(['let', 'give']);
    const states = replayRoute(p, by.endGood.shortest!);
    expect(currentNode(buildIndex(p), states[states.length - 1])?.id).toBe('endGood');
  });

  it('flags an ending no route reaches and a choice locked on every route', () => {
    const p = project(
      [
        { id: 'c', type: 'chapter', data: { name: 'C' } },
        { id: 'd', type: 'decision', data: { prompt: '?', choices: [{ id: 'free', label: 'Free' }, { id: 'rich', label: 'Rich only', condition: { mode: 'all', clauses: [{ id: 'k', varId: 'gold', cmp: '>=', value: 10 }] } }] } },
        { id: 'e1', type: 'end', data: { title: 'Poor' } },
        { id: 'e2', type: 'end', data: { title: 'Rich' } },
      ],
      [
        ['c', 'd'],
        ['d', 'e1', 'choice-free'],
        ['d', 'e2', 'choice-rich'],
      ],
      { variables: [{ id: 'gold', name: 'gold', type: 'number', initial: 0 }] }
    );
    const r = exploreRoutes(p);
    expect(r.endings.find((e) => e.nodeId === 'e1')!.reachable).toBe(true);
    expect(r.endings.find((e) => e.nodeId === 'e2')!.reachable).toBe(false);
    expect(r.alwaysLocked).toEqual([{ arcId: 'A', nodeId: 'd', choiceId: 'rich', index: 1 }]);
  });

  it('detects endless loops and still finds the way out', () => {
    // c → d: "again" goes back to c (same situation), "leave" → end
    const p = project(
      [
        { id: 'c', type: 'chapter', data: { name: 'C' } },
        { id: 'd', type: 'decision', data: { prompt: '?', choices: [{ id: 'again', label: 'Again' }, { id: 'leave', label: 'Leave' }] } },
        { id: 'e', type: 'end', data: {} },
      ],
      [
        ['c', 'd'],
        ['d', 'c', 'choice-again'],
        ['d', 'e', 'choice-leave'],
      ]
    );
    const r = exploreRoutes(p);
    expect(r.hasLoops).toBe(true);
    expect(r.endings[0]).toMatchObject({ reachable: true, label: 'Ending 1' });
  });

  it('stops at the state limit', () => {
    // a counter that grows forever: each pass adds 1 → infinitely many states
    const p = project(
      [
        { id: 'c', type: 'chapter', data: { name: 'C', onEnter: [{ id: 'f', varId: 'n', op: 'add', value: 1 }] } },
        { id: 'd', type: 'decision', data: { prompt: '?', choices: [{ id: 'again', label: 'Again' }, { id: 'leave', label: 'Leave' }] } },
        { id: 'e', type: 'end', data: {} },
      ],
      [
        ['c', 'd'],
        ['d', 'c', 'choice-again'],
        ['d', 'e', 'choice-leave'],
      ],
      { variables: [{ id: 'n', name: 'n', type: 'number', initial: 0 }] }
    );
    const r = exploreRoutes(p, 500);
    expect(r.truncated).toBe(true);
    expect(r.states).toBe(500);
    expect(r.endings[0].reachable).toBe(true);
  });

  it('follows portals into other arcs and labels endings', () => {
    const p = project(
      [
        { id: 'c', type: 'chapter', data: { name: 'C' } },
        { id: 'p', type: 'portal', data: { targetArcId: 'B' } },
      ],
      [['c', 'p']],
      {
        arcs: [
          {
            id: 'B',
            name: 'B',
            nodes: [
              { id: 'b1', type: 'chapter', position: { x: 0, y: 0 }, data: { kind: 'chapter', name: 'B' } },
              { id: 'bEnd', type: 'end', position: { x: 100, y: 0 }, data: { kind: 'end', title: 'Over the hills', description: '' } },
            ],
            edges: [{ id: 'x', source: 'b1', target: 'bEnd' }],
          },
        ] as never,
      }
    );
    expect(endingLabels(p).get('bEnd')!.label).toBe('Over the hills');
    const r = exploreRoutes(p);
    expect(r.endings[0]).toMatchObject({ nodeId: 'bEnd', reachable: true, routes: 1 });
  });
});

describe('unreachable sections are reported once', () => {
  it('cutting the first wire gives one warning with a count', () => {
    const p = lighthouse();
    p.arcs[0].edges = p.arcs[0].edges.filter((e) => !(e.source === 'ch1' && e.target === 'sc1'));
    const lost = validateProject(p).filter((i) => i.message.startsWith('No route reaches'));
    expect(lost).toHaveLength(1);
    expect(lost[0].nodeId).toBe('sc1');
    expect(lost[0].message).toBe('No route reaches this card, nor the 9 cards after it.');
  });
});
