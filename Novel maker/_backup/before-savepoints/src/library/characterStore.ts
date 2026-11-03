import { create } from 'zustand';
import type { Character } from './libraryTypes';

/** Where the old global character library lived (before per-project characters). */
const LEGACY_KEY = 'novel-flow-characters-v1';

/** Characters from the old browser-wide library, for migrating into a project. */
export function readLegacyCharacters(): Character[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as Character[]) : [];
  } catch {
    return [];
  }
}

interface CharacterState {
  /** The open project's characters. Saved with the project (see storage/session.ts). */
  characters: Character[];
  /** Kept for compatibility; per-project saving reports errors via the flow store. */
  saveError: string | null;
  /** Replace the whole character (used by the editor's Save). */
  upsertCharacter: (character: Character) => void;
  deleteCharacter: (id: string) => void;
  /** Replace the entire character list (used when loading a project). */
  replaceAll: (characters: Character[]) => void;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  characters: [],
  saveError: null,

  upsertCharacter: (character) => {
    const stamped = { ...character, updatedAt: new Date().toISOString() };
    const existing = get().characters;
    const idx = existing.findIndex((c) => c.id === stamped.id);
    const next =
      idx === -1 ? [...existing, stamped] : existing.map((c) => (c.id === stamped.id ? stamped : c));
    set({ characters: next });
  },

  deleteCharacter: (id) => {
    set({ characters: get().characters.filter((c) => c.id !== id) });
  },

  replaceAll: (characters) => {
    set({ characters: Array.isArray(characters) ? characters : [] });
  },
}));
