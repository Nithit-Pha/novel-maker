// Popover for choosing a card's background: keep current · no scene · a Library
// scene · add a new one from a file. Drawn on top of the page (portal) so the
// canvas never clips it.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ImageOff, ImagePlus, Layers, Loader2 } from 'lucide-react';
import { ACCEPT, sceneSrc, useSceneStore } from './sceneStore';
import { NO_SCENE } from './libraryTypes';
import { notify } from '../ui/dialogs';

const W = 296;

export interface ScenePickerProps {
  anchor: HTMLElement;
  /** Current value: undefined = keep the current background, 'none' = no scene, else a scene id. */
  value: string | undefined;
  onPick: (sceneId: string | undefined) => void;
  onClose: () => void;
  /** Heading text, e.g. "Background for 3 cards". */
  title?: string;
}

export default function ScenePicker({ anchor, value, onPick, onClose, title = 'Background' }: ScenePickerProps) {
  const scenes = useSceneStore((s) => s.scenes);
  useSceneStore((s) => s.io);
  const addScene = useSceneStore((s) => s.addScene);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxH: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // Below the anchor if it fits, else above; always inside the window.
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const h = ref.current?.offsetHeight ?? 320;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - W - 8));
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    if (below >= Math.min(h, 360) || below >= above) setPos({ left, top: r.bottom + 6, maxH: Math.max(160, below) });
    else setPos({ left, top: Math.max(8, r.top - 6 - Math.min(h, above)), maxH: Math.max(160, above) });
  }, [anchor, scenes.length]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onClose);
    };
  }, [anchor, onClose]);

  const pick = (id: string | undefined) => {
    onPick(id);
    onClose();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const scene = await addScene(file);
      notify(`Added “${scene.name}” to the Scene Library`);
      pick(scene.id);
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const option = (active: boolean) =>
    `w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors ${
      active ? 'bg-accent/10 text-fg' : 'text-fg-soft hover:bg-surface-2 hover:text-fg'
    }`;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={title}
      className="nf-menu animate-pop fixed flex flex-col !p-0"
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, width: W, maxHeight: pos?.maxH ?? 420, zIndex: 70 }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="px-3 pt-2.5 pb-1.5 text-[11px] uppercase tracking-wider text-muted">{title}</div>
      <div className="px-1.5 space-y-0.5">
        <button className={option(!value)} onClick={() => pick(undefined)}>
          <span className="w-10 h-7 rounded-md border border-dashed border-border flex items-center justify-center text-muted flex-shrink-0">
            <Layers size={14} />
          </span>
          <span className="flex-1">
            Keep the current background
            <span className="block text-[11px] text-muted">Whatever the cards before this set</span>
          </span>
          {!value && <Check size={14} className="text-accent" />}
        </button>
        <button className={option(value === NO_SCENE)} onClick={() => pick(NO_SCENE)}>
          <span className="w-10 h-7 rounded-md border border-border bg-sunken flex items-center justify-center text-muted flex-shrink-0">
            <ImageOff size={14} />
          </span>
          <span className="flex-1">No background</span>
          {value === NO_SCENE && <Check size={14} className="text-accent" />}
        </button>
      </div>
      <div className="nf-menu-sep mx-2" />
      <div className="overflow-y-auto px-1.5 pb-1.5 min-h-0">
        {scenes.length === 0 ? (
          <p className="text-[12.5px] text-muted px-2 py-3 text-center">No scenes yet. Add an image to start.</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 p-0.5">
            {scenes.map((s) => {
              const src = sceneSrc(s);
              const on = value === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => pick(s.id)}
                  className={`group text-left rounded-lg border p-1 transition-colors ${
                    on ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-accent/60'
                  }`}
                  title={s.name}
                >
                  <span className="block aspect-video rounded-md overflow-hidden bg-sunken">
                    {src && <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />}
                  </span>
                  <span className="flex items-center gap-1 px-0.5 pt-1 text-[12px] text-fg-soft">
                    <span className="truncate flex-1">{s.name}</span>
                    {on && <Check size={13} className="text-accent flex-shrink-0" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="border-t border-border p-1.5">
        <button className={option(false)} onClick={() => fileRef.current?.click()} disabled={busy}>
          <span className="w-10 h-7 rounded-md flex items-center justify-center text-accent flex-shrink-0">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          </span>
          <span className="flex-1">{busy ? 'Adding…' : 'Add a scene from an image…'}</span>
          <span className="text-[11px] text-faint">.png .jpg</span>
        </button>
        <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={onFile} aria-label="Scene image file" />
      </div>
    </div>,
    document.body
  );
}
