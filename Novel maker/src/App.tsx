import { useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
} from '@xyflow/react';
import { useFlowStore } from './store';
import ChapterNode from './nodes/ChapterNode';
import DialogNode from './nodes/DialogNode';
import DecisionNode from './nodes/DecisionNode';
import SceneNode from './nodes/SceneNode';
import LoopNode from './nodes/LoopNode';
import Toolbar from './Toolbar';
import PlayMode from './PlayMode';
import LibraryPanel from './library/LibraryPanel';
import SavesPanel from './library/SavesPanel';
import SearchPalette from './SearchPalette';
import { type FlowNode, nodeMatchesTags } from './search';

const nodeTypes: NodeTypes = {
  chapter: ChapterNode,
  dialog: DialogNode,
  decision: DecisionNode,
  scene: SceneNode,
  loop: LoopNode,
};

function FlowCanvas() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const commitDrag = useFlowStore((s) => s.commitDrag);
  const loadLocal = useFlowStore((s) => s.loadLocal);

  const [playing, setPlaying] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [savesOpen, setSavesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>([]);

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  // Dim nodes that don't match the active tag filter (view-only; not persisted).
  const displayNodes = useMemo(() => {
    if (activeTags.length === 0) return nodes;
    return (nodes as FlowNode[]).map((n) =>
      nodeMatchesTags(n, activeTags) ? { ...n, className: undefined } : { ...n, className: 'nf-dim' }
    );
  }, [nodes, activeTags]);

  return (
    <div className="h-screen w-screen flex flex-col">
      <Toolbar
        onPlay={() => setPlaying(true)}
        onToggleLibrary={() => setLibraryOpen((v) => !v)}
        libraryOpen={libraryOpen}
        onOpenSaves={() => setSavesOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        activeTags={activeTags}
        onChangeTags={setActiveTags}
      />
      <div className="flex-1 relative">
        <ReactFlow
          nodes={displayNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStart={() => commitDrag()}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          deleteKeyCode={['Delete', 'Backspace']}
          defaultEdgeOptions={{ animated: false, style: { strokeWidth: 2 } }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2a3a5e" />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === 'dialog') return '#4a7aff';
              if (n.type === 'decision') return '#ffaa44';
              if (n.type === 'scene') return '#a86aff';
              if (n.type === 'loop') return '#2dd4bf';
              if (n.type === 'chapter') return '#44dd88';
              return '#44dd88';
            }}
            maskColor="rgba(15,25,41,0.7)"
          />
        </ReactFlow>
        {libraryOpen && <LibraryPanel onClose={() => setLibraryOpen(false)} />}
        {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
      </div>
      {savesOpen && <SavesPanel onClose={() => setSavesOpen(false)} />}
      {playing && (
        <PlayMode nodes={nodes} edges={edges} onClose={() => setPlaying(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
