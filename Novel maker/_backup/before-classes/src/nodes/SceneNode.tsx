import { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { AlertTriangle, ImageOff, ImagePlus, Layers } from 'lucide-react';
import { useFlowStore } from '../store';
import type { SceneData } from '../types';
import NodeHeader from './NodeHeader';
import TagBar from './TagBar';
import OnEnterSection from '../logic/OnEnterSection';
import ScenePicker from '../library/ScenePicker';
import { useScene } from '../library/sceneStore';
import { NO_SCENE } from '../library/libraryTypes';

type SceneNodeType = Node<SceneData, 'scene'>;

export default function SceneNode({ id, data, selected }: NodeProps<SceneNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const [picker, setPicker] = useState<HTMLElement | null>(null);
  const { scene, src } = useScene(data.sceneId && data.sceneId !== NO_SCENE ? data.sceneId : null);
  const missing = !!data.sceneId && data.sceneId !== NO_SCENE && !scene;

  return (
    <div className={`nf-node nf-kind-scene min-w-[260px] max-w-[300px] ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="in" />
      <NodeHeader id={id} kind="scene" label="Scene" pinned={data.pinned} />
      <div className="p-3 space-y-2">
        <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Background</label>
        <button
          onClick={(e) => setPicker(picker ? null : e.currentTarget)}
          className={`relative block w-full aspect-video rounded-md overflow-hidden border text-left transition-colors ${
            missing ? 'border-warning/60 bg-warning/10' : 'border-accent-scene/40 bg-gradient-to-b from-accent-scene/10 to-ink-900/40 hover:border-accent-scene'
          }`}
          title="Choose the background image"
          aria-label="Choose background"
        >
          {scene && src ? (
            <>
              <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
              <span
                className="absolute left-0 right-0 bottom-0 px-2.5 py-1.5 text-[12px] font-medium truncate"
                style={{ color: '#fff', background: 'linear-gradient(0deg, rgba(0,0,0,.6), transparent)' }}
              >
                {scene.name}
              </span>
            </>
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[12px] text-muted">
              {missing ? (
                <>
                  <AlertTriangle size={18} className="text-warning" />
                  <span className="text-warning font-medium">Missing scene — pick another</span>
                </>
              ) : data.sceneId === NO_SCENE ? (
                <>
                  <ImageOff size={18} /> No background
                </>
              ) : (
                <>
                  <ImagePlus size={18} className="text-node" />
                  <span>Choose a background</span>
                  <span className="text-[11px] text-faint flex items-center gap-1">
                    <Layers size={11} /> keeps the current one until you do
                  </span>
                </>
              )}
            </span>
          )}
        </button>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Caption (optional)</label>
          <input
            value={data.background}
            onChange={(e) => updateNodeData(id, { background: e.target.value })}
            placeholder="e.g. Old mansion, night"
            className="w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-accent-scene nodrag"
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Description</label>
          <textarea
            value={data.description}
            onChange={(e) => updateNodeData(id, { description: e.target.value })}
            placeholder="Describe the setting..."
            className="font-story w-full bg-ink-900 border border-ink-600 text-white text-sm px-2 py-1.5 rounded focus:outline-none focus:border-accent-scene resize-y min-h-[60px] nodrag"
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
        <TagBar id={id} tags={data.tags} accentBorder="focus:border-accent-scene" />
        <OnEnterSection id={id} effects={data.onEnter} />
      </div>
      <Handle type="source" position={Position.Right} id="out" />
      {picker && (
        <ScenePicker
          anchor={picker}
          value={data.sceneId}
          onPick={(v) => useFlowStore.getState().setSceneFor([id], v)}
          onClose={() => setPicker(null)}
          title="Background from this card on"
        />
      )}
    </div>
  );
}
