import { alertDialog, confirmDialog } from './ui/dialogs';
import { useEffect, useRef, useState } from 'react';
import { useFlowStore } from './store';

export default function ArcTabs() {
  const arcs = useFlowStore((s) => s.arcs);
  const projectTitle = useFlowStore((s) => s.projectTitle);
  const activeArcId = useFlowStore((s) => s.activeArcId);
  const setActiveArc = useFlowStore((s) => s.setActiveArc);
  const addArc = useFlowStore((s) => s.addArc);
  const renameArc = useFlowStore((s) => s.renameArc);
  const deleteArc = useFlowStore((s) => s.deleteArc);
  const duplicateArc = useFlowStore((s) => s.duplicateArc);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuId) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null);
    };
    window.addEventListener('mousedown', onDoc);
    return () => window.removeEventListener('mousedown', onDoc);
  }, [menuId]);

  const startRename = (id: string, name: string) => {
    setMenuId(null);
    setEditingId(id);
    setDraft(name);
  };
  const commitRename = () => {
    if (editingId) renameArc(editingId, draft.trim() || 'Arc');
    setEditingId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    setMenuId(null);
    if (arcs.length <= 1) {
      void alertDialog({ title: 'Keep at least one arc', message: 'A story needs at least one arc page.' });
      return;
    }
    const ok = await confirmDialog({
      title: `Delete arc “${name}”?`,
      message: 'This removes its whole page.',
      confirmLabel: 'Delete arc',
      danger: true,
    });
    if (ok) deleteArc(id);
  };

  return (
    <div className="h-10 bg-bg border-b border-border flex items-stretch px-2 sm:px-3 gap-1 flex-shrink-0 overflow-x-auto">
      <span className="self-center font-story italic text-[14px] text-fg-soft pl-1 pr-2 select-none truncate max-w-[220px]" title="Project">
        {projectTitle}
      </span>
      <span className="self-center text-faint pr-1 select-none">/</span>
      {arcs.map((arc) => {
        const active = arc.id === activeArcId;
        return (
          <div key={arc.id} className="relative flex items-center">
            {editingId === arc.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="my-1 bg-ink-900 border border-accent text-white text-xs px-2 rounded w-28 focus:outline-none"
              />
            ) : (
              <button
                onClick={() => setActiveArc(arc.id)}
                onDoubleClick={() => startRename(arc.id, arc.name)}
                className={`my-1.5 pl-3 pr-1 h-7 rounded-lg flex items-center gap-1 text-[12.5px] border transition-colors ${
                  active
                    ? 'text-fg border-border bg-surface font-semibold shadow-sm'
                    : 'text-muted border-transparent hover:text-fg hover:bg-surface-2'
                }`}
                title="Click to open · double-click to rename"
              >
                <span className="max-w-[160px] truncate">{arc.name}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuId(menuId === arc.id ? null : arc.id);
                  }}
                  className="px-1 text-gray-500 hover:text-white rounded"
                >
                  ⋯
                </span>
              </button>
            )}
            {menuId === arc.id && (
              <div
                ref={menuRef}
                className="nf-menu animate-pop absolute top-9 left-0 w-40 text-sm"
              >
                <button onClick={() => startRename(arc.id, arc.name)} className="w-full text-left text-gray-200 hover:bg-ink-700 hover:text-white rounded px-2 py-1.5">Rename</button>
                <button onClick={() => { setMenuId(null); duplicateArc(arc.id); }} className="w-full text-left text-gray-200 hover:bg-ink-700 hover:text-white rounded px-2 py-1.5">Duplicate</button>
                <button onClick={() => handleDelete(arc.id, arc.name)} className="w-full text-left text-gray-400 hover:bg-danger/15 hover:text-danger rounded px-2 py-1.5">Delete</button>
              </div>
            )}
          </div>
        );
      })}
      <button
        onClick={addArc}
        className="my-1 px-2 h-7 rounded text-gray-400 hover:text-white hover:bg-ink-800 text-sm self-center"
        title="Add an arc"
      >
        +
      </button>
    </div>
  );
}
