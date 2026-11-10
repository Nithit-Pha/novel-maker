import { useMemo, useState } from 'react';
import type { Node } from '@xyflow/react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Info,
  ListChecks,
  Loader2,
  Play,
  X,
} from 'lucide-react';
import { snapshotProject, useFlowStore } from '../store';
import { className } from '../engine';
import type { NodeData, NodeKind } from '../types';
import { NODE_ICONS } from '../ui/icons';
import { nodeTitle } from '../search';
import { useUi } from '../ui/uiStore';
import { STATE_LIMIT, type EndingResult, type Route } from './explore';
import { SEVERITY_ORDER, type Issue, type Severity } from './validate';

type N = Node<NodeData>;

const SEV: Record<Severity, { label: string; icon: typeof AlertCircle; cls: string }> = {
  error: { label: 'Errors', icon: AlertCircle, cls: 'text-danger' },
  warning: { label: 'Warnings', icon: AlertTriangle, cls: 'text-warning' },
  note: { label: 'Notes', icon: Info, cls: 'text-muted' },
};

function trunc(s: string | undefined, n = 60) {
  const t = (s ?? '').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/** Right-side panel: Problems (structural + explorer) and Routes (endings). */
export default function StoryCheckPanel() {
  const tab = useUi((s) => s.checkTab);
  const issues = useUi((s) => s.issues);
  const close = useUi((s) => s.closeCheck);
  const open = useUi((s) => s.openCheck);
  const counts = useMemo(() => {
    const c: Record<Severity, number> = { error: 0, warning: 0, note: 0 };
    issues.forEach((i) => c[i.severity]++);
    return c;
  }, [issues]);

  return (
    <aside
      className="absolute top-0 right-0 h-full w-[400px] max-w-[94vw] bg-surface border-l border-border flex flex-col z-20 animate-pop"
      style={{ boxShadow: 'var(--shadow-lg)' }}
      aria-label="Story check"
    >
      <div className="flex items-center px-4 py-3 border-b border-border flex-shrink-0">
        <ListChecks size={18} className="text-accent mr-2" />
        <h2 className="font-story text-lg text-fg flex-1">Story check</h2>
        <button onClick={close} className="nf-icon-btn" aria-label="Close story check">
          <X size={17} />
        </button>
      </div>
      <div className="flex border-b border-border flex-shrink-0">
        {(['problems', 'routes'] as const).map((t) => (
          <button
            key={t}
            onClick={() => open(t)}
            className={`flex-1 text-sm py-2.5 border-b-2 transition-colors ${
              tab === t ? 'text-fg border-accent font-semibold' : 'text-muted border-transparent hover:text-fg'
            }`}
          >
            {t === 'problems' ? `Problems${counts.error + counts.warning ? ` (${counts.error + counts.warning})` : ''}` : 'Routes'}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">{tab === 'problems' ? <Problems issues={issues} /> : <Routes />}</div>
    </aside>
  );
}

function useLookup() {
  const project = snapshotProject(useFlowStore.getState());
  // re-render on content changes
  useFlowStore((s) => s.nodes);
  useFlowStore((s) => s.graphs);
  const nodes = new Map<string, { node: N; arcId: string; arcName: string }>();
  for (const a of project.arcs) for (const n of a.nodes as N[]) nodes.set(n.id, { node: n, arcId: a.id, arcName: a.name });
  return { project, nodes };
}

function CardRef({ node, arcName }: { node: N; arcName: string }) {
  const Icon = NODE_ICONS[node.data.kind as NodeKind];
  return (
    <span className={`nf-kind-${node.data.kind} inline-flex items-center gap-1 text-[11.5px] text-muted min-w-0`}>
      <Icon size={12} className="text-node flex-shrink-0" />
      <span className="truncate">{trunc(nodeTitle(node), 40)}</span>
      <span className="text-faint flex-shrink-0">· {arcName}</span>
    </span>
  );
}

function Problems({ issues }: { issues: Issue[] }) {
  const { nodes, project } = useLookup();
  const focusNode = useUi((s) => s.focusNode);
  if (issues.length === 0) {
    return (
      <div className="p-8 text-center">
        <CheckCircle2 size={30} className="mx-auto text-success mb-3" strokeWidth={1.7} />
        <p className="font-story text-lg text-fg">No problems found</p>
        <p className="text-sm text-muted mt-1">Every route is connected and every rule points to a real variable.</p>
      </div>
    );
  }
  const arcName = (id?: string) => project.arcs.find((a) => a.id === id)?.name ?? '';
  return (
    <div className="p-3 space-y-4">
      {SEVERITY_ORDER.map((sev) => {
        const list = issues.filter((i) => i.severity === sev);
        if (!list.length) return null;
        const S = SEV[sev];
        return (
          <section key={sev}>
            <h3 className={`text-[11px] uppercase tracking-wider font-semibold mb-1.5 px-1 flex items-center gap-1.5 ${S.cls}`}>
              <S.icon size={13} /> {S.label} · {list.length}
            </h3>
            <div className="space-y-1">
              {list.map((i) => {
                const ref = i.nodeId ? nodes.get(i.nodeId) : undefined;
                const clickable = !!ref;
                return (
                  <button
                    key={i.id}
                    disabled={!clickable}
                    onClick={() => ref && focusNode(ref.arcId, ref.node.id)}
                    className="w-full text-left rounded-lg px-2.5 py-2 hover:bg-surface-2 disabled:hover:bg-transparent disabled:cursor-default transition-colors flex gap-2"
                  >
                    <S.icon size={15} className={`${S.cls} flex-shrink-0 mt-0.5`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-fg-soft leading-snug">{i.message}</span>
                      {ref ? (
                        <CardRef node={ref.node} arcName={ref.arcName} />
                      ) : i.arcId ? (
                        <span className="text-[11.5px] text-faint">{arcName(i.arcId)}</span>
                      ) : null}
                    </span>
                    {clickable && <Crosshair size={14} className="text-faint flex-shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function routesText(e: EndingResult, loops: boolean) {
  if (!e.reachable) return '';
  const n = e.routes >= 1e9 ? '1,000,000,000' : e.routes.toLocaleString();
  return `${n}${loops ? '+' : ''} route${e.routes === 1 && !loops ? '' : 's'}`;
}

function Routes() {
  const result = useUi((s) => s.explore);
  const exploring = useUi((s) => s.exploring);
  const { project } = useLookup();
  const startName = project.arcs.find((a) => a.id === result?.startArcId)?.name ?? project.arcs[0]?.name;

  if (!result) {
    return (
      <div className="p-8 text-center text-muted flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin" /> Exploring every route…
      </div>
    );
  }
  const reachable = result.endings.filter((e) => e.reachable).length;
  return (
    <div className="p-3 space-y-3">
      <div className="px-1">
        <p className="text-[13px] text-fg-soft">
          From the start of <b>{startName}</b>:{' '}
          <b>
            {reachable} of {result.endings.length}
          </b>{' '}
          ending{result.endings.length === 1 ? '' : 's'} reachable.
        </p>
        <p className="text-[11.5px] text-faint mt-0.5 flex items-center gap-1.5">
          {exploring && <Loader2 size={11} className="animate-spin" />}
          {result.states.toLocaleString()} situations explored
          {exploring ? ' · updating…' : ''}
        </p>
      </div>
      {result.truncated && (
        <Callout tone="warning">
          Stopped after {STATE_LIMIT.toLocaleString()} situations, so endings marked “not found” might still be reachable.
          (Variables that grow without limit often cause this.)
        </Callout>
      )}
      {result.hasLoops && (
        <Callout tone="note">Some routes can loop back to an identical moment, so route counts are shown as minimums (“N+”).</Callout>
      )}
      {result.openEnds > 0 && (
        <Callout tone="note">
          {result.openEnds.toLocaleString()} route{result.openEnds === 1 ? '' : 's'} stop on a card without an Ending — see Problems.
        </Callout>
      )}
      {result.endings.length === 0 ? (
        <p className="text-sm text-muted italic px-1">No Ending cards yet. Add one from ➕ More → Ending.</p>
      ) : (
        result.endings.map((e) => <EndingRow key={e.nodeId} e={e} loops={result.hasLoops} truncated={result.truncated} />)
      )}
    </div>
  );
}

function Callout({ tone, children }: { tone: 'warning' | 'note'; children: React.ReactNode }) {
  return (
    <div
      className={`text-[12.5px] leading-snug rounded-lg px-3 py-2 border ${
        tone === 'warning' ? 'bg-warning/10 border-warning/30 text-fg-soft' : 'bg-sunken border-border text-muted'
      }`}
    >
      {children}
    </div>
  );
}

function EndingRow({ e, loops, truncated }: { e: EndingResult; loops: boolean; truncated: boolean }) {
  const [open, setOpen] = useState(false);
  const focusNode = useUi((s) => s.focusNode);
  const playRoute = useUi((s) => s.requestPlayRoute);
  const { project, nodes } = useLookup();
  const arcName = project.arcs.find((a) => a.id === e.arcId)?.name ?? '';
  const choices = e.shortest?.steps.filter((s) => s.action.type !== 'next').length ?? 0;
  return (
    <div className="rounded-xl border border-border bg-sunken/60">
      <div className="flex items-start gap-2 p-3">
        <div className="min-w-0 flex-1">
          <div className="font-story text-[15.5px] text-fg leading-snug">{e.label}</div>
          <div className="text-[11.5px] text-faint">{arcName}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {e.reachable ? (
              <span className="text-[11px] rounded-full px-2 py-0.5 bg-success/15 text-success font-medium">reachable</span>
            ) : (
              <span className="text-[11px] rounded-full px-2 py-0.5 bg-warning/15 text-warning font-medium">
                {truncated ? 'not found yet' : 'not reachable'}
              </span>
            )}
            {e.reachable && <span className="text-[11.5px] text-muted">{routesText(e, loops)}</span>}
          </div>
          {e.classes && e.classes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1 nf-kind-classpick" title="Classes that can reach this ending">
              {e.classes.map((c) => (
                <span key={c} className="text-[11px] rounded-full px-2 py-0.5 border border-node/40 text-node">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
        <button className="nf-icon-btn" title="Jump to this ending" aria-label="Jump to this ending" onClick={() => focusNode(e.arcId, e.nodeId)}>
          <Crosshair size={15} />
        </button>
        {e.shortest && (
          <button
            className="nf-btn nf-btn-outline nf-kind-chapter !h-8"
            title="Play the shortest route to this ending"
            onClick={() => playRoute(e.shortest!)}
          >
            <Play size={13} className="text-node" fill="currentColor" /> Play
          </button>
        )}
      </div>
      {e.shortest && (
        <div className="border-t border-border">
          <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-1 px-3 py-2 text-[12px] text-muted hover:text-fg">
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            Shortest route · {choices} step{choices === 1 ? '' : 's'}
          </button>
          {open && <RouteSteps route={e.shortest} nodes={nodes} />}
        </div>
      )}
      {!e.reachable && !truncated && (
        <p className="border-t border-border px-3 py-2 text-[12px] text-muted">
          {project.arcs.length && nodes.get(e.nodeId)
            ? 'No route gets here: check what leads to this card and the rules (locks, Condition branches) on the way.'
            : ''}
        </p>
      )}
    </div>
  );
}

function RouteSteps({ route, nodes }: { route: Route; nodes: Map<string, { node: N; arcId: string; arcName: string }> }) {
  const classes = useFlowStore((s) => s.classes);
  const rows: { key: string; kind: NodeKind; title: string; pick: string }[] = [];
  const addRolls = (rolls: Route['initialRolls'], key: string) =>
    rolls.forEach((r, i) => {
      const n = nodes.get(r.nodeId)?.node;
      if (!n || n.data.kind !== 'chance') return;
      rows.push({
        key: `${key}-r${i}`,
        kind: 'chance',
        title: n.data.title || 'Chance',
        pick: n.data.outcomes.find((o) => o.id === r.outcomeId)?.label || 'outcome',
      });
    });
  addRolls(route.initialRolls, 'init');
  route.steps.forEach((s, i) => {
    const n = nodes.get(s.nodeId)?.node;
    if (n && s.action.type === 'choose' && n.data.kind === 'decision') {
      const id = s.action.choiceId;
      rows.push({ key: `s${i}`, kind: 'decision', title: n.data.prompt || 'Decision', pick: n.data.choices.find((c) => c.id === id)?.label || 'choice' });
    } else if (n && s.action.type === 'class' && n.data.kind === 'classpick') {
      const id = s.action.classId;
      rows.push({ key: `s${i}`, kind: 'classpick', title: n.data.title || (n.data.mode === 'subclass' ? 'Sub-class' : 'Class'), pick: className(classes, id) });
    } else if (n && s.action.type === 'item' && n.data.kind === 'loop') {
      const id = s.action.itemId;
      rows.push({ key: `s${i}`, kind: 'loop', title: n.data.title || 'Loop', pick: n.data.items.find((it) => it.id === id)?.label || 'item' });
    }
    addRolls(s.rolls, `s${i}`);
  });
  if (rows.length === 0) return <p className="px-3 pb-3 text-[12px] text-muted">No choices needed — the story leads straight here.</p>;
  return (
    <ol className="px-3 pb-3 space-y-1.5">
      {rows.map((r, i) => {
        const Icon = NODE_ICONS[r.kind];
        return (
          <li key={r.key} className={`nf-kind-${r.kind} flex gap-2 text-[12.5px]`}>
            <span className="w-5 text-right text-faint flex-shrink-0">{i + 1}.</span>
            <Icon size={13} className="text-node flex-shrink-0 mt-0.5" />
            <span className="min-w-0">
              <span className="text-muted">{trunc(r.title, 50)}</span> <span className="text-faint">→</span>{' '}
              <span className="text-fg font-medium">{r.pick}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
