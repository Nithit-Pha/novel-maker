// Project / Arc model. A Project holds many Arcs (pages); each Arc is its own
// graph (nodes + edges). Shared by the store, players, and the exporter.

import type { Edge, Node } from '@xyflow/react';
import type { NodeData } from './types';

export interface Arc {
  id: string;
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  nextId?: number;
}

export interface Project {
  version: 2;
  meta: { title: string };
  activeArcId: string;
  arcs: Arc[];
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Legacy single 'start' node -> Chapter (kept from earlier migration).
export function migrateNodes(nodes: unknown): Node<NodeData>[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.map((n) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = n as any;
    if (node.type === 'start' || node.data?.kind === 'start') {
      const name = node.data?.name || node.data?.text || 'Chapter 1';
      return { ...node, type: 'chapter', data: { ...node.data, kind: 'chapter', name } } as Node<NodeData>;
    }
    return node as Node<NodeData>;
  });
}

/**
 * Normalize any saved blob into a Project:
 * - v2 (`{ version:2, arcs:[...] }`) → validated/normalized.
 * - v1 (`{ nodes, edges }`) → wrapped as a single "Arc 1".
 */
export function migrateProject(raw: unknown): Project {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = raw as any;
  if (data && Array.isArray(data.arcs)) {
    const arcs: Arc[] = data.arcs.map((a: any, i: number) => ({
      id: a.id || newId(),
      name: a.name || `Arc ${i + 1}`,
      nodes: migrateNodes(a.nodes),
      edges: Array.isArray(a.edges) ? a.edges : [],
      nextId: a.nextId ?? 1,
    }));
    if (arcs.length === 0) arcs.push(emptyArc('Arc 1'));
    const activeArcId = arcs.some((a) => a.id === data.activeArcId)
      ? data.activeArcId
      : arcs[0].id;
    return { version: 2, meta: { title: data.meta?.title || 'My Story' }, activeArcId, arcs };
  }
  // v1: single graph
  const arc: Arc = {
    id: newId(),
    name: 'Arc 1',
    nodes: migrateNodes(data?.nodes),
    edges: Array.isArray(data?.edges) ? data.edges : [],
    nextId: data?.nextId ?? 1,
  };
  return { version: 2, meta: { title: 'My Story' }, activeArcId: arc.id, arcs: [arc] };
}

export function emptyArc(name: string): Arc {
  return { id: newId(), name, nodes: [], edges: [], nextId: 1 };
}
