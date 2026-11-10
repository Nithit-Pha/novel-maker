// Novel Flow runtime core.
//
// Plain, dependency-free JavaScript shared by BOTH story players:
//   - Run mode in the editor (imported as a normal module), and
//   - the exported standalone HTML file (inlined verbatim via `?raw`).
// Keeping one copy means the two players can never disagree about how a
// story plays. Rules for this file:
//   - no imports, no browser/Node-specific APIs, no closing script tags in strings
//   - every function is pure: inputs are never mutated, new state is returned
// Types live in core.d.ts.

// ---------------------------------------------------------------------------
// Handles
// ---------------------------------------------------------------------------

export function normHandle(h) {
  return h || 'out';
}
export function choiceHandle(id) {
  return 'choice-' + id;
}
export function itemHandle(id) {
  return 'item-' + id;
}
export function branchHandle(id) {
  return 'branch-' + id;
}
export function outcomeHandle(id) {
  return 'outcome-' + id;
}

// ---------------------------------------------------------------------------
// Graph helpers
// ---------------------------------------------------------------------------

function leftmost(list) {
  return list.reduce(function (a, b) {
    var ax = (a.position && a.position.x) || 0;
    var bx = (b.position && b.position.x) || 0;
    return bx < ax ? b : a;
  });
}

/**
 * Entry point of an arc, chosen deterministically:
 * leftmost unconnected Chapter > leftmost unconnected node > leftmost Chapter > first node.
 */
export function findStart(nodes, edges) {
  if (!nodes || nodes.length === 0) return null;
  var targets = {};
  (edges || []).forEach(function (e) {
    targets[e.target] = true;
  });
  var orphans = nodes.filter(function (n) {
    return !targets[n.id];
  });
  var orphanChapters = orphans.filter(function (n) {
    return n.type === 'chapter';
  });
  if (orphanChapters.length) return leftmost(orphanChapters);
  if (orphans.length) return leftmost(orphans);
  var chapters = nodes.filter(function (n) {
    return n.type === 'chapter';
  });
  if (chapters.length) return leftmost(chapters);
  return nodes[0];
}

/** Target of the wire leaving `currentId` (via `handleId` if given). */
export function nextNodeId(currentId, edges, handleId) {
  for (var i = 0; i < edges.length; i++) {
    var e = edges[i];
    if (e.source !== currentId) continue;
    if (handleId && normHandle(e.sourceHandle) !== handleId) continue;
    return e.target;
  }
  return null;
}

export function isWired(nodeId, edges, handleId) {
  return nextNodeId(nodeId, edges, handleId) != null;
}

// ---------------------------------------------------------------------------
// Variables, effects, conditions
// ---------------------------------------------------------------------------

function has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function defaultValue(type) {
  if (type === 'bool') return false;
  if (type === 'number') return 0;
  return '';
}

/** Coerce a raw value (e.g. from a text input) to a variable type. */
export function coerce(type, value) {
  if (type === 'bool') return value === true || value === 'true';
  if (type === 'number') {
    var n = Number(value);
    return isFinite(n) ? n : 0;
  }
  return value == null ? '' : String(value);
}

function typeOfValue(v) {
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') return 'number';
  return 'text';
}

/** Starting values for every declared variable, keyed by variable id. */
export function initialVars(defs) {
  var vars = {};
  (defs || []).forEach(function (d) {
    vars[d.id] = coerce(d.type, d.initial);
  });
  return vars;
}

/**
 * Apply effects in order. Effects on unknown (deleted) variables are ignored.
 * `classes` (optional): the story's classes, so "become class" effects work.
 * Without it (e.g. inside a class's own effects) "become" is ignored.
 */
export function applyEffects(effects, vars, classes) {
  if (!effects || effects.length === 0) return vars;
  var out = Object.assign({}, vars);
  effects.forEach(function (fx) {
    if (fx && fx.op === 'become') {
      if (classes) out = becomeClass(classes, out, fx.value);
      return;
    }
    if (!fx || !has(out, fx.varId)) return;
    var cur = out[fx.varId];
    var t = typeOfValue(cur);
    if (fx.op === 'toggle') out[fx.varId] = !cur;
    else if (fx.op === 'add') out[fx.varId] = Number(cur) + coerce('number', fx.value);
    else if (fx.op === 'sub') out[fx.varId] = Number(cur) - coerce('number', fx.value);
    else out[fx.varId] = coerce(t, fx.value);
  });
  return out;
}

