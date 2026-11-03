// Pure story-graph traversal, shared by the in-app player (PlayMode)
// and the standalone HTML exporter.

import type { Edge, Node } from '@xyflow/react';
import type { NodeData, LoopData, FlowItem } from './types';

/** Entry point: a node with no incoming edges, else the first node. */
export function findStart(nodes: Node<NodeData>[], edges: Edge[]): Node<NodeData> | null {
  const targets = new Set(edges.map((e) => e.target));
  const orphans = nodes.filter((n) => !targets.has(n.id));
  return orphans[0] ?? nodes[0] ?? null;
}

/** Follow an outgoing edge from a node, optionally via a specific choice handle. */
export function nextNodeId(currentId: string, edges: Edge[], handleId?: string): string | null {
  const edge = edges.find(
    (e) => e.source === currentId && (handleId ? e.sourceHandle === handleId : true)
  );
  return edge?.target ?? null;
}

// ---------------------------------------------------------------------------
// Loop support
// ---------------------------------------------------------------------------

export function isLoopNode(node?: Node<NodeData> | null): boolean {
  return node?.type === 'loop';
}

export function loopItems(node: Node<NodeData>): FlowItem[] {
  return (node.data as LoopData).items ?? [];
}

/** A loop is complete once every item id appears in the done list. */
export function loopComplete(node: Node<NodeData>, doneIds: string[]): boolean {
  return loopItems(node).every((it) => doneIds.includes(it.id));
}

/** Handle id for a loop item's outgoing branch. */
export function itemHandle(itemId: string): string {
  return `item-${itemId}`;
}

/** Which item the player is currently inside (one frame per nested loop). */
export interface CallFrame {
  hubId: string;
  itemId: string;
}

export interface PlayState {
  currentId: string | null;
  callStack: CallFrame[];
  progress: Record<string, string[]>;
}

function cloneProgress(p: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const k in p) out[k] = [...p[k]];
  return out;
}

/**
 * Resolve where the player lands when navigating to `startId`.
 * Walks through any loop nodes: marking the just-finished item complete (when
 * returning), and auto-following the loop's `done` handle once every item is
 * done. Stops (returns) at the first non-loop node or an incomplete loop's menu.
 * Pure: clones callStack/progress, never mutates the inputs.
 */
export function resolveArrival(
  startId: string | null,
  callStack: CallFrame[],
  progress: Record<string, string[]>,
  edges: Edge[],
  nodeMap: Map<string, Node<NodeData>>
): PlayState {
  const cs: CallFrame[] = callStack.map((f) => ({ ...f }));
  const prog = cloneProgress(progress);
  let id = startId;
  let guard = 0;

  while (id != null && guard++ < 10000) {
    const node = nodeMap.get(id);
    if (!node || node.type !== 'loop') break;

    // Returning from an item of THIS loop -> mark it complete.
    const top = cs[cs.length - 1];
    if (top && top.hubId === id) {
      if (!prog[id]) prog[id] = [];
      if (!prog[id].includes(top.itemId)) prog[id].push(top.itemId);
      cs.pop();
    }
    if (!prog[id]) prog[id] = [];

    if (loopComplete(node, prog[id])) {
      const nx = nextNodeId(id, edges, 'done');
      if (nx == null) {
        id = null; // done handle unwired -> end the story
        break;
      }
      id = nx; // continue resolving (the next node may itself be a loop)
    } else {
      break; // pause at the loop menu
    }
  }

  return { currentId: id, callStack: cs, progress: prog };
}
