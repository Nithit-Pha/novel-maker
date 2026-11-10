// Route explorer: plays every possible route through the story (breadth-first),
// using the same runtime core as Run mode — so locks, Condition cards, loops,
// portals and variables behave exactly as they do for a reader. Chance cards
// branch into every outcome that can happen. The search stops at a state limit.

import type { Node } from '@xyflow/react';
import type { ChanceOutcome, Choice, NodeData } from '../types';
import type { Project } from '../project';
import {
  buildIndex,
  choiceState,
  choose,
  classOptions,
  className,
  currentClasses,
  currentNode,
  enterItem,
  isWired,
  itemHandle,
  next,
  outcomeOdds,
  pickClass,
  startPlay,
  type ChancePick,
  type PlayState,
  type StoryIndex,
} from '../engine';

export const STATE_LIMIT = 20000;
/** Safety limit on Chance combinations tried for a single reader action. */
const RUNS_PER_ACTION = 512;
const COUNT_CAP = 1e9;

export type RouteAction =
  | { type: 'next' }
  | { type: 'choose'; choiceId: string }
  | { type: 'item'; itemId: string }
  | { type: 'class'; classId: string };

export interface ChanceRoll {
  nodeId: string;
  outcomeId: string;
}

/** One reader action (taken at arcId/nodeId) and the Chance results it led to. */
export interface RouteStep {
  arcId: string;
  nodeId: string;
  action: RouteAction;
  rolls: ChanceRoll[];
}

export interface Route {
  startArcId: string;
  /** Chance results drawn before the first card the reader sees. */
  initialRolls: ChanceRoll[];
  steps: RouteStep[];
}

export interface EndingResult {
  arcId: string;
  nodeId: string;
  label: string;
  reachable: boolean;
  /** Number of distinct routes (capped). */
  routes: number;
  shortest?: Route;
  /** Classes that reach this ending ("🔥 Mage · Pyromancer", "No class"), when the story has classes. */
  classes?: string[];
}

export interface ExploreResult {
  startArcId: string | null;
  states: number;
  /** Stopped at STATE_LIMIT — "not reached" results may be incomplete. */
  truncated: boolean;
  /** The story can return to an identical situation (an endless loop is possible). */
  hasLoops: boolean;
  endings: EndingResult[];
  /** Routes that stop on a card with nothing connected (not an Ending card). */
  openEnds: number;
  /** Choices seen on some route but locked on every route. */
  alwaysLocked: { arcId: string; nodeId: string; choiceId: string; index: number }[];
}

type N = Node<NodeData>;

/** Display names for every Ending card: its title, else "Ending 1", "Ending 2"… (story order). */
export function endingLabels(project: Project): Map<string, { arcId: string; label: string }> {
  const out = new Map<string, { arcId: string; label: string }>();
  let i = 0;
  for (const arc of project.arcs) {
    const ends = (arc.nodes as N[])
      .filter((n) => n.data.kind === 'end')
      .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
    for (const n of ends) {
      i++;
      const title = n.data.kind === 'end' ? n.data.title?.trim() : '';
      out.set(n.id, { arcId: arc.id, label: title || `Ending ${i}` });
    }
  }
  return out;
}

function stateKey(s: PlayState): string {
  const prog = Object.keys(s.progress)
    .sort()
    .map((k) => `${k}:${[...s.progress[k]].sort().join(',')}`)
    .join(';');
  const vars = Object.keys(s.vars)
    .sort()
    .map((k) => `${k}=${JSON.stringify(s.vars[k])}`)
    .join(';');
  const cs = s.callStack.map((f) => `${f.hubId}/${f.itemId}`).join('>');
  return [s.arcId, s.currentId ?? '∅', cs, prog, vars, s.roll?.outcomeId ?? ''].join('|');
}

function possibleOutcomes(outcomes: ChanceOutcome[]): number[] {
  const odds = outcomeOdds(outcomes);
  return odds.map((p, i) => (p > 0 ? i : -1)).filter((i) => i >= 0);
}