function testClause(cl, vars) {
  if (cl && cl.kind === 'class') {
    var hit = !!cl.classId && (vars[CLASS_KEY] === cl.classId || vars[SUBCLASS_KEY] === cl.classId);
    return cl.cmp === '!=' ? !hit : hit;
  }
  if (!cl || !has(vars, cl.varId)) return false;
  var cur = vars[cl.varId];
  var v = coerce(typeOfValue(cur), cl.value);
  switch (cl.cmp) {
    case '!=':
      return cur !== v;
    case '>':
      return cur > v;
    case '>=':
      return cur >= v;
    case '<':
      return cur < v;
    case '<=':
      return cur <= v;
    default:
      return cur === v;
  }
}

/** True when the condition holds. A missing or empty condition always holds. */
export function evaluate(cond, vars) {
  if (!cond || !cond.clauses || cond.clauses.length === 0) return true;
  if (cond.mode === 'any') {
    return cond.clauses.some(function (cl) {
      return testClause(cl, vars);
    });
  }
  return cond.clauses.every(function (cl) {
    return testClause(cl, vars);
  });
}

// ---------------------------------------------------------------------------
// Human-readable summaries (badges, locked-choice text, debug drawer)
// ---------------------------------------------------------------------------

var CMP_TEXT = { '==': '=', '!=': '≠', '>': '>', '>=': '≥', '<': '<', '<=': '≤' };

function varName(defs, id) {
  for (var i = 0; i < (defs || []).length; i++) if (defs[i].id === id) return defs[i].name || '(unnamed)';
  return '(deleted variable)';
}

function showValue(v) {
  if (typeof v === 'string') return '"' + v + '"';
  return String(v);
}

export function describeCondition(cond, defs, classes) {
  if (!cond || !cond.clauses || cond.clauses.length === 0) return 'always';
  var parts = cond.clauses.map(function (cl) {
    if (cl.kind === 'class') return (cl.cmp === '!=' ? 'not ' : '') + className(classes, cl.classId);
    return varName(defs, cl.varId) + ' ' + (CMP_TEXT[cl.cmp] || '=') + ' ' + showValue(cl.value);
  });
  return parts.join(cond.mode === 'any' ? ' or ' : ' and ');
}

export function describeEffects(effects, defs, classes) {
  if (!effects || effects.length === 0) return '';
  return effects
    .map(function (fx) {
      if (fx.op === 'become') return 'become ' + className(classes, fx.value);
      var name = varName(defs, fx.varId);
      if (fx.op === 'toggle') return 'toggle ' + name;
      if (fx.op === 'add') return name + ' +' + coerce('number', fx.value);
      if (fx.op === 'sub') return name + ' −' + coerce('number', fx.value);
      return name + ' = ' + showValue(fx.value);
    })
    .join(', ');
}

/** How a decision choice appears right now. */
export function choiceState(choice, vars) {
  var available = evaluate(choice.condition, vars);
  return { available: available, visible: available || choice.whenLocked !== 'hide' };
}

// ---------------------------------------------------------------------------
// Chance
// ---------------------------------------------------------------------------

/** Weighted pick. Non-positive weights count as 0; if all are 0, pick uniformly. */
export function pickOutcome(outcomes, rng) {
  if (!outcomes || outcomes.length === 0) return null;
  var r = (rng || Math.random)();
  var weights = outcomes.map(function (o) {
    var w = Number(o.weight);
    return isFinite(w) && w > 0 ? w : 0;
  });
  var total = weights.reduce(function (a, b) {
    return a + b;
  }, 0);
  if (total <= 0) return outcomes[Math.min(outcomes.length - 1, Math.floor(r * outcomes.length))];
  var acc = 0;
  for (var i = 0; i < outcomes.length; i++) {
    acc += weights[i];
    if (r * total < acc) return outcomes[i];
  }
  return outcomes[outcomes.length - 1];
}

/** Probability (0–1) of each outcome, in order. */
export function outcomeOdds(outcomes) {
  var weights = (outcomes || []).map(function (o) {
    var w = Number(o.weight);
    return isFinite(w) && w > 0 ? w : 0;
  });
  var total = weights.reduce(function (a, b) {
    return a + b;
  }, 0);
  return weights.map(function (w) {
    return total > 0 ? w / total : weights.length ? 1 / weights.length : 0;
  });
}

// ---------------------------------------------------------------------------
// Scenes (background images)
// ---------------------------------------------------------------------------

/** sceneId value that clears the background. An empty / missing sceneId keeps it. */
export var NO_SCENE = 'none';

