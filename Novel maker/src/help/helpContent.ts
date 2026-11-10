// "How to use" guide content. Plain data (no JSX) so it is easy to edit and
// searchable. Inline formatting in any string:
//   **bold**   `code`   [[topic-id|link text]]  (a link to another topic)
//
// Update this file with every new feature. CARD_HELP is a Record over every card
// kind, so a new card type without help doesn't compile (and a test checks it).

import type { NodeKind } from '../types';
import { SHORTCUTS } from '../ui/CanvasChrome';

export type HelpBlock =
  | { p: string }
  | { list: string[] }
  | { steps: string[] }
  | { tip: string }
  | { warn: string }
  | { keys: [string, string][] }
  | { h: string }
  | { cards: true };

export interface HelpTopic {
  id: string;
  group: string;
  title: string;
  /** One line under the title. */
  lead: string;
  /** Extra words people might search for. */
  keywords?: string;
  blocks: HelpBlock[];
}

export interface CardHelp {
  what: string;
  outputs: string;
  tip: string;
}

/** One entry per card type (in the order they appear in the guide). */
export const CARD_HELP: Record<NodeKind, CardHelp> = {
  chapter: {
    what: 'Starts a chapter. Run mode shows its name as a title card. An arc starts at its leftmost Chapter that has no wire coming in.',
    outputs: 'One output: the next card.',
    tip: 'Use one Chapter at the start of every arc so the start is never a guess.',
  },
  dialog: {
    what: 'A line spoken by a character. Pick the character from the Library to show their portrait in Run mode.',
    outputs: 'One output.',
    tip: 'Renaming a character in the Library updates every Dialogue card that uses them.',
  },
  scene: {
    what: 'Sets the place: a background image (Library → Scenes), an optional caption and a description.',
    outputs: 'One output.',
    tip: 'A background stays on screen until another card changes it — set it once per place, not on every card.',
  },
  decision: {
    what: 'A question with choices. Each choice can **change variables** when picked and can need **rules** to be available (locked 🔒 or hidden).',
    outputs: 'One output per choice (numbered).',
    tip: 'Leave a reason for locked choices, e.g. "Requires the old key" — otherwise readers see the rule itself.',
  },
  loop: {
    what: 'A menu of items the reader must all complete, in any order (e.g. "search the house": kitchen, attic, cellar). Each item’s wires lead away and back to the loop.',
    outputs: 'One output per item, plus “All done” when every item is finished.',
    tip: 'Wire the last card of each item back into the loop card.',
  },
  portal: {
    what: '**Go to Arc**: jumps to the start of another arc (tab). Use it to split a long story into acts.',
    outputs: 'None — the story continues in the other arc.',
    tip: 'Variables, class and items carry over to the next arc.',
  },
  condition: {
    what: 'A silent router: the reader never sees it. It follows the first branch whose rules hold, else “Else”.',
    outputs: 'One output per branch, plus Else.',
    tip: 'Great for "if you have the key, go here" — and for branching by class.',
  },
  chance: {
    what: 'A random roll with weights (e.g. 1 : 2). **Silent** just picks a path; **Reveal** shows the result as a card.',
    outputs: 'One output per outcome (the wire label shows its odds).',
    tip: 'Story check tries every outcome, so random routes are still checked.',
  },
  status: {
    what: 'Shows the reader their status: the main character, class, items, abilities and power (variables marked “Show to reader”).',
    outputs: 'One output.',
    tip: 'Put one right after the reader finds something — its on-enter changes run first, so the new item already shows.',
  },
  classpick: {
    what: '**Choose class**: the reader picks a class (Warrior, Mage…). In **Sub-class (later)** mode it offers only sub-classes of the class they have.',
    outputs: 'One output (branch afterwards with a Condition card if you need to).',
    tip: 'Make it a save point, so a reader who regrets their pick can go back and choose again.',
  },
  end: {
    what: 'An ending: title, context and an optional closing line. It counts in the reader’s “Endings found”.',
    outputs: 'None.',
    tip: 'Name every ending — names show in Story check and in the endings gallery.',
  },
};

