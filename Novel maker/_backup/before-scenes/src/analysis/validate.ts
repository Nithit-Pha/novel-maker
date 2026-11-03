// Story check: finds structural problems in a project. Pure and fast (linear),
// so it can re-run shortly after every edit.

import type { Edge, Node } from '@xyflow/react';
import type { Condition, Effect, NodeData, VariableDef } from '../types';
import type { Project } from '../project';
import {
  branchHandle,
  choiceHandle,
  findStart,
  itemHandle,
  normHandle,
  outcomeHandle,
} from '../engine';

export type Severity = 'error' | 'warning' | 'note';

export interface Issue {
  /** Stable key (for React lists and dedup). */
  id: string;
  severity: Severity;
  arcId?: string;
  nodeId?: string;
  message: string;
}

type N = Node<NodeData>;

/** The output handles a card is expected to wire, with a human label for each. */
export function expectedOutputs(n: N): { handle: string; label: string }[] {
  const d = n.data;
  switch (d.kind) {
    case 'chapter':
    case 'scene':
    case 'dialog':
      return [{ handle: 'out', label: '' }];
    case 'decision':
      return d.choices.map((c, i) => ({ handle: choiceHandle(c.id), label: `Choice ${i + 1}${c.label ? ` “${c.label}”` : ''}` }));
    case 'condition':
      return [
        ...d.branches.map((b, i) => ({ handle: branchHandle(b.id), label: `Branch ${i + 1}${b.label ? ` “${b.label}”` : ''}` })),
        { handle: 'else', label: 'Else' },
      ];
    case 'chance':
      return d.outcomes.map((o, i) => ({ handle: outcomeHandle(o.id), label: `Outcome ${i + 1}${o.label ? ` “${o.label}”` : ''}` }));
    case 'loop':
      return [
        ...d.items.map((it, i) => ({ handle: itemHandle(it.id), label: `Item ${i + 1}${it.label ? ` “${it.label}”` : ''}` })),
        { handle: 'done', label: '“All done”' },
      ];
    default:
      return []; // portal, end
  }
}

function varRefs(n: N): { varId: string; where: string }[] {
  const out: { varId: string; where: string }[] = [];
  const fx = (effects: Effect[] | undefined, where: string) => effects?.forEach((e) => out.push({ varId: e.varId, where }));
  const cond = (c: Condition | undefined, where: string) => c?.clauses.forEach((cl) => out.push({ varId: cl.varId, where }));
  const d = n.data;
  fx(d.onEnter, 'on-enter changes');
  if (d.kind === 'decision') {
    d.choices.forEach((c, i) => {
      fx(c.effects, `choice ${i + 1}`);
      cond(c.condition, `choice ${i + 1}`);
    });
  } else if (d.kind === 'condition') {
    d.branches.forEach((b, i) => cond(b.condition, `branch ${i + 1}`));
  }
  return out;
}

/** Arc ids reachable from the first arc (following Go to Arc cards), and cards reachable in them. */
export function structuralReach(project: Project): { arcs: Set<string>; nodes: Set<string> } {
  const arcs = new Set<string>();
  const nodes = new Set<string>();
  const byId = new Map(project.arcs.map((a) => [a.id, a]));
  const first = project.arcs[0];
  if (!first) return { arcs, nodes };
  const queue: { arcId: string; nodeId: string }[] = [];
  const enterArc = (arcId: string) => {
    const a = byId.get(arcId);
    if (!a) return;
    if (!arcs.has(arcId)) arcs.add(arcId);
    const st = findStart(a.nodes, a.edges);
    if (st && !nodes.has(st.id)) {
      nodes.add(st.id);
      queue.push({ arcId, nodeId: st.id });
    }
  };
  enterArc(first.id);
  while (queue.length) {
    const { arcId, nodeId } = queue.shift()!;
    const a = byId.get(arcId)!;
    const n = a.nodes.find((x) => x.id === nodeId);
    if (n?.data.kind === 'portal' && n.data.targetArcId) enterArc(n.data.targetArcId);
    for (const e of a.edges) {
      if (e.source !== nodeId || nodes.has(e.target)) continue;
      if (!a.nodes.some((x) => x.id === e.target)) continue;
      nodes.add(e.target);
      queue.push({ arcId, nodeId: e.target });
    }
  }
  return { arcs, nodes };
}