/** The background after arriving at `node`, given the one showing before. */
export function sceneAfter(node, current) {
  var id = node && node.data && node.data.sceneId;
  if (!id) return current == null ? null : current;
  return id === NO_SCENE ? null : id;
}

// ---------------------------------------------------------------------------
// Classes and sub-classes
// ---------------------------------------------------------------------------

/** Reserved variable keys holding the reader's class / sub-class id ('' or missing = none). */
export var CLASS_KEY = '@class';
export var SUBCLASS_KEY = '@subclass';

function findClass(classes, id) {
  if (!id) return null;
  for (var i = 0; i < (classes || []).length; i++) if (classes[i] && classes[i].id === id) return classes[i];
  return null;
}

/** "🔥 Mage" (or "(deleted class)"). */
export function className(classes, id) {
  var c = findClass(classes, id);
  if (!c) return '(deleted class)';
  return (c.icon ? c.icon + ' ' : '') + (String(c.name || '').trim() || '(unnamed class)');
}

/**
 * The reader becomes class `classId`; returns new variables.
 * - a class: @class = it, @subclass cleared, its effects run;
 * - a sub-class while already in its parent: only the sub-class effects run
 *   (a promotion never resets stats);
 * - a sub-class otherwise: the parent's effects run first, then the sub-class's.
 * Values from an old class are not undone. "become" inside class effects is ignored.
 */
export function becomeClass(classes, vars, classId) {
  var c = findClass(classes, classId);
  if (!c) return vars;
  var out = Object.assign({}, vars);
  var parent = c.parentId ? findClass(classes, c.parentId) : null;
  if (parent) {
    if (out[CLASS_KEY] !== parent.id) {
      out[CLASS_KEY] = parent.id;
      out[SUBCLASS_KEY] = '';
      out = applyEffects(parent.effects, out);
    }
    out[SUBCLASS_KEY] = c.id;
  } else {
    out[CLASS_KEY] = c.id;
    out[SUBCLASS_KEY] = '';
  }
  return applyEffects(c.effects, out);
}

/** The reader's class and sub-class right now: [class] or [class, sub-class] or []. */
export function currentClasses(classes, vars) {
  var out = [];
  var c = findClass(classes, vars && vars[CLASS_KEY]);
  if (c) out.push(c);
  var sub = findClass(classes, vars && vars[SUBCLASS_KEY]);
  if (c && sub && sub.parentId === c.id) out.push(sub);
  return out;
}

/** Classes a Choose class card offers right now (see ClassPickData). */
export function classOptions(index, state, node) {
  var d = (node && node.data) || {};
  var classes = index.classes || [];
  var list;
  if (d.mode === 'subclass') {
    var cur = state.vars && state.vars[CLASS_KEY];
    list = classes.filter(function (c) {
      return !!cur && c.parentId === cur;
    });
  } else {
    list = classes.filter(function (c) {
      return !c.parentId || !findClass(classes, c.parentId);
    });
  }
  var picked = d.options || [];
  if (picked.length) {
    list = list.filter(function (c) {
      return picked.indexOf(c.id) !== -1;
    });
  }
  return list;
}

// ---------------------------------------------------------------------------
// Status panel (items / abilities / power) and the HUD
// ---------------------------------------------------------------------------

function groupKey(g) {
  return String(g == null ? '' : g).trim().toLowerCase();
}

/** HUD groups showing after arriving at `node` (null = HUD off). Missing setting = keep. */
export function hudAfter(node, current) {
  var h = node && node.data && node.data.hud;
  if (h && h.mode === 'hide') return null;
  if (h && h.mode === 'show') return (h.groups || []).slice();
  return current == null ? null : current;
}

/** Group names in use (variables shown to readers), in variable order. */
export function statusGroupNames(defs) {
  var seen = {};
  var out = [];
  (defs || []).forEach(function (d) {
    if (!d || !d.show) return;
    var name = String(d.show.group || '').trim() || 'Items';
    var k = groupKey(name);
    if (seen[k]) return;
    seen[k] = true;
    out.push(name);
  });
  return out;
}

/**
 * What the reader sees: [{ name, rows: [{ id, label, icon, type, value, max }] }].
 * `groups` = names to show in that order ([] / missing = every group, in variable
 * order). Hidden: yes/no at "no", numbers at 0 (unless shown as a bar), empty text.
 * A group with nothing to show comes back with no rows.
 */
