// Builds a single self-contained, playable HTML file from a story project.
// Bundles every Arc; plays in any browser offline (double-click to open).
//
// All play rules come from runtime/core.js, inlined verbatim, so the exported
// file behaves exactly like Run mode in the editor. This file only renders.

import type { Edge, Node } from '@xyflow/react';
import type { ClassDef, NodeData, VariableDef } from '../types';
import type { Character } from '../library/libraryTypes';
import CORE_SOURCE from '../runtime/core.js?raw';
import { endingLabels } from '../analysis/explore';
import { canSavePoint } from '../runtime/core.js';
import { nodeTitle } from '../search';

interface ExportArc {
  id: string;
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
}

/** A scene background, with its image already as a data URL (the file must work offline). */
export interface ExportScene {
  id: string;
  name: string;
  src: string;
}

interface BuildArgs {
  arcs: ExportArc[];
  startArcId: string;
  characters: Character[];
  variables?: VariableDef[];
  /** Classes and sub-classes (Library → Classes). */
  classes?: ClassDef[];
  /** The main character ("you") — shown at the top of the Status panel. */
  mainCharacterIds?: string[];
  title?: string;
  /** Scenes used by the story. Unused ones can be left out to keep the file small. */
  scenes?: ExportScene[];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function embedJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

if (/<\/script/i.test(CORE_SOURCE)) {
  throw new Error('runtime/core.js must not contain a closing script tag');
}

export function buildStoryHtml({ arcs, startArcId, characters, variables, classes, mainCharacterIds, title, scenes }: BuildArgs): string {
  const storyTitle = (title && title.trim()) || 'My Story';
  const characterList = characters.map((c) => ({ id: c.id, name: c.name, image: c.image ?? '' }));
  const storyData = {
    title: storyTitle,
    startArcId,
    variables: variables ?? [],
    classes: classes ?? [],
    mainCharacterIds: mainCharacterIds ?? [],
    arcs: arcs.map((a) => ({
      id: a.id,
      name: a.name,
      nodes: a.nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
      edges: a.edges.map((e) => ({ source: e.source, sourceHandle: e.sourceHandle ?? null, target: e.target })),
    })),
    characters: characterList,
    scenes: (scenes ?? []).filter((x) => x.src).map((x) => ({ id: x.id, name: x.name, src: x.src })),
    // Ending names for the "Endings found" gallery (title, else "Ending N").
    endings: [
      ...endingLabels({ version: 3, meta: { title: storyTitle }, activeArcId: startArcId, arcs, variables: variables ?? [] }),
    ].map(([id, v]) => ({ id, label: v.label })),
    // Save-point card titles for "Last save point: …", keyed "<arcId>:<nodeId>".
    saveLabels: Object.fromEntries(
      arcs.flatMap((a) => a.nodes.filter((n) => n.data.savePoint && canSavePoint(n)).map((n) => [`${a.id}:${n.id}`, nodeTitle(n)]))
    ),
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script>
  // Theme: the reader's saved choice, else their system setting.
  (function () {
    var t = null;
    try { t = localStorage.getItem('novel-flow-reader-theme'); } catch (e) {}
    if (t !== 'light' && t !== 'dark') t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = t;
  })();
</script>
<title>${escapeHtml(storyTitle)}</title>
<style>
  :root, :root[data-theme='light'] {
    --bg:#F4F0E8; --surface:#FFFCF6; --sunken:#F9F5EE; --surface-2:#EEE9DF; --border:#E0D8CB;
    --fg:#39352F; --soft:#4E4840; --muted:#6F675D; --faint:#9A9184; --accent:#A0674A; --on-accent:#FFFCF6; --warning:#9A7337;
    --start:#56785A; --dialog:#4F6B8C; --decision:#A2612E; --scene:#7A5A85; --loop:#4A7A74; --chance:#86692A; --status:#687234; --classpick:#8C3A4A; --end:#6E675D;
    --shadow: 0 1px 3px rgba(107,85,55,.08), 0 8px 22px -10px rgba(107,85,55,.22);
    color-scheme: light;
  }
  :root[data-theme='dark'] {
    --bg:#24231F; --surface:#302D27; --sunken:#2A2823; --surface-2:#39352E; --border:#494238;
    --fg:#EAE2D5; --soft:#D6CDBF; --muted:#AAA092; --faint:#8A8174; --accent:#C18B68; --on-accent:#24231F; --warning:#D0AA6D;
    --start:#93AE8F; --dialog:#8FA8C6; --decision:#D39B63; --scene:#B79DC3; --loop:#87B5AE; --chance:#D2B26A; --status:#B2BC76; --classpick:#DE8C9A; --end:#B9B1A4;
    --shadow: 0 1px 3px rgba(0,0,0,.3), 0 10px 26px -12px rgba(0,0,0,.6);
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { background: var(--bg); color: var(--fg); font-family: 'DM Sans', ui-sans-serif, system-ui, 'Segoe UI', sans-serif;
    display: flex; flex-direction: column; min-height: 100%; -webkit-font-smoothing: antialiased; transition: background-color .25s, color .25s; }
  .serif, .body, .bigline, .title, .endtitle, .epilogue { font-family: 'Lora', Georgia, 'Times New Roman', serif; }
  .topbar, .bottombar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 20px; height: 56px; background: var(--surface); }
  .topbar { border-bottom: 1px solid var(--border); }
  .bottombar { border-top: 1px solid var(--border); font-size: 12px; color: var(--muted); height: 48px; }
  .title { color: var(--fg); font-size: 19px; }
  .steps { color: var(--muted); font-size: 13px; margin-left: 12px; }
  .stage { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 24px; overflow: auto; }
  .card { width: 100%; max-width: 680px; animation: fade .25s ease-out; }
  @keyframes fade { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform:none;} }
  @media (prefers-reduced-motion: reduce) { .card, body { animation: none !important; transition: none !important; } }
  .kicker { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .28em; margin-bottom: 20px; display:flex; align-items:center; gap:10px; }
  .kicker.dialog { color: var(--dialog); } .kicker.decision { color: var(--decision); }
  .kicker.scene { color: var(--scene); } .kicker.loop { color: var(--loop); } .kicker.chapter { color: var(--start); }
  .kicker.chance { color: var(--chance); } .kicker.end { color: var(--end); justify-content:center; }
  .kicker.status { color: var(--status); } .btn-next.status { background: var(--status); }
  .kicker.classpick { color: var(--classpick); } .btn-next.classpick { background: var(--classpick); }
  .classgrid { display: grid; gap: 10px; margin-top: 24px; } @media (min-width: 640px) { .classgrid { grid-template-columns: 1fr 1fr; } }
  .classopt { text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px; color: var(--fg); }
  .classopt:hover { background: var(--surface-2); border-color: var(--classpick); }
  .classopt .cn { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 500; }
  .classopt .ci { font-size: 24px; line-height: 1; }
  .classopt .cd { font-size: 14px; color: var(--soft); margin: 6px 0 0; line-height: 1.4; }
  .classopt .cg { font-size: 12px; color: var(--muted); margin: 6px 0 0; }
  .wholine { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-family: 'Lora', Georgia, serif; color: var(--fg); }
  .wholine img, .wholine .ph { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0; }
  .wholine .ph { display: flex; align-items: center; justify-content: center; background: var(--sunken); color: var(--muted); font-family: inherit; }
  .spanel.big .wholine { font-size: 19px; } .spanel.big .wholine img, .spanel.big .wholine .ph { width: 44px; height: 44px; }
  .classline { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
  .classline .k { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .2em; color: var(--classpick); }
  .classline .v { color: var(--fg); font-weight: 500; }
  .avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border); }
  .body { font-size: 26px; line-height: 1.55; margin: 0 0 40px; color: var(--fg); }
  .body.scene { font-style: italic; color: var(--soft); }
  .muted { color: var(--faint); }
  button { font: inherit; cursor: pointer; border: none; border-radius: 10px; transition: background-color .15s, border-color .15s, filter .15s; }
  button:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent); }
  .btn-next { color: var(--surface); padding: 10px 22px; font-size: 15px; font-weight: 500; box-shadow: var(--shadow); }
  .btn-next.dialog { background: var(--dialog); } .btn-next.scene { background: var(--scene); }
  .btn-next.chapter { background: var(--start); } .btn-next.chance { background: var(--chance); }
  .btn-next:hover { filter: brightness(1.1); }
  .choices { display: flex; flex-direction: column; gap: 10px; }
  .choice { text-align: left; background: var(--surface); border: 1px solid var(--border); color: var(--fg); padding: 14px 18px; border-radius: 12px;
    font-size: 17px; display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow); }
  .choice:hover { background: var(--surface-2); border-color: var(--decision); }
  .choice .num { width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--decision); color: var(--decision); font-size: 12px; font-weight: 600;
    display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .choice .unwired { margin-left: auto; font-size: 12px; color: var(--faint); }
  .choice[disabled] { opacity:.5; cursor:default; box-shadow: none; }
  .choice[disabled]:hover { background: var(--surface); border-color: var(--border); }
  .choice.locked { display: block; background: var(--sunken); color: var(--faint); cursor: not-allowed; box-shadow: none; }
  .choice.locked:hover { background: var(--sunken); border-color: var(--border); }
  .choice.locked .num { border: none; color: var(--faint); }
  .choice .why { display:block; font-size: 12px; margin: 4px 0 0 36px; color: var(--muted); }
  .loopitem .num { border-color: var(--loop); color: var(--loop); }
  .navbtn { background: transparent; color: var(--muted); padding: 7px 12px; border: 1px solid transparent; }
  .navbtn:hover:not(:disabled) { background: var(--surface-2); color: var(--fg); }
  .navbtn:disabled { opacity: .35; cursor: not-allowed; }
  .navbtn.outline { border-color: var(--border); background: var(--surface); }
  .restart, .endbtn { background: var(--accent); color: var(--on-accent); padding: 10px 22px; }
  .endbtn:hover { filter: brightness(1.1); }
  .endwrap { text-align:center; }
  .endtitle { font-size: 40px; font-weight: 400; color: var(--fg); margin: 0 0 12px; }
  .bigline { font-size: 40px; font-weight: 400; color: var(--fg); margin: 0 0 36px; line-height: 1.2; }
  .epilogue { font-size: 20px; font-style: italic; color: var(--soft); line-height: 1.55; margin: 0 0 32px; }
  .fleuron { color: var(--faint); letter-spacing: .5em; margin-bottom: 28px; }
  .theend { color: var(--muted); font-size: 13px; letter-spacing: .3em; text-transform: uppercase; margin: 0 0 24px; }
  .tools { display: flex; gap: 4px; align-items: center; }
  .endbtns { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
  .savecap { color: var(--muted); font-size: 14px; margin: 0 0 12px; }
  .savecap b { color: var(--soft); font-weight: 600; }
  .savemark { color: var(--accent); font-weight: 600; }
  /* Status panel (Status card + HUD) */
  .spanel h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .2em; color: var(--status); margin: 0 0 8px; }
  .spanel.small h3 { font-size: 10px; margin-bottom: 4px; }
  .spanel section + section { margin-top: 20px; } .spanel.small section + section { margin-top: 12px; }
  .spanel ul { list-style: none; margin: 0; padding: 0; }
  .spanel li { padding: 6px 0; border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent); }
  .spanel.small li { padding: 4px 0; } .spanel li:first-child { border-top: 0; }
  .spanel.big { font-size: 16px; } .spanel.small { font-size: 13.5px; }
  .srow { display: flex; align-items: center; gap: 8px; }
  .srow .ic { width: 20px; text-align: center; flex-shrink: 0; }
  .srow .lb { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--fg); }
  .srow .vl { color: var(--soft); font-variant-numeric: tabular-nums; }
  .sbar { margin-top: 4px; height: 6px; border-radius: 99px; background: var(--surface-2); overflow: hidden; }
  .sbar > div { height: 100%; background: var(--status); border-radius: 99px; transition: width .5s; }
  .none { color: var(--muted); font-style: italic; font-size: 14px; margin: 0; }
  .statusbox { border: 1px solid var(--border); background: var(--surface); border-radius: 16px; padding: 16px 20px; margin: 24px 0 40px; }
  .hud { position: absolute; top: 16px; right: 16px; width: 240px; max-height: calc(100% - 32px); overflow: auto; z-index: 2;
    background: color-mix(in srgb, var(--surface) 92%, transparent); border: 1px solid var(--border); border-radius: 14px;
    padding: 14px 16px; box-shadow: var(--shadow); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
  .hud[hidden] { display: none; }
  .hudhead { display: flex; align-items: center; gap: 8px; width: 100%; background: none; border: 0; padding: 0; font-size: 13px; font-weight: 600; color: var(--fg); cursor: default; }
  .hudhead .muted { font-weight: 400; }
  .hudbody { margin-top: 10px; }
  @media (min-width: 900px) { .stage.has-hud { padding-right: 290px; } }
  @media (max-width: 899px) {
    .hud { left: 12px; right: 12px; top: 12px; width: auto; padding: 8px 12px; }
    .hudhead { cursor: pointer; min-height: 24px; }
    .hud:not(.open) .hudbody { display: none; }
    .stage.has-hud { padding-top: 64px; }
  }
  .ghost { background: var(--surface); color: var(--soft); border: 1px solid var(--border); padding: 10px 18px; }
  .ghost:hover { background: var(--surface-2); color: var(--fg); }
  .overlay { position: fixed; inset: 0; background: rgba(40,30,20,.28); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 10; }
  .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 580px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: var(--shadow); animation: fade .15s ease-out; }
  .tabs { display: flex; gap: 4px; padding: 10px 16px 0; border-bottom: 1px solid var(--border); align-items: center; }
  .tab { background: none; border-radius: 0; padding: 10px; color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -1px; font-size: 14px; }
  .tab.on { color: var(--fg); border-bottom-color: var(--accent); font-weight: 600; }
  .tabs .close { margin-left: auto; background: none; color: var(--muted); font-size: 20px; padding: 4px 10px; }
  .pbody { overflow-y: auto; padding: 20px; }
  .timeline { list-style: none; margin: 0 0 0 8px; padding: 0; border-left: 2px solid var(--border); }
  .timeline li { position: relative; padding: 0 0 20px 22px; }
  .timeline li::before { content: ''; position: absolute; left: -7px; top: 5px; width: 10px; height: 10px; border-radius: 50%; background: var(--surface); border: 2px solid var(--decision); }
  .timeline .q { font-family: 'Lora', Georgia, serif; font-size: 16px; color: var(--fg); margin: 0 0 8px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { font-size: 13px; border-radius: 999px; padding: 4px 11px; border: 1px solid var(--border); color: var(--muted); background: var(--surface); }
  .chip.taken { background: var(--decision); border-color: var(--decision); color: var(--surface); font-weight: 600; }
  .chip.locked { background: var(--sunken); color: var(--faint); }
  .gallery { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
  .gallery li { border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; background: var(--surface); }
  .gallery li.unseen { border-style: dashed; background: var(--sunken); }
  .gallery .t { font-family: 'Lora', Georgia, serif; font-size: 15px; color: var(--fg); }
  .gallery .unseen .t { color: var(--faint); }
  .gallery .s { font-size: 12px; color: var(--faint); margin-top: 2px; }
  .reset { margin-top: 14px; font-size: 12px; }
  /* Scene backgrounds: the image fills the reading area; the text sits on a paper panel. */
  .stage { position: relative; }
  .bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .bg .layer { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0; transition: opacity .6s ease-out; }
  .bg .layer.on { opacity: 1; }
  .bg .veil { position: absolute; inset: 0; background: color-mix(in srgb, var(--bg) 18%, transparent); }
  .stage.has-bg .card { position: relative; background: color-mix(in srgb, var(--surface) 88%, transparent); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent); border-radius: 20px; box-shadow: var(--shadow); padding: 32px 36px; }
  @media (max-width: 640px) { .stage.has-bg .card { padding: 24px 20px; } }
  @media (prefers-reduced-motion: reduce) { .bg .layer { transition: none; } }
</style>
</head>
<body>
  <div class="topbar">
    <div><span class="title">${escapeHtml(storyTitle)}</span><span class="steps" id="steps"></span></div>
    <div class="tools">
      <button class="navbtn" id="theme" title="Light / dark" aria-label="Toggle light or dark theme"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:block"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg></button>
      <button class="navbtn outline" id="restart">Restart</button>
    </div>
  </div>
  <div class="stage" id="stage"><div class="bg" id="bg" aria-hidden="true"><div class="layer"></div><div class="layer"></div><div class="veil"></div></div><aside class="hud" id="hud" hidden aria-label="Status"></aside><div id="root" class="card"></div></div>
  <div class="bottombar">
    <button class="navbtn" id="back">&larr; Back</button>
    <span id="hint"></span>
    <span style="opacity:0;padding:6px 12px">.</span>
  </div>

<script>
window.STORY = ${embedJson(storyData)};
</script>
<script type="module">
// ---- Novel Flow runtime core (same code as the editor's Run mode) ----
${CORE_SOURCE}

// ---- Player UI ----
var S = window.STORY;
var index = buildIndex(S);
var charByName = {};
var charById = {};
(S.characters || []).forEach(function (c) { if (c && c.name) charByName[c.name.trim().toLowerCase()] = c; if (c && c.id) charById[c.id] = c; });

var sceneById = {};
(S.scenes || []).forEach(function (sc) { if (sc && sc.id) sceneById[sc.id] = sc; });
var stageEl = document.getElementById('stage');
var bgLayers = document.querySelectorAll('#bg .layer');
var bgFront = 0;
var bgShown = '';
// Fade the new background in over the old one (two layers, swapped).
function showScene(id) {
  var sc = id ? sceneById[id] : null;
  var src = sc ? sc.src : '';
  if (src === bgShown) return;
  bgShown = src;
  stageEl.classList.toggle('has-bg', !!src);
  document.getElementById('bg').setAttribute('data-scene', sc ? sc.name : '');
  var back = bgLayers[1 - bgFront];
  if (src) back.style.backgroundImage = 'url("' + src + '")';
  back.classList.toggle('on', !!src);
  bgLayers[bgFront].classList.remove('on');
  bgFront = 1 - bgFront;
}

var state = startPlay(index, S.startArcId);
var history = [];
var actions = []; // actions[i] = what the reader did at history[i]
var SEEN_KEY = 'novel-flow-reader-endings:' + S.title;
function readSeen() { try { var v = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function markSeen(id) { var s = readSeen(); if (s.indexOf(id) === -1) s.push(id); try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch (e) {} }

var root = document.getElementById('root');
var stepsEl = document.getElementById('steps');
var hintEl = document.getElementById('hint');
var backBtn = document.getElementById('back');
document.getElementById('restart').onclick = restart;
document.getElementById('theme').onclick = function () {
  var t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('novel-flow-reader-theme', t); } catch (e) {}
};
backBtn.onclick = goBack;

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

function go(ns, action) { if (ns === state) return; history.push(state); actions.push(action); state = ns; render(); }
function goNext() { go(next(index, state), { type: 'next' }); }
function goBack() { if (!history.length) return; state = history.pop(); actions.pop(); render(); }
function restart() { state = startPlay(index, S.startArcId); history = []; actions = []; closeOverlay(); render(); }
// Back to a save point / the arc start: rewind to the step where it was made.
function rewind(field, fallback) {
  var cp = state[field]; if (!cp) return;
  var states = history.concat([state]);
  var i = checkpointStep(states, cp, field);
  if (i < 0) { state = fallback; history = []; actions = []; }
  else { state = states[i]; history = history.slice(0, i); actions = actions.slice(0, i); }
  closeOverlay(); render();
}
function backToSave() { rewind('save', loadSave(state)); }
function backToArc() { rewind('arcStart', restartArc(index, state)); }
function onSaveCard() {
  var sv = state.save, node = currentNode(index, state);
  return !!sv && !!node && node.type !== 'end' && sv.arcId === state.arcId && sv.currentId === state.currentId;
}

// ---- End of a playthrough: "Your route" + "Endings found" ----
function endButtons() {
  var seen = readSeen();
  var all = S.endings || [];
  var found = all.filter(function (e) { return seen.indexOf(e.id) !== -1; }).length;
  var sv = state.save, as = state.arcStart;
  var showArc = !!as && as !== (history[0] || state).arcStart && !(sv && sv.arcId === as.arcId && sv.currentId === as.currentId);
  var saveName = sv ? ((S.saveLabels || {})[sv.arcId + ':' + sv.currentId] || 'Save point') : '';
  var arcName = as && index.arcs[as.arcId] ? (index.arcs[as.arcId].name || 'this arc') : '';
  var wrap = el('<div>' + (sv ? '<p class="savecap">Last save point: <b>' + esc(saveName) + '</b></p>' : '') + '<div class="endbtns">' +
    (sv ? '<button class="endbtn" data-do="save" title="Go back there, as it was when you got there">&#8634; Continue from save point</button>' : '') +
    (showArc ? '<button class="ghost" data-do="arc" title="Go back to the first card of this arc">&#8676; Start of ' + esc(arcName) + '</button>' : '') +
    '<button class="' + (sv ? 'ghost' : 'endbtn') + '" data-do="again">Read again</button><button class="ghost" data-tab="route">Your route</button>' +
    (all.length ? '<button class="ghost" data-tab="endings">Endings ' + found + ' / ' + all.length + '</button>' : '') + '</div></div>');
  var acts = { save: backToSave, arc: backToArc, again: restart };
  wrap.querySelectorAll('[data-do]').forEach(function (b) { b.onclick = acts[b.getAttribute('data-do')]; });
  wrap.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { openOverlay(b.getAttribute('data-tab')); }; });
  return wrap;
}
function recapRows() {
  var rows = [];
  history.forEach(function (s, i) {
    var node = currentNode(index, s); var a = actions[i];
    if (!node || !a) return;
    var d = node.data || {};
    if (node.type === 'decision' && a.type === 'choose') {
      var opts = [];
      (d.choices || []).forEach(function (c) {
        var st = choiceState(c, s.vars);
        if (!st.visible) return;
        var status = c.id === a.choiceId ? 'taken' : (st.available ? 'skipped' : 'locked');
        var why = status === 'locked' ? ((c.lockedText && c.lockedText.trim()) || ('Requires ' + describeCondition(c.condition, index.variables, index.classes))) : '';
        opts.push({ label: c.label || '(empty choice)', status: status, why: why });
      });
      rows.push({ title: d.prompt || 'Decision', opts: opts });
    } else if (node.type === 'classpick' && a.type === 'class') {
      rows.push({ title: (d.title || '').trim() || (d.mode === 'subclass' ? 'Sub-class' : 'Class'), opts: classOptions(index, s, node).map(function (c) {
        return { label: className(index.classes, c.id), status: c.id === a.classId ? 'taken' : 'skipped' }; }) });
    } else if (node.type === 'loop' && a.type === 'item') {
      var done = s.progress[node.id] || [];
      rows.push({ title: d.title || 'Loop', opts: (d.items || []).filter(function (it) { return done.indexOf(it.id) === -1; })
        .map(function (it) { return { label: it.label || '(item)', status: it.id === a.itemId ? 'taken' : 'skipped' }; }) });
    } else if (node.type === 'chance' && s.roll) {
      rows.push({ title: d.title || 'Chance', opts: (d.outcomes || []).map(function (o) { return { label: o.label || '(outcome)', status: o.id === s.roll.outcomeId ? 'taken' : 'skipped' }; }) });
    }
  });
  return rows;
}
var overlayEl = null;
function closeOverlay() { if (overlayEl) { overlayEl.remove(); overlayEl = null; } }
function openOverlay(tab) {
  closeOverlay();
  var seen = readSeen(); var all = S.endings || [];
  var found = all.filter(function (e) { return seen.indexOf(e.id) !== -1; }).length;
  var body = '';
  if (tab === 'route') {
    var rows = recapRows();
    body = rows.length ? '<ol class="timeline">' + rows.map(function (r) {
      return '<li><p class="q">' + esc(r.title) + '</p><div class="chips">' + r.opts.map(function (o) {
        return '<span class="chip ' + o.status + '"' + (o.why ? ' title="' + esc(o.why) + '"' : '') + '>' + (o.status === 'taken' ? '✓ ' : o.status === 'locked' ? '🔒 ' : '') + esc(o.label) + '</span>';
      }).join('') + '</div></li>';
    }).join('') + '</ol>' : '<p class="muted" style="text-align:center">No choices on this route — the story led straight here.</p>';
  } else {
    body = '<ul class="gallery">' + all.map(function (e) {
      var got = seen.indexOf(e.id) !== -1;
      return '<li class="' + (got ? '' : 'unseen') + '"><div class="t">' + (got ? esc(e.label) : '???') + '</div><div class="s">' + (got ? 'Found' : 'Not found yet') + '</div></li>';
    }).join('') + '</ul><button class="navbtn outline reset">Reset found endings</button>';
  }
  overlayEl = el('<div class="overlay"><div class="panel" role="dialog" aria-modal="true"><div class="tabs">' +
    '<button class="tab' + (tab === 'route' ? ' on' : '') + '" data-tab="route">Your route</button>' +
    (all.length ? '<button class="tab' + (tab === 'endings' ? ' on' : '') + '" data-tab="endings">Endings found ' + found + ' / ' + all.length + '</button>' : '') +
    '<button class="close" aria-label="Close">×</button></div><div class="pbody">' + body + '</div></div></div>');
  overlayEl.onclick = function (e) { if (e.target === overlayEl) closeOverlay(); };
  overlayEl.querySelector('.close').onclick = closeOverlay;
  overlayEl.querySelectorAll('.tab').forEach(function (b) { b.onclick = function () { openOverlay(b.getAttribute('data-tab')); }; });
  var rs = overlayEl.querySelector('.reset');
  if (rs) rs.onclick = function () { try { localStorage.removeItem(SEEN_KEY); } catch (e) {} openOverlay('endings'); render(); };
  document.body.appendChild(overlayEl);
}

