# Status panel — items, abilities, power

Status: **done 2026-11-03** (decisions 1A · 2C · 3A · 4A). 68 tests pass (8 new), typecheck + build clean,
Run mode (desktop + phone) and exported HTML checked in a browser.

Added while testing: the HUD hides while a Status card is on screen (it would repeat the same list).

## Goal

The writer decides what the reader sees about "you" — **Items** (🗝️ Old key,
Coins 12), **Abilities** (Lockpicking), **Power** (Strength 7 / 10) — and
**when** it shows. Readers can't open it themselves.

## Decisions

| # | Question | Chosen |
|---|----------|--------|
| 1 | Where items / abilities / power come from | **A — story variables** marked "Show to reader" |
| 2 | How the writer shows it | **C — both**: a **Status card** in the flow, and a **HUD slot** each card can switch Show / Hide / Keep (carries forward like backgrounds) |
| 3 | Item looks | **A — optional emoji + name** |
| 4 | Items you don't have | **A — hidden** (yes/no = no, count = 0, empty text) |

## Data

```ts
// types.ts
interface VarShow {
  group: string;   // heading: "Items", "Abilities", "Power" or the writer's own
  label?: string;  // display name (default: variable name, "_" → space)
  icon?: string;   // optional emoji
  max?: number;    // number variables: shown as a bar "7 / 10"
}
VariableDef.show?: VarShow          // missing = not shown to readers

type HudSetting = { mode: 'show'; groups: string[] } | { mode: 'hide' };
CommonNodeData.hud?: HudSetting     // missing = keep whatever is showing

interface StatusData { kind: 'status'; title: string; text?: string; groups: string[] }
```

* `groups: []` = every group. Group names match ignoring case and spaces around them.
* `migrateVariables` keeps `show` (it used to drop unknown fields).
* Old saves load unchanged.

## How a variable shows

| Type | Shows as | Hidden when |
|------|----------|-------------|
| yes/no | icon + name | it's "no" |
| number, no max | icon + name + value | it's 0 |
| number with max | icon + name + bar `value / max` | never (0 / 10 is meaningful) |
| text | icon + name + text | it's empty |

Groups appear in the order of their first variable (writer controls it by the
variable order); a Status card that names groups uses its own order. An empty
group shows "Nothing yet" on a Status card and is skipped in the HUD.

## Runtime (`core.js`, shared by Run mode and the export)

* `PlayState.hud: string[] | null` — groups showing in the HUD (`null` = off).
* `land()` applies `hudAfter(node, hud)` on every card it passes, like `sceneAfter`.
  So save points and Back restore the HUD for free (it's part of the state).
* `statusView(defs, vars, groups)` → `[{ name, rows: [{ id, label, icon, type, value, max }] }]`,
  used by both players so they always show the same thing.
* Status card = a normal reader card: Next continues, can be a save point, its
  on-enter effects run before it shows ("You found a key" shows the key).
* Route explorer ignores the HUD (it doesn't change routes).

## Players

* **Status card**: kicker "Status", title (default "Your status"), optional text,
  the panel, Next.
* **HUD slot**: right of the text on wide screens (≥ 768 px); on phones a small
  bar above the text that opens/closes. Both live-update as variables change.
* Same look in Run mode and the exported HTML.

## Editor

* **Status** card in the add menu and the wire-drop menu (it has one output).
* Library → Variables: **Show to reader** on each variable — group (Items /
  Abilities / Power or your own), name, emoji (optional), max (numbers).
* Card header: **🎒 HUD** button → Keep · Show (all groups or chosen ones) · Hide,
  with a strip under the header when set. Same action on the selection bar.
* "Play from here" starts with the HUD that cards before it set.
* Story check: Status card / HUD naming a group no variable uses (warning);
  Status card while no variable is shown to readers (warning).
* Search finds Status cards by title and text.

## Tests

`runtime/status.test.ts`: statusView rows/hiding/bars/group order, HUD carry
forward / hide / keep, restored by save points, Status card plays like a linear
card, old data. `project.test.ts`: `show` survives load.

## Files

`types.ts`, `project.ts`, `runtime/core.js`, `runtime/core.d.ts`, `engine.ts`,
new `nodes/StatusNode.tsx`, new `play/StatusPanel.tsx`, new `logic/HudPicker.tsx`,
`PlayMode.tsx`, `export/exportHtml.ts`, `nodes/NodeHeader.tsx`, `store.ts`,
`library/VariablesTab.tsx`, `canvas/CanvasTools.tsx`, `canvas/DropMenu.tsx`,
`Toolbar.tsx`, `App.tsx`, `ui/icons.ts`, `index.css`, `tailwind.config.js`,
`search.ts`, `analysis/validate.ts`, `analysis/scenes.ts`, `README.md`.

Backup before coding: `_backup/before-status/`.
