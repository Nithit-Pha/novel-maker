// Minimal in-memory localStorage for store tests (Node has none).
const mem = new Map<string, string>();
const storage = {
  getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
};
(globalThis as unknown as { localStorage: typeof storage }).localStorage = storage;
