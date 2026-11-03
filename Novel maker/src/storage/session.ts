// The open project: loads it into the editor stores and routes autosave to it.

import { create } from 'zustand';
import { flushSave, requestAutosave, setPersistTarget, useFlowStore } from '../store';
import { useCharacterStore, readLegacyCharacters } from '../library/characterStore';
import { migrateProject, emptyArc, type Project } from '../project';
import { getBackend, type ProjectsBackend } from './projects';

interface SessionState {
  /** Name of the open project (its folder name), or null on the home page. */
  current: string | null;
  backend: ProjectsBackend | null;
}

export const useSession = create<SessionState>(() => ({ current: null, backend: null }));

let unsubscribeCharacters: (() => void) | null = null;

/** A brand-new, empty story with one arc and one chapter. */
export function blankProject(title: string): Project {
  const arc = emptyArc('Arc 1');
  arc.nodes = [
    {
      id: crypto.randomUUID(),
      type: 'chapter',
      position: { x: 0, y: 0 },
      data: { kind: 'chapter', name: 'Chapter 1' },
    },
  ];
  return { version: 3, meta: { title }, activeArcId: arc.id, arcs: [arc], variables: [] };
}

/** Open a project into the editor. Throws if it can't be read. */
export async function openProject(name: string): Promise<void> {
  const backend = await getBackend();
  if (useSession.getState().current) await closeProject();
  const rec = await backend.load(name);
  const project = rec.story ? migrateProject(rec.story) : blankProject(rec.name);

  // Load without triggering a save of what we just read.
  setPersistTarget(null);
  useFlowStore.getState().importJSON(JSON.stringify(project));
  useFlowStore.getState().setProjectTitle(rec.name);
  useCharacterStore.getState().replaceAll(rec.characters ?? []);

  const projectName = rec.name;
  setPersistTarget(async (p) => {
    const b = useSession.getState().backend ?? backend;
    await b.save(projectName, { ...p, meta: { ...p.meta, title: projectName } }, useCharacterStore.getState().characters);
  });
  unsubscribeCharacters?.();
  unsubscribeCharacters = useCharacterStore.subscribe((s, prev) => {
    if (s.characters !== prev.characters) requestAutosave();
  });
  useSession.setState({ current: projectName, backend });
}

/** Save and leave the open project. */
export async function closeProject(): Promise<boolean> {
  if (!useSession.getState().current) return true;
  const ok = await flushSave();
  unsubscribeCharacters?.();
  unsubscribeCharacters = null;
  setPersistTarget(null);
  useSession.setState({ current: null });
  return ok;
}

/** Keep the session pointing at a renamed project. */
export function renamedOpenProject(from: string, to: string) {
  if (useSession.getState().current !== from) return;
  useSession.setState({ current: to });
  useFlowStore.getState().setProjectTitle(to);
  const backend = useSession.getState().backend;
  if (!backend) return;
  setPersistTarget(async (p) => {
    await backend.save(to, { ...p, meta: { ...p.meta, title: to } }, useCharacterStore.getState().characters);
  });
}

const MIGRATED_KEY = 'novel-flow-migrated-to-projects';

/**
 * First run with projects: if the saves folder is empty and the browser still
 * holds the story from before (plus the old global character library), turn
 * it into a project called "My Story". Runs once.
 */
export async function migrateBrowserStory(backend: ProjectsBackend): Promise<string | null> {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return null;
    const raw = localStorage.getItem('novel-flow-v2') ?? localStorage.getItem('novel-flow-v1');
    const characters = readLegacyCharacters();
    localStorage.setItem(MIGRATED_KEY, new Date().toISOString());
    if (!raw && characters.length === 0) return null;
    if ((await backend.list()).length > 0 && !raw) return null;
    const story = raw ? migrateProject(JSON.parse(raw)) : blankProject('My Story');
    return await backend.create('My Story', story, characters);
  } catch {
    return null;
  }
}
