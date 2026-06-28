import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useFlowStore } from '../store';
import type { DecisionData } from '../types';
import NodeHeader from './NodeHeader';
import TagBar from './TagBar';

type DecisionNodeType = Node<DecisionData, 'decision'>;

export default function DecisionNode({ id, data, selected }: NodeProps<DecisionNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const setChoice = (idx: number, value: string) => {
    const choices = [...data.choices];
    choices[idx] = value;
    updateNodeData(id, { choices });
  };

  const addChoice = () => {
    updateNodeData(id, { choices: [...data.choices, `Choice ${data.choices.length + 1}`] });
  };

  const removeChoice = (idx: number) => {
    const choices = data.choices.filter((_, i) => i !== idx);
    updateNodeData(id, { choices });
  };

  return (
    <div
      className={`min-w-[280px] max-w-[320px] bg-ink-800 border-2 rounded-lg shadow-lg ${
        selected ? 'border-accent' : data.pinned ? 'border-accent-decision' : 'border-accent-decision'
      }`}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <NodeHeader id={id} icon="🔀" label="Decision" accentText="text-accent-decision" pinned={data.pinned} />
      <div className="p-3 space-y-2">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Question / Situation</label>
          <textarea
            value={data.prompt}
            onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
            placeholder="What's the choice?"
            className="w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1.5 rounded focus:outline-none focus:border-accent-decision resize-y min-h-[50px] nodrag"
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Choices</label>
          <div className="space-y-1.5">
            {data.choices.map((choice, idx) => (
              <div key={idx} className="relative flex items-center gap-1">
                <input
                  value={choice}
                  onChange={(e) => setChoice(idx, e.target.value)}
                  placeholder={`Choice ${idx + 1}`}
                  className="flex-1 bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-accent-decision nodrag"
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <button
                  onClick={() => removeChoice(idx)}
                  className="bg-ink-600 hover:bg-accent text-gray-300 hover:text-white w-6 h-6 rounded text-xs flex-shrink-0"
                >
                  ✕
                </button>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`choice-${idx}`}
                  style={{ right: -16, top: '50%' }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={addChoice}
            className="w-full mt-2 bg-ink-900 border border-dashed border-ink-600 text-accent-dialog hover:bg-ink-700 hover:text-white py-1 rounded text-xs"
          >
            + Add choice
          </button>
        </div>
        <TagBar id={id} tags={data.tags} accentBorder="focus:border-accent-decision" />
      </div>
    </div>
  );
}
