// Popover for a card's Status HUD (the slot beside the text in Run mode):
// keep what's showing · show (every group or chosen ones) · hide.
// Drawn on top of the page (portal) so the canvas never clips it.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Backpack, Check, EyeOff, Layers } from 'lucide-react';
import type { HudSetting } from '../types';
import { useFlowStore } from '../store';
import { statusGroupNames } from '../engine';

const W = 280;

export interface HudPickerProps {
  anchor: HTMLElement;
  /** Current value: undefined = keep; '__mixed' when several cards differ. */
  value: HudSetting | undefined | '__mixed';
  onPick: (hud: HudSetting | undefined) => void;
  onClose: () => void;
  title?: string;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** "Items, Power" / "every group" — for strips and tooltips. */
export function describeHud(hud: HudSetting | undefined): string {
  if (!hud) return 'keep';
  if (hud.mode === 'hide') return 'hidden';
  return hud.groups.length ? hud.groups.join(', ') : 'every group';
}

export default function HudPicker({ anchor, value, onPick, onClose, title = 'Status slot from this card on' }: HudPickerProps) {
  const variables = useFlowStore((s) => s.variables);
  const groups = statusGroupNames(variables);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxH: number } | null>(null);
  const current = value === '__mixed' ? undefined : value;
  const showing = current?.mode === 'show' ? current : null;

  // Below the anchor if it fits, else above; always inside the window.
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const h = ref.current?.offsetHeight ?? 300;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - W - 8));
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    if (below >= Math.min(h, 340) || below >= above) setPos({ left, top: r.bottom + 6, maxH: Math.max(160, below) });
    else setPos({ left, top: Math.max(8, r.top - 6 - Math.min(h, above)), maxH: Math.max(160, above) });
  }, [anchor, groups.length]);

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

  const option = (active: boolean) =>
    `w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors ${
      active ? 'bg-accent/10 text-fg' : 'text-fg-soft hover:bg-surface-2 hover:text-fg'
    }`;
  const iconBox = 'w-8 h-7 rounded-md border border-border flex items-center justify-center text-muted flex-shrink-0';

  // Toggle one group while "Show" is on. Removing the last chosen group = every group.
  const toggleGroup = (g: string) => {
    const chosen = showing?.groups ?? [];
    const on = chosen.some((x) => same(x, g));
    onPick({ mode: 'show', groups: on ? chosen.filter((x) => !same(x, g)) : [...chosen, g] });
  };

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={title}
      className="nf-menu animate-pop fixed flex flex-col !p-0"
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, width: W, maxHeight: pos?.maxH ?? 400, zIndex: 70 }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="px-3 pt-2.5 pb-1.5 text-[11px] uppercase tracking-wider text-muted">{title}</div>
      <div className="px-1.5 pb-1.5 space-y-0.5 overflow-y-auto min-h-0">
        <button
          className={option(!current && value !== '__mixed')}
          onClick={() => {
            onPick(undefined);
            onClose();
          }}
        >
          <span className={`${iconBox} border-dashed`}>
            <Layers size={14} />
          </span>
          <span className="flex-1">
            Keep as it is
            <span className="block text-[11px] text-muted">Whatever the cards before this set</span>
          </span>
          {!current && value !== '__mixed' && <Check size={14} className="text-accent" />}
        </button>
        <button className={option(!!showing)} onClick={() => onPick({ mode: 'show', groups: showing?.groups ?? [] })}>
          <span className={`${iconBox} text-accent`}>
            <Backpack size={14} />
          </span>
          <span className="flex-1">
            Show the Status slot
            <span className="block text-[11px] text-muted">{showing ? `Showing ${describeHud(showing)}` : 'Live items, abilities and power'}</span>
          </span>
          {showing && <Check size={14} className="text-accent" />}
        </button>
        {showing && (
          <div className="pl-[46px] pr-2 pb-1.5 pt-0.5">
            {groups.length === 0 ? (
              <p className="text-[11.5px] text-warning leading-snug">
                No variable is shown to readers yet. In Library → Variables, turn on “Show to reader”.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1">
                  {groups.map((g) => {
                    const on = showing.groups.some((x) => same(x, g));
                    return (
                      <button
                        key={g}
                        onClick={() => toggleGroup(g)}
                        aria-pressed={on}
                        className={`px-2 h-6 rounded-full border text-[12px] transition-colors ${
                          on ? 'bg-accent text-on-accent border-accent' : 'border-border text-fg-soft hover:border-accent/60'
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted mt-1.5">
                  {showing.groups.length ? 'Only the groups picked.' : 'None picked = every group.'}
                </p>
              </>
            )}
          </div>
        )}
        <button
          className={option(current?.mode === 'hide')}
          onClick={() => {
            onPick({ mode: 'hide' });
            onClose();
          }}
        >
          <span className={iconBox}>
            <EyeOff size={14} />
          </span>
          <span className="flex-1">Hide the Status slot</span>
          {current?.mode === 'hide' && <Check size={14} className="text-accent" />}
        </button>
      </div>
    </div>,
    document.body
  );
}
