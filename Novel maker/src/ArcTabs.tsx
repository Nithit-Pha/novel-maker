import { useEffect, useRef, useState } from 'react';
import { useFlowStore } from './store';

export default function ArcTabs() {
  const arcs = useFlowStore((s) => s.arcs);
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

  const handleDelete = (id: string, name: string) => {
    setMenuId(null);
    if (arcs.length <= 1) {
      alert('You need at least one arc.');
      return;
    }
    if (confirm(`Delete arc "${name}"? This removes its whole page.`)) deleteArc(id);
  };

  return (
    <div className="h-9 bg-ink-900 border-b border-ink-600 flex items-stretch px-2 gap-1 flex-shrink-0 overflow-x-auto">
      <span className="self-center text-[11px] text-gray-500 pr-1 select-none">Story ▸</span>
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
                className={`my-1 pl-3 pr-1 h-7 rounded-t flex items-center gap-1 text-xs border-b-2 transition ${
                  active
                    ? 'text-white border-accent bg-ink-800 font-semibold'
                    : 'text-gray-400 border-transparent hover:text-white hover:bg-ink-800/50'
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
                className="absolute top-8 left-0 w-36 bg-ink-800 border border-ink-600 rounded-lg shadow-2xl z-40 p-1 text-sm"
              >
                <button onClick={() => startRename(arc.id, arc.name)} className="w-full text-left text-gray-200 hover:bg-ink-700 hover:text-white rounded px-2 py-1.5">Rename</button>
                <button onClick={() => { setMenuId(null); duplicateArc(arc.id); }} className="w-full text-left text-gray-200 hover:bg-ink-700 hover:text-white rounded px-2 py-1.5">Duplicate</button>
                <button onClick={() => handleDelete(arc.id, arc.name)} className="w-full text-left text-gray-400 hover:bg-accent hover:text-white rounded px-2 py-1.5">Delete</button>
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
