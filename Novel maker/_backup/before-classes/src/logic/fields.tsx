// Small shared form controls for variable rules inside nodes and panels.
// Every control is `nodrag` and stops mouse-down so React Flow doesn't start
// dragging the node while you edit.

import { useState } from 'react';
import { useFlowStore } from '../store';
import type { VariableDef, VarType, VarValue } from '../types';

export const fieldCls =
  'bg-ink-900 border border-ink-600 text-white text-xs px-1.5 py-1 rounded focus:outline-none focus:border-accent-condition nodrag';

export const stop = (e: React.MouseEvent) => e.stopPropagation();

export const TYPE_LABEL: Record<VarType, string> = { bool: 'yes/no', number: 'number', text: 'text' };

/** Value editor that matches a variable's type. */
export function VarValueInput({
  type,
  value,
  onChange,
  className = '',
}: {
  type: VarType | undefined;
  value: VarValue | undefined;
  onChange: (v: VarValue) => void;
  className?: string;
}) {
  if (type === 'bool') {
    return (
      <select
        value={value === true ? 'true' : 'false'}
        onChange={(e) => onChange(e.target.value === 'true')}
        onMouseDown={stop}
        className={`${fieldCls} ${className}`}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }
  if (type === 'number') {
    return (
      <input
        type="number"
        value={typeof value === 'number' ? value : Number(value) || 0}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        onMouseDown={stop}
        className={`${fieldCls} w-16 ${className}`}
      />
    );
  }
  return (
    <input
      value={value == null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value)}
      onMouseDown={stop}
      placeholder="text"
      className={`${fieldCls} w-20 ${className}`}
    />
  );
}

const NEW = '__new__';

/** Variable picker with an inline "+ new variable" option. */
export function VarSelect({
  value,
  variables,
  onChange,
}: {
  value: string;
  variables: VariableDef[];
  onChange: (varId: string) => void;
}) {
  const [creating, setCreating] = useState(variables.length === 0);
  const missing = value && !variables.some((v) => v.id === value);

  if (creating) {
    return (
      <QuickVarCreate
        onCreated={(id) => {
          setCreating(false);
          onChange(id);
        }}
        onCancel={variables.length ? () => setCreating(false) : undefined}
      />
    );
  }
  return (
    <select
      value={value}
      onChange={(e) => (e.target.value === NEW ? setCreating(true) : onChange(e.target.value))}
      onMouseDown={stop}
      className={`${fieldCls} min-w-0 flex-1 ${missing ? 'border-accent text-accent' : ''}`}
    >
      {missing && <option value={value}>(deleted variable)</option>}
      {!value && <option value="">— variable —</option>}
      {variables.map((v) => (
        <option key={v.id} value={v.id}>
          {v.name || '(unnamed)'}
        </option>
      ))}
      <option value={NEW}>＋ new variable…</option>
    </select>
  );
}

/** Name + type + Add, used when no variable exists yet or "+ new" is picked. */
export function QuickVarCreate({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel?: () => void }) {
  const addVariable = useFlowStore((s) => s.addVariable);
  const updateVariable = useFlowStore((s) => s.updateVariable);
  const [name, setName] = useState('');
  const [type, setType] = useState<VarType>('number');
  const create = () => {
    const id = addVariable(type);
    const clean = name.trim().replace(/\s+/g, '_');
    if (clean) updateVariable(id, { name: clean });
    onCreated(id);
  };
  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') create();
          if (e.key === 'Escape' && onCancel) onCancel();
        }}
        onMouseDown={stop}
        placeholder="new variable, e.g. trust_mira"
        className={`${fieldCls} min-w-0 flex-1`}
      />
      <select value={type} onChange={(e) => setType(e.target.value as VarType)} onMouseDown={stop} className={fieldCls}>
        <option value="number">number</option>
        <option value="bool">yes/no</option>
        <option value="text">text</option>
      </select>
      <button onClick={create} className="text-xs px-1.5 py-1 rounded bg-accent-condition/80 hover:bg-accent-condition text-ink-900 font-semibold">
        Add
      </button>
      {onCancel && (
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-white px-1" title="Cancel">
          ✕
        </button>
      )}
    </div>
  );
}

export function RemoveButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="text-gray-500 hover:text-danger hover:bg-danger/15 rounded w-5 h-5 text-[10px] flex-shrink-0"
    >
      ✕
    </button>
  );
}
