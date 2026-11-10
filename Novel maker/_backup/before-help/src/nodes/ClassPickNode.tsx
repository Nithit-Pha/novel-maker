import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useFlowStore } from '../store';
import type { ClassDef, ClassPickData } from '../types';
import NodeHeader from './NodeHeader';
import TagBar from './TagBar';
import OnEnterSection from '../logic/OnEnterSection';
import { stop } from '../logic/fields';

type ClassPickNodeType = Node<ClassPickData, 'classpick'>;

const field =
  'w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1.5 rounded focus:outline-none focus:border-accent-classpick nodrag';
const chip = (on: boolean) =>
  `px-2 h-6 rounded-full border text-[12px] transition-colors ${
    on ? 'bg-accent-classpick text-surface border-accent-classpick' : 'border-ink-600 text-gray-300 hover:border-accent-classpick'
  }`;
const label = (c: ClassDef) => `${c.icon ? c.icon + ' ' : ''}${c.name.trim() || '(unnamed)'}`;

/** The reader picks a class — or, in sub-class mode, a sub-class of the class they have. */
export default function ClassPickNode({ id, data, selected }: NodeProps<ClassPickNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const classes = useFlowStore((s) => s.classes);
  const sub = data.mode === 'subclass';
  const options = data.options ?? [];
  const pool = sub ? classes.filter((c) => c.parentId) : classes.filter((c) => !c.parentId);
  const toggle = (cid: string) =>
    updateNodeData(id, { options: options.includes(cid) ? options.filter((x) => x !== cid) : [...options, cid] });

  return (
    <div className={`nf-node nf-kind-classpick min-w-[260px] max-w-[310px] ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="in" />
      <NodeHeader id={id} kind="classpick" label={sub ? 'Choose sub-class' : 'Choose class'} pinned={data.pinned} />
      <div className="p-3 space-y-2">
        <div className="flex rounded-md border border-ink-600 overflow-hidden text-[12px] nodrag" role="group" aria-label="What the reader picks">
          {(['class', 'subclass'] as const).map((m) => (
            <button
              key={m}
              onClick={() => updateNodeData(id, { mode: m, options: [] })}
              aria-pressed={data.mode === m}
              className={`flex-1 py-1 transition-colors ${data.mode === m ? 'bg-accent-classpick text-surface font-medium' : 'text-gray-300 hover:bg-ink-700'}`}
            >
              {m === 'class' ? 'Class' : 'Sub-class (later)'}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Heading</label>
          <input
            value={data.title ?? ''}
            onChange={(e) => updateNodeData(id, { title: e.target.value })}
            placeholder={sub ? 'Choose your path' : 'Who are you?'}
            className={`${field} font-story`}
            onMouseDown={stop}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Text (optional)</label>
          <textarea
            value={data.prompt ?? ''}
            onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
            placeholder={sub ? 'e.g. At the temple, the elders ask…' : 'e.g. Before the journey, tell us who you are.'}
            className={`${field} font-story resize-y min-h-[44px]`}
            onMouseDown={stop}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Offer</label>
          {pool.length === 0 ? (
            <p className="text-[11.5px] text-warning leading-snug">
              {sub ? 'No class has sub-classes yet.' : 'No classes yet.'} Add some in Library → Classes.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1 nodrag">
                <button onClick={() => updateNodeData(id, { options: [] })} aria-pressed={options.length === 0} className={chip(options.length === 0)}>
                  {sub ? 'All of their class' : 'All classes'}
                </button>
                {pool.map((c) => (
                  <button key={c.id} onClick={() => toggle(c.id)} aria-pressed={options.includes(c.id)} className={chip(options.includes(c.id))}>
                    {label(c)}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">
                {sub
                  ? 'Readers only see sub-classes of the class they have. Nothing to offer → Next.'
                  : 'The reader becomes the class they pick; its changes run.'}
              </p>
            </>
          )}
        </div>
        <TagBar id={id} tags={data.tags} accentBorder="focus:border-accent-classpick" />
        <OnEnterSection id={id} effects={data.onEnter} />
      </div>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
