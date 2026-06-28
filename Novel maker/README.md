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

Open http://localhost:5173. The app launches with a demo story so you can see the flow immediately.

Windows users can also just double-click `install-and-run.bat`.

## Build for production

```bash
npm run build      # outputs to ./dist
npm run preview    # serve the production build locally
```

You can deploy the contents of `dist/` to any static host (Netlify, Vercel, GitHub Pages, S3, etc.) — there is no backend.

## Features

### Node types

Add **Dialog** and **Scene** directly from the toolbar; the **➕ Function ▾** dropdown groups the branching-logic nodes (**Start Chapter**, **Decision**, **Loop**).

- **Chapter** (📖, green) — a chapter start marker holding just a chapter name. It's the natural entry point and shows as a big title card in play.
- **Scene** (🎬, purple) — a setting: a background label + description.
- **Dialog** (💬, blue) — a character speaking: character name + line. In play it shows the speaker's library portrait when the name matches a character.
- **Decision** (🔀, orange) — a prompt with N choices; one outgoing handle per choice. The player picks **one** branch.
- **Loop** (🔁, cyan) — a titled list of items, one handle each, plus a bottom **done** handle. The player must complete **every** item, in **any order**, before the loop exits via `done`. *Example: a detective questions witnesses 1–3 freely, then the interrogation ends.* Each item's branch is built from normal nodes and wired back into the loop's left handle so control returns to the menu.

### Editing
- Drag to move, scroll to zoom, drag empty space to pan
- Drag from a node's right handle to another node's left handle to connect them
- Decision/Loop nodes have one handle per choice/item — wire each branch to a different next node
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
- Text typing is *not* tracked (that would bury everything else in keystroke noise) — Save protects edits instead
- History capped at 50 steps

### Run mode
- Click **▶ Run** to enter a full-screen story player
- Auto-finds the entry point (the first node with no incoming edges — typically your Chapter)
- Chapter cards show the chapter title; Scene/Dialog cards show their text; Decision cards show one button per choice; Loop cards show a menu of items with ○/✓ and an "X / N done" counter
- Click a choice (or a loop item) to follow that branch; a Loop auto-continues once every item is done
- Reaches "**— THE END —**" when you hit a node with no outgoing edge
- **Back** steps backward through your path (and correctly rewinds loop progress)
- **Restart** to play again from the beginning
- Decisions/loops with an unwired branch show "(unconnected)" so you can spot gaps in your graph

### Export to playable HTML
- **⬇ HTML** writes a single self-contained `.html` file — story data, styles, and a player are all inlined (character portraits embed too), so it plays in any browser **offline, with no install or server**. Double-click to play, or share the file.
- The exported player mirrors Run mode exactly, including Chapter/Scene/Dialog/Decision/Loop, Back, and Restart.

### Character Library
- Click **📚 Library** in the toolbar to open a panel docked to the right side
- Two tabs: **Character** and **Scene** (Scene is a placeholder for now)
- The Character tab lists every character; **+ Character** at the top creates a new one
- Each character has:
  - **Name**
  - **Image** — upload a portrait (stored inline as a data URL, 3 MB max)
  - **Outfit** — add any number of designs, each with a name + description
  - **Personality** — add any number of traits, each with a custom 0–10 power bar
  - **Ability** — add any number of abilities, each with a custom 0–10 power bar
  - **Description** — free-form notes / backstory
- Characters are stored separately in browser localStorage (`novel-flow-characters-v1`), so they persist across visits and survive canvas changes

### Persistence
- **Save** stores your project in browser localStorage (auto-loads on next visit)
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
| Ctrl/Cmd + S | Save to localStorage |
| Ctrl/Cmd + K | Open search palette |
| Delete / Backspace | Delete selected node or edge |
| **In Run mode:** | |
| Space or → | Next (Chapter/Scene/Dialog cards) |
| ← or Backspace | Back |
| Esc | Exit Run mode |

## Project structure

```
src/
  App.tsx              # canvas + ReactFlowProvider + play/library/saves/search state
  Toolbar.tsx          # top bar (add nodes, Function menu, undo, redo, search, tags, run, saves, export)
  FunctionMenu.tsx     # dropdown grouping logic nodes (Start Chapter, Decision, Loop)
  PlayMode.tsx         # full-screen story player (incl. loop call-stack/progress)
  engine.ts            # pure graph traversal + loop play-state resolver (shared by player + export)
  search.ts            # node search/title/tag helpers
  SearchPalette.tsx    # Ctrl+K search & pinned-node palette
  TagFilter.tsx        # toolbar tag-filter popover
  store.ts             # Zustand store: nodes, edges, history, persistence, legacy migration
  types.ts             # TypeScript types for node data
  nodes/
    ChapterNode.tsx    # chapter start marker (name only)
    SceneNode.tsx      # background + description
    DialogNode.tsx     # character + dialog text
    DecisionNode.tsx   # prompt + dynamic list of choices, one handle each
    LoopNode.tsx       # title + items (complete-all), one handle each + done handle
    NodeHeader.tsx     # shared card header: icon, pin toggle, delete
    TagBar.tsx         # shared #tag chip editor
  library/
    libraryTypes.ts    # Character / Outfit / PowerStat types + helpers
    characterStore.ts  # Zustand store for the character library (localStorage)
    LibraryPanel.tsx   # right-side panel: Character / Scene tabs + character list
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
- Scene library (the Library panel's second tab is stubbed out)
- Variables and conditional branches (e.g. `if hasKey -> open door`)
- Auto-layout (dagre or elk)
- Export as a screenplay-style script (.docx) or as Twine/Ink
- Per-keystroke history (debounced) so undo also covers text edits
- Collaborative editing
- Desktop build via Tauri

## License

Private / unlicensed — your project.
