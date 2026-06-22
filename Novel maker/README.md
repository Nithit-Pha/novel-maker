# Novel Flow

A flowchart-style tool for writers to plan novels and branching stories. Build narratives with **Dialog** nodes (a character speaking) and **Decision** nodes (a choice that splits the story), then play through the result like an interactive slideshow. Define reusable characters in the **Library**, and save whole projects to a folder on disk.

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

### Editing
- Three node types: **Start** (story opening), **Dialog** (character + line), **Decision** (prompt + N choices, one outgoing handle per choice)
- Drag to move, scroll to zoom, drag empty space to pan
- Drag from a node's right handle to another node's left handle to connect them
- Decision nodes have one handle per choice — wire each branch to a different next node
- Click an edge and press Delete (or Backspace) to remove it
- New nodes drop into the center of your current view (so they don't hide behind existing ones)

### Undo / Redo
- **↶ Undo** and **↷ Redo** buttons in the toolbar (greyed out when nothing to undo/redo)
- Tracks node creation/deletion, edge connect/disconnect, drag-end positions, canvas clears, and imports
- Text typing is *not* tracked (that would bury everything else in keystroke noise) — Save protects edits instead
- History capped at 50 steps

### Run mode
- Click **▶ Run** to enter a full-screen story player
- Auto-finds the entry point (Start node, or first node without incoming edges)
- Dialog cards show the character + their line; Decision cards show the prompt with one button per choice
- Click a choice to follow that branch
- Reaches "**— THE END —**" when you hit a node with no outgoing edge
- **Back** button lets you step backward through your path
- **Restart** to play again from the beginning
- Decisions with no wired branch show "(unconnected)" so you can spot gaps in your graph

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
| Delete / Backspace | Delete selected node or edge |
| **In Run mode:** | |
| Space or → | Next (Dialog/Start cards) |
| ← or Backspace | Back |
| Esc | Exit Run mode |

## Project structure

```
src/
  App.tsx              # canvas + ReactFlowProvider + play/library/saves state
  Toolbar.tsx          # top bar (add nodes, undo, redo, library, run, saves, export, import)
  PlayMode.tsx         # full-screen story player
  store.ts             # Zustand store: nodes, edges, history, persistence
  types.ts             # TypeScript types for node data
  nodes/
    StartNode.tsx      # story-opening node
    DialogNode.tsx     # character + dialog text
    DecisionNode.tsx   # prompt + dynamic list of choices, one handle each
  library/
    libraryTypes.ts    # Character / Outfit / PowerStat types + helpers
    characterStore.ts  # Zustand store for the character library (localStorage)
    LibraryPanel.tsx   # right-side panel: Character / Scene tabs + character list
    CharacterEditor.tsx# form for a single character (name, image, outfits, stats, ...)
    savesFs.ts         # File System Access API helpers (pick folder, save/load/list)
    SavesPanel.tsx     # save manager dialog (folder-based projects)
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
- Scene library (the Library panel's second tab is stubbed out)
- Variables and conditional branches (e.g. `if hasKey -> open door`)
- Auto-layout (dagre or elk)
- Export as a screenplay-style script (.docx) or as Twine/Ink
- Per-keystroke history (debounced) so undo also covers text edits
- Multiple Start nodes / chapters
- Collaborative editing
- Desktop build via Tauri

## License

Private / unlicensed — your project.
