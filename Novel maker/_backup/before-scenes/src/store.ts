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
import type { NodeKind, NodeData, VariableDef, VarType } from './types';
import { type Arc, type Project, cloneWithNewIds, emptyArc, migrateProject, newId } from './project';
import { branchHandle, choiceHandle, coerce, defaultValue, normHandle, outcomeHandle } from './engine';

const STORAGE_KEY = 'novel-flow-v2';
const STORAGE_KEY_V1 = 'novel-flow-v1';
const STORAGE_KEY_CORRUPT = 'novel-flow-v2-corrupt';
const HISTORY_LIMIT = 50;
/** Typing bursts in the same node within this window share one undo step. */
const TYPING_COALESCE_MS = 1000;
const AUTOSAVE_DELAY_MS = 1500;

export type SaveStatus = 'saved' | 'unsaved' | 'error';

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

export interface FlowState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  nextId: number;
  past: Snapshot[];
  future: Snapshot[];

  arcs: ArcMeta[];
  graphs: Record<string, ArcGraph>;
  activeArcId: string;

  /** Story variables (project-wide; not part of per-arc undo history). */
  variables: VariableDef[];
  addVariable: (type?: VarType) => string;
  updateVariable: (id: string, patch: Partial<Omit<VariableDef, 'id'>>) => void;
  deleteVariable: (id: string) => void;

  /** Title of the open project (shown in the toolbar, used by exports). */
  projectTitle: string;
  setProjectTitle: (title: string) => void;

  /** Autosave state shown in the toolbar. */
  saveStatus: SaveStatus;
  saveError: string | null;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (kind: NodeKind, position?: { x: number; y: number }) => void;
  /**
   * Add a card at `position` and wire it to an existing handle in one undo step
   * (dragging a wire into empty space). Returns the new card's id.
   */
  addNodeConnected: (
    kind: NodeKind,
    position: { x: number; y: number },
    from: { nodeId: string; handleId: string | null; handleType: 'source' | 'target' }
  ) => string;
  /** Move many cards at once (auto-layout) as one undo step. */
  setPositions: (positions: Record<string, { x: number; y: number }>) => void;
  /** A Library character was renamed: update every card linked to it (all arcs). */
  renameCharacterRefs: (characterId: string, oldName: string, name: string) => void;
  updateNodeData: (id: string, patch: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  removeLoopItem: (nodeId: string, itemId: string) => void;
  /** Remove a decision choice and the wire leaving its handle (one undo step). */
  removeChoice: (nodeId: string, choiceId: string) => void;
  /** Remove a Condition branch / Chance outcome and its wire (one undo step). */
  removeBranch: (nodeId: string, branchId: string) => void;
  removeOutcome: (nodeId: string, outcomeId: string) => void;
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

  /** Returns false (and sets saveStatus 'error') if browser storage refused the write. */
  saveLocal: () => boolean;
  loadLocal: () => boolean;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  reset: () => void;
}