/** Run `fn` once for every combination of Chance outcomes it can meet. */
function allOutcomes(fn: (pick: ChancePick) => PlayState): { state: PlayState; rolls: ChanceRoll[]; overflow: boolean } [] {
  const results: { state: PlayState; rolls: ChanceRoll[]; overflow: boolean }[] = [];
  const scripts: number[][] = [[]];
  let runs = 0;
  while (scripts.length) {
    if (++runs > RUNS_PER_ACTION) {
      results.push({ state: results[0]?.state ?? fn(() => null), rolls: [], overflow: true });
      break;
    }
    const script = scripts.pop()!;
    let i = 0;
    let branched = false;
    const rolls: ChanceRoll[] = [];
    const pick: ChancePick = (node, outcomes) => {
      const options = possibleOutcomes(outcomes);
      if (options.length === 0) return null;
      let k: number;
      if (i < script.length) k = script[i];
      else {
        // first unexplored Chance: try every outcome from here
        if (!branched) {
          branched = true;
          for (let j = options.length - 1; j >= 0; j--) scripts.push([...script, options[j]]);
        }
        k = options[0];
      }
      i++;
      rolls.push({ nodeId: node.id, outcomeId: outcomes[k].id });
      return outcomes[k];
    };
    const state = fn(pick);
    if (!branched) results.push({ state, rolls, overflow: false });
  }
  return results;
}

interface GNode {
  state: PlayState;
  parent: string | null; // null = a start state
  via: RouteStep | null;
  initialRolls: ChanceRoll[];
  edges: string[];
  terminal: boolean;
}