export function statusView(defs, vars, groups) {
  var wanted = (groups || []).map(groupKey).filter(Boolean);
  var order = [];
  var byKey = {};
  vars = vars || {};
  (defs || []).forEach(function (d) {
    if (!d || !d.show) return;
    var name = String(d.show.group || '').trim() || 'Items';
    var key = groupKey(name);
    if (wanted.length && wanted.indexOf(key) === -1) return;
    if (!byKey[key]) {
      byKey[key] = { name: name, rows: [] };
      order.push(key);
    }
    var v = has(vars, d.id) ? vars[d.id] : coerce(d.type, d.initial);
    var label = d.show.label && String(d.show.label).trim() ? String(d.show.label).trim() : String(d.name || '').replace(/_/g, ' ').trim();
    var row = { id: d.id, label: label || '(unnamed)', icon: d.show.icon ? String(d.show.icon).trim() : '', type: d.type, value: v, max: null };
    if (d.type === 'bool') {
      if (v !== true) return;
    } else if (d.type === 'number') {
      var max = Number(d.show.max);
      if (d.show.max != null && isFinite(max) && max > 0) row.max = max;
      else if (Number(v) === 0) return;
    } else if (v == null || String(v) === '') return;
    byKey[key].rows.push(row);
  });
  if (wanted.length) {
    order.sort(function (a, b) {
      return wanted.indexOf(a) - wanted.indexOf(b);
    });
  }
  return order.map(function (k) {
    return byKey[k];
  });
}

// ---------------------------------------------------------------------------
// Save points
// ---------------------------------------------------------------------------

var SAVE_KINDS = { chapter: 1, scene: 1, dialog: 1, decision: 1, loop: 1, status: 1, classpick: 1 };

/** Whether a card can be a save point (cards the reader stops on; a Chance only when it reveals). */
export function canSavePoint(node) {
  if (!node) return false;
  if (SAVE_KINDS[node.type]) return true;
  return node.type === 'chance' && !!node.data && node.data.show === 'reveal';
}

/** Whether a card is an active save point. */
export function isSavePoint(node) {
  return canSavePoint(node) && !!node.data.savePoint;
}

function snapshot(state, over) {
  return Object.assign({}, state, over);
}

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------

/** Index a story ({ arcs, variables }) for fast lookups. */
export function buildIndex(story) {
  var arcs = {};
  var order = [];
  (story.arcs || []).forEach(function (a) {
    var map = {};
    (a.nodes || []).forEach(function (n) {
      map[n.id] = n;
    });
    arcs[a.id] = { id: a.id, name: a.name, nodes: a.nodes || [], edges: a.edges || [], map: map };
    order.push(a.id);
  });
  return { arcs: arcs, order: order, variables: story.variables || [], classes: story.classes || [] };
}

function cloneProgress(p) {
  var o = {};
  for (var k in p) if (has(p, k)) o[k] = p[k].slice();
  return o;
}

function loopComplete(node, doneIds) {
  var items = (node.data && node.data.items) || [];
  return items.every(function (it) {
    return doneIds.indexOf(it.id) !== -1;
  });
}

/**
 * Move the player to `rawId` in `arcId` and keep going through every node
 * that doesn't need the reader: completed loops, portals, Condition nodes and
 * silent Chance nodes. Applies each node's on-enter effects on arrival.
 * Stops at the first node the reader must see (or null = THE END).
 * `pick(node, outcomes)` (optional) chooses Chance outcomes instead of `rng`;
 * the route explorer uses it to try every outcome.
 */
