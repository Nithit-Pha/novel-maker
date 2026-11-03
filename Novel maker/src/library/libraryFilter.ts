// Matching rules for the Library search boxes (Character, Variables, Scenes).
// Pure and dependency-free so it's easy to test.

import type { Character, SceneAsset } from './libraryTypes';
import type { VariableDef } from '../types';

/** Words for each variable type, so "flag" or "counter" finds them too. */
const TYPE_WORDS: Record<string, string> = {
  bool: 'yes/no flag bool true false',
  number: 'number counter',
  text: 'text',
};

/** Every word of the query must appear somewhere in the text (case-insensitive). */
export function matchesQuery(text: string, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = text.toLowerCase();
  return words.every((w) => hay.includes(w));
}

export function characterText(c: Character): string {
  return [
    c.name,
    c.gender ?? '',
    c.description,
    ...c.outfits.map((o) => o.name),
    ...c.personality.map((s) => s.name),
    ...c.abilities.map((s) => s.name),
  ].join(' \n ');
}

export function variableText(v: VariableDef): string {
  return [v.name, v.note ?? '', TYPE_WORDS[v.type] ?? v.type].join(' \n ');
}

export function sceneText(s: SceneAsset): string {
  return s.name;
}

export const filterCharacters = (list: Character[], q: string) => list.filter((c) => matchesQuery(characterText(c), q));
export const filterVariables = (list: VariableDef[], q: string) => list.filter((v) => matchesQuery(variableText(v), q));
export const filterScenes = (list: SceneAsset[], q: string) => list.filter((s) => matchesQuery(sceneText(s), q));
