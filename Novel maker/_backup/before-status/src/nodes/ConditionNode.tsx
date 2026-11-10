import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useFlowStore } from '../store';
import type { ConditionBranch, ConditionData } from '../types';
import { newId } from '../project';
import { branchHandle } from '../engine';
import NodeHeader from './NodeHeader';
import TagBar from './TagBar';
import ConditionEditor, { EMPTY_CONDITION } from '../logic/ConditionEditor';
import { stop } from '../logic/fields';
import { hotRow, useUi } from '../ui/uiStore';

type ConditionNodeType = Node<ConditionData, 'condition'>;

/** Silent router: the first branch whose rules hold wins, otherwise "Else". */
export default function ConditionNode({ id, data, selected }: NodeProps<ConditionNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const removeBranch = useFlowStore((s) => s.removeBranch);
  const hot = useUi((s) => (s.hot?.nodeId === id ? s.hot.handle : null));

  const updateBranch = (branchId: string, patch: Partial<ConditionBranch>) =>
    updateNodeData(id, { branches: data.branches.map((b) => (b.id === branchId ? { ...b, ...patch } : b)) });

  const addBranch = () =>
    updateNodeData(id, {
      branches: [...data.branches, { id: newId(), label: `Branch ${data.branches.length + 1}`, condition: EMPTY_CONDITION }],
    });

  return (
    <div
      className={`nf-node nf-kind-condition min-w-[300px] max-w-[360px] ${selected ? 'is-selected' : ''}`}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <NodeHeader id={id} kind="condition" label="Condition" pinned={data.pinned} />
      <div className="p-3 space-y-2">
        <input
          value={data.title}
          onChange={(e) => updateNodeData(id, { title: e.target.value })}
          placeholder="e.g. Does Mira trust you?"
          className="w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-accent-condition nodrag"
          onMouseDown={stop}
        />
        <p className="text-[10px] text-gray-500">Checked top to bottom — the first branch that matches is taken. Readers don't see this node.</p>
        <div className="space-y-2">
          {data.branches.map((b, idx) => (
            <div key={b.id} className="rounded border border-ink-600 bg-black/5 p-1.5 space-y-1.5">
              <div className="relative flex items-center gap-1" {...hotRow(id, branchHandle(b.id))}>
                <span className="text-[10px] text-accent-condition font-semibold w-5">{idx === 0 ? 'IF' : 'ELIF'}</span>
                <input
                  value={b.label}
                  onChange={(e) => updateBranch(b.id, { label: e.target.value })}
                  placeholder="Branch name"
                  className="flex-1 min-w-0 bg-ink-900 border border-ink-600 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-accent-condition nodrag ml-2"
                  onMouseDown={stop}
                />
                <button
                  onClick={() => removeBranch(id, b.id)}
                  title="Remove this branch (and its wire)"
                  className="text-faint hover:bg-danger/15 hover:text-danger w-7 h-7 rounded-md text-xs flex items-center justify-center flex-shrink-0"
                >
                  ✕
                </button>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={branchHandle(b.id)}
                  className={`nf-num-handle ${hot === branchHandle(b.id) ? 'nf-hot' : ''}`}
                  style={{ right: -28, top: '50%' }}
                >
                  {idx + 1}
                </Handle>
              </div>
              <ConditionEditor
                condition={b.condition}
                onChange={(condition) => updateBranch(b.id, { condition })}
                emptyText="No rules yet — this branch always matches"
              />
            </div>
          ))}
          <button
            onClick={addBranch}
            className="w-full bg-ink-900 border border-dashed border-ink-600 text-accent-condition hover:bg-ink-700 hover:text-white py-1 rounded text-xs"
          >
            + Add branch
          </button>
          <div className="relative flex items-center rounded border border-ink-600 bg-black/5 px-2 py-1.5" {...hotRow(id, 'else')}>
            <span className="text-[10px] text-gray-400 font-semibold">ELSE</span>
            <span className="text-[11px] text-gray-500 ml-2">when nothing above matches</span>
            <Handle type="source" position={Position.Right} id="else" style={{ right: -14, top: '50%' }} />
          </div>
        </div>
        <TagBar id={id} tags={data.tags} accentBorder="focus:border-accent-condition" />
      </div>
    </div>
  );
}
