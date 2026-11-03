// The open project's Scene Library: background images for Run mode and export.
// Folder projects keep each image as a file in saves/<Project>/scenes/; the
// browser-only fallback keeps it inline as a data URL. Saved with the project
// (see storage/session.ts).

import { create } from 'zustand';
import { newId, type SceneAsset } from './libraryTypes';

/** Images larger than this (either side, in px) are scaled down on upload. */
export const MAX_SIDE = 2560;
/** Largest file accepted from the picker. */
export const MAX_UPLOAD = 25 * 1024 * 1024;
export const ACCEPT = '.png,.jpg,.jpeg,image/png,image/jpeg';

/** Where scene images are written; set by the session when a project opens. */
export interface SceneIo {
  project: string;
  files: boolean;
  put: (project: string, file: string, dataUrl: string) => Promise<void>;
  remove: (project: string, file: string) => Promise<void>;
  url: (project: string, file: string) => string;
}

interface SceneState {
  scenes: SceneAsset[];
  io: SceneIo | null;
  setIo: (io: SceneIo | null) => void;
  replaceAll: (scenes: SceneAsset[]) => void;
  /** Add a scene from an image file. Throws a readable Error for bad files. */
  addScene: (file: File, name?: string) => Promise<SceneAsset>;
  /** Swap a scene's image, keeping its id (so every card using it updates). */
  replaceImage: (id: string, file: File) => Promise<void>;
  renameScene: (id: string, name: string) => void;
  deleteScene: (id: string) => void;
  /** Add scenes from an imported JSON file (images as data URLs). Same id → replaced. */
  importScenes: (list: SceneAsset[]) => Promise<number>;
}

export interface PreparedImage {
  dataUrl: string;
  ext: 'png' | 'jpg';
  width: number;
  height: number;
}

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('Could not read the file.'));
    r.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file is not a readable image.'));
    img.src = src;
  });
}

/** Image type from the file's MIME type or, failing that, its extension. */
export function imageKind(file: { name: string; type: string }): 'png' | 'jpg' | null {
  const t = file.type.toLowerCase();
  if (t === 'image/png') return 'png';
  if (t === 'image/jpeg' || t === 'image/jpg' || t === 'image/pjpeg') return 'jpg';
  if (t) return null;
  const ext = file.name.toLowerCase().split('.').pop();
  return ext === 'png' ? 'png' : ext === 'jpg' || ext === 'jpeg' ? 'jpg' : null;
}

/** Check a picked file and scale it down if it's huge. PNG stays PNG; JPEG stays JPEG. */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const ext = imageKind(file);
  if (!ext) throw new Error('Scenes can be .png, .jpg or .jpeg images.');
  if (file.size > MAX_UPLOAD) throw new Error(`That image is ${(file.size / 1048576).toFixed(0)} MB — the limit is 25 MB.`);
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  let dataUrl = await readDataUrl(file);
  // Some systems report odd MIME types; normalise the prefix so the server accepts it.
  dataUrl = dataUrl.replace(/^data:[^;,]*;base64,/, `data:${mime};base64,`);
  const img = await loadImage(dataUrl);
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  if (!width || !height) throw new Error('That file is not a readable image.');
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  if (scale < 1) {
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not resize the image.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    dataUrl = ext === 'png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.9);
  }
  return { dataUrl, ext, width, height };
}

/** A friendly default name from a file name: "old_harbor-night.jpg" → "Old harbor night". */
export function nameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Scene';
}

const fileName = (id: string, ext: 'png' | 'jpg') => `${id}-${Date.now().toString(36)}.${ext}`;
const extOf = (dataUrl: string): 'png' | 'jpg' | null =>
  dataUrl.startsWith('data:image/png;') ? 'png' : dataUrl.startsWith('data:image/jpeg;') ? 'jpg' : null;

