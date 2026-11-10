// Project storage. Two backends with the same interface:
//  - folder:  the app's ./saves folder, via the local server API (/api/saves)
//  - browser: localStorage, used only when the API isn't available (static hosting)

import type { Character, SceneAsset } from '../library/libraryTypes';

export interface ProjectSummary {
  name: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  stats?: { arcs: number; nodes: number; endings: number };
}

export interface ProjectRecord {
  name: string;
  story: unknown;
  characters: Character[];
  scenes: SceneAsset[];
  updatedAt?: string;
}

export interface ProjectsBackend {
  kind: 'folder' | 'browser';
  /** Human-readable location, e.g. "D:\\…\\Novel maker\\saves". */
  location: string;
  list(): Promise<ProjectSummary[]>;
  load(name: string): Promise<ProjectRecord>;
  save(name: string, story: unknown, characters: Character[], scenes?: SceneAsset[]): Promise<void>;
  /** Creates a project; returns the final (unique) name. */
  create(name: string, story: unknown, characters: Character[], scenes?: SceneAsset[]): Promise<string>;
  rename(name: string, to: string): Promise<string>;
  duplicate(name: string): Promise<string>;
  remove(name: string): Promise<void>;
  /**
   * Scene images. The folder backend stores them as files next to the project;
   * the browser fallback has no files (scenes keep their image as a data URL).
   */
  sceneFiles: boolean;
  putSceneImage(name: string, file: string, dataUrl: string): Promise<void>;
  removeSceneImage(name: string, file: string): Promise<void>;
  sceneImageUrl(name: string, file: string): string;
}

// ---------------------------------------------------------------------------
// Folder backend (local server)
// ---------------------------------------------------------------------------

const API = '/api/saves';
const enc = encodeURIComponent;

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API + path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('the Novel Flow server is not reachable');
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) throw new Error((data as { error?: string })?.error || `HTTP ${res.status}`);
  return data as T;
}

function folderBackend(dir: string): ProjectsBackend {
  return {
    kind: 'folder',
    location: dir,
    list: () => call<ProjectSummary[]>('GET', '/'),
    load: async (name) => {
      const r = await call<{
        name: string;
        story: unknown;
        characters: Character[];
        scenes?: SceneAsset[];
        meta?: { updatedAt?: string };
      }>('GET', '/' + enc(name));
      return {
        name: r.name,
        story: r.story,
        characters: r.characters ?? [],
        scenes: Array.isArray(r.scenes) ? r.scenes : [],
        updatedAt: r.meta?.updatedAt,
      };
    },
    save: async (name, story, characters, scenes) => {
      await call('PUT', '/' + enc(name), { story, characters, scenes });
    },
    create: async (name, story, characters, scenes) =>
      (await call<{ name: string }>('POST', '/', { name, story, characters, scenes })).name,
    rename: async (name, to) => (await call<{ name: string }>('POST', `/${enc(name)}/rename`, { to })).name,
    duplicate: async (name) => (await call<{ name: string }>('POST', `/${enc(name)}/duplicate`, {})).name,
    remove: async (name) => {
      await call('DELETE', '/' + enc(name));
    },
    sceneFiles: true,
    putSceneImage: async (name, file, dataUrl) => {
      await call('PUT', `/${enc(name)}/scenes/${enc(file)}`, { data: dataUrl });
    },
    removeSceneImage: async (name, file) => {
      await call('DELETE', `/${enc(name)}/scenes/${enc(file)}`);
    },
    sceneImageUrl: (name, file) => `${API}/${enc(name)}/scenes/${enc(file)}`,
  };
}

// ---------------------------------------------------------------------------
// Browser fallback (localStorage)
// ---------------------------------------------------------------------------

const INDEX_KEY = 'novel-flow-projects-v1';
const projKey = (name: string) => `novel-flow-project:${name}`;

