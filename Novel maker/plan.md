# Novel Flow — Improvement Plan

Audit date: 2026-06-12
Codebase: React 18 + TypeScript + Vite + Zustand 4 + @xyflow/react 12 (~1,030 lines in `src/`)

This plan is split into **Part 1: Code** (architecture, patterns, data flow, security, quality) and **Part 2: Features** (ranked by impact-for-effort). Each item includes the problem, why it matters, the fix, affected files, and estimated effort.

---

## Part 1: Code

### 1.1 Architecture

#### A1. Replace `nextId` counter with UUIDs — **HIGH, bug**
- **Problem:** Node IDs come from an incrementing counter (`nextId` in `store.ts`). Importing a JSON whose `nextId` is lower than IDs already on the canvas (or merging two files) creates duplicate node IDs. React Flow keys break, edges attach to the wrong node, undo corrupts.
- **Fix:** Generate IDs with `crypto.randomUUID()` in `addNode`. Delete `nextId` from `FlowState`, `Snapshot`, `saveLocal`, `loadLocal`, `exportJSON`, `importJSON`, `undo`, `redo`, `reset`. Keep accepting old save files that contain `nextId` (just ignore the field).
- **Files:** `src/store.ts`
- **Effort:** ~30 min

#### A2. Introduce a project/document wrapper — **MEDIUM**
- **Problem:** The store holds one anonymous graph. There is no title, no timestamps, no room for settings or multiple projects.
- **Fix:** Wrap persisted state:
  ```ts
  interface Project {
    version: 2;            // see A3
    meta: { title: string; createdAt: string; updatedAt: string };
    nodes: Node<NodeData>[];
    edges: Edge[];
  }
  ```
  Show the title in the toolbar (editable). Update `updatedAt` on save.
- **Files:** `src/store.ts`, `src/types.ts`, `src/Toolbar.tsx`
- **Effort:** ~1–2 h

#### A3. Version the save format — **HIGH, cheap now / expensive later**
- **Problem:** The localStorage key is `novel-flow-v1` but the JSON itself has no `version` field. Any future schema change (e.g. variables in F4) can't be migrated safely.
- **Fix:** Add `version: number` to every export/save. On load, run a `migrate(data)` function: unversioned → v1 → v2 → … Each migration is a small pure function; keep them forever.
- **Files:** `src/store.ts` (new `src/migrations.ts` once there are 2+)
- **Effort:** ~30 min

#### A4. Extract the play engine into a pure module — **MEDIUM**
- **Problem:** `findStart` and `nextNodeId` live inside `PlayMode.tsx`. They're pure graph logic mixed into a UI file, so they can't be unit-tested or reused (e.g. by the validation panel F3 or export F6).
- **Fix:** Create `src/engine.ts` exporting `findStart(nodes, edges)`, `nextNodeId(id, edges, handleId?)`, and later `validateGraph(nodes, edges)`. `PlayMode` imports from it.
- **Files:** new `src/engine.ts`, `src/PlayMode.tsx`
- **Effort:** ~30 min

#### A5. Snapshot-based undo memory ceiling — **LOW, watch**
- **Problem:** Every history entry is a `structuredClone` of the entire graph, capped at 50 entries. At 500+ nodes with long prose, that's potentially tens of MB held in memory.
- **Fix (deferred):** Only act if it actually hurts. Options, in order of effort: lower `HISTORY_LIMIT`; store JSON-string snapshots (cheaper than live objects); switch to a command/diff pattern (each entry stores only what changed + inverse).
- **Files:** `src/store.ts`
- **Effort:** 0 now; 0.5–2 days if/when needed

---

### 1.2 Patterns

