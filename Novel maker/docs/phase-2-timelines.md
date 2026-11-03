# Phase 2 — Seeing your timelines

Date: 2026-11-02 · Status: ✅ done (2026-11-03) — 1A timeline recap · 2A recap + gallery in exports · 3A explorer runs automatically
Part of `branching-story-plan.md` (Path 1). Built on the Literary Studio design (`literary-studio-redesign.md`).

## 1. Story check
- `src/analysis/validate.ts` — pure `validateProject(project)` → issues `{ severity, arcId, nodeId?, message }`, re-run ~250 ms after edits.
  - **Errors**: Go to Arc → deleted arc; rules / effects using a deleted variable.
  - **Warnings**: cards no route can reach (whole arc reported once if nothing points to it); routes that stop without an Ending; unwired choice / branch / Else / outcome / loop item / loop "done"; Go to Arc without target; duplicate or empty variable names; two wires on one output (old saves).
  - **Notes**: empty dialogue text, empty decision prompt, empty choice label.
- Toolbar **Story check** button with a count badge (errors + warnings) → side panel, tab **Problems** grouped by severity and arc; click → switch arc if needed, centre and select the card.
- Card headers show a ⚠ with a tooltip listing that card's problems.

## 2. Route explorer
- `src/analysis/explore.ts` — breadth-first search over play states (arc, card, variables, loop progress, call stack) using the runtime core, so it follows locks, Condition cards, loops and portals exactly like Run mode. Chance cards branch into every outcome (core `land(…, pick)` hook). Stops at **20,000 states** and says so.
- Starts at the story start (first arc). Runs automatically ~1 s after edits while the panel is open.
- Tab **Routes**: every Ending with reachable / not found, number of routes (shown as "N+" when the story has loops), the **shortest route** (choices, loop picks, Chance results), **Jump to card**, **Play this route** (Run mode replays the route; Back still works).
- Feeds Story check: **endings no route reaches** (warning) and **choices locked on every route** (note) — skipped when the search hit the limit.

## 3. Play from here
- ▶ in every card header → dialog with starting variable values (defaults = each variable's start) → Run mode starts at that card.

## 4. End of a playthrough (Run mode and exported HTML)
- **Your route**: timeline, one row per decision (and revealed Chance / loop pick): choice taken, not taken, locked 🔒 with reason.
- **Endings found N / M**: gallery of all Ending cards; unseen ones shown as "???". Stored per project in this browser (exports: per story title); reset button.

## Tests
Unit: validator cases, explorer on the Lighthouse demo (good 2 · neutral 4 · bad 4 routes), impossible ending, always-locked choice, loops, portals, routing cycles, the limit. Browser: panel, jump, badges, play-this-route, play-from-here, recap + gallery in Run mode and export, both themes.

## Result (2026-11-03)
- Shipped as above. Tests: 36 unit tests (8 + 1 for Story check / explorer: Lighthouse counts good 2 · neutral 4 · bad 4, impossible ending, always-locked choice, loops, portals, the limit, unreachable sections) + a 30-check browser run in both themes + cross-arc jump; the 42-step regression still passes.
- Change while testing: unreachable cards are reported **once per cut-off section** ("No route reaches this card, nor the 9 cards after it") instead of one warning per card — deleting a single wire used to produce 11 warnings.
- Run mode gained `start` (Play from here) and `route` (Play this route) props; the runtime core gained `startAt()` and an optional `pick` hook for Chance outcomes (used only by the explorer).
- Previous source: `_backup/before-phase2/`.
