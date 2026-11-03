import { AlertCircle, AlertTriangle, Pin, Play, X } from 'lucide-react';
import { useFlowStore } from '../store';
import type { NodeKind } from '../types';
import { NODE_ICONS } from '../ui/icons';
import { useUi } from '../ui/uiStore';

interface Props {
  id: string;
  kind: NodeKind;
  label: string;
  pinned?: boolean;
  /** Legacy props (kept for compatibility; styling now comes from the node kind). */
  icon?: string;
  accentText?: string;
}

/** Shared node card header: icon + label + problems + play-from-here + pin + delete. */
export default function NodeHeader({ id, kind, label, pinned }: Props) {
  const togglePin = useFlowStore((s) => s.togglePin);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  // A string (not an array) so the selector result is stable between renders.
  const problems = useUi((s) =>
    s.issues
      .filter((i) => i.nodeId === id && i.severity !== 'note')
      .map((i) => `${i.severity === 'error' ? 'E' : 'W'}${i.message}`)
      .join('\n')
  );
  const Icon = NODE_ICONS[kind];
  const list = problems ? problems.split('\n') : [];
  const hasError = list.some((p) => p.startsWith('E'));

  return (
    <div className="nf-node-header pl-3 pr-1.5 py-1.5 flex items-center gap-1.5">
      <Icon size={15} strokeWidth={2.2} className="nf-node-label flex-shrink-0" />
      <span className="nf-node-label text-[11.5px] font-semibold uppercase tracking-[0.08em] flex-1">{label}</span>
      {list.length > 0 && (
        <button
          onClick={() => useUi.getState().openCheck('problems')}
          className={`nf-icon-btn !w-auto !h-6 px-1 gap-0.5 text-[11px] font-semibold ${hasError ? '!text-danger' : '!text-warning'}`}
          title={list.map((p) => `• ${p.slice(1)}`).join('\n') + '\n\nClick to open Story check'}
          aria-label={`${list.length} problem${list.length === 1 ? '' : 's'}`}
        >
          {hasError ? <AlertCircle size={14} /> : <AlertTriangle size={14} />}
          {list.length > 1 && list.length}
        </button>
      )}
      {kind !== 'end' && (
        <button
          onClick={() => useUi.getState().requestPlayFrom({ arcId: useFlowStore.getState().activeArcId, nodeId: id })}
          className="nf-icon-btn !w-6 !h-6 opacity-60 hover:opacity-100"
          title="Play from here"
          aria-label="Play from here"
        >
          <Play size={12} />
        </button>
      )}
      <button
        onClick={() => togglePin(id)}
        className={`nf-icon-btn !w-6 !h-6 ${pinned ? '!text-accent' : 'opacity-60 hover:opacity-100'}`}
        title={pinned ? 'Unpin' : 'Pin this node (shows in search)'}
        aria-label={pinned ? 'Unpin node' : 'Pin node'}
      >
        <Pin size={13} fill={pinned ? 'currentColor' : 'none'} />
      </button>
      <button
        onClick={() => deleteNode(id)}
        className="nf-icon-btn !w-6 !h-6 hover:!bg-danger/15 hover:!text-danger"
        title="Delete node"
        aria-label="Delete node"
      >
        <X size={15} />
      </button>
    </div>
  );
}
