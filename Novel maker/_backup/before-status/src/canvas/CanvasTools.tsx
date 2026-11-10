// Canvas tools: Hand / Select switch (H · V · hold Space for Hand) and the
// selection bar that appears when 2+ cards are selected.

import { useEffect, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Bookmark, Hand, Image as ImageIcon, MousePointer2, Tag, Trash2, Wand2, X } from 'lucide-react';
import { canSavePoint } from '../runtime/core.js';
import { useView } from '../ui/viewPrefs';
import { useFlowStore } from '../store';
import { tidyArc } from './layout';
import ScenePicker from '../library/ScenePicker';
import { useSceneStore } from '../library/sceneStore';
import { notify } from '../ui/dialogs';

function typing(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

/** Bottom-centre switch between the Hand and Select tools. */
export function ToolSwitch() {
  const tool = useView((s) => s.tool);
  const set = useView((s) => s.set);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      if (document.querySelector('[role=dialog][aria-modal=true], [aria-label="Story player"]')) return;
      const k = e.key.toLowerCase();
      if (k === 'h') useView.getState().set({ tool: 'hand' });
      else if (k === 'v') useView.getState().set({ tool: 'select' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const btn = (on: boolean) =>
    `flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12.5px] font-medium transition-colors ${
      on ? 'bg-accent/10 text-accent' : 'text-muted hover:text-fg hover:bg-surface-2'
    }`;
  return (
    <div
      role="toolbar"
      aria-label="Canvas tool"
      className="absolute bottom-[62px] sm:bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 p-1 bg-surface border border-border rounded-xl"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      <button
        className={btn(tool === 'hand')}
        onClick={() => set({ tool: 'hand' })}
        aria-pressed={tool === 'hand'}
        aria-label="Hand tool"
        title="Hand (H): drag empty canvas to move around · Shift+drag still selects"
      >
        <Hand size={15} />
        <span className="hidden lg:inline">Move</span>
      </button>
      <button
        className={btn(tool === 'select')}
        onClick={() => set({ tool: 'select' })}
        aria-pressed={tool === 'select'}
        aria-label="Select tool"
        title="Select (V): drag empty canvas to draw a selection box · hold Space to move around"
      >
        <MousePointer2 size={15} />
        <span className="hidden lg:inline">Select</span>
      </button>
    </div>
  );
}

/** Floating bar for the selected cards: Scene · Tag · Tidy · Delete · clear. */
export function SelectionBar() {
  const ids = useFlowStore((s) =>
    s.nodes
      .filter((n) => n.selected)
      .map((n) => n.id)
      .join(',')
  );
  const list = ids ? ids.split(',') : [];
  const rf = useReactFlow();
  const [picker, setPicker] = useState<HTMLElement | null>(null);
  const [tagOpen, setTagOpen] = useState(false);
  const [tag, setTag] = useState('');
  const tagRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (list.length < 2) {
      setPicker(null);
      setTagOpen(false);
    }
  }, [list.length]);
  useEffect(() => {
    if (tagOpen) tagRef.current?.focus();
  }, [tagOpen]);
  // Esc clears the selection (the scene picker and tag box handle their own Esc first).
  useEffect(() => {
    if (list.length < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || typing(e.target) || document.querySelector('[role=dialog][aria-modal=true]')) return;
      const st = useFlowStore.getState();
      st.onNodesChange(st.nodes.filter((x) => x.selected).map((x) => ({ type: 'select' as const, id: x.id, selected: false })));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [list.length]);

  if (list.length < 2) return null;
  const n = list.length;

  // Shared scene of the selection (or a value that matches no option when mixed).
  const st = useFlowStore.getState();
  const sceneValues = new Set(st.nodes.filter((x) => x.selected).map((x) => x.data.sceneId ?? ''));
  const common = sceneValues.size === 1 ? [...sceneValues][0] || undefined : '__mixed';
  // Save point: only cards the reader stops on. All of them on → the button turns them off.
  const saveable = st.nodes.filter((x) => x.selected && canSavePoint(x));
  const allSaved = saveable.length > 0 && saveable.every((x) => x.data.savePoint);
  const toggleSave = () => {
    useFlowStore.getState().setSavePointFor(list, !allSaved);
    const k = saveable.length;
    notify(allSaved ? `Removed the save point from ${k} card${k === 1 ? '' : 's'}` : `${k} card${k === 1 ? ' is' : 's are'} now save points`);
  };

  const addTag = () => {
    const t = tag.trim();
    if (!t) return;
    useFlowStore.getState().addTagTo(list, t);
    notify(`Tagged ${n} cards #${t}`);
    setTag('');
    setTagOpen(false);
  };
  const clear = () => {
    useFlowStore.getState().onNodesChange(list.map((id) => ({ type: 'select' as const, id, selected: false })));
  };

  const item = 'nf-btn h-8 px-2.5 text-[12.5px]';
  return (
    <div
      role="toolbar"
      aria-label={`${n} cards selected`}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 p-1 bg-surface border border-border rounded-xl animate-pop max-w-[calc(100%-24px)]"
      style={{ boxShadow: 'var(--shadow-lg)' }}
    >
      <span className="px-2.5 text-[12.5px] font-semibold text-fg whitespace-nowrap">{n} cards</span>
      <div className="w-px h-5 bg-border mx-0.5" />
      <button className={`${item} ${picker ? 'nf-btn-active' : ''}`} onClick={(e) => setPicker(picker ? null : e.currentTarget)} title="Set the background of the selected cards">
        <ImageIcon size={15} /> <span className="hidden sm:inline">Scene</span>
      </button>
      {tagOpen ? (
        <form
          className="flex items-center gap-1 px-1"
          onSubmit={(e) => {
            e.preventDefault();
            addTag();
          }}
        >
          <input
            ref={tagRef}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setTagOpen(false)}
            onBlur={() => !tag.trim() && setTagOpen(false)}
            placeholder="tag name"
            className="nf-input !h-7 !py-0 !text-[12.5px] w-28"
            aria-label="Tag for the selected cards"
          />
          <button type="submit" className="nf-btn nf-btn-primary h-7 px-2 text-[12px]">
            Add
          </button>
        </form>
      ) : (
        <button className={item} onClick={() => setTagOpen(true)} title="Add a tag to the selected cards">
          <Tag size={15} /> <span className="hidden sm:inline">Tag</span>
        </button>
      )}
      {saveable.length > 0 && (
        <button
          className={`${item} ${allSaved ? 'nf-btn-active' : ''}`}
          onClick={toggleSave}
          aria-pressed={allSaved}
          title={
            allSaved
              ? 'Remove the save point from the selected cards'
              : `Make the selected cards save points${saveable.length < n ? ` (${n - saveable.length} can’t be: endings, portals and silent routers)` : ''}`
          }
        >
          <Bookmark size={15} fill={allSaved ? 'currentColor' : 'none'} /> <span className="hidden sm:inline">Save point</span>
        </button>
      )}
      <button className={item} onClick={() => tidyArc(rf)} title="Arrange the selected cards left → right">
        <Wand2 size={15} /> <span className="hidden sm:inline">Tidy</span>
      </button>
      <button
        className={`${item} hover:!text-danger hover:!bg-danger/10`}
        onClick={() => {
          useFlowStore.getState().deleteNodes(list);
          notify(`Deleted ${n} cards — Ctrl+Z to undo`, 'info');
        }}
        title="Delete the selected cards"
      >
        <Trash2 size={15} /> <span className="hidden sm:inline">Delete</span>
      </button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <button className="nf-icon-btn !w-8 !h-8" onClick={clear} title="Clear selection (Esc)" aria-label="Clear selection">
        <X size={15} />
      </button>
      {picker && (
        <ScenePicker
          anchor={picker}
          value={common}
          title={`Background for ${n} cards`}
          onPick={(v) => {
            useFlowStore.getState().setSceneFor(list, v);
            const name = v && v !== 'none' ? sceneName(v) : null;
            notify(v === 'none' ? `Cleared the background on ${n} cards` : v ? `“${name}” set on ${n} cards` : `${n} cards keep the current background`);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

const sceneName = (id: string) => useSceneStore.getState().scenes.find((s) => s.id === id)?.name ?? 'Scene';
