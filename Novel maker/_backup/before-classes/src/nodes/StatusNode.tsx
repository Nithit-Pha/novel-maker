import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useFlowStore } from '../store';
import type { StatusData } from '../types';
import { statusGroupNames } from '../engine';
import NodeHeader from './NodeHeader';
import TagBar from './TagBar';
import OnEnterSection from '../logic/OnEnterSection';
import { stop } from '../logic/fields';

type StatusNodeType = Node<StatusData, 'status'>;

const field =
  'w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1.5 rounded focus:outline-none focus:border-accent-status nodrag';
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Shows the reader their items / abilities / power (variables marked "Show to reader"). */
export default function StatusNode({ id, data, selected }: NodeProps<StatusNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const variables = useFlowStore((s) => s.variables);
  const groups = statusGroupNames(variables);
  const chosen = data.groups ?? [];
  // Variables this card will list (by group), for a quick preview on the canvas.
  const shown = variables.filter((v) => v.show && (chosen.length === 0 || chosen.some((g) => same(g, v.show!.group || 'Items'))));
  const missing = chosen.filter((g) => !groups.some((x) => same(x, g)));

  const toggle = (g: string) => {
    const on = chosen.some((x) => same(x, g));
    updateNodeData(id, { groups: on ? chosen.filter((x) => !same(x, g)) : [...chosen, g] });
  };

  return (
    <div className={`nf-node nf-kind-status min-w-[260px] max-w-[300px] ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="in" />
      <NodeHeader id={id} kind="status" label="Status" pinned={data.pinned} />
      <div className="p-3 space-y-2">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Heading</label>
          <input
            value={data.title ?? ''}
            onChange={(e) => updateNodeData(id, { title: e.target.value })}
            placeholder="Your status"
            className={`${field} font-story`}
            onMouseDown={stop}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Text (optional)</label>
          <textarea
            value={data.text ?? ''}
            onChange={(e) => updateNodeData(id, { text: e.target.value })}
            placeholder="e.g. You check your bag."
            className={`${field} font-story resize-y min-h-[44px]`}
            onMouseDown={stop}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Show</label>
          {groups.length === 0 ? (
            <p className="text-[11.5px] text-warning leading-snug">
              No variable is shown to readers yet. In Library → Variables, turn on “Show to reader”.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1 nodrag">
                <button
                  onClick={() => updateNodeData(id, { groups: [] })}
                  aria-pressed={chosen.length === 0}
                  className={`px-2 h-6 rounded-full border text-[12px] transition-colors ${
                    chosen.length === 0 ? 'bg-accent-status text-surface border-accent-status' : 'border-ink-600 text-gray-300 hover:border-accent-status'
                  }`}
                >
                  Everything
                </button>
                {groups.map((g) => {
                  const on = chosen.some((x) => same(x, g));
                  return (
                    <button
                      key={g}
                      onClick={() => toggle(g)}
                      aria-pressed={on}
                      className={`px-2 h-6 rounded-full border text-[12px] transition-colors ${
                        on ? 'bg-accent-status text-surface border-accent-status' : 'border-ink-600 text-gray-300 hover:border-accent-status'
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">
                {shown.length
                  ? `${shown.length} variable${shown.length === 1 ? '' : 's'}: ${shown
                      .slice(0, 6)
                      .map((v) => `${v.show?.icon ? v.show.icon + ' ' : ''}${v.show?.label?.trim() || v.name}`)
                      .join(', ')}${shown.length > 6 ? '…' : ''}`
                  : 'Nothing to list in these groups.'}
              </p>
            </>
          )}
          {missing.length > 0 && (
            <p className="text-[11px] text-warning mt-1">No variable uses: {missing.join(', ')}</p>
          )}
        </div>
        <TagBar id={id} tags={data.tags} accentBorder="focus:border-accent-status" />
        <OnEnterSection id={id} effects={data.onEnter} />
      </div>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
