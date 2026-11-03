import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useFlowStore } from '../store';
import type { EndData } from '../types';
import NodeHeader from './NodeHeader';
import TagBar from './TagBar';
import OnEnterSection from '../logic/OnEnterSection';
import { stop } from '../logic/fields';
import CharacterField from '../library/CharacterField';

type EndNodeType = Node<EndData, 'end'>;

const field =
  'w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1.5 rounded focus:outline-none focus:border-accent-end nodrag';

/** An ending. Every field is optional; it has no outgoing wire. */
export default function EndNode({ id, data, selected }: NodeProps<EndNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  return (
    <div className={`nf-node nf-kind-end min-w-[260px] max-w-[300px] ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="in" />
      <NodeHeader id={id} kind="end" label="Ending" pinned={data.pinned} />
      <div className="p-3 space-y-2">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Title (optional)</label>
          <input
            value={data.title ?? ''}
            onChange={(e) => updateNodeData(id, { title: e.target.value })}
            placeholder="e.g. Two Keepers"
            className={`${field} text-base font-semibold font-story`}
            onMouseDown={stop}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Context (optional)</label>
          <textarea
            value={data.description ?? ''}
            onChange={(e) => updateNodeData(id, { description: e.target.value })}
            placeholder="What happens in the end…"
            className={`${field} font-story resize-y min-h-[56px]`}
            onMouseDown={stop}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Character (optional)</label>
          <CharacterField
            value={data.character ?? ''}
            characterId={data.characterId}
            onChange={(character, characterId) => updateNodeData(id, { character, characterId })}
            placeholder="Who speaks last?"
            className={field.replace('w-full ', '')}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Dialogue (optional)</label>
          <textarea
            value={data.text ?? ''}
            onChange={(e) => updateNodeData(id, { text: e.target.value })}
            placeholder="Their closing line"
            className={`${field} font-story resize-y min-h-[48px]`}
            onMouseDown={stop}
          />
        </div>
        <TagBar id={id} tags={data.tags} accentBorder="focus:border-accent-end" />
        <OnEnterSection id={id} effects={data.onEnter} />
      </div>
    </div>
  );
}
