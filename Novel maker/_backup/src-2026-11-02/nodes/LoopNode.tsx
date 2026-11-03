import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useFlowStore } from '../store';
import type { LoopData } from '../types';
import { itemHandle } from '../engine';
import NodeHeader from './NodeHeader';
import TagBar from './TagBar';

type LoopNodeType = Node<LoopData, 'loop'>;

export default function LoopNode({ id, data, selected }: NodeProps<LoopNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const removeLoopItem = useFlowStore((s) => s.removeLoopItem);

  const setItemLabel = (itemId: string, label: string) => {
    updateNodeData(id, {
      items: data.items.map((it) => (it.id === itemId ? { ...it, label } : it)),
    });
  };

  const addItem = () => {
    updateNodeData(id, {
      items: [...data.items, { id: crypto.randomUUID(), label: `Item ${data.items.length + 1}` }],
    });
  };

  return (
    <div
      className={`min-w-[280px] max-w-[320px] bg-ink-800 border-2 rounded-lg shadow-lg ${
        selected ? 'border-accent' : 'border-accent-loop'
      }`}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <NodeHeader id={id} icon="🔁" label="Loop" accentText="text-accent-loop" pinned={data.pinned} />
      <div className="p-3 space-y-2">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            Title (complete all to continue)
          </label>
          <textarea
            value={data.title}
            onChange={(e) => updateNodeData(id, { title: e.target.value })}
            placeholder="e.g. Question every witness"
            className="w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1.5 rounded focus:outline-none focus:border-accent-loop resize-y min-h-[44px] nodrag"
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            Items (any order)
          </label>
          <div className="space-y-1.5">
            {data.items.map((item) => (
              <div key={item.id} className="relative flex items-center gap-1">
                <input
                  value={item.label}
                  onChange={(e) => setItemLabel(item.id, e.target.value)}
                  placeholder="Item label"
                  className="flex-1 bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-accent-loop nodrag"
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <button
                  onClick={() => removeLoopItem(id, item.id)}
                  className="bg-ink-600 hover:bg-accent text-gray-300 hover:text-white w-6 h-6 rounded text-xs flex-shrink-0"
                >
                  ✕
                </button>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={itemHandle(item.id)}
                  style={{ right: -16, top: '50%' }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={addItem}
            className="w-full mt-2 bg-ink-900 border border-dashed border-ink-600 text-accent-loop hover:bg-ink-700 hover:text-white py-1 rounded text-xs"
          >
            + Add item
          </button>
        </div>
        <div className="pt-1 border-t border-ink-600">
          <span className="text-[10px] uppercase tracking-wider text-gray-500">
            All done → (bottom handle)
          </span>
        </div>
        <TagBar id={id} tags={data.tags} accentBorder="focus:border-accent-loop" />
      </div>
      {/* Exit once every item is completed */}
      <Handle type="source" position={Position.Bottom} id="done" style={{ background: '#2dd4bf' }} />
    </div>
  );
}
