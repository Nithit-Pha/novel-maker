import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useFlowStore } from '../store';
import type { DialogData } from '../types';

type DialogNodeType = Node<DialogData, 'dialog'>;

export default function DialogNode({ id, data, selected }: NodeProps<DialogNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const deleteNode = useFlowStore((s) => s.deleteNode);

  return (
    <div
      className={`min-w-[260px] max-w-[300px] bg-ink-800 border-2 rounded-lg shadow-lg ${
        selected ? 'border-accent' : 'border-accent-dialog'
      }`}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <div className="px-3 py-2 border-b border-ink-600 flex items-center gap-2 bg-black/20 rounded-t-lg">
        <span className="text-base">💬</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-dialog flex-1">Dialog</span>
        <button
          onClick={() => deleteNode(id)}
          className="text-gray-500 hover:text-white hover:bg-accent rounded px-1.5 text-sm"
        >
          ✕
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Character</label>
          <input
            value={data.character}
            onChange={(e) => updateNodeData(id, { character: e.target.value })}
            placeholder="e.g. Alice"
            className="w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-accent-dialog nodrag"
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Dialog</label>
          <textarea
            value={data.text}
            onChange={(e) => updateNodeData(id, { text: e.target.value })}
            placeholder="What do they say?"
            className="w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1.5 rounded focus:outline-none focus:border-accent-dialog resize-y min-h-[60px] nodrag"
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
