import { describe, expect, it } from 'vitest';
import { buildIndex, choose, currentNode, next, startAt, startPlay, type PlayState } from './core.js';
import { sceneBefore, sceneUsage } from '../analysis/scenes';
import { validateProject } from '../analysis/validate';
import { migrateProject } from '../project';

// a (harbor) → b → c (decision) ─1→ d (condition, cave) → e ("none") → f
//                               └2→ g (keeps harbor) → h
const node = (id: string, type: string, data: Record<string, unknown> = {}, x = 0) => ({
  id,
  type,
  position: { x, y: 0 },
  data: { kind: type, ...data },
});
const story = {
  arcs: [
    {
      id: 'arc',
      name: 'Arc',
      nodes: [
        node('a', 'chapter', { name: 'One', sceneId: 'harbor' }, -100),
        node('b', 'dialog', { text: 'hi' }),
        node('c', 'decision', { prompt: '?', choices: [{ id: '1', label: 'x' }, { id: '2', label: 'y' }] }),
        node('d', 'condition', { branches: [], sceneId: 'cave' }),
        node('e', 'dialog', { text: 'dark', sceneId: 'none' }),
        node('f', 'end', {}),
        node('g', 'dialog', { text: 'same place' }),
        node('h', 'end', {}),
      ],
      edges: [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
        { source: 'c', sourceHandle: 'choice-1', target: 'd' },
        { source: 'd', sourceHandle: 'else', target: 'e' },
        { source: 'e', target: 'f' },
        { source: 'c', sourceHandle: 'choice-2', target: 'g' },
        { source: 'g', target: 'h' },
      ],
    },
  ],
  variables: [],
};
const idx = buildIndex(story as never);
const at = (s: PlayState) => currentNode(idx, s)?.id ?? null;

describe('scene backgrounds in the runtime', () => {
  it('a scene set on a card stays on the cards after it', () => {
    let s = startPlay(idx, 'arc');
    expect([at(s), s.scene]).toEqual(['a', 'harbor']);
    s = next(idx, s);
    expect([at(s), s.scene]).toEqual(['b', 'harbor']);
    s = next(idx, s);
    expect([at(s), s.scene]).toEqual(['c', 'harbor']);
    const other = choose(idx, s, '2');
    expect([at(other), other.scene]).toEqual(['g', 'harbor']);
  });

  it('routers can switch it and "none" clears it', () => {
    let s = next(idx, next(idx, startPlay(idx, 'arc')));
    s = choose(idx, s, '1'); // passes through the condition (cave) and lands on e (none)
    expect([at(s), s.scene]).toEqual(['e', null]);
    s = next(idx, s);
    expect([at(s), s.scene]).toEqual(['f', null]);
  });

  it('Play from here can start with the scene leading to the card', () => {
    const arc = story.arcs[0];
    expect(sceneBefore(arc.nodes as never, arc.edges as never, 'g')).toBe('harbor');
    expect(sceneBefore(arc.nodes as never, arc.edges as never, 'f')).toBe(null); // nearest is e: "none"
    expect(sceneBefore(arc.nodes as never, arc.edges as never, 'a')).toBe(null);
    const s = startAt(idx, 'arc', 'g', {}, undefined, undefined, 'harbor');
    expect([at(s), s.scene]).toEqual(['g', 'harbor']);
    expect(startAt(idx, 'arc', 'e', {}, undefined, undefined, 'harbor').scene).toBe(null);
  });

  it('old saves without scenes play with no background', () => {
    expect(startPlay(buildIndex({ arcs: [{ id: 'x', name: 'x', nodes: [node('n', 'dialog')], edges: [] }] }), 'x').scene).toBe(null);
  });
});

describe('scene usage and Story check', () => {
  const project = migrateProject({ version: 3, arcs: story.arcs, variables: [] });

  it('counts cards per scene (not "none")', () => {
    const u = sceneUsage(project);
    expect(u.get('harbor')).toBe(1);
    expect(u.get('cave')).toBe(1);
    expect(u.has('none')).toBe(false);
  });

  it('warns about scenes missing from the Library', () => {
    const missing = (ids: string[]) =>
      validateProject(project, { sceneIds: new Set(ids) }).filter((i) => i.message.includes('no longer in the Library'));
    expect(missing(['harbor', 'cave'])).toHaveLength(0);
    expect(missing(['harbor']).map((i) => i.nodeId)).toEqual(['d']);
    // without a library list (e.g. older callers) nothing is reported
    expect(validateProject(project).some((i) => i.message.includes('Library'))).toBe(false);
  });
});
