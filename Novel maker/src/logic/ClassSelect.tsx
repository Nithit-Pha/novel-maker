import type { ClassDef } from '../types';
import { fieldCls, stop } from './fields';

/** Dropdown of classes, each followed by its sub-classes (indented). */
export default function ClassSelect({
  value,
  classes,
  onChange,
}: {
  value: string | undefined;
  classes: ClassDef[];
  onChange: (classId: string) => void;
}) {
  const top = classes.filter((c) => !c.parentId);
  const missing = !!value && !classes.some((c) => c.id === value);
  const label = (c: ClassDef) => `${c.icon ? c.icon + ' ' : ''}${c.name.trim() || '(unnamed class)'}`;
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      onMouseDown={stop}
      className={`${fieldCls} min-w-0 max-w-[150px] ${missing || !value ? '!border-danger/60' : ''}`}
      title={missing ? 'This class was deleted' : 'Class'}
    >
      {(!value || missing) && <option value={value ?? ''}>{missing ? '(deleted class)' : 'pick a class…'}</option>}
      {top.map((c) => [
        <option key={c.id} value={c.id}>
          {label(c)}
        </option>,
        ...classes
          .filter((s) => s.parentId === c.id)
          .map((s) => (
            <option key={s.id} value={s.id}>
              {'   ↳ '}
              {label(s)}
            </option>
          )),
      ])}
    </select>
  );
}
