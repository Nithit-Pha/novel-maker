export type NodeKind =
  | 'chapter'
  | 'dialog'
  | 'decision'
  | 'scene'
  | 'loop'
  | 'portal'
  | 'condition'
  | 'chance'
  | 'status'
  | 'classpick'
  | 'end';

// ---------------------------------------------------------------------------
// Story state: variables, effects, conditions
// ---------------------------------------------------------------------------

export type VarType = 'bool' | 'number' | 'text';
export type VarValue = boolean | number | string;

/**
 * How a variable appears to readers in the Status panel (Status card / HUD).
 * yes/no → shown while "yes"; number → value (hidden at 0) or a bar when `max`
 * is set; text → shown while not empty.
 */
export interface VarShow {
  /** Heading it's listed under: "Items", "Abilities", "Power" or the writer's own. */
  group: string;
  /** Display name. Default: the variable name with "_" as spaces. */
  label?: string;
  /** Optional emoji shown before the name. */
  icon?: string;
  /** Numbers only: show as a bar "value / max". */
  max?: number;
}

/** A project-level story variable. References use `id`, so renaming is safe. */
export interface VariableDef {
  id: string;
  name: string;
  type: VarType;
  initial: VarValue;
  note?: string;
  /** Shown to readers in the Status panel. Missing = writer-only. */
  show?: VarShow;
}

/**
 * The HUD (Status slot beside the text) from this card on.
 * `show` with `groups: []` = every group. Missing on a card = keep what's showing.
 */
export type HudSetting = { mode: 'show'; groups: string[] } | { mode: 'hide' };

/** `become` = the reader becomes class `value` (a class id); `varId` is unused. */
export type EffectOp = 'set' | 'add' | 'sub' | 'toggle' | 'become';

/** A change to a variable, e.g. `trust_mira add 1`. */
export interface Effect {
  id: string;
  varId: string;
  op: EffectOp;
  value?: VarValue;
}

export type Cmp = '==' | '!=' | '>' | '>=' | '<' | '<=';

/**
 * One rule row, e.g. `trust_mira >= 5`.
 * `kind: 'class'` = "Class is / is not <classId>" (cmp `==` / `!=`; varId and value unused).
 * A parent class matches its sub-classes too.
 */
export interface Clause {
  id: string;
  varId: string;
  cmp: Cmp;
  value: VarValue;
  kind?: 'var' | 'class';
  classId?: string;
}

/** A class (Warrior, Mage…) or, with `parentId`, a sub-class (Knight). One level deep. */
export interface ClassDef {
  id: string;
  name: string;
  /** Optional emoji. */
  icon?: string;
  description?: string;
  /** Set = this is a sub-class of that class. */
  parentId?: string | null;
  /** Run when the reader becomes this class (starting stats, items, abilities). */
  effects: Effect[];
}

/** `all` = every rule must hold, `any` = at least one. No rules = always true. */
export interface Condition {
  mode: 'all' | 'any';
  clauses: Clause[];
}

// ---------------------------------------------------------------------------
// Node data
// ---------------------------------------------------------------------------

// Fields shared by every node kind.
// @xyflow/react v12 requires a node's `data` to be assignable to
// Record<string, unknown>, so the index signature lives here.
export interface CommonNodeData {
  /** Bookmarked node (feature: pins). */
  pinned?: boolean;
  /** Free-form labels for filtering (feature: tags). */
  tags?: string[];
  /** Variable changes applied every time the player arrives at this node. */
  onEnter?: Effect[];
  /**
   * Background image from the Scene Library, shown from this card on.
   * Missing / '' = keep the current background; 'none' = clear it.
   */
  sceneId?: string;
  /**
   * Save point: on an ending the reader can come back here, with variables,
   * loop progress and background as they were. Only on cards the reader stops on.
   */
  savePoint?: boolean;
  /** Status HUD from this card on: show (some / all groups) or hide. Missing = keep. */
  hud?: HudSetting;
  [key: string]: unknown;
}

