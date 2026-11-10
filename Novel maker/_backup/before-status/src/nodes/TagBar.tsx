import { useState } from 'react';
import { useFlowStore } from '../store';

interface Props {
  id: string;
  tags?: string[];
  /** Tailwind border/text accent for the add-focus state. */
  accentBorder: string;
}

/** Chip-style tag editor shown in each node's body. */
export default function TagBar({ id, tags, accentBorder }: Props) {
  const setNodeTags = useFlowStore((s) => s.setNodeTags);
  const [draft, setDraft] = useState('');
  const list = tags ?? [];

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    if (!list.includes(t)) setNodeTags(id, [...list, t]);
    setDraft('');
  };

  const remove = (tag: string) => setNodeTags(id, list.filter((t) => t !== tag));

  return (
    <div className="flex flex-wrap items-center gap-1">
      {list.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 bg-ink-900 border border-ink-600 text-gray-300 text-[11px] rounded-full pl-2 pr-1 py-0.5"
        >
          #{tag}
          <button
            onClick={() => remove(tag)}
            className="text-gray-500 hover:text-white leading-none"
            title="Remove tag"
          >
            ✕
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder="+ tag"
        className={`bg-ink-900 border border-ink-600 text-white text-[11px] px-2 py-0.5 rounded-full w-20 focus:outline-none focus:w-28 transition-all nodrag ${accentBorder}`}
        onMouseDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}
