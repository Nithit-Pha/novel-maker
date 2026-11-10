// Project / Arc model. A Project holds many Arcs (pages); each Arc is its own
// graph (nodes + edges). Shared by the store, players, and the exporter.

import type { Edge, Node } from '@xyflow/react';
import type { ClassDef, Effect, NodeData, VariableDef, VarType, VarShow } from './types';

export interface Arc {
  id: string;
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  nextId?: number;
}

export interface Project {
  version: 3;
  meta: { title: string };
  activeArcId: string;
  arcs: Arc[];
  /** Story variables (flags, counters, text), shared by every arc. */
  variables: VariableDef[];
  /** Classes and sub-classes the reader can become (missing in older saves = none). */
  classes?: ClassDef[];
}

/** Keep only well-formed classes; sub-classes must point at an existing top-level class. */
export function migrateClasses(raw: unknown): ClassDef[] {
  if (!Array.isArray(raw)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list: ClassDef[] = raw.flatMap((c: any) => {
    if (!c || typeof c !== 'object') return [];
    const out: ClassDef = {
      id: String(c.id || newId()),
      name: String(c.name ?? ''),
      effects: Array.isArray(c.effects) ? (c.effects.filter((e: unknown) => e && typeof e === 'object') as Effect[]) : [],
    };
    if (c.icon != null && String(c.icon).trim()) out.icon = String(c.icon).trim();
    if (c.description != null && String(c.description)) out.description = String(c.description);
    if (c.parentId) out.parentId = String(c.parentId);
    return [out];
  });
  const top = new Set(list.filter((c) => !c.parentId).map((c) => c.id));
  for (const c of list) if (c.parentId && !top.has(c.parentId)) delete c.parentId; // orphan → its own class
  return list;
}

const VAR_TYPES: VarType[] = ['bool', 'number', 'text'];

/** Keep only well-formed variable definitions. */
export function migrateVariables(raw: unknown): VariableDef[] {
  if (!Array.isArray(raw)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.flatMap((v: any) => {
    if (!v || typeof v !== 'object') return [];
    const type: VarType = VAR_TYPES.includes(v.type) ? v.type : 'number';
    const initial =
      type === 'bool' ? v.initial === true : type === 'number' ? Number(v.initial) || 0 : String(v.initial ?? '');
    const out: VariableDef = { id: String(v.id || newId()), name: String(v.name ?? ''), type, initial, note: v.note ? String(v.note) : undefined };
    const show = migrateShow(v.show);
    if (show) out.show = show;
    return [out];
  });
}

/** Keep a variable's "Show to reader" settings (dropping anything malformed). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateShow(raw: any): VarShow | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const show: VarShow = { group: String(raw.group ?? '').trim() || 'Items' };
  if (raw.label != null && String(raw.label).trim()) show.label = String(raw.label);
  if (raw.icon != null && String(raw.icon).trim()) show.icon = String(raw.icon).trim();
  const max = Number(raw.max);
  if (raw.max != null && isFinite(max) && max > 0) show.max = max;
  return show;
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Per-node fixes for older saves:
// - legacy single 'start' node -> Chapter
// - decision choices stored as plain strings -> { id, label } items.
//   Migrated ids are the old index ("0", "1", …) so existing `choice-<idx>`
//   wires keep working unchanged; new choices get UUIDs, which never collide.
export function migrateNodes(nodes: unknown): Node<NodeData>[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.map((n) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = n as any;
    if (node.type === 'start' || node.data?.kind === 'start') {
      const name = node.data?.name || node.data?.text || 'Chapter 1';
      return { ...node, type: 'chapter', data: { ...node.data, kind: 'chapter', name } } as Node<NodeData>;
    }
    if (node.type === 'decision' && Array.isArray(node.data?.choices)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const choices = node.data.choices.map((c: any, i: number) =>
        typeof c === 'string' ? { id: String(i), label: c } : { ...c, id: String(c?.id ?? i), label: String(c?.label ?? '') }
      );
      return { ...node, data: { ...node.data, choices } } as Node<NodeData>;
    }
    return node as Node<NodeData>;
  });
}

/**
 * Node ids must be unique across the WHOLE project (loop progress and the
 * player's call stack are keyed by node id). Older saves restarted ids at n1
 * in every arc, and Duplicate Arc copied ids verbatim — re-id any repeats and
 * rewire that arc's edges.
 */
export function ensureUniqueIds(arcs: Arc[]): Arc[] {
  const seen = new Set<string>();
  return arcs.map((arc) => {
    const remap = new Map<string, string>();
    const nodes = arc.nodes.map((n) => {
      if (!seen.has(n.id)) {
        seen.add(n.id);
        return n;
      }
      const id = newId();
      remap.set(n.id, id);
      seen.add(id);
      return { ...n, id };
    });
    if (remap.size === 0) return arc;
    const edges = arc.edges.map((e) => ({
      ...e,
      source: remap.get(e.source) ?? e.source,
      target: remap.get(e.target) ?? e.target,
    }));
    return { ...arc, nodes, edges };
  });
}

/** Deep-copy a graph giving every node and edge a fresh id (Duplicate Arc). */
export function cloneWithNewIds(
  nodes: Node<NodeData>[],
  edges: Edge[]
): { nodes: Node<NodeData>[]; edges: Edge[] } {
  const remap = new Map<string, string>();
  const ns = structuredClone(nodes).map((n) => {
    const id = newId();
    remap.set(n.id, id);
    return { ...n, id, selected: false };
  });
  const es = structuredClone(edges).map((e) => ({
    ...e,
    id: newId(),
    source: remap.get(e.source) ?? e.source,
    target: remap.get(e.target) ?? e.target,
    selected: false,
  }));
  return { nodes: ns, edges: es };
}

/**
 * Normalize any saved blob into a Project (current format: v3):
 * - v3 (`{ version:3, arcs, variables }`) / v2 (`{ version:2, arcs }`) → normalized;
 *   v2 simply gets `variables: []`.
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
    const unique = ensureUniqueIds(arcs);
    arcs.splice(0, arcs.length, ...unique);
    const activeArcId = arcs.some((a) => a.id === data.activeArcId)
      ? data.activeArcId
      : arcs[0].id;
    return {
      version: 3,
      meta: { title: data.meta?.title || 'My Story' },
      activeArcId,
      arcs,
      variables: migrateVariables(data.variables),
      classes: migrateClasses(data.classes),
    };
  }
  // v1: single graph
  const arc: Arc = {
    id: newId(),
    name: 'Arc 1',
    nodes: migrateNodes(data?.nodes),
    edges: Array.isArray(data?.edges) ? data.edges : [],
    nextId: data?.nextId ?? 1,
  };
  return { version: 3, meta: { title: 'My Story' }, activeArcId: arc.id, arcs: [arc], variables: [], classes: [] };
}

export function emptyArc(name: string): Arc {
  return { id: newId(), name, nodes: [], edges: [], nextId: 1 };
}