function readIndex(): ProjectSummary[] {
  try {
    const v = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function writeIndex(list: ProjectSummary[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(list));
}

export function cleanName(raw: string): string {
  const s = raw
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[._\s]+/, '')
    .replace(/[.\s]+$/, '')
    .slice(0, 80)
    .trim();
  if (!s) throw new Error('Please give the project a name.');
  return s;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function storyStats(story: any) {
  const arcs = Array.isArray(story?.arcs) ? story.arcs : [];
  let nodes = 0;
  let endings = 0;
  for (const a of arcs) {
    const ns = Array.isArray(a?.nodes) ? a.nodes : [];
    nodes += ns.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    endings += ns.filter((n: any) => n?.type === 'end').length;
  }
  return { arcs: arcs.length, nodes, endings };
}

function browserBackend(): ProjectsBackend {
  const unique = (base: string) => {
    const names = new Set(readIndex().map((p) => p.name.toLowerCase()));
    if (!names.has(base.toLowerCase())) return base;
    for (let i = 2; ; i++) if (!names.has(`${base} (${i})`.toLowerCase())) return `${base} (${i})`;
  };
  const put = (name: string, story: unknown, characters: Character[], createdAt?: string, scenes?: SceneAsset[]) => {
    const now = new Date().toISOString();
    if (scenes === undefined) {
      try {
        scenes = JSON.parse(localStorage.getItem(projKey(name)) || '{}').scenes;
      } catch {
        /* none */
      }
    }
    localStorage.setItem(projKey(name), JSON.stringify({ story, characters, scenes: scenes ?? [] }));
    const idx = readIndex().filter((p) => p.name !== name);
    idx.unshift({ name, title: name, createdAt: createdAt ?? now, updatedAt: now, stats: storyStats(story) });
    writeIndex(idx);
  };
  return {
    kind: 'browser',
    location: 'this browser',
    list: async () => readIndex().sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
    load: async (name) => {
      const raw = localStorage.getItem(projKey(name));
      if (!raw) throw new Error(`Project “${name}” was not found.`);
      const r = JSON.parse(raw);
      return {
        name,
        story: r.story,
        characters: r.characters ?? [],
        scenes: Array.isArray(r.scenes) ? r.scenes : [],
        updatedAt: readIndex().find((p) => p.name === name)?.updatedAt,
      };
    },
    save: async (name, story, characters, scenes) => {
      put(name, story, characters, readIndex().find((p) => p.name === name)?.createdAt, scenes);
    },
    create: async (name, story, characters, scenes) => {
      const n = unique(cleanName(name));
      put(n, story, characters, undefined, scenes ?? []);
      return n;
    },
    rename: async (name, to) => {
      const target = cleanName(to);
      if (target === name) return name;
      if (readIndex().some((p) => p.name.toLowerCase() === target.toLowerCase() && p.name !== name))
        throw new Error(`A project called “${target}” already exists.`);
      const raw = localStorage.getItem(projKey(name));
      if (raw == null) throw new Error('Project not found.');
      localStorage.setItem(projKey(target), raw);
      localStorage.removeItem(projKey(name));
      writeIndex(readIndex().map((p) => (p.name === name ? { ...p, name: target, title: target } : p)));
      return target;
    },
    duplicate: async (name) => {
      const raw = localStorage.getItem(projKey(name));
      if (raw == null) throw new Error('Project not found.');
      const r = JSON.parse(raw);
      const n = unique(`${name} copy`);
      put(n, r.story, r.characters ?? [], undefined, r.scenes ?? []);
      return n;
    },
    remove: async (name) => {
      localStorage.removeItem(projKey(name));
      writeIndex(readIndex().filter((p) => p.name !== name));
    },
    sceneFiles: false,
    putSceneImage: async () => {
      throw new Error('Scene files need the Novel Flow server.');
    },
    removeSceneImage: async () => {},
    sceneImageUrl: () => '',
  };
}

let cached: Promise<ProjectsBackend> | null = null;

/** Folder backend when the local server is running, else the browser fallback. */
export function getBackend(): Promise<ProjectsBackend> {
  if (!cached) {
    cached = (async () => {
      try {
        const r = await fetch(API + '/_info', { cache: 'no-store' });
        if (r.ok) {
          const info = await r.json();
          if (info?.ok) return folderBackend(String(info.dir));
        }
      } catch {
        /* no server */
      }
      return browserBackend();
    })();
  }
  return cached;
}
