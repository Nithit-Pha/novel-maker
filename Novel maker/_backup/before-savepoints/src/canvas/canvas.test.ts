import { describe, expect, it } from 'vitest';
import demo from '../../docs/examples/lighthouse-demo.json';
import { migrateProject } from '../project';
import { layoutNodes } from './layout';
import { wireLabel } from './wireLabels';
import { useFlowStore } from '../store';
import type { Node } from '@xyflow/react';
import type { NodeData } from '../types';

const lighthouse = () => migrateProject(JSON.parse(JSON.stringify(demo)));
const st = () => useFlowStore.getState();

describe('layoutNodes (Tidy)', () => {
  it('places every card right of the cards that lead to it, choices in order', () => {
    const arc = lighthouse().arcs[0];
    const pos = layoutNodes(arc.nodes, arc.edges);
    for (const e of arc.edges) expect(pos[e.target].x).toBeGreaterThan(pos[e.source].x);
    // the three endings leave "Which morning?" in branch order: Two Keepers, Alone, (else) Morning
    expect(pos.endGood.y).toBeLessThan(pos.endBad.y);
    expect(pos.endBad.y).toBeLessThan(pos.endMid.y);
    // keeps the story's top-left corner
    const minX = Math.min(...arc.nodes.map((n) => n.position.x));
    expect(Math.min(...Object.values(pos).map((p) => p.x))).toBe(minX);
  });
  it('only moves the selected cards when given a selection', () => {
    const arc = lighthouse().arcs[0];
    const pos = layoutNodes(arc.nodes, arc.edges, new Set(['endGood', 'endBad', 'endMid']));
    expect(Object.keys(pos).sort()).toEqual(['endBad', 'endGood', 'endMid']);
  });
});

describe('wireLabel', () => {
  const arc = lighthouse().arcs[0];
  const n = (id: string) => arc.nodes.find((x) => x.id === id) as Node<NodeData>;
  it('labels choices, branches, else and chance outcomes', () => {
    expect(wireLabel(n('d1'), 'choice-let')).toBe('1 · Let her in');
    expect(wireLabel(n('check'), 'branch-ally')).toBe('Trusted ally');
    expect(wireLabel(n('check'), 'else')).toBe('Else');
    expect(wireLabel(n('lamp'), 'outcome-hold')).toBe('The lamp holds · 67%');
    expect(wireLabel(n('mira1'), null)).toBeUndefined();
  });
});

describe('store actions', () => {
  it('addNodeConnected adds a wired card as ONE undo step and replaces an existing wire', () => {
    st().importJSON(JSON.stringify(demo));
    const nodes0 = st().nodes.length;
    const edges0 = st().edges.length;
    const p0 = st().past.length;
    const id = st().addNodeConnected('dialog', { x: 0, y: 0 }, { nodeId: 'mira1', handleId: 'out', handleType: 'source' });
    expect(st().nodes.length).toBe(nodes0 + 1);
    // mira1 → lamp is replaced by mira1 → new card (one wire per output)
    expect(st().edges.length).toBe(edges0);
    expect(st().edges.some((e) => e.source === 'mira1' && e.target === id)).toBe(true);
    expect(st().past.length).toBe(p0 + 1);
    st().undo();
    expect(st().nodes.length).toBe(nodes0);
    expect(st().edges.some((e) => e.source === 'mira1' && e.target === 'lamp')).toBe(true);
  });
  it('addNodeConnected from an input puts the new card before it', () => {
    st().importJSON(JSON.stringify(demo));
    const id = st().addNodeConnected('scene', { x: 0, y: 0 }, { nodeId: 'd2', handleId: 'in', handleType: 'target' });
    expect(st().edges.some((e) => e.source === id && e.target === 'd2')).toBe(true);
  });
  it('setPositions moves many cards as one undo step', () => {
    st().importJSON(JSON.stringify(demo));
    const p0 = st().past.length;
    st().setPositions({ ch1: { x: 5, y: 6 }, sc1: { x: 7, y: 8 } });
    expect(st().nodes.find((n) => n.id === 'ch1')!.position).toEqual({ x: 5, y: 6 });
    expect(st().past.length).toBe(p0 + 1);
  });
  it('renaming a Library character updates linked and same-named cards', () => {
    st().importJSON(JSON.stringify(demo));
    st().renameCharacterRefs('c-mira', 'Mira', 'Mira Vale');
    const names = st().nodes.filter((n) => n.type === 'dialog').map((n) => (n.data as { character: string }).character);
    expect(names.every((x) => x === 'Mira Vale')).toBe(true);
    expect((st().nodes.find((n) => n.id === 'mira1')!.data as { characterId?: string }).characterId).toBe('c-mira');
  });
});