/** Chapter start marker — holds only a chapter name. */
export interface ChapterData extends CommonNodeData {
  kind: 'chapter';
  name: string;
}

export interface DialogData extends CommonNodeData {
  kind: 'dialog';
  character: string;
  /** Library character this line belongs to (keeps the name in sync on rename). */
  characterId?: string;
  text: string;
}

/** One branch of a Loop node; identified by a stable id (handle `item-<id>`). */
export interface FlowItem {
  id: string;
  label: string;
}

/** A decision choice (handle `choice-<id>`), optionally with effects and a condition. */
export interface Choice extends FlowItem {
  /** Applied when the player picks this choice. */
  effects?: Effect[];
  /** The choice can only be picked while this holds. */
  condition?: Condition;
  /** What players see while the condition fails. Default: 'show-locked'. */
  whenLocked?: 'hide' | 'show-locked';
  /** Shown on a locked choice, e.g. "Requires trust ≥ 5". */
  lockedText?: string;
}

export interface DecisionData extends CommonNodeData {
  kind: 'decision';
  prompt: string;
  choices: Choice[];
}

export interface SceneData extends CommonNodeData {
  kind: 'scene';
  /** Optional caption, e.g. "Old mansion, night" (shown above the text in Run mode). */
  background: string;
  description: string;
}

export interface LoopData extends CommonNodeData {
  kind: 'loop';
  title: string;
  items: FlowItem[];
}

/** Jumps play to another Arc's start. Terminal within its own arc. */
export interface PortalData extends CommonNodeData {
  kind: 'portal';
  targetArcId: string | null;
  label?: string;
}

/** One branch of a Condition node (handle `branch-<id>`). */
export interface ConditionBranch {
  id: string;
  label: string;
  condition: Condition;
}

/** Silent router: first branch whose condition holds, else the `else` handle. */
export interface ConditionData extends CommonNodeData {
  kind: 'condition';
  title: string;
  branches: ConditionBranch[];
}

/** One outcome of a Chance node (handle `outcome-<id>`). */
export interface ChanceOutcome {
  id: string;
  label: string;
  weight: number;
}

/** Weighted random router. `reveal` shows the result as a card. */
export interface ChanceData extends CommonNodeData {
  kind: 'chance';
  title: string;
  outcomes: ChanceOutcome[];
  show: 'silent' | 'reveal';
}

/** Shows the reader their items / abilities / power (variables marked "Show to reader"). */
export interface StatusData extends CommonNodeData {
  kind: 'status';
  /** Heading, e.g. "Your inventory". Empty = "Your status". */
  title: string;
  /** Optional line under the heading. */
  text?: string;
  /** Groups to show, in this order. Empty = every group. */
  groups: string[];
}

/** The reader picks a class (or, in `subclass` mode, a sub-class of their current class). */
export interface ClassPickData extends CommonNodeData {
  kind: 'classpick';
  /** Heading, e.g. "Choose your path". */
  title: string;
  /** Optional line under the heading. */
  prompt: string;
  mode: 'class' | 'subclass';
  /** Class ids to offer. Empty = all (classes, or sub-classes of the current class). */
  options: string[];
}

/** Ending type from older saves (no longer edited or shown; kept so old files load). */
export type EndingType = 'good' | 'bad' | 'neutral' | 'true' | 'custom';

/** An ending. Every field is optional; an empty ending just shows "The End". */
export interface EndData extends CommonNodeData {
  kind: 'end';
  /** Optional name, e.g. "Two Keepers" — heading on the ending screen, used in search. */
  title: string;
  /** Context / narration shown on the ending screen. */
  description: string;
  /** Optional closing line: who speaks… */
  character?: string;
  /** Library character (keeps the name in sync on rename). */
  characterId?: string;
  /** …and what they say. */
  text?: string;
  /** @deprecated ignored; present only in older saves. */
  endingType?: EndingType;
}

export type NodeData =
  | ChapterData
  | DialogData
  | DecisionData
  | SceneData
  | LoopData
  | PortalData
  | ConditionData
  | ChanceData
  | StatusData
  | ClassPickData
  | EndData;
