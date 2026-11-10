import { create } from 'zustand';
import type { Issue } from '../analysis/validate';
import type { ExploreResult, Route } from '../analysis/explore';

/** Transient UI state shared between nodes, panels and the canvas (never saved). */
interface UiState {
  /** Output handle the pointer is over (a choice / branch / outcome row) → its wire is highlighted. */
  hot: { nodeId: string; handle: string } | null;
  setHot: (hot: UiState['hot']) => void;

  /** Story check results (structural problems + explorer-derived ones). */
  issues: Issue[];
  setIssues: (issues: Issue[]) => void;
  explore: ExploreResult | null;
  exploring: boolean;
  setExplore: (r: ExploreResult | null, exploring?: boolean) => void;

  /** Story check panel. */
  checkOpen: boolean;
  checkTab: 'problems' | 'routes';
  openCheck: (tab?: 'problems' | 'routes') => void;
  closeCheck: () => void;

  /** Ask the canvas to switch arc (if needed), centre and select a card. */
  focus: { arcId: string; nodeId: string; seq: number } | null;
  focusNode: (arcId: string, nodeId: string) => void;

  /** "Play from here" request from a card header. */
  playFrom: { arcId: string; nodeId: string } | null;
  requestPlayFrom: (p: UiState['playFrom']) => void;
  /** "Play this route" request from the Routes tab. */
  playRoute: Route | null;
  requestPlayRoute: (r: Route | null) => void;
}

let seq = 0;

export const useUi = create<UiState>((set) => ({
  hot: null,
  setHot: (hot) => set({ hot }),

  issues: [],
  setIssues: (issues) => set({ issues }),
  explore: null,
  exploring: false,
  setExplore: (explore, exploring = false) => set({ explore, exploring }),

  checkOpen: false,
  checkTab: 'problems',
  openCheck: (tab) => set((s) => ({ checkOpen: true, checkTab: tab ?? s.checkTab })),
  closeCheck: () => set({ checkOpen: false }),

  focus: null,
  focusNode: (arcId, nodeId) => set({ focus: { arcId, nodeId, seq: ++seq } }),

  playFrom: null,
  requestPlayFrom: (playFrom) => set({ playFrom }),
  playRoute: null,
  requestPlayRoute: (playRoute) => set({ playRoute }),
}));

/** Props for a row whose wire should light up while hovered. */
export function hotRow(nodeId: string, handle: string) {
  return {
    onMouseEnter: () => useUi.getState().setHot({ nodeId, handle }),
    onMouseLeave: () => useUi.getState().setHot(null),
  };
}
