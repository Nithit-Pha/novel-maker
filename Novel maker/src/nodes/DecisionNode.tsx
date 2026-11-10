import { useState } from 'react';
import { Lock, Settings2, X, Zap } from 'lucide-react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useFlowStore } from '../store';
import type { Choice, DecisionData } from '../types';
import { newId } from '../project';
import { choiceHandle, describeCondition, describeEffects } from '../engine';
import NodeHeader from './NodeHeader';
import TagBar from './TagBar';
import EffectsEditor from '../logic/EffectsEditor';
import ConditionEditor from '../logic/ConditionEditor';
import OnEnterSection from '../logic/OnEnterSection';
import { fieldCls, stop } from '../logic/fields';
import { hotRow, useUi } from '../ui/uiStore';

type DecisionNodeType = Node<DecisionData, 'decision'>;

export default function DecisionNode({ id, data, selected }: NodeProps<DecisionNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const removeChoice = useFlowStore((s) => s.removeChoice);
  const variables = useFlowStore((s) => s.variables);
  const classes = useFlowStore((s) => s.classes);
  const [openId, setOpenId] = useState<string | null>(null);
  const hot = useUi((s) => (s.hot?.nodeId === id ? s.hot.handle : null));

  // Choices have stable ids, so their wires (handle `choice-<id>`) never shift
  // when another choice is removed.
  const updateChoice = (choiceId: string, patch: Partial<Choice>) => {
    updateNodeData(id, {
      choices: data.choices.map((c) => (c.id === choiceId ? { ...c, ...patch } : c)),
    });
  };

  const addChoice = () => {
    updateNodeData(id, {
      choices: [...data.choices, { id: newId(), label: `Choice ${data.choices.length + 1}` }],
    });
  };

  return (
    <div
      className={`nf-node nf-kind-decision min-w-[300px] max-w-[360px] ${selected ? 'is-selected' : ''}`}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <NodeHeader id={id} kind="decision" label="Decision" pinned={data.pinned} />
      <div className="p-3 space-y-2">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Question / Situation</label>
          <textarea
            value={data.prompt}
            onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
            placeholder="What's the choice?"
            className="font-story w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1.5 rounded focus:outline-none focus:border-accent-decision resize-y min-h-[50px] nodrag"
            onMouseDown={stop}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Choices</label>
          <div className="space-y-1.5">
            {data.choices.map((choice, idx) => {
              const nFx = choice.effects?.length ?? 0;
              const nRules = choice.condition?.clauses.length ?? 0;
              const open = openId === choice.id;
              return (
                <div key={choice.id} className={open ? 'rounded border border-ink-600 bg-black/5' : ''}>
                  <div className="relative flex items-center gap-1" {...hotRow(id, choiceHandle(choice.id))}>
                    <input
                      value={choice.label}
                      onChange={(e) => updateChoice(choice.id, { label: e.target.value })}
                      placeholder={`Choice ${idx + 1}`}
                      className="flex-1 min-w-0 bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-accent-decision nodrag"
                      onMouseDown={stop}
                    />
                    <button
                      onClick={() => setOpenId(open ? null : choice.id)}
                      title={
                        [
                          nRules ? `Available if ${describeCondition(choice.condition, variables, classes)}` : '',
                          nFx ? `When chosen: ${describeEffects(choice.effects, variables, classes)}` : '',
                        ]
                          .filter(Boolean)
                          .join('\n') || 'Effects & condition for this choice'
                      }
                      className={`h-7 px-1.5 rounded-md flex-shrink-0 flex items-center gap-0.5 border transition-colors ${
                        open
                          ? 'bg-accent-condition/15 border-accent-condition/50 text-accent-condition'
                          : nRules + nFx
                          ? 'bg-accent-condition/10 border-transparent text-accent-condition hover:border-accent-condition/40'
                          : 'border-transparent text-faint hover:text-fg hover:bg-surface-2'
                      }`}
                      aria-label="Effects and condition"
                    >
                      {nRules > 0 && <Lock size={12} />}
                      {nFx > 0 && <Zap size={12} />}
                      {nRules + nFx === 0 && <Settings2 size={13} />}
                    </button>
                    <button
                      onClick={() => removeChoice(id, choice.id)}
                      title="Remove this choice (and its wire)"
                      className="text-faint hover:bg-danger/15 hover:text-danger w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      aria-label="Remove choice"
                    >
                      <X size={14} />
                    </button>
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={choiceHandle(choice.id)}
                      className={`nf-num-handle ${hot === choiceHandle(choice.id) ? 'nf-hot' : ''}`}
                      style={{ right: -21, top: open ? 12 : '50%' }}
                    >
                      {idx + 1}
                    </Handle>
                  </div>
                  {open && (
                    <div className="p-2 space-y-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted mb-1 flex items-center gap-1"><Zap size={11} /> When chosen</div>
                        <EffectsEditor
                          effects={choice.effects}
                          onChange={(effects) => updateChoice(choice.id, { effects })}
                        />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted mb-1 flex items-center gap-1"><Lock size={11} /> Available only if</div>
                        <ConditionEditor
                          condition={choice.condition}
                          onChange={(condition) => updateChoice(choice.id, { condition })}
                          emptyText="Always available"
                        />
                      </div>
                      {nRules > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[11px] text-gray-400">
                            When locked
                            <select
                              value={choice.whenLocked ?? 'show-locked'}
                              onChange={(e) => updateChoice(choice.id, { whenLocked: e.target.value as Choice['whenLocked'] })}
                              onMouseDown={stop}
                              className={fieldCls}
                            >
                              <option value="show-locked">show greyed out</option>
                              <option value="hide">hide it</option>
                            </select>
                          </div>
                          {(choice.whenLocked ?? 'show-locked') === 'show-locked' && (
                            <input
                              value={choice.lockedText ?? ''}
                              onChange={(e) => updateChoice(choice.id, { lockedText: e.target.value })}
                              onMouseDown={stop}
                              placeholder={`Reason shown: Requires ${describeCondition(choice.condition, variables, classes)}`}
                              className={`${fieldCls} w-full`}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button
            onClick={addChoice}
            className="w-full mt-2 bg-ink-900 border border-dashed border-ink-600 text-accent-dialog hover:bg-ink-700 hover:text-white py-1 rounded text-xs"
          >
            + Add choice
          </button>
        </div>
        <TagBar id={id} tags={data.tags} accentBorder="focus:border-accent-decision" />
        <OnEnterSection id={id} effects={data.onEnter} />
      </div>
    </div>
  );
}
