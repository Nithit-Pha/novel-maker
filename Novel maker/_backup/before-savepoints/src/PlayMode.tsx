import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, FlaskConical, Lock, Map as MapIcon, RotateCcw, Trophy, X } from 'lucide-react';
import type {
  ChanceData,
  ChapterData,
  DecisionData,
  DialogData,
  EndData,
  LoopData,
  NodeKind,
  SceneData,
  VariableDef,
} from './types';
import type { Project } from './project';
import {
  buildIndex,
  choiceState,
  choose,
  currentNode,
  describeCondition,
  enterItem,
  hasNext,
  isWired,
  choiceHandle,
  itemHandle,
  next,
  startPlay,
  startAt,
  type PlayState,
  type Vars,
} from './engine';
import { replayRoute, type Route, type RouteAction } from './analysis/explore';
import { RecapOverlay, buildRecap, markEndingSeen, readSeenEndings, resetSeenEndings } from './play/RouteRecap';
import { VarValueInput } from './logic/fields';
import { NODE_ICONS } from './ui/icons';
import { useCharacterStore } from './library/characterStore';
import { sceneSrc, useSceneStore } from './library/sceneStore';

interface Props {
  project: Project;
  onClose: () => void;
  /** "Play from here": start at this card with these variable values (and the background showing there). */
  start?: { arcId: string; nodeId: string; vars: Vars; scene?: string | null };
  /** "Play this route": replay these steps first (Back still works). */
  route?: Route;
}

