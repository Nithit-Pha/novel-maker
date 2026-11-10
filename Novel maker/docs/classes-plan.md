# Classes and sub-classes

Status: **done 2026-11-03** — 80 tests pass (12 new), typecheck + build clean, Run mode, export and Story check checked in a browser.
Was: planned 2026-11-03 (decisions 1A · 2C · 3B · 4B · extras: Status panel, Story check per class).

## Goal

In the Library the writer creates **classes** (Warrior, Mage…) and **sub-classes**
(Warrior → Knight / Berserker). Becoming one sets starting stats, items and
abilities; decisions can check the class ("🔥 Mage only").

## Decisions

| # | Question | Chosen |
|---|----------|--------|
| 1 | What a class does to stats | **A — a list of effects** that run when the reader becomes it (same editor as choice effects) |
| 2 | How the reader gets a class | **C — both**: a **Choose class** card, and a **Become class…** effect on any choice / card |
| 3 | When the sub-class is chosen | **B — later**, at a Choose class card in *sub-class* mode (only sub-classes of the current class) |
| 4 | How decisions use it | **B — a "Class is / is not" rule**; a parent class includes its sub-classes; locked text "Requires 🔥 Mage" |
| 5 | Extras | **Class line in the Status panel**, **Story check per class** (Play-from-here class pick: not now) |

## Data

```ts
interface ClassDef {
  id: string; name: string; icon?: string; description?: string;
  parentId?: string | null;   // set = sub-class (one level deep)
  effects: Effect[];          // run when the reader becomes it
}
Project.classes: ClassDef[]   // old saves → []

// Effect: new op 'become' (value = class id, varId unused)
// Clause: { kind: 'class', classId, cmp: '==' | '!=' } (varId unused)

interface ClassPickData { kind: 'classpick'; title: string; prompt: string;
  mode: 'class' | 'subclass'; options: string[] /* [] = all */ }
```

The reader's class lives in the play state's variables under two reserved keys,
`@class` and `@subclass` (class ids, '' = none). So save points, Back, "Your
route" and the route explorer handle it like any variable.

## Rules

* **Become class X** (`becomeClass`):
  * X is a class → `@class = X`, `@subclass = ''`, run X's effects.
  * X is a sub-class of P:
    * already P → `@subclass = X`, run **only X's** effects (a promotion never resets stats);
    * not P → `@class = P`, `@subclass = X`, run P's effects, then X's.
  * Values from an old class are not undone. A "become" inside a class's own effects is ignored.
* **Class is X**: true when `@class == X` or `@subclass == X` (so a parent includes its sub-classes).
* **Choose class card**: class mode offers the ticked classes (none ticked = all);
  sub-class mode offers the sub-classes of the reader's current class (ticked ones,
  or all). Nothing to offer → it shows Next. After the pick the story follows its one
  wire; branch with a Condition card if needed.

## Players (Run mode + export, runtime shared in core.js)

* Choose class card: one button per option — emoji, name, description, and what it
  gives ("strength = 8, sword").
* Status panel (card + slot): "🔥 Mage · Pyromancer" at the top once there is a class.
* Locked choices: "Requires 🔥 Mage". "Your route" shows "Class: Mage".

## Editor

* Library → **Classes** tab (search box, + Class, + Sub-class, emoji, description,
  "When the reader becomes this class" effects, delete warns when used).
* **Choose class** card in the add menu and the wire-drop menu.
* Condition editor: **+ class rule**. Effects editor: **+ become a class** (hidden
  inside class effects).
* Variable usage counts and Story check include class effects; class rules are not
  "missing variables".

## Story check per class

* The route explorer tries every class pick; each ending lists the classes that reach it.
* "Never available" choices now include class-only choices no class can reach.
* Warnings: a rule / effect / card using a deleted class; a Choose class card with no
  classes (or sub-classes) to offer.

## Tests

`runtime/classes.test.ts`: become class / sub-class / promotion, class rules with
sub-classes, Choose class options + pick, save points keep the class, describe texts,
explorer endings per class, old saves load.

Backup before coding: `_backup/before-classes/`.
