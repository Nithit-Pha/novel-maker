// End-of-playthrough overlays: "Your route" (timeline of decisions) and
// "Endings found" (gallery). Pure views over the player's history.

import { Check, Lock, RotateCcw, X } from 'lucide-react';
import type { ChanceData, Choice, ClassPickData, DecisionData, LoopData, NodeKind } from '../types';
import type { Project } from '../project';
import { choiceState, classOptions, className, currentNode, describeCondition, type PlayState, type StoryIndex } from '../engine';
import type { RouteAction } from '../analysis/explore';
import { endingLabels } from '../analysis/explore';
import { NODE_ICONS } from '../ui/icons';

export type OptionStatus = 'taken' | 'skipped' | 'locked';

export interface RecapRow {
  kind: NodeKind;
  title: string;
  options: { label: string; status: OptionStatus; reason?: string }[];
}

/** One row per decision passed (plus loop picks and revealed Chance results). */
export function buildRecap(
  project: Project,
  index: StoryIndex,
  history: PlayState[],
  actions: RouteAction[]
): RecapRow[] {
  const rows: RecapRow[] = [];
  history.forEach((s, i) => {
    const node = currentNode(index, s);
    const a = actions[i];
    if (!node || !a) return;
    if (node.type === 'decision' && a.type === 'choose') {
      const d = node.data as DecisionData;
      rows.push({
        kind: 'decision',
        title: d.prompt || 'Decision',
        options: d.choices.flatMap((c: Choice) => {
          const st = choiceState(c, s.vars);
          if (!st.visible) return [];
          const status: OptionStatus = c.id === a.choiceId ? 'taken' : st.available ? 'skipped' : 'locked';
          return [
            {
              label: c.label || '(empty choice)',
              status,
              reason:
                status === 'locked'
                  ? c.lockedText?.trim() || `Requires ${describeCondition(c.condition, project.variables, project.classes)}`
                  : undefined,
            },
          ];
        }),
      });
    } else if (node.type === 'classpick' && a.type === 'class') {
      const d = node.data as ClassPickData;
      rows.push({
        kind: 'classpick',
        title: d.title?.trim() || (d.mode === 'subclass' ? 'Sub-class' : 'Class'),
        options: classOptions(index, s, node).map((c) => ({
          label: className(project.classes, c.id),
          status: (c.id === a.classId ? 'taken' : 'skipped') as OptionStatus,
        })),
      });
    } else if (node.type === 'loop' && a.type === 'item') {
      const d = node.data as LoopData;
      const done = s.progress[node.id] ?? [];
      rows.push({
        kind: 'loop',
        title: d.title || 'Loop',
        options: d.items
          .filter((it) => !done.includes(it.id))
          .map((it) => ({ label: it.label || '(item)', status: (it.id === a.itemId ? 'taken' : 'skipped') as OptionStatus })),
      });
    } else if (node.type === 'chance' && s.roll) {
      const d = node.data as ChanceData;
      rows.push({
        kind: 'chance',
        title: d.title || 'Chance',
        options: d.outcomes.map((o) => ({ label: o.label || '(outcome)', status: (o.id === s.roll!.outcomeId ? 'taken' : 'skipped') as OptionStatus })),
      });
    }
  });
  return rows;
}

// ---------------------------------------------------------------------------
// Endings gallery storage (per project, this browser)
// ---------------------------------------------------------------------------

const key = (title: string) => `novel-flow-endings:${title}`;

export function readSeenEndings(title: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key(title)) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function markEndingSeen(title: string, nodeId: string): string[] {
  const seen = readSeenEndings(title);
  if (!seen.includes(nodeId)) seen.push(nodeId);
  try {
    localStorage.setItem(key(title), JSON.stringify(seen));
  } catch {
    /* ignore */
  }
  return seen;
}
export function resetSeenEndings(title: string) {
  try {
    localStorage.removeItem(key(title));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Overlay
// ---------------------------------------------------------------------------

export function RecapOverlay({
  project,
  rows,
  seen,
  tab,
  onTab,
  onClose,
  onReset,
}: {
  project: Project;
  rows: RecapRow[];
  seen: string[];
  tab: 'route' | 'endings';
  onTab: (t: 'route' | 'endings') => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const endings = [...endingLabels(project)];
  const found = endings.filter(([id]) => seen.includes(id)).length;
  return (
    <div className="fixed inset-0 z-[1100] bg-black/25 flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Your route" className="nf-panel animate-pop w-full max-w-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-border">
          {(['route', 'endings'] as const).map((t) => (
            <button
              key={t}
              onClick={() => onTab(t)}
              className={`text-[13.5px] px-2.5 py-2.5 border-b-2 -mb-px ${tab === t ? 'border-accent text-fg font-semibold' : 'border-transparent text-muted hover:text-fg'}`}
            >
              {t === 'route' ? 'Your route' : `Endings found ${found} / ${endings.length}`}
            </button>
          ))}
          <div className="flex-1" />
          <button className="nf-icon-btn" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          {tab === 'route' ? (
            rows.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">No choices on this route — the story led straight here.</p>
            ) : (
              <ol className="relative border-l-2 border-border ml-2 space-y-5">
                {rows.map((r, i) => {
                  const Icon = NODE_ICONS[r.kind];
                  return (
                    <li key={i} className={`nf-kind-${r.kind} pl-5 relative`}>
                      <span className="absolute -left-[11px] top-0.5 w-5 h-5 rounded-full bg-surface border-2 border-node flex items-center justify-center">
                        <Icon size={10} className="text-node" />
                      </span>
                      <p className="font-story text-[15.5px] text-fg leading-snug mb-2">{r.title}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {r.options.map((o, j) => (
                          <span
                            key={j}
                            title={o.reason}
                            className={`inline-flex items-center gap-1 text-[12.5px] rounded-full px-2.5 py-1 border ${
                              o.status === 'taken'
                                ? 'bg-node text-surface border-node font-medium'
                                : o.status === 'locked'
                                ? 'bg-sunken text-faint border-border'
                                : 'bg-surface text-muted border-border'
                            }`}
                          >
                            {o.status === 'taken' && <Check size={12} />}
                            {o.status === 'locked' && <Lock size={11} />}
                            {o.label}
                          </span>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )
          ) : endings.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">This story has no Ending cards yet.</p>
          ) : (
            <>
              <ul className="grid sm:grid-cols-2 gap-2">
                {endings.map(([id, e]) => {
                  const got = seen.includes(id);
                  return (
                    <li
                      key={id}
                      className={`rounded-xl border px-3.5 py-3 ${got ? 'border-border bg-surface' : 'border-dashed border-border-strong bg-sunken'}`}
                    >
                      <div className={`font-story text-[15px] ${got ? 'text-fg' : 'text-faint'}`}>{got ? e.label : '???'}</div>
                      <div className="text-[11.5px] text-faint mt-0.5">{got ? 'Found' : 'Not found yet'}</div>
                    </li>
                  );
                })}
              </ul>
              <button onClick={onReset} className="nf-btn mt-4 !text-xs" title="Forget which endings were found (this browser)">
                <RotateCcw size={13} /> Reset found endings
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
