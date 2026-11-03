import os
os.chdir(os.path.expanduser('~/mnt/Novel maker'))
p='docs/branching-story-plan.md'; s=open(p,encoding='utf-8').read()
a="## Phase 3 — Usability (≈ 1 week)"
assert a in s
s=s.replace(a,"## Phase 3 — Usability ✅ done (2026-11-03)")
b="5. **In-app dialogs and toasts** replacing `alert()` / `confirm()` (import errors, delete confirmations)."
assert b in s
s=s.replace(b,b+"""

**Result (2026-11-03)**
1. Drag a wire into empty space → menu "Add next card" (all 9 kinds) at the drop point; from an *input* the menu offers "Add a card before" (Chapter / Scene / Dialogue). The new card is wired at once, replaces an existing wire on that output, is one undo step, and the canvas scrolls to it if it lands off screen.
2. Wire labels (choice "1 · Let her in", branch, Else, outcome with %, loop item, All done) sit next to the output they leave; hidden below 45 % zoom. Toggle: bottom-right zoom control and ⚙ Settings (instead of the crowded toolbar).
3. **Tidy** (wand in the zoom control, and ⋯ menu): dagre left → right, 180 px between columns so labels fit, choices kept in order; only the selected cards when 2+ are selected; keeps the story's top-left corner; one undo step.
4. Speaker field (Dialogue and Ending cards): suggestions from the Character Library with portrait, links the card (`characterId`), "Add to Library" for a new name; renaming a character in the Library renames every linked card (and older unlinked cards with the old name) in all arcs.
5. Already done in the Literary Studio redesign.
Tests: 43 unit tests (+7 for layout, labels, connected-add, rename) and a 34-check browser run in both themes; earlier suites still pass.""")
open(p,'w',encoding='utf-8',newline='').write(s)

p='README.md'; s=open(p,encoding='utf-8').read()
a="### Editing\n"
assert s.count(a)==1
s=s.replace(a,"""### Faster editing
- **Drag a wire into empty space** and pick the card to create — it appears there, already connected (from an input: a card *before* it).
- **Wire labels** show each choice / branch / outcome on its wire (toggle with the captions button bottom-right or in ⚙ Settings).
- **Tidy** (wand button bottom-right, or ⋯ → Tidy) arranges the arc left → right; select 2+ cards to tidy just those. Ctrl+Z undoes it.
- **Speaker field**: Dialogue and Ending cards suggest characters from the Library (with portrait). A new name can be added to the Library with one click; renaming a character in the Library updates every card that uses it.

### Editing
""")
s=s.replace("  analysis/            # Story check:","  canvas/              # wire with label (NfEdge), wire label text, drop menu, Tidy layout (dagre)\n  analysis/            # Story check:")
open(p,'w',encoding='utf-8',newline='').write(s)
print('docs ok')
