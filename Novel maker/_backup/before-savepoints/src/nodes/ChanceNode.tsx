import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useFlowStore } from '../store';
import type { ChanceData, ChanceOutcome } from '../types';
import { newId } from '../project';
import { outcomeHandle, outcomeOdds } from '../engine';
import NodeHeader from './NodeHeader';
import TagBar from './TagBar';
import { fieldCls, stop } from '../logic/fields';
import { hotRow, useUi } from '../ui/uiStore';

type ChanceNodeType = Node<ChanceData, 'chance'>;

/** Weighted random router (e.g. a dice roll or a coin flip). */
export default function ChanceNode({ id, data, selected }: NodeProps<ChanceNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const removeOutcome = useFlowStore((s) => s.removeOutcome);
  const odds = outcomeOdds(data.outcomes);
  const hot = useUi((s) => (s.hot?.nodeId === id ? s.hot.handle : null));

  const updateOutcome = (oid: string, patch: Partial<ChanceOutcome>) =>
    updateNodeData(id, { outcomes: data.outcomes.map((o) => (o.id === oid ? { ...o, ...patch } : o)) });

  const addOutcome = () =>
    updateNodeData(id, {
      outcomes: [
        ...data.outcomes,
        { id: newId(), label: `Outcome ${String.fromCharCode(65 + data.outcomes.length)}`, weight: 1 },
      ],
    });

  return (
    <div
      className={`nf-node nf-kind-chance min-w-[280px] max-w-[330px] ${selected ? 'is-selected' : ''}`}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <NodeHeader id={id} kind="chance" label="Chance" pinned={data.pinned} />
      <div className="p-3 space-y-2">
        <input
          value={data.title}
          onChange={(e) => updateNodeData(id, { title: e.target.value })}
          placeholder="e.g. Does the guard notice you?"
          className="w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-accent-chance nodrag"
          onMouseDown={stop}
        />
        <div className="flex items-center gap-1 text-[11px] text-gray-400">
          Reader sees
          <select
            value={data.show}
            onChange={(e) => updateNodeData(id, { show: e.target.value as ChanceData['show'] })}
            onMouseDown={stop}
            className={fieldCls}
          >
            <option value="silent">nothing (silent)</option>
            <option value="reveal">the result card</option>
          </select>
        </div>
        <div>
          <div className="flex text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            <span className="flex-1">Outcomes</span>
            <span className="w-24 text-right pr-7">weight · odds</span>
          </div>
          <div className="space-y-1.5">
            {data.outcomes.map((o, i) => (
              <div key={o.id} className="relative flex items-center gap-1" {...hotRow(id, outcomeHandle(o.id))}>
                <input
                  value={o.label}
                  onChange={(e) => updateOutcome(o.id, { label: e.target.value })}
                  placeholder="Outcome"
                  className="flex-1 min-w-0 bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-accent-chance nodrag"
                  onMouseDown={stop}
                />
                <input
                  type="number"
                  min={0}
                  value={o.weight}
                  onChange={(e) => updateOutcome(o.id, { weight: Math.max(0, Number(e.target.value) || 0) })}
                  onMouseDown={stop}
                  className={`${fieldCls} w-12`}
                  title="Weight (higher = more likely)"
                />
                <span className="text-[11px] text-gray-400 w-9 text-right">{Math.round((odds[i] ?? 0) * 100)}%</span>
                <button
                  onClick={() => removeOutcome(id, o.id)}
                  title="Remove this outcome (and its wire)"
                  className="text-faint hover:bg-danger/15 hover:text-danger w-7 h-7 rounded-md text-xs flex items-center justify-center flex-shrink-0"
                >
                  ✕
                </button>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={outcomeHandle(o.id)}
                  className={`nf-num-handle ${hot === outcomeHandle(o.id) ? 'nf-hot' : ''}`}
                  style={{ right: -21, top: '50%' }}
                >
                  {i + 1}
                </Handle>
              </div>
            ))}
          </div>
          <button
            onClick={addOutcome}
            className="w-full mt-2 bg-ink-900 border border-dashed border-ink-600 text-accent-chance hover:bg-ink-700 hover:text-white py-1 rounded text-xs"
          >
            + Add outcome
          </button>
        </div>
        <TagBar id={id} tags={data.tags} accentBorder="focus:border-accent-chance" />
      </div>
    </div>
  );
}
