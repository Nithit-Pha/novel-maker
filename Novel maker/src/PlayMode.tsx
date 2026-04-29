import { useEffect, useMemo, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { NodeData, DialogData, DecisionData, StartData } from './types';

interface Props {
  nodes: Node<NodeData>[];
  edges: Edge[];
  onClose: () => void;
}

// Find the entry point: prefer a Start node; otherwise pick a node with no incoming edges.
function findStart(nodes: Node<NodeData>[], edges: Edge[]): Node<NodeData> | null {
  const start = nodes.find((n) => n.type === 'start');
  if (start) return start;
  const targets = new Set(edges.map((e) => e.target));
  const orphans = nodes.filter((n) => !targets.has(n.id));
  return orphans[0] ?? nodes[0] ?? null;
}

function nextNodeId(currentId: string, edges: Edge[], handleId?: string): string | null {
  const edge = edges.find(
    (e) => e.source === currentId && (handleId ? e.sourceHandle === handleId : true)
  );
  return edge?.target ?? null;
}

export default function PlayMode({ nodes, edges, onClose }: Props) {
  const start = useMemo(() => findStart(nodes, edges), [nodes, edges]);
  const nodeMap = useMemo(() => {
    const m = new Map<string, Node<NodeData>>();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  const [currentId, setCurrentId] = useState<string | null>(start?.id ?? null);
  const [history, setHistory] = useState<string[]>([]);

  const current = currentId ? nodeMap.get(currentId) : null;

  const goNext = (handleId?: string) => {
    if (!currentId) return;
    const next = nextNodeId(currentId, edges, handleId);
    if (next) {
      setHistory((h) => [...h, currentId]);
      setCurrentId(next);
    } else {
      // dead end → mark as ended by setting a sentinel; we'll detect this in render
      setHistory((h) => [...h, currentId]);
      setCurrentId(null);
    }
  };

  const goBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setCurrentId(prev);
  };

  const restart = () => {
    setCurrentId(start?.id ?? null);
    setHistory([]);
  };

  // keyboard: Esc to exit, ArrowLeft = back, ArrowRight/Space = next (only single-output nodes)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        if (history.length > 0) goBack();
      }
      if (e.key === 'ArrowRight' || e.key === ' ') {
        if (current && current.type !== 'decision') {
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

          {current && current.type === 'start' && (
            <StartCard
              data={current.data as StartData}
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
            : 'Press Space or → to continue · Esc to exit'}
        </span>
        <span className="opacity-0 px-3 py-1.5">placeholder</span>
      </div>
    </div>
  );
}

function StartCard({ data, onNext, hasNext }: { data: StartData; onNext: () => void; hasNext: boolean }) {
  return (
    <div className="text-center animate-fade-in">
      <div className="text-accent-start text-xs font-semibold uppercase tracking-[0.3em] mb-6">
        ▶ Story Begins
      </div>
      <p className="text-2xl text-gray-200 leading-relaxed font-light mb-10 italic">
        {data.text || <span className="text-gray-600">(empty opening)</span>}
      </p>
      <button
        onClick={onNext}
        className="bg-accent hover:bg-accent/90 text-white px-8 py-3 rounded text-lg"
      >
        {hasNext ? 'Begin →' : 'The End'}
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