// ---- Status panel (items / abilities / power): Status cards + the HUD ----
var hudOpen = false; // phones: the HUD bar starts collapsed
function rowHtml(r) {
  var ic = r.icon ? '<span class="ic" aria-hidden="true">' + esc(r.icon) + '</span>' : '';
  if (r.max != null) {
    var v = Number(r.value) || 0;
    var pct = Math.max(0, Math.min(100, (v / r.max) * 100));
    return '<li><div class="srow">' + ic + '<span class="lb">' + esc(r.label) + '</span><span class="vl">' + v + ' / ' + r.max + '</span></div>' +
      '<div class="sbar" role="meter" aria-label="' + esc(r.label) + '" aria-valuemin="0" aria-valuemax="' + r.max + '" aria-valuenow="' + v + '"><div style="width:' + pct + '%"></div></div></li>';
  }
  return '<li><div class="srow">' + ic + '<span class="lb">' + esc(r.label) + '</span>' + (r.type === 'bool' ? '' : '<span class="vl">' + esc(r.value) + '</span>') + '</div></li>';
}
// "🔥 Mage · Pyromancer" — the reader's class, shown first in the Status panel.
function classLineHtml() {
  var cs = currentClasses(index.classes, state.vars);
  if (!cs.length) return '';
  var label = cs.map(function (c, i) { return i === 0 ? className(index.classes, c.id) : c.name; }).join(' · ');
  return '<div class="classline"><span class="k">Class</span><span class="v">' + esc(label) + '</span></div>';
}
// The main character ("you"): portrait + name at the top of the Status panel.
function whoHtml() {
  var id = (S.mainCharacterIds || [])[0];
  var c = id ? charById[id] : null;
  if (!c) return '';
  var name = (c.name || '').trim() || 'You';
  return '<div class="wholine">' + (c.image ? '<img src="' + esc(c.image) + '" alt="" />' : '<span class="ph" aria-hidden="true">' + esc(name.charAt(0).toUpperCase()) + '</span>') +
    '<span>' + esc(name) + '</span></div>';
}
function statusHtml(groups, hideEmpty, size) {
  var list = hideEmpty ? groups.filter(function (g) { return g.rows.length; }) : groups;
  var cl = whoHtml() + classLineHtml();
  if (!list.length) return cl ? '<div class="spanel ' + size + '">' + cl + '</div>' : '<p class="none">Nothing yet.</p>';
  return '<div class="spanel ' + size + '">' + cl + list.map(function (g) {
    return '<section><h3>' + esc(g.name) + '</h3>' + (g.rows.length ? '<ul>' + g.rows.map(rowHtml).join('') + '</ul>' : '<p class="none">Nothing yet.</p>') + '</section>';
  }).join('') + '</div>';
}
function renderHud(node) {
  var hud = document.getElementById('hud');
  // Not while a Status card is on screen: it already shows the same list.
  if (!state.hud || (node && node.type === 'status')) { hud.hidden = true; stageEl.classList.remove('has-hud'); return; }
  var groups = statusView(index.variables, state.vars, state.hud);
  var count = groups.reduce(function (n, g) { return n + g.rows.length; }, 0);
  hud.hidden = false;
  stageEl.classList.add('has-hud');
  hud.classList.toggle('open', hudOpen);
  hud.innerHTML = '<button class="hudhead" aria-expanded="' + hudOpen + '"><span aria-hidden="true">🎒</span> Status <span class="muted">&middot; ' + count + '</span></button>' +
    '<div class="hudbody">' + statusHtml(groups, true, 'small') + '</div>';
  hud.querySelector('.hudhead').onclick = function () { hudOpen = !hudOpen; renderHud(node); };
}

