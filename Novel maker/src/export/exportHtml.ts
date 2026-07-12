// Builds a single self-contained, playable HTML file from a story project.
// Bundles every Arc; the inlined player hops between arcs via portal nodes.
// No dependencies — plays in any browser offline (double-click to open).

import type { Edge, Node } from '@xyflow/react';
import type { NodeData } from '../types';
import type { Character } from '../library/libraryTypes';

interface ExportArc {
  id: string;
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
}

interface BuildArgs {
  arcs: ExportArc[];
  startArcId: string;
  characters: Character[];
  title?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function embedJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

export function buildStoryHtml({ arcs, startArcId, characters, title }: BuildArgs): string {
  const storyTitle = (title && title.trim()) || 'My Story';
  const characterList = characters.map((c) => ({ name: c.name, image: c.image ?? '' }));
  const storyData = {
    title: storyTitle,
    startArcId,
    arcs: arcs.map((a) => ({
      id: a.id,
      name: a.name,
      nodes: a.nodes.map((n) => ({ id: n.id, type: n.type, data: n.data })),
      edges: a.edges.map((e) => ({ source: e.source, sourceHandle: e.sourceHandle ?? null, target: e.target })),
    })),
    characters: characterList,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(storyTitle)}</title>
<style>
  :root {
    --ink-900:#0f1929; --ink-800:#16213e; --ink-700:#1a2845; --ink-600:#2a3a5e;
    --dialog:#4a7aff; --decision:#ffaa44; --scene:#a86aff; --accent:#e94560; --loop:#2dd4bf; --start:#44dd88;
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { background: var(--ink-900); color: #eee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; min-height: 100%; }
  .topbar, .bottombar { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; background: var(--ink-900); }
  .topbar { border-bottom: 1px solid var(--ink-600); }
  .bottombar { border-top: 1px solid var(--ink-600); font-size: 12px; color: #7a89a8; }
  .title { color: var(--accent); font-weight: 600; }
  .steps { color: #5a6a8a; font-size: 13px; margin-left: 12px; }
  .stage { flex: 1; display: flex; align-items: center; justify-content: center; padding: 32px 24px; overflow: auto; }
  .card { width: 100%; max-width: 680px; animation: fade .25s ease-out; }
  @keyframes fade { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform:none;} }
  .kicker { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .3em; margin-bottom: 12px; display:flex; align-items:center; gap:12px; }
  .kicker.dialog { color: var(--dialog); } .kicker.decision { color: var(--decision); }
  .kicker.scene { color: var(--scene); } .kicker.loop { color: var(--loop); } .kicker.chapter { color: var(--start); }
  .btn-next.chapter { background: var(--start); color: var(--ink-900); }
  .choice[disabled] { opacity:.45; cursor:default; }
  .choice[disabled]:hover { background: var(--ink-800); border-color: var(--ink-600); }
  .avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--ink-600); background: var(--ink-800); }
  .body { font-size: 26px; font-weight: 300; line-height: 1.5; margin: 0 0 40px; }
  .body.scene { font-style: italic; color: #cdd6ea; }
  .muted { color: #5a6a8a; }
  button { font: inherit; cursor: pointer; border: none; border-radius: 8px; transition: .15s; }
  .btn-next { color:#fff; padding: 10px 24px; font-size: 16px; }
  .btn-next.dialog { background: var(--dialog); } .btn-next.scene { background: var(--scene); }
  .btn-next:hover { filter: brightness(1.12); }
  .choices { display: flex; flex-direction: column; gap: 12px; }
  .choice { text-align: left; background: var(--ink-800); border: 2px solid var(--ink-600); color: #fff; padding: 16px 20px; border-radius: 8px; font-size: 18px; }
  .choice:hover { background: var(--ink-700); border-color: var(--decision); }
  .choice .num { color: var(--decision); font-weight: 600; margin-right: 12px; }
  .choice .unwired { margin-left: 12px; font-size: 12px; color: #6a7a9a; }
  .navbtn { background: transparent; color: #7a89a8; padding: 6px 12px; border-radius: 6px; }
  .navbtn:hover:not(:disabled) { background: var(--ink-700); color:#fff; }
  .navbtn:disabled { opacity: .3; cursor: not-allowed; }
  .restart, .endbtn { background: var(--accent); color:#fff; padding: 10px 24px; }
  .endwrap { text-align:center; }
  .endtitle { font-size: 34px; font-weight: 300; letter-spacing: .12em; color:#cdd6ea; margin-bottom: 12px; }
</style>
</head>
<body>
  <div class="topbar">
    <div><span class="title">${escapeHtml(storyTitle)}</span><span class="steps" id="steps"></span></div>
    <button class="navbtn restart" id="restart" style="color:#fff">Restart</button>
  </div>
  <div class="stage"><div id="root" class="card"></div></div>
  <div class="bottombar">
    <button class="navbtn" id="back">&larr; Back</button>
    <span id="hint"></span>
    <span style="opacity:0;padding:6px 12px">.</span>
  </div>

<script>
window.STORY = ${embedJson(storyData)};
</script>
<script>
(function () {
  var S = window.STORY;
  var arcMap = {};
  (S.arcs || []).forEach(function (a) {
    var nm = {}; (a.nodes || []).forEach(function (n) { nm[n.id] = n; });
    arcMap[a.id] = { id: a.id, name: a.name, nodes: a.nodes || [], edges: a.edges || [], map: nm };
  });
  var charByName = {};
  (S.characters || []).forEach(function (c) { if (c && c.name) charByName[c.name.trim().toLowerCase()] = c; });

  function findStart(arc) {
    var t = {}; arc.edges.forEach(function (e) { t[e.target] = true; });
    for (var i = 0; i < arc.nodes.length; i++) if (!t[arc.nodes[i].id]) return arc.nodes[i];
    return arc.nodes[0] || null;
  }
  function nextId(arc, id, handle) {
    for (var i = 0; i < arc.edges.length; i++) {
      var e = arc.edges[i];
      if (e.source === id && (handle ? e.sourceHandle === handle : true)) return e.target;
    }
    return null;
  }
  function loopItemsOf(node) { return (node.data && node.data.items) || []; }
  function loopDone(node, doneArr) { return loopItemsOf(node).every(function (it) { return doneArr.indexOf(it.id) !== -1; }); }
  function cloneProgress(p) { var o = {}; for (var k in p) { o[k] = p[k].slice(); } return o; }

  function resolveLoops(arc, startId, callStack, progress) {
    var cs = callStack.map(function (f) { return { hubId: f.hubId, itemId: f.itemId }; });
    var prog = cloneProgress(progress);
    var id = startId, guard = 0;
    while (id != null && guard++ < 10000) {
      var node = arc.map[id];
      if (!node || node.type !== 'loop') break;
      var top = cs[cs.length - 1];
      if (top && top.hubId === id) {
        if (!prog[id]) prog[id] = [];
        if (prog[id].indexOf(top.itemId) === -1) prog[id].push(top.itemId);
        cs.pop();
      }
      if (!prog[id]) prog[id] = [];
      if (loopDone(node, prog[id])) {
        var nx = nextId(arc, id, 'done');
        if (nx == null) { id = null; break; }
        id = nx;
      } else { break; }
    }
    return { currentId: id, callStack: cs, progress: prog };
  }

  function land(arcId, rawId, callStack, progress) {
    var aId = arcId, arc = arcMap[aId];
    if (!arc) return { arcId: arcId, currentId: null, callStack: callStack, progress: progress };
    var r = resolveLoops(arc, rawId, callStack, progress);
    var guard = 0;
    while (r.currentId && guard++ < 100) {
      var node = arc.map[r.currentId];
      if (!node || node.type !== 'portal') break;
      var target = node.data && node.data.targetArcId;
      var tArc = target && arcMap[target];
      if (!tArc) { r.currentId = null; break; }
      aId = target; arc = tArc;
      var st = findStart(tArc);
      r = resolveLoops(tArc, st ? st.id : null, r.callStack, r.progress);
    }
    return { arcId: aId, currentId: r.currentId, callStack: r.callStack, progress: r.progress };
  }
  function snapshot(s) {
    return { arcId: s.arcId, currentId: s.currentId, callStack: s.callStack.map(function (f) { return { hubId: f.hubId, itemId: f.itemId }; }), progress: cloneProgress(s.progress) };
  }

  var startArc = arcMap[S.startArcId] ? S.startArcId : (S.arcs[0] && S.arcs[0].id);
  var firstStart = arcMap[startArc] ? findStart(arcMap[startArc]) : null;
  var state = land(startArc, firstStart ? firstStart.id : null, [], {});
  var history = [];

  var root = document.getElementById('root');
  var stepsEl = document.getElementById('steps');
  var hintEl = document.getElementById('hint');
  var backBtn = document.getElementById('back');
  document.getElementById('restart').onclick = restart;
  backBtn.onclick = goBack;

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

  function goNext(handle) {
    if (!state.currentId) return;
    var arc = arcMap[state.arcId];
    var t = nextId(arc, state.currentId, handle);
    history.push(snapshot(state));
    state = t ? land(state.arcId, t, state.callStack, state.progress)
              : { arcId: state.arcId, currentId: null, callStack: state.callStack, progress: state.progress };
    render();
  }
  function enterItem(loopId, itemId) {
    var arc = arcMap[state.arcId];
    var t = nextId(arc, loopId, 'item-' + itemId);
    if (!t) return;
    history.push(snapshot(state));
    var cs = state.callStack.concat([{ hubId: loopId, itemId: itemId }]);
    state = land(state.arcId, t, cs, state.progress);
    render();
  }
  function goBack() { if (!history.length) return; state = history.pop(); render(); }
  function restart() {
    var st = arcMap[startArc] ? findStart(arcMap[startArc]) : null;
    state = land(startArc, st ? st.id : null, [], {});
    history = []; render();
  }

  function render() {
    root.innerHTML = '';
    var arc = arcMap[state.arcId];
    var ended = state.currentId === null && history.length > 0;
    var node = arc && state.currentId ? arc.map[state.currentId] : null;
    stepsEl.textContent = (arc ? arc.name + ' · ' : '') + (ended ? (history.length + ' steps') : ('step ' + (history.length + 1)));
    backBtn.disabled = history.length === 0;

    if (!arc) { root.appendChild(el('<div class="endwrap"><h2 class="endtitle">No story</h2></div>')); hintEl.textContent = ''; return; }
    if (ended || !node) {
      var end = el('<div class="endwrap"><h2 class="endtitle">&mdash; THE END &mdash;</h2><p class="muted">You reached the end of the story.</p><button class="endbtn">Play again</button></div>');
      end.querySelector('button').onclick = restart;
      root.appendChild(end); hintEl.textContent = ''; return;
    }

    var d = node.data || {};
    if (node.type === 'chapter') {
      var cNext = !!nextId(arc, node.id);
      var cardC = el('<div style="text-align:center"><div class="kicker chapter" style="justify-content:center">📖 Chapter</div>' +
        '<h2 style="font-size:34px;font-weight:300;color:#fff;margin:0 0 32px">' + (d.name ? esc(d.name) : '<span class="muted">(untitled chapter)</span>') + '</h2>' +
        '<button class="btn-next chapter">' + (cNext ? 'Begin →' : 'The End') + '</button></div>');
      cardC.querySelector('button').onclick = function () { goNext(); };
      root.appendChild(cardC); hintEl.textContent = 'Press Space or → to continue';
    } else if (node.type === 'scene') {
      var sNext = !!nextId(arc, node.id);
      var card = el('<div><div class="kicker scene">🎬 ' + esc(d.background || 'Scene') + '</div>' +
        '<p class="body scene">' + (d.description ? esc(d.description) : '<span class="muted">(no description)</span>') + '</p>' +
        '<button class="btn-next scene">' + (sNext ? 'Next →' : 'The End') + '</button></div>');
      card.querySelector('button').onclick = function () { goNext(); };
      root.appendChild(card); hintEl.textContent = 'Press Space or → to continue';
    } else if (node.type === 'dialog') {
      var dNext = !!nextId(arc, node.id);
      var who = (d.character || '').trim();
      var ch = charByName[who.toLowerCase()];
      var avatar = (ch && ch.image) ? '<img class="avatar" src="' + esc(ch.image) + '" alt="" />' : '';
      var card2 = el('<div><div class="kicker dialog">' + avatar + '<span>💬 ' + esc(who || 'Dialog') + '</span></div>' +
        '<p class="body">' + (d.text ? '&ldquo;' + esc(d.text) + '&rdquo;' : '<span class="muted">(no dialog text)</span>') + '</p>' +
        '<button class="btn-next dialog">' + (dNext ? 'Next →' : 'The End') + '</button></div>');
      card2.querySelector('button').onclick = function () { goNext(); };
      root.appendChild(card2); hintEl.textContent = 'Press Space or → to continue';
    } else if (node.type === 'decision') {
      var outgoing = {}; arc.edges.forEach(function (e) { if (e.source === node.id && e.sourceHandle) outgoing[e.sourceHandle] = true; });
      var html = '<div><div class="kicker decision">🔀 Decision</div>' +
        '<p class="body">' + (d.prompt ? esc(d.prompt) : '<span class="muted">(no prompt)</span>') + '</p><div class="choices">';
      (d.choices || []).forEach(function (c, idx) {
        var wired = !!outgoing['choice-' + idx];
        html += '<button class="choice" data-idx="' + idx + '"><span class="num">' + (idx + 1) + '.</span>' +
          '<span>' + (c ? esc(c) : '<span class="muted">(empty choice)</span>') + '</span>' + (wired ? '' : '<span class="unwired">(unconnected)</span>') + '</button>';
      });
      html += '</div></div>';
      var card3 = el(html);
      card3.querySelectorAll('.choice').forEach(function (b) { b.onclick = function () { goNext('choice-' + b.getAttribute('data-idx')); }; });
      root.appendChild(card3); hintEl.textContent = 'Click a choice to continue';
    } else if (node.type === 'loop') {
      var doneArr = state.progress[node.id] || [];
      var items = d.items || [];
      var comp = items.filter(function (it) { return doneArr.indexOf(it.id) !== -1; }).length;
      var outL = {}; arc.edges.forEach(function (e) { if (e.source === node.id && e.sourceHandle) outL[e.sourceHandle] = true; });
      var htmlL = '<div><div class="kicker loop">🔁 Loop <span style="color:#5a6a8a">' + comp + ' / ' + items.length + ' done</span></div>' +
        '<p class="body">' + (d.title ? esc(d.title) : '<span class="muted">(complete every item to continue)</span>') + '</p><div class="choices">';
      items.forEach(function (it) {
        var isDone = doneArr.indexOf(it.id) !== -1;
        var wired = !!outL['item-' + it.id];
        htmlL += '<button class="choice loopitem" data-item="' + esc(it.id) + '"' + ((isDone || !wired) ? ' disabled' : '') + '>' +
          '<span class="num">' + (isDone ? '✓' : '○') + '</span><span>' + (it.label ? esc(it.label) : '<span class="muted">(unnamed item)</span>') + '</span>' +
          (wired ? '' : '<span class="unwired">(unconnected)</span>') + '</button>';
      });
      htmlL += '</div></div>';
      var cardL = el(htmlL);
      cardL.querySelectorAll('.loopitem').forEach(function (b) { if (b.disabled) return; b.onclick = function () { enterItem(node.id, b.getAttribute('data-item')); }; });
      root.appendChild(cardL); hintEl.textContent = 'Complete every item to continue';
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'Backspace') { if (history.length) { e.preventDefault(); goBack(); } }
    else if (e.key === 'ArrowRight' || e.key === ' ') {
      var arc = arcMap[state.arcId];
      var node = arc && state.currentId ? arc.map[state.currentId] : null;
      if (node && node.type !== 'decision' && node.type !== 'loop') { e.preventDefault(); goNext(); }
    }
  });

  render();
})();
</script>
</body>
</html>`;
}
