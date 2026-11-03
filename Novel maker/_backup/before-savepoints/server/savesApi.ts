// Local "saves" folder API, served by the Vite dev/preview server (see savesPlugin.ts).
//
//   saves/
//     <Project>/
//       project.json                 { name, title, createdAt, updatedAt }
//       story/story.json             the story (Novel Flow project JSON, format v3)
//       characters/characters.json   the project's character library
//       scenes/scenes.json           the project's scene library (names, file names)
//       scenes/<id>-<rev>.png|jpg    scene images; replaced/removed ones go to scenes/_deleted/
//     _trash/                        deleted projects are moved here, never erased
//
// Same layout the in-app "Save to folder" feature already uses, so folders are
// interchangeable. Writes are atomic (temp file + rename).

import { promises as fs } from 'node:fs';
import path from 'node:path';

type Req = {
  method?: string;
  url?: string;
  on: (ev: string, cb: (chunk?: unknown) => void) => void;
};
type Res = {
  statusCode: number;
  setHeader: (k: string, v: string) => void;
  end: (body?: string | Uint8Array) => void;
};

const MAX_BODY = 80 * 1024 * 1024; // portraits are stored inline
/** Scene image file names: never contain a path, only these extensions. */
const IMAGE_FILE = /^[A-Za-z0-9-]{1,120}\.(png|jpg)$/;
const IMAGE_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg' };
const MAX_IMAGE = 30 * 1024 * 1024;
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Turn any user text into a safe folder name, or throw. */
export function safeProjectName(raw: unknown): string {
  let s = String(raw ?? '')
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[._\s]+/, '') // no hidden / reserved (_trash) names
    .replace(/[.\s]+$/, ''); // Windows: no trailing dot or space
  if (s.length > 80) s = s.slice(0, 80).trim();
  if (!s) throw new ApiError(400, 'Please give the project a name.');
  if (RESERVED.test(s)) s = `${s} story`;
  return s;
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(p: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(p, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

async function writeAtomic(file: string, data: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, data, 'utf8');
  await fs.rename(tmp, file);
}

interface Meta {
  name: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function storyStats(story: any): { arcs: number; nodes: number; endings: number } {
  const arcs = Array.isArray(story?.arcs) ? story.arcs : story?.nodes ? [story] : [];
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

export function createSavesStore(root: string) {
  const dir = (name: string) => path.join(root, name);
  const files = (name: string) => ({
    meta: path.join(dir(name), 'project.json'),
    story: path.join(dir(name), 'story', 'story.json'),
    characters: path.join(dir(name), 'characters', 'characters.json'),
    scenes: path.join(dir(name), 'scenes', 'scenes.json'),
    scenesDir: path.join(dir(name), 'scenes'),
  });

  function imageName(file: string): string {
    if (!IMAGE_FILE.test(file)) throw new ApiError(400, 'Invalid image name.');
    return file;
  }

  async function uniqueName(base: string): Promise<string> {
    if (!(await exists(dir(base)))) return base;
    for (let i = 2; i < 1000; i++) {
      const n = `${base} (${i})`;
      if (!(await exists(dir(n)))) return n;
    }
    throw new ApiError(409, 'Too many projects with that name.');
  }

  async function requireProject(name: string) {
    const safe = safeProjectName(name);
    if (!(await exists(dir(safe)))) throw new ApiError(404, `Project “${safe}” was not found.`);
    return safe;
  }

  return {
    root,

    async list() {
      await fs.mkdir(root, { recursive: true });
      const entries = await fs.readdir(root, { withFileTypes: true });
      const out = [];
      for (const e of entries) {
        if (!e.isDirectory() || e.name.startsWith('_') || e.name.startsWith('.')) continue;
        const f = files(e.name);
        const meta = await readJson<Meta>(f.meta, { name: e.name });
        const story = await readJson<unknown>(f.story, null);
        let updatedAt = meta.updatedAt;
        if (!updatedAt) {
          try {
            updatedAt = (await fs.stat(dir(e.name))).mtime.toISOString();
          } catch {
            /* ignore */
          }
        }
        out.push({
          name: e.name,
          title: meta.title || e.name,
          createdAt: meta.createdAt,
          updatedAt,
          stats: storyStats(story),
        });
      }
      out.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
      return out;
    },

    async load(name: string) {
      const safe = await requireProject(name);
      const f = files(safe);
      return {
        name: safe,
        meta: await readJson<Meta>(f.meta, { name: safe }),
        story: await readJson<unknown>(f.story, null),
        characters: await readJson<unknown[]>(f.characters, []),
        scenes: await readJson<unknown[]>(f.scenes, []),
      };
    },

    /** Create a new project; picks "Name (2)" if the name is taken. */
    async create(rawName: string, story: unknown, characters: unknown, scenes?: unknown) {
      await fs.mkdir(root, { recursive: true });
      const name = await uniqueName(safeProjectName(rawName));
      const now = new Date().toISOString();
      const f = files(name);
      await writeAtomic(f.story, JSON.stringify(story ?? null, null, 2));
      await writeAtomic(f.characters, JSON.stringify(characters ?? [], null, 2));
      if (scenes !== undefined) await writeAtomic(f.scenes, JSON.stringify(scenes ?? [], null, 2));
      await writeAtomic(f.meta, JSON.stringify({ name, title: name, createdAt: now, updatedAt: now }, null, 2));
      return { name, updatedAt: now };
    },

    async save(name: string, story: unknown, characters: unknown, scenes?: unknown) {
      const safe = safeProjectName(name);
      const f = files(safe);
      const meta = await readJson<Meta>(f.meta, { name: safe });
      const now = new Date().toISOString();
      await writeAtomic(f.story, JSON.stringify(story ?? null, null, 2));
      if (characters !== undefined) await writeAtomic(f.characters, JSON.stringify(characters ?? [], null, 2));
      if (scenes !== undefined) await writeAtomic(f.scenes, JSON.stringify(scenes ?? [], null, 2));
      await writeAtomic(
        f.meta,
        JSON.stringify({ ...meta, name: safe, title: meta.title || safe, createdAt: meta.createdAt || now, updatedAt: now }, null, 2)
      );
      return { name: safe, updatedAt: now };
    },

    async rename(name: string, to: string) {
      const from = await requireProject(name);
      const target = safeProjectName(to);
      if (target === from) return { name: from };
      const caseOnly = target.toLowerCase() === from.toLowerCase();
      if (!caseOnly && (await exists(dir(target)))) throw new ApiError(409, `A project called “${target}” already exists.`);
      if (caseOnly) {
        // Windows folders are case-insensitive: hop through a temp name.
        const tmp = dir(`${from}.renaming-${Date.now()}`);
        await fs.rename(dir(from), tmp);
        await fs.rename(tmp, dir(target));
      } else {
        await fs.rename(dir(from), dir(target));
      }
      const f = files(target);
      const meta = await readJson<Meta>(f.meta, { name: target });
      await writeAtomic(f.meta, JSON.stringify({ ...meta, name: target, title: target, updatedAt: new Date().toISOString() }, null, 2));
      return { name: target };
    },

    async duplicate(name: string, to?: string) {
      const from = await requireProject(name);
      const target = await uniqueName(safeProjectName(to || `${from} copy`));
      await fs.cp(dir(from), dir(target), { recursive: true });
      const f = files(target);
      const meta = await readJson<Meta>(f.meta, { name: target });
      const now = new Date().toISOString();
      await writeAtomic(f.meta, JSON.stringify({ ...meta, name: target, title: target, createdAt: now, updatedAt: now }, null, 2));
      return { name: target };
    },

    /** Write a scene image from a data URL (png or jpeg; the extension must match). */
    async putImage(name: string, file: string, dataUrl: unknown) {
      const safe = await requireProject(name);
      const img = imageName(file);
      const m = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl ?? ''));
      if (!m) throw new ApiError(400, 'Only .png and .jpeg images can be used as scenes.');
      if (IMAGE_TYPES[img.split('.').pop()!] !== m[1]) throw new ApiError(400, 'Image type does not match its file name.');
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > MAX_IMAGE) throw new ApiError(413, 'Image is too large.');
      const target = path.join(files(safe).scenesDir, img);
      await fs.mkdir(path.dirname(target), { recursive: true });
      const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(tmp, buf);
      await fs.rename(tmp, target);
      return { file: img, bytes: buf.length };
    },

    async readImage(name: string, file: string) {
      const safe = await requireProject(name);
      const img = imageName(file);
      try {
        const buf = await fs.readFile(path.join(files(safe).scenesDir, img));
        return { buf, type: IMAGE_TYPES[img.split('.').pop()!] };
      } catch {
        throw new ApiError(404, 'Image not found.');
      }
    },

    /** Move a scene image to scenes/_deleted/ (recoverable). Missing files are fine. */
    async removeImage(name: string, file: string) {
      const safe = await requireProject(name);
      const img = imageName(file);
      const from = path.join(files(safe).scenesDir, img);
      if (!(await exists(from))) return { file: img };
      const bin = path.join(files(safe).scenesDir, '_deleted');
      await fs.mkdir(bin, { recursive: true });
      await fs.rename(from, path.join(bin, img));
      return { file: img };
    },

    /** Move to saves/_trash/ (recoverable) instead of deleting. */
    async trash(name: string) {
      const from = await requireProject(name);
      const trash = path.join(root, '_trash');
      await fs.mkdir(trash, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      await fs.rename(dir(from), path.join(trash, `${from} — ${stamp}`));
      return { name: from };
    },
  };
}

function readBody(req: Req): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let size = 0;
    req.on('data', (c) => {
      const chunk = c as Uint8Array;
      size += chunk.length;
      if (size > MAX_BODY) reject(new ApiError(413, 'Project is too large to save.'));
      else chunks.push(chunk);
    });
    req.on('end', () => {
      if (size === 0) return resolve({});
      try {
        resolve(JSON.parse(new TextDecoder().decode(concat(chunks))));
      } catch {
        reject(new ApiError(400, 'Invalid JSON body.'));
      }
    });
    req.on('error', (e) => reject(e));
  });
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

