import { useFlowStore } from '../store';
import { newId } from '../project';
import { defaultValue } from '../engine';
import type { Effect, EffectOp, VarType } from '../types';
import { RemoveButton, VarSelect, VarValueInput, fieldCls, stop } from './fields';
import ClassSelect from './ClassSelect';

const OPS: Record<VarType, { op: EffectOp; label: string }[]> = {
  number: [
    { op: 'add', label: '+=' },
    { op: 'sub', label: '−=' },
    { op: 'set', label: '=' },
  ],
  bool: [
    { op: 'set', label: '=' },
    { op: 'toggle', label: 'toggle' },
  ],
  text: [{ op: 'set', label: '=' }],
};

/** Edit a list of variable changes, e.g. `trust_mira += 1`, `has_key = true`. */
export default function EffectsEditor({
  effects,
  onChange,
  addLabel = '+ change a variable',
  allowBecome = true,
}: {
  effects: Effect[] | undefined;
  onChange: (effects: Effect[]) => void;
  addLabel?: string;
  /** Offer "+ become a class" (off inside a class's own effects). */
  allowBecome?: boolean;
}) {
  const variables = useFlowStore((s) => s.variables);
  const classes = useFlowStore((s) => s.classes);
  const list = effects ?? [];
  const typeOf = (varId: string) => variables.find((v) => v.id === varId)?.type;

  const update = (id: string, patch: Partial<Effect>) =>
    onChange(list.map((fx) => (fx.id === id ? { ...fx, ...patch } : fx)));

  const changeVar = (fx: Effect, varId: string) => {
    const t = typeOf(varId) ?? 'number';
    update(fx.id, { varId, op: OPS[t][0].op, value: t === 'number' ? 1 : t === 'bool' ? true : '' });
  };

  const add = () => {
    const v = variables[0];
    const t = v?.type ?? 'number';
    onChange([
      ...list,
      { id: newId(), varId: v?.id ?? '', op: OPS[t][0].op, value: t === 'number' ? 1 : t === 'bool' ? true : defaultValue(t) },
    ]);
  };

  return (
    <div className="space-y-1">
      {list.map((fx) => {
        if (fx.op === 'become') {
          return (
            <div key={fx.id} className="flex items-center gap-1">
              <span className="text-[11px] text-accent-classpick font-medium px-1">Become</span>
              <ClassSelect value={typeof fx.value === 'string' ? fx.value : ''} classes={classes} onChange={(value) => update(fx.id, { value })} />
              <RemoveButton onClick={() => onChange(list.filter((x) => x.id !== fx.id))} title="Remove this change" />
            </div>
          );
        }
        const t = typeOf(fx.varId);
        return (
          <div key={fx.id} className="flex items-center gap-1">
            <VarSelect value={fx.varId} variables={variables} onChange={(id) => changeVar(fx, id)} />
            {fx.varId && (
              <>
                <select
                  value={fx.op}
                  onChange={(e) => update(fx.id, { op: e.target.value as EffectOp })}
                  onMouseDown={stop}
                  className={fieldCls}
                >
                  {OPS[t ?? 'number'].map((o) => (
                    <option key={o.op} value={o.op}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {fx.op !== 'toggle' && (
                  <VarValueInput
                    type={fx.op === 'add' || fx.op === 'sub' ? 'number' : t}
                    value={fx.value}
                    onChange={(value) => update(fx.id, { value })}
                  />
                )}
              </>
            )}
            <RemoveButton onClick={() => onChange(list.filter((x) => x.id !== fx.id))} title="Remove this change" />
          </div>
        );
      })}
      <div className="flex items-center gap-3">
        <button onClick={add} className="text-[11px] text-accent-condition hover:text-white">
          {addLabel}
        </button>
        {allowBecome && classes.length > 0 && (
          <button
            onClick={() => onChange([...list, { id: newId(), varId: '', op: 'become', value: classes.find((c) => !c.parentId)?.id ?? classes[0].id }])}
            className="text-[11px] text-accent-classpick hover:text-white"
            title="The reader becomes a class (its effects run). A sub-class while already in its class = promotion."
          >
            + become a class
          </button>
        )}
      </div>
    </div>
  );
}
