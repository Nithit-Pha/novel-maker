import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { alertDialog, confirmDialog } from './ui/dialogs';
import { MenuItem } from './ui/Dropdown';
import { useFlowStore } from './store';

const MENU_W = 176;

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
  /** Open arc menu: which arc, and the ⋯ button it belongs to (for positioning). */
  const [menu, setMenu] = useState<{ arcId: string; anchor: HTMLElement } | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  // The strip scrolls sideways, which would clip a menu inside it — so the menu
  // is drawn on top of the page (portal) at the ⋯ button's position.
  useLayoutEffect(() => {
    if (!menu) return setPos(null);
    const r = menu.anchor.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - MENU_W - 8));
    setPos({ left, top: r.bottom + 6 });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || menu.anchor.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        menu.anchor.focus();
      }
    };
    const strip = stripRef.current;
    window.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    strip?.addEventListener('scroll', close);
    menuRef.current?.querySelector('button')?.focus();
    return () => {
      window.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      strip?.removeEventListener('scroll', close);
    };
  }, [menu]);

  const startRename = (id: string, name: string) => {
    setMenu(null);
    setEditingId(id);
    setDraft(name);
  };
  const commitRename = () => {
    if (editingId) renameArc(editingId, draft.trim() || 'Arc');
    setEditingId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    setMenu(null);
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

  const menuArc = menu ? arcs.find((a) => a.id === menu.arcId) : undefined;

  return (
    <div
      ref={stripRef}
      className="h-10 bg-bg border-b border-border flex items-stretch px-2 sm:px-3 gap-1 flex-shrink-0 overflow-x-auto"
    >
      <span className="self-center font-story italic text-[14px] text-fg-soft pl-1 pr-2 select-none truncate max-w-[220px]" title="Project">
        {projectTitle}
      </span>
      <span className="self-center text-faint pr-1 select-none">/</span>
      {arcs.map((arc) => {
        const active = arc.id === activeArcId;
        const open = menu?.arcId === arc.id;
        return (
          <div key={arc.id} className="flex items-center flex-shrink-0">
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
                className="nf-input !h-7 !py-0 !text-[12.5px] w-32"
                aria-label="Arc name"
              />
            ) : (
              <div
                className={`my-1.5 h-7 rounded-lg flex items-center border transition-colors ${
                  active
                    ? 'text-fg border-border bg-surface font-semibold shadow-sm'
                    : 'text-muted border-transparent hover:text-fg hover:bg-surface-2'
                }`}
              >
                <button
                  onClick={() => setActiveArc(arc.id)}
                  onDoubleClick={() => startRename(arc.id, arc.name)}
                  className="pl-3 pr-1 h-full text-[12.5px] max-w-[180px] truncate rounded-l-lg"
                  title="Click to open · double-click to rename"
                >
                  {arc.name}
                </button>
                <button
                  onClick={(e) => setMenu(open ? null : { arcId: arc.id, anchor: e.currentTarget })}
                  className={`h-6 w-6 mr-0.5 rounded-md flex items-center justify-center transition-colors ${
                    open ? 'bg-surface-2 text-fg' : 'text-faint hover:text-fg hover:bg-surface-2'
                  }`}
                  aria-label={`Actions for ${arc.name}`}
                  aria-haspopup="menu"
                  aria-expanded={open}
                  title="Rename, duplicate or delete"
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>
            )}
          </div>
        );
      })}
      <button
        onClick={addArc}
        className="nf-icon-btn !w-7 !h-7 self-center flex-shrink-0"
        title="Add an arc"
        aria-label="Add an arc"
      >
        <Plus size={15} />
      </button>

      {menu &&
        menuArc &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Actions for ${menuArc.name}`}
            className="nf-menu animate-pop fixed"
            style={{ left: pos.left, top: pos.top, width: MENU_W, zIndex: 60 }}
          >
            <MenuItem icon={<Pencil size={14} />} label="Rename" onClick={() => startRename(menuArc.id, menuArc.name)} />
            <MenuItem
              icon={<Copy size={14} />}
              label="Duplicate"
              onClick={() => {
                setMenu(null);
                duplicateArc(menuArc.id);
              }}
            />
            <div className="nf-menu-sep" />
            <MenuItem icon={<Trash2 size={14} />} label="Delete…" danger onClick={() => void handleDelete(menuArc.id, menuArc.name)} />
          </div>,
          document.body
        )}
    </div>
  );
}
