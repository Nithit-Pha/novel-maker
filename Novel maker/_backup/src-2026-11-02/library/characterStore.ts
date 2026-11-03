import { create } from 'zustand';
import type { Character } from './libraryTypes';

const STORAGE_KEY = 'novel-flow-characters-v1';

function loadCharacters(): Character[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data as Character[];
  } catch {
    return [];
  }
}

function persist(characters: Character[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  } catch (err) {
    // localStorage can throw QuotaExceededError (images are large).
    console.warn('Failed to save characters:', err);
  }
}

interface CharacterState {
  characters: Character[];
  /** Replace the whole character (used by the editor's Save). */
  upsertCharacter: (character: Character) => void;
  deleteCharacter: (id: string) => void;
  /** Replace the entire character list (used when loading a saved project). */
  replaceAll: (characters: Character[]) => void;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  characters: loadCharacters(),

  upsertCharacter: (character) => {
    const stamped = { ...character, updatedAt: new Date().toISOString() };
    const existing = get().characters;
    const idx = existing.findIndex((c) => c.id === stamped.id);
    const next =
      idx === -1
        ? [...existing, stamped]
        : existing.map((c) => (c.id === stamped.id ? stamped : c));
    persist(next);
    set({ characters: next });
  },

  deleteCharacter: (id) => {
    const next = get().characters.filter((c) => c.id !== id);
    persist(next);
    set({ characters: next });
  },

  replaceAll: (characters) => {
    const next = Array.isArray(characters) ? characters : [];
    persist(next);
    set({ characters: next });
  },
}));
