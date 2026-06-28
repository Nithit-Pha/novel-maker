export type NodeKind = 'chapter' | 'dialog' | 'decision' | 'scene' | 'loop';

// Fields shared by every node kind.
// @xyflow/react v12 requires a node's `data` to be assignable to
// Record<string, unknown>, so the index signature lives here.
export interface CommonNodeData {
  /** Bookmarked node (feature: pins). */
  pinned?: boolean;
  /** Free-form labels for filtering (feature: tags). */
  tags?: string[];
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
  text: string;
}

export interface DecisionData extends CommonNodeData {
  kind: 'decision';
  prompt: string;
  choices: string[];
}

export interface SceneData extends CommonNodeData {
  kind: 'scene';
  background: string;
  description: string;
}

/** One branch of a Loop node; identified by a stable id (handle `item-<id>`). */
export interface FlowItem {
  id: string;
  label: string;
}

export interface LoopData extends CommonNodeData {
  kind: 'loop';
  title: string;
  items: FlowItem[];
}

export type NodeData = ChapterData | DialogData | DecisionData | SceneData | LoopData;
