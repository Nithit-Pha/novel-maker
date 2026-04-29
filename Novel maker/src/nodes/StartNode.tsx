import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useFlowStore } from '../store';
import type { StartData } from '../types';

type StartNodeType = Node<StartData, 'start'>;

export default function StartNode({ id, data, selected }: NodeProps<StartNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const deleteNode = useFlowStore((s) => s.deleteNode);

  return (
    <div
      className={`min-w-[260px] max-w-[300px] bg-ink-800 border-2 rounded-lg shadow-lg ${
        selected ? 'border-accent' : 'border-accent-start'
      }`}
    >
      <div className="px-3 py-2 border-b border-ink-600 flex items-center gap-2 bg-black/20 rounded-t-lg">
        <span className="text-base">▶</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-start flex-1">Start</span>
        <button
          onClick={() => deleteNode(id)}
          className="text-gray-500 hover:text-white hover:bg-accent rounded px-1.5 text-sm"
        >
          ✕
        </button>
      </div>
      <div className="p-3">
        <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
          Story opening
        </label>
        <textarea
          value={data.text}
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
          placeholder="The beginning of your story..."
          className="w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1.5 rounded focus:outline-none focus:border-accent-dialog resize-y min-h-[60px] nodrag"
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
