import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  BookMarked,
  ChevronDown,
  Download,
  Eraser,
  FileJson,
  FilePlus2,
  FolderOutput,
  Globe,
  Keyboard,
  LayoutGrid,
  Library,
  ListChecks,
  Maximize,
  Moon,
  MoreHorizontal,
  Play,
  Plus,
  Redo2,
  Save,
  Search,
  Sun,
  Undo2,
  Upload,
  Wand2,
} from 'lucide-react';
import { flushSave, useFlowStore } from './store';
import type { NodeKind } from './types';
import TagFilter from './TagFilter';
import Dropdown, { MenuItem } from './ui/Dropdown';
import { NODE_ICONS, NODE_LABELS } from './ui/icons';
import { useTheme } from './ui/theme';
import { confirmDialog, notify } from './ui/dialogs';
import { useCharacterStore } from './library/characterStore';
import { buildStoryHtml } from './export/exportHtml';
import { useSession } from './storage/session';
import { useUi } from './ui/uiStore';
import { tidyArc } from './canvas/layout';

interface Props {
  onPlay: () => void;
  onToggleLibrary: () => void;
  libraryOpen: boolean;
  onOpenSaves: () => void;
  onOpenSearch: () => void;
  activeTags: string[];
  onChangeTags: (tags: string[]) => void;
  onHome: () => void;
  onNewProject: () => void;
  onShowHelp: () => void;
}

const QUICK: { kind: NodeKind; label: string }[] = [
  { kind: 'dialog', label: 'Dialogue' },
  { kind: 'scene', label: 'Scene' },
  { kind: 'decision', label: 'Decision' },
  { kind: 'chapter', label: 'Start' },
];
const MORE: NodeKind[] = ['loop', 'portal', 'condition', 'chance', 'end'];

