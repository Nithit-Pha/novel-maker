import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useFlowStore } from '../store';
import type { PortalData } from '../types';
import NodeHeader from './NodeHeader';

type PortalNodeType = Node<PortalData, 'portal'>;

export default function PortalNode({ id, data, selected }: NodeProps<PortalNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const arcs = useFlowStore((s) => s.arcs);
  const activeArcId = useFlowStore((s) => s.activeArcId);

  // Offer other arcs (and keep the current target even if it points here).
  const options = arcs.filter((a) => a.id !== activeArcId || a.id === data.targetArcId);
  const missing = data.targetArcId != null && !arcs.some((a) => a.id === data.targetArcId);

  return (
    <div
      className={`min-w-[240px] max-w-[300px] bg-ink-800 border-2 rounded-lg shadow-lg ${
        selected ? 'border-accent' : 'border-accent-portal'
      }`}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <NodeHeader id={id} icon="🌀" label="Go to Arc" accentText="text-accent-portal" pinned={data.pinned} />
      <div className="p-3 space-y-2">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            Target Arc
          </label>
          <select
            value={data.targetArcId ?? ''}
            onChange={(e) => updateNodeData(id, { targetArcId: e.target.value || null })}
            className="w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1.5 rounded focus:outline-none focus:border-accent-portal nodrag"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <option value="">— pick an arc —</option>
            {options.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {missing && (
            <p className="text-[11px] text-accent mt-1">Target arc was deleted.</p>
          )}
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            Label (optional)
          </label>
          <input
            value={data.label ?? ''}
            onChange={(e) => updateNodeData(id, { label: e.target.value })}
            placeholder="e.g. To Act II"
            className="w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-accent-portal nodrag"
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>
      {/* No source handle: a portal is terminal — it jumps to the target arc. */}
    </div>
  );
}
