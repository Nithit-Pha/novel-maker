// Types for core.js (the runtime shared by Run mode and the HTML export).

import type {
  ChanceOutcome,
  Choice,
  Condition,
  Effect,
  VariableDef,
  VarType,
  VarValue,
} from '../types';

/** Minimal node/edge shapes the runtime needs (React Flow nodes satisfy them). */
export interface RtNode {
  id: string;
  type?: string;
  position?: { x: number; y: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}
export interface RtEdge {
  source: string;
  target: string;
  sourceHandle?: string | null;
}

export interface StoryInput {
  arcs: { id: string; name: string; nodes: RtNode[]; edges: RtEdge[] }[];
  variables?: VariableDef[];
}
export interface IndexedArc {
  id: string;
  name: string;
  nodes: RtNode[];
  edges: RtEdge[];
  map: Record<string, RtNode>;
}
export interface StoryIndex {
  arcs: Record<string, IndexedArc>;
  order: string[];
  variables: VariableDef[];
}

export type Vars = Record<string, VarValue>;

export interface CallFrame {
  hubId: string;
  itemId: string;
}

export interface PlayState {
  arcId: string;
  currentId: string | null;
  callStack: CallFrame[];
  progress: Record<string, string[]>;
  vars: Vars;
  /** Set while a revealed Chance result is on screen. */
  roll: { nodeId: string; outcomeId: string } | null;
}

export type Rng = () => number;
/** Chooses a Chance outcome (the route explorer uses this to try every outcome). */
export type ChancePick = (node: RtNode, outcomes: ChanceOutcome[]) => ChanceOutcome | null;

export function normHandle(h?: string | null): string;
export function choiceHandle(id: string): string;
export function itemHandle(id: string): string;
export function branchHandle(id: string): string;
export function outcomeHandle(id: string): string;

export function findStart<N extends RtNode>(nodes: N[], edges: RtEdge[]): N | null;
export function nextNodeId(currentId: string, edges: RtEdge[], handleId?: string): string | null;
export function isWired(nodeId: string, edges: RtEdge[], handleId?: string): boolean;

export function defaultValue(type: VarType): VarValue;
export function coerce(type: VarType, value: unknown): VarValue;
export function initialVars(defs: VariableDef[] | undefined): Vars;
export function applyEffects(effects: Effect[] | undefined, vars: Vars): Vars;
export function evaluate(cond: Condition | undefined, vars: Vars): boolean;
export function describeCondition(cond: Condition | undefined, defs: VariableDef[]): string;
export function describeEffects(effects: Effect[] | undefined, defs: VariableDef[]): string;
export function choiceState(choice: Choice, vars: Vars): { available: boolean; visible: boolean };

export function pickOutcome(outcomes: ChanceOutcome[], rng?: Rng): ChanceOutcome | null;
export function outcomeOdds(outcomes: ChanceOutcome[]): number[];

export function buildIndex(story: StoryInput): StoryIndex;
export function land(
  index: StoryIndex,
  arcId: string,
  rawId: string | null,
  base: { callStack: CallFrame[]; progress: Record<string, string[]>; vars: Vars },
  rng?: Rng,
  pick?: ChancePick
): PlayState;
export function startPlay(index: StoryIndex, startArcId: string, rng?: Rng, pick?: ChancePick): PlayState;
export function startAt(index: StoryIndex, arcId: string, nodeId: string, vars?: Vars, rng?: Rng, pick?: ChancePick): PlayState;
export function currentNode(index: StoryIndex, state: PlayState): RtNode | null;
export function hasNext(index: StoryIndex, state: PlayState): boolean;
export function next(index: StoryIndex, state: PlayState, rng?: Rng, pick?: ChancePick): PlayState;
export function choose(index: StoryIndex, state: PlayState, choiceId: string, rng?: Rng, pick?: ChancePick): PlayState;
export function enterItem(index: StoryIndex, state: PlayState, itemId: string, rng?: Rng, pick?: ChancePick): PlayState;
