// Canvas overlays: left rail, zoom control, help sheet, empty-state guidance.

import { useState } from 'react';
import { Panel, useReactFlow, useViewport } from '@xyflow/react';
import {
  Captions,
  CircleHelp,
  LayoutGrid,
  Lock,
  Map as MapIcon,
  Maximize,
  Minus,
  Monitor,
  Moon,
  Plus,
  Settings,
  Sun,
  Unlock,
  Wand2,
  X,
} from 'lucide-react';
import { useView } from './viewPrefs';
import { tidyArc } from '../canvas/layout';
import { useTheme, type ThemeMode } from './theme';
import Dropdown from './Dropdown';
import { NODE_ICONS } from './icons';
import type { NodeKind } from '../types';

export function LeftRail({ onHome, onHelp }: { onHome: () => void; onHelp: () => void }) {
  const minimap = useView((s) => s.minimap);
  const grid = useView((s) => s.grid);
  const labels = useView((s) => s.labels);
  const set = useView((s) => s.set);
  const mode = useTheme((s) => s.mode);
  const setMode = useTheme((s) => s.setMode);

  const modes: { m: ThemeMode; icon: JSX.Element; label: string }[] = [
    { m: 'light', icon: <Sun size={14} />, label: 'Light' },
    { m: 'dark', icon: <Moon size={14} />, label: 'Dark' },
    { m: 'system', icon: <Monitor size={14} />, label: 'Auto' },
  ];

  return (
    <nav
      aria-label="Workspace"
      className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 flex-col gap-1 p-1.5 bg-surface border border-border rounded-2xl"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      <button className="nf-icon-btn !w-9 !h-9" onClick={onHome} title="All projects" aria-label="All projects">
        <LayoutGrid size={18} />
      </button>
      <button
        className={`nf-icon-btn !w-9 !h-9 ${minimap ? '!text-accent' : ''}`}
        onClick={() => set({ minimap: !minimap })}
        title={minimap ? 'Hide minimap' : 'Show minimap'}
        aria-pressed={minimap}
        aria-label="Minimap"
      >
        <MapIcon size={18} />
      </button>
      <Dropdown
        up={false}
        width="w-56"
        className="[&>[role=menu]]:left-full [&>[role=menu]]:top-0 [&>[role=menu]]:ml-2 [&>[role=menu]]:mt-0"
        trigger={({ toggle, open }) => (
          <button className={`nf-icon-btn !w-9 !h-9 ${open ? 'nf-btn-active' : ''}`} onClick={toggle} title="Settings" aria-label="Settings">
            <Settings size={18} />
          </button>
        )}
      >
        {() => (
          <div className="p-2 space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted mb-1.5">Theme</div>
              <div className="grid grid-cols-3 gap-1 bg-sunken border border-border rounded-lg p-0.5">
                {modes.map((x) => (
                  <button
                    key={x.m}
                    onClick={() => setMode(x.m)}
                    className={`flex items-center justify-center gap-1 text-xs rounded-md py-1.5 transition-colors ${
                      mode === x.m ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
                    }`}
                  >
                    {x.icon}
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between text-[13px] text-fg-soft cursor-pointer">
              Dot grid
              <input type="checkbox" checked={grid} onChange={(e) => set({ grid: e.target.checked })} className="accent-[rgb(var(--accent))]" />
            </label>
            <label className="flex items-center justify-between text-[13px] text-fg-soft cursor-pointer">
              Wire labels
              <input type="checkbox" checked={labels} onChange={(e) => set({ labels: e.target.checked })} className="accent-[rgb(var(--accent))]" />
            </label>
            <label className="flex items-center justify-between text-[13px] text-fg-soft cursor-pointer">
              Minimap
              <input type="checkbox" checked={minimap} onChange={(e) => set({ minimap: e.target.checked })} className="accent-[rgb(var(--accent))]" />
            </label>
          </div>
        )}
      </Dropdown>
      <button className="nf-icon-btn !w-9 !h-9" onClick={onHelp} title="Help & shortcuts (?)" aria-label="Help">
        <CircleHelp size={18} />
      </button>
    </nav>
  );
}

/** Bottom-right zoom control: − · % · + · fit · lock. Replaces React Flow's <Controls/>. */
export function ZoomControls() {
  const rf = useReactFlow();
  const { zoom } = useViewport();
  const locked = useView((s) => s.locked);
  const setLocked = useView((s) => s.setLocked);
  const labels = useView((s) => s.labels);
  const setView = useView((s) => s.set);
  return (
    <Panel position="bottom-right">
      <div className="flex items-center gap-0.5 p-1 bg-surface border border-border rounded-xl" style={{ boxShadow: 'var(--shadow-md)' }}>
        <button className="nf-icon-btn !w-7 !h-7" onClick={() => rf.zoomOut({ duration: 150 })} title="Zoom out" aria-label="Zoom out">
          <Minus size={15} />
        </button>
        <button
          className="text-xs font-medium text-fg-soft w-11 h-7 rounded-md hover:bg-surface-2 tabular-nums"
          onClick={() => rf.zoomTo(1, { duration: 200 })}
          title="Reset to 100%"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button className="nf-icon-btn !w-7 !h-7" onClick={() => rf.zoomIn({ duration: 150 })} title="Zoom in" aria-label="Zoom in">
          <Plus size={15} />
        </button>
        <div className="w-px h-5 bg-border mx-0.5" />
        <button
          className={`nf-icon-btn !w-7 !h-7 ${labels ? '!text-accent' : ''}`}
          onClick={() => setView({ labels: !labels })}
          title={labels ? 'Hide wire labels' : 'Show wire labels (choice text on wires)'}
          aria-pressed={labels}
          aria-label="Wire labels"
        >
          <Captions size={15} />
        </button>
        <button
          className="nf-icon-btn !w-7 !h-7"
          onClick={() => tidyArc(rf)}
          title="Tidy: arrange cards left → right (only the selected cards if 2+ are selected)"
          aria-label="Tidy"
        >
          <Wand2 size={15} />
        </button>
        <button className="nf-icon-btn !w-7 !h-7" onClick={() => rf.fitView({ padding: 0.2, duration: 300, maxZoom: 1 })} title="Fit to screen" aria-label="Fit to screen">
          <Maximize size={14} />
        </button>
        <button
          className={`nf-icon-btn !w-7 !h-7 ${locked ? '!text-accent' : ''}`}
          onClick={() => setLocked(!locked)}
          title={locked ? 'Unlock canvas (allow moving & connecting)' : 'Lock canvas (view only)'}
          aria-pressed={locked}
          aria-label="Lock canvas"
        >
          {locked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
      </div>
    </Panel>
  );
}

export function EmptyCanvas({ onAdd }: { onAdd: (k: NodeKind) => void }) {
  const items: { k: NodeKind; label: string }[] = [
    { k: 'chapter', label: 'Start with a chapter' },
    { k: 'scene', label: 'Set a scene' },
    { k: 'dialog', label: 'Write a line' },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="nf-panel pointer-events-auto max-w-md text-center px-8 py-7 animate-pop">
        <h2 className="font-story text-2xl text-fg mb-2">A blank page</h2>
        <p className="text-sm text-muted leading-relaxed mb-5">
          Every story starts somewhere. Add a first card, then drag from its right-hand dot to connect the next one.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {items.map(({ k, label }) => {
            const Icon = NODE_ICONS[k];
            return (
              <button key={k} className={`nf-btn nf-btn-outline nf-kind-${k}`} onClick={() => onAdd(k)}>
                <Icon size={15} className="text-node" />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const SHORTCUTS: [string, string][] = [
  ['Ctrl / ⌘ + S', 'Save now'],
  ['Ctrl / ⌘ + Z', 'Undo'],
  ['Ctrl / ⌘ + Shift + Z  ·  Ctrl + Y', 'Redo'],
  ['Ctrl / ⌘ + K', 'Search nodes & pins'],
  ['Delete / Backspace', 'Delete selected node or wire'],
  ['?', 'This help'],
  ['Run mode: Space or →', 'Next card'],
  ['Run mode: ← or Backspace', 'Back'],
  ['Run mode: Esc', 'Exit'],
];

export function HelpSheet({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'keys' | 'tips'>('keys');
  return (
    <div className="fixed inset-0 z-[2000] bg-black/30 flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Help" className="nf-panel animate-pop w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center px-5 pt-4 pb-2">
          <h2 className="font-story text-xl text-fg flex-1">Help</h2>
          <button className="nf-icon-btn" onClick={onClose} aria-label="Close help">
            <X size={17} />
          </button>
        </div>
        <div className="flex gap-1 px-5 border-b border-border">
          {(['keys', 'tips'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-[13px] px-2 py-2 border-b-2 -mb-px ${tab === t ? 'border-accent text-fg font-medium' : 'border-transparent text-muted hover:text-fg'}`}
            >
              {t === 'keys' ? 'Keyboard shortcuts' : 'Tips'}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto px-5 py-4">
          {tab === 'keys' ? (
            <table className="w-full text-[13px]">
              <tbody>
                {SHORTCUTS.map(([k, v]) => (
                  <tr key={k} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 text-fg-soft">{v}</td>
                    <td className="py-2 text-right">
                      <span className="nf-kbd">{k}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ul className="text-[13.5px] text-fg-soft leading-relaxed space-y-2 list-disc pl-5">
              <li>Drag from a card’s right-hand dot to another card’s left dot to connect them. Each output holds one wire; connecting it again replaces the old wire.</li>
              <li>Decision choices are numbered on their output dots. Hover a choice to highlight its wire.</li>
              <li>Use <b>Library → Variables</b> to remember choices, then lock choices (🔒) or route with a Condition node.</li>
              <li>Projects autosave a moment after every change. The dot next to Undo/Redo shows the save state.</li>
              <li>Pin important cards and press Ctrl+K to jump to them.</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
