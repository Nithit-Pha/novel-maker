// Pure helpers for searching, titling, and tagging nodes.
// Kept dependency-free and side-effect-free so it's easy to test.

import type { Node } from '@xyflow/react';
import type { NodeData } from './types';

export type FlowNode = Node<NodeData>;

/** Icon shown for each node kind in lists. */
export function nodeIcon(node: FlowNode): string {
  switch (node.data.kind) {
    case 'dialog':
      return '💬';
    case 'decision':
      return '🔀';
    case 'scene':
      return '🎬';
    case 'loop':
      return '🔁';
    case 'chapter':
      return '📖';
    default:
      return '•';
  }
}

/** Short human label for a node, used in search results and the pin list. */
export function nodeTitle(node: FlowNode): string {
  const d = node.data;
  if (d.kind === 'dialog') {
    const who = d.character?.trim();
    const line = d.text?.trim();
    if (who && line) return `${who}: ${truncate(line, 50)}`;
    return who || truncate(line, 60) || 'Dialog';
  }
  if (d.kind === 'decision') {
    return truncate(d.prompt?.trim(), 60) || 'Decision';
  }
  if (d.kind === 'scene') {
    return truncate(d.background?.trim(), 60) || truncate(d.description?.trim(), 60) || 'Scene';
  }
  if (d.kind === 'loop') return truncate(d.title?.trim(), 60) || 'Loop';
  // chapter
  return truncate(d.name?.trim(), 60) || 'Chapter';
}

/** A longer body string used for snippet display. */
export function nodeBody(node: FlowNode): string {
  const d = node.data;
  if (d.kind === 'dialog') return d.text ?? '';
  if (d.kind === 'decision') return [d.prompt, ...(d.choices ?? [])].filter(Boolean).join(' · ');
  if (d.kind === 'scene') return d.description ?? '';
  if (d.kind === 'loop') return [d.title, ...(d.items ?? []).map((it) => it.label)].filter(Boolean).join(' · ');
  return d.name ?? '';
}

/** All searchable text for a node (title fields + body + tags), lower-cased. */
export function searchableText(node: FlowNode): string {
  const d = node.data;
  const parts: string[] = [];
  if (d.kind === 'dialog') parts.push(d.character ?? '', d.text ?? '');
  else if (d.kind === 'decision') parts.push(d.prompt ?? '', ...(d.choices ?? []));
  else if (d.kind === 'scene') parts.push(d.background ?? '', d.description ?? '');
  else if (d.kind === 'loop') parts.push(d.title ?? '', ...(d.items ?? []).map((it) => it.label));
  else parts.push(d.name ?? '');
  parts.push(...(d.tags ?? []));
  return parts.join(' \n ').toLowerCase();
}

/** Case-insensitive substring match across a node's searchable text. */
export function matchNode(node: FlowNode, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return searchableText(node).includes(q);
}

/**
 * Light relevance score (higher = better). Title/character/background hits
 * rank above body-only hits; an exact-ish prefix on the title ranks highest.
 */
export function scoreNode(node: FlowNode, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const title = nodeTitle(node).toLowerCase();
  let score = 0;
  if (title.startsWith(q)) score += 100;
  if (title.includes(q)) score += 40;
  if (searchableText(node).includes(q)) score += 10;
  // tag exact match is a strong signal
  if ((node.data.tags ?? []).some((t) => t.toLowerCase() === q)) score += 60;
  return score;
}

/** Search + sort. Returns matching nodes, best first. */
export function searchNodes(nodes: FlowNode[], query: string): FlowNode[] {
  const q = query.trim();
  if (!q) return [];
  return nodes
    .filter((n) => matchNode(n, q))
    .sort((a, b) => scoreNode(b, q) - scoreNode(a, q));
}

/** Unique, sorted list of every tag in use across all nodes. */
export function allTags(nodes: FlowNode[]): string[] {
  const set = new Set<string>();
  for (const n of nodes) for (const t of n.data.tags ?? []) if (t.trim()) set.add(t.trim());
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** True if a node matches the active tag filter (OR semantics; empty = all). */
export function nodeMatchesTags(node: FlowNode, activeTags: string[]): boolean {
  if (activeTags.length === 0) return true;
  const tags = node.data.tags ?? [];
  return activeTags.some((t) => tags.includes(t));
}

function truncate(s: string | undefined, n: number): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}