export function land(index, arcId, rawId, base, rng, pick) {
  var arc = index.arcs[arcId];
  var cs = (base.callStack || []).map(function (f) {
    return { hubId: f.hubId, itemId: f.itemId };
  });
  var prog = cloneProgress(base.progress || {});
  var vars = Object.assign({}, base.vars || {});
  var scene = base.scene == null ? null : base.scene;
  var hud = base.hud == null ? null : base.hud;
  var save = base.save || null;
  var arcStart = base.arcStart || null;
  var entered = !!base.enter; // just arrived in an arc → the next stop is its start
  var id = rawId;
  var guard = 0;

  // Snapshots are taken on arrival, after on-enter effects, so going back never
  // applies them twice. A save snapshot keeps the arc start in effect then (its own
  // `save` is null = itself); an arc-start snapshot keeps the save in effect then.
  function out(cur, roll) {
    var s = {
      arcId: arc ? arc.id : arcId,
      currentId: cur,
      callStack: cs,
      progress: prog,
      vars: vars,
      roll: roll || null,
      scene: scene,
      hud: hud,
      save: save,
      arcStart: arcStart,
    };
    if (cur == null || !arc) return s;
    if (entered) s.arcStart = snapshot(s, { arcStart: null });
    if (isSavePoint(arc.map[cur])) s.save = snapshot(s, { save: null });
    return s;
  }

  if (!arc) return out(null);

  while (id != null) {
    if (guard++ > 10000) return out(null); // routing cycle with nothing to show
    var node = arc.map[id];
    if (!node) return out(null);
    var d = node.data || {};

    if (d.onEnter && d.onEnter.length) vars = applyEffects(d.onEnter, vars, index.classes);
    scene = sceneAfter(node, scene);
    hud = hudAfter(node, hud);

    if (node.type === 'loop') {
      var top = cs[cs.length - 1];
      if (top && top.hubId === id) {
        if (!prog[id]) prog[id] = [];
        if (prog[id].indexOf(top.itemId) === -1) prog[id].push(top.itemId);
        cs.pop();
      }
      if (!prog[id]) prog[id] = [];
      if (!loopComplete(node, prog[id])) return out(id);
      id = nextNodeId(id, arc.edges, 'done');
      continue;
    }

    if (node.type === 'portal') {
      var target = d.targetArcId ? index.arcs[d.targetArcId] : null;
      if (!target) return out(null);
      arc = target;
      entered = true;
      var st = findStart(target.nodes, target.edges);
      id = st ? st.id : null;
      continue;
    }

    if (node.type === 'condition') {
      var branches = d.branches || [];
      var hit = null;
      for (var i = 0; i < branches.length; i++) {
        if (evaluate(branches[i].condition, vars)) {
          hit = branches[i];
          break;
        }
      }
      id = nextNodeId(id, arc.edges, hit ? branchHandle(hit.id) : 'else');
      continue;
    }

    if (node.type === 'chance') {
      var o = pick ? pick(node, d.outcomes || []) : pickOutcome(d.outcomes || [], rng);
      if (!o) return out(null);
      if (d.show === 'reveal') return out(id, { nodeId: id, outcomeId: o.id });
      id = nextNodeId(id, arc.edges, outcomeHandle(o.id));
      continue;
    }

    return out(id); // chapter / scene / dialog / decision / end
  }
  return out(null);
}

/** Fresh playthrough from the start of `startArcId` (or the first arc). */
export function startPlay(index, startArcId, rng, pick) {
  var arcId = index.arcs[startArcId] ? startArcId : index.order[0];
  var base = { callStack: [], progress: {}, vars: initialVars(index.variables), scene: null, hud: null, enter: true };
  var arc = index.arcs[arcId];
  if (!arc) {
    return {
      arcId: startArcId,
      currentId: null,
      callStack: [],
      progress: {},
      vars: base.vars,
      roll: null,
      scene: null,
      hud: null,
      save: null,
      arcStart: null,
    };
  }
  var st = findStart(arc.nodes, arc.edges);
  return land(index, arcId, st ? st.id : null, base, rng, pick);
}

/**
 * Start playing at a specific card ("Play from here") with given variable values
 * and, optionally, the background and HUD that would be showing when the reader got there.
 */
export function startAt(index, arcId, nodeId, vars, rng, pick, scene, hud) {
  var base = {
    callStack: [],
    progress: {},
    vars: Object.assign(initialVars(index.variables), vars || {}),
    scene: scene == null ? null : scene,
    hud: hud == null ? null : hud.slice(),
    enter: true,
  };
  return land(index, arcId, nodeId, base, rng, pick);
}

export function currentNode(index, state) {
  var arc = index.arcs[state.arcId];
  return arc && state.currentId ? arc.map[state.currentId] || null : null;
}

function ended(state, vars) {
  return {
    arcId: state.arcId,
    currentId: null,
    callStack: state.callStack,
    progress: state.progress,
    vars: vars || state.vars,
    roll: null,
    scene: state.scene == null ? null : state.scene,
    hud: state.hud == null ? null : state.hud,
    save: state.save || null,
    arcStart: state.arcStart || null,
  };
}

/** The handle "Next" follows from the current node (chance reveal → its outcome). */
function nextHandle(node, state) {
  if (node.type === 'chance' && state.roll) return outcomeHandle(state.roll.outcomeId);
  return undefined;
}

/** Whether "Next" leads anywhere from a linear card. */
export function hasNext(index, state) {
  var node = currentNode(index, state);
  if (!node) return false;
  return isWired(node.id, index.arcs[state.arcId].edges, nextHandle(node, state));
}

