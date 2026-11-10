import { useState } from 'react';
import { ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { useFlowStore } from '../store';
import { describeEffects } from '../engine';
import type { Effect } from '../types';
import EffectsEditor from './EffectsEditor';

/** Collapsible "⚡ On enter" effects, shown at the bottom of story nodes. */
export default function OnEnterSection({ id, effects }: { id: string; effects: Effect[] | undefined }) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const variables = useFlowStore((s) => s.variables);
  const classes = useFlowStore((s) => s.classes);
  const count = effects?.length ?? 0;
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-ink-600 pt-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full text-left text-[10px] uppercase tracking-wider flex items-center gap-1 ${
          count ? 'text-accent-condition' : 'text-gray-500 hover:text-gray-300'
        }`}
        title="Change variables when the reader arrives here"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Zap size={11} />
        <span>On enter{count ? ` (${count})` : ''}</span>
        {!open && count > 0 && (
          <span className="normal-case tracking-normal text-gray-400 truncate ml-1">
            {describeEffects(effects, variables, classes)}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-1.5">
          <EffectsEditor
            effects={effects}
            onChange={(onEnter) => updateNodeData(id, { onEnter })}
            addLabel="+ change a variable on arrival"
          />
        </div>
      )}
    </div>
  );
}
