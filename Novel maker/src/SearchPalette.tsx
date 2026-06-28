import { useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useFlowStore } from './store';
import {
  type FlowNode,
  nodeBody,
  nodeIcon,
  nodeTitle,
  searchNodes,
} from './search';

interface Props {
  onClose: () => void;
}

const DEFAULT_W = 270;
const DEFAULT_H = 120;

export default function SearchPalette({ onClose }: Props) {
  const nodes = useFlowStore((s) => s.nodes) as FlowNode[];
  const selectOnly = useFlowStore((s) => s.selectOnly);
  const reactFlow = useReactFlow();

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const pinned = useMemo(() => nodes.filter((n) => n.data.pinned), [nodes]);

  // Empty query → show pinned nodes; otherwise show ranked search results.
  const results = useMemo<FlowNode[]>(
    () => (query.trim() ? searchNodes(nodes, query) : pinned),
    [nodes, query, pinned]
  );

  useEffect(() => {
    setActive(0);
  }, [query]);

  const jump = (node: FlowNode | undefined) => {
    if (!node) return;
    const w = node.measured?.width ?? node.width ?? DEFAULT_W;
    const h = node.measured?.height ?? node.height ?? DEFAULT_H;
    reactFlow.setCenter(node.position.x + w / 2, node.position.y + h / 2, {
      zoom: 1,
      duration: 400,
    });
    selectOnly(node.id);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      jump(results[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const showingPins = !query.trim();

  return (
    <div
      className="fixed inset-0 z-30 bg-black/50 flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      <div
        className="bg-ink-800 border border-ink-600 rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-600">
          <span className="text-gray-400">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search scenes, dialog, decisions, tags…"
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-500"
          />
          <kbd className="text-[10px] text-gray-500 border border-ink-600 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          {showingPins && (
            <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-gray-500">
              {pinned.length ? '📌 Pinned' : 'Type to search'}
            </div>
          )}

          {results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-500 italic text-center">
              {showingPins ? 'No pinned nodes yet. Pin a node with 📍 in its header.' : 'No matches.'}
            </p>
          ) : (
            <ul className="py-1">
              {results.map((node, i) => (
                <li key={node.id}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => jump(node)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-2 transition ${
                      i === active ? 'bg-ink-700' : 'hover:bg-ink-700/50'
                    }`}
                  >
                    <span className="text-base leading-5 mt-0.5">{nodeIcon(node)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm text-white truncate">{nodeTitle(node)}</span>
                        {node.data.pinned && <span className="text-[11px]">📌</span>}
                      </span>
                      <span className="block text-xs text-gray-400 truncate">{nodeBody(node)}</span>
                      {(node.data.tags ?? []).length > 0 && (
                        <span className="block mt-0.5 text-[11px] text-accent-dialog truncate">
                          {(node.data.tags ?? []).map((t) => `#${t}`).join(' ')}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-4 py-2 border-t border-ink-600 text-[11px] text-gray-500 flex gap-3">
          <span>↑↓ navigate</span>
          <span>↵ jump</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
}
