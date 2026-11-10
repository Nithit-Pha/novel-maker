import { describe, expect, it } from 'vitest';
import { migrateProject } from './project';

describe('migrateProject', () => {
  it('v1: string choices become {id,label} and old index wires still match', () => {
    const p = migrateProject({
      nodes: [{ id: 'n2', type: 'decision', position: { x: 0, y: 0 }, data: { kind: 'decision', prompt: '', choices: ['A', 'B'] } }],
      edges: [{ id: 'e', source: 'n2', sourceHandle: 'choice-1', target: 'n3' }],
    });
    expect(p.version).toBe(3);
    expect(p.variables).toEqual([]);
    expect((p.arcs[0].nodes[0].data as { choices: unknown }).choices).toEqual([
      { id: '0', label: 'A' },
      { id: '1', label: 'B' },
    ]);
  });
  it('re-ids nodes repeated across arcs and rewires edges', () => {
    const arc = (id: string) => ({
      id,
      name: id,
      nodes: [
        { id: 'n1', type: 'chapter', position: { x: 0, y: 0 }, data: { kind: 'chapter', name: '' } },
        { id: 'n2', type: 'dialog', position: { x: 0, y: 0 }, data: { kind: 'dialog', character: '', text: '' } },
      ],
      edges: [{ id: 'e', source: 'n1', target: 'n2' }],
    });
    const p = migrateProject({ version: 2, activeArcId: 'a', arcs: [arc('a'), arc('b')] });
    const ids = p.arcs.flatMap((a) => a.nodes.map((n) => n.id));
    expect(new Set(ids).size).toBe(4);
    const b = p.arcs[1];
    expect(b.edges[0].source).toBe(b.nodes[0].id);
    expect(b.edges[0].target).toBe(b.nodes[1].id);
  });
  it('v3: keeps and sanitizes variables', () => {
    const p = migrateProject({
      version: 3,
      arcs: [],
      variables: [
        { id: 'a', name: 'trust', type: 'number', initial: '3' },
        { id: 'b', name: 'flag', type: 'weird', initial: 1 },
        null,
      ],
    });
    expect(p.variables).toEqual([
      { id: 'a', name: 'trust', type: 'number', initial: 3, note: undefined },
      { id: 'b', name: 'flag', type: 'number', initial: 1, note: undefined },
    ]);
  });
});
