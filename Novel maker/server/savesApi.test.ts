import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createSavesHandler, safeProjectName } from './savesApi';

let root: string;
let server: http.Server;
let base: string;

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'nf-saves-'));
  const handler = createSavesHandler(root);
  server = http.createServer((req, res) => {
    req.url = (req.url || '').replace(/^\/api\/saves/, '') || '/';
    handler(req, res);
  });
  await new Promise<void>((r) => server.listen(0, r));
  const addr = server.address() as { port: number };
  base = `http://127.0.0.1:${addr.port}/api/saves`;
});
afterAll(async () => {
  server.close();
  await fs.rm(root, { recursive: true, force: true });
});

const api = async (method: string, p: string, body?: unknown) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json() };
};
const story = { version: 3, arcs: [{ id: 'a', nodes: [{ id: 'n', type: 'end' }, { id: 'm', type: 'dialog' }], edges: [] }], variables: [] };

describe('safeProjectName', () => {
  it('strips path tricks and reserved names', () => {
    expect(safeProjectName('../../etc/passwd')).toBe('etc passwd');
    expect(safeProjectName('  My: Story?  ')).toBe('My Story');
    expect(safeProjectName('_trash')).toBe('trash');
    expect(safeProjectName('CON')).toBe('CON story');
    expect(safeProjectName('Ends with dot.')).toBe('Ends with dot');
    expect(() => safeProjectName('   ')).toThrow();
  });
});

describe('saves API', () => {
  it('creates, lists, loads and saves a project in the folder layout', async () => {
    const c = await api('POST', '/', { name: 'The Lighthouse', story, characters: [{ id: 'c', name: 'Mira' }] });
    expect(c.status).toBe(201);
    expect(c.json.name).toBe('The Lighthouse');
    const onDisk = JSON.parse(await fs.readFile(path.join(root, 'The Lighthouse', 'story', 'story.json'), 'utf8'));
    expect(onDisk.version).toBe(3);
    expect(JSON.parse(await fs.readFile(path.join(root, 'The Lighthouse', 'characters', 'characters.json'), 'utf8'))[0].name).toBe('Mira');

    const l = await api('GET', '/');
    expect(l.json[0]).toMatchObject({ name: 'The Lighthouse', stats: { arcs: 1, nodes: 2, endings: 1 } });

    const s = await api('PUT', '/The%20Lighthouse', { story: { ...story, meta: { title: 'x' } }, characters: [] });
    expect(s.status).toBe(200);
    const g = await api('GET', '/The%20Lighthouse');
    expect(g.json.story.meta.title).toBe('x');
    expect(g.json.characters).toEqual([]);
  });

  it('never overwrites on create: picks "Name (2)"', async () => {
    const c = await api('POST', '/', { name: 'The Lighthouse', story });
    expect(c.json.name).toBe('The Lighthouse (2)');
  });

  it('renames, refuses collisions, and duplicates', async () => {
    expect((await api('POST', '/The%20Lighthouse%20(2)/rename', { to: 'The Lighthouse' })).status).toBe(409);
    expect((await api('POST', '/The%20Lighthouse%20(2)/rename', { to: 'Storm' })).json.name).toBe('Storm');
    expect((await api('POST', '/Storm/rename', { to: 'storm' })).json.name).toBe('storm');
    const d = await api('POST', '/storm/duplicate', {});
    expect(d.json.name).toBe('storm copy');
    const meta = JSON.parse(await fs.readFile(path.join(root, 'storm copy', 'project.json'), 'utf8'));
    expect(meta.title).toBe('storm copy');
  });

  it('delete moves the project to _trash and hides it from the list', async () => {
    expect((await api('DELETE', '/storm%20copy')).status).toBe(200);
    const names = (await api('GET', '/')).json.map((p: { name: string }) => p.name);
    expect(names).not.toContain('storm copy');
    const trash = await fs.readdir(path.join(root, '_trash'));
    expect(trash.some((t) => t.startsWith('storm copy'))).toBe(true);
    expect((await api('GET', '/storm%20copy')).status).toBe(404);
  });

  it('cannot escape the saves folder', async () => {
    const r = await api('GET', '/' + encodeURIComponent('../package.json'));
    expect(r.status).toBe(404);
  });
});
