# Novel Flow

A flowchart-style tool for writers to plan novels and branching stories. Build narratives with **Dialog** nodes (a character speaking) and **Decision** nodes (a choice that splits the story), then play through the result like an interactive slideshow.

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

### Persistence
- **Save** stores your project in browser localStorage (auto-loads on next visit)
- **Export** / **Import** as `.json` so you can keep snapshots, share with collaborators, or move projects between machines
- **Clear** wipes the canvas (still undoable)

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
  App.tsx              # canvas + ReactFlowProvider + play state
  Toolbar.tsx          # top bar (add nodes, undo, redo, run, save, export, import)
  PlayMode.tsx         # full-screen story player
  store.ts             # Zustand store: nodes, edges, history, persistence
  types.ts             # TypeScript types for node data
  nodes/
    StartNode.tsx      # story-opening node
    DialogNode.tsx     # character + dialog text
    DecisionNode.tsx   # prompt + dynamic list of choices, one handle each
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
- Character library (define a character once, reuse the name)
- Variables and conditional branches (e.g. `if hasKey -> open door`)
- Auto-layout (dagre or elk)
- Export as a screenplay-style script (.docx) or as Twine/Ink
- Per-keystroke history (debounced) so undo also covers text edits
- Multiple Start nodes / chapters
- Collaborative editing
- Desktop build via Tauri

## License

Private / unlicensed — your project.
