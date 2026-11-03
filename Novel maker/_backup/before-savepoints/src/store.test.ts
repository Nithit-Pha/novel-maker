import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFlowStore } from './store';

const st = () => useFlowStore.getState();
const v1 = {
  nodes: [
    { id: 'n1', type: 'chapter', position: { x: 0, y: 0 }, data: { kind: 'chapter', name: 'C' } },
    { id: 'n2', type: 'decision', position: { x: 100, y: 0 }, data: { kind: 'decision', prompt: '?', choices: ['A', 'B', 'C'] } },
    { id: 'n3', type: 'dialog', position: { x: 200, y: 0 }, data: { kind: 'dialog', character: 'x', text: 'B!' } },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2' },
    { id: 'e2', source: 'n2', sourceHandle: 'choice-1', target: 'n3' },
  ],
};

beforeEach(() => {
  st().importJSON(JSON.stringify(v1));
});

describe('store', () => {
  it('removing a choice keeps the other choices wired', () => {
    st().removeChoice('n2', '0');
    expect((st().nodes[1].data as { choices: { label: string }[] }).choices.map((c) => c.label)).toEqual(['B', 'C']);
    expect(st().edges.some((e) => e.sourceHandle === 'choice-1' && e.target === 'n3')).toBe(true);
    st().undo();
    expect((st().nodes[1].data as { choices: unknown[] }).choices).toHaveLength(3);
  });

  it('one wire per output handle', () => {
    const before = st().edges.length;
    st().onConnect({ source: 'n2', sourceHandle: 'choice-1', target: 'n1', targetHandle: null });
    const fromB = st().edges.filter((e) => e.sourceHandle === 'choice-1');
    expect(fromB).toHaveLength(1);
    expect(fromB[0].target).toBe('n1');
    expect(st().edges).toHaveLength(before);
  });

  it('a typing burst is one undo step', () => {
    const p0 = st().past.length;
    for (const t of ['H', 'He', 'Hel', 'Hello']) st().updateNodeData('n3', { text: t });
    expect(st().past.length).toBe(p0 + 1);
    st().undo();
    expect((st().nodes[2].data as { text: string }).text).toBe('B!');
  });

  it('variables: add, retype, and save with the project', () => {
    const id = st().addVariable('number');
    st().updateVariable(id, { name: 'trust', initial: 4 });
    expect(st().variables.find((v) => v.id === id)).toMatchObject({ name: 'trust', type: 'number', initial: 4 });
    st().updateVariable(id, { type: 'bool' });
    expect(st().variables.find((v) => v.id === id)).toMatchObject({ type: 'bool', initial: false });
    const p = st().getProject();
    expect(p.version).toBe(3);
    expect(p.variables.map((v) => v.name)).toContain('trust');
  });

  it('reports a full browser storage instead of failing silently', () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    expect(st().saveLocal()).toBe(false);
    expect(st().saveStatus).toBe('error');
    expect(st().saveError).toMatch(/full/);
    spy.mockRestore();
    expect(st().saveLocal()).toBe(true);
    expect(st().saveStatus).toBe('saved');
  });

  it('autosaves shortly after a change (variables included)', () => {
    vi.useFakeTimers();
    st().saveLocal();
    st().addVariable('text');
    expect(st().saveStatus).toBe('unsaved');
    vi.advanceTimersByTime(2000);
    expect(st().saveStatus).toBe('saved');
    expect(JSON.parse(localStorage.getItem('novel-flow-v2')!).variables.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });
});