/** Continue from a linear card (chapter / scene / dialog / revealed chance). */
export function next(index, state, rng, pick) {
  var node = currentNode(index, state);
  if (!node || node.type === 'decision' || node.type === 'loop' || node.type === 'end') return state;
  if (node.type === 'classpick' && classOptions(index, state, node).length) return state; // waits for a pick
  var t = nextNodeId(node.id, index.arcs[state.arcId].edges, nextHandle(node, state));
  return t ? land(index, state.arcId, t, state, rng, pick) : ended(state);
}

/** Pick a decision choice: applies its effects, then follows its wire. */
export function choose(index, state, choiceId, rng, pick) {
  var node = currentNode(index, state);
  if (!node || node.type !== 'decision') return state;
  var choices = (node.data && node.data.choices) || [];
  var choice = null;
  for (var i = 0; i < choices.length; i++) if (choices[i].id === choiceId) choice = choices[i];
  if (!choice || !evaluate(choice.condition, state.vars)) return state;
  var vars = applyEffects(choice.effects, state.vars, index.classes);
  var t = nextNodeId(node.id, index.arcs[state.arcId].edges, choiceHandle(choiceId));
  var base = {
    arcId: state.arcId,
    currentId: state.currentId,
    callStack: state.callStack,
    progress: state.progress,
    vars: vars,
    roll: null,
    scene: state.scene,
    hud: state.hud == null ? null : state.hud,
    save: state.save || null,
    arcStart: state.arcStart || null,
  };
  return t ? land(index, state.arcId, t, base, rng, pick) : ended(state, vars);
}

/** Enter one item of the current loop. */
export function enterItem(index, state, itemId, rng, pick) {
  var node = currentNode(index, state);
  if (!node || node.type !== 'loop') return state;
  var t = nextNodeId(node.id, index.arcs[state.arcId].edges, itemHandle(itemId));
  if (!t) return state;
  var cs = state.callStack.concat([{ hubId: node.id, itemId: itemId }]);
  var base = {
    arcId: state.arcId,
    currentId: state.currentId,
    callStack: cs,
    progress: state.progress,
    vars: state.vars,
    roll: null,
    scene: state.scene,
    hud: state.hud == null ? null : state.hud,
    save: state.save || null,
    arcStart: state.arcStart || null,
  };
  return land(index, state.arcId, t, base, rng, pick);
}

/** Back to the last save point reached, exactly as it was then. No save → unchanged. */
export function loadSave(state) {
  var cp = state && state.save;
  if (!cp) return state;
  return snapshot(cp, { save: cp });
}

/** Back to the first card of the current arc, exactly as it was then. No arc start → unchanged. */
export function restartArc(index, state) {
  var cp = state && state.arcStart;
  if (!cp) return state;
  var arc = index.arcs[cp.arcId];
  var node = arc && cp.currentId ? arc.map[cp.currentId] : null;
  // The arc's first card is itself a save point → it is the save again.
  var save = isSavePoint(node) ? snapshot(cp, { save: null, arcStart: cp }) : cp.save || null;
  return snapshot(cp, { arcStart: cp, save: save });
}

/**
 * Players keep a history of states. The step where checkpoint `cp` was made is
 * the first state whose `field` ('save' or 'arcStart') is that same object; going
 * back rewinds to it. -1 when it isn't in the history.
 */
export function checkpointStep(states, cp, field) {
  if (!cp) return -1;
  for (var i = 0; i < states.length; i++) if (states[i] && states[i][field] === cp) return i;
  return -1;
}

/** Pick a class on a Choose class card: the reader becomes it, then the story follows the card's wire. */
export function pickClass(index, state, classId, rng, pick) {
  var node = currentNode(index, state);
  if (!node || node.type !== 'classpick') return state;
  var offered = classOptions(index, state, node).some(function (c) {
    return c.id === classId;
  });
  if (!offered) return state;
  var vars = becomeClass(index.classes, state.vars, classId);
  var t = nextNodeId(node.id, index.arcs[state.arcId].edges);
  var base = {
    arcId: state.arcId,
    currentId: state.currentId,
    callStack: state.callStack,
    progress: state.progress,
    vars: vars,
    roll: null,
    scene: state.scene,
    hud: state.hud == null ? null : state.hud,
    save: state.save || null,
    arcStart: state.arcStart || null,
  };
  return t ? land(index, state.arcId, t, base, rng, pick) : ended(state, vars);
}
