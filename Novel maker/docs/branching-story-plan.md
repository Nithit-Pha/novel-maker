# Novel Flow — Branching Story Plan (Path 1)

Date: 2026-11-02 · Approved direction: **B — story variables + conditions**, roadmap **Path 1: Safety → Story state → Overview**, then usability.

Goal: let every decision open (or close) future timelines **without copying the rest of the story per choice**. Branches may rejoin and still remember what happened.

---

## Phase 0 — Safety fixes ✅ done (2026-11-02)

| Fix | What changed | Files |
|---|---|---|
| Stable choice ids | Decision choices are `{ id, label }`; wire handle is `choice-<id>`. Removing a choice deletes only its own wire (`removeChoice`, one undo step). Old saves migrate with id = old index, so existing `choice-0…` wires keep working. | `types.ts`, `project.ts`, `store.ts`, `nodes/DecisionNode.tsx`, `PlayMode.tsx`, `export/exportHtml.ts`, `search.ts` |
| Unique node ids | New nodes/edges use UUIDs. On load, ids repeated across arcs are re-issued and that arc's edges rewired. Duplicate Arc gives the copy fresh ids. Fixes loops in different arcs sharing progress. | `project.ts`, `store.ts` |
| One wire per handle | Connecting an already-wired output replaces the old wire. | `store.ts` (`onConnect`), `engine.ts` (`normHandle`) |
| Deterministic start | Start = leftmost unconnected **Chapter**, then leftmost unconnected node. Exported HTML embeds the same start per arc. | `engine.ts`, `export/exportHtml.ts` |
| Autosave + typing undo | Autosaves 1.5 s after any change; saves on tab close. Toolbar shows ✓ Saved / ● Saving… / ⚠ Not saved. A typing burst in one node = one undo step. | `store.ts`, `Toolbar.tsx` |
| Storage-full warning | localStorage quota errors (story or character portraits) are shown in the toolbar instead of failing silently; the browser asks before closing if work isn't saved. A corrupt save is backed up to `novel-flow-v2-corrupt` before autosave can overwrite it. | `store.ts`, `library/characterStore.ts`, `Toolbar.tsx` |

Backup of the pre-fix source: `_backup/src-2026-11-02/` (safe to delete).

---

## Phase 1 — Story state ✅ done (2026-11-02)

Shipped as planned, with these implementation notes:
- **One runtime for both players** instead of a parity test: all play rules live in `src/runtime/core.js` (plain JS, no imports). Run mode imports it; the HTML export inlines the same file via `?raw`. The players only render.
- Decisions confirmed: structured rule rows · locked choices shown greyed with a reason by default · Chance truly random each play.
- Save format is **v3** (`variables: []` added on load of v2/v1). Bug found while testing and fixed: the Phase 0 choice migration dropped extra choice fields — it now keeps them (regression test added).
- Variables are project-wide and not part of per-arc undo.
- Example story: `docs/examples/lighthouse-demo.json` (rejoining branches, locked + hidden choices, Chance reveal, Condition router, 3 endings).
- Tests: `npm test` (vitest) — runtime, migration, store; plus a browser playthrough of the app and the exported file.

Original spec:

### 1.1 Data model (save format v3)

```ts
// project.ts
interface VariableDef {
  id: string;                 // stable; refs use the id, so renaming is safe
  name: string;               // e.g. "trust_mira"
  type: 'bool' | 'number' | 'text';
  initial: boolean | number | string;
  note?: string;
}
interface Project { version: 3; meta; arcs; activeArcId; variables: VariableDef[] }

// types.ts
type Op = 'set' | 'add' | 'sub' | 'toggle';
interface Effect { varId: string; op: Op; value?: boolean | number | string }

type Cmp = '==' | '!=' | '>' | '>=' | '<' | '<=';
interface Clause { varId: string; cmp: Cmp; value: boolean | number | string }
interface Condition { mode: 'all' | 'any'; clauses: Clause[] }   // empty = always true

interface Choice extends FlowItem {           // DecisionData.choices: Choice[]
  effects?: Effect[];
  condition?: Condition;
  whenLocked?: 'hide' | 'show-locked';        // default: show-locked
  lockedText?: string;                        // e.g. "Requires trust ≥ 5"
}
interface CommonNodeData { …; onEnter?: Effect[] }   // e.g. "visited_library = true"
```

- Migration v2 → v3: add `variables: []`; nothing else changes (choices are already `{id,label}` since Phase 0).
- Conditions are **structured rules, not free-text code** → no parser, no `eval`, and rows can be edited with dropdowns. (A text-expression mode can be added later on top.)

### 1.2 New nodes

