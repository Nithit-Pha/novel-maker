import type { Node } from '@xyflow/react';
import type { NodeData } from '../types';
import { normHandle, outcomeOdds } from '../engine';

const MAX = 28;
const cut = (s: string) => (s.length > MAX ? `${s.slice(0, MAX - 1)}…` : s);

/** Text shown on a wire, from the output it leaves (choice, branch, outcome, loop item). */
export function wireLabel(source: Node<NodeData> | undefined, sourceHandle: string | null | undefined): string | undefined {
  if (!source) return undefined;
  const d = source.data;
  const h = normHandle(sourceHandle);
  if (d.kind === 'decision') {
    const i = d.choices.findIndex((c) => `choice-${c.id}` === h);
    if (i < 0) return undefined;
    return `${i + 1} · ${cut(d.choices[i].label.trim() || `Choice ${i + 1}`)}`;
  }
  if (d.kind === 'condition') {
    if (h === 'else') return 'Else';
    const i = d.branches.findIndex((b) => `branch-${b.id}` === h);
    return i < 0 ? undefined : cut(d.branches[i].label.trim() || `Branch ${i + 1}`);
  }
  if (d.kind === 'chance') {
    const i = d.outcomes.findIndex((o) => `outcome-${o.id}` === h);
    if (i < 0) return undefined;
    const pct = Math.round((outcomeOdds(d.outcomes)[i] ?? 0) * 100);
    return `${cut(d.outcomes[i].label.trim() || `Outcome ${i + 1}`)} · ${pct}%`;
  }
  if (d.kind === 'loop') {
    if (h === 'done') return 'All done';
    const it = d.items.find((x) => `item-${x.id}` === h);
    return it ? cut(it.label.trim() || 'Item') : undefined;
  }
  return undefined;
}
