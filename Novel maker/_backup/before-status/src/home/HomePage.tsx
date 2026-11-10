import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Copy,
  FileJson,
  FolderOpen,
  HardDrive,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import demo from '../../docs/examples/lighthouse-demo.json';
import { migrateProject } from '../project';
import { getBackend, type ProjectsBackend, type ProjectSummary } from '../storage/projects';
import { blankProject, migrateBrowserStory } from '../storage/session';
import { confirmDialog, notify, promptDialog } from '../ui/dialogs';
import Dropdown, { MenuItem } from '../ui/Dropdown';
import { goProject } from '../ui/router';
import { useTheme } from '../ui/theme';

/** Ask for a name and create an empty project. Returns its final name. */
export async function createProjectFlow(): Promise<string | null> {
  const name = await promptDialog({
    title: 'New project',
    message: 'Give your story a working title. You can rename it later.',
    placeholder: 'e.g. The Lighthouse Keeper',
    confirmLabel: 'Create',
  });
  if (!name?.trim()) return null;
  try {
    const backend = await getBackend();
    return await backend.create(name.trim(), blankProject(name.trim()), []);
  } catch (e) {
    notify(`Couldn’t create the project: ${(e as Error).message}`, 'error');
    return null;
  }
}

function timeAgo(iso?: string): string {
  if (!iso) return 'never edited';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'edited just now';
  const m = s / 60;
  if (m < 60) return `edited ${Math.round(m)} min ago`;
  const h = m / 60;
  if (h < 24) return `edited ${Math.round(h)} h ago`;
  const d = h / 24;
  if (d < 7) return `edited ${Math.round(d)} day${Math.round(d) === 1 ? '' : 's'} ago`;
  return `edited ${new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function download(name: string, content: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export default function HomePage() {
  const [backend, setBackend] = useState<ProjectsBackend | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggle);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async (b: ProjectsBackend) => {
    try {
      setProjects(await b.list());
    } catch (e) {
      notify(`Couldn’t read the projects: ${(e as Error).message}`, 'error');
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const b = await getBackend();
      setBackend(b);
      const migrated = await migrateBrowserStory(b);
      if (migrated) notify(`Your previous story is now the project “${migrated}”.`, 'info');
      await refresh(b);
    })();
  }, [refresh]);

  const open = (name: string) => goProject(name);

  const create = async () => {
    const name = await createProjectFlow();
    if (name) open(name);
  };

  const addExample = async () => {
    if (!backend) return;
    const name = await backend.create('The Lighthouse', migrateProject(demo), []);
    notify(`Added the example “${name}”.`);
    await refresh(backend);
  };

  const rename = async (p: ProjectSummary) => {
    if (!backend) return;
    const to = await promptDialog({ title: 'Rename project', defaultValue: p.name, confirmLabel: 'Rename' });
    if (!to || to.trim() === p.name) return;
    try {
      const n = await backend.rename(p.name, to.trim());
      notify(`Renamed to “${n}”.`);
      await refresh(backend);
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  };

  const duplicate = async (p: ProjectSummary) => {
    if (!backend) return;
    try {
      const n = await backend.duplicate(p.name);
      notify(`Created “${n}”.`);
      await refresh(backend);
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  };

  const remove = async (p: ProjectSummary) => {
    if (!backend) return;
    const ok = await confirmDialog({
      title: `Delete “${p.name}”?`,
      message:
        backend.kind === 'folder'
          ? 'The project folder is moved to saves/_trash, so you can still recover it there.'
          : 'This removes the project from this browser. It cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await backend.remove(p.name);
      notify(`Deleted “${p.name}”.`);
      await refresh(backend);
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  };

  const exportJson = async (p: ProjectSummary) => {
    if (!backend) return;
    try {
      const r = await backend.load(p.name);
      download(`${p.name}.json`, JSON.stringify(r.story, null, 2));
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  };

  const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !backend) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const raw = JSON.parse(String(ev.target?.result ?? ''));
        const project = migrateProject(raw);
        const base = (raw?.meta?.title && raw.meta.title !== 'My Story' ? raw.meta.title : file.name.replace(/\.json$/i, '')) || 'Imported story';
        const name = await backend.create(base, project, []);
        notify(`Imported as “${name}”.`);
        await refresh(backend);
      } catch {
        notify('That file is not a valid Novel Flow story (JSON).', 'error');
      }
    };
    reader.readAsText(file);
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (projects ?? []).filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [projects, query]);

  return (
    <div className="h-full overflow-y-auto nf-paper">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto h-14 px-4 sm:px-6 flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="w-7 h-7" />
          <span className="font-story text-xl text-fg">Novel Flow</span>
          <span className="hidden sm:inline text-faint mx-1">·</span>
          <span className="hidden sm:inline text-sm text-muted">Literary Studio</span>
          <div className="flex-1" />
          <button onClick={toggleTheme} className="nf-icon-btn" aria-label="Toggle light / dark theme" title="Light / dark">
            {theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <button onClick={() => fileRef.current?.click()} className="nf-btn" title="Import a story file (.json) as a new project">
            <Upload size={15} />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button onClick={() => void create()} className="nf-btn nf-btn-primary">
            <Plus size={16} />
            New project
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={importFile} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-wrap items-end gap-4 mb-8">
          <div className="flex-1 min-w-[240px]">
            <h1 className="font-story text-3xl sm:text-4xl text-fg mb-2">Your stories</h1>
            <p className="text-sm text-muted flex items-center gap-1.5">
              {backend?.kind === 'folder' ? <HardDrive size={14} /> : <FolderOpen size={14} />}
              {backend ? (
                backend.kind === 'folder' ? (
                  <>
                    Saved in <code className="text-fg-soft bg-sunken border border-border rounded px-1.5 py-0.5 text-[12px] break-all">{backend.location}</code>
                  </>
                ) : (
                  'Saved in this browser (start Novel Flow with the launcher to use the saves folder)'
                )
              ) : (
                'Loading…'
              )}
            </p>
          </div>
          {(projects?.length ?? 0) > 6 && (
            <label className="relative">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a story" className="nf-input pl-8 w-56" />
            </label>
          )}
        </div>

        {projects === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-surface border border-border animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="nf-panel max-w-xl mx-auto text-center px-8 py-12 animate-pop">
            <BookOpen size={32} className="mx-auto text-accent mb-4" strokeWidth={1.6} />
            <h2 className="font-story text-2xl text-fg mb-2">No stories yet</h2>
            <p className="text-sm text-muted leading-relaxed mb-6">
              Each project is a folder in <b>saves</b> with its story, characters and variables. Start a fresh one, or open a
              short example to see branching routes, locked choices and endings.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button className="nf-btn nf-btn-primary" onClick={() => void create()}>
                <Plus size={16} /> New project
              </button>
              <button className="nf-btn nf-btn-outline" onClick={() => void addExample()}>
                <Sparkles size={15} /> Open the example
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => void create()}
              className="group min-h-[168px] rounded-2xl border-2 border-dashed border-border-strong hover:border-accent text-muted hover:text-accent flex flex-col items-center justify-center gap-2 transition-colors"
            >
              <Plus size={26} strokeWidth={1.6} />
              <span className="font-story text-lg">New project</span>
            </button>
            {shown.map((p) => (
              <ProjectCard
                key={p.name}
                p={p}
                onOpen={() => open(p.name)}
                onRename={() => void rename(p)}
                onDuplicate={() => void duplicate(p)}
                onExport={() => void exportJson(p)}
                onDelete={() => void remove(p)}
              />
            ))}
          </div>
        )}

        {projects && projects.length > 0 && !projects.some((p) => p.name.startsWith('The Lighthouse')) && (
          <p className="mt-10 text-center text-sm text-muted">
            New to branching stories?{' '}
            <button className="text-accent hover:underline" onClick={() => void addExample()}>
              Add the example story
            </button>
          </p>
        )}
      </main>
    </div>
  );
}

function ProjectCard({
  p,
  onOpen,
  onRename,
  onDuplicate,
  onExport,
  onDelete,
}: {
  p: ProjectSummary;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const s = p.stats;
  return (
    <div
      className="group relative min-h-[168px] rounded-2xl bg-surface border border-border hover:border-border-strong transition-all hover:-translate-y-0.5 flex flex-col"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      <button onClick={onOpen} className="flex-1 text-left p-5 pr-12 rounded-2xl" aria-label={`Open ${p.name}`}>
        <div className="w-8 h-1 rounded-full bg-accent/70 mb-4" />
        <h3 className="font-story text-xl text-fg leading-snug mb-1 line-clamp-2 break-words">{p.name}</h3>
        <p className="text-xs text-muted">{timeAgo(p.updatedAt)}</p>
        {s && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            <Chip>{s.arcs} arc{s.arcs === 1 ? '' : 's'}</Chip>
            <Chip>{s.nodes} card{s.nodes === 1 ? '' : 's'}</Chip>
            {s.endings > 0 && <Chip>{s.endings} ending{s.endings === 1 ? '' : 's'}</Chip>}
          </div>
        )}
      </button>
      <Dropdown
        align="right"
        width="w-48"
        className="!absolute top-3 right-3"
        trigger={({ toggle, open }) => (
          <button
            onClick={toggle}
            className={`nf-icon-btn ${open ? 'nf-btn-active' : 'opacity-70 group-hover:opacity-100'}`}
            aria-label={`Actions for ${p.name}`}
          >
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
              <MenuItem icon={<BookOpen size={15} />} label="Open" onClick={run(onOpen)} />
              <MenuItem icon={<Pencil size={15} />} label="Rename…" onClick={run(onRename)} />
              <MenuItem icon={<Copy size={15} />} label="Duplicate" onClick={run(onDuplicate)} />
              <MenuItem icon={<FileJson size={15} />} label="Export .json" onClick={run(onExport)} />
              <div className="nf-menu-sep" />
              <MenuItem icon={<Trash2 size={15} />} label="Delete…" danger onClick={run(onDelete)} />
            </>
          );
        }}
      </Dropdown>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="text-[11.5px] text-fg-soft bg-sunken border border-border rounded-full px-2 py-0.5">{children}</span>;
}
