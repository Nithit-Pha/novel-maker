import { Tag } from 'lucide-react';
import { useFlowStore } from './store';
import { type FlowNode, allTags } from './search';
import Dropdown from './ui/Dropdown';

interface Props {
  activeTags: string[];
  onChange: (tags: string[]) => void;
}

/** Toolbar control: a "Tags" button opening a popover of checkable tag chips. */
export default function TagFilter({ activeTags, onChange }: Props) {
  const nodes = useFlowStore((s) => s.nodes) as FlowNode[];
  const tags = allTags(nodes);

  const toggle = (tag: string) =>
    onChange(activeTags.includes(tag) ? activeTags.filter((t) => t !== tag) : [...activeTags, tag]);

  return (
    <Dropdown
      align="right"
      width="w-60"
      trigger={({ toggle: t, open }) => (
        <button
          onClick={t}
          className={`nf-btn ${activeTags.length || open ? 'nf-btn-active' : ''}`}
          title="Filter nodes by tag (dims the rest)"
        >
          <Tag size={15} />
          <span className="hidden 2xl:inline">Tags</span>
          {activeTags.length > 0 && <span className="text-[11px] font-semibold">{activeTags.length}</span>}
        </button>
      )}
    >
      {() =>
        tags.length === 0 ? (
          <p className="text-xs text-muted italic px-2 py-3 text-center">No tags yet. Add tags inside any node.</p>
        ) : (
          <div className="p-1">
            <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto">
              {tags.map((tag) => {
                const on = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggle(tag)}
                    className={`text-[11.5px] rounded-full px-2.5 py-0.5 border transition-colors ${
                      on ? 'bg-accent border-accent text-on-accent' : 'bg-sunken border-border text-fg-soft hover:border-border-strong'
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
            {activeTags.length > 0 && (
              <button onClick={() => onChange([])} className="mt-2 w-full text-xs text-muted hover:text-fg border-t border-border pt-2">
                Clear filter
              </button>
            )}
          </div>
        )
      }
    </Dropdown>
  );
}