function slug(s: string) {
  return s.trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').toLowerCase() || 'story';
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export default function Toolbar({
  onPlay,
  onToggleLibrary,
  libraryOpen,
  onOpenSaves,
  onOpenSearch,
  activeTags,
  onChangeTags,
  onHome,
  onNewProject,
  onShowHelp,
}: Props) {
  const addNode = useFlowStore((s) => s.addNode);
  const exportJSON = useFlowStore((s) => s.exportJSON);
  const importJSON = useFlowStore((s) => s.importJSON);
  const reset = useFlowStore((s) => s.reset);
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);
  const pastLen = useFlowStore((s) => s.past.length);
  const futureLen = useFlowStore((s) => s.future.length);
  const saveStatus = useFlowStore((s) => s.saveStatus);
  const saveError = useFlowStore((s) => s.saveError);
  const title = useFlowStore((s) => s.projectTitle);
  const backendKind = useSession((s) => s.backend?.kind);
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggle);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkOpen = useUi((s) => s.checkOpen);
  const openCheck = useUi((s) => s.openCheck);
  const closeCheck = useUi((s) => s.closeCheck);
  const problemCount = useUi((s) => s.issues.filter((i) => i.severity !== 'note').length);
  const hasErrors = useUi((s) => s.issues.some((i) => i.severity === 'error'));
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

  const handleTidy = () => tidyArc(reactFlow);

  const handleClear = async () => {
    const ok = await confirmDialog({
      title: 'Clear the whole canvas?',
      message: 'This removes every node in every arc of this project. It cannot be undone.',
      confirmLabel: 'Clear canvas',
      danger: true,
    });
    if (ok) reset();
  };

  const handleImport = () => fileInputRef.current?.click();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const ok = await confirmDialog({
        title: `Import “${file.name}”?`,
        message: 'This replaces the story in this project with the imported file.',
        confirmLabel: 'Import',
      });
      if (!ok) return;
      if (importJSON(String(ev.target?.result ?? ''))) notify('Story imported');
      else notify('That file is not a valid Novel Flow story (JSON).', 'error');
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    const ok = await flushSave();
    if (ok)
      notify(backendKind === 'folder' ? `Saved to saves/${useSession.getState().current ?? ''}` : 'Saved in this browser');
    else notify(useFlowStore.getState().saveError ?? 'Could not save.', 'error');
  };

  const handleExportJson = () => download(`${slug(title)}.json`, exportJSON(), 'application/json');

  const handleExportHtml = () => {
    const project = useFlowStore.getState().getProject();
    const html = buildStoryHtml({
      arcs: project.arcs,
      startArcId: project.activeArcId,
      characters: useCharacterStore.getState().characters,
      variables: project.variables,
      title: project.meta.title,
    });
    download(`${slug(title)}.html`, html, 'text/html');
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSearch();
        return;
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSave();
        return;
      }
      const target = e.target as HTMLElement;
      // don't hijack typing in inputs/textareas
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === '?' && !mod) {
        onShowHelp();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, onOpenSearch, onShowHelp, backendKind]);

  const divider = <div className="hidden md:block w-px h-6 bg-border mx-1 flex-shrink-0" />;
  const statusText = saveError ? 'Not saved' : saveStatus === 'unsaved' ? 'Saving…' : 'Saved';

  return (
    <header
      className="h-14 bg-surface border-b border-border flex items-center gap-1 px-2 sm:px-3 flex-shrink-0 relative z-30"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Brand + back to projects */}
      <button
        onClick={onHome}
        className="flex items-center gap-2 h-9 pl-1.5 pr-2 rounded-lg hover:bg-surface-2 transition-colors flex-shrink-0"
        title="All projects"
      >
        <img src="/favicon.svg" alt="" className="w-6 h-6" />
        <span className="font-story text-[19px] text-fg hidden lg:inline">Novel Flow</span>
      </button>
      {divider}

      {/* Create */}
      <div className="hidden xl:flex items-center gap-1">
        {QUICK.map((q) => {
          const Icon = NODE_ICONS[q.kind];
          return (
            <button
              key={q.kind}
              onClick={() => handleAdd(q.kind)}
              className={`nf-btn nf-btn-outline nf-kind-${q.kind}`}
              title={q.kind === 'chapter' ? 'Add a chapter start' : `Add a ${q.label.toLowerCase()} node`}
            >
              <Icon size={15} className="text-node" />
              <span className="hidden min-[1440px]:inline">{q.label}</span>
            </button>
          );
        })}
      </div>
      <Dropdown
        width="w-52"
        trigger={({ toggle, open }) => (
          <button onClick={toggle} className={`nf-btn nf-btn-outline ${open ? 'nf-btn-active' : ''}`} title="Add a node">
            <Plus size={15} />
            <span className="hidden sm:inline xl:hidden">Add</span>
            <span className="hidden min-[1440px]:inline">More</span>
            <ChevronDown size={14} className="opacity-60" />
          </button>
        )}
      >
        {(close) => (
          <>
            <div className="xl:hidden">
              {QUICK.map((q) => {
                const Icon = NODE_ICONS[q.kind];
                return (
                  <MenuItem
                    key={q.kind}
                    className={`nf-kind-${q.kind}`}
                    icon={<Icon size={15} className="text-node" />}
                    label={q.kind === 'chapter' ? 'Start (Chapter)' : q.label}
                    onClick={() => {
                      handleAdd(q.kind);
                      close();
                    }}
                  />
                );
              })}
              <div className="nf-menu-sep" />
            </div>
            {MORE.map((k) => {
              const Icon = NODE_ICONS[k];
              return (
                <MenuItem
                  key={k}
                  className={`nf-kind-${k}`}
                  icon={<Icon size={15} className="text-node" />}
                  label={NODE_LABELS[k]}
                  onClick={() => {
                    handleAdd(k);
                    close();
                  }}
                />
              );
            })}
          </>
        )}
      </Dropdown>
      {divider}

      {/* History + save state */}
      <button onClick={undo} disabled={pastLen === 0} className="nf-icon-btn hidden sm:inline-flex" title="Undo (Ctrl+Z)" aria-label="Undo">
        <Undo2 size={17} />
      </button>
      <button onClick={redo} disabled={futureLen === 0} className="nf-icon-btn hidden sm:inline-flex" title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
        <Redo2 size={17} />
      </button>
      <span
        className={`hidden lg:inline-flex items-center gap-1.5 text-xs ml-1 whitespace-nowrap ${saveError ? 'text-danger font-semibold' : 'text-muted'}`}
        title={saveError ?? (backendKind === 'folder' ? 'Autosaves to the saves folder a moment after each change.' : 'Autosaves in this browser.')}
        aria-live="polite"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${saveError ? 'bg-danger' : saveStatus === 'unsaved' ? 'bg-warning' : 'bg-success'}`}
        />
        {statusText}
      </span>

      <div className="flex-1" />

      {/* View + tools */}
      <button
        onClick={() => (checkOpen ? closeCheck() : openCheck())}
        className={`nf-btn hidden md:inline-flex relative ${checkOpen ? 'nf-btn-active' : ''}`}
        title={problemCount ? `Story check — ${problemCount} problem${problemCount === 1 ? '' : 's'}` : 'Story check — problems & routes'}
      >
        <ListChecks size={16} />
        {problemCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center text-surface ${
              hasErrors ? 'bg-danger' : 'bg-warning'
            }`}
          >
            {problemCount > 99 ? '99+' : problemCount}
          </span>
        )}
      </button>
      <button onClick={onOpenSearch} className="nf-btn hidden md:inline-flex" title="Search nodes (Ctrl+K)">
        <Search size={16} />
      </button>
      <div className="hidden md:block">
        <TagFilter activeTags={activeTags} onChange={onChangeTags} />
      </div>
      <button onClick={onToggleLibrary} className={`nf-btn hidden md:inline-flex ${libraryOpen ? 'nf-btn-active' : ''}`} title="Characters & variables">
        <Library size={16} />
      </button>
      <button
        onClick={toggleTheme}
        className="nf-icon-btn"
        title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        aria-label="Toggle light / dark theme"
      >
        {theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
      </button>
      <button onClick={() => reactFlow.fitView({ padding: 0.2, duration: 300, maxZoom: 1 })} className="nf-btn hidden lg:inline-flex" title="Fit the story on screen">
        <Maximize size={15} />
        <span className="hidden min-[1680px]:inline">Fit</span>
      </button>
      {divider}

      {/* File */}
      <Dropdown
        align="right"
        width="w-56"
        className="hidden md:block"
        trigger={({ toggle, open }) => (
          <button onClick={toggle} className={`nf-btn ${open ? 'nf-btn-active' : ''}`} title="Export">
            <Download size={15} />
            <span className="hidden min-[1440px]:inline">Export</span>
            <ChevronDown size={13} className="opacity-60" />
          </button>
        )}
      >
        {(close) => (
          <>
            <MenuItem icon={<FileJson size={15} />} label="Story file (.json)" onClick={() => { handleExportJson(); close(); }} />
            <MenuItem icon={<Globe size={15} />} label="Playable story (.html)" onClick={() => { handleExportHtml(); close(); }} />
          </>
        )}
      </Dropdown>
      <button onClick={handleImport} className="nf-btn hidden md:inline-flex" title="Import a story file (.json) into this project">
        <Upload size={15} />
        <span className="hidden min-[1440px]:inline">Import</span>
      </button>
      <button
        onClick={() => void handleSave()}
        className="nf-btn nf-btn-primary relative"
        title={`Save now (Ctrl+S) — ${saveError ?? statusText}`}
      >
        <span
          className={`lg:hidden absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-surface ${
            saveError ? 'bg-danger' : saveStatus === 'unsaved' ? 'bg-warning' : 'hidden'
          }`}
        />
        <Save size={15} />
        <span className="hidden sm:inline">Save</span>
      </button>
      <button onClick={onPlay} className="nf-btn nf-btn-outline nf-kind-chapter" title="Play through the story">
        <Play size={15} className="text-node" fill="currentColor" />
        <span className="hidden sm:inline">Run</span>
      </button>

      <Dropdown
        align="right"
        width="w-64"
        trigger={({ toggle, open }) => (
          <button onClick={toggle} className={`nf-icon-btn ${open ? 'nf-btn-active' : ''}`} title="More" aria-label="More actions">
            <MoreHorizontal size={18} />
          </button>
        )}
      >
        {(close) => {
          const run = (fn: () => void) => () => {
            close();
            fn();
          };
          return (
            <>
              <MenuItem icon={<LayoutGrid size={15} />} label="All projects" onClick={run(onHome)} />
              <MenuItem icon={<FilePlus2 size={15} />} label="New project…" onClick={run(onNewProject)} />
              <div className="md:hidden">
                <div className="nf-menu-sep" />
                <MenuItem icon={<Search size={15} />} label="Search" hint="Ctrl K" onClick={run(onOpenSearch)} />
                <MenuItem icon={<ListChecks size={15} />} label={`Story check${problemCount ? ` (${problemCount})` : ''}`} onClick={run(() => openCheck())} />
                <MenuItem icon={<Library size={15} />} label="Library" onClick={run(onToggleLibrary)} />
                <MenuItem icon={<Maximize size={15} />} label="Fit to screen" onClick={run(() => reactFlow.fitView({ padding: 0.2, duration: 300, maxZoom: 1 }))} />
                <MenuItem icon={<FileJson size={15} />} label="Export story (.json)" onClick={run(handleExportJson)} />
                <MenuItem icon={<Globe size={15} />} label="Export playable (.html)" onClick={run(handleExportHtml)} />
                <MenuItem icon={<Upload size={15} />} label="Import story (.json)" onClick={run(handleImport)} />
                <MenuItem icon={<Undo2 size={15} />} label="Undo" onClick={run(undo)} />
                <MenuItem icon={<Redo2 size={15} />} label="Redo" onClick={run(redo)} />
              </div>
              <div className="nf-menu-sep" />
              <MenuItem icon={<Wand2 size={15} />} label="Tidy (auto-layout)" onClick={run(handleTidy)} />
              <MenuItem icon={<FolderOutput size={15} />} label="Save a copy to another folder…" onClick={run(onOpenSaves)} />
              <MenuItem icon={<Keyboard size={15} />} label="Keyboard shortcuts" hint="?" onClick={run(onShowHelp)} />
              <MenuItem icon={<BookMarked size={15} />} label="Help & tips" onClick={run(onShowHelp)} />
              <div className="nf-menu-sep" />
              <MenuItem icon={<Eraser size={15} />} label="Clear canvas…" danger onClick={run(() => void handleClear())} />
            </>
          );
        }}
      </Dropdown>
      <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFile} className="hidden" />
    </header>
  );
}