/** Full-screen reading view that plays the story (rules from runtime/core.js). */
export default function PlayMode({ project, onClose, start, route }: Props) {
  // All play rules come from runtime/core.js — the same code the exported HTML runs.
  const index = useMemo(() => buildIndex(project), [project]);
  const fresh = () =>
    start ? startAt(index, start.arcId, start.nodeId, start.vars, undefined, undefined, start.scene) : startPlay(index, project.activeArcId);

  // Replayed route → its states become the history, so Back walks through it.
  const replayed = useMemo(() => (route ? replayRoute(project, route) : null), [project, route]);
  const [state, setState] = useState<PlayState>(() => (replayed ? replayed[replayed.length - 1] : fresh()));
  const [history, setHistory] = useState<PlayState[]>(() => (replayed ? replayed.slice(0, -1) : []));
  /** actions[i] = what the reader did at history[i] (for the "Your route" recap). */
  const [actions, setActions] = useState<RouteAction[]>(() => (route ? route.steps.map((s) => s.action) : []));
  const [showVars, setShowVars] = useState(false);
  const [recap, setRecap] = useState<'route' | 'endings' | null>(null);
  const galleryKey = project.meta.title;
  const [seen, setSeen] = useState<string[]>(() => readSeenEndings(galleryKey));

  const arc = index.arcs[state.arcId];
  const current = currentNode(index, state);
  const edges = arc?.edges ?? [];
  const scenes = useSceneStore((s) => s.scenes);
  useSceneStore((s) => s.io);
  const sceneNow = state.scene ? scenes.find((x) => x.id === state.scene) : undefined;
  const bgSrc = sceneSrc(sceneNow);

  useEffect(() => {
    if (current?.type === 'end') setSeen(markEndingSeen(galleryKey, current.id));
  }, [current, galleryKey]);

  const go = (nextState: PlayState, action: RouteAction) => {
    if (nextState === state) return;
    setHistory((h) => [...h, state]);
    setActions((a) => [...a, action]);
    setState(nextState);
  };
  const goNext = () => go(next(index, state), { type: 'next' });
  const goBack = () => {
    if (history.length === 0) return;
    setState(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setActions((a) => a.slice(0, -1));
  };
  const restart = () => {
    setState(fresh());
    setHistory([]);
    setActions([]);
    setRecap(null);
  };
  const recapRows = useMemo(() => (recap ? buildRecap(project, index, history, actions) : []), [recap, project, index, history, actions]);

  // Keyboard: keep a ref to the latest handlers so the listener never goes stale.
  const keys = useRef({ goNext, goBack, onClose, current, recap, setRecap });
  keys.current = { goNext, goBack, onClose, current, recap, setRecap };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return;
      const k = keys.current;
      if (k.recap) {
        if (e.key === 'Escape') k.setRecap(null);
        return;
      }
      if (e.key === 'Escape') k.onClose();
      else if (e.key === 'ArrowLeft' || e.key === 'Backspace') k.goBack();
      else if (e.key === 'ArrowRight' || e.key === ' ') {
        const type = k.current?.type;
        if (type === 'chapter' || type === 'scene' || type === 'dialog' || type === 'chance') {
          e.preventDefault();
          k.goNext();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const noStory = !arc;
  const canNext = hasNext(index, state);
  const endingCount = useMemo(() => project.arcs.reduce((n, a) => n + a.nodes.filter((x) => x.type === 'end').length, 0), [project]);
  const foundCount = useMemo(
    () => project.arcs.reduce((n, a) => n + a.nodes.filter((x) => x.type === 'end' && seen.includes(x.id)).length, 0),
    [project, seen]
  );
  const endButtons = (
    <div className="flex flex-wrap justify-center gap-2">
      <button onClick={restart} className="nf-btn nf-btn-primary h-10 px-5">
        <RotateCcw size={15} /> Read again
      </button>
      <button onClick={() => setRecap('route')} className="nf-btn nf-btn-outline h-10 px-4">
        <MapIcon size={15} /> Your route
      </button>
      {endingCount > 0 && (
        <button onClick={() => setRecap('endings')} className="nf-btn nf-btn-outline h-10 px-4">
          <Trophy size={15} /> Endings {foundCount} / {endingCount}
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1000] nf-paper flex flex-col" role="dialog" aria-label="Story player">
      <div className="flex items-center justify-between gap-2 px-4 sm:px-6 h-14 border-b border-border bg-surface flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-story text-lg text-fg truncate">{project.meta.title}</span>
          <span className="text-muted text-[13px] whitespace-nowrap">
            {arc ? `${arc.name} · ` : ''}
            {current ? `step ${history.length + 1}` : `${history.length} steps`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {project.variables.length > 0 && (
            <button
              onClick={() => setShowVars((v) => !v)}
              className={`nf-btn ${showVars ? 'nf-btn-active' : ''}`}
              title="Show and tweak story variables while you playtest"
            >
              <FlaskConical size={15} />
              <span className="hidden sm:inline">Variables</span>
            </button>
          )}
          <button onClick={restart} className="nf-btn" title="Start over">
            <RotateCcw size={15} />
            <span className="hidden sm:inline">Restart</span>
          </button>
          <button onClick={onClose} className="nf-btn nf-btn-outline" title="Back to the editor (Esc)">
            <X size={15} />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative flex items-center justify-center px-5 sm:px-8 py-10 overflow-auto">
          <SceneBackdrop src={bgSrc} name={sceneNow?.name} />
          <div
            className={`relative w-full max-w-2xl ${bgSrc ? 'nf-reading-panel' : ''}`}
            key={`${state.arcId}:${state.currentId}:${history.length}`}
          >
            {noStory && (
              <div className="text-center text-muted">
                <h2 className="font-story text-2xl text-fg mb-2">No story to play</h2>
                <p>Add at least one card, then press Run again.</p>
              </div>
            )}

            {!noStory && !current && (
              <div className="text-center animate-fade-in">
                <div className="text-faint tracking-[0.5em] mb-4">❦</div>
                <h2 className="font-story text-4xl text-fg mb-3">The End</h2>
                <p className="text-muted mb-8">You reached the end of this path.</p>
                {endButtons}
              </div>
            )}

            {current?.type === 'chapter' && (
              <Card kind="chapter" kicker="Chapter" center>
                <h2 className="font-story text-4xl sm:text-5xl text-fg leading-tight mb-10">
                  {(current.data as ChapterData).name || <span className="text-faint">(untitled chapter)</span>}
                </h2>
                <NextButton onNext={goNext} hasNext={canNext} label="Begin" />
              </Card>
            )}
            {current?.type === 'scene' && (
              <Card kind="scene" kicker={(current.data as SceneData).background || sceneNow?.name || 'Scene'}>
                <p className="font-story text-2xl text-fg-soft leading-relaxed italic mb-10">
                  {(current.data as SceneData).description || <span className="text-faint">(no description)</span>}
                </p>
                <NextButton onNext={goNext} hasNext={canNext} />
              </Card>
            )}
            {current?.type === 'dialog' && <DialogCard data={current.data as DialogData} onNext={goNext} hasNext={canNext} />}
            {current?.type === 'decision' && (
              <DecisionCard
                data={current.data as DecisionData}
                vars={state.vars}
                variables={project.variables}
                isWired={(id) => isWired(current.id, edges, choiceHandle(id))}
                onChoose={(id) => go(choose(index, state, id), { type: 'choose', choiceId: id })}
              />
            )}
            {current?.type === 'loop' && (
              <LoopCard
                data={current.data as LoopData}
                done={state.progress[current.id] ?? []}
                isWired={(id) => isWired(current.id, edges, itemHandle(id))}
                onPick={(itemId) => go(enterItem(index, state, itemId), { type: 'item', itemId })}
              />
            )}
            {current?.type === 'chance' && state.roll && (
              <Card kind="chance" kicker={(current.data as ChanceData).title || 'Chance'} center>
                <h2 className="font-story text-4xl text-fg mb-10">
                  {(current.data as ChanceData).outcomes.find((o) => o.id === state.roll?.outcomeId)?.label || '(unnamed outcome)'}
                </h2>
                <NextButton onNext={goNext} hasNext={canNext} />
              </Card>
            )}
            {current?.type === 'end' && <EndCard data={current.data as EndData} buttons={endButtons} />}
          </div>
        </div>

        {showVars && (
          <VariablesDrawer variables={project.variables} vars={state.vars} onChange={(vars) => setState({ ...state, vars })} />
        )}
      </div>
      {recap && (
        <RecapOverlay
          project={project}
          rows={recapRows}
          seen={seen}
          tab={recap}
          onTab={setRecap}
          onClose={() => setRecap(null)}
          onReset={() => {
            resetSeenEndings(galleryKey);
            setSeen([]);
          }}
        />
      )}

      <div className="flex items-center justify-between px-4 sm:px-6 h-12 border-t border-border bg-surface text-xs text-muted flex-shrink-0">
        <button onClick={goBack} disabled={history.length === 0} className="nf-btn">
          <ArrowLeft size={15} /> Back
        </button>
        <span className="text-center px-2">
          {current?.type === 'decision'
            ? 'Choose what happens next'
            : current?.type === 'loop'
            ? 'Complete every item to continue'
            : current?.type === 'end'
            ? 'You reached an ending'
            : 'Space or → to continue · Esc to exit'}
        </span>
        <span className="w-16" />
      </div>
    </div>
  );
}

/**
 * The scene image behind the reading page. Each new image fades in over the
 * previous one; the previous layer is dropped once the fade is done.
 */
function SceneBackdrop({ src, name }: { src: string; name?: string }) {
  const [layers, setLayers] = useState<{ src: string; key: number }[]>(() => (src ? [{ src, key: 0 }] : []));
  const counter = useRef(1);
  useEffect(() => {
    setLayers((ls) => {
      if ((ls[ls.length - 1]?.src ?? '') === src) return ls;
      return [...ls.slice(-1), { src, key: counter.current++ }];
    });
    const t = window.setTimeout(() => setLayers((ls) => ls.slice(-1)), 700);
    return () => window.clearTimeout(t);
  }, [src]);
  if (layers.every((l) => !l.src)) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden={!name} role={name ? 'img' : undefined} aria-label={name ? `Background: ${name}` : undefined} data-scene={src ? name : ''}>
      {layers.map((l) =>
        l.src ? <div key={l.key} className="nf-scene-layer" style={{ backgroundImage: `url("${l.src}")` }} /> : <div key={l.key} className="nf-scene-layer nf-paper" />
      )}
      <div className="nf-scene-veil" />
    </div>
  );
}

function Card({ kind, kicker, center, children }: { kind: NodeKind; kicker: ReactNode; center?: boolean; children: ReactNode }) {
  const Icon = NODE_ICONS[kind];
  return (
    <div className={`animate-fade-in nf-kind-${kind} ${center ? 'text-center' : ''}`}>
      <div
        className={`text-node text-[11px] font-semibold uppercase tracking-[0.28em] mb-5 flex items-center gap-2 ${
          center ? 'justify-center' : ''
        }`}
      >
        <Icon size={14} />
        <span>{kicker}</span>
      </div>
      {children}
    </div>
  );
}

function NextButton({ onNext, hasNext, label = 'Next' }: { onNext: () => void; hasNext: boolean; label?: string }) {
  return (
    <button
      onClick={onNext}
      className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-node text-surface font-medium hover:brightness-110 transition"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {hasNext ? (
        <>
          {label} <ArrowRight size={16} />
        </>
      ) : (
        'The End'
      )}
    </button>
  );
}

function DialogCard({ data, onNext, hasNext }: { data: DialogData; onNext: () => void; hasNext: boolean }) {
  const characters = useCharacterStore((s) => s.characters);
  const who = data.character?.trim() ?? '';
  const portrait = (
    characters.find((c) => c.id === data.characterId) ?? characters.find((c) => c.name.trim().toLowerCase() === who.toLowerCase())
  )?.image;
  return (
    <Card
      kind="dialog"
      kicker={
        <span className="flex items-center gap-2">
          {portrait && <img src={portrait} alt="" className="w-7 h-7 rounded-full object-cover border border-border" />}
          {who || 'Dialogue'}
        </span>
      }
    >
      <p className="font-story text-[26px] text-fg leading-relaxed mb-10">
        {data.text ? `“${data.text}”` : <span className="text-faint">(no dialogue text)</span>}
      </p>
      <NextButton onNext={onNext} hasNext={hasNext} />
    </Card>
  );
}

function DecisionCard({
  data,
  vars,
  variables,
  isWired,
  onChoose,
}: {
  data: DecisionData;
  vars: Vars;
  variables: VariableDef[];
  isWired: (choiceId: string) => boolean;
  onChoose: (choiceId: string) => void;
}) {
  return (
    <Card kind="decision" kicker="Decision">
      <p className="font-story text-[26px] text-fg leading-relaxed mb-8">
        {data.prompt || <span className="text-faint">(no prompt)</span>}
      </p>
      <div className="space-y-2.5">
        {data.choices.map((choice, idx) => {
          const st = choiceState(choice, vars);
          if (!st.visible) return null;
          const wired = isWired(choice.id);
          if (!st.available) {
            return (
              <div
                key={choice.id}
                className="w-full text-left bg-sunken border border-border text-faint px-5 py-3.5 rounded-xl cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <Lock size={15} className="flex-shrink-0" />
                  <span className="text-[17px]">{choice.label || <span className="italic">(empty choice)</span>}</span>
                </div>
                <div className="text-xs mt-1 ml-7 text-muted">
                  {choice.lockedText?.trim() || `Requires ${describeCondition(choice.condition, variables)}`}
                </div>
              </div>
            );
          }
          return (
            <button
              key={choice.id}
              onClick={() => onChoose(choice.id)}
              className="group w-full text-left bg-surface hover:bg-surface-2 border border-border hover:border-node text-fg px-5 py-3.5 rounded-xl transition-colors flex items-center gap-3"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <span className="w-6 h-6 rounded-full border border-node/60 text-node text-xs font-semibold flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <span className="text-[17px] flex-1">{choice.label || <span className="text-faint italic">(empty choice)</span>}</span>
              {!wired && <span className="text-xs text-faint group-hover:text-warning">(unconnected)</span>}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function LoopCard({
  data,
  done,
  isWired,
  onPick,
}: {
  data: LoopData;
  done: string[];
  isWired: (itemId: string) => boolean;
  onPick: (itemId: string) => void;
}) {
  const total = data.items.length;
  const completed = data.items.filter((it) => done.includes(it.id)).length;
  return (
    <Card
      kind="loop"
      kicker={
        <span>
          Loop · <span className="normal-case tracking-normal text-muted">{completed} / {total} done</span>
        </span>
      }
    >
      <p className="font-story text-[26px] text-fg leading-relaxed mb-8">
        {data.title || <span className="text-faint">(complete every item to continue)</span>}
      </p>
      <div className="space-y-2.5">
        {data.items.map((item) => {
          const isDone = done.includes(item.id);
          const wired = isWired(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onPick(item.id)}
              disabled={isDone || !wired}
              className={`w-full text-left border px-5 py-3.5 rounded-xl transition-colors flex items-center gap-3 ${
                isDone
                  ? 'bg-sunken border-border text-faint cursor-default'
                  : 'bg-surface hover:bg-surface-2 hover:border-node border-border text-fg disabled:opacity-50'
              }`}
            >
              <span className="text-node font-semibold w-5">{isDone ? '✓' : '○'}</span>
              <span className="text-[17px] flex-1">{item.label || <span className="text-faint italic">(unnamed item)</span>}</span>
              {!wired && <span className="text-xs text-faint">(unconnected)</span>}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function EndCard({ data, buttons }: { data: EndData; buttons: ReactNode }) {
  const characters = useCharacterStore((s) => s.characters);
  const who = data.character?.trim() ?? '';
  const line = data.text?.trim() ?? '';
  const portrait = who
    ? (characters.find((c) => c.id === data.characterId) ?? characters.find((c) => c.name.trim().toLowerCase() === who.toLowerCase()))?.image
    : undefined;
  return (
    <Card kind="end" kicker="Ending" center>
      <h2 className="font-story text-4xl sm:text-5xl text-fg leading-tight mb-6">{data.title?.trim() || 'The End'}</h2>
      {data.description?.trim() && (
        <p className="font-story text-xl text-fg-soft leading-relaxed mb-8 italic">{data.description}</p>
      )}
      {line && (
        <div className="mb-8">
          {who && (
            <div className="nf-kind-dialog text-node text-[11px] font-semibold uppercase tracking-[0.28em] mb-3 flex items-center justify-center gap-2">
              {portrait && <img src={portrait} alt="" className="w-7 h-7 rounded-full object-cover border border-border" />}
              {who}
            </div>
          )}
          <p className="font-story text-2xl text-fg leading-relaxed">“{line}”</p>
        </div>
      )}
      {data.title?.trim() && <p className="text-muted text-sm tracking-[0.3em] uppercase mb-6">The End</p>}
      <div className="text-faint tracking-[0.5em] mb-8">❦</div>
      {buttons}
    </Card>
  );
}

function VariablesDrawer({ variables, vars, onChange }: { variables: VariableDef[]; vars: Vars; onChange: (vars: Vars) => void }) {
  return (
    <aside className="w-72 max-w-[80vw] border-l border-border bg-surface p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-fg mb-1 flex items-center gap-1.5">
        <FlaskConical size={15} className="text-accent" /> Variables
      </h3>
      <p className="text-[11.5px] text-muted mb-3">Live values for this playthrough. Edit them to test other routes.</p>
      <div className="space-y-2">
        {variables.map((v) => (
          <div key={v.id} className="flex items-center gap-2">
            <span className="text-xs text-fg-soft font-mono flex-1 truncate" title={v.note || v.name}>
              {v.name || '(unnamed)'}
            </span>
            <VarValueInput type={v.type} value={vars[v.id]} onChange={(val) => onChange({ ...vars, [v.id]: val })} />
          </div>
        ))}
      </div>
    </aside>
  );
}
