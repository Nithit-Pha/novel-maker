import { describe, expect, it } from 'vitest';
import { filterCharacters, filterScenes, filterVariables, matchesQuery } from './libraryFilter';
import { emptyCharacter, type SceneAsset } from './libraryTypes';
import type { VariableDef } from '../types';

describe('library search', () => {
  it('needs every word, ignores case, empty query matches all', () => {
    expect(matchesQuery('Mira the keeper', 'mira KEEP')).toBe(true);
    expect(matchesQuery('Mira the keeper', 'mira door')).toBe(false);
    expect(matchesQuery('anything', '   ')).toBe(true);
  });

  it('finds characters by name, gender, description, outfits and stats', () => {
    const mira = { ...emptyCharacter(), name: 'Mira', gender: 'Female', description: 'Has the lighthouse key',
      outfits: [{ id: 'o', name: 'Storm coat', description: '' }], abilities: [{ id: 'a', name: 'Swimming', value: 5 }] };
    const tom = { ...emptyCharacter(), name: 'Tom', gender: 'Male' };
    const list = [mira, tom];
    expect(filterCharacters(list, 'mira key').map((c) => c.name)).toEqual(['Mira']);
    expect(filterCharacters(list, 'male').map((c) => c.name)).toEqual(['Mira', 'Tom']); // "female" contains "male"
    expect(filterCharacters(list, 'coat').map((c) => c.name)).toEqual(['Mira']);
    expect(filterCharacters(list, 'swim').map((c) => c.name)).toEqual(['Mira']);
    expect(filterCharacters([{ ...emptyCharacter(), name: 'Old' }], 'old')).toHaveLength(1); // no gender (older saves)
  });

  it('finds variables by name, note and type words', () => {
    const vars: VariableDef[] = [
      { id: '1', name: 'has_key', type: 'bool', initial: false },
      { id: '2', name: 'trust_mira', type: 'number', initial: 0, note: 'goes up when you help her' },
    ];
    expect(filterVariables(vars, 'flag').map((v) => v.id)).toEqual(['1']);
    expect(filterVariables(vars, 'help').map((v) => v.id)).toEqual(['2']);
    expect(filterVariables(vars, 'MIRA').map((v) => v.id)).toEqual(['2']);
  });

  it('finds scenes by name', () => {
    const s = (name: string): SceneAsset => ({ id: name, name, createdAt: '', updatedAt: '' });
    expect(filterScenes([s('Forest night'), s('Lighthouse')], 'night').map((x) => x.name)).toEqual(['Forest night']);
  });
});
