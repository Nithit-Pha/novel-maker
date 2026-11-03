import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useFlowStore } from '../store';
import type { DialogData } from '../types';
import NodeHeader from './NodeHeader';
import TagBar from './TagBar';
import CharacterField from '../library/CharacterField';
import OnEnterSection from '../logic/OnEnterSection';

type DialogNodeType = Node<DialogData, 'dialog'>;

export default function DialogNode({ id, data, selected }: NodeProps<DialogNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  return (
    <div
      className={`nf-node nf-kind-dialog min-w-[260px] max-w-[300px] ${selected ? 'is-selected' : ''}`}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <NodeHeader id={id} kind="dialog" label="Dialogue" pinned={data.pinned} />
      <div className="p-3 space-y-2">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Character</label>
          <CharacterField
            value={data.character}
            characterId={data.characterId}
            onChange={(character, characterId) => updateNodeData(id, { character, characterId })}
            className="bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-accent-dialog"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Dialogue</label>
          <textarea
            value={data.text}
            onChange={(e) => updateNodeData(id, { text: e.target.value })}
            placeholder="What do they say?"
            className="font-story w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1.5 rounded focus:outline-none focus:border-accent-dialog resize-y min-h-[60px] nodrag"
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
        <TagBar id={id} tags={data.tags} accentBorder="focus:border-accent-dialog" />
        <OnEnterSection id={id} effects={data.onEnter} />
      </div>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
