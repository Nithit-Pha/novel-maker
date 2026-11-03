# Save points

Status: **done 2026-11-03** (decisions 1A · 2A · 3A · 4A). 56 tests pass (5 new), typecheck + build clean,
Run mode and exported HTML checked in a browser.

## Goal

When a reader reaches an ending, they don't have to start the whole story
again. They can go back to the **last save point** they passed, or to the
**start of the current arc** (act), with everything (variables, loop progress,
background) exactly as it was there.

## Decisions

| # | Question | Chosen |
|---|----------|--------|
| 1 | How a save point is marked | **A — a flag on any reader card** (chapter, scene, dialog, decision, loop, revealed chance), toggled from the card header |
| 2 | What the ending screen offers | **A — "Continue from save point" (if one was reached), "Start of this arc" (if it differs from the story start), "Read again"** |
| 3 | What happens to the route when going back | **A — rewind**: history is cut back to that step, so Back / step count / "Your route" read as a new path. Found endings stay found |
| 4 | Remember the save after closing the exported HTML | **A — no, only while the page is open** (localStorage saves maybe later) |

## Data

```ts
// src/types.ts — CommonNodeData
savePoint?: boolean; // ignored on End / Portal / Condition / silent Chance
```

Old saves load unchanged (missing = not a save point).

## Runtime (`src/runtime/core.js`, shared by Run mode and the export)

`PlayState` gets two snapshots:

```ts
save: PlayState | null      // state on arrival at the last save-point card reached
arcStart: PlayState | null  // state on arrival at the first card of the current arc
```

* A snapshot is a full `PlayState`. A save snapshot keeps the `arcStart` that was
  in effect then (its own `save` is `null` = itself); an arc-start snapshot keeps
  the `save` in effect then (its own `arcStart` is `null` = itself).
* `land()` records them when it stops on a card the reader sees:
  * `arcStart` when the arc was just entered (story start, "Play from here", or a portal);
  * `save` when the card has `savePoint` (every arrival refreshes it — e.g. a
    loop hub that is a save point is re-saved with the new progress).
* Snapshots are taken **after** on-enter effects, so going back never applies
  them twice.
* `loadSave(state)` → the save snapshot (with `save` = itself).
* `restartArc(index, state)` → the arc-start snapshot (with `arcStart` = itself; if that
  card is a save point, it is the save again).
* `checkpointStep(states, cp, field)` → the history step where a snapshot was made
  (both players use it to rewind).
* The route explorer's `stateKey` doesn't include these fields → Story check unaffected.

## Players

Run mode (`PlayMode.tsx`) and the exported HTML (`exportHtml.ts`):

* Footer shows "✓ Save point" while the reader is on a save-point card.
* Ending screen (End card or "The End"):
  * **Continue from save point** — shows the save card's title; only if `state.save`.
  * **Start of <arc name>** — only if `state.arcStart` differs from the story start's.
  * **Read again** — unchanged.
* Going back rewinds: the first history step that holds that snapshot becomes the
  current state, later steps are dropped.
* "Play from here": the start of the arc is the card you started from.

## Editor

* Flag button in every eligible card's header (next to the pin); a "Save point"
  strip under the header when on.
* Selection bar: **Save point** toggles the flag on all selected eligible cards
  (one undo step).
* Search: typing "save point" finds them; results show a flag icon.

## Tests

`src/runtime/core.test.ts`: save on arrival, restore vars/progress/scene, no
double on-enter, arc start through a portal, save refreshed on re-arrival,
silent nodes ignored, old data without the flag.

## Files

`types.ts`, `runtime/core.js`, `runtime/core.d.ts`, `runtime/core.test.ts`,
`engine.ts`, `PlayMode.tsx`, `export/exportHtml.ts`, `nodes/NodeHeader.tsx`,
`store.ts`, `canvas/CanvasTools.tsx`, `search.ts`, `SearchPalette.tsx`, `README.md`.

Backup before coding: `_backup/before-savepoints/`.
