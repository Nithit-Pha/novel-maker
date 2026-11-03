import { confirmDialog } from '../ui/dialogs';
import { useMemo } from 'react';
import { useFlowStore } from '../store';
import type { VarType } from '../types';
import { variableUsage } from '../logic/usage';
import { TYPE_LABEL, VarValueInput } from '../logic/fields';
import LibrarySearch, { NoMatches } from './LibrarySearch';
import { filterVariables } from './librarySearch';

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

  const usage = useMemo(
    () =>
      variableUsage(
        Object.keys(graphs).map((id) => (id === activeArcId ? nodes : graphs[id].nodes))
      ),
    [graphs, nodes, activeArcId]
  );

  const shown = filterVariables(variables, query);
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
          them in choice conditions and Condition nodes.
        </p>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
