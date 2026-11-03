# Novel Flow — Literary Studio redesign + Projects home

Date: 2026-11-02 · Status: ✅ done (2026-11-02) · Runs **before** Phase 2 of `branching-story-plan.md`.

Source brief: "Novel Flow – Complete Literary Studio UI/UX Redesign" + mockup (light & dark).
Additions requested: a real `saves/` folder holding every project, and a home page to choose / create projects.

## Decisions

| Topic | Decision |
|---|---|
| Canvas background | Paper texture + faint dot grid only (no illustrations) |
| Fonts / icons | Bundled: Lora (story text, headings) + DM Sans (UI) via `@fontsource`; `lucide-react` icons. Works offline |
| Toolbar | Mockup layout + left rail; every existing action kept |
| Exported HTML | Same light/dark themes, follows reader's system setting, with a toggle |
| Saves | `saves/` folder **in the app folder**, written by the local server the launcher already starts |
| Characters | Per project (stored in the project folder) |

## Ground rules (from the brief)
No change to node/edge ids, node data, connection logic, file formats (story.json stays a v3 Project), keyboard shortcuts or existing actions. Styling changes go through tokens; components keep their props/state/events.

## 1. Design system
- **Tokens** (CSS variables, RGB triplets so Tailwind opacity works) on `:root[data-theme=light|dark]`:
  background, surface, surface-2, border, border-strong, fg, fg-soft, muted, faint, accent, on-accent, success, warning, danger, edge, grid, shade — values from the brief.
- **Tailwind mapping**: existing names (`ink-900…500`, `accent`, `accent-<node>`, `gray-*`, `white`, `black`) are re-pointed at tokens, so the ~240 existing color classes switch theme automatically. Remaining hex colors are replaced by tokens.
- **Node accents** (muted, both themes): Chapter/Start sage · Dialog dusty blue · Decision terracotta · Scene plum · Loop teal · Go to Arc indigo · Condition dusty rose · Chance ochre · Ending stone.
- Typography: DM Sans UI 12–14 px; Lora for story fields, chapter/ending titles, logo, Run mode. Radius scale 6/10/14; soft two-layer shadows; 2 px focus ring in accent.
- Theme: toggle in toolbar, stored in `localStorage['novel-flow-theme']`, defaults to system, applied by an inline script before first paint (no flash). `prefers-reduced-motion` disables transitions. Themed scrollbars.

## 2. Editor
- **Toolbar** (mockup): logo · ← Projects + project name · quick add **Dialogue · Scene · Decision · Start** + **More ▾** (Loop, Go to Arc, Condition, Chance, Ending) · Undo / Redo · save status · Search · Tags · Library · theme · Fit · **Export ▾** (JSON, playable HTML) · **Import** · **Save** · **▶ Run** · **⋯** (Save copy to another folder…, Clear canvas, Shortcuts). Labels collapse to icons on narrow screens; secondary actions move into ⋯ on phones.
- **Left rail**: Projects · Minimap on/off · Settings (theme, dot grid) · Help (shortcuts).
- **Canvas**: parchment / warm charcoal + paper grain + low-contrast dot grid; zoom control (− · % · + · fit · lock) bottom-right; themed minimap.
- **Wires**: curved, 2 px, tinted by the source node's accent; hover/selected thicker in accent. Choice / branch / outcome handles show their number; hovering a choice row highlights its wire.
- **Node cards**: one shared card (tinted header with icon + label, pin, ✕; 10 px radius; soft shadow; selected ring) for all 9 types and the rule editors.
- **Dialogs & notifications**: themed confirm / prompt dialogs and toasts replace the 11 `alert()/confirm()` calls; "Saved" toast on manual save.
- Run mode becomes a calm reading view (Lora, paper / charcoal). Library, Variables, Saves, search, tag filter, arc tabs all themed.

## 3. Projects home + `saves/` folder
- **Storage API** (Vite dev/preview server plugin `server/savesPlugin.ts`, Node `fs`): `saves/` next to `package.json`.
  - `GET /api/saves` list · `GET/PUT /api/saves/:name` · `POST …/rename` · `POST …/duplicate` · `DELETE` (moves to `saves/_trash/`, never hard-deletes).
  - Folder layout = existing folder-save format: `<Project>/story/story.json`, `<Project>/characters/characters.json`, `<Project>/project.json` (`name`, `createdAt`, `updatedAt`). Writes are atomic (temp file + rename). Names sanitized (no `..`, slashes, reserved Windows names).
- **Fallback**: if the API isn't there (static hosting), projects live in browser storage with the same interface; the home page says where projects are saved.
- **Home page** (`#/`): New project (name), project cards (title, last edited, arcs / nodes / endings), Open, Rename, Duplicate, Export JSON, Delete (to trash, with confirm), Import JSON as new project, "Open example" (The Lighthouse). Editor route `#/p/<name>`; reload keeps you in the project.
- **Autosave** goes to the project folder 1.5 s after changes (story + characters); Ctrl+S saves immediately; leaving with unsaved changes asks first. Characters become per project.
- **Migration**: on first run with an empty `saves/`, the story and characters currently in browser storage become a project "My Story".
- The old "Saves" panel (browser folder picker) stays as **⋯ → Save copy to another folder…**.

## 4. Testing
vitest (existing 21 + saves API: create/list/rename/duplicate/trash/sanitize) and a Playwright regression in both themes at 1440 / 820 / 390 px: create Start/Dialogue/Decision (+ other nodes), edit text & character, add/remove choices, connect, move, delete, pan/zoom, fit, save, import, export JSON + HTML, reload, home page create/open/rename/duplicate/delete, theme switch. WCAG AA contrast check of token pairs.

## Result (2026-11-02)
- All sections above shipped. Tests: 27 unit tests (incl. 6 for the saves API) + a 42-step browser regression in both themes at 1440 / 820 / 390 px + 7 wire tests — all passing, no console errors.
- Contrast: three light tokens were nudged darker than the brief's suggestions to pass WCAG AA on cards (muted `#6F675D`, accent `#A0674A`, danger `#A85B53`).
- Extra fixes found while testing: Fit no longer zooms past 100 %; new cards no longer land exactly on top of each other.
- `src/FileMenu.tsx` and `src/FunctionMenu.tsx` are no longer used (their actions live in the new toolbar); safe to delete.
- Previous source kept in `_backup/before-redesign/`.
