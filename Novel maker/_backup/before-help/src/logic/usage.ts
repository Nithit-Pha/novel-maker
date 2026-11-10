import type { Node } from '@xyflow/react';
import type { ClassDef, Condition, Effect, NodeData } from '../types';

function countEffects(effects: Effect[] | undefined, out: Record<string, number>) {
  for (const fx of effects ?? []) if (fx.op !== 'become') out[fx.varId] = (out[fx.varId] ?? 0) + 1;
}
function countCondition(cond: Condition | undefined, out: Record<string, number>) {
  for (const cl of cond?.clauses ?? []) if (cl.kind !== 'class') out[cl.varId] = (out[cl.varId] ?? 0) + 1;
}

/** How many effects/rules reference each variable id, across the given nodes (and classes' effects). */
export function variableUsage(nodeLists: Node<NodeData>[][], classes: ClassDef[] = []): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of classes) countEffects(c.effects, out);
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

/** How many rules, "become" effects and Choose class cards use each class id. */
export function classUsage(nodeLists: Node<NodeData>[][]): Record<string, number> {
  const out: Record<string, number> = {};
  const bump = (id: unknown) => {
    if (typeof id === 'string' && id) out[id] = (out[id] ?? 0) + 1;
  };
  const fx = (effects: Effect[] | undefined) => effects?.forEach((e) => e.op === 'become' && bump(e.value));
  const cond = (c: Condition | undefined) => c?.clauses.forEach((cl) => cl.kind === 'class' && bump(cl.classId));
  for (const nodes of nodeLists) {
    for (const n of nodes) {
      const d = n.data;
      fx(d.onEnter);
      if (d.kind === 'decision') d.choices.forEach((c) => (fx(c.effects), cond(c.condition)));
      else if (d.kind === 'condition') d.branches.forEach((b) => cond(b.condition));
      else if (d.kind === 'classpick') d.options.forEach(bump);
    }
  }
  return out;
}
