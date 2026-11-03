import { useEffect, useMemo, useState } from 'react';
import StoryCheckPanel from './analysis/StoryCheckPanel';
import { useStoryAnalysis } from './analysis/useAnalysis';
import type { Route } from './analysis/explore';
import { VarValueInput } from './logic/fields';
import { initialVars, type Vars } from './engine';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import { Loader2 } from 'lucide-react';
import { useFlowStore } from './store';
import type { Project } from './project';
import type { NodeKind } from './types';
import ChapterNode from './nodes/ChapterNode';
import DialogNode from './nodes/DialogNode';
import DecisionNode from './nodes/DecisionNode';
import SceneNode from './nodes/SceneNode';
import LoopNode from './nodes/LoopNode';
import PortalNode from './nodes/PortalNode';
import ConditionNode from './nodes/ConditionNode';
import ChanceNode from './nodes/ChanceNode';
import EndNode from './nodes/EndNode';
import Toolbar from './Toolbar';
import ArcTabs from './ArcTabs';
import PlayMode from './PlayMode';
import LibraryPanel from './library/LibraryPanel';
import SavesPanel from './library/SavesPanel';
import SearchPalette from './SearchPalette';
import HomePage, { createProjectFlow } from './home/HomePage';
import { type FlowNode, nodeMatchesTags } from './search';
import { DialogHost, notify } from './ui/dialogs';
import { EmptyCanvas, HelpSheet, LeftRail, ZoomControls } from './ui/CanvasChrome';
import { useView } from './ui/viewPrefs';
import { useUi } from './ui/uiStore';
import { goHome, goProject, useRoute } from './ui/router';
import { closeProject, openProject, useSession } from './storage/session';

const nodeTypes: NodeTypes = {
  chapter: ChapterNode,
  dialog: DialogNode,
  decision: DecisionNode,
  scene: SceneNode,
  loop: LoopNode,
  portal: PortalNode,
  condition: ConditionNode,
  chance: ChanceNode,
  end: EndNode,
};

/** Token used to tint wires by the node they leave from. */
const KIND_TOKEN: Record<string, string> = {
  chapter: 'n-start',
  dialog: 'n-dialog',
  scene: 'n-scene',
  decision: 'n-decision',
  loop: 'n-loop',
  portal: 'n-portal',
  condition: 'n-condition',
  chance: 'n-chance',
  end: 'n-end',
};

