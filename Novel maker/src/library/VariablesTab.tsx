import { confirmDialog } from '../ui/dialogs';
import { useMemo } from 'react';
import { useFlowStore } from '../store';
import type { VariableDef, VarShow, VarType } from '../types';
import { Backpack } from 'lucide-react';
import { statusGroupNames } from '../engine';
import { variableUsage } from '../logic/usage';
import { TYPE_LABEL, VarValueInput } from '../logic/fields';
import LibrarySearch, { NoMatches } from './LibrarySearch';
import { filterVariables } from './libraryFilter';

const input =
  'bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-accent-condition';

/** Library tab listing the story's variables (flags, counters, text). */
export default function VariablesTab({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  const variables = useFlowStore((s) => s.variables);
  const addVariable = useFlowStore((s) => s.addVariable);
  const updateVariable = useFlowStore((s) => s.updateVariable);
  const deleteVariable = useFlowStore((s) => s.deleteVariable);
  const nodes = useFlowStore((s) => s.nodes);
  const graphs = useFlowStore((s) => s.graphs);
  const activeArcId = useFlowStore((s) => s.activeArcId);

  const classes = useFlowStore((s) => s.classes);
  const usage = useMemo(
    () =>
      variableUsage(
        Object.keys(graphs).map((id) => (id === activeArcId ? nodes : graphs[id].nodes)),
        classes
      ),
    [graphs, nodes, activeArcId, classes]
  );

  const shown = filterVariables(variables, query);
  // Suggestions for the group box: the three defaults + any the writer made up.
  const groupOptions = [...new Set(['Items', 'Abilities', 'Power', ...statusGroupNames(variables)])];
  const names = variables.map((v) => v.name.trim());
  const isDup = (name: string) => names.filter((n) => n === name.trim()).length > 1;

  const remove = async (id: string, name: string) => {
    const used = usage[id] ?? 0;
    if (used) {
      const ok = await confirmDialog({
        title: `Delete “${name}”?`,
        message: `It is used in ${used} rule${used > 1 ? 's' : ''}. Those rules will stop matching.`,
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!ok) return;
    }
    deleteVariable(id);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 py-3 border-b border-ink-600 flex-shrink-0 space-y-2">
        <button
          onClick={() => {
            onQuery(''); // don't hide the new variable behind the search
            addVariable('number');
          }}
          className="nf-btn nf-btn-primary w-full h-9"
        >
          + Variable
        </button>
        <p className="text-[11px] text-gray-400 leading-snug">
          Variables remember what happened (e.g. <code className="text-accent-condition">trust_mira</code>,{' '}
          <code className="text-accent-condition">has_key</code>). Change them with effects on choices or nodes, and use
          them in choice conditions and Condition nodes. Turn on <b className="text-fg-soft font-semibold">Show to reader</b> to
          list one as an item, ability or power on Status cards and in the Status slot.
        </p>
        <datalist id="nf-status-groups">
          {groupOptions.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
        {variables.length > 0 && (
          <LibrarySearch value={query} onChange={onQuery} placeholder="Search variables" shown={shown.length} total={variables.length} />
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {variables.length === 0 && (
          <p className="text-sm text-ink-500 italic text-center mt-6">No variables yet.</p>
        )}
        {variables.length > 0 && shown.length === 0 && <NoMatches what="variables" query={query} />}
        {shown.map((v) => {
          const used = usage[v.id] ?? 0;
          return (
            <div key={v.id} className="bg-ink-900 border border-ink-600 rounded-lg p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={v.name}
                  onChange={(e) => updateVariable(v.id, { name: e.target.value.replace(/\s+/g, '_') })}
                  placeholder="variable_name"
                  className={`${input} flex-1 min-w-0 font-mono ${isDup(v.name) ? 'border-accent' : ''}`}
                  title={isDup(v.name) ? 'Another variable has the same name' : undefined}
                />
                <button
                  onClick={() => remove(v.id, v.name)}
                  className="text-gray-500 hover:text-danger hover:bg-danger/15 rounded px-1.5 text-sm"
                  title="Delete variable"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <select
                  value={v.type}
                  onChange={(e) => updateVariable(v.id, { type: e.target.value as VarType })}
                  className={`${input} text-xs`}
                >
                  {(['number', 'bool', 'text'] as VarType[]).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
                <span>starts at</span>
                <VarValueInput type={v.type} value={v.initial} onChange={(initial) => updateVariable(v.id, { initial })} />
                <span className="ml-auto" title="Effects and rules that use this variable">
                  {used ? `used ${used}×` : 'unused'}
                </span>
              </div>
              <input
                value={v.note ?? ''}
                onChange={(e) => updateVariable(v.id, { note: e.target.value })}
                placeholder="Note (optional) — what does it track?"
                className={`${input} w-full text-xs`}
              />
              <ShowToReader v={v} onChange={(show) => updateVariable(v.id, { show })} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SHOW_HELP: Record<VarType, string> = {
  bool: 'Listed while it is yes.',
  number: 'Shows the number (hidden at 0). Set a max to show a bar instead.',
  text: 'Shows the text (hidden while empty).',
};

/** "Show to reader" settings: group, display name, optional emoji, bar max (numbers). */
function ShowToReader({ v, onChange }: { v: VariableDef; onChange: (show: VarShow | undefined) => void }) {
  const show = v.show;
  const set = (patch: Partial<VarShow>) => {
    const next: VarShow = { ...(show ?? { group: 'Items' }), ...patch };
    for (const k of ['label', 'icon'] as const) if (!next[k]?.trim()) delete next[k];
    if (next.max == null || !(next.max > 0)) delete next.max;
    onChange(next);
  };
  const small =
    'bg-ink-900 border border-ink-600 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-accent-status min-w-0';
  return (
    <div className={`rounded-md ${show ? 'border border-accent-status/40 bg-accent-status/5 p-2 space-y-1.5' : ''}`}>
      <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={!!show}
          onChange={(e) => onChange(e.target.checked ? { group: v.type === 'number' ? 'Power' : 'Items' } : undefined)}
          className="accent-[rgb(var(--n-status))]"
        />
        <Backpack size={12} className={show ? 'text-accent-status' : ''} />
        <span className={show ? 'text-accent-status font-medium' : ''}>Show to reader</span>
      </label>
      {show && (
        <>
          <div className="grid grid-cols-[1fr_1fr] gap-1.5">
            <input
              list="nf-status-groups"
              value={show.group}
              onChange={(e) => set({ group: e.target.value })}
              onBlur={() => !show.group.trim() && set({ group: 'Items' })}
              placeholder="Group"
              aria-label="Group"
              title="Group: Items, Abilities, Power or your own"
              className={small}
            />
            <input
              value={show.label ?? ''}
              onChange={(e) => set({ label: e.target.value })}
              placeholder={v.name.replace(/_/g, ' ') || 'Name'}
              aria-label="Name shown to readers"
              title="Name shown to readers (default: the variable name)"
              className={small}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <input
              value={show.icon ?? ''}
              onChange={(e) => set({ icon: e.target.value })}
              placeholder="🙂"
              aria-label="Emoji (optional)"
              title="Emoji (optional) — Windows: Win + . to pick one"
              className={`${small} w-12 text-center`}
              maxLength={8}
            />
            {v.type === 'number' && (
              <input
                type="number"
                min={1}
                value={show.max ?? ''}
                onChange={(e) => set({ max: e.target.value === '' ? undefined : Number(e.target.value) })}
                placeholder="max"
                aria-label="Bar max (optional)"
                title="Max (optional): shows a bar like 7 / 10"
                className={`${small} w-16`}
              />
            )}
            <span className="text-[10.5px] text-gray-500 leading-tight flex-1">{SHOW_HELP[v.type]}</span>
          </div>
        </>
      )}
    </div>
  );
}
