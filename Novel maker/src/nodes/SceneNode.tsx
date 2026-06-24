import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useFlowStore } from '../store';
import type { SceneData } from '../types';

type SceneNodeType = Node<SceneData, 'scene'>;

export default function SceneNode({ id, data, selected }: NodeProps<SceneNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const deleteNode = useFlowStore((s) => s.deleteNode);

  return (
    <div
      className={`min-w-[260px] max-w-[300px] bg-ink-800 border-2 rounded-lg shadow-lg ${
        selected ? 'border-accent' : 'border-accent-scene'
      }`}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <div className="px-3 py-2 border-b border-ink-600 flex items-center gap-2 bg-black/20 rounded-t-lg">
        <span className="text-base">🎬</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-scene flex-1">Scene</span>
        <button
          onClick={() => deleteNode(id)}
          className="text-gray-500 hover:text-white hover:bg-accent rounded px-1.5 text-sm"
        >
          ✕
        </button>
      </div>
      <div className="p-3">
        {/* Background — a framed setting box with the description nested inside */}
        <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Background</label>
        <div className="rounded-md border border-accent-scene/40 bg-gradient-to-b from-accent-scene/10 to-ink-900/40 p-2 space-y-2">
          <input
            value={data.background}
            onChange={(e) => updateNodeData(id, { background: e.target.value })}
            placeholder="e.g. Old mansion, night"
            className="w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-accent-scene nodrag"
            onMouseDown={(e) => e.stopPropagation()}
          />
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Description</label>
            <textarea
              value={data.description}
              onChange={(e) => updateNodeData(id, { description: e.target.value })}
              placeholder="Describe the setting..."
              className="w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1.5 rounded focus:outline-none focus:border-accent-scene resize-y min-h-[60px] nodrag"
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
