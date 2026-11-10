// Library → Classes: classes (Warrior, Mage…) and their sub-classes (Knight…).
// Becoming one runs its effects (starting stats, items, abilities).

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, CornerDownRight, Plus, Trash2 } from 'lucide-react';
import { useFlowStore } from '../store';
import type { ClassDef } from '../types';
import { describeEffects } from '../engine';
import EffectsEditor from '../logic/EffectsEditor';
import { classUsage } from '../logic/usage';
import { confirmDialog } from '../ui/dialogs';
import LibrarySearch, { NoMatches } from './LibrarySearch';
import { filterClasses } from './libraryFilter';

const input =
  'bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-accent-classpick min-w-0';

export default function ClassesTab({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  const classes = useFlowStore((s) => s.classes);
  const addClass = useFlowStore((s) => s.addClass);
  const nodes = useFlowStore((s) => s.nodes);
  const graphs = useFlowStore((s) => s.graphs);
  const activeArcId = useFlowStore((s) => s.activeArcId);
  const [open, setOpen] = useState<string | null>(null);

  const usage = useMemo(
    () => classUsage(Object.keys(graphs).map((id) => (id === activeArcId ? nodes : graphs[id].nodes))),
    [graphs, nodes, activeArcId]
  );
  const shown = filterClasses(classes, query);
  const top = shown.filter((c) => !c.parentId);

  const add = (parentId: string | null = null) => {
    onQuery(''); // don't hide the new class behind the search
    const id = addClass(parentId);
    setOpen(id);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 py-3 border-b border-ink-600 flex-shrink-0 space-y-2">
        <button onClick={() => add()} className="nf-btn nf-btn-primary w-full h-9">
          + Class
        </button>
        <p className="text-[11px] text-gray-400 leading-snug">
          Becoming a class runs its changes (starting stats, items, abilities). Give the reader one with a{' '}
          <b className="text-fg-soft font-semibold">Choose class</b> card or a “become a class” change on any choice. Use{' '}
          <b className="text-fg-soft font-semibold">Class is…</b> rules to lock choices. A sub-class counts as its class too.
        </p>
        {classes.length > 0 && (
          <LibrarySearch value={query} onChange={onQuery} placeholder="Search classes" shown={shown.length} total={classes.length} />
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {classes.length === 0 && <p className="text-sm text-ink-500 italic text-center mt-6">No classes yet.</p>}
        {classes.length > 0 && shown.length === 0 && <NoMatches what="classes" query={query} />}
        {top.map((c) => (
          <div key={c.id} className="space-y-1.5">
            <ClassCard c={c} uses={usage[c.id] ?? 0} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} />
            <div className="ml-4 pl-2 border-l-2 border-accent-classpick/25 space-y-1.5">
              {shown
                .filter((s) => s.parentId === c.id)
                .map((s) => (
                  <ClassCard key={s.id} c={s} uses={usage[s.id] ?? 0} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} />
                ))}
              <button onClick={() => add(c.id)} className="text-[12px] text-accent-classpick hover:text-white flex items-center gap-1 py-0.5">
                <Plus size={12} /> Sub-class of {c.name.trim() || 'this class'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassCard({ c, uses, open, onToggle }: { c: ClassDef; uses: number; open: boolean; onToggle: () => void }) {
  const updateClass = useFlowStore((s) => s.updateClass);
  const deleteClass = useFlowStore((s) => s.deleteClass);
  const classes = useFlowStore((s) => s.classes);
  const variables = useFlowStore((s) => s.variables);
  const subs = classes.filter((x) => x.parentId === c.id);
  const gives = describeEffects(c.effects, variables, classes);

  const remove = async () => {
    const total = uses + subs.length;
    if (total) {
      const ok = await confirmDialog({
        title: `Delete “${c.name || 'this class'}”?`,
        message: [
          uses ? `It is used ${uses}× (rules, “become” changes or Choose class cards); those will show as a deleted class.` : '',
          subs.length ? `Its ${subs.length} sub-class${subs.length > 1 ? 'es are' : ' is'} deleted too.` : '',
        ]
          .filter(Boolean)
          .join(' '),
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!ok) return;
    }
    deleteClass(c.id);
  };

  return (
    <div className={`bg-ink-900 border rounded-lg p-2.5 space-y-2 ${open ? 'border-accent-classpick/60' : 'border-ink-600'}`}>
      <div className="flex items-center gap-1.5">
        {c.parentId && <CornerDownRight size={13} className="text-accent-classpick flex-shrink-0" />}
        <input
          value={c.icon ?? ''}
          onChange={(e) => updateClass(c.id, { icon: e.target.value.trim() ? e.target.value : undefined })}
          placeholder="🙂"
          aria-label="Emoji (optional)"
          title="Emoji (optional) — Windows: Win + . to pick one"
          className={`${input} w-10 text-center px-1`}
          maxLength={8}
        />
        <input
          value={c.name}
          onChange={(e) => updateClass(c.id, { name: e.target.value })}
          placeholder={c.parentId ? 'Sub-class name' : 'Class name'}
          aria-label="Name"
          className={`${input} flex-1 font-medium`}
        />
        <button
          onClick={() => void remove()}
          className="text-gray-500 hover:text-danger hover:bg-danger/15 rounded p-1"
          title="Delete class"
          aria-label="Delete class"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <button onClick={onToggle} className="w-full flex items-center gap-1 text-left text-[11.5px] text-gray-400 hover:text-white">
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <span className="truncate">{gives ? `Gives: ${gives}` : 'No changes yet — click to set stats'}</span>
        <span className="ml-auto pl-2 whitespace-nowrap text-gray-500">{uses ? `used ${uses}×` : 'unused'}</span>
      </button>
      {open && (
        <div className="space-y-2">
          <textarea
            value={c.description ?? ''}
            onChange={(e) => updateClass(c.id, { description: e.target.value || undefined })}
            placeholder="Description shown to readers (optional)"
            className={`${input} w-full text-xs resize-y min-h-[44px]`}
          />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
              When the reader becomes {c.parentId ? 'this sub-class' : 'this class'}
            </div>
            <EffectsEditor effects={c.effects} onChange={(effects) => updateClass(c.id, { effects })} allowBecome={false} />
            {c.parentId && (
              <p className="text-[10.5px] text-gray-500 mt-1 leading-snug">
                Promoted from its class: only these run. Becoming it directly: the class’s changes run first.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
