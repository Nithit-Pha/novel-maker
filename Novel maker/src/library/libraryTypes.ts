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
  /** Portrait, stored as a data URL. */
  image?: string;
  outfits: Outfit[];
  personality: PowerStat[];
  abilities: PowerStat[];
  description: string;
  createdAt: string;
  updatedAt: string;
}

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
