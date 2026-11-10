import { BaseEdge, EdgeLabelRenderer, getBezierPath, useStore, type EdgeProps } from '@xyflow/react';
import { useView } from '../ui/viewPrefs';

const MIN_ZOOM_FOR_LABELS = 0.45;

/** The default wire: a curve, plus (optionally) its choice / branch / outcome text next to the output. */
export default function NfEdge(props: EdgeProps) {
  const [path] = getBezierPath(props);
  const showLabels = useView((s) => s.labels);
  const zoom = useStore((s) => s.transform[2]);
  const data = props.data as { wireLabel?: string; hot?: boolean } | undefined;
  const label = showLabels && zoom >= MIN_ZOOM_FOR_LABELS ? data?.wireLabel : undefined;
  return (
    <>
      <BaseEdge id={props.id} path={path} style={props.style} markerEnd={props.markerEnd} interactionWidth={props.interactionWidth} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className={`nf-wire-label ${data?.hot || props.selected ? 'is-hot' : ''}`}
            style={{ transform: `translate(0, -50%) translate(${props.sourceX + 15}px, ${props.sourceY}px)` }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
