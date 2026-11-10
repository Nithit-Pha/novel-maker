// The reader's Status panel (items / abilities / power), used by the Status card
// and the HUD slot in Run mode. What it shows comes from statusView() in
// runtime/core.js, so the exported HTML always shows the same thing.

import type { StatusGroup, StatusRow } from '../engine';

function Row({ row, compact }: { row: StatusRow; compact?: boolean }) {
  const icon = row.icon ? <span className="w-5 text-center flex-shrink-0" aria-hidden>{row.icon}</span> : null;
  if (row.max != null) {
    const v = Number(row.value) || 0;
    const pct = Math.max(0, Math.min(100, (v / row.max) * 100));
    return (
      <li className={compact ? 'py-1' : 'py-1.5'}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="flex-1 min-w-0 truncate text-fg">{row.label}</span>
          <span className="text-muted tabular-nums text-[0.9em]">
            {v} / {row.max}
          </span>
        </div>
        <div
          className="mt-1 h-1.5 rounded-full bg-sunken overflow-hidden"
          role="meter"
          aria-label={row.label}
          aria-valuemin={0}
          aria-valuemax={row.max}
          aria-valuenow={v}
        >
          <div className="h-full rounded-full bg-node transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      </li>
    );
  }
  return (
    <li className={`flex items-center gap-2 ${compact ? 'py-1' : 'py-1.5'}`}>
      {icon}
      <span className="flex-1 min-w-0 truncate text-fg">{row.label}</span>
      {row.type !== 'bool' && <span className="text-fg-soft tabular-nums truncate max-w-[50%] text-right">{String(row.value)}</span>}
    </li>
  );
}

/** Groups with their rows. `hideEmpty` skips groups that have nothing (HUD). */
export default function StatusPanel({
  groups,
  compact,
  hideEmpty,
  classLine,
  who,
}: {
  groups: StatusGroup[];
  compact?: boolean;
  hideEmpty?: boolean;
  /** "🔥 Mage · Pyromancer" — the reader's class, shown first. */
  classLine?: string;
  /** The main character ("you"), shown at the very top. */
  who?: { name: string; image?: string };
}) {
  const list = hideEmpty ? groups.filter((g) => g.rows.length) : groups;
  const me = who ? (
    <div className={`flex items-center gap-2.5 ${compact ? 'text-[14px]' : 'text-[19px]'}`}>
      {who.image ? (
        <img src={who.image} alt="" className={`${compact ? 'w-8 h-8' : 'w-11 h-11'} rounded-full object-cover border border-border flex-shrink-0`} />
      ) : (
        <span
          className={`${compact ? 'w-8 h-8 text-[13px]' : 'w-11 h-11 text-[17px]'} rounded-full bg-sunken border border-border flex items-center justify-center text-muted flex-shrink-0`}
          aria-hidden
        >
          {who.name.trim().charAt(0).toUpperCase() || '?'}
        </span>
      )}
      <span className="font-story text-fg truncate">{who.name}</span>
    </div>
  ) : null;
  const cls = classLine ? (
    <div className={`nf-kind-classpick flex items-center gap-2 ${compact ? 'text-[13.5px]' : 'text-[17px]'}`}>
      <span className={`text-node font-semibold uppercase tracking-[0.2em] ${compact ? 'text-[10px]' : 'text-[11px]'}`}>Class</span>
      <span className="text-fg font-medium truncate">{classLine}</span>
    </div>
  ) : null;
  if (list.length === 0)
    return (
      <div className="space-y-3">
        {me}
        {cls}
        {!cls && <p className="text-muted text-sm italic">Nothing yet.</p>}
      </div>
    );
  return (
    <div className={`nf-kind-status ${compact ? 'space-y-3 text-[13.5px]' : 'space-y-5 text-[16px]'}`}>
      {me}
      {cls}
      {list.map((g) => (
        <section key={g.name}>
          <h3 className={`text-node font-semibold uppercase tracking-[0.2em] ${compact ? 'text-[10px] mb-1' : 'text-[11px] mb-2'}`}>{g.name}</h3>
          {g.rows.length === 0 ? (
            <p className="text-muted text-sm italic">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {g.rows.map((r) => (
                <Row key={r.id} row={r} compact={compact} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
