import { useCallback, useEffect, useState } from 'react';
import { useFlowStore } from '../store';
import { useCharacterStore } from './characterStore';
import {
  type ProjectInfo,
  deleteProject,
  ensurePermission,
  folderName,
  fsSupported,
  listProjects,
  loadProject,
  pickSavesFolder,
  reconnectSavesFolder,
  saveProject,
} from './savesFs';

interface Props {
  onClose: () => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function SavesPanel({ onClose }: Props) {
  const supported = fsSupported();
  const [handle, setHandle] = useState<any>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [saveName, setSaveName] = useState('My Story');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async (h: any) => {
    try {
      setProjects(await listProjects(h));
    } catch (e) {
      setErr('Could not read the folder. ' + (e as Error).message);
    }
  }, []);

  // Try to reconnect a previously chosen folder on open.
  useEffect(() => {
    if (!supported) return;
    reconnectSavesFolder().then(({ handle: h, needsPermission: np }) => {
      if (!h) return;
      setHandle(h);
      setNeedsPermission(np);
      if (!np) refresh(h);
    });
  }, [supported, refresh]);

  const flash = (m: string) => {
    setMsg(m);
    setErr(null);
    setTimeout(() => setMsg(null), 2500);
  };

  const handleConnect = async () => {
    try {
      const h = await pickSavesFolder();
      if (!h) return;
      setHandle(h);
      setNeedsPermission(false);
      setErr(null);
      await refresh(h);
    } catch {
      /* user cancelled the picker */
    }
  };

  const handleGrant = async () => {
    if (!handle) return;
    const ok = await ensurePermission(handle);
    if (ok) {
      setNeedsPermission(false);
      await refresh(handle);
    } else {
      setErr('Permission denied for the folder.');
    }
  };

  const collectStory = () => useFlowStore.getState().exportJSON();
  const collectCharacters = () =>
    JSON.stringify(useCharacterStore.getState().characters, null, 2);

  const handleSave = async () => {
    if (!handle || !saveName.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await saveProject(handle, saveName, collectStory(), collectCharacters());
      await refresh(handle);
      flash(`Saved “${saveName.trim()}”.`);
    } catch (e) {
      setErr('Save failed: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleLoad = async (name: string) => {
    if (
      !confirm(
        `Load “${name}”?\n\nThis replaces the current story and character library on the canvas. ` +
          `Save first if you want to keep your current work.`
      )
    )
      return;
    setBusy(true);
    setErr(null);
    try {
      const { storyJson, charactersJson } = await loadProject(handle, name);
      if (storyJson) useFlowStore.getState().importJSON(storyJson);
      if (charactersJson) {
        try {
          useCharacterStore.getState().replaceAll(JSON.parse(charactersJson));
        } catch {
          setErr('Characters file was unreadable; story loaded without them.');
        }
      }
      setSaveName(name);
      flash(`Loaded “${name}”.`);
    } catch (e) {
      setErr('Load failed: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete saved project “${name}” from the folder? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteProject(handle, name);
      await refresh(handle);
      flash(`Deleted “${name}”.`);
    } catch (e) {
      setErr('Delete failed: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-ink-800 border border-ink-600 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center px-5 py-3 border-b border-ink-600 flex-shrink-0">
          <span className="text-base mr-2">💾</span>
          <h2 className="text-white font-semibold flex-1">Saves</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {!supported && (
            <p className="text-sm text-gray-300">
              Saving to a folder needs the File System Access API, which works in Chrome or Edge.
              Your current browser doesn’t support it — the in-app Save button (browser storage)
              and Export still work.
            </p>
          )}

          {supported && !handle && (
            <div className="text-sm text-gray-300 space-y-3">
              <p>
                Choose a folder on your computer to keep your saves in. Each save becomes its own
                project folder with separate <code className="text-accent-dialog">story</code> and{' '}
                <code className="text-accent-dialog">characters</code> files inside.
              </p>
              <button
                onClick={handleConnect}
                className="bg-accent hover:bg-accent/90 text-white text-sm font-semibold rounded px-4 py-2 transition"
              >
                Choose saves folder…
              </button>
            </div>
          )}

          {supported && handle && needsPermission && (
            <div className="text-sm text-gray-300 space-y-3">
              <p>
                Reconnect access to <span className="text-white font-medium">{folderName(handle)}</span>.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleGrant}
                  className="bg-accent hover:bg-accent/90 text-white text-sm font-semibold rounded px-4 py-2 transition"
                >
                  Reconnect folder
                </button>
                <button
                  onClick={handleConnect}
                  className="text-gray-300 hover:text-white border border-ink-600 rounded px-4 py-2 text-sm transition"
                >
                  Choose different…
                </button>
              </div>
            </div>
          )}

          {supported && handle && !needsPermission && (
            <>
              {/* folder line */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>
                  Folder: <span className="text-white">{folderName(handle)}</span>
                </span>
                <button onClick={handleConnect} className="text-accent-dialog hover:text-white">
                  change
                </button>
              </div>

              {/* save row */}
              <div className="flex gap-2">
                <input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Save name"
                  className="flex-1 bg-ink-900 border border-ink-600 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-accent-dialog"
                />
                <button
                  onClick={handleSave}
                  disabled={busy || !saveName.trim()}
                  className="bg-accent hover:bg-accent/90 disabled:opacity-40 text-white text-sm font-semibold rounded px-4 py-2 transition"
                >
                  Save
                </button>
              </div>

              {/* messages */}
              {msg && <p className="text-xs text-accent-start">{msg}</p>}
              {err && <p className="text-xs text-accent">{err}</p>}

              {/* list */}
              <div className="border-t border-ink-600 pt-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">
                  Saved projects
                </p>
                {projects.length === 0 ? (
                  <p className="text-sm text-ink-500 italic">No saves in this folder yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {projects.map((p) => (
                      <div
                        key={p.name}
                        className="flex items-center gap-2 bg-ink-900 border border-ink-600 rounded px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-white truncate">{p.name}</div>
                          {p.updatedAt && (
                            <div className="text-[11px] text-gray-500">
                              {new Date(p.updatedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleLoad(p.name)}
                          disabled={busy}
                          className="text-xs text-accent-dialog hover:text-white border border-ink-600 hover:border-accent-dialog rounded px-2 py-1 transition disabled:opacity-40"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDelete(p.name)}
                          disabled={busy}
                          className="text-xs text-gray-500 hover:text-white hover:bg-accent rounded px-2 py-1 transition disabled:opacity-40"
                          title="Delete this save"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
