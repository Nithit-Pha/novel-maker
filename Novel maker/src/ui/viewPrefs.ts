import { create } from 'zustand';

const KEY = 'novel-flow-view';

interface Prefs {
  grid: boolean;
  minimap: boolean;
}

function read(): Prefs {
  try {
    return { grid: true, minimap: true, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { grid: true, minimap: true };
  }
}

interface ViewState extends Prefs {
  /** Canvas lock (zoom control): when true, nodes can't be moved or connected. Not saved. */
  locked: boolean;
  set: (p: Partial<Prefs>) => void;
  setLocked: (v: boolean) => void;
}

/** Per-browser canvas view preferences (grid, minimap). */
export const useView = create<ViewState>((setState, get) => ({
  ...read(),
  locked: false,
  set: (p) => {
    setState(p);
    try {
      const { grid, minimap } = get();
      localStorage.setItem(KEY, JSON.stringify({ grid, minimap }));
    } catch {
      /* ignore */
    }
  },
  setLocked: (locked) => setState({ locked }),
}));
