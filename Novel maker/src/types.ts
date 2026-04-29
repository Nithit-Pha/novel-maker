export type NodeKind = 'start' | 'dialog' | 'decision';

export interface DialogData {
  kind: 'dialog';
  character: string;
  text: string;
}

export interface DecisionData {
  kind: 'decision';
  prompt: string;
  choices: string[];
}

export interface StartData {
  kind: 'start';
  text: string;
}

export type NodeData = DialogData | DecisionData | StartData;
