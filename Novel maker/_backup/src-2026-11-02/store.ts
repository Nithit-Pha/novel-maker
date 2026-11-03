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
import { type Arc, type Project, emptyArc, migrateProject, newId } from './project';

const STORAGE_KEY = 'novel-flow-v2';
const STORAGE_KEY_V1 = 'novel-flow-v1';
const HISTORY_LIMIT = 50;

interface Snapshot {
  nodes: Node<NodeData>[];
  edges: Edge[];
  nextId: number;
}

interface ArcGraph {
  nodes: Node<NodeData>[];
  edges: Edge[];
  nextId: number;
  past: Snapshot[];
  future: Snapshot[];
}

export interface ArcMeta {
  id: string;
  name: string;
}

interface FlowState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  nextId: number;
  past: Snapshot[];
  future: Snapshot[];

  arcs: ArcMeta[];
  graphs: Record<string, ArcGraph>;
  activeArcId: string;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (kind: NodeKind, position?: { x: number; y: number }) => void;
  updateNodeData: (id: string, patch: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  removeLoopItem: (nodeId: string, itemId: string) => void;
  commitDrag: () => void;
  togglePin: (id: string) => void;
  setNodeTags: (id: string, tags: string[]) => void;
  selectOnly: (id: string) => void;

  addArc: () => void;
  renameArc: (id: string, name: string) => void;
  deleteArc: (id: string) => void;
  duplicateArc: (id: string) => void;
  reorderArcs: (fromIdx: number, toIdx: number) => void;
  setActiveArc: (id: string) => void;
  getProject: () => Project;

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
  if (kind === 'chapter') return { kind, name: '' };
  if (kind === 'decision') return { kind, prompt: '', choices: ['Yes', 'No'] };
  if (kind === 'scene') return { kind, background: '', description: '' };
  if (kind === 'loop')
    return { kind, title: '', items: [{ id: crypto.randomUUID(), label: 'Item 1' }] };
  if (kind === 'portal') return { kind, targetArcId: null, label: '' };
  return { kind: 'dialog', character: '', text: '' };
}

function snapshot(s: Pick<FlowState, 'nodes' | 'edges' | 'nextId'>): Snapshot {
  return {
    nodes: structuredClone(s.nodes),
    edges: structuredClone(s.edges),
    nextId: s.nextId,
  };
}

const demoNodes: Node<NodeData>[] = [
  { id: 'c1', type: 'chapter', position: { x: -350, y: 200 }, data: { kind: 'chapter', name: 'Chapter 1 — The Mansion' } },
  { id: 'n1', type: 'scene', position: { x: 0, y: 200 }, data: { kind: 'scene', background: 'Old mansion, stormy night', description: 'It was a dark and stormy night. Sarah stood at the door of the old mansion...' } },
  { id: 'n2', type: 'dialog', position: { x: 350, y: 200 }, data: { kind: 'dialog', character: 'Sarah', text: 'Should I really go in? The door is open...' } },
  { id: 'n3', type: 'decision', position: { x: 700, y: 150 }, data: { kind: 'decision', prompt: 'What does Sarah do?', choices: ['Enter the mansion', 'Turn back home', 'Call for help'] } },
  { id: 'n4', type: 'dialog', position: { x: 1100, y: 0 }, data: { kind: 'dialog', character: 'Narrator', text: 'Sarah pushed the door open. The hinges creaked ominously.' } },
  { id: 'n5', type: 'dialog', position: { x: 1100, y: 200 }, data: { kind: 'dialog', character: 'Sarah', text: "This is a bad idea. I'm going home." } },
  { id: 'n6', type: 'dialog', position: { x: 1100, y: 400 }, data: { kind: 'dialog', character: 'Sarah', text: 'Hello?! Is anyone out there?' } },
];
const demoEdges: Edge[] = [
  { id: 'e0', source: 'c1', target: 'n1' },
  { id: 'e1', source: 'n1', target: 'n2' },
  { id: 'e2', source: 'n2', target: 'n3' },
  { id: 'e3', source: 'n3', sourceHandle: 'choice-0', target: 'n4' },
  { id: 'e4', source: 'n3', sourceHandle: 'choice-1', target: 'n5' },
  { id: 'e5', source: 'n3', sourceHandle: 'choice-2', target: 'n6' },
];

function graphFromArc(a: Arc): ArcGraph {
  return { nodes: a.nodes, edges: a.edges, nextId: a.nextId ?? 1, past: [], future: [] };
}

const demoArcId = 'arc-1';
const initialGraphs: Record<string, ArcGraph> = {
  [demoArcId]: { nodes: demoNodes, edges: demoEdges, nextId: 7, past: [], future: [] },
};

