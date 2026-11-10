import { useState } from 'react';
import { Library as LibraryIcon, Star } from 'lucide-react';
import { useCharacterStore } from './characterStore';
import { type Character, emptyCharacter } from './libraryTypes';
import CharacterEditor from './CharacterEditor';
import VariablesTab from './VariablesTab';
import ScenesTab from './ScenesTab';
import ClassesTab from './ClassesTab';
import LibrarySearch, { NoMatches } from './LibrarySearch';
import { filterCharacters } from './libraryFilter';
import { useFlowStore } from '../store';

interface Props {
  onClose: () => void;
}

type Tab = 'characters' | 'variables' | 'classes' | 'scenes';

export default function LibraryPanel({ onClose }: Props) {
  const characters = useCharacterStore((s) => s.characters);
  const upsertCharacter = useCharacterStore((s) => s.upsertCharacter);
  const deleteCharacter = useCharacterStore((s) => s.deleteCharacter);

  const [tab, setTab] = useState<Tab>('characters');
  // One search per tab; kept while the Library is open.
  const [queries, setQueries] = useState<Record<Tab, string>>({ characters: '', variables: '', classes: '', scenes: '' });
  const setQuery = (t: Tab) => (q: string) => setQueries((qs) => ({ ...qs, [t]: q }));
  const shownCharacters = filterCharacters(characters, queries.characters);
  // null = list view; otherwise the character being edited (+ whether it's new)
  const [editing, setEditing] = useState<{ character: Character; isNew: boolean } | null>(null);

  const startNew = () => setEditing({ character: emptyCharacter(), isNew: true });
  const startEdit = (character: Character) => setEditing({ character, isNew: false });

  const mainId = useFlowStore((s) => s.mainCharacterIds[0] ?? null);
  const setMain = (id: string | null) => useFlowStore.getState().setMainCharacter(id);

  const handleSave = (character: Character, main: boolean) => {
    const before = characters.find((c) => c.id === character.id);
    upsertCharacter(character);
    if (main && mainId !== character.id) setMain(character.id);
    else if (!main && mainId === character.id) setMain(null);
    if (editing?.isNew) setQuery('characters')(''); // don't hide the new character behind the search
    // Renamed? Update every Dialogue / Ending card that uses this character.
    if (before && before.name.trim() !== character.name.trim()) {
      useFlowStore.getState().renameCharacterRefs(character.id, before.name, character.name.trim());
    }
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    if (mainId === id) setMain(null);
    deleteCharacter(id);
    setEditing(null);
  };

  return (
    <aside
      className="absolute top-0 right-0 h-full w-[380px] max-w-[92vw] bg-surface border-l border-border flex flex-col z-20 animate-pop"
      style={{ boxShadow: 'var(--shadow-lg)' }}
    >
      {/* panel header */}
      <div className="flex items-center px-4 py-3 border-b border-ink-600 flex-shrink-0">
        <LibraryIcon size={18} className="text-accent mr-2" />
        <h2 className="font-story text-lg text-fg flex-1">Library</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-lg leading-none px-1"
          title="Close library"
        >
          ✕
        </button>
      </div>

      {editing ? (
        <CharacterEditor
          initial={editing.character}
          isNew={editing.isNew}
          onSave={handleSave}
          isMain={mainId === editing.character.id}
          onCancel={() => setEditing(null)}
          onDelete={handleDelete}
        />
      ) : (
        <>
          {/* tabs */}
          <div className="flex border-b border-ink-600 flex-shrink-0">
            <TabButton active={tab === 'characters'} onClick={() => setTab('characters')}>
              Character
            </TabButton>
            <TabButton active={tab === 'variables'} onClick={() => setTab('variables')}>
              Variables
            </TabButton>
            <TabButton active={tab === 'classes'} onClick={() => setTab('classes')}>
              Classes
            </TabButton>
            <TabButton active={tab === 'scenes'} onClick={() => setTab('scenes')}>
              Scenes
            </TabButton>
          </div>

          {tab === 'characters' ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="px-4 py-3 border-b border-ink-600 flex-shrink-0">
                <button
                  onClick={startNew}
                  className="nf-btn nf-btn-primary w-full h-9"
                >
                  + Character
                </button>
                {characters.length > 0 && (
                  <LibrarySearch
                    value={queries.characters}
                    onChange={setQuery('characters')}
                    placeholder="Search characters"
                    shown={shownCharacters.length}
                    total={characters.length}
                  />
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {characters.length === 0 ? (
                  <p className="text-sm text-ink-500 italic text-center mt-6">
                    No characters yet. Click “+ Character” to create one.
                  </p>
                ) : shownCharacters.length === 0 ? (
                  <NoMatches what="characters" query={queries.characters} />
                ) : (
                  shownCharacters.map((c) => (
                    <CharacterCard
                      key={c.id}
                      character={c}
                      isMain={mainId === c.id}
                      onToggleMain={() => setMain(mainId === c.id ? null : c.id)}
                      onClick={() => startEdit(c)}
                    />
                  ))
                )}
              </div>
            </div>
          ) : tab === 'variables' ? (
            <VariablesTab query={queries.variables} onQuery={setQuery('variables')} />
          ) : tab === 'classes' ? (
            <ClassesTab query={queries.classes} onQuery={setQuery('classes')} />
          ) : (
            <ScenesTab query={queries.scenes} onQuery={setQuery('scenes')} />
          )}
        </>
      )}
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-sm py-2.5 transition border-b-2 ${
        active
          ? 'text-white border-accent font-semibold'
          : 'text-gray-400 border-transparent hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function CharacterCard({
  character,
  isMain,
  onToggleMain,
  onClick,
}: {
  character: Character;
  isMain: boolean;
  onToggleMain: () => void;
  onClick: () => void;
}) {
  const stats = character.personality.length + character.abilities.length;
  return (
    <div className="relative">
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 bg-ink-900 hover:bg-ink-700 border hover:border-accent-dialog rounded-lg p-2.5 pr-11 text-left transition ${
        isMain ? 'border-accent/70' : 'border-ink-600'
      }`}
    >
      <div className="w-12 h-12 rounded-md bg-ink-800 border border-ink-600 overflow-hidden flex items-center justify-center flex-shrink-0">
        {character.image ? (
          <img src={character.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl text-ink-500">👤</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
          <span className="truncate">{character.name || 'Unnamed'}</span>
          {isMain && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent bg-accent/10 rounded px-1.5 py-0.5 flex-shrink-0">
              Main · you
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400 truncate">
          {[
            character.gender?.trim() ?? '',
            character.outfits.length ? `${character.outfits.length} outfit${character.outfits.length > 1 ? 's' : ''}` : '',
            stats ? `${stats} stat${stats > 1 ? 's' : ''}` : '',
          ]
            .filter(Boolean)
            .join(' · ') || 'No details yet'}
        </div>
      </div>
    </button>
    <button
      onClick={onToggleMain}
      className={`absolute right-2 top-1/2 -translate-y-1/2 nf-icon-btn !w-8 !h-8 ${isMain ? '!text-accent' : 'opacity-50 hover:opacity-100'}`}
      title={isMain ? 'Main character (you) — click to unset' : 'Make main character (you): the Status panel shows their portrait and name'}
      aria-label={isMain ? 'Unset main character' : 'Make main character'}
      aria-pressed={isMain}
    >
      <Star size={16} fill={isMain ? 'currentColor' : 'none'} />
    </button>
    </div>
  );
}
