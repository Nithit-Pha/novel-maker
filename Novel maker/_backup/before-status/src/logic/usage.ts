import type { Node } from '@xyflow/react';
import type { Condition, Effect, NodeData } from '../types';

function countEffects(effects: Effect[] | undefined, out: Record<string, number>) {
  for (const fx of effects ?? []) out[fx.varId] = (out[fx.varId] ?? 0) + 1;
}
function countCondition(cond: Condition | undefined, out: Record<string, number>) {
  for (const cl of cond?.clauses ?? []) out[cl.varId] = (out[cl.varId] ?? 0) + 1;
}

/** How many effects/rules reference each variable id, across the given nodes. */
export function variableUsage(nodeLists: Node<NodeData>[][]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const nodes of nodeLists) {
    for (const n of nodes) {
      const d = n.data;
      countEffects(d.onEnter, out);
      if (d.kind === 'decision') {
        for (const c of d.choices) {
          countEffects(c.effects, out);
          countCondition(c.condition, out);
        }
      } else if (d.kind === 'condition') {
        for (const b of d.branches) countCondition(b.condition, out);
      }
    }
  }
  return out;
}
