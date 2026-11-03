import { useId } from 'react';
import { UserPlus } from 'lucide-react';
import { useCharacterStore } from './characterStore';
import { emptyCharacter } from './libraryTypes';
import { notify } from '../ui/dialogs';

const stop = (e: React.MouseEvent) => e.stopPropagation();

/**
 * Speaker field: free text with suggestions from the Character Library.
 * Picking / typing a library name links the card to that character (so a
 * rename in the Library updates the card); a new name can be added to the
 * Library with one click.
 */
export default function CharacterField({
  value,
  characterId,
  onChange,
  placeholder = 'e.g. Alice',
  className = '',
}: {
  value: string;
  characterId?: string;
  onChange: (name: string, characterId: string | undefined) => void;
  placeholder?: string;
  className?: string;
}) {
  const characters = useCharacterStore((s) => s.characters);
  const upsert = useCharacterStore((s) => s.upsertCharacter);
  const listId = useId();
  const name = value ?? '';
  const linked =
    characters.find((c) => c.id === characterId) ??
    characters.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && name.trim() !== '');

  const set = (next: string) => {
    const match = characters.find((c) => c.name.trim().toLowerCase() === next.trim().toLowerCase() && next.trim() !== '');
    onChange(next, match?.id);
  };

  const addToLibrary = () => {
    const c = { ...emptyCharacter(), name: name.trim() };
    upsert(c);
    onChange(c.name, c.id);
    notify(`Added “${c.name}” to the Library.`);
  };

  return (
    <div className="relative flex items-center gap-1">
      {linked?.image ? (
        <img src={linked.image} alt="" className="w-7 h-7 rounded-full object-cover border border-border flex-shrink-0" />
      ) : null}
      <input
        value={name}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        list={listId}
        className={`flex-1 min-w-0 nodrag ${className}`}
        onMouseDown={stop}
        title={linked ? `Linked to ${linked.name} in the Library` : undefined}
      />
      <datalist id={listId}>
        {characters.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
      {name.trim() && !linked && (
        <button
          onClick={addToLibrary}
          onMouseDown={stop}
          className="nf-icon-btn !w-7 !h-7 flex-shrink-0"
          title={`Add “${name.trim()}” to the Character Library`}
          aria-label="Add to Character Library"
        >
          <UserPlus size={14} />
        </button>
      )}
    </div>
  );
}
