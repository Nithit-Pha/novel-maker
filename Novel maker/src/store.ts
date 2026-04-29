import { create } from 'zustand';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import type { NodeKind, NodeData } from './types';

const STORAGE_KEY = 'novel-flow-v1';
const HISTORY_LIMIT = 50;

interface Snapshot {
  nodes: Node<NodeData>[];
  edges: Edge[];
  nextId: number;
}

interface FlowState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  nextId: number;
  past: Snapshot[];
  future: Snapshot[];

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (kind: NodeKind, position?: { x: number; y: number }) => void;
  updateNodeData: (id: string, patch: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  commitDrag: () => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  saveLocal: () => void;
  loadLocal: () => boolean;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  reset: () => void;
}

function defaultData(kind: NodeKind): NodeData {
  if (kind === 'dialog') return { kind, character: '', text: '' };
  if (kind === 'decision') return { kind, prompt: '', choices: ['Yes', 'No'] };
  return { kind: 'start', text: '' };
}

function snapshot(s: Pick<FlowState, 'nodes' | 'edges' | 'nextId'>): Snapshot {
  // structuredClone keeps history entries fully independent
  return {
    nodes: structuredClone(s.nodes),
    edges: structuredClone(s.edges),
    nextId: s.nextId,
  };
}

const demoNodes: Node<NodeData>[] = [
  {
    id: 'n1',
    type: 'start',
    position: { x: 0, y: 200 },
    data: { kind: 'start', text: 'It was a dark and stormy night. Sarah stood at the door of the old mansion...' },
  },
  {
    id: 'n2',
    type: 'dialog',
    position: { x: 350, y: 200 },
    data: { kind: 'dialog', character: 'Sarah', text: 'Should I really go in? The door is open...' },
  },
  {
    id: 'n3',
    type: 'decision',
    position: { x: 700, y: 150 },
    data: {
      kind: 'decision',
      prompt: 'What does Sarah do?',
      choices: ['Enter the mansion', 'Turn back home', 'Call for help'],
    },
  },
  {
    id: 'n4',
    type: 'dialog',
    position: { x: 1100, y: 0 },
    data: { kind: 'dialog', character: 'Narrator', text: 'Sarah pushed the door open. The hinges creaked ominously.' },
  },
  {
    id: 'n5',
    type: 'dialog',
    position: { x: 1100, y: 200 },
    data: { kind: 'dialog', character: 'Sarah', text: "This is a bad idea. I'm going home." },
  },
  {
    id: 'n6',
    type: 'dialog',
    position: { x: 1100, y: 400 },
    data: { kind: 'dialog', character: 'Sarah', text: 'Hello?! Is anyone out there?' },
  },
];

const demoEdges: Edge[] = [
  { id: 'e1', source: 'n1', target: 'n2' },
  { id: 'e2', source: 'n2', target: 'n3' },
  { id: 'e3', source: 'n3', sourceHandle: 'choice-0', target: 'n4' },
  { id: 'e4', source: 'n3', sourceHandle: 'choice-1', target: 'n5' },
  { id: 'e5', source: 'n3', sourceHandle: 'choice-2', target: 'n6' },
];

export const useFlowStore = create<FlowState>((set, get) => {
  // Push current state into history. Caps the history length.
  const pushHistory = () => {
    const { nodes, edges, nextId, past } = get();
    const newPast = [...past, snapshot({ nodes, edges, nextId })];
    if (newPast.length > HISTORY_LIMIT) newPast.shift();
    set({ past: newPast, future: [] });
  };

  return {
    nodes: demoNodes,
    edges: demoEdges,
    nextId: 7,
    past: [],
    future: [],

    onNodesChange: (changes) => {
      // For drag changes, we DON'T push history — commitDrag will do it on dragstop.
      // For other meaningful changes (remove, select toggles, etc.) we don't push either:
      //   - selection toggles aren't worth undoing
      //   - "remove" comes from React Flow's Delete key handling, which we want undoable.
      const hasRemove = changes.some((c) => c.type === 'remove');
      if (hasRemove) pushHistory();
      set({ nodes: applyNodeChanges(changes, get().nodes) as Node<NodeData>[] });
    },

    onEdgesChange: (changes) => {
      const hasRemove = changes.some((c) => c.type === 'remove');
      if (hasRemove) pushHistory();
      set({ edges: applyEdgeChanges(changes, get().edges) });
    },

    onConnect: (connection) => {
      pushHistory();
      set({ edges: addEdge({ ...connection, id: `e-${Date.now()}` }, get().edges) });
    },

    addNode: (kind, position) => {
      pushHistory();
      const id = `n${get().nextId}`;
      const pos = position ?? { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 };
      const newNode: Node<NodeData> = {
        id,
        type: kind,
        position: pos,
        data: defaultData(kind),
      };
      set({ nodes: [...get().nodes, newNode], nextId: get().nextId + 1 });
    },

    updateNodeData: (id, patch) => {
      // Text edits do NOT push history — that would create one entry per keystroke.
      // Edits are still recoverable through localStorage save/export.
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...patch } as NodeData } : n
        ),
      });
    },

    deleteNode: (id) => {
      pushHistory();
      set({
        nodes: get().nodes.filter((n) => n.id !== id),
        edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      });
    },

    commitDrag: () => {
      // Called once when a drag ends — snapshots so undo restores pre-drag positions.
      pushHistory();
    },

    undo: () => {
      const { past, future, nodes, edges, nextId } = get();
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      const current = snapshot({ nodes, edges, nextId });
      set({
        nodes: previous.nodes,
        edges: previous.edges,
        nextId: previous.nextId,
        past: past.slice(0, -1),
        future: [current, ...future],
      });
    },

    redo: () => {
      const { past, future, nodes, edges, nextId } = get();
      if (future.length === 0) return;
      const next = future[0];
      const current = snapshot({ nodes, edges, nextId });
      set({
        nodes: next.nodes,
        edges: next.edges,
        nextId: next.nextId,
        past: [...past, current],
        future: future.slice(1),
      });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    saveLocal: () => {
      const { nodes, edges, nextId } = get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges, nextId }));
    },

    loadLocal: () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      try {
        const data = JSON.parse(raw);
        set({
          nodes: data.nodes ?? [],
          edges: data.edges ?? [],
          nextId: data.nextId ?? 1,
          past: [],
          future: [],
        });
        return true;
      } catch {
        return false;
      }
    },

    exportJSON: () => {
      const { nodes, edges, nextId } = get();
      return JSON.stringify({ nodes, edges, nextId }, null, 2);
    },

    importJSON: (json) => {
      try {
        const data = JSON.parse(json);
        pushHistory();
        set({
          nodes: data.nodes ?? [],
          edges: data.edges ?? [],
          nextId: data.nextId ?? 1,
        });
        return true;
      } catch {
        return false;
      }
    },

    reset: () => {
      pushHistory();
      set({ nodes: [], edges: [], nextId: 1 });
    },
  };
});
