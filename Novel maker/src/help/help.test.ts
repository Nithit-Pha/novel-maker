import { describe, expect, it } from 'vitest';
import { CARD_HELP, CARD_ORDER, HELP_TOPICS, filterTopics, topicText } from './helpContent';
import { NODE_LABELS } from '../ui/icons';
import { parse } from '../ui/router';
import { migrateProject } from '../project';

describe('How to use guide', () => {
  it('has help for every card type, in the guide order', () => {
    const kinds = Object.keys(NODE_LABELS).sort();
    expect(Object.keys(CARD_HELP).sort()).toEqual(kinds);
    expect([...CARD_ORDER].sort()).toEqual(kinds);
    for (const k of CARD_ORDER) expect(CARD_HELP[k].what.length).toBeGreaterThan(20);
  });
  it('topic ids are unique and every [[link]] points at a topic', () => {
    const ids = HELP_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of HELP_TOPICS) for (const m of topicText(t).matchAll(/\[\[([^\]|]+)\|/g)) expect(ids).toContain(m[1]);
  });
  it('search needs every word and also searches card help', () => {
    expect(filterTopics('').length).toBe(HELP_TOPICS.length);
    expect(filterTopics('save point').map((t) => t.id)).toContain('savepoints');
    expect(filterTopics('weights odds').map((t) => t.id)).toEqual(['cards']);
    expect(filterTopics('zzz nothing')).toEqual([]);
  });
  it('routes #/help and #/help/<topic>', () => {
    expect(parse('#/help')).toEqual({ page: 'help' });
    expect(parse('#/help/classes')).toEqual({ page: 'help', topic: 'classes' });
    expect(parse('#/p/My%20Story')).toEqual({ page: 'project', name: 'My Story' });
    expect(parse('#/')).toEqual({ page: 'home' });
  });
});

describe('main character', () => {
  const base = { version: 3, meta: { title: 't' }, activeArcId: 'A', arcs: [{ id: 'A', name: 'A', nodes: [], edges: [] }], variables: [] };
  it('survives load; bad values dropped; one for now', () => {
    expect(migrateProject({ ...base, mainCharacterIds: ['c1'] }).mainCharacterIds).toEqual(['c1']);
    expect(migrateProject({ ...base, mainCharacterIds: [5, '', 'c2', 'c3'] }).mainCharacterIds).toEqual(['c2']);
    expect(migrateProject(base).mainCharacterIds).toEqual([]);
  });
});
