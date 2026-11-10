// Types for the Character / Scene Library.
// Kept separate from the flow-graph types in ../types.ts.

export interface PowerStat {
  id: string;
  name: string;
  /** 0–10 power level shown as a slider/bar. */
  value: number;
}

export interface Outfit {
  id: string;
  name: string;
  description: string;
}

export interface Character {
  id: string;
  name: string;
  /** Optional, free text (e.g. "Female", "Male", "Non-binary"). Missing in older saves. */
  gender?: string;
  /** Portrait, stored as a data URL. */
  image?: string;
  outfits: Outfit[];
  personality: PowerStat[];
  abilities: PowerStat[];
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** A background image in the project's Scene Library. */
export interface SceneAsset {
  id: string;
  name: string;
  /** Folder projects: image file in saves/<Project>/scenes/ (e.g. "<id>-<rev>.jpg"). */
  file?: string;
  /** Browser-only projects (no local server), and inside exported JSON: the image as a data URL. */
  data?: string;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
}

/** `sceneId` value that clears the background (an empty / missing sceneId keeps it). */
export const NO_SCENE = 'none';

export const STAT_MIN = 0;
export const STAT_MAX = 10;

export function newId(): string {
  // crypto.randomUUID is available in all modern browsers.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function emptyCharacter(): Character {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name: '',
    image: undefined,
    outfits: [],
    personality: [],
    abilities: [],
    description: '',
    createdAt: now,
    updatedAt: now,
  };
}