export function validateProject(project: Project): Issue[] {
  const issues: Issue[] = [];
  const push = (i: Omit<Issue, 'id'>) =>
    issues.push({ ...i, id: `${i.severity}:${i.arcId ?? ''}:${i.nodeId ?? ''}:${i.message}` });
  const arcIds = new Set(project.arcs.map((a) => a.id));
  const vars = new Map<string, VariableDef>(project.variables.map((v) => [v.id, v]));

  // Variables
  const seen = new Map<string, number>();
  for (const v of project.variables) {
    const name = v.name.trim();
    if (!name) push({ severity: 'warning', message: 'A variable has no name.' });
    else seen.set(name, (seen.get(name) ?? 0) + 1);
  }
  for (const [name, count] of seen) {
    if (count > 1) push({ severity: 'warning', message: `${count} variables are called “${name}”. Rules can’t tell them apart by name.` });
  }

  const reach = structuralReach(project);

  for (const arc of project.arcs) {
    const edges: Edge[] = arc.edges;
    const nodeIds = new Set(arc.nodes.map((n) => n.id));

    if (arc.nodes.length > 0 && !reach.arcs.has(arc.id)) {
      push({
        severity: 'warning',
        arcId: arc.id,
        message: `Arc “${arc.name}” is never reached — no “Go to Arc” card leads here.`,
      });
    }

    // Unreachable cards: report the first card of each cut-off section once,
    // with how many cards follow it (instead of one warning per card).
    const unreachableRoots = new Map<string, number>();
    if (reach.arcs.has(arc.id)) {
      const lost = new Set(arc.nodes.filter((n) => !reach.nodes.has(n.id)).map((n) => n.id));
      const covered = new Set<string>();
      const fed = new Set(edges.filter((e) => lost.has(e.source) && lost.has(e.target)).map((e) => e.target));
      const ordered = [...lost].sort((a, b) => Number(fed.has(a)) - Number(fed.has(b))); // roots first
      for (const id of ordered) {
        if (covered.has(id)) continue;
        const q = [id];
        covered.add(id);
        let after = 0;
        while (q.length) {
          const cur = q.shift()!;
          for (const e of edges) {
            if (e.source !== cur || !lost.has(e.target) || covered.has(e.target)) continue;
            covered.add(e.target);
            after++;
            q.push(e.target);
          }
        }
        unreachableRoots.set(id, after);
      }
    }

    for (const n of arc.nodes) {
      const d = n.data;
      const at = { arcId: arc.id, nodeId: n.id };

      // Reachability (only inside arcs that are reached, else the arc warning covers it)
      if (unreachableRoots.has(n.id)) {
        const after = unreachableRoots.get(n.id)!;
        push({
          severity: 'warning',
          ...at,
          message: after ? `No route reaches this card, nor the ${after} card${after === 1 ? '' : 's'} after it.` : 'No route reaches this card.',
        });
      }

      // Outputs
      const outs = expectedOutputs(n);
      const wired = new Map<string, number>();
      for (const e of edges) {
        if (e.source !== n.id || !nodeIds.has(e.target)) continue;
        const h = normHandle(e.sourceHandle);
        wired.set(h, (wired.get(h) ?? 0) + 1);
      }
      for (const o of outs) {
        const count = wired.get(o.handle) ?? 0;
        if (count === 0) {
          if (o.handle === 'out') push({ severity: 'warning', ...at, message: 'The story stops here without an Ending card.' });
          else if (o.handle === 'else')
            push({ severity: 'warning', ...at, message: 'Else isn’t connected — the story stops when no branch matches.' });
          else push({ severity: 'warning', ...at, message: `${o.label} isn’t connected.` });
        } else if (count > 1) {
          push({ severity: 'warning', ...at, message: `${o.label || 'This output'} has ${count} wires; only the first is followed.` });
        }
      }
      if (d.kind === 'decision' && d.choices.length === 0) push({ severity: 'warning', ...at, message: 'This decision has no choices.' });
      if (d.kind === 'chance' && d.outcomes.length === 0) push({ severity: 'warning', ...at, message: 'This chance card has no outcomes.' });
      if (d.kind === 'loop' && d.items.length === 0) push({ severity: 'warning', ...at, message: 'This loop has no items.' });

      // Go to Arc
      if (d.kind === 'portal') {
        if (!d.targetArcId) push({ severity: 'warning', ...at, message: 'Go to Arc has no target arc.' });
        else if (!arcIds.has(d.targetArcId)) push({ severity: 'error', ...at, message: 'Go to Arc points to an arc that was deleted.' });
      }

      // Variables used by rules / effects
      const missing = varRefs(n).filter((r) => !r.varId || !vars.has(r.varId));
      if (missing.length) {
        const where = [...new Set(missing.map((m) => m.where))].join(', ');
        push({ severity: 'error', ...at, message: `Uses a deleted or unset variable (${where}).` });
      }

      // Empty text
      if (d.kind === 'dialog' && !d.text?.trim()) push({ severity: 'note', ...at, message: 'Dialogue has no text.' });
      if (d.kind === 'decision') {
        if (!d.prompt?.trim()) push({ severity: 'note', ...at, message: 'Decision has no question.' });
        d.choices.forEach((c, i) => {
          if (!c.label.trim()) push({ severity: 'note', ...at, message: `Choice ${i + 1} has no text.` });
        });
      }
    }
  }
  return issues;
}

export const SEVERITY_ORDER: Severity[] = ['error', 'warning', 'note'];
