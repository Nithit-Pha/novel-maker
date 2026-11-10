// Scene helpers for the editor: where scenes are used, and which background
// would be showing when the reader reaches a card.

import type { Edge, Node } from '@xyflow/react';
import type { NodeData } from '../types';
import type { Project } from '../project';
import { NO_SCENE, hudAfter, sceneAfter } from '../engine';

/** How many cards (in every arc) set each scene. */
export function sceneUsage(project: Pick<Project, 'arcs'>): Map<string, number> {
  const out = new Map<string, number>();
  for (const a of project.arcs)
    for (const n of a.nodes) {
      const id = n.data?.sceneId;
      if (id && id !== NO_SCENE) out.set(id, (out.get(id) ?? 0) + 1);
    }
  return out;
}

/**
 * The background showing when the reader arrives at `nodeId`, before the card
 * itself changes it: the scene set on the nearest card leading here (walking
 * the wires backwards). Used by "Play from here". null = none found.
 */
export function sceneBefore(nodes: Node<NodeData>[], edges: Edge[], nodeId: string): string | null {
  const n = nearestBefore(nodes, edges, nodeId, (d) => !!d.sceneId);
  return n ? sceneAfter(n, null) : null;
}

/** The Status HUD showing when the reader arrives at `nodeId` (nearest card before it that sets one). */
export function hudBefore(nodes: Node<NodeData>[], edges: Edge[], nodeId: string): string[] | null {
  const n = nearestBefore(nodes, edges, nodeId, (d) => !!d.hud);
  return n ? hudAfter(n, null) : null;
}

/** Nearest card leading to `nodeId` (walking wires backwards, breadth-first) that passes `test`. */
function nearestBefore(
  nodes: Node<NodeData>[],
  edges: Edge[],
  nodeId: string,
  test: (d: NodeData) => boolean
): Node<NodeData> | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, string[]>();
  for (const e of edges) {
    const list = incoming.get(e.target) ?? [];
    list.push(e.source);
    incoming.set(e.target, list);
  }
  const seen = new Set([nodeId]);
  let frontier = [nodeId];
  while (frontier.length) {
    const nextFrontier: string[] = [];
    for (const id of frontier)
      for (const src of incoming.get(id) ?? []) {
        if (seen.has(src)) continue;
        seen.add(src);
        const n = byId.get(src);
        if (n?.data && test(n.data)) return n;
        nextFrontier.push(src);
      }
    frontier = nextFrontier;
  }
  return null;
}
