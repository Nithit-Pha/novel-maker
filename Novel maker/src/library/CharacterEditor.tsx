import { useRef, useState } from 'react';
import {
  type Character,
  type Outfit,
  type PowerStat,
  STAT_MAX,
  STAT_MIN,
  newId,
} from './libraryTypes';

interface Props {
  initial: Character;
  onSave: (character: Character) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  /** true when this is a freshly-created character (hide Delete). */
  isNew: boolean;
}

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB guard

export default function CharacterEditor({ initial, onSave, onCancel, onDelete, isNew }: Props) {
  const [draft, setDraft] = useState<Character>(initial);
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = (p: Partial<Character>) => setDraft((d) => ({ ...d, ...p }));

  // ---- image ----
  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      alert('Image is too large (max 3 MB). Please pick a smaller one.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => patch({ image: String(ev.target?.result ?? '') });
    reader.readAsDataURL(file);
  };

  // ---- outfits ----
  const addOutfit = () =>
    patch({ outfits: [...draft.outfits, { id: newId(), name: '', description: '' }] });
  const updateOutfit = (id: string, p: Partial<Outfit>) =>
    patch({ outfits: draft.outfits.map((o) => (o.id === id ? { ...o, ...p } : o)) });
  const removeOutfit = (id: string) =>
    patch({ outfits: draft.outfits.filter((o) => o.id !== id) });

  // ---- stats (personality + abilities share the shape) ----
  const addStat = (key: 'personality' | 'abilities') =>
    patch({ [key]: [...draft[key], { id: newId(), name: '', value: 5 }] } as Partial<Character>);
  const updateStat = (key: 'personality' | 'abilities', id: string, p: Partial<PowerStat>) =>
    patch({ [key]: draft[key].map((s) => (s.id === id ? { ...s, ...p } : s)) } as Partial<Character>);
  const removeStat = (key: 'personality' | 'abilities', id: string) =>
    patch({ [key]: draft[key].filter((s) => s.id !== id) } as Partial<Character>);

  const handleSave = () => {
    if (!draft.name.trim()) {
      alert('Please give your character a name.');
      return;
    }
    onSave(draft);
  };

  const label = 'block text-[10px] uppercase tracking-wider text-gray-400 mb-1';
  const input =
    'w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1.5 rounded focus:outline-none focus:border-accent-dialog';
  const sectionBtn =
    'text-xs text-accent-dialog hover:text-white border border-ink-600 hover:border-accent-dialog rounded px-2 py-0.5 transition';

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-600 flex-shrink-0">
        <button
          onClick={onCancel}
          className="text-gray-300 hover:text-white text-sm flex items-center gap-1"
          title="Back to list"
        >
          ← Back
        </button>
        <span className="text-sm font-semibold text-white flex-1 truncate">
          {isNew ? 'New Character' : draft.name || 'Character'}
        </span>
        {!isNew && onDelete && (
          <button
            onClick={() => {
              if (confirm(`Delete "${draft.name || 'this character'}"?`)) onDelete(draft.id);
            }}
            className="text-gray-500 hover:text-white hover:bg-accent rounded px-2 py-0.5 text-xs transition"
          >
            Delete
          </button>
        )}
      </div>

      {/* body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Name */}
        <div>
          <label className={label}>Name</label>
          <input
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="e.g. Sarah"
            className={input}
            autoFocus
          />
        </div>

        {/* Image */}
        <div>
          <label className={label}>Image</label>
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-lg bg-ink-900 border border-ink-600 overflow-hidden flex items-center justify-center flex-shrink-0">
              {draft.image ? (
                <img src={draft.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl text-ink-500">👤</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <button onClick={() => fileRef.current?.click()} className={sectionBtn}>
                {draft.image ? 'Change image' : '+ Add image'}
              </button>
              {draft.image && (
                <button
                  onClick={() => patch({ image: undefined })}
                  className="text-xs text-gray-500 hover:text-white"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImage}
              className="hidden"
            />
          </div>
        </div>

        {/* Outfits */}
        <Section title="Outfit" onAdd={addOutfit} addLabel="+ Design">
          {draft.outfits.length === 0 && <Empty text="No outfits yet." />}
          <div className="space-y-2">
            {draft.outfits.map((o) => (
              <div key={o.id} className="bg-ink-900 border border-ink-600 rounded p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={o.name}
                    onChange={(e) => updateOutfit(o.id, { name: e.target.value })}
                    placeholder="Outfit name"
                    className={input}
                  />
                  <button
                    onClick={() => removeOutfit(o.id)}
                    className="text-gray-500 hover:text-white hover:bg-accent rounded px-1.5 text-sm flex-shrink-0"
                    title="Remove outfit"
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  value={o.description}
                  onChange={(e) => updateOutfit(o.id, { description: e.target.value })}
                  placeholder="Describe this outfit / design…"
                  className={`${input} resize-y min-h-[48px]`}
                />
              </div>
            ))}
          </div>
        </Section>

        {/* Personality */}
        <Section title="Personality" onAdd={() => addStat('personality')} addLabel="+ Trait">
          {draft.personality.length === 0 && <Empty text="No traits yet." />}
          <StatList
            stats={draft.personality}
            namePlaceholder="e.g. Bravery"
            onUpdate={(id, p) => updateStat('personality', id, p)}
            onRemove={(id) => removeStat('personality', id)}
          />
        </Section>

        {/* Ability */}
        <Section title="Ability" onAdd={() => addStat('abilities')} addLabel="+ Ability">
          {draft.abilities.length === 0 && <Empty text="No abilities yet." />}
          <StatList
            stats={draft.abilities}
            namePlaceholder="e.g. Telekinesis"
            onUpdate={(id, p) => updateStat('abilities', id, p)}
            onRemove={(id) => removeStat('abilities', id)}
          />
        </Section>

        {/* Description */}
        <div>
          <label className={label}>Description</label>
          <textarea
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Backstory, role in the story, notes…"
            className={`${input} resize-y min-h-[90px]`}
          />
        </div>
      </div>

      {/* footer */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-ink-600 flex-shrink-0">
        <button
          onClick={onCancel}
          className="flex-1 text-sm text-gray-300 hover:text-white border border-ink-600 rounded py-1.5 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 text-sm bg-accent hover:bg-accent/90 text-white rounded py-1.5 transition font-semibold"
        >
          Save Character
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400">{title}</label>
        <button
          onClick={onAdd}
          className="text-xs text-accent-dialog hover:text-white border border-ink-600 hover:border-accent-dialog rounded px-2 py-0.5 transition"
        >
          {addLabel}
        </button>
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-ink-500 italic mb-2">{text}</p>;
}

function StatList({
  stats,
  namePlaceholder,
  onUpdate,
  onRemove,
}: {
  stats: PowerStat[];
  namePlaceholder: string;
  onUpdate: (id: string, p: Partial<PowerStat>) => void;
  onRemove: (id: string) => void;
}) {
  const input =
    'w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1.5 rounded focus:outline-none focus:border-accent-dialog';
  return (
    <div className="space-y-2">
      {stats.map((s) => (
        <div key={s.id} className="bg-ink-900 border border-ink-600 rounded p-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              value={s.name}
              onChange={(e) => onUpdate(s.id, { name: e.target.value })}
              placeholder={namePlaceholder}
              className={input}
            />
            <button
              onClick={() => onRemove(s.id)}
              className="text-gray-500 hover:text-white hover:bg-accent rounded px-1.5 text-sm flex-shrink-0"
              title="Remove"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={STAT_MIN}
              max={STAT_MAX}
              step={1}
              value={s.value}
              onChange={(e) => onUpdate(s.id, { value: Number(e.target.value) })}
              className="flex-1 accent-accent-dialog"
            />
            <span className="text-xs text-white w-8 text-right tabular-nums">
              {s.value}/{STAT_MAX}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
