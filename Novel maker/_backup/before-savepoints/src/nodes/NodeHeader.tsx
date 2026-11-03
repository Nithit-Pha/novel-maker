import { useState } from 'react';
import { AlertCircle, AlertTriangle, Image as ImageIcon, ImageOff, Pin, Play, X } from 'lucide-react';
import { useFlowStore } from '../store';
import type { NodeKind } from '../types';
import { NODE_ICONS } from '../ui/icons';
import { useUi } from '../ui/uiStore';
import ScenePicker from '../library/ScenePicker';
import { useScene } from '../library/sceneStore';
import { NO_SCENE } from '../library/libraryTypes';

interface Props {
  id: string;
  kind: NodeKind;
  label: string;
  pinned?: boolean;
  /** Legacy props (kept for compatibility; styling now comes from the node kind). */
  icon?: string;
  accentText?: string;
}

/**
 * Shared node card header: icon + label + problems + scene + play-from-here + pin + delete.
 * Cards that set a background show it as a banner under the header (the Scene
 * card shows its own, bigger picker instead).
 */
export default function NodeHeader({ id, kind, label, pinned }: Props) {
  const togglePin = useFlowStore((s) => s.togglePin);
  const sceneId = useFlowStore((s) => s.nodes.find((n) => n.id === id)?.data.sceneId);
  const [picker, setPicker] = useState<HTMLElement | null>(null);
  const hasScene = !!sceneId && sceneId !== NO_SCENE;
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
    <>
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
      {kind !== 'scene' && (
        <button
          onClick={(e) => setPicker(picker ? null : e.currentTarget)}
          className={`nf-icon-btn !w-6 !h-6 ${hasScene || sceneId === NO_SCENE ? '!text-accent' : 'opacity-60 hover:opacity-100'}`}
          title={hasScene ? 'Change this card’s background' : sceneId === NO_SCENE ? 'Background cleared here — change' : 'Set a background (scene)'}
          aria-label="Background scene"
          aria-haspopup="dialog"
          aria-expanded={!!picker}
        >
          <ImageIcon size={13} />
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
    {kind !== 'scene' && sceneId && <SceneBanner sceneId={sceneId} onOpen={(el) => setPicker(picker ? null : el)} />}
    {picker && (
      <ScenePicker
        anchor={picker}
        value={sceneId}
        onPick={(v) => useFlowStore.getState().setSceneFor([id], v)}
        onClose={() => setPicker(null)}
        title="Background from this card on"
      />
    )}
    </>
  );
}

/** Thin strip under a card's header showing the background this card sets. */
export function SceneBanner({ sceneId, onOpen }: { sceneId: string; onOpen: (el: HTMLElement) => void }) {
  const { scene, src } = useScene(sceneId === NO_SCENE ? null : sceneId);
  if (sceneId === NO_SCENE) {
    return (
      <button
        onClick={(e) => onOpen(e.currentTarget)}
        className="nf-scene-banner w-full flex items-center gap-1.5 px-3 h-6 text-[11px] text-muted bg-sunken border-b border-border"
        title="The background is cleared from this card on — click to change"
      >
        <ImageOff size={12} /> No background from here
      </button>
    );
  }
  if (!scene) {
    return (
      <button
        onClick={(e) => onOpen(e.currentTarget)}
        className="nf-scene-banner w-full flex items-center gap-1.5 px-3 h-7 text-[11px] font-medium text-warning bg-warning/10 border-b border-border"
        title="This scene was removed from the Library — click to pick another"
      >
        <AlertTriangle size={12} /> Missing scene
      </button>
    );
  }
  return (
    <button
      onClick={(e) => onOpen(e.currentTarget)}
      className="nf-scene-banner relative block w-full h-12 overflow-hidden border-b border-border bg-sunken"
      title={`Background: ${scene.name} — click to change`}
    >
      {src && <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />}
      <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,.6), rgba(0,0,0,.15) 65%, transparent)' }} />
      <span
        className="absolute left-3 bottom-1.5 right-3 flex items-center gap-1 text-[11px] font-medium truncate"
        style={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.6)' }}
      >
        <ImageIcon size={11} /> {scene.name}
      </span>
    </button>
  );
}
