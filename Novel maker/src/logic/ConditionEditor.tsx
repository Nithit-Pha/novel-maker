import { useFlowStore } from '../store';
import { newId } from '../project';
import type { Clause, Cmp, Condition, VarType } from '../types';
import { RemoveButton, VarSelect, VarValueInput, fieldCls, stop } from './fields';
import ClassSelect from './ClassSelect';

const CMPS: Record<VarType, { cmp: Cmp; label: string }[]> = {
  number: [
    { cmp: '>=', label: '≥' },
    { cmp: '>', label: '>' },
    { cmp: '==', label: '=' },
    { cmp: '!=', label: '≠' },
    { cmp: '<=', label: '≤' },
    { cmp: '<', label: '<' },
  ],
  bool: [
    { cmp: '==', label: 'is' },
    { cmp: '!=', label: 'is not' },
  ],
  text: [
    { cmp: '==', label: '=' },
    { cmp: '!=', label: '≠' },
  ],
};

export const EMPTY_CONDITION: Condition = { mode: 'all', clauses: [] };

/** Rule rows: `[variable] [≥] [5]`, combined with "all" or "any". */
export default function ConditionEditor({
  condition,
  onChange,
  emptyText = 'Always',
}: {
  condition: Condition | undefined;
  onChange: (c: Condition) => void;
  emptyText?: string;
}) {
  const variables = useFlowStore((s) => s.variables);
  const classes = useFlowStore((s) => s.classes);
  const cond = condition ?? EMPTY_CONDITION;
  const typeOf = (varId: string) => variables.find((v) => v.id === varId)?.type;

  const setClauses = (clauses: Clause[]) => onChange({ ...cond, clauses });
  const update = (id: string, patch: Partial<Clause>) =>
    setClauses(cond.clauses.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const changeVar = (cl: Clause, varId: string) => {
    const t = typeOf(varId) ?? 'number';
    update(cl.id, { varId, cmp: CMPS[t][0].cmp, value: t === 'number' ? 1 : t === 'bool' ? true : '' });
  };

  const add = () => {
    const v = variables[0];
    const t = v?.type ?? 'number';
    setClauses([
      ...cond.clauses,
      { id: newId(), varId: v?.id ?? '', cmp: CMPS[t][0].cmp, value: t === 'number' ? 1 : t === 'bool' ? true : '' },
    ]);
  };

  return (
    <div className="space-y-1">
      {cond.clauses.length === 0 && <div className="text-[11px] text-gray-500 italic">{emptyText}</div>}
      {cond.clauses.length > 1 && (
        <div className="flex items-center gap-1 text-[11px] text-gray-400">
          Match
          <select
            value={cond.mode}
            onChange={(e) => onChange({ ...cond, mode: e.target.value as Condition['mode'] })}
            onMouseDown={stop}
            className={fieldCls}
          >
            <option value="all">all rules</option>
            <option value="any">any rule</option>
          </select>
        </div>
      )}
      {cond.clauses.map((cl) => {
        if (cl.kind === 'class') {
          return (
            <div key={cl.id} className="flex items-center gap-1">
              <span className="text-[11px] text-accent-classpick font-medium px-1">Class</span>
              <select
                value={cl.cmp === '!=' ? '!=' : '=='}
                onChange={(e) => update(cl.id, { cmp: e.target.value as Cmp })}
                onMouseDown={stop}
                className={fieldCls}
              >
                <option value="==">is</option>
                <option value="!=">is not</option>
              </select>
              <ClassSelect value={cl.classId} classes={classes} onChange={(classId) => update(cl.id, { classId })} />
              <RemoveButton onClick={() => setClauses(cond.clauses.filter((c) => c.id !== cl.id))} title="Remove this rule" />
            </div>
          );
        }
        const t = typeOf(cl.varId);
        return (
          <div key={cl.id} className="flex items-center gap-1">
            <VarSelect value={cl.varId} variables={variables} onChange={(id) => changeVar(cl, id)} />
            {cl.varId && (
              <>
                <select
                  value={cl.cmp}
                  onChange={(e) => update(cl.id, { cmp: e.target.value as Cmp })}
                  onMouseDown={stop}
                  className={fieldCls}
                >
                  {CMPS[t ?? 'number'].map((o) => (
                    <option key={o.cmp} value={o.cmp}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <VarValueInput type={t} value={cl.value} onChange={(value) => update(cl.id, { value })} />
              </>
            )}
            <RemoveButton onClick={() => setClauses(cond.clauses.filter((c) => c.id !== cl.id))} title="Remove this rule" />
          </div>
        );
      })}
      <div className="flex items-center gap-3">
        <button onClick={add} className="text-[11px] text-accent-condition hover:text-white">
          + rule
        </button>
        {classes.length > 0 && (
          <button
            onClick={() =>
              setClauses([...cond.clauses, { id: newId(), kind: 'class', classId: classes.find((c) => !c.parentId)?.id ?? classes[0].id, cmp: '==', varId: '', value: '' }])
            }
            className="text-[11px] text-accent-classpick hover:text-white"
            title="Only when the reader is (or isn't) a class — a class includes its sub-classes"
          >
            + class rule
          </button>
        )}
      </div>
    </div>
  );
}