export const useFlowStore = create<FlowState>((set, get) => {
  const pushHistory = () => {
    const { nodes, edges, nextId, past } = get();
    const newPast = [...past, snapshot({ nodes, edges, nextId })];
    if (newPast.length > HISTORY_LIMIT) newPast.shift();
    set({ past: newPast, future: [] });
  };

  const flush = () => {
    const { activeArcId, nodes, edges, nextId, past, future, graphs } = get();
    set({ graphs: { ...graphs, [activeArcId]: { nodes, edges, nextId, past, future } } });
  };

  const loadGraph = (id: string) => {
    const g = get().graphs[id];
    if (!g) return;
    set({ activeArcId: id, nodes: g.nodes, edges: g.edges, nextId: g.nextId, past: g.past, future: g.future });
  };

  const applyProject = (project: Project) => {
    const graphs: Record<string, ArcGraph> = {};
    for (const a of project.arcs) graphs[a.id] = graphFromArc(a);
    const activeId = graphs[project.activeArcId] ? project.activeArcId : project.arcs[0].id;
    const active = graphs[activeId];
    set({
      arcs: project.arcs.map((a) => ({ id: a.id, name: a.name })),
      graphs,
      activeArcId: activeId,
      nodes: active.nodes,
      edges: active.edges,
      nextId: active.nextId,
      past: [],
      future: [],
    });
  };

  return {
    nodes: demoNodes,
    edges: demoEdges,
    nextId: 7,
    past: [],
    future: [],
    arcs: [{ id: demoArcId, name: 'Arc 1' }],
    graphs: initialGraphs,
    activeArcId: demoArcId,

    onNodesChange: (changes) => {
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
      const newNode: Node<NodeData> = { id, type: kind, position: pos, data: defaultData(kind) };
      set({ nodes: [...get().nodes, newNode], nextId: get().nextId + 1 });
    },

    updateNodeData: (id, patch) => {
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

    togglePin: (id) => {
      pushHistory();
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, pinned: !n.data.pinned } as NodeData } : n
        ),
      });
    },

    setNodeTags: (id, tags) => {
      pushHistory();
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, tags } as NodeData } : n
        ),
      });
    },

    selectOnly: (id) => {
      set({ nodes: get().nodes.map((n) => ({ ...n, selected: n.id === id })) });
    },

    removeLoopItem: (nodeId, itemId) => {
      pushHistory();
      set({
        nodes: get().nodes.map((n) => {
          if (n.id !== nodeId || n.data.kind !== 'loop') return n;
          const items = n.data.items.filter((it) => it.id !== itemId);
          return { ...n, data: { ...n.data, items } };
        }),
        edges: get().edges.filter(
          (e) => !(e.source === nodeId && e.sourceHandle === `item-${itemId}`)
        ),
      });
    },

    commitDrag: () => {
      pushHistory();
    },

    addArc: () => {
      flush();
      const { arcs, graphs } = get();
      const arc = emptyArc(`Arc ${arcs.length + 1}`);
      set({
        arcs: [...arcs, { id: arc.id, name: arc.name }],
        graphs: { ...graphs, [arc.id]: graphFromArc(arc) },
      });
      loadGraph(arc.id);
    },

    renameArc: (id, name) => {
      set({ arcs: get().arcs.map((a) => (a.id === id ? { ...a, name } : a)) });
    },

    deleteArc: (id) => {
      const { arcs, activeArcId } = get();
      if (arcs.length <= 1) return;
      flush();
      const idx = arcs.findIndex((a) => a.id === id);
      const nextArcs = arcs.filter((a) => a.id !== id);
      const graphs = { ...get().graphs };
      delete graphs[id];
      set({ arcs: nextArcs, graphs });
      if (activeArcId === id) {
        const fallback = nextArcs[Math.max(0, idx - 1)].id;
        loadGraph(fallback);
      }
    },

    duplicateArc: (id) => {
      flush();
      const { arcs, graphs } = get();
      const src = graphs[id];
      if (!src) return;
      const srcMeta = arcs.find((a) => a.id === id);
      const copyId = newId();
      const copy: ArcGraph = {
        nodes: structuredClone(src.nodes),
        edges: structuredClone(src.edges),
        nextId: src.nextId,
        past: [],
        future: [],
      };
      const idx = arcs.findIndex((a) => a.id === id);
      const nextArcs = [...arcs];
      nextArcs.splice(idx + 1, 0, { id: copyId, name: `${srcMeta?.name ?? 'Arc'} copy` });
      set({ arcs: nextArcs, graphs: { ...graphs, [copyId]: copy } });
      loadGraph(copyId);
    },

    reorderArcs: (fromIdx, toIdx) => {
      const arcs = [...get().arcs];
      if (fromIdx < 0 || fromIdx >= arcs.length || toIdx < 0 || toIdx >= arcs.length) return;
      const [moved] = arcs.splice(fromIdx, 1);
      arcs.splice(toIdx, 0, moved);
      set({ arcs });
    },

    setActiveArc: (id) => {
      if (id === get().activeArcId) return;
      flush();
      loadGraph(id);
    },

    getProject: () => {
      flush();
      const { arcs, graphs, activeArcId } = get();
      return {
        version: 2,
        meta: { title: 'My Story' },
        activeArcId,
        arcs: arcs.map((a) => ({
          id: a.id,
          name: a.name,
          nodes: graphs[a.id].nodes,
          edges: graphs[a.id].edges,
          nextId: graphs[a.id].nextId,
        })),
      };
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
      const project = get().getProject();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    },

    loadLocal: () => {
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY_V1);
      if (!raw) return false;
      try {
        applyProject(migrateProject(JSON.parse(raw)));
        return true;
      } catch {
        return false;
      }
    },

    exportJSON: () => JSON.stringify(get().getProject(), null, 2),

    importJSON: (json) => {
      try {
        applyProject(migrateProject(JSON.parse(json)));
        return true;
      } catch {
        return false;
      }
    },

    reset: () => {
      const arc = emptyArc('Arc 1');
      set({
        arcs: [{ id: arc.id, name: arc.name }],
        graphs: { [arc.id]: graphFromArc(arc) },
        activeArcId: arc.id,
        nodes: [],
        edges: [],
        nextId: 1,
        past: [],
        future: [],
      });
    },
  };
});
