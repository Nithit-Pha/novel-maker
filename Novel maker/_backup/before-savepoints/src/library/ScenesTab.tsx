// Library → Scenes: background images for Run mode and the exported story.

import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react';
import { ACCEPT, sceneSrc, useSceneStore } from './sceneStore';
import type { SceneAsset } from './libraryTypes';
import { snapshotProject, useFlowStore } from '../store';
import { sceneUsage } from '../analysis/scenes';
import { confirmDialog, notify } from '../ui/dialogs';

function useUsage(): Map<string, number> {
  const nodes = useFlowStore((s) => s.nodes);
  const graphs = useFlowStore((s) => s.graphs);
  return useMemo(() => sceneUsage(snapshotProject(useFlowStore.getState())), [nodes, graphs]);
}

const usageText = (n: number) => (n === 0 ? 'Not used yet' : `Used on ${n} card${n === 1 ? '' : 's'}`);

export default function ScenesTab() {
  const scenes = useSceneStore((s) => s.scenes);
  const filesBacked = useSceneStore((s) => s.io?.files ?? true);
  const addScene = useSceneStore((s) => s.addScene);
  const usage = useUsage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const addFiles = async (files: FileList | File[]) => {
    const list = [...files];
    if (list.length === 0) return;
    setBusy((n) => n + list.length);
    let added = 0;
    for (const f of list) {
      try {
        await addScene(f);
        added++;
      } catch (err) {
        notify(`${f.name}: ${(err as Error).message}`, 'error');
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (added) notify(added === 1 ? 'Scene added' : `${added} scenes added`);
  };

  const current = editing ? scenes.find((s) => s.id === editing) : undefined;
  if (current) return <SceneEditor scene={current} uses={usage.get(current.id) ?? 0} onBack={() => setEditing(null)} />;

  return (
    <div
      className={`flex flex-col flex-1 min-h-0 transition-colors ${over ? 'bg-accent/5' : ''}`}
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void addFiles(e.dataTransfer.files);
      }}
    >
      <div className="px-4 py-3 border-b border-ink-600 flex-shrink-0">
        <button onClick={() => fileRef.current?.click()} className="nf-btn nf-btn-primary w-full h-9" disabled={busy > 0}>
          {busy > 0 ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          {busy > 0 ? 'Adding…' : '+ Scene'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          aria-label="Scene image files"
          onChange={(e) => {
            const files = e.target.files ? [...e.target.files] : [];
            e.target.value = '';
            void addFiles(files);
          }}
        />
        <p className="text-[11.5px] text-muted mt-2 leading-snug">
          .png, .jpg or .jpeg — or drop images here. Shown behind the text in Run mode and in the exported story.
        </p>
        {!filesBacked && (
          <p className="text-[11.5px] text-warning mt-1.5 leading-snug">
            This project lives in the browser, so images are kept there too. Start Novel Flow with the launcher to save them in the
            saves folder.
          </p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {scenes.length === 0 ? (
          <div className="mt-6 mx-2 rounded-xl border-2 border-dashed border-border px-4 py-8 text-center">
            <Upload size={22} className="mx-auto text-faint mb-2" />
            <p className="text-sm text-muted">No scenes yet.</p>
            <p className="text-[12px] text-faint mt-1">Click “+ Scene” or drop an image here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {scenes.map((s) => (
              <SceneTile key={s.id} scene={s} uses={usage.get(s.id) ?? 0} onClick={() => setEditing(s.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SceneTile({ scene, uses, onClick }: { scene: SceneAsset; uses: number; onClick: () => void }) {
  useSceneStore((s) => s.io);
  const src = sceneSrc(scene);
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-border bg-surface hover:border-accent/60 p-1.5 transition-colors"
      style={{ boxShadow: 'var(--shadow-sm)' }}
      title={`Edit “${scene.name}”`}
    >
      <span className="block aspect-video rounded-lg overflow-hidden bg-sunken">
        {src && <img src={src} alt="" className="w-full h-full object-cover" draggable={false} loading="lazy" />}
      </span>
      <span className="block px-1 pt-1.5 text-[13px] font-medium text-fg truncate">{scene.name}</span>
      <span className="block px-1 pb-0.5 text-[11px] text-muted">{usageText(uses)}</span>
    </button>
  );
}

function SceneEditor({ scene, uses, onBack }: { scene: SceneAsset; uses: number; onBack: () => void }) {
  useSceneStore((s) => s.io);
  const renameScene = useSceneStore((s) => s.renameScene);
  const replaceImage = useSceneStore((s) => s.replaceImage);
  const deleteScene = useSceneStore((s) => s.deleteScene);
  const [name, setName] = useState(scene.name);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const src = sceneSrc(scene);

  const commitName = () => {
    if (name.trim() && name.trim() !== scene.name) renameScene(scene.id, name);
    else setName(scene.name);
  };

  const onReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      await replaceImage(scene.id, file);
      notify(uses ? `Image replaced on ${uses} card${uses === 1 ? '' : 's'}` : 'Image replaced');
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    const ok = await confirmDialog({
      title: `Delete scene “${scene.name}”?`,
      message: uses
        ? `${uses} card${uses === 1 ? ' uses' : 's use'} it. They will show “Missing scene” until you pick another, and Story check will list them.`
        : 'No card uses it.',
      confirmLabel: 'Delete scene',
      danger: true,
    });
    if (!ok) return;
    deleteScene(scene.id);
    notify('Scene deleted');
    onBack();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-ink-600 flex-shrink-0">
        <button className="nf-icon-btn" onClick={() => { commitName(); onBack(); }} aria-label="Back to scenes" title="Back to scenes">
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-fg truncate flex-1">{scene.name}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-xl overflow-hidden border border-border bg-sunken aspect-video">
          {src && <img src={src} alt={scene.name} className="w-full h-full object-cover" />}
        </div>
        <p className="text-[11.5px] text-muted -mt-2">
          {scene.width && scene.height ? `${scene.width} × ${scene.height} px · ` : ''}
          {usageText(uses)}
        </p>
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1" htmlFor="scene-name">
            Name
          </label>
          <input
            id="scene-name"
            className="nf-input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setName(scene.name);
            }}
          />
        </div>
        <button className="nf-btn nf-btn-outline w-full h-9" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {busy ? 'Replacing…' : 'Replace image…'}
        </button>
        <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={onReplace} aria-label="Replacement image" />
      </div>
      <div className="flex items-center gap-2 px-4 py-3 border-t border-ink-600 flex-shrink-0">
        <button onClick={() => void onDelete()} className="nf-btn nf-btn-outline h-9 hover:!text-danger hover:!border-danger/50">
          <Trash2 size={15} /> Delete
        </button>
        <button onClick={() => { commitName(); onBack(); }} className="nf-btn nf-btn-primary flex-1 h-9">
          Done
        </button>
      </div>
    </div>
  );
}
