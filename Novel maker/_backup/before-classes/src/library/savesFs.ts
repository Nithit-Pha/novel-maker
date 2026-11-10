// File System Access API helpers for saving projects into a folder on disk.
//
// Folder layout the user picks (the "saves folder"):
//   <saves folder>/
//     <Project Name>/
//       story/story.json            (nodes + edges + nextId)
//       characters/characters.json  (character library)
//       project.json                (name + updatedAt metadata)
//
// Works in Chromium browsers (Chrome, Edge). The chosen folder handle is
// persisted in IndexedDB so it reconnects on the next visit.

// Handles are typed loosely — the File System Access API isn't in every
// TypeScript lib.dom version, so we avoid hard type dependencies here.
/* eslint-disable @typescript-eslint/no-explicit-any */
type DirHandle = any;

export interface ProjectInfo {
  name: string;
  updatedAt?: string;
}

export interface ProjectData {
  storyJson: string | null;
  charactersJson: string | null;
}

export function fsSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

// ---------------------------------------------------------------------------
// IndexedDB: persist the directory handle so the folder reconnects next visit.
// ---------------------------------------------------------------------------
const IDB_NAME = 'novel-flow-fs';
const IDB_STORE = 'handles';
const HANDLE_KEY = 'savesDir';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  const result = await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------
async function queryGranted(handle: DirHandle): Promise<boolean> {
  if (!handle?.queryPermission) return true;
  const state = await handle.queryPermission({ mode: 'readwrite' });
  return state === 'granted';
}

async function requestGranted(handle: DirHandle): Promise<boolean> {
  if (await queryGranted(handle)) return true;
  if (!handle?.requestPermission) return true;
  const state = await handle.requestPermission({ mode: 'readwrite' });
  return state === 'granted';
}

// ---------------------------------------------------------------------------
// Folder connection
// ---------------------------------------------------------------------------

/** Prompt the user to pick a saves folder. Must be called from a user gesture. */
export async function pickSavesFolder(): Promise<DirHandle | null> {
  if (!fsSupported()) return null;
  const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
  await idbSet(HANDLE_KEY, handle);
  return handle;
}

/**
 * Reconnect the previously-chosen folder.
 * Returns { handle, needsPermission } — when needsPermission is true the
 * caller must call ensurePermission() from a click before reading/writing.
 */
export async function reconnectSavesFolder(): Promise<{
  handle: DirHandle | null;
  needsPermission: boolean;
}> {
  const handle = await idbGet<DirHandle>(HANDLE_KEY);
  if (!handle) return { handle: null, needsPermission: false };
  const granted = await queryGranted(handle);
  return { handle, needsPermission: !granted };
}

/** Request permission for a reconnected handle (call from a click). */
export async function ensurePermission(handle: DirHandle): Promise<boolean> {
  return requestGranted(handle);
}

export async function forgetSavesFolder(): Promise<void> {
  await idbDelete(HANDLE_KEY);
}

export function folderName(handle: DirHandle): string {
  return handle?.name ?? 'saves folder';
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------
async function writeFile(dir: DirHandle, filename: string, contents: string): Promise<void> {
  const fh = await dir.getFileHandle(filename, { create: true });
  const writable = await fh.createWritable();
  await writable.write(contents);
  await writable.close();
}

async function readFile(dir: DirHandle, filename: string): Promise<string | null> {
  try {
    const fh = await dir.getFileHandle(filename);
    const file = await fh.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Project operations
// ---------------------------------------------------------------------------

/** Sanitize a user-supplied name into a safe folder name. */
export function safeName(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || 'Untitled';
}

export async function listProjects(root: DirHandle): Promise<ProjectInfo[]> {
  const projects: ProjectInfo[] = [];
  for await (const entry of root.values()) {
    if (entry.kind !== 'directory') continue;
    let updatedAt: string | undefined;
    try {
      const metaRaw = await readFile(entry, 'project.json');
      if (metaRaw) updatedAt = JSON.parse(metaRaw).updatedAt;
    } catch {
      /* ignore malformed metadata */
    }
    projects.push({ name: entry.name, updatedAt });
  }
  projects.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  return projects;
}

export async function saveProject(
  root: DirHandle,
  name: string,
  storyJson: string,
  charactersJson: string
): Promise<void> {
  const folder = safeName(name);
  const proj = await root.getDirectoryHandle(folder, { create: true });

  const storyDir = await proj.getDirectoryHandle('story', { create: true });
  await writeFile(storyDir, 'story.json', storyJson);

  const charDir = await proj.getDirectoryHandle('characters', { create: true });
  await writeFile(charDir, 'characters.json', charactersJson);

  await writeFile(
    proj,
    'project.json',
    JSON.stringify({ name: folder, updatedAt: new Date().toISOString() }, null, 2)
  );
}

export async function loadProject(root: DirHandle, name: string): Promise<ProjectData> {
  const proj = await root.getDirectoryHandle(name);
  let storyJson: string | null = null;
  let charactersJson: string | null = null;
  try {
    const storyDir = await proj.getDirectoryHandle('story');
    storyJson = await readFile(storyDir, 'story.json');
  } catch {
    /* no story folder */
  }
  try {
    const charDir = await proj.getDirectoryHandle('characters');
    charactersJson = await readFile(charDir, 'characters.json');
  } catch {
    /* no characters folder */
  }
  return { storyJson, charactersJson };
}

export async function deleteProject(root: DirHandle, name: string): Promise<void> {
  await root.removeEntry(name, { recursive: true });
}
