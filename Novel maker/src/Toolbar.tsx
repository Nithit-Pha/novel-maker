import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useFlowStore } from './store';
import type { NodeKind } from './types';

interface Props {
  onPlay: () => void;
  onToggleLibrary: () => void;
  libraryOpen: boolean;
  onOpenSaves: () => void;
}

export default function Toolbar({ onPlay, onToggleLibrary, libraryOpen, onOpenSaves }: Props) {
  const addNode = useFlowStore((s) => s.addNode);
  const exportJSON = useFlowStore((s) => s.exportJSON);
  const importJSON = useFlowStore((s) => s.importJSON);
  const saveLocal = useFlowStore((s) => s.saveLocal);
  const reset = useFlowStore((s) => s.reset);
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);
  const pastLen = useFlowStore((s) => s.past.length);
  const futureLen = useFlowStore((s) => s.future.length);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactFlow = useReactFlow();

  const handleAdd = (kind: NodeKind) => {
    const { x, y, zoom } = reactFlow.getViewport();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const centerX = (w / 2 - x) / zoom;
    const centerY = (h / 2 - y) / zoom;
    const jitter = () => (Math.random() - 0.5) * 60;
    addNode(kind, { x: centerX - 130 + jitter(), y: centerY - 80 + jitter() });
  };

  const handleExport = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `novel-flow-${Date.now()}.json`;
    a.click();
  };

  const handleImport = () => fileInputRef.current?.click();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const ok = importJSON(String(ev.target?.result ?? ''));
      if (!ok) alert('Invalid JSON file');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = () => {
    saveLocal();
    const btn = document.activeElement as HTMLElement | null;
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Saved ✓';
      setTimeout(() => { if (btn) btn.textContent = orig; }, 1200);
    }
  };

  const handleReset = () => {
    if (confirm('Clear the entire canvas? (You can still Undo this.)')) reset();
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // don't hijack typing in inputs/textareas
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveLocal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, saveLocal]);

  const btn = 'bg-ink-700 hover:bg-ink-600 text-white border border-ink-600 px-3 py-1.5 rounded text-sm transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-ink-700';
  const btnGhost = 'hover:bg-ink-700 text-gray-300 hover:text-white px-3 py-1.5 rounded text-sm transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent';
  const btnPrimary = 'bg-accent hover:bg-accent/90 text-white px-3 py-1.5 rounded text-sm transition';
  const btnPlay = 'bg-accent-start hover:bg-green-500 text-ink-900 font-semibold px-4 py-1.5 rounded text-sm transition';

  return (
    <div className="h-14 bg-ink-800 border-b border-ink-600 flex items-center px-4 gap-2 flex-shrink-0">
      <h1 className="text-accent font-semibold mr-4">Novel Flow</h1>
      <button onClick={() => handleAdd('dialog')} className={btn}>+ Dialog</button>
      <button onClick={() => handleAdd('decision')} className={btn}>+ Decision</button>
      <button onClick={() => handleAdd('start')} className={btn}>+ Start</button>
      <div className="w-px h-6 bg-ink-600 mx-1" />
      <button
        onClick={undo}
        disabled={pastLen === 0}
        className={btnGhost}
        title="Undo (Ctrl+Z)"
      >
        ↶ Undo
      </button>
      <button
        onClick={redo}
        disabled={futureLen === 0}
        className={btnGhost}
        title="Redo (Ctrl+Shift+Z)"
      >
        ↷ Redo
      </button>
      <div className="flex-1" />
      <button
        onClick={onToggleLibrary}
        className={libraryOpen ? btnPrimary : btn}
        title="Open the character & scene library"
      >
        📚 Library
      </button>
      <button onClick={onPlay} className={btnPlay} title="Play through the story">▶ Run</button>
      <div className="w-px h-6 bg-ink-600 mx-1" />
      <button onClick={onOpenSaves} className={btnGhost} title="Save / load projects in a folder">💾 Saves</button>
      <button onClick={handleImport} className={btnGhost}>Import</button>
      <button onClick={handleExport} className={btnGhost}>Export</button>
      <button onClick={handleReset} className={btnGhost}>Clear</button>
      <button onClick={handleSave} className={btnPrimary} title="Save (Ctrl+S)">Save</button>
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFile} className="hidden" />
    </div>
  );
}
