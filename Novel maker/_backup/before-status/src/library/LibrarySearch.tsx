import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Items shown / all items — shows "3 of 12" while searching. */
  shown: number;
  total: number;
}

/** Search box at the top of a Library tab. Esc or ✕ clears it. */
export default function LibrarySearch({ value, onChange, placeholder, shown, total }: Props) {
  const active = value.trim() !== '';
  return (
    <div className="relative mt-2.5">
      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.stopPropagation();
            onChange('');
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`nf-input w-full !h-8 !py-0 !pl-8 ${active ? '!pr-[84px]' : '!pr-2'} text-[13px] [&::-webkit-search-cancel-button]:hidden`}
      />
      {active && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <span className="text-[11px] text-muted whitespace-nowrap" aria-live="polite">
            {shown} of {total}
          </span>
          <button className="nf-icon-btn !w-6 !h-6" onClick={() => onChange('')} title="Clear search (Esc)" aria-label="Clear search">
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

/** "No characters match “x”." */
export function NoMatches({ what, query }: { what: string; query: string }) {
  return (
    <p className="text-sm text-muted italic text-center mt-6 px-2 break-words">
      No {what} match “{query.trim()}”.
    </p>
  );
}