/** Card order in the guide. */
export const CARD_ORDER: NodeKind[] = ['chapter', 'dialog', 'scene', 'decision', 'loop', 'portal', 'condition', 'chance', 'status', 'classpick', 'end'];

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'start',
    group: 'Basics',
    title: 'Getting started',
    lead: 'Projects, the saves folder and your first story in five steps.',
    keywords: 'project new open example lighthouse saves folder first',
    blocks: [
      { p: 'Every story is a **project**. The home page lists them; each one is a folder in `saves/` next to the app, so you can back it up or copy it like any folder.' },
      { h: 'Your first story' },
      {
        steps: [
          'On the home page click **New project** and give it a working title — or **Open the example** to explore *The Lighthouse*.',
          'Add cards with the buttons in the top bar (💬 Dialogue, 🎬 Scene, 🔀 Decision, ▶ Start) or the **+** menu for the rest.',
          'Connect cards: drag from a card’s right-hand dot to the next card’s left dot. See [[wires|Wires, branching & arcs]].',
          'Press **Run** to read your story like a reader would.',
          'Open **Story check** (the ✓ list button) to find gaps and see every ending a reader can reach.',
        ],
      },
      { tip: 'Projects save themselves a moment after every change — the dot next to Undo/Redo shows when it is saved. Ctrl+S saves right away.' },
    ],
  },
  {
    id: 'cards',
    group: 'Writing',
    title: 'Cards',
    lead: 'The building blocks of a story — what each card does.',
    keywords: 'node card type chapter dialogue scene decision loop portal arc condition chance status class ending',
    blocks: [
      { p: 'Every card has a header with small buttons: 🖼 background, 🎒 Status slot, ▶ play from here, 🔖 save point, 📌 pin, ✕ delete. At the bottom: tags and **On enter** changes (variables changed when the reader arrives).' },
      { cards: true },
    ],
  },
  {
    id: 'wires',
    group: 'Writing',
    title: 'Wires, branching & arcs',
    lead: 'Connecting cards, making routes and splitting a story into acts.',
    keywords: 'wire edge connect branch route arc tab act portal drop menu tidy layout',
    blocks: [
      {
        list: [
          'Drag from a card’s **right dot** (output) to another card’s **left dot** (input). Each output holds one wire; connecting it again replaces the old one.',
          'Drop a wire on **empty canvas** to create the next card right there.',
          'Wires from choices, branches and outcomes show a label, so you can read routes without opening cards.',
          '**Arcs** are the tabs above the canvas — use one per act. A **Go to Arc** card jumps to another arc’s start.',
          '**Tidy** (selection bar, or ⋯ menu) arranges cards left → right.',
        ],
      },
      { tip: 'Routes can rejoin: several choices may lead to the same card. Variables remember what happened on the way.' },
    ],
  },
  {
    id: 'characters',
    group: 'Library',
    title: 'Characters & the main character',
    lead: 'Your cast, and who “you” are.',
    keywords: 'character portrait outfit personality ability gender main you protagonist star',
    blocks: [
      { p: 'Open **Library** (📚 in the top bar) → **Character**. Each character has a name, gender, portrait, outfits, personality and ability bars and a description. Characters belong to the project.' },
      { h: 'Main character (you)' },
      {
        list: [
          'Click the **⭐ star** on a character (or tick “Main character” in the editor) to make them the main character.',
          'The Status card and Status slot then show their **portrait and name** at the top, followed by class, items, abilities and power.',
          'Only one main character for now. Companions can still be tracked with plain variables like `trust_tom`.',
        ],
      },
    ],
  },
  {
    id: 'variables',
    group: 'Library',
    title: 'Variables & “Show to reader”',
    lead: 'Story memory: flags, counters and text — and what readers see.',
    keywords: 'variable flag counter number text yes no bool show to reader group items abilities power emoji max bar inventory',
    blocks: [
      { p: '**Library → Variables** holds the story’s memory: yes/no flags (`has_key`), numbers (`trust_mira`, `coins`) and text. Change them with [[rules|changes]] and read them with rules.' },
      { h: 'Show to reader' },
      {
        list: [
          'Tick **Show to reader** to list a variable on [[status|Status cards and the Status slot]].',
          'Pick a **group** (Items, Abilities, Power or your own), a display name and an optional emoji.',
          'Numbers can get a **max**: they show as a bar like *7 / 10*.',
          'What shows: yes/no → only while *yes*; numbers → the value (hidden at 0) or a bar; text → while not empty.',
        ],
      },
      { tip: 'The “used 3×” count tells you whether a variable is still needed before you delete it.' },
    ],
  },
  {
    id: 'classes',
    group: 'Library',
    title: 'Classes & sub-classes',
    lead: 'Warrior, Mage… with starting stats, and promotions later.',
    keywords: 'class subclass sub-class warrior mage knight promotion become choose rpg role',
    blocks: [
      {
        list: [
          '**Library → Classes**: **+ Class**, then **+ Sub-class** under it (e.g. Warrior → Knight).',
          'Each has an emoji, a description and **“When the reader becomes this class”** changes (`strength = 8`, `sword = yes`).',
          'Give the reader a class with a **Choose class** card, or **+ become a class** on any choice or card.',
          'A **Choose class** card in **Sub-class (later)** mode offers only sub-classes of the reader’s class — a promotion.',
          'A promotion runs only the sub-class’s changes, so stats earned on the way are kept.',
          'Lock choices with a **class rule**: *Class is Mage*. A class includes its sub-classes.',
        ],
      },
      { tip: 'Story check → Routes shows which classes can reach each ending.' },
    ],
  },
  {
    id: 'scenes',
    group: 'Library',
    title: 'Scenes (backgrounds)',
    lead: 'Images behind the text in Run mode and the export.',
    keywords: 'scene background image picture png jpg backdrop',
    blocks: [
      {
        list: [
          '**Library → Scenes**: add .png / .jpg images (or drop them on the panel).',
          'Pick one with the 🖼 button on any card. It stays until another card sets a different one or “No background”.',
          'Select many cards and use **Scene** on the selection bar to set them all at once.',
        ],
      },
      { tip: 'Big images are scaled down to 2560 px automatically. Replaced or removed images go to `scenes/_deleted/`, never erased.' },
    ],
  },
  {
    id: 'rules',
    group: 'Writing',
    title: 'Rules & changes',
    lead: 'Make choices matter later: change variables, then check them.',
    keywords: 'effect change rule condition lock locked hidden on enter become class rule all any',
    blocks: [
      { h: 'Changes (effects)' },
      {
        list: [
          'On a **choice** (runs when picked) or a card’s **On enter** (runs when the reader arrives).',
          'Numbers: `+=`, `−=`, `=`. Yes/no: set or toggle. Text: set.',
          '**+ become a class** makes the reader that class.',
        ],
      },
      { h: 'Rules (conditions)' },
      {
        list: [
          'On a choice: when the rules fail it is **locked 🔒** (with your reason) or **hidden**.',
          'On a Condition card: the first branch whose rules hold is followed.',
          'Match **all** rules or **any** rule. **+ class rule**: *Class is / is not …*.',
        ],
      },
    ],
  },
  {
    id: 'status',
    group: 'Writing',
    title: 'Status panel',
    lead: 'Show the reader their items, abilities and power — only when you decide.',
    keywords: 'status hud slot inventory items abilities power show hide keep panel',
    blocks: [
      {
        list: [
          'A **Status card** shows the full panel as a card in the story.',
          'The **Status slot** sits beside the text and updates live. Switch it with the 🎒 button on any card: **Keep** (default) · **Show** (all or chosen groups) · **Hide** — from that card on.',
          'Readers can’t open it themselves. It hides while a Status card is on screen.',
          'It shows the [[characters|main character]], their [[classes|class]] and every variable marked [[variables|Show to reader]].',
        ],
      },
    ],
  },
  {
    id: 'savepoints',
    group: 'Writing',
    title: 'Save points',
    lead: 'Let readers return to a moment instead of starting over.',
    keywords: 'save point checkpoint bookmark continue start of arc read again',
    blocks: [
      {
        list: [
          'Click 🔖 in a card’s header to make it a save point.',
          'At an ending the reader can pick **Continue from save point**, **Start of <arc>** or **Read again**.',
          'Going back restores variables, class, loop progress, background and the Status slot exactly as they were.',
          'Saves last while the page is open.',
        ],
      },
    ],
  },
  {
    id: 'run',
    group: 'Playing & checking',
    title: 'Run mode',
    lead: 'Read your story the way a reader will.',
    keywords: 'run play test reader back variables play from here route endings found',
    blocks: [
      {
        list: [
          '**Run** plays from the start. **▶** on a card plays from that card (you can set variable values first).',
          '**Back** steps backwards; **🧪 Variables** shows live values you can edit to test other routes.',
          'At an ending: **Your route** (every decision you passed) and **Endings found**.',
        ],
      },
    ],
  },
  {
    id: 'check',
    group: 'Playing & checking',
    title: 'Story check',
    lead: 'Find problems and see every ending a reader can reach.',
    keywords: 'story check problems routes endings reachable unreachable explorer warning error not found yet',
    blocks: [
      {
        list: [
          '**Problems**: unconnected outputs, cards no route reaches, deleted variables or classes, empty cards…',
          '**Routes**: plays every possible route (every choice, chance outcome and class) and lists each ending: reachable or not, how many routes, the classes that get there, and the shortest route — with **Play**.',
          'Choices that are locked on every route are reported too.',
        ],
      },
      { warn: '“Not found yet” means the check stopped at its limit (20,000 situations) before finishing — see [[limits|Limits & tips]].' },
    ],
  },
  {
    id: 'export',
    group: 'App',
    title: 'Export a playable story',
    lead: 'One HTML file anyone can open, offline.',
    keywords: 'export html share file download offline json import',
    blocks: [
      {
        list: [
          '**Export ⬇ → Playable story (.html)** (top bar) saves a single `.html` file with the story, portraits and backgrounds inside. Double-click to play — no install, no internet.',
          'It plays exactly like Run mode: variables, classes, status, save points, endings.',
          '**Export ⬇ → Story file (.json)** saves the project data; **Import** on the home page opens it as a new project.',
        ],
      },
    ],
  },
  {
    id: 'launcher',
    group: 'App',
    title: 'Starting & stopping the app',
    lead: 'Novel-flow.bat and Novel-flow.vbs.',
    keywords: 'launcher bat vbs start stop restart port 5173 install test check',
    blocks: [
      {
        list: [
          '**Novel-flow.bat** — double-click to start (installs packages if needed and opens your browser). If it’s already running it asks: **Open**, **Restart** or **Stop**.',
          'The app runs in a minimized “Novel Flow server” window; close it to stop.',
          '**Novel-flow.vbs** — the same start with no window at all.',
          'From a terminal: `Novel-flow.bat test` runs the tests, `Novel-flow.bat check` runs tests + typecheck + build.',
        ],
      },
    ],
  },
  {
    id: 'keys',
    group: 'Reference',
    title: 'Keyboard shortcuts',
    lead: 'Work faster on the canvas and in Run mode.',
    keywords: 'keyboard shortcut key hotkey ctrl undo redo search',
    blocks: [{ keys: SHORTCUTS }],
  },
  {
    id: 'limits',
    group: 'Reference',
    title: 'Limits & tips',
    lead: 'Keep stories fast and easy to check.',
    keywords: 'limit performance slow big large tips memory main characters party image size',
    blocks: [
      {
        list: [
          '**Story check** explores up to **20,000** situations. Many independent counters (e.g. 10 numbers that all change often) multiply situations — prefer a few meaningful variables.',
          '**Scene images**: up to 25 MB each (scaled to 2560 px). **Portraits**: up to 3 MB.',
          '**Main character**: one per story for now. A future Party mode will allow up to **5** — more than that makes Story check slow.',
          'Pin 📌 important cards and press **Ctrl+K** to jump to them in big stories.',
        ],
      },
    ],
  },
];

/** All searchable text of a topic. */
export function topicText(t: HelpTopic): string {
  const parts: string[] = [t.title, t.lead, t.keywords ?? ''];
  for (const b of t.blocks) {
    if ('p' in b) parts.push(b.p);
    else if ('list' in b) parts.push(...b.list);
    else if ('steps' in b) parts.push(...b.steps);
    else if ('tip' in b) parts.push(b.tip);
    else if ('warn' in b) parts.push(b.warn);
    else if ('h' in b) parts.push(b.h);
    else if ('keys' in b) parts.push(...b.keys.flat());
    else if ('cards' in b) for (const k of CARD_ORDER) parts.push(k, CARD_HELP[k].what, CARD_HELP[k].outputs, CARD_HELP[k].tip);
  }
  return parts.join(' \n ').toLowerCase();
}

/** Topics matching every word of the query (empty query = all). */
export function filterTopics(query: string, topics: HelpTopic[] = HELP_TOPICS): HelpTopic[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return topics;
  return topics.filter((t) => {
    const text = topicText(t);
    return words.every((w) => text.includes(w));
  });
}