#### P1. Deduplicate node component boilerplate — **MEDIUM**
- **Problem:** `StartNode`, `DialogNode`, `DecisionNode` each repeat: the `useFlowStore` selectors, the card container with selected-border logic, the header row (icon, label, ✕ delete button), and `nodrag` + `onMouseDown stopPropagation` on every input.
- **Fix:**
  - `src/nodes/NodeShell.tsx` — card frame + header + delete button, taking `icon`, `label`, `accentClass`, `selected`, `onDelete`, `children`.
  - `src/nodes/Field.tsx` — labelled input/textarea with the `nodrag`/`stopPropagation` baked in.
  - Optional `useNodeActions(id)` hook returning `{ update, remove }`.
- **Files:** new `src/nodes/NodeShell.tsx`, `src/nodes/Field.tsx`; rewrite the three node files (each shrinks to ~25 lines of actual content)
- **Effort:** ~2 h

#### P2. BUG: removing a Decision choice doesn't remap edges — **HIGH, silent data corruption**
- **Problem:** `removeChoice(idx)` in `DecisionNode.tsx` filters the choices array, shifting later choices down by one. But edges reference handles by index (`choice-1`, `choice-2`…). Delete choice 0 and the edge wired to `choice-1` now points at what *was* choice 2. Branches silently rewire; the edge for the removed choice dangles.
- **Fix:** Move choice removal into the store (`removeChoice(nodeId, idx)`) so it can atomically: delete edges with `sourceHandle === 'choice-{idx}'`, renumber `sourceHandle` for all edges with index > idx, and push one history entry. Long-term better fix: give each choice a stable ID (`{ id: string; label: string }`) so handles are `choice-{id}` and never shift — do this together with A3's migration.
- **Files:** `src/store.ts`, `src/nodes/DecisionNode.tsx`, (`src/types.ts` for the stable-ID variant)
- **Effort:** ~1 h (index fix) or ~2–3 h (stable IDs + migration, recommended)

#### P3. BUG: Delete-key removal pushes history twice — **MEDIUM**
- **Problem:** Pressing Delete on a selected node makes React Flow emit a node `remove` change *and* edge `remove` changes. `onNodesChange` and `onEdgesChange` each call `pushHistory()`, so one user action creates two history entries — one Undo restores the edges but not the node (half-restored state).
- **Fix:** Batch: in `onNodesChange`, when removes are present, snapshot once and also clean the affected edges in the same `set()`. Or debounce `pushHistory` within a microtask so simultaneous changes coalesce into one entry. Verify the ✕-button path (`deleteNode`) and the Delete-key path end up equivalent.
- **Files:** `src/store.ts`
- **Effort:** ~1–2 h incl. manual undo/redo testing

