import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useFlowStore } from '../store';
import type { ChapterData } from '../types';
import NodeHeader from './NodeHeader';
import TagBar from './TagBar';

type ChapterNodeType = Node<ChapterData, 'chapter'>;

export default function ChapterNode({ id, data, selected }: NodeProps<ChapterNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  return (
    <div
      className={`min-w-[240px] max-w-[300px] bg-ink-800 border-2 rounded-lg shadow-lg ${
        selected ? 'border-accent' : 'border-accent-start'
      }`}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <NodeHeader id={id} icon="📖" label="Chapter" accentText="text-accent-start" pinned={data.pinned} />
      <div className="p-3 space-y-2">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            Chapter name
          </label>
          <input
            value={data.name}
            onChange={(e) => updateNodeData(id, { name: e.target.value })}
            placeholder="e.g. Chapter 1 — The Arrival"
            className="w-full bg-ink-900 border border-ink-600 text-white text-base font-semibold px-2 py-1.5 rounded focus:outline-none focus:border-accent-start nodrag"
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
        <TagBar id={id} tags={data.tags} accentBorder="focus:border-accent-start" />
      </div>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
