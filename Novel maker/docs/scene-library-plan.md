# Scene Library, backgrounds and canvas tools

Status: **done 2026-11-03** (decisions 1A · 2A · 3A · 4A).

## Goal

Writers add background images (.png / .jpg / .jpeg) to a project's Library,
pick one on any card, and readers see it behind the text in Run mode and in the
exported HTML. Many cards can get a scene at once by box-selecting them.

## Decisions

| # | Question | Chosen |
|---|----------|--------|
| 1 | How long a background lasts | **A — it stays until another card sets a different one, or "No scene"** |
| 2 | Where images are saved | **A — as image files in `saves/<Project>/scenes/`** |
| 3 | Giving many cards a scene | **A — box-select, then a floating selection bar** |
| 4 | Drag tools | **A — Hand and Select tools (H / V, hold Space for Hand)** |

## Data

```ts
// src/library/libraryTypes.ts
interface SceneAsset {
  id: string;
  name: string;
  file?: string;   // folder projects: image file in saves/<Project>/scenes/
  data?: string;   // browser-only projects (no local server): data URL
  width?: number; height?: number;
  createdAt: string; updatedAt: string;
}
```

* Scene list: `saves/<Project>/scenes/scenes.json` (like `characters/characters.json`).
* Image files: `saves/<Project>/scenes/<sceneId>-<rev>.<png|jpg>`. A new name on
  every replace, so browsers never show a stale cached image.
* Removed or replaced images are moved to `scenes/_deleted/`, never erased.
* Images wider or taller than 2560 px are scaled down on upload. PNG stays PNG
  (keeps transparency); JPEG is re-encoded at quality 0.9 only when scaled.
  Upload limit 25 MB per file.

Cards (every kind) get an optional `sceneId` in `CommonNodeData`:

* missing / empty → keep whatever background is showing
* `"none"` → clear the background
* a scene id → show that scene

## Server API (added to `/api/saves`)

| Method | Path | Does |
|--------|------|------|
| GET | `/:name` | now also returns `scenes` |
| PUT | `/:name` | now also accepts `scenes` |
| PUT | `/:name/scenes/:file` | `{ data: <data URL> }` → writes the image |
| GET | `/:name/scenes/:file` | serves the image (long cache; names are versioned) |
| DELETE | `/:name/scenes/:file` | moves the image to `scenes/_deleted/` |

File names are checked against `^[A-Za-z0-9-]+\.(png|jpg)$`, so the path can't
leave the project folder.

## Runtime (shared by Run mode and export)

`PlayState` gets `scene: string | null`. `land()` updates it on every card it
passes (routers too), so a Condition or Chance card can also switch the
background. The route explorer ignores `scene` (it does not change which routes
exist). "Play from here" starts with the nearest scene set on the card or on the
cards leading to it.

## UI

* **Library → Scenes tab:** thumbnail grid; *+ Scene* (pick or drop a file);
  click a scene to rename, replace the image or delete. Delete says how many
  cards use it.
* **Every card:** an image button in the header opens the scene picker
  (Keep current · No scene · scenes · Add a scene…). A card that sets a scene
  shows it as a thin banner under its header. A missing scene shows a warning
  banner.
* **Scene card:** the old text "Background" field becomes a big scene picker;
  any old text stays as the optional *Caption* (shown above the text in Run mode).
* **Run mode / export:** the image fills the screen behind the reading page,
  dimmed so text stays readable; it fades when the scene changes.
* **Story check:** warning when a card uses a scene that is not in the Library.

## Canvas tools and selection bar

* Bottom-centre tool switch: **Hand** (H; drag empty canvas to move around) and
  **Select** (V; drag empty canvas to draw a selection box). Hold **Space** for
  Hand while in Select. Shift+drag box-selects in either tool.
* With 2+ cards selected a bar appears at the top of the canvas:
  `N cards · Scene ▾ · Tag · Tidy · Delete · ✕` — each action is one undo step.

## Export / import JSON

Exported JSON includes the scene list with images embedded as data URLs, so the
file is complete on its own. Importing a file with scenes adds them to the
project's Library (uploading the images).

## Tests

* Unit: scene carry-forward in `core.js`, `"none"` clears, routers set scenes,
  Story check warning, server image save/serve/delete and name checks.
* Browser: create scene from a file, pick it on a card, banner shows, box-select
  3 cards + bar sets scene in one undo step, Run mode shows the background and
  keeps it on the next card, export HTML contains the image, H/V/Space tools,
  light + dark screenshots. Existing suites (regress, phase 2, phase 3) still pass.
