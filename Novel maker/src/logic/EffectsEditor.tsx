import { useFlowStore } from '../store';
import { newId } from '../project';
import { defaultValue } from '../engine';
import type { Effect, EffectOp, VarType } from '../types';
import { RemoveButton, VarSelect, VarValueInput, fieldCls, stop } from './fields';

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
}: {
  effects: Effect[] | undefined;
  onChange: (effects: Effect[]) => void;
  addLabel?: string;
}) {
  const variables = useFlowStore((s) => s.variables);
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
      <button onClick={add} className="text-[11px] text-accent-condition hover:text-white">
        {addLabel}
      </button>
    </div>
  );
}
