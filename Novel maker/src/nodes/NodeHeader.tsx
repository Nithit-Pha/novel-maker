import { useFlowStore } from '../store';

interface Props {
  id: string;
  icon: string;
  label: string;
  /** Tailwind text-color class for the label, e.g. "text-accent-dialog". */
  accentText: string;
  pinned?: boolean;
}

/** Shared node card header: icon + label + pin toggle + delete button. */
export default function NodeHeader({ id, icon, label, accentText, pinned }: Props) {
  const togglePin = useFlowStore((s) => s.togglePin);
  const deleteNode = useFlowStore((s) => s.deleteNode);

  return (
    <div className="px-3 py-2 border-b border-ink-600 flex items-center gap-2 bg-black/20 rounded-t-lg">
      <span className="text-base">{icon}</span>
      <span className={`text-xs font-semibold uppercase tracking-wider flex-1 ${accentText}`}>
        {label}
      </span>
      <button
        onClick={() => togglePin(id)}
        className={`rounded px-1 text-sm leading-none transition ${
          pinned ? 'text-accent-decision' : 'text-gray-600 hover:text-white'
        }`}
        title={pinned ? 'Unpin' : 'Pin this node'}
      >
        {pinned ? '📌' : '📍'}
      </button>
      <button
        onClick={() => deleteNode(id)}
        className="text-gray-500 hover:text-white hover:bg-accent rounded px-1.5 text-sm"
        title="Delete node"
      >
        ✕
      </button>
    </div>
  );
}
