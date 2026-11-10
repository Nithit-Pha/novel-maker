import { useEffect, useRef } from 'react';
import type { NodeKind } from '../types';
import { NODE_ICONS, NODE_LABELS } from '../ui/icons';

const AFTER: NodeKind[] = ['dialog', 'scene', 'decision', 'chapter', 'condition', 'chance', 'loop', 'portal', 'end'];
/** Cards that can lead INTO another card (they have a plain "out" output). */
const BEFORE: NodeKind[] = ['dialog', 'scene', 'chapter'];

/** Menu shown where a wire was dropped on empty canvas: pick the card to create. */
export default function DropMenu({
  x,
  y,
  direction,
  onPick,
  onClose,
}: {
  x: number;
  y: number;
  /** 'after' = wire came from an output; 'before' = from an input. */
  direction: 'after' | 'before';
  onPick: (k: NodeKind) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    // let the mouseup that opened the menu finish first
    const t = window.setTimeout(() => window.addEventListener('mousedown', onDoc), 0);
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector('button')?.focus();
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  const kinds = direction === 'after' ? AFTER : BEFORE;
  // keep the menu on screen
  const left = Math.min(x, window.innerWidth - 220);
  const top = Math.min(y, window.innerHeight - (kinds.length * 34 + 48));
  return (
    <div ref={ref} role="menu" aria-label="Add a card here" className="nf-menu animate-pop fixed w-52" style={{ left, top }}>
      <div className="px-2.5 pt-1.5 pb-1 text-[10.5px] uppercase tracking-wider text-faint">
        {direction === 'after' ? 'Add next card' : 'Add a card before'}
      </div>
      {kinds.map((k) => {
        const Icon = NODE_ICONS[k];
        return (
          <button key={k} role="menuitem" className={`nf-menu-item nf-kind-${k}`} onClick={() => onPick(k)}>
            <Icon size={15} className="text-node" />
            {k === 'chapter' ? 'Chapter' : NODE_LABELS[k]}
          </button>
        );
      })}
    </div>
  );
}