export function exploreRoutes(project: Project, limit = STATE_LIMIT): ExploreResult {
  const labels = endingLabels(project);
  const empty: ExploreResult = {
    startArcId: null,
    states: 0,
    truncated: false,
    hasLoops: false,
    endings: [...labels].map(([nodeId, v]) => ({ nodeId, arcId: v.arcId, label: v.label, reachable: false, routes: 0 })),
    openEnds: 0,
    alwaysLocked: [],
  };
  const startArc = project.arcs[0];
  if (!startArc) return empty;
  const index: StoryIndex = buildIndex(project);

  const graph = new Map<string, GNode>();
  const queue: string[] = [];
  const roots: string[] = [];
  let truncated = false;
  const decisionsSeen = new Set<string>(); // nodeId
  const available = new Set<string>(); // nodeId|choiceId
  const firstReach = new Map<string, string>(); // end nodeId → state key (BFS = shortest)
  // Which classes reach each ending (only when the story has classes).
  const hasClasses = (project.classes ?? []).length > 0;
  const endClasses = new Map<string, Set<string>>();
  const classLabel = (s: PlayState) => {
    const cs = currentClasses(project.classes, s.vars);
    return cs.length ? cs.map((c, i) => (i === 0 ? className(project.classes, c.id) : c.name)).join(' · ') : 'No class';
  };

  const isTerminal = (s: PlayState) => {
    const n = currentNode(index, s);
    return !n || n.type === 'end';
  };

  const add = (state: PlayState, parent: string | null, via: RouteStep | null, initialRolls: ChanceRoll[]): string | null => {
    const k = stateKey(state);
    if (graph.has(k)) return k;
    if (graph.size >= limit) {
      truncated = true;
      return null;
    }
    const terminal = isTerminal(state);
    graph.set(k, { state, parent, via, initialRolls, edges: [], terminal });
    if (!terminal) queue.push(k);
    else if (state.currentId && !firstReach.has(state.currentId)) firstReach.set(state.currentId, k);
    if (terminal && hasClasses && state.currentId) {
      const set = endClasses.get(state.currentId) ?? new Set<string>();
      set.add(classLabel(state));
      endClasses.set(state.currentId, set);
    }
    return k;
  };

  for (const r of allOutcomes((pick) => startPlay(index, startArc.id, undefined, pick))) {
    if (r.overflow) truncated = true;
    const k = add(r.state, null, null, r.rolls);
    if (k && !roots.includes(k)) roots.push(k);
  }

  while (queue.length) {
    const k = queue.shift()!;
    const g = graph.get(k)!;
    const s = g.state;
    const node = currentNode(index, s)!;
    const edges = index.arcs[s.arcId].edges;
    const actions: RouteAction[] = [];
    if (node.type === 'decision') {
      decisionsSeen.add(node.id);
      for (const c of (node.data.choices ?? []) as Choice[]) {
        if (!choiceState(c, s.vars).available) continue;
        available.add(`${node.id}|${c.id}`);
        actions.push({ type: 'choose', choiceId: c.id });
      }
    } else if (node.type === 'classpick' && classOptions(index, s, node).length) {
      for (const c of classOptions(index, s, node)) actions.push({ type: 'class', classId: c.id });
    } else if (node.type === 'loop') {
      const done = s.progress[node.id] ?? [];
      for (const it of node.data.items ?? []) {
        if (!done.includes(it.id) && isWired(node.id, edges, itemHandle(it.id))) actions.push({ type: 'item', itemId: it.id });
      }
    } else {
      actions.push({ type: 'next' });
    }

    for (const action of actions) {
      const run = (pick: ChancePick) =>
        action.type === 'next'
          ? next(index, s, undefined, pick)
          : action.type === 'choose'
          ? choose(index, s, action.choiceId, undefined, pick)
          : action.type === 'class'
          ? pickClass(index, s, action.classId, undefined, pick)
          : enterItem(index, s, action.itemId, undefined, pick);
      for (const r of allOutcomes(run)) {
        if (r.overflow) truncated = true;
        const step: RouteStep = { arcId: s.arcId, nodeId: node.id, action, rolls: r.rolls };
        const to = add(r.state, k, step, []);
        if (to) g.edges.push(to);
      }
    }
  }

  // ---- Count routes per ending (DFS over the state graph, back edges = loops) ----
  let hasLoops = false;
  const counts = new Map<string, Map<string, number>>();
  const mark = new Map<string, 1 | 2>(); // 1 = on stack, 2 = done
  const backEdges = new Set<string>();
  for (const root of roots) {
    if (mark.has(root)) continue;
    const stack: { k: string; i: number }[] = [{ k: root, i: 0 }];
    mark.set(root, 1);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const g = graph.get(top.k)!;
      if (top.i < g.edges.length) {
        const to = g.edges[top.i++];
        const m = mark.get(to);
        if (m === 1) {
          hasLoops = true;
          backEdges.add(`${top.k}→${to}`);
        } else if (!m) {
          mark.set(to, 1);
          stack.push({ k: to, i: 0 });
        }
        continue;
      }
      // post-order: combine children
      const c = new Map<string, number>();
      if (g.terminal) c.set(g.state.currentId ?? '∅', 1);
      for (const to of g.edges) {
        if (backEdges.has(`${top.k}→${to}`)) continue;
        for (const [end, n] of counts.get(to) ?? []) c.set(end, Math.min(COUNT_CAP, (c.get(end) ?? 0) + n));
      }
      counts.set(top.k, c);
      mark.set(top.k, 2);
      stack.pop();
    }
  }
  const total = new Map<string, number>();
  for (const r of roots) for (const [end, n] of counts.get(r) ?? []) total.set(end, Math.min(COUNT_CAP, (total.get(end) ?? 0) + n));

  const routeTo = (k: string): Route => {
    const steps: RouteStep[] = [];
    let cur: string | null = k;
    let initialRolls: ChanceRoll[] = [];
    while (cur) {
      const g: GNode = graph.get(cur)!;
      if (g.via) steps.unshift(g.via);
      if (!g.parent) initialRolls = g.initialRolls;
      cur = g.parent;
    }
    return { startArcId: startArc.id, initialRolls, steps };
  };

  const endings: EndingResult[] = [...labels].map(([nodeId, v]) => {
    const k = firstReach.get(nodeId);
    return {
      nodeId,
      arcId: v.arcId,
      label: v.label,
      reachable: !!k,
      routes: total.get(nodeId) ?? 0,
      shortest: k ? routeTo(k) : undefined,
      classes: hasClasses ? [...(endClasses.get(nodeId) ?? [])].sort() : undefined,
    };
  });

  const alwaysLocked: ExploreResult['alwaysLocked'] = [];
  if (!truncated) {
    for (const arc of project.arcs) {
      for (const n of arc.nodes as N[]) {
        if (n.data.kind !== 'decision' || !decisionsSeen.has(n.id)) continue;
        n.data.choices.forEach((c, i) => {
          if (!available.has(`${n.id}|${c.id}`)) alwaysLocked.push({ arcId: arc.id, nodeId: n.id, choiceId: c.id, index: i });
        });
      }
    }
  }

  return {
    startArcId: startArc.id,
    states: graph.size,
    truncated,
    hasLoops,
    endings,
    openEnds: total.get('∅') ?? 0,
    alwaysLocked,
  };
}

/** Replay a route: the states a reader passes through (start … ending). */
export function replayRoute(project: Project, route: Route): PlayState[] {
  const index = buildIndex(project);
  const queue = [...route.initialRolls];
  const pick: ChancePick = (node, outcomes) => {
    const want = queue[0]?.nodeId === node.id ? queue.shift() : undefined;
    return outcomes.find((o) => o.id === want?.outcomeId) ?? outcomes[0] ?? null;
  };
  const states: PlayState[] = [startPlay(index, route.startArcId, undefined, pick)];
  for (const step of route.steps) {
    queue.push(...step.rolls);
    const s = states[states.length - 1];
    const a = step.action;
    const ns =
      a.type === 'next'
        ? next(index, s, undefined, pick)
        : a.type === 'choose'
        ? choose(index, s, a.choiceId, undefined, pick)
        : a.type === 'class'
        ? pickClass(index, s, a.classId, undefined, pick)
        : enterItem(index, s, a.itemId, undefined, pick);
    states.push(ns);
  }
  return states;
}
