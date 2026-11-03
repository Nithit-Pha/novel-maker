# Novel Flow

A flowchart-style tool for writers to plan novels and branching stories. Build narratives with **Chapter**, **Scene**, **Dialog**, **Decision**, and **Loop** nodes, then play through the result like an interactive slideshow. Define reusable characters in the **Library**, search/tag/pin nodes to navigate big graphs, save whole projects to a folder on disk, and export a standalone playable HTML file.

Built with React + TypeScript + React Flow.

## Quick start

You need [Node.js 18+](https://nodejs.org) installed.

```bash
# from this folder
npm install
npm run dev
```

Open http://localhost:5173. You land on the **Projects** home page — create a project, or click **Open the example** to load *The Lighthouse*.

> After updating, run `npm install` once (new packages: fonts, icons, test runner). The launcher only installs when `node_modules` is missing.

### Windows: just double-click

You don't need a terminal. Double-click one of these in this folder:

- **`Open Novel Flow.vbs`** — recommended. Starts the app with **no console window** and opens your browser automatically when it's ready. On the very first run it shows a small popup while it installs dependencies (1–2 minutes); after that it opens in a few seconds.
- **`Open Novel Flow.bat`** — same thing via a `.bat` (a console window flashes briefly, then closes). It simply launches the `.vbs`.
- **`Stop Novel Flow.bat`** — stops the running dev server (only the process on port 5173, so it won't touch other Node apps). You can also just close the browser tab and stop it later.
- **`install-and-run.bat`** — the original launcher that keeps a visible console open (useful if you want to see server logs or errors).

All of these require [Node.js 18+](https://nodejs.org); the launcher will prompt you if it's missing.

## Tests

```bash
npm install        # once, to get the test runner (vitest)
npm test           # runtime, migration and store tests
```

## Build for production

```bash
npm run build      # outputs to ./dist
npm run preview    # serve the production build locally
```

You can deploy the contents of `dist/` to any static host (Netlify, Vercel, GitHub Pages, S3, etc.) — there is no backend.

## Features

### Projects home + `saves/` folder
- The home page (`#/`) lists every project with its last edit and size (arcs · cards · endings): **New project**, **Open**, **Rename**, **Duplicate**, **Export .json**, **Delete**, **Import** a `.json` as a new project, and **Open the example**.
- Every project is a folder in **`saves/`** next to this README, written by the local server the launcher starts:

  ```
  saves/
    My Story/
      project.json                 name, created / updated time
      story/story.json             the story (arcs, nodes, wires, variables)
      characters/characters.json   this project's characters
    _trash/                        deleted projects land here (recoverable)
  ```
- **Autosave** writes to the project folder ~1.5 s after each change; **Save** (Ctrl+S) writes immediately and confirms with a notification. Closing the tab with unsaved changes asks first.
- Characters belong to their project. On first run, a story and characters left in browser storage by older versions become the project **My Story**.
- Without the local server (e.g. a static host) projects are kept in browser storage instead; the home page says where projects are saved.
- `saves/` is in `.gitignore` — remove that line if you want to version your stories with git.

### Literary Studio design (light & dark)
- Warm paper (light) and warm charcoal (dark) themes. Toggle with ☀/☾ in the toolbar or choose Light / Dark / Auto under ⚙ Settings in the left rail; the choice is remembered.
- Lora (serif) for story text, DM Sans for the interface, bundled so they work offline. Respects the system "reduce motion" setting.
- Wires are tinted by the card they leave; choice / branch / outcome outputs are **numbered**, and hovering a choice highlights its wire.
- Left rail: Projects · Minimap on/off · Settings (theme, dot grid, minimap) · Help (`?`). Bottom-right zoom control: − · % · + · fit · lock.
- On narrow screens toolbar labels collapse to icons and secondary actions move into the **⋯** menu.


### Node types

Add **Dialog** and **Scene** directly from the toolbar; the **➕ Function ▾** dropdown groups the branching-logic nodes (**Start Chapter**, **Decision**, **Loop**, **Go to Arc**, **Condition**, **Chance**, **Ending**).

- **Chapter** (📖, green) — a chapter start marker holding just a chapter name. It's the natural entry point and shows as a big title card in play.
- **Scene** (🎬, purple) — a setting: a background image from the Scene Library, an optional caption and a description.
- **Dialog** (💬, blue) — a character speaking: character name + line. In play it shows the speaker's library portrait when the name matches a character.
- **Decision** (🔀, orange) — a prompt with N choices; one outgoing handle per choice. The player picks **one** branch.
- **Condition** (🧭, pink) — a silent router the reader never sees. Each branch has rules (e.g. `trust_mira ≥ 2` and `has_key is true`); the **first** branch that matches is taken, otherwise **Else**.
- **Chance** (🎲, yellow) — weighted random outcomes (weights → odds shown in %), one handle each. *Silent* just routes; *Reveal* shows the result as a card.
- **Ending** (🏁, stone) — where a route ends. Every field is optional: **title** (e.g. "Two Keepers"), **context** (narration), and a closing line (**character** + **dialogue**). With nothing filled in, the reader just sees "The End".
- **Loop** (🔁, cyan) — a titled list of items, one handle each, plus a bottom **done** handle. The player must complete **every** item, in **any order**, before the loop exits via `done`. *Example: a detective questions witnesses 1–3 freely, then the interrogation ends.* Each item's branch is built from normal nodes and wired back into the loop's left handle so control returns to the menu.

### Story variables — choices that matter later
Variables remember what happened, so branches can **rejoin and still remember** (no copying the rest of the story per choice). Try **File → Open → `docs/examples/lighthouse-demo.json`** to see it all in a small story.
- **📚 Library → Variables**: add variables (number, yes/no, text) with a starting value and a note; each shows how many rules use it.
- **⚡ Effects** — change variables: on a **choice** (when picked) via the choice's ⚙ button, or on any Chapter / Scene / Dialog / Decision / Ending via **⚡ On enter** at the bottom of the node.
- **🔒 Conditions** — on a choice (⚙ → *Available only if*): when the rules fail, the choice is **shown greyed out with a reason** (default; write your own reason or use the automatic "Requires …") or **hidden**.
- Choice rows show 🔒 / ⚡ badges; hover for a summary. A variable can also be created inline from any variable dropdown ("＋ new variable…").
- Variable edits (add / rename / delete) are not part of undo.

### Seeing your timelines (Story check)
- **Story check** (toolbar ☑ button, badge = number of problems) opens a side panel:
  - **Problems** — errors (Go to Arc → deleted arc, rules using a deleted variable), warnings (cards no route reaches — reported once per cut-off section; routes that stop without an Ending; unconnected choices / branches / Else / outcomes / loop items; arcs nothing leads to; duplicate variable names; double wires) and notes (empty dialogue, question or choice). Click a problem to jump to the card, even in another arc. Cards with a problem show ⚠ in their header.
  - **Routes** — plays every possible route automatically (variables, locks, Condition cards, every Chance outcome, loops, portals; up to 20,000 situations) and lists every Ending: reachable or not, how many routes lead there, the **shortest route** (the choices to make), **Jump** and **Play** (replays that route in Run mode; Back still works). Endings no route can reach and choices locked on every route also appear under Problems.
- **▶ Play from here** in every card header: pick starting variable values, then Run mode starts at that card.
- At an ending, **Your route** shows each decision you passed — the choice you took, the ones you didn't, and locked ones 🔒 with their reason — and **Endings N / M** shows which endings you've found (unfound ones as "???"; per project in this browser; resettable). Exported HTML stories have both too.

### Faster editing
- **Drag a wire into empty space** and pick the card to create — it appears there, already connected (from an input: a card *before* it).
- **Wire labels** show each choice / branch / outcome on its wire (toggle with the captions button bottom-right or in ⚙ Settings).
- **Tidy** (wand button bottom-right, or ⋯ → Tidy) arranges the arc left → right; select 2+ cards to tidy just those. Ctrl+Z undoes it.
- **Speaker field**: Dialogue and Ending cards suggest characters from the Library (with portrait). A new name can be added to the Library with one click; renaming a character in the Library updates every card that uses it.

### Scenes (background images)
- **📚 Library → Scenes**: **+ Scene** (or drop images on the tab) adds .png / .jpg / .jpeg images. Images larger than 2560 px are scaled down. Click a scene to rename it, replace its image (every card using it updates) or delete it.
- Images are saved as files in `saves/<Project>/scenes/` (list in `scenes/scenes.json`); replaced or deleted images move to `scenes/_deleted/`.
- **Every card** has a 🖼 button in its header: *Keep the current background*, *No background*, a Library scene, or *Add a scene from an image…*. A card that sets a scene shows it as a strip under its header.
- A background **stays on screen** until a later card sets another one (or "No background"), so you set it once per place. Condition and Chance cards can switch it too.
- Run mode and the exported HTML show the image behind the text (on a paper panel so it stays readable) and fade between scenes. *Play from here* starts with the background that leads to that card.
- Story check warns about cards whose scene was deleted from the Library.

### Save points
- Click the **🔖 bookmark** in a card's header to make it a **save point** (chapter, scene, dialog, decision, loop, or a Chance set to *Reveal*). The card shows a "Save point" strip; search "save point" to list them.
- While reading, the footer shows **✓ Save point** on such a card. The game remembers that moment: variables, loop progress and background.
- At an ending, the reader can choose **Continue from save point** (the last one they reached), **Start of <arc>** (the first card of the current arc, as it was then) or **Read again** (from the very start).
- Going back rewinds the route to that step, so **Back** and **Your route** read as a new path. Endings found stay found. On-enter effects are never applied twice.
- Works the same in Run mode and the exported HTML. Saves last while the page is open (not stored after closing). Details: `docs/save-points-plan.md`.

### Canvas tools and selecting many cards
- Bottom-centre switch: **Move** (H — drag empty canvas to move around) and **Select** (V — drag empty canvas to draw a selection box; hold **Space** to move around). **Shift+drag** selects in either tool; Ctrl/⌘+click adds a card.
- With 2+ cards selected a bar appears at the top: **Scene ▾ · Tag · Save point · Tidy · Delete · ✕** — each is one undo step. Esc clears the selection.

### Editing
- Drag to move, scroll to zoom, drag empty space to pan (Move tool)
- Drag from a node's right handle to another node's left handle to connect them
- Decision/Loop nodes have one handle per choice/item — wire each branch to a different next node
- Each output handle holds one wire: connecting an already-wired handle replaces the old wire. Removing a choice removes only that choice's wire
- Every node header has a 📍 **pin** toggle and a ✕ delete; each node has a **#tag** bar at the bottom
- Click an edge and press Delete (or Backspace) to remove it
- New nodes drop into the center of your current view (so they don't hide behind existing ones)

### Find & navigate (for big stories)
- **🔍 Search** (or **Ctrl/Cmd + K**) opens a palette that searches across chapter names, scene text, dialog, decision prompts/choices, loop items, and tags. Arrow keys move, **Enter** flies the canvas to the node and selects it. With an empty query it lists your **📌 pinned** nodes.
- **Pins** — toggle 📍 in any node header to bookmark it; pinned nodes surface in the search palette's empty state.
- **🏷 Tags** — add tags inside any node, then use the toolbar **Tags** filter to dim every node that doesn't match (any-of selected tags). The filter is view-only and isn't saved into your story.

### Undo / Redo
- **↶ Undo** and **↷ Redo** buttons in the toolbar (greyed out when nothing to undo/redo)
- Tracks node creation/deletion, edge connect/disconnect, drag-end positions, canvas clears, and imports
- Text typing is tracked too: a burst of typing in one node counts as a single undo step
- History capped at 50 steps

### Run mode
- Click **▶ Run** to enter a full-screen story player
- Auto-finds the entry point: the leftmost Chapter with no incoming edges (else the leftmost unconnected node)
- Chapter cards show the chapter title; Scene/Dialog cards show their text; Decision cards show one button per choice; Loop cards show a menu of items with ○/✓ and an "X / N done" counter
- Click a choice (or a loop item) to follow that branch; a Loop auto-continues once every item is done
- Reaches "**The End**" when you hit a node with no outgoing edge, or an **Ending** card (title, context and closing line) at an Ending node
- Locked choices show 🔒 and their reason; Chance nodes set to *Reveal* show the result
- **🧪 Variables** (top bar, when the story has variables) opens a drawer with the live values — edit them to test other routes
- Scene backgrounds show behind the text and carry forward until a card changes them
- **Back** steps backward through your path (and correctly rewinds loop progress)
- **Restart** to play again from the beginning
- At an ending: **Continue from save point** / **Start of <arc>** / **Read again** (see *Save points*)
- Decisions/loops with an unwired branch show "(unconnected)" so you can spot gaps in your graph

### Export to playable HTML
- **⬇ HTML** writes a single self-contained `.html` file — story data, styles, and a player are all inlined (character portraits and scene backgrounds embed too), so it plays in any browser **offline, with no install or server**. Double-click to play, or share the file.
- The exported player runs the **same runtime code** as Run mode (`src/runtime/core.js` is inlined), so variables, conditions, chance, endings, loops and portals behave identically.

### Character Library
- Click **📚 Library** in the toolbar to open a panel docked to the right side
- Three tabs: **Character**, **Variables** and **Scenes** (see *Scenes* above)
- The Character tab lists every character; **+ Character** at the top creates a new one
- Each tab has a **search box**: Character searches name, gender, description, outfits, personality and abilities; Variables searches name, note and type ("flag", "counter", "text"); Scenes searches the name. Every word must match; ✕ or Esc clears; each tab keeps its own search while the Library is open
- Each character has:
  - **Name**
  - **Gender** (optional) — free text with suggestions (Female, Male, Non-binary, Unknown); shown under the name in the list
  - **Image** — upload a portrait (stored inline as a data URL, 3 MB max)
  - **Outfit** — add any number of designs, each with a name + description
  - **Personality** — add any number of traits, each with a custom 0–10 power bar
  - **Ability** — add any number of abilities, each with a custom 0–10 power bar
  - **Description** — free-form notes / backstory
- Characters are stored separately in browser localStorage (`novel-flow-characters-v1`), so they persist across visits and survive canvas changes

### Persistence
- **Autosave**: the project is saved to browser localStorage ~1.5 s after every change and when you close the tab (auto-loads on next visit). The toolbar shows ✓ Saved / ● Saving… / ⚠ Not saved — the last one means browser storage is full (usually large portraits): use **Saves** (folder) or **Export** instead
- **Save** (Ctrl/Cmd+S) saves immediately
- **Export** / **Import** as `.json` so you can keep snapshots, share with collaborators, or move projects between machines
- **Clear** wipes the canvas (still undoable)

### Saves (save to a folder on disk)
- Click **💾 Saves** to open the save manager
- **Choose a saves folder** once — the app remembers it across sessions (the folder handle is kept in IndexedDB) and reconnects with a one-click permission grant on later visits
- Legacy saves that still contain an old `start` node are auto-migrated to a **Chapter** node on load/import (so they no longer render as an unstyled box)
- Type a name and **Save** to write a self-contained project folder:

  ```
  <your saves folder>/
    My Story/
      story/story.json            # nodes + edges
      characters/characters.json  # the character library
      project.json                # name + last-saved timestamp
  ```

- Every saved project is listed with its last-saved time; **Load** brings a project back onto the canvas (replacing the current story + characters, with a confirmation), and **✕** deletes it from the folder
- Uses the browser's [File System Access API](https://developer.mozilla.org/docs/Web/API/File_System_API), so it works in **Chrome and Edge**. Other browsers show a notice; the localStorage **Save** and **Export** buttons remain as fallbacks

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + Y | Redo (alternate) |
| Ctrl/Cmd + S | Save now (to the project folder) |
| ? | Help & shortcuts |
| Ctrl/Cmd + K | Open search palette |
| Delete / Backspace | Delete selected node or edge |
| H / V | Move tool / Select tool |
| Hold Space | Move around while using Select |
| Shift + drag | Selection box (any tool) |
| Esc | Clear the selection |
| **In Run mode:** | |
| Space or → | Next (Chapter/Scene/Dialog cards) |
| ← or Backspace | Back |
| Esc | Exit Run mode |

## Project structure

```
server/
  savesApi.ts          # saves/ folder API (list, load, save, create, rename, duplicate, trash)
  savesPlugin.ts       # serves it at /api/saves from the Vite dev & preview servers
src/
  App.tsx              # routes (#/ home, #/p/<project>) + canvas + panels
  home/HomePage.tsx    # projects home page
  storage/             # projects backend (folder or browser) + open-project session/autosave
  ui/                  # theme, dialogs & toasts, dropdowns, icons, canvas chrome (rail, zoom, help)
  canvas/              # wire with label (NfEdge), wire label text, drop menu, Tidy layout (dagre)
  analysis/            # Story check: validate.ts (problems), explore.ts (route explorer), panel, live hook
  play/RouteRecap.tsx  # "Your route" timeline + endings gallery
  Toolbar.tsx          # top bar (add nodes, Function menu, undo, redo, search, tags, run, saves, export)
  FunctionMenu.tsx     # dropdown grouping logic nodes (Start Chapter, Decision, Loop)
  PlayMode.tsx         # full-screen story player (incl. loop call-stack/progress)
  runtime/core.js      # THE play rules (variables, conditions, chance, loops, portals) — plain JS shared by Run mode and the HTML export
  runtime/core.d.ts    # types for core.js
  engine.ts            # re-exports runtime/core.js for the editor
  logic/               # variable rule editors (effects, conditions, on-enter) + usage counts
  search.ts            # node search/title/tag helpers
  SearchPalette.tsx    # Ctrl+K search & pinned-node palette
  TagFilter.tsx        # toolbar tag-filter popover
  store.ts             # Zustand store: nodes, edges, history, persistence, legacy migration
  types.ts             # TypeScript types for node data
  nodes/
    ChapterNode.tsx    # chapter start marker (name only)
    SceneNode.tsx      # background picker + caption + description
    DialogNode.tsx     # character + dialog text
    DecisionNode.tsx   # prompt + dynamic list of choices, one handle each
    LoopNode.tsx       # title + items (complete-all), one handle each + done handle
    ConditionNode.tsx  # IF / ELIF branches with rules + ELSE handle
    ChanceNode.tsx     # weighted outcomes, silent or reveal
    EndNode.tsx        # named ending
    NodeHeader.tsx     # shared card header: icon, scene button + banner, play, pin, delete
    TagBar.tsx         # shared #tag chip editor
  library/
    libraryTypes.ts    # Character / Outfit / PowerStat types + helpers
    characterStore.ts  # Zustand store for the character library (localStorage)
    LibraryPanel.tsx   # right-side panel: Character / Variables / Scenes tabs
    ScenesTab.tsx      # scene list, upload, rename / replace / delete
    ScenePicker.tsx    # popover to choose a card's background
    sceneStore.ts      # scene library store + image checks / scaling + upload
    VariablesTab.tsx   # story variables list
    CharacterEditor.tsx# form for a single character (name, image, outfits, stats, ...)
    savesFs.ts         # File System Access API helpers (pick folder, save/load/list)
    SavesPanel.tsx     # save manager dialog (folder-based projects)
  export/
    exportHtml.ts      # builds the standalone playable HTML file
  index.css            # Tailwind + React Flow theme overrides
  main.tsx             # React entry point
```

## Tech stack

- [Vite](https://vitejs.dev) — dev server and bundler
- [React 18](https://react.dev) + TypeScript
- [React Flow (@xyflow/react)](https://reactflow.dev) — the node-based canvas
- [Zustand](https://github.com/pmndrs/zustand) — lightweight state store (with custom undo/redo)
- [Tailwind CSS](https://tailwindcss.com) — styling

## Roadmap ideas

- ~~Undo / redo~~ ✓
- ~~"Play through" mode~~ ✓
- ~~Character library (define a character once, reuse the name)~~ ✓ — *next: reference library characters from Dialog nodes*
- ~~Save projects to a folder on disk~~ ✓
- ~~Node search / Ctrl+K palette~~ ✓
- ~~Pins & tags for navigating big graphs~~ ✓
- ~~Chapter nodes~~ ✓
- ~~Loop node (complete every branch in any order)~~ ✓
- ~~Export a standalone playable HTML file~~ ✓
- ~~Scene library (background images in Run mode and export)~~ ✓ — see `docs/scene-library-plan.md`
- ~~Variables and conditional branches~~ ✓ — next phases in `docs/branching-story-plan.md`
- Auto-layout (dagre or elk)
- Export as a screenplay-style script (.docx) or as Twine/Ink
- Per-keystroke history (debounced) so undo also covers text edits
- Collaborative editing
- Desktop build via Tauri

## License

Private / unlicensed — your project.