export const useSceneStore = create<SceneState>((set, get) => {
  /** Store the image (file or inline) and return the fields to put on the scene. */
  const store = async (id: string, img: { dataUrl: string; ext: 'png' | 'jpg' }) => {
    const io = get().io;
    if (io?.files) {
      const file = fileName(id, img.ext);
      await io.put(io.project, file, img.dataUrl);
      return { file, data: undefined };
    }
    return { file: undefined, data: img.dataUrl };
  };
  const discard = (scene: SceneAsset | undefined) => {
    const io = get().io;
    if (io?.files && scene?.file) void io.remove(io.project, scene.file).catch(() => {});
  };

  return {
    scenes: [],
    io: null,
    setIo: (io) => set({ io }),
    replaceAll: (scenes) => set({ scenes: Array.isArray(scenes) ? scenes : [] }),

    addScene: async (file, name) => {
      const img = await prepareImage(file);
      const id = newId();
      const now = new Date().toISOString();
      const scene: SceneAsset = {
        id,
        name: (name ?? '').trim() || nameFromFile(file.name),
        ...(await store(id, img)),
        width: img.width,
        height: img.height,
        createdAt: now,
        updatedAt: now,
      };
      set({ scenes: [...get().scenes, scene] });
      return scene;
    },

    replaceImage: async (id, file) => {
      const old = get().scenes.find((s) => s.id === id);
      if (!old) return;
      const img = await prepareImage(file);
      const stored = await store(id, img);
      const now = new Date().toISOString();
      set({
        scenes: get().scenes.map((s) => (s.id === id ? { ...s, ...stored, width: img.width, height: img.height, updatedAt: now } : s)),
      });
      discard(old);
    },

    renameScene: (id, name) => {
      const n = name.trim();
      if (!n) return;
      set({ scenes: get().scenes.map((s) => (s.id === id ? { ...s, name: n, updatedAt: new Date().toISOString() } : s)) });
    },

    deleteScene: (id) => {
      const old = get().scenes.find((s) => s.id === id);
      set({ scenes: get().scenes.filter((s) => s.id !== id) });
      discard(old);
    },

    importScenes: async (list) => {
      let count = 0;
      for (const raw of Array.isArray(list) ? list : []) {
        if (!raw || typeof raw !== 'object' || typeof raw.data !== 'string') continue;
        const ext = extOf(raw.data);
        if (!ext) continue;
        const id = String(raw.id || newId());
        const now = new Date().toISOString();
        const stored = await store(id, { dataUrl: raw.data, ext });
        const scene: SceneAsset = {
          id,
          name: String(raw.name || 'Scene'),
          ...stored,
          width: Number(raw.width) || undefined,
          height: Number(raw.height) || undefined,
          createdAt: raw.createdAt || now,
          updatedAt: now,
        };
        const old = get().scenes.find((s) => s.id === id);
        set({ scenes: old ? get().scenes.map((s) => (s.id === id ? scene : s)) : [...get().scenes, scene] });
        discard(old);
        count++;
      }
      return count;
    },
  };
});

/** The <img src> for a scene ('' if it has no image). */
export function sceneSrc(scene: SceneAsset | undefined | null): string {
  if (!scene) return '';
  if (scene.data) return scene.data;
  const io = useSceneStore.getState().io;
  return scene.file && io?.files ? io.url(io.project, scene.file) : '';
}

/** React hook: the scene with this id (or undefined) and its image src. */
export function useScene(id: string | undefined | null): { scene: SceneAsset | undefined; src: string } {
  const scene = useSceneStore((s) => (id ? s.scenes.find((x) => x.id === id) : undefined));
  useSceneStore((s) => s.io); // re-render when the project (and so the image URL) changes
  return { scene, src: sceneSrc(scene) };
}

/** A scene's image as a data URL (for exports, which must work offline). */
export async function sceneDataUrl(scene: SceneAsset): Promise<string> {
  if (scene.data) return scene.data;
  const src = sceneSrc(scene);
  if (!src) return '';
  const r = await fetch(src);
  if (!r.ok) throw new Error(`Could not read the image for “${scene.name}”.`);
  return readDataUrl(await r.blob());
}
