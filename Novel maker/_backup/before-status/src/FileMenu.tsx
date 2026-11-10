import { useEffect, useRef, useState } from 'react';

interface Props {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportJson: () => void;
  onExportHtml: () => void;
}

interface Item {
  label: string;
  hint?: string;
  onClick: () => void;
}

export default function FileMenu({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onExportJson,
  onExportHtml,
}: Props) {
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

  // Grouped items; groups are separated by a divider.
  const groups: Item[][] = [
    [
      { label: 'New', onClick: onNew },
      { label: 'Open…', onClick: onOpen },
    ],
    [
      { label: 'Save', hint: 'Ctrl+S', onClick: onSave },
      { label: 'Save As…', onClick: onSaveAs },
    ],
    [
      { label: 'Export JSON', onClick: onExportJson },
      { label: 'Export as HTML', onClick: onExportHtml },
    ],
  ];

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const btn =
    'bg-ink-700 hover:bg-ink-600 text-white border border-ink-600 px-3 py-1.5 rounded text-sm transition';

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className={btn} title="File">
        File ▾
      </button>
      {open && (
        <div className="absolute left-0 mt-1 w-44 bg-ink-800 border border-ink-600 rounded-lg shadow-2xl z-40 p-1">
          {groups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'border-t border-ink-600 mt-1 pt-1' : ''}>
              {group.map((it) => (
                <button
                  key={it.label}
                  onClick={() => run(it.onClick)}
                  className="w-full flex items-center justify-between text-left text-sm text-gray-200 hover:bg-ink-700 hover:text-white rounded px-2 py-1.5 transition"
                >
                  <span>{it.label}</span>
                  {it.hint && <span className="text-[11px] text-gray-500">{it.hint}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
