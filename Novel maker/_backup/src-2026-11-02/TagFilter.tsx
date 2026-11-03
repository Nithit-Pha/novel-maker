import { useEffect, useRef, useState } from 'react';
import { useFlowStore } from './store';
import { type FlowNode, allTags } from './search';

interface Props {
  activeTags: string[];
  onChange: (tags: string[]) => void;
}

/** Toolbar control: a "Tags" button opening a popover of checkable tag chips. */
export default function TagFilter({ activeTags, onChange }: Props) {
  const nodes = useFlowStore((s) => s.nodes) as FlowNode[];
  const tags = allTags(nodes);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDoc);
    return () => window.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = (tag: string) =>
    onChange(activeTags.includes(tag) ? activeTags.filter((t) => t !== tag) : [...activeTags, tag]);

  const btn =
    'bg-ink-700 hover:bg-ink-600 text-white border border-ink-600 px-3 py-1.5 rounded text-sm transition';
  const btnActive = 'bg-accent hover:bg-accent/90 text-white px-3 py-1.5 rounded text-sm transition';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={activeTags.length ? btnActive : btn}
        title="Filter nodes by tag"
      >
        🏷 Tags{activeTags.length ? ` (${activeTags.length})` : ''}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-ink-800 border border-ink-600 rounded-lg shadow-2xl z-40 p-2">
          {tags.length === 0 ? (
            <p className="text-xs text-ink-500 italic px-2 py-3 text-center">
              No tags yet. Add tags inside any node.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto">
                {tags.map((tag) => {
                  const on = activeTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggle(tag)}
                      className={`text-[11px] rounded-full px-2 py-0.5 border transition ${
                        on
                          ? 'bg-accent border-accent text-white'
                          : 'bg-ink-900 border-ink-600 text-gray-300 hover:text-white'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
              {activeTags.length > 0 && (
                <button
                  onClick={() => onChange([])}
                  className="mt-2 w-full text-xs text-gray-400 hover:text-white border-t border-ink-600 pt-2"
                >
                  Clear filter
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
