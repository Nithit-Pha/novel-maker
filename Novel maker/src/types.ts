export type NodeKind = 'start' | 'dialog' | 'decision';

// @xyflow/react v12 requires a node's `data` to be assignable to
// Record<string, unknown>, so each data interface carries an index signature.
export interface DialogData {
  kind: 'dialog';
  character: string;
  text: string;
  [key: string]: unknown;
}

export interface DecisionData {
  kind: 'decision';
  prompt: string;
  choices: string[];
  [key: string]: unknown;
}

export interface StartData {
  kind: 'start';
  text: string;
  [key: string]: unknown;
}

export type NodeData = DialogData | DecisionData | StartData;