function send(res: Res, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

/**
 * Connect-style middleware mounted at /api/saves.
 *   GET    /            → list          POST /         {name, story, characters} → create
 *   GET    /:name       → load          PUT  /:name    {story, characters}       → save
 *   POST   /:name/rename {to}           POST /:name/duplicate {to?}
 *   DELETE /:name       → move to _trash
 *   GET    /_info       → { dir }
 *   PUT    /:name/scenes/:file {data}   GET /:name/scenes/:file   DELETE /:name/scenes/:file
 */
export function createSavesHandler(root: string) {
  const store = createSavesStore(root);
  return async (req: Req, res: Res, next?: () => void) => {
    try {
      const url = new URL(req.url || '/', 'http://local');
      const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
      const m = (req.method || 'GET').toUpperCase();

      if (parts.length === 0) {
        if (m === 'GET') return send(res, 200, await store.list());
        if (m === 'POST') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const b = (await readBody(req)) as any;
          return send(res, 201, await store.create(b.name, b.story, b.characters, b.scenes));
        }
      }
      if (parts.length === 1 && parts[0] === '_info' && m === 'GET') {
        return send(res, 200, { ok: true, dir: path.resolve(root) });
      }
      if (parts.length === 1) {
        const name = parts[0];
        if (m === 'GET') return send(res, 200, await store.load(name));
        if (m === 'PUT') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const b = (await readBody(req)) as any;
          return send(res, 200, await store.save(name, b.story, b.characters, b.scenes));
        }
        if (m === 'DELETE') return send(res, 200, await store.trash(name));
      }
      if (parts.length === 3 && parts[1] === 'scenes') {
        const [name, , file] = parts;
        if (m === 'GET') {
          const { buf, type } = await store.readImage(name, file);
          res.statusCode = 200;
          res.setHeader('Content-Type', type);
          // File names change whenever an image is replaced, so they can be cached for good.
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return res.end(new Uint8Array(buf));
        }
        if (m === 'PUT') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const b = (await readBody(req)) as any;
          return send(res, 200, await store.putImage(name, file, b.data));
        }
        if (m === 'DELETE') return send(res, 200, await store.removeImage(name, file));
      }
      if (parts.length === 2 && m === 'POST') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const b = (await readBody(req)) as any;
        if (parts[1] === 'rename') return send(res, 200, await store.rename(parts[0], b.to));
        if (parts[1] === 'duplicate') return send(res, 201, await store.duplicate(parts[0], b.to));
      }
      if (next) return next();
      send(res, 404, { error: 'Not found' });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 500;
      send(res, status, { error: (e as Error).message || 'Server error' });
    }
  };
}
