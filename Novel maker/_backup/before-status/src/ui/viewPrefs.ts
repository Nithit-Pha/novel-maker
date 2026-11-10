import { create } from 'zustand';

const KEY = 'novel-flow-view';

interface Prefs {
  grid: boolean;
  minimap: boolean;
  /** Choice / branch / outcome text on wires. */
  labels: boolean;
  /** Canvas tool: Hand (drag empty canvas to move around) or Select (drag to draw a selection box). */
  tool: 'hand' | 'select';
}

function read(): Prefs {
  try {
    const v = { grid: true, minimap: true, labels: true, tool: 'hand' as const, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    return { ...v, tool: v.tool === 'select' ? 'select' : 'hand' };
  } catch {
    return { grid: true, minimap: true, labels: true, tool: 'hand' };
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
      const { grid, minimap, labels, tool } = get();
      localStorage.setItem(KEY, JSON.stringify({ grid, minimap, labels, tool }));
    } catch {
      /* ignore */
    }
  },
  setLocked: (locked) => setState({ locked }),
}));
