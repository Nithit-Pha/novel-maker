import { useEffect, useRef, useState } from 'react';
import type { NodeKind } from './types';

interface Props {
  onAdd: (kind: NodeKind) => void;
}

// Logic/branching node creators grouped under one toolbar "folder".
// Add future logic nodes here.
const ITEMS: { kind: NodeKind; icon: string; label: string }[] = [
  { kind: 'chapter', icon: '📖', label: 'Start Chapter' },
  { kind: 'decision', icon: '🔀', label: 'Decision' },
  { kind: 'loop', icon: '🔁', label: 'Loop' },
];

export default function FunctionMenu({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const btn =
    'bg-ink-700 hover:bg-ink-600 text-white border border-ink-600 px-3 py-1.5 rounded text-sm transition';

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className={btn} title="Add a logic node">
        ➕ Function ▾
      </button>
      {open && (
        <div className="absolute left-0 mt-1 w-44 bg-ink-800 border border-ink-600 rounded-lg shadow-2xl z-40 p-1">
          {ITEMS.map((it) => (
            <button
              key={it.kind}
              onClick={() => {
                onAdd(it.kind);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 text-left text-sm text-gray-200 hover:bg-ink-700 hover:text-white rounded px-2 py-1.5 transition"
            >
              <span>{it.icon}</span>
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
