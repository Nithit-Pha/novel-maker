# Main character ("you") and the How to use page

Status: **done 2026-11-03** (decisions 1C · 2A). 85 tests pass (5 new), typecheck + build clean, guide (desktop + phone), overlay, main character in Run mode and export checked in a browser.

## Decisions

| # | Question | Chosen |
|---|----------|--------|
| 1 | Whose stats / items does the Status panel show? | **C — one main character now, stored so Party mode (up to 5 main characters with per-character stats) can be added later** |
| 2 | Help | **A — a full "How to use" page** from the home page and the editor |

## Part 1 — main character

* `Project.mainCharacterIds: string[]` (one id for now; a list so Party mode can
  grow into it). Saved with the story, not the character list. Old saves → `[]`.
* Library → Character: ⭐ **Make main (you)** on each card (one at a time, a second
  click removes it), "Main · you" badge; the character editor has the same toggle
  (applied on Save). Deleting the main character clears it.
* Status card / Status slot (Run mode + export): the main character's portrait and
  name at the top, then class, items, abilities, power. No main → as before.
* Later, Party mode: per-character "Show to reader" variables (one `strength` per
  main character), a "for: …" picker in rules/effects, one Status tab per main
  character, and an in-app warning above 5 main characters.

## Part 2 — How to use

* Opens from the **home page** (`#/help`, `#/help/<topic>`) and, in the editor, as a
  full-screen **overlay** from the ? rail button and ⋯ → Help & tips (you never leave
  the project; Esc closes). The small keyboard-shortcut sheet (?) stays, with a link
  to the guide.
* Sidebar of topics (dropdown on phones), a search box filtering topics as you type.
* Content lives in `src/help/helpContent.ts` as plain data (paragraphs, lists, tips,
  key tables), so it is easy to edit and searchable. Card entries come from a
  `Record<NodeKind, …>` — a new card type without help doesn't compile, and a test
  checks it too.
* Topics: Getting started · Cards · Wires, branching & arcs · Library (Characters,
  Variables, Classes, Scenes) · Rules & changes · Status panel · Save points · Run
  mode · Story check · Export · Launcher · Keyboard shortcuts · Limits & tips.
* Help is updated with every future feature.

## Tests

Main character survives load (bad values dropped); help route parsing; search
filtering; every card kind has help.

Backup before coding: `_backup/before-help/`.
