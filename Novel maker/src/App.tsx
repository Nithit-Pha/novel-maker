import { useEffect, useState } from 'react';
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
import StartNode from './nodes/StartNode';
import DialogNode from './nodes/DialogNode';
import DecisionNode from './nodes/DecisionNode';
import Toolbar from './Toolbar';
import PlayMode from './PlayMode';

const nodeTypes: NodeTypes = {
  start: StartNode,
  dialog: DialogNode,
  decision: DecisionNode,
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

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  return (
    <div className="h-screen w-screen flex flex-col">
      <Toolbar onPlay={() => setPlaying(true)} />
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
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
              return '#44dd88';
            }}
            maskColor="rgba(15,25,41,0.7)"
          />
        </ReactFlow>
      </div>
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
