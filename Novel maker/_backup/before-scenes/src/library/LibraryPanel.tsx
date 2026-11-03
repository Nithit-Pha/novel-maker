import { useState } from 'react';
import { Library as LibraryIcon } from 'lucide-react';
import { useCharacterStore } from './characterStore';
import { type Character, emptyCharacter } from './libraryTypes';
import CharacterEditor from './CharacterEditor';
import VariablesTab from './VariablesTab';
import { useFlowStore } from '../store';

interface Props {
  onClose: () => void;
}

type Tab = 'characters' | 'variables' | 'scenes';

export default function LibraryPanel({ onClose }: Props) {
  const characters = useCharacterStore((s) => s.characters);
  const upsertCharacter = useCharacterStore((s) => s.upsertCharacter);
  const deleteCharacter = useCharacterStore((s) => s.deleteCharacter);

  const [tab, setTab] = useState<Tab>('characters');
  // null = list view; otherwise the character being edited (+ whether it's new)
  const [editing, setEditing] = useState<{ character: Character; isNew: boolean } | null>(null);

  const startNew = () => setEditing({ character: emptyCharacter(), isNew: true });
  const startEdit = (character: Character) => setEditing({ character, isNew: false });

  const handleSave = (character: Character) => {
    const before = characters.find((c) => c.id === character.id);
    upsertCharacter(character);
    // Renamed? Update every Dialogue / Ending card that uses this character.
    if (before && before.name.trim() !== character.name.trim()) {
      useFlowStore.getState().renameCharacterRefs(character.id, before.name, character.name.trim());
    }
    setEditing(null);
  };

  const handleDelete = (id: string) => {
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
            <TabButton active={tab === 'scenes'} onClick={() => setTab('scenes')}>
              Scene
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
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {characters.length === 0 ? (
                  <p className="text-sm text-ink-500 italic text-center mt-6">
                    No characters yet. Click “+ Character” to create one.
                  </p>
                ) : (
                  characters.map((c) => (
                    <CharacterCard key={c.id} character={c} onClick={() => startEdit(c)} />
                  ))
                )}
              </div>
            </div>
          ) : tab === 'variables' ? (
            <VariablesTab />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-sm text-ink-500 italic text-center">
                Scenes coming soon.
              </p>
            </div>
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
  onClick,
}: {
  character: Character;
  onClick: () => void;
}) {
  const stats = character.personality.length + character.abilities.length;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-ink-900 hover:bg-ink-700 border border-ink-600 hover:border-accent-dialog rounded-lg p-2.5 text-left transition"
    >
      <div className="w-12 h-12 rounded-md bg-ink-800 border border-ink-600 overflow-hidden flex items-center justify-center flex-shrink-0">
        {character.image ? (
          <img src={character.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl text-ink-500">👤</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white truncate">
          {character.name || 'Unnamed'}
        </div>
        <div className="text-xs text-gray-400 truncate">
          {[
            character.outfits.length ? `${character.outfits.length} outfit${character.outfits.length > 1 ? 's' : ''}` : '',
            stats ? `${stats} stat${stats > 1 ? 's' : ''}` : '',
          ]
            .filter(Boolean)
            .join(' · ') || 'No details yet'}
        </div>
      </div>
    </button>
  );
}
