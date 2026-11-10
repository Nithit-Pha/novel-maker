import { useEffect, useRef } from 'react';
import { snapshotProject, useFlowStore } from '../store';
import { useUi } from '../ui/uiStore';
import { structuralReach, validateProject, type Issue } from './validate';
import { exploreRoutes, type ExploreResult } from './explore';
import { useSceneStore } from '../library/sceneStore';

const VALIDATE_DELAY = 250;
const EXPLORE_DELAY = 1000;

function explorerIssues(r: ExploreResult, reachable: Set<string>): Issue[] {
  if (r.truncated) return [];
  const out: Issue[] = [];
  for (const e of r.endings) {
    if (e.reachable || !reachable.has(e.nodeId)) continue; // structurally unreachable is reported already
    out.push({
      id: `explore:end:${e.nodeId}`,
      severity: 'warning',
      arcId: e.arcId,
      nodeId: e.nodeId,
      message: 'No route reaches this ending — the rules on the way here can never all be true.',
    });
  }
  for (const c of r.alwaysLocked) {
    out.push({
      id: `explore:lock:${c.nodeId}:${c.choiceId}`,
      severity: 'note',
      arcId: c.arcId,
      nodeId: c.nodeId,
      message: `Choice ${c.index + 1} is locked on every route.`,
    });
  }
  return out;
}

/**
 * Keeps Story check up to date: structural checks ~250 ms after each edit,
 * the route explorer ~1 s after edits while the Story check panel is open.
 */
export function useStoryAnalysis() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const arcs = useFlowStore((s) => s.arcs);
  const graphs = useFlowStore((s) => s.graphs);
  const variables = useFlowStore((s) => s.variables);
  const classes = useFlowStore((s) => s.classes);
  const checkOpen = useUi((s) => s.checkOpen);
  const sceneKey = useSceneStore((s) => s.scenes.map((x) => x.id).join(','));
  const structural = useRef<Issue[]>([]);
  const derived = useRef<Issue[]>([]);
  // Only story content matters: ignore selection / measured-size changes.
  const signature = JSON.stringify([
    arcs,
    variables,
    classes,
    nodes.map((n) => [n.id, n.type, n.data, Math.round(n.position.x / 50)]),
    edges.map((e) => [e.source, e.sourceHandle, e.target]),
  ]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const project = snapshotProject(useFlowStore.getState());
      structural.current = validateProject(project, { sceneIds: new Set(useSceneStore.getState().scenes.map((x) => x.id)) });
      useUi.getState().setIssues([...structural.current, ...derived.current]);
    }, VALIDATE_DELAY);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, graphs, sceneKey]);

  useEffect(() => {
    if (!checkOpen) {
      derived.current = [];
      useUi.getState().setIssues(structural.current);
      return;
    }
    const ui = useUi.getState();
    ui.setExplore(ui.explore, true);
    const t = window.setTimeout(() => {
      const project = snapshotProject(useFlowStore.getState());
      const result = exploreRoutes(project);
      derived.current = explorerIssues(result, structuralReach(project).nodes);
      useUi.getState().setExplore(result, false);
      useUi.getState().setIssues([...structural.current, ...derived.current]);
    }, EXPLORE_DELAY);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, graphs, checkOpen]);
}
