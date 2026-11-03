// Auto-layout ("Tidy"): left → right with dagre. Pure: returns new positions.

import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { NodeData } from '../types';
import { expectedOutputs } from '../analysis/validate';
import { normHandle } from '../engine';
import { useFlowStore } from '../store';
import { notify } from '../ui/dialogs';

type N = Node<NodeData>;
export type Positions = Record<string, { x: number; y: number }>;

const DEFAULT_W = 280;
const DEFAULT_H = 200;

/**
 * Lay out `nodes` (or only the ids in `only`) left → right.
 * The result keeps the group's top-left corner where it was, so the story
 * doesn't jump away on screen. Wires leave a card in the order of its outputs
 * (choice 1 above choice 2, …).
 */
export function layoutNodes(nodes: N[], edges: Edge[], only?: Set<string>): Positions {
  const list = only ? nodes.filter((n) => only.has(n.id)) : nodes;
  if (list.length === 0) return {};
  const ids = new Set(list.map((n) => n.id));
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 180, edgesep: 20, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  const size = (n: N) => ({ w: n.measured?.width ?? n.width ?? DEFAULT_W, h: n.measured?.height ?? n.height ?? DEFAULT_H });
  for (const n of list) {
    const { w, h } = size(n);
    g.setNode(n.id, { width: w, height: h });
  }
  // add wires in output order so dagre keeps choice 1 above choice 2
  const byId = new Map(list.map((n) => [n.id, n]));
  const rank = (e: Edge) => {
    const src = byId.get(e.source);
    if (!src) return 0;
    const i = expectedOutputs(src).findIndex((o) => o.handle === normHandle(e.sourceHandle));
    return i < 0 ? 999 : i;
  };
  const inner = edges.filter((e) => ids.has(e.source) && ids.has(e.target) && e.source !== e.target);
  inner.sort((a, b) => (a.source === b.source ? rank(a) - rank(b) : 0));
  inner.forEach((e, i) => g.setEdge(e.source, e.target, {}, `${e.id ?? i}`));
  dagre.layout(g);

  const minX = Math.min(...list.map((n) => n.position.x));
  const minY = Math.min(...list.map((n) => n.position.y));
  const raw: Positions = {};
  for (const n of list) {
    const p = g.node(n.id);
    const { w, h } = size(n);
    raw[n.id] = { x: p.x - w / 2, y: p.y - h / 2 };
  }
  const lx = Math.min(...Object.values(raw).map((p) => p.x));
  const ly = Math.min(...Object.values(raw).map((p) => p.y));
  const out: Positions = {};
  for (const id of Object.keys(raw)) out[id] = { x: Math.round(raw[id].x - lx + minX), y: Math.round(raw[id].y - ly + minY) };
  return out;
}

/** "Tidy": lay out the selected cards (2+), else the whole arc — one undo step. */
export function tidyArc(rf: { fitView: (o: { padding: number; duration: number; maxZoom: number }) => unknown }) {
  const st = useFlowStore.getState();
  const selected = st.nodes.filter((n) => n.selected);
  const only = selected.length >= 2 ? new Set(selected.map((n) => n.id)) : undefined;
  const pos = layoutNodes(st.nodes, st.edges, only);
  if (Object.keys(pos).length === 0) return;
  st.setPositions(pos);
  notify(only ? `Tidied ${only.size} selected cards — Ctrl+Z to undo` : 'Tidied this arc — Ctrl+Z to undo', 'info');
  if (!only) window.setTimeout(() => rf.fitView({ padding: 0.2, duration: 300, maxZoom: 1 }), 60);
}