function FlowCanvas() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const activeArcId = useFlowStore((s) => s.activeArcId);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const commitDrag = useFlowStore((s) => s.commitDrag);
  const getProject = useFlowStore((s) => s.getProject);
  const addNode = useFlowStore((s) => s.addNode);
  const grid = useView((s) => s.grid);
  const minimap = useView((s) => s.minimap);
  const locked = useView((s) => s.locked);
  const hot = useUi((s) => s.hot);
  const reactFlow = useReactFlow();

  const [play, setPlay] = useState<{ project: Project; start?: { arcId: string; nodeId: string; vars: Vars }; route?: Route } | null>(null);
  const [startFrom, setStartFrom] = useState<{ arcId: string; nodeId: string; vars: Vars } | null>(null);
  const checkOpen = useUi((s) => s.checkOpen);
  const focus = useUi((s) => s.focus);
  const playFrom = useUi((s) => s.playFrom);
  const playRoute = useUi((s) => s.playRoute);
  const selectOnly = useFlowStore((s) => s.selectOnly);
  const variables = useFlowStore((s) => s.variables);
  useStoryAnalysis();

  // Jump to a card (Story check / Routes): switch arc first if needed.
  useEffect(() => {
    if (!focus) return;
    const st = useFlowStore.getState();
    if (st.activeArcId !== focus.arcId) {
      st.setActiveArc(focus.arcId);
      return; // runs again once the arc is shown
    }
    const n = st.nodes.find((x) => x.id === focus.nodeId);
    // Clearing the request re-runs this effect, so the delayed jump must not be cancelled by it.
    useUi.setState({ focus: null });
    if (!n) return;
    window.setTimeout(() => {
      const fresh = useFlowStore.getState().nodes.find((x) => x.id === n.id) ?? n;
      const w = fresh.measured?.width ?? 280;
      const h = fresh.measured?.height ?? 160;
      reactFlow.setCenter(fresh.position.x + w / 2, fresh.position.y + h / 2, { zoom: Math.max(reactFlow.getZoom(), 0.9), duration: 400 });
      selectOnly(fresh.id);
    }, 220);
  }, [focus, activeArcId, reactFlow, selectOnly]);

  // ▶ in a card header: ask for starting variable values (if any), then play.
  useEffect(() => {
    if (!playFrom) return;
    useUi.getState().requestPlayFrom(null);
    const vars = initialVars(useFlowStore.getState().variables);
    if (useFlowStore.getState().variables.length === 0) setPlay({ project: getProject(), start: { ...playFrom, vars } });
    else setStartFrom({ ...playFrom, vars });
  }, [playFrom, getProject]);

  // "Play this route" from the Routes tab.
  useEffect(() => {
    if (!playRoute) return;
    useUi.getState().requestPlayRoute(null);
    setPlay({ project: getProject(), route: playRoute });
  }, [playRoute, getProject]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [savesOpen, setSavesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const startPlay = () => {
    setPlay({ project: getProject() });
  };

  const leave = async () => {
    await closeProject();
    goHome();
  };
  const newProject = async () => {
    const name = await createProjectFlow();
    if (name) {
      await closeProject();
      goProject(name);
    }
  };

  const addAtCenter = (kind: NodeKind) => {
    const { x, y, zoom } = reactFlow.getViewport();
    addNode(kind, { x: (window.innerWidth / 2 - x) / zoom - 130, y: (window.innerHeight / 2 - y) / zoom - 80 });
  };

  // Dim nodes that don't match the active tag filter (view-only; not persisted).
  const displayNodes = useMemo(() => {
    if (activeTags.length === 0) return nodes;
    return (nodes as FlowNode[]).map((n) =>
      nodeMatchesTags(n, activeTags) ? { ...n, className: undefined } : { ...n, className: 'nf-dim' }
    );
  }, [nodes, activeTags]);

  // Wires are tinted by their source node; the hovered choice's wire is highlighted.
  // View-only: edge data in the store is untouched.
  const displayEdges = useMemo<Edge[]>(() => {
    const kindOf = new Map(nodes.map((n) => [n.id, n.type ?? '']));
    return edges.map((e) => {
      const token = KIND_TOKEN[kindOf.get(e.source) ?? ''];
      const isHot = hot && e.source === hot.nodeId && (e.sourceHandle || 'out') === hot.handle;
      return {
        ...e,
        className: isHot ? 'nf-edge-hot' : undefined,
        style: token ? ({ ...e.style, '--edge-color': `var(--${token})` } as React.CSSProperties) : e.style,
        zIndex: isHot ? 10 : e.zIndex,
      };
    });
  }, [edges, nodes, hot]);

  return (
    <div className="h-full w-full flex flex-col">
      <Toolbar
        onPlay={startPlay}
        onToggleLibrary={() => {
          useUi.getState().closeCheck();
          setLibraryOpen((v) => !v);
        }}
        libraryOpen={libraryOpen}
        onOpenSaves={() => setSavesOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        activeTags={activeTags}
        onChangeTags={setActiveTags}
        onHome={() => void leave()}
        onNewProject={() => void newProject()}
        onShowHelp={() => setHelpOpen(true)}
      />
      <ArcTabs />
      <div className={`flex-1 relative nf-paper ${hot ? 'nf-has-hot' : ''}`}>
        <ReactFlow
          key={activeArcId}
          nodes={displayNodes}
          edges={displayEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStart={() => commitDrag()}
          nodeTypes={nodeTypes}
          nodesDraggable={!locked}
          nodesConnectable={!locked}
          elementsSelectable={!locked}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
          minZoom={0.15}
          deleteKeyCode={['Delete', 'Backspace']}
          defaultEdgeOptions={{ animated: false }}
          proOptions={{ hideAttribution: false }}
        >
          {grid && <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="rgb(var(--grid))" />}
          <ZoomControls />
          {minimap && (
            <MiniMap
              position="bottom-left"
              pannable
              zoomable
              nodeBorderRadius={6}
              nodeColor={(n) => `rgb(var(--${KIND_TOKEN[n.type ?? ''] ?? 'n-end'}))`}
              className="!hidden sm:!block"
              style={{ width: 170, height: 110 }}
            />
          )}
        </ReactFlow>
        <LeftRail onHome={() => void leave()} onHelp={() => setHelpOpen(true)} />
        {nodes.length === 0 && <EmptyCanvas onAdd={addAtCenter} />}
        {libraryOpen && !checkOpen && <LibraryPanel onClose={() => setLibraryOpen(false)} />}
        {checkOpen && <StoryCheckPanel />}
        {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
      </div>
      {savesOpen && <SavesPanel onClose={() => setSavesOpen(false)} />}
      {helpOpen && <HelpSheet onClose={() => setHelpOpen(false)} />}
      {startFrom && (
        <StartFromDialog
          variables={variables}
          initial={startFrom.vars}
          onCancel={() => setStartFrom(null)}
          onStart={(vars) => {
            setPlay({ project: getProject(), start: { ...startFrom, vars } });
            setStartFrom(null);
          }}
        />
      )}
      {play && <PlayMode project={play.project} start={play.start} route={play.route} onClose={() => setPlay(null)} />}
    </div>
  );
}

/** "Play from here": choose the variable values to start with. */
function StartFromDialog({
  variables,
  initial,
  onStart,
  onCancel,
}: {
  variables: import('./types').VariableDef[];
  initial: Vars;
  onStart: (vars: Vars) => void;
  onCancel: () => void;
}) {
  const [vars, setVars] = useState<Vars>(initial);
  return (
    <div className="fixed inset-0 z-[2500] bg-black/25 flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div role="dialog" aria-modal="true" aria-label="Play from here" className="nf-panel animate-pop w-full max-w-sm p-5">
        <h2 className="font-story text-lg text-fg mb-1">Play from here</h2>
        <p className="text-[13px] text-muted mb-4">Start with these variable values — as if the reader had already made earlier choices.</p>
        <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
          {variables.map((v) => (
            <label key={v.id} className="flex items-center gap-2">
              <span className="text-[13px] text-fg-soft font-mono flex-1 truncate" title={v.note || v.name}>
                {v.name || '(unnamed)'}
              </span>
              <VarValueInput type={v.type} value={vars[v.id]} onChange={(val) => setVars({ ...vars, [v.id]: val })} />
            </label>
          ))}
        </div>
        <div className="flex justify-between gap-2 mt-5">
          <button className="nf-btn" onClick={() => setVars(initial)}>
            Reset
          </button>
          <div className="flex gap-2">
            <button className="nf-btn nf-btn-outline" onClick={onCancel}>
              Cancel
            </button>
            <button className="nf-btn nf-btn-primary" onClick={() => onStart(vars)} autoFocus>
              Play
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Opens the project named in the URL, then shows the editor. */
function ProjectScreen({ name }: { name: string }) {
  const current = useSession((s) => s.current);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    openProject(name).catch((e: Error) => {
      if (cancelled) return;
      setError(e.message);
      notify(`Couldn’t open “${name}”: ${e.message}`, 'error');
      goHome();
    });
    return () => {
      cancelled = true;
    };
  }, [name]);

  // Leaving the editor (browser back, etc.) saves and closes the project.
  useEffect(() => {
    return () => {
      void closeProject();
    };
  }, []);

  if (current !== name) {
    return (
      <div className="h-full flex items-center justify-center nf-paper text-muted gap-2">
        {!error && <Loader2 size={18} className="animate-spin" />}
        <span className="font-story text-lg">{error ? 'Could not open the project.' : `Opening “${name}”…`}</span>
      </div>
    );
  }
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}

export default function App() {
  const route = useRoute();
  return (
    <div className="h-screen w-screen overflow-hidden bg-bg text-fg">
      {route.page === 'project' ? <ProjectScreen key={route.name} name={route.name} /> : <HomePage />}
      <DialogHost />
    </div>
  );
}