function defaultData(kind: NodeKind): NodeData {
  if (kind === 'chapter') return { kind, name: '' };
  if (kind === 'decision')
    return {
      kind,
      prompt: '',
      choices: [
        { id: newId(), label: 'Yes' },
        { id: newId(), label: 'No' },
      ],
    };
  if (kind === 'scene') return { kind, background: '', description: '' };
  if (kind === 'loop')
    return { kind, title: '', items: [{ id: crypto.randomUUID(), label: 'Item 1' }] };
  if (kind === 'portal') return { kind, targetArcId: null, label: '' };
  if (kind === 'condition')
    return {
      kind,
      title: '',
      branches: [{ id: newId(), label: 'Branch 1', condition: { mode: 'all', clauses: [] } }],
    };
  if (kind === 'chance')
    return {
      kind,
      title: '',
      show: 'silent',
      outcomes: [
        { id: newId(), label: 'Outcome A', weight: 1 },
        { id: newId(), label: 'Outcome B', weight: 1 },
      ],
    };
  if (kind === 'end') return { kind, title: '', description: '', character: '', text: '' };
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
  { id: 'n3', type: 'decision', position: { x: 700, y: 150 }, data: { kind: 'decision', prompt: 'What does Sarah do?', choices: [{ id: '0', label: 'Enter the mansion' }, { id: '1', label: 'Turn back home' }, { id: '2', label: 'Call for help' }] } },
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

// Last typing target, used to merge a burst of keystrokes into one undo step.
let lastEdit: { id: string; at: number } | null = null;

export const useFlowStore = create<FlowState>((set, get) => {
  const pushHistory = () => {
    lastEdit = null;
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
      variables: project.variables ?? [],
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
    saveStatus: 'saved',
    saveError: null,
    variables: [],
    projectTitle: 'My Story',
    setProjectTitle: (projectTitle) => set({ projectTitle }),

    addVariable: (type = 'number') => {
      const vars = get().variables;
      let n = vars.length + 1;
      while (vars.some((v) => v.name === `var_${n}`)) n++;
      const v: VariableDef = { id: newId(), name: `var_${n}`, type, initial: defaultValue(type) };
      set({ variables: [...vars, v] });
      return v.id;
    },

    updateVariable: (id, patch) => {
      set({
        variables: get().variables.map((v) => {
          if (v.id !== id) return v;
          const next = { ...v, ...patch };
          // Changing the type resets the initial value to something valid.
          if (patch.type && patch.type !== v.type) next.initial = defaultValue(patch.type);
          else next.initial = coerce(next.type, next.initial);
          return next;
        }),
      });
    },

    deleteVariable: (id) => {
      set({ variables: get().variables.filter((v) => v.id !== id) });
    },

    onNodesChange: (changes) => {
      if (changes.every((c) => c.type === 'select' || c.type === 'dimensions')) cosmetic = true;
      const hasRemove = changes.some((c) => c.type === 'remove');
      if (hasRemove) pushHistory();
      set({ nodes: applyNodeChanges(changes, get().nodes) as Node<NodeData>[] });
      cosmetic = false;
    },

    onEdgesChange: (changes) => {
      if (changes.every((c) => c.type === 'select')) cosmetic = true;
      const hasRemove = changes.some((c) => c.type === 'remove');
      if (hasRemove) pushHistory();
      set({ edges: applyEdgeChanges(changes, get().edges) });
      cosmetic = false;
    },

    // One wire per output handle: connecting a handle that is already wired
    // replaces the old wire (the player can only ever follow one of them).
    onConnect: (connection) => {
      pushHistory();
      const h = normHandle(connection.sourceHandle);
      const kept = get().edges.filter(
        (e) => !(e.source === connection.source && normHandle(e.sourceHandle) === h)
      );
      set({ edges: addEdge({ ...connection, id: newId() }, kept) });
    },

    addNode: (kind, position) => {
      pushHistory();
      const id = newId();
      const pos = { ...(position ?? { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 }) };
      // Don't drop a new card exactly on top of another: step diagonally until clear.
      for (let i = 0; i < 40 && get().nodes.some((n) => Math.abs(n.position.x - pos.x) < 40 && Math.abs(n.position.y - pos.y) < 40); i++) {
        pos.x += 44;
        pos.y += 44;
      }
      const newNode: Node<NodeData> = { id, type: kind, position: pos, data: defaultData(kind) };
      set({ nodes: [...get().nodes, newNode], nextId: get().nextId + 1 });
    },

    addNodeConnected: (kind, position, from) => {
      pushHistory();
      const id = newId();
      const node: Node<NodeData> = { id, type: kind, position: { ...position }, data: defaultData(kind) };
      const edge: Edge =
        from.handleType === 'source'
          ? { id: newId(), source: from.nodeId, sourceHandle: from.handleId, target: id, targetHandle: 'in' }
          : { id: newId(), source: id, sourceHandle: 'out', target: from.nodeId, targetHandle: from.handleId };
      // one wire per output: replace an existing wire on the same output
      const h = normHandle(edge.sourceHandle);
      const kept = get().edges.filter((e) => !(e.source === edge.source && normHandle(e.sourceHandle) === h));
      set({ nodes: [...get().nodes, node], edges: [...kept, edge], nextId: get().nextId + 1 });
      return id;
    },

    setPositions: (positions) => {
      pushHistory();
      set({
        nodes: get().nodes.map((n) => (positions[n.id] ? { ...n, position: { ...positions[n.id] } } : n)),
      });
    },

    renameCharacterRefs: (characterId, oldName, name) => {
      const old = oldName.trim().toLowerCase();
      let any = false;
      // Cards linked to the character, plus older unlinked cards that used the old name.
      const fix = (nodes: Node<NodeData>[]) => {
        let changed = false;
        const out = nodes.map((n) => {
          const d = n.data as { characterId?: string; character?: string };
          const linked = d.characterId === characterId;
          const sameName = !d.characterId && !!old && (d.character ?? '').trim().toLowerCase() === old;
          if (!linked && !sameName) return n;
          if (d.character === name && linked) return n;
          changed = true;
          any = true;
          return { ...n, data: { ...n.data, character: name, characterId } as NodeData };
        });
        return changed ? out : nodes;
      };
      const { graphs, activeArcId } = get();
      const nextGraphs = { ...graphs };
      for (const id of Object.keys(graphs)) {
        if (id === activeArcId) continue;
        const nodes = fix(graphs[id].nodes);
        if (nodes !== graphs[id].nodes) nextGraphs[id] = { ...graphs[id], nodes };
      }
      set({ graphs: nextGraphs, nodes: fix(get().nodes) });
      if (any) requestAutosave();
    },

    updateNodeData: (id, patch) => {
      // Text edits are undoable: the first change in a burst pushes history.
      const now = Date.now();
      if (!lastEdit || lastEdit.id !== id || now - lastEdit.at > TYPING_COALESCE_MS) pushHistory();
      lastEdit = { id, at: now };
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
      cosmetic = true;
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

    removeChoice: (nodeId, choiceId) => {
      pushHistory();
      const handle = choiceHandle(choiceId);
      set({
        nodes: get().nodes.map((n) => {
          if (n.id !== nodeId || n.data.kind !== 'decision') return n;
          const choices = n.data.choices.filter((c) => c.id !== choiceId);
          return { ...n, data: { ...n.data, choices } };
        }),
        edges: get().edges.filter((e) => !(e.source === nodeId && e.sourceHandle === handle)),
      });
    },

    removeBranch: (nodeId, branchId) => {
      pushHistory();
      const handle = branchHandle(branchId);
      set({
        nodes: get().nodes.map((n) => {
          if (n.id !== nodeId || n.data.kind !== 'condition') return n;
          return { ...n, data: { ...n.data, branches: n.data.branches.filter((b) => b.id !== branchId) } };
        }),
        edges: get().edges.filter((e) => !(e.source === nodeId && e.sourceHandle === handle)),
      });
    },

    removeOutcome: (nodeId, outcomeId) => {
      pushHistory();
      const handle = outcomeHandle(outcomeId);
      set({
        nodes: get().nodes.map((n) => {
          if (n.id !== nodeId || n.data.kind !== 'chance') return n;
          return { ...n, data: { ...n.data, outcomes: n.data.outcomes.filter((o) => o.id !== outcomeId) } };
        }),
        edges: get().edges.filter((e) => !(e.source === nodeId && e.sourceHandle === handle)),
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
      // Fresh node/edge ids so the copy never shares loop progress with the original.
      const cloned = cloneWithNewIds(src.nodes, src.edges);
      const copy: ArcGraph = {
        nodes: cloned.nodes,
        edges: cloned.edges,
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
        version: 3,
        meta: { title: get().projectTitle || 'My Story' },
        variables: get().variables,
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
      lastEdit = null;
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
      lastEdit = null;
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
      if (persistTarget) {
        void persistNow(project);
        return true;
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
        set({ saveStatus: 'saved', saveError: null });
        return true;
      } catch (err) {
        // Usually QuotaExceededError (~5 MB browser limit).
        const full = err instanceof DOMException && /quota/i.test(err.name + err.message);
        set({
          saveStatus: 'error',
          saveError: full
            ? 'Browser storage is full. Use File → Save to folder, or Export JSON, to keep your work.'
            : `Could not save: ${(err as Error).message}`,
        });
        return false;
      }
    },

    loadLocal: () => {
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY_V1);
      if (!raw) return false;
      try {
        applyProject(migrateProject(JSON.parse(raw)));
        return true;
      } catch {
        // Keep the unreadable blob so autosave can't overwrite the only copy.
        try {
          localStorage.setItem(STORAGE_KEY_CORRUPT, raw);
        } catch {
          /* ignore */
        }
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
        variables: [],
      });
    },
  };
});

/**
 * The whole project as it is right now, without side effects (unlike getProject,
 * which also flushes the active arc into the store). Safe to call while rendering.
 */
export function snapshotProject(s: FlowState): Project {
  return {
    version: 3,
    meta: { title: s.projectTitle || 'My Story' },
    variables: s.variables,
    activeArcId: s.activeArcId,
    arcs: s.arcs.map((a) => {
      const g = a.id === s.activeArcId ? { nodes: s.nodes, edges: s.edges } : s.graphs[a.id];
      return { id: a.id, name: a.name, nodes: g?.nodes ?? [], edges: g?.edges ?? [] };
    }),
  };
}

// ---------------------------------------------------------------------------
// Autosave
// - With a persist target (an open project in the saves folder), changes are
//   written there 1.5 s after the story stops changing.
// - Without one (tests / legacy), the story is written to localStorage.
// Selection and size measurements are "cosmetic" and never trigger a save.
// ---------------------------------------------------------------------------
let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
/** Set by onNodesChange/onEdgesChange when an update only changed selection or measured size. */
let cosmetic = false;
/** Bumped on every real change, so a save that finishes late doesn't mark newer edits as saved. */
let changeVersion = 0;

export type PersistTarget = (project: Project) => Promise<void>;
let persistTarget: PersistTarget | null = null;
let inFlight: Promise<boolean> | null = null;

/** Route saves to an open project (or back to localStorage with null). */
export function setPersistTarget(target: PersistTarget | null) {
  clearTimeout(autosaveTimer);
  persistTarget = target;
  useFlowStore.setState({ saveStatus: 'saved', saveError: null });
}

/** Mark the project changed (e.g. the character library) and schedule an autosave. */
export function requestAutosave() {
  changeVersion++;
  if (useFlowStore.getState().saveStatus === 'saved') useFlowStore.setState({ saveStatus: 'unsaved' });
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => useFlowStore.getState().saveLocal(), AUTOSAVE_DELAY_MS);
}

async function persistNow(project: Project): Promise<boolean> {
  if (!persistTarget) return false;
  const target = persistTarget;
  const version = changeVersion;
  const run = (async () => {
    try {
      await target(project);
      if (persistTarget === target && version === changeVersion) {
        useFlowStore.setState({ saveStatus: 'saved', saveError: null });
      }
      return true;
    } catch (err) {
      useFlowStore.setState({
        saveStatus: 'error',
        saveError: `Could not save to the saves folder: ${(err as Error).message}. Is Novel Flow still running?`,
      });
      // retry later
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => useFlowStore.getState().saveLocal(), 10000);
      return false;
    }
  })();
  inFlight = run;
  const ok = await run;
  if (inFlight === run) inFlight = null;
  return ok;
}

/** Save right now (Save button, leaving the project). Resolves true when written. */
export async function flushSave(): Promise<boolean> {
  clearTimeout(autosaveTimer);
  if (!persistTarget) return useFlowStore.getState().saveLocal();
  if (inFlight) await inFlight;
  if (useFlowStore.getState().saveStatus === 'saved') return true;
  return persistNow(useFlowStore.getState().getProject());
}

useFlowStore.subscribe((s, prev) => {
  if (s.nodes === prev.nodes && s.edges === prev.edges && s.arcs === prev.arcs && s.variables === prev.variables)
    return;
  if (cosmetic) {
    cosmetic = false;
    return;
  }
  requestAutosave();
});

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    const st = useFlowStore.getState();
    if (persistTarget) {
      if (st.saveStatus === 'saved') return;
      // Can't wait for the server here: keep a local backup and ask the browser to confirm.
      try {
        localStorage.setItem('novel-flow-backup', JSON.stringify({ at: new Date().toISOString(), project: st.getProject() }));
      } catch {
        /* storage full — the prompt below still protects the work */
      }
      e.preventDefault();
      e.returnValue = '';
      return;
    }
    if (st.saveStatus === 'unsaved') {
      clearTimeout(autosaveTimer);
      if (st.saveLocal()) return;
    }
    if (useFlowStore.getState().saveStatus === 'error') {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}
