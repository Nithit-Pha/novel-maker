import { useEffect, useMemo, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { NodeData, ChapterData, DialogData, DecisionData, SceneData, LoopData } from './types';
import { findStart, nextNodeId, resolveArrival, type PlayState } from './engine';

interface Props {
  nodes: Node<NodeData>[];
  edges: Edge[];
  onClose: () => void;
}

export default function PlayMode({ nodes, edges, onClose }: Props) {
  const start = useMemo(() => findStart(nodes, edges), [nodes, edges]);
  const nodeMap = useMemo(() => {
    const m = new Map<string, Node<NodeData>>();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  const initial = useMemo<PlayState>(
    () =>
      start
        ? resolveArrival(start.id, [], {}, edges, nodeMap)
        : { currentId: null, callStack: [], progress: {} },
    [start, edges, nodeMap]
  );

  const [state, setState] = useState<PlayState>(initial);
  const [history, setHistory] = useState<PlayState[]>([]);

  const { currentId, callStack, progress } = state;
  const current = currentId ? nodeMap.get(currentId) : null;

  const pushHistory = () => setHistory((h) => [...h, state]);

  // Navigate from the current node via an optional handle (dialog/scene next, decision choice).
  const goNext = (handleId?: string) => {
    if (!currentId) return;
    const target = nextNodeId(currentId, edges, handleId);
    pushHistory();
    if (target) {
      setState(resolveArrival(target, callStack, progress, edges, nodeMap));
    } else {
      setState({ currentId: null, callStack, progress });
    }
  };

  // Player picks an item inside a loop → enter that item's branch.
  const enterItem = (loopId: string, itemId: string) => {
    const target = nextNodeId(loopId, edges, `item-${itemId}`);
    if (!target) return; // unwired (button is disabled anyway)
    pushHistory();
    const cs = [...callStack, { hubId: loopId, itemId }];
    setState(resolveArrival(target, cs, progress, edges, nodeMap));
  };

  const goBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setState(prev);
  };

  const restart = () => {
    setState(initial);
    setHistory([]);
  };

  // keyboard: Esc exit, ArrowLeft/Backspace back, ArrowRight/Space next (non-branching cards only)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        if (history.length > 0) goBack();
      }
      if (e.key === 'ArrowRight' || e.key === ' ') {
        if (current && current.type !== 'decision' && current.type !== 'loop') {
          e.preventDefault();
          goNext();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, history.length]);

  const ended = currentId === null && history.length > 0;
  const noStory = !start;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/95 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-ink-600 bg-ink-900">
        <div className="flex items-center gap-3">
          <span className="text-accent font-semibold">▶ Playing</span>
          <span className="text-gray-500 text-sm">
            {history.length + (ended ? 0 : 1)} {ended ? 'steps shown' : `of ${nodes.length}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={restart}
            className="text-gray-300 hover:text-white px-3 py-1.5 text-sm hover:bg-ink-700 rounded"
          >
            Restart
          </button>
          <button
            onClick={onClose}
            className="bg-ink-700 hover:bg-ink-600 text-white px-3 py-1.5 text-sm rounded"
          >
            Exit (Esc)
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 overflow-auto">
        <div className="w-full max-w-2xl">
          {noStory && (
            <div className="text-center text-gray-400">
              <h2 className="text-xl mb-2">No story to play</h2>
              <p>Add at least one node to your canvas, then try Run again.</p>
            </div>
          )}

          {ended && (
            <div className="text-center">
              <h2 className="text-3xl font-light text-gray-300 mb-3 tracking-wider">— THE END —</h2>
              <p className="text-gray-500 mb-6">You reached a node with no outgoing connection.</p>
              <button
                onClick={restart}
                className="bg-accent hover:bg-accent/90 text-white px-5 py-2 rounded"
              >
                Play again
              </button>
            </div>
          )}

          {current && current.type === 'chapter' && (
            <ChapterCard
              data={current.data as ChapterData}
              onNext={() => goNext()}
              hasNext={!!nextNodeId(current.id, edges)}
            />
          )}

          {current && current.type === 'scene' && (
            <SceneCard
              data={current.data as SceneData}
              onNext={() => goNext()}
              hasNext={!!nextNodeId(current.id, edges)}
            />
          )}

          {current && current.type === 'dialog' && (
            <DialogCard
              data={current.data as DialogData}
              onNext={() => goNext()}
              hasNext={!!nextNodeId(current.id, edges)}
            />
          )}

          {current && current.type === 'decision' && (
            <DecisionCard
              data={current.data as DecisionData}
              edges={edges.filter((e) => e.source === current.id)}
              onChoose={(idx) => goNext(`choice-${idx}`)}
            />
          )}

          {current && current.type === 'loop' && (
            <LoopCard
              data={current.data as LoopData}
              done={progress[current.id] ?? []}
              edges={edges.filter((e) => e.source === current.id)}
              onPick={(itemId) => enterItem(current.id, itemId)}
            />
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-ink-600 bg-ink-900 text-xs text-gray-500">
        <button
          onClick={goBack}
          disabled={history.length === 0}
          className="px-3 py-1.5 rounded hover:bg-ink-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500"
        >
          ← Back
        </button>
        <span>
          {current?.type === 'decision'
            ? 'Click a choice to continue'
            : current?.type === 'loop'
            ? 'Complete every item to continue'
            : 'Press Space or → to continue · Esc to exit'}
        </span>
        <span className="opacity-0 px-3 py-1.5">placeholder</span>
      </div>
    </div>
  );
}

function ChapterCard({ data, onNext, hasNext }: { data: ChapterData; onNext: () => void; hasNext: boolean }) {
  return (
    <div className="animate-fade-in text-center">
      <div className="text-accent-start text-xs font-semibold uppercase tracking-[0.3em] mb-4">📖 Chapter</div>
      <h2 className="text-4xl text-white font-light mb-10">
        {data.name || <span className="text-gray-600">(untitled chapter)</span>}
      </h2>
      <button
        onClick={onNext}
        className="bg-accent-start hover:bg-green-500 text-ink-900 font-semibold px-6 py-2.5 rounded"
      >
        {hasNext ? 'Begin \u2192' : 'The End'}
      </button>
    </div>
  );
}

function SceneCard({ data, onNext, hasNext }: { data: SceneData; onNext: () => void; hasNext: boolean }) {
  return (
    <div className="animate-fade-in">
      <div className="text-accent-scene text-xs font-semibold uppercase tracking-[0.3em] mb-3">
        🎬 {data.background || 'Scene'}
      </div>
      <p className="text-2xl text-gray-200 leading-relaxed font-light mb-10 italic">
        {data.description || <span className="text-gray-600">(no description)</span>}
      </p>
      <button
        onClick={onNext}
        className="bg-accent-scene hover:bg-purple-500 text-white px-6 py-2.5 rounded"
      >
        {hasNext ? 'Next →' : 'The End'}
      </button>
    </div>
  );
}

function DialogCard({ data, onNext, hasNext }: { data: DialogData; onNext: () => void; hasNext: boolean }) {
  return (
    <div className="animate-fade-in">
      <div className="text-accent-dialog text-xs font-semibold uppercase tracking-[0.3em] mb-3">
        💬 {data.character || 'Dialog'}
      </div>
      <p className="text-2xl text-gray-100 leading-relaxed font-light mb-10">
        {data.text ? `"${data.text}"` : <span className="text-gray-600">(no dialog text)</span>}
      </p>
      <button
        onClick={onNext}
        className="bg-accent-dialog hover:bg-blue-500 text-white px-6 py-2.5 rounded"
      >
        {hasNext ? 'Next →' : 'The End'}
      </button>
    </div>
  );
}

function DecisionCard({
  data,
  edges,
  onChoose,
}: {
  data: DecisionData;
  edges: Edge[];
  onChoose: (idx: number) => void;
}) {
  return (
    <div className="animate-fade-in">
      <div className="text-accent-decision text-xs font-semibold uppercase tracking-[0.3em] mb-3">
        🔀 Decision
      </div>
      <p className="text-2xl text-gray-100 leading-relaxed font-light mb-8">
        {data.prompt || <span className="text-gray-600">(no prompt)</span>}
      </p>
      <div className="space-y-3">
        {data.choices.map((choice, idx) => {
          const wired = edges.some((e) => e.sourceHandle === `choice-${idx}`);
          return (
            <button
              key={idx}
              onClick={() => onChoose(idx)}
              className="w-full text-left bg-ink-800 hover:bg-ink-700 hover:border-accent-decision border-2 border-ink-600 text-white px-5 py-4 rounded transition group"
            >
              <span className="text-accent-decision mr-3 font-semibold">{idx + 1}.</span>
              <span className="text-lg">{choice || <span className="text-gray-500 italic">(empty choice)</span>}</span>
              {!wired && (
                <span className="ml-3 text-xs text-gray-500 group-hover:text-yellow-500">(unconnected)</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LoopCard({
  data,
  done,
  edges,
  onPick,
}: {
  data: LoopData;
  done: string[];
  edges: Edge[];
  onPick: (itemId: string) => void;
}) {
  const total = data.items.length;
  const completed = data.items.filter((it) => done.includes(it.id)).length;
  return (
    <div className="animate-fade-in">
      <div className="text-accent-loop text-xs font-semibold uppercase tracking-[0.3em] mb-3 flex items-center gap-3">
        🔁 Loop
        <span className="text-gray-500 normal-case tracking-normal">
          {completed} / {total} done
        </span>
      </div>
      <p className="text-2xl text-gray-100 leading-relaxed font-light mb-8">
        {data.title || <span className="text-gray-600">(complete every item to continue)</span>}
      </p>
      <div className="space-y-3">
        {data.items.map((item) => {
          const isDone = done.includes(item.id);
          const wired = edges.some((e) => e.sourceHandle === `item-${item.id}`);
          return (
            <button
              key={item.id}
              onClick={() => onPick(item.id)}
              disabled={isDone || !wired}
              className={`w-full text-left border-2 px-5 py-4 rounded transition group ${
                isDone
                  ? 'bg-ink-900 border-ink-700 text-gray-500 cursor-default'
                  : 'bg-ink-800 hover:bg-ink-700 hover:border-accent-loop border-ink-600 text-white disabled:opacity-40'
              }`}
            >
              <span className="text-accent-loop mr-3 font-semibold">{isDone ? '✓' : '○'}</span>
              <span className="text-lg">
                {item.label || <span className="text-gray-500 italic">(unnamed item)</span>}
              </span>
              {!wired && (
                <span className="ml-3 text-xs text-gray-500 group-hover:text-yellow-500">(unconnected)</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