#### P4. Empty history entries from click-without-drag — **LOW**
- **Problem:** `onNodeDragStart` fires `commitDrag()` (a history push) even when the user just clicks a node and releases without moving. Undo then appears to "do nothing."
- **Fix:** Record positions on drag start; on `onNodeDragStop`, push history only if any position actually changed. (Note this also fixes the ordering quirk: history should capture pre-drag state, which recording-on-start does correctly — just don't *commit* unless something moved.)
- **Files:** `src/App.tsx`, `src/store.ts`
- **Effort:** ~45 min

#### P5. Edge ID collisions — **LOW**
- **Problem:** `onConnect` builds edge IDs from `Date.now()`; two connects in the same millisecond collide.
- **Fix:** `crypto.randomUUID()` (same change as A1).
- **Files:** `src/store.ts`
- **Effort:** 5 min

---

### 1.3 Data flow & persistence

#### D1. Autosave + dirty tracking — **HIGH, top priority overall**
- **Problem:** Typing in node fields is not in undo history *and* is only persisted when the user manually saves. Closing the tab loses prose — the worst possible failure for a writing tool. There's no unsaved-changes indicator and no `beforeunload` guard.
- **Fix:**
  1. Add `dirty: boolean` to the store; set true in every mutating action, false in `saveLocal`.
  2. Debounced autosave: subscribe to the store, save to localStorage 2 s after the last change.
  3. `beforeunload` handler warning when `dirty` (belt-and-braces; autosave makes it rare).
  4. Toolbar shows ● unsaved / ✓ saved state instead of mutating button text (see Q1).
- **Files:** `src/store.ts`, `src/App.tsx`, `src/Toolbar.tsx`
- **Effort:** ~2 h

#### D2. localStorage quota failure is silent — **MEDIUM**
- **Problem:** localStorage caps at ~5 MB. A long novel makes `saveLocal` throw `QuotaExceededError`, which is currently uncaught — the user thinks they saved and they didn't.
- **Fix (short-term):** try/catch around `setItem`; on failure show a visible error and prompt the user to Export.
- **Fix (long-term):** Move persistence to IndexedDB via `idb-keyval` (~600 B, same async get/set API). Migrate existing localStorage data on first run. Unlocks F8 multi-project storage.
- **Files:** `src/store.ts`
- **Effort:** 30 min (catch) / ~2 h (IndexedDB)

#### D3. Schema validation on import and load — **HIGH, security & robustness**
- **Problem:** `importJSON` and `loadLocal` only check that JSON parses. A malformed file (`nodes: "hello"`, node missing `data`, unknown `kind`, choices not an array) replaces the user's work *first* and crashes at render time *after*. Corrupted localStorage bricks the app on every launch.
- **Fix:** Validate before `set()`:
  - Add `zod` and define schemas mirroring `types.ts` (`NodeDataSchema` as a discriminated union on `kind`, `ProjectSchema` for the whole file).
  - `importJSON`: parse → validate → only then `pushHistory()` + `set()`. On failure return a *reason string* so the toolbar can show "Import failed: node n3 missing 'data.kind'" instead of a bare `alert('Invalid JSON file')`.
  - `loadLocal`: validate; on failure, keep the demo graph and console.warn (optionally stash the corrupt blob under `novel-flow-v1-corrupt` for recovery).
  - Also sanity-check edges: drop any edge whose source/target node doesn't exist.
- **Files:** new `src/schema.ts`, `src/store.ts`, `src/Toolbar.tsx`, `package.json` (+zod)
- **Effort:** ~3 h

---

### 1.4 Security

#### S1. Current XSS posture — **OK, keep it that way**
- All user text renders through JSX text nodes, which React escapes; no `dangerouslySetInnerHTML` anywhere. The app is a static client-only build (no backend, no secrets, no auth surface).
- **Rule going forward:** if rich text is ever added, do NOT store/render HTML. Use a structured format (Markdown rendered with a safe renderer, or a JSON doc model like TipTap/ProseMirror) and never inject raw strings into the DOM.

#### S2. Untrusted import files — covered by D3
- Import is the only untrusted input vector. Schema validation (D3) plus React's escaping closes it. Additionally cap import file size (e.g. reject > 20 MB before parsing) to avoid tab-freezing on a hostile/accidental huge file.

#### S3. Supply chain & build hygiene — **LOW**
- 4 runtime deps is admirably small; keep it so. Add `npm audit` to CI (see Q3). Pin Node version in `package.json#engines` (`>=18`). When deploying the static `dist/`, set basic headers at the host: `Content-Security-Policy` (no inline script needed in a Vite build), `X-Content-Type-Options: nosniff`.

---

### 1.5 Code quality & tooling

#### Q1. Toolbar "Saved ✓" mutates the DOM directly — **LOW**
- **Problem:** `handleSave` writes `btn.textContent` on `document.activeElement`, fighting React's ownership of the DOM (and targeting the wrong element if focus moved).
- **Fix:** `const [justSaved, setJustSaved] = useState(false)` + timeout; render label from state. Merges naturally with D1's dirty indicator.
- **Files:** `src/Toolbar.tsx` — ~20 min

#### Q2. Stale closure in PlayMode keyboard handler — **MEDIUM**
- **Problem:** The keydown effect lists `[currentId, history.length]` with `exhaustive-deps` disabled, closing over `current`, `goNext`, `goBack`, `onClose`. Works today only because re-subscription happens to be triggered by the right deps; any refactor breaks it silently.
- **Fix:** Either include real deps (cheap — re-adding a window listener is trivial) or keep a `useRef` to the latest handlers and subscribe once. Remove the eslint-disable.
- **Files:** `src/PlayMode.tsx` — ~30 min

#### Q3. No lint config, no tests, no CI — **HIGH for sustainability**
- **Problem:** `npm run lint` is in `package.json` but there's no eslint config in the repo, so it fails. Zero tests.
- **Fix:**
  1. `eslint.config.js` (flat config) with `typescript-eslint`, `eslint-plugin-react-hooks`.
  2. Add `vitest` (Vite-native, zero config). First test targets, in order: `engine.ts` (findStart, nextNodeId — pure, easy), `schema.ts` validation (good/bad fixtures), store actions (undo/redo invariants, P2/P3 regressions).
  3. GitHub Actions: `npm ci && npm run lint && npm test && npm run build` on push.
- **Files:** new `eslint.config.js`, `vitest` config in `vite.config.ts`, `src/*.test.ts`, `.github/workflows/ci.yml`
- **Effort:** ~half a day

#### Q4. Repo hygiene — **LOW**
- `novel-flow-prototype.html` (25 KB) at the root is a leftover prototype — move to `docs/` or delete (it's in git history anyway).
- `index.html` title/meta: confirm title is "Novel Flow" and add a description meta tag.
- **Effort:** 10 min

---

## Part 2: Features

Ranked by impact-for-effort. F1–F3 are quality-of-life; F4 is the strategic leap; the rest are growth.

### F1. Autosave + unsaved-changes indicator — *(same as D1; listed here because it's user-facing)*
Top priority. See D1 for implementation.

### F2. Node search / command palette — **HIGH value, ~1 day**
- Graphs become unnavigable around 30+ nodes.
- Ctrl+K opens a palette; fuzzy-search across character names, dialog text, decision prompts, choice labels. Selecting a result calls `reactFlow.setCenter(x, y, { zoom: 1 })` and selects the node.
- Stretch: filter chips by node type, by character.
- **Files:** new `src/SearchPalette.tsx`, hook into `Toolbar`/`App`.

### F3. Validation panel ("story health") — **HIGH value, ~1 day**
- The Play mode already flags "(unconnected)" choices; surface problems in the *editor* instead of at playtime.
- `validateGraph(nodes, edges)` in `engine.ts` (see A4) returning warnings: no Start node; orphan nodes (unreachable from start); dead ends that aren't intentional endings; decision choices with no wired edge; empty text fields; cycles (warn only — loops can be intentional).
- UI: a collapsible side panel listing issues; clicking one centers the canvas on the offending node (reuses F2's centering). Badge with issue count in the toolbar.
- **Files:** `src/engine.ts`, new `src/ValidationPanel.tsx`, `src/Toolbar.tsx`

### F4. Variables & conditional branching — **STRATEGIC, ~1–2 weeks**
- The leap from "flowchart toy" to a real interactive-fiction tool (Twine/ink territory).
- **Data model** (requires A3 versioning + P2 stable choice IDs first):
  - Project-level variable declarations: `{ name, type: 'boolean' | 'number' | 'string', initial }`.
  - Choices gain optional `effects` (`set has_key = true`, `gold += 5`) and an optional `condition` (`has_key === true`) that hides/disables the choice at runtime.
  - New **Condition node**: routes to one of N outputs by evaluating expressions in order (like an if/else-if chain).
- **Runtime:** PlayMode keeps a `variables` map in state; the Back button must snapshot variables per step so stepping back rewinds them.
- **Safety:** do NOT `eval()` conditions. Write a tiny expression evaluator (comparison + boolean ops + literals + variable refs — ~150 lines) or use a sandboxed lib like `jsep` + hand-written interpreter.
- **UI:** variables sidebar (declare/inspect), condition/effect editors on choices, live variable display in Play mode (debug toggle).

### F5. More node types — **MEDIUM, ~2–4 days**
- **End node** — named endings ("Good Ending", "Death by curiosity") instead of generic "THE END"; Play mode shows the ending title; validation (F3) distinguishes intentional endings from accidental dead ends.
- **Note node** — author comments, no runtime behavior, excluded from play/validation.
- **Chapter/Scene grouping** — React Flow group nodes or a simple colored-frame node; collapsible later.
- Each type: add to the `NodeData` union, a component, `nodeTypes` map, a toolbar button, default data, demo usage, and a schema entry in D3.

### F6. Export to readable formats — **MEDIUM, ~2–3 days**
- Writers need their story *out* of the graph eventually.
- **Markdown/screenplay export:** depth-first walk from Start; linear sections per branch with anchors at decisions ("→ go to *Mansion path*"). Character lines in screenplay style.
- **Single-path export:** after a Play session, export the path just taken as clean prose.
- **Twine (Twee 3) / ink export:** maps cleanly — nodes → passages/knots, choices → links/choices. Makes Novel Flow interoperable rather than a silo.
- **Files:** new `src/export/` module reusing `engine.ts` traversal.

### F7. Play from selected node — **EASY, ~half a day**
- Right-click (or button on selection) → "▶ Play from here". `PlayMode` already accepts props; add optional `startId` overriding `findStart`. Pairs well with F4 (needs a way to seed variable values when starting mid-graph — a simple dialog or "assume defaults").

### F8. Multiple projects — **MEDIUM, ~2–3 days; requires A2 + D2 (IndexedDB)**
- Project list screen (or dropdown in toolbar): create, rename, duplicate, delete, last-edited timestamps.
- Each project stored under its own IndexedDB key; "current project id" pointer.
- Import creates a new project instead of overwriting the canvas (fixes a current footgun where Import destroys your open work with only undo as a safety net).

### F9. Edge labels for decision branches — **EASY, ~half a day**
- Show the choice text (truncated ~24 chars) as a label on each decision edge so the graph reads without opening nodes. React Flow edge `label` prop, derived at render time from the source node's choice — no schema change. Toggle in toolbar for de-cluttering.

### F10. Auto-layout — **EASY-MEDIUM, ~1 day**
- One-click "Tidy" button running `dagre` (simple) or `elkjs` (prettier) left-to-right layout, then `fitView`. Push one undo entry so it's reversible. Optional "layout selection only".

### Later / icebox
- Collaborative editing (CRDT/yjs) — large effort; only if sharing becomes real.
- Cloud sync — requires backend + auth; revisit after F8.
- Rich text in dialog (see S1 constraints).
- Image/portrait support on characters with a character manager panel.
- Mobile/touch support — React Flow handles basics; Play mode is nearly there already.

---

## Suggested execution order

| Phase | Items | Theme |
|-------|-------|-------|
| 1 — Stop the bleeding (~2 days) | D1 autosave, D3 validation, P2 choice-edge bug, A1/P5 UUIDs, D2 quota catch | Data safety |
| 2 — Foundations (~2 days) | A3 versioning, A2 project wrapper, A4 engine extraction, Q3 lint+tests+CI, P3, Q1, Q2 | Sustainability |
| 3 — Editor QoL (~3 days) | F2 search, F3 validation panel, F9 edge labels, F7 play-from-node, P1 NodeShell, P4 | Daily usability |
| 4 — Strategic (~2 weeks) | P2 stable choice IDs, F4 variables/conditions, F5 End+Note nodes, F6 exports | Real IF tool |
| 5 — Scale (~1 week) | D2 IndexedDB, F8 multi-project, F10 auto-layout, A5 if needed | Growth |