| Node | Data | Handles | Play behaviour |
|---|---|---|---|
| 🧭 **Condition** | `branches: { id, label, condition }[]` | `branch-<id>` per branch + `else` | Silent: takes the **first** branch whose condition is true, else `else`. |
| 🎲 **Chance** | `outcomes: { id, label, weight }[]`, `show: 'silent' \| 'reveal'` | `outcome-<id>` | Weighted random pick. `reveal` shows a short "🎲 …" card. Playtest can fix a seed so runs are repeatable. |
| 🏁 **End** | all optional: `title`, `description` (context), `character` + `text` (closing line) | in only | Shows the ending card; recorded in the endings gallery (Phase 2) by title. *(2026-11-02: ending types Good/Bad/… removed; old `endingType` values are ignored.)* |

### 1.3 Engine (`engine.ts`, pure + unit-tested)
- `evaluate(cond, vars) → boolean`, `applyEffects(effects, vars) → vars` (immutable).
- `PlayState` gains `vars: Record<varId, value>`; initialised from `project.variables`.
- `resolveArrival` also auto-passes Condition and Chance nodes (like loops) and applies `onEnter` effects.
- Choosing a choice applies its `effects` before moving.
- Back keeps working: history already snapshots the full state; `vars` are part of it.
- The exported HTML player gets the same rules. To stop the two players drifting apart, add a **parity test**: play the same scripted route in PlayMode logic and in the exported file and compare the visited node ids.

### 1.4 Editor UI
- **Variables** tab in the Library panel: add / rename / type / initial value / note; shows where each variable is used.
- Decision choice rows get a ⚙ button → popover with **Effects** and **Condition** rule rows (variable ▾, operator ▾, value). Badges on the row: ⚡ has effects, 🔒 has a condition.
- Condition / Chance / End added to the **➕ Function ▾** menu, minimap colours, search, tags.

### 1.5 Play UI
- Locked choices: greyed with `lockedText` (default) or hidden, per choice.
- Run mode **debug drawer** (toggle): live variable values, editable during playtest. Not included in exported HTML.

**Done when:** a story can branch, rejoin, and later show/lock a choice based on an earlier decision; Back rewinds variables; export plays identically; tests pass.

---

## Phase 2 — Overview of timelines ✅ done (2026-11-03) — see `phase-2-timelines.md`

1. **`validateGraph(project)`** (pure): unreachable nodes, dead ends that aren't End nodes, unwired choice/branch/outcome handles, legacy double wires, portals to deleted arcs, references to deleted variables, empty text.
2. **Story health panel**: list of issues with counts; click → jump to the node (switches arc if needed, reuses search centering). Toolbar badge with issue count.
3. **On-node warning badges** driven by the same validator.
4. **Route explorer**: bounded state-space search over (arc, node, vars, loop progress), capped (e.g. 20 000 states) so it stays fast →
   - which endings are reachable, and which are **never** reachable,
   - "how do I reach Ending X?" → shortest choice sequence that gets there,
   - number of distinct routes (or "> cap").
5. **Player route flowchart** (Detroit-style) at an ending / chapter end: the path you took, the branches you skipped, and locked branches shown as 🔒. Plus an **endings gallery** (seen endings, stored in localStorage per story, in app and export).
6. **Playtest tools**: ▶ *Play from this node* (context menu) with a "starting variables" dialog; uses the Phase 1 debug drawer.

---

## Phase 3 — Usability (≈ 1 week)

1. **Drag a wire into empty space** → node-type menu → node is created at the drop point, already connected (React Flow `onConnectEnd`).
2. **Wire labels**: choice / branch / outcome text on edges (truncated, toolbar toggle).
3. **Auto-layout** (dagre, left → right) for the arc or the selection; one undo step.
4. **Speaker dropdown** in Dialog nodes from the Character Library (free text still allowed; store optional `characterId`).
5. **In-app dialogs and toasts** replacing `alert()` / `confirm()` (import errors, delete confirmations).

---

## Later (noted, not scheduled)

- **Portal improvements**: jump to a specific Chapter in the target arc; "call & return" mode for side stories / flashbacks (needs an arc call-stack in PlayState).
- Text variants inside Dialog/Scene (`if met_mira → "Hello again"`), avoiding duplicate nodes.
- Text-expression conditions (`trust_mira >= 5 && has_key`) on top of the rule builder.
- Single undo step for Delete-key removal (node + edges currently push two entries).
- Scene library tab; IndexedDB storage instead of localStorage; Twine/ink export.

---

## Testing

- Add `vitest`; move the Phase 0 checks (migration, unique ids, removeChoice, one-wire rule, typing undo, quota error, export start) into `src/*.test.ts`.
- Each phase adds engine tests first (evaluate, effects, condition/chance resolution, route explorer caps).
- Browser smoke test (Playwright): demo story plays, exported HTML plays, reload keeps autosaved edits.

## Decisions (confirmed 2026-11-02)

1. **Condition editor**: structured rule rows ✔ (typed expressions: later, optional).
2. **Locked choices default**: show greyed with reason ✔ (hide is a per-choice option).
3. **Chance node in exported HTML**: truly random each play ✔.