function nextButton(cls, label) {
  var b = el('<button class="btn-next ' + cls + '">' + (hasNext(index, state) ? label : 'The End') + '</button>');
  b.onclick = goNext;
  return b;
}

function render() {
  root.innerHTML = '';
  var arc = index.arcs[state.arcId];
  var node = currentNode(index, state);
  showScene(state.scene);
  renderHud(node);
  stepsEl.textContent = (arc ? arc.name + ' · ' : '') + (node ? ('step ' + (history.length + 1)) : (history.length + ' steps'));
  backBtn.disabled = history.length === 0;
  hintEl.textContent = 'Press Space or → to continue';

  if (!arc) { root.appendChild(el('<div class="endwrap"><h2 class="endtitle">No story</h2></div>')); hintEl.textContent = ''; return; }
  if (!node) {
    var end = el('<div class="endwrap"><div class="fleuron">❦</div><h2 class="endtitle">The End</h2><p class="muted" style="margin:0 0 28px">You reached the end of this path.</p></div>');
    end.appendChild(endButtons());
    root.appendChild(end); hintEl.textContent = ''; return;
  }

  var d = node.data || {};
  var card;
  if (node.type === 'chapter') {
    card = el('<div style="text-align:center"><div class="kicker chapter" style="justify-content:center">📖 Chapter</div>' +
      '<h2 class="bigline">' + (d.name ? esc(d.name) : '<span class="muted">(untitled chapter)</span>') + '</h2></div>');
    card.appendChild(nextButton('chapter', 'Begin →'));
  } else if (node.type === 'scene') {
    var scName = state.scene && sceneById[state.scene] ? sceneById[state.scene].name : '';
    card = el('<div><div class="kicker scene">🎬 ' + esc(d.background || scName || 'Scene') + '</div>' +
      '<p class="body scene">' + (d.description ? esc(d.description) : '<span class="muted">(no description)</span>') + '</p></div>');
    card.appendChild(nextButton('scene', 'Next →'));
  } else if (node.type === 'dialog') {
    var who = (d.character || '').trim();
    var ch = charById[d.characterId] || charByName[who.toLowerCase()];
    var avatar = (ch && ch.image) ? '<img class="avatar" src="' + esc(ch.image) + '" alt="" />' : '';
    card = el('<div><div class="kicker dialog">' + avatar + '<span>💬 ' + esc(who || 'Dialog') + '</span></div>' +
      '<p class="body">' + (d.text ? '&ldquo;' + esc(d.text) + '&rdquo;' : '<span class="muted">(no dialog text)</span>') + '</p></div>');
    card.appendChild(nextButton('dialog', 'Next →'));
  } else if (node.type === 'decision') {
    card = el('<div><div class="kicker decision">🔀 Decision</div>' +
      '<p class="body">' + (d.prompt ? esc(d.prompt) : '<span class="muted">(no prompt)</span>') + '</p><div class="choices"></div></div>');
    var list = card.querySelector('.choices');
    (d.choices || []).forEach(function (c, idx) {
      var st = choiceState(c, state.vars);
      if (!st.visible) return;
      var label = c.label ? esc(c.label) : '<span class="muted">(empty choice)</span>';
      if (!st.available) {
        var why = (c.lockedText && c.lockedText.trim()) || ('Requires ' + describeCondition(c.condition, index.variables, index.classes));
        list.appendChild(el('<div class="choice locked"><span class="num">🔒</span><span>' + label + '</span><span class="why">' + esc(why) + '</span></div>'));
        return;
      }
      var wired = isWired(node.id, arc.edges, choiceHandle(c.id));
      var b = el('<button class="choice"><span class="num">' + (idx + 1) + '</span><span>' + label + '</span>' +
        (wired ? '' : '<span class="unwired">(unconnected)</span>') + '</button>');
      b.onclick = function () { go(choose(index, state, c.id), { type: 'choose', choiceId: c.id }); };
      list.appendChild(b);
    });
    hintEl.textContent = 'Click a choice to continue';
  } else if (node.type === 'loop') {
    var doneArr = state.progress[node.id] || [];
    var items = d.items || [];
    var comp = items.filter(function (it) { return doneArr.indexOf(it.id) !== -1; }).length;
    card = el('<div><div class="kicker loop">🔁 Loop <span style="color:#5a6a8a">' + comp + ' / ' + items.length + ' done</span></div>' +
      '<p class="body">' + (d.title ? esc(d.title) : '<span class="muted">(complete every item to continue)</span>') + '</p><div class="choices"></div></div>');
    var listL = card.querySelector('.choices');
    items.forEach(function (it) {
      var isDone = doneArr.indexOf(it.id) !== -1;
      var wiredL = isWired(node.id, arc.edges, itemHandle(it.id));
      var bl = el('<button class="choice loopitem"' + ((isDone || !wiredL) ? ' disabled' : '') + '>' +
        '<span class="num">' + (isDone ? '✓' : '○') + '</span><span>' + (it.label ? esc(it.label) : '<span class="muted">(unnamed item)</span>') + '</span>' +
        (wiredL ? '' : '<span class="unwired">(unconnected)</span>') + '</button>');
      if (!isDone && wiredL) bl.onclick = function () { go(enterItem(index, state, it.id), { type: 'item', itemId: it.id }); };
      listL.appendChild(bl);
    });
    hintEl.textContent = 'Complete every item to continue';
  } else if (node.type === 'chance') {
    var o = null;
    (d.outcomes || []).forEach(function (x) { if (state.roll && x.id === state.roll.outcomeId) o = x; });
    card = el('<div style="text-align:center"><div class="kicker chance" style="justify-content:center">🎲 ' + esc(d.title || 'Chance') + '</div>' +
      '<h2 class="bigline">' + esc(o ? o.label : '(unnamed outcome)') + '</h2></div>');
    card.appendChild(nextButton('chance', 'Next →'));
  } else if (node.type === 'status') {
    var sg = statusView(index.variables, state.vars, d.groups);
    card = el('<div><div class="kicker status"><span aria-hidden="true">🎒</span> Status</div>' +
      '<h2 class="bigline" style="margin-bottom:12px">' + esc((d.title || '').trim() || 'Your status') + '</h2>' +
      ((d.text || '').trim() ? '<p class="epilogue" style="font-style:normal;margin:0">' + esc(d.text) + '</p>' : '') +
      '<div class="statusbox">' + statusHtml(sg, false, 'big') + '</div></div>');
    card.appendChild(nextButton('status', 'Next →'));
  } else if (node.type === 'classpick') {
    var sub = d.mode === 'subclass';
    var opts = classOptions(index, state, node);
    card = el('<div><div class="kicker classpick">' + (sub ? 'Choose your path' : 'Choose your class') + '</div>' +
      '<h2 class="bigline" style="margin-bottom:12px">' + esc((d.title || '').trim() || (sub ? 'Choose your path' : 'Who are you?')) + '</h2>' +
      ((d.prompt || '').trim() ? '<p class="epilogue" style="font-style:normal;margin:0">' + esc(d.prompt) + '</p>' : '') + '</div>');
    if (!opts.length) {
      card.appendChild(el('<p class="muted" style="font-style:italic;margin:24px 0 40px">Nothing to choose here.</p>'));
      card.appendChild(nextButton('classpick', 'Next →'));
    } else {
      var grid = el('<div class="classgrid"></div>');
      opts.forEach(function (c) {
        var gives = describeEffects(c.effects, index.variables, index.classes);
        var b = el('<button class="classopt"><div class="cn">' + (c.icon ? '<span class="ci" aria-hidden="true">' + esc(c.icon) + '</span>' : '') +
          '<span>' + esc(c.name || '(unnamed class)') + '</span></div>' +
          ((c.description || '').trim() ? '<p class="cd">' + esc(c.description) + '</p>' : '') +
          (gives ? '<p class="cg">' + esc(gives) + '</p>' : '') + '</button>');
        b.onclick = function () { go(pickClass(index, state, c.id), { type: 'class', classId: c.id }); };
        grid.appendChild(b);
      });
      card.appendChild(grid);
      hintEl.textContent = 'Choose one to continue';
    }
  } else if (node.type === 'end') {
    var title = (d.title || '').trim();
    var ctx = (d.description || '').trim();
    var who2 = (d.character || '').trim();
    var line = (d.text || '').trim();
    var ch2 = who2 ? (charById[d.characterId] || charByName[who2.toLowerCase()]) : null;
    var av2 = (ch2 && ch2.image) ? '<img class="avatar" src="' + esc(ch2.image) + '" alt="" />' : '';
    card = el('<div class="endwrap"><div class="kicker end">🏁 Ending</div>' +
      '<h2 class="bigline">' + esc(title || 'The End') + '</h2>' +
      (ctx ? '<p class="epilogue">' + esc(ctx) + '</p>' : '') +
      (line ? '<div class="endline">' + (who2 ? '<div class="kicker dialog" style="justify-content:center">' + av2 + '<span>' + esc(who2) + '</span></div>' : '') +
        '<p class="body" style="margin:0 0 32px">&ldquo;' + esc(line) + '&rdquo;</p></div>' : '') +
      (title ? '<p class="theend">The End</p>' : '') +
      '<div class="fleuron">❦</div></div>');
    markSeen(node.id);
    card.appendChild(endButtons());
    hintEl.textContent = 'You reached an ending';
  } else {
    card = el('<div class="muted">(unknown node)</div>');
  }
  if (onSaveCard()) hintEl.innerHTML = '<span class="savemark">&#10003; Save point</span> &middot; ' + esc(hintEl.textContent);
  root.appendChild(card);
}

document.addEventListener('keydown', function (e) {
  if (overlayEl) { if (e.key === 'Escape') closeOverlay(); return; }
  if (e.key === 'ArrowLeft' || e.key === 'Backspace') { if (history.length) { e.preventDefault(); goBack(); } }
  else if (e.key === 'ArrowRight' || e.key === ' ') {
    var node = currentNode(index, state);
    if (node && (node.type === 'chapter' || node.type === 'scene' || node.type === 'dialog' || node.type === 'chance' || node.type === 'status' || node.type === 'classpick')) { e.preventDefault(); goNext(); }
  }
});

render();
</script>
</body>
</html>`;
}
