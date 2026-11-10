import {
  Backpack,
  Clapperboard,
  Compass,
  Dices,
  Flag,
  MessageCircle,
  Orbit,
  Play,
  Repeat,
  Split,
  type LucideIcon,
} from 'lucide-react';
import type { NodeKind } from '../types';

/** One icon per node type, used by node headers, menus, search and the toolbar. */
export const NODE_ICONS: Record<NodeKind, LucideIcon> = {
  chapter: Play,
  dialog: MessageCircle,
  scene: Clapperboard,
  decision: Split,
  loop: Repeat,
  portal: Orbit,
  condition: Compass,
  chance: Dices,
  status: Backpack,
  end: Flag,
};

export const NODE_LABELS: Record<NodeKind, string> = {
  chapter: 'Chapter',
  dialog: 'Dialogue',
  scene: 'Scene',
  decision: 'Decision',
  loop: 'Loop',
  portal: 'Go to Arc',
  condition: 'Condition',
  chance: 'Chance',
  status: 'Status',
  end: 'Ending',
};
