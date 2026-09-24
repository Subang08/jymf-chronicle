/* 无头测试底座：极简 DOM 桩 + 模块加载器 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = '' + (process.env.JYMF_ROOT || require('path').resolve(__dirname, '..')) + '';
const BUILD = path.join(ROOT, 'build');
const ORDER = ['latex.js', 'world.js', 'geo.js', 'tables.js', 'narr.js', 'engine.js', 'panels.js', 'improv.js', 'map.js', 'create.js', 'game.js', 'net.js'];

/* ---------------- DOM 桩 ---------------- */
/* 选择器匹配（元素级，与 document 级共用同一套规则） */
function matchesSel(sel, e) {
  sel = String(sel).trim();
  let m;
  if ((m = /^#([\w-]+)$/.exec(sel))) return e.getAttribute('id') === m[1];
  if ((m = /^\.([\w-]+)$/.exec(sel))) return e.classList.contains(m[1]);
  if ((m = /^([\w-]+)$/.exec(sel))) return e.tagName === m[1].toUpperCase();
  if ((m = /^\.([\w-]+)\.([\w-]+)$/.exec(sel))) return e.classList.contains(m[1]) && e.classList.contains(m[2]);
  if ((m = /^([\w-]+)\.([\w-]+)$/.exec(sel))) return e.tagName === m[1].toUpperCase() && e.classList.contains(m[2]);
  if ((m = /^\[([\w-]+)="?([^"\]]*)"?\]$/.exec(sel))) return e.getAttribute(m[1]) === m[2];
  if ((m = /^([\w-]+)\[([\w-]+)="?([^"\]]*)"?\]$/.exec(sel))) return e.tagName === m[1].toUpperCase() && e.getAttribute(m[2]) === m[3];
  return false;
}

class El {
  constructor(tag) {
    this.nodeType = 1;
    this.tagName = String(tag || 'div').toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attrs = {};
    this.className = '';
    this.style = {};
    this.dataset = {};
    this._html = '';
    this._text = '';
    this.listeners = {};
    const self = this;
    this.classList = {
      add(...cs) { cs.forEach(c => { if (c && self.className.split(' ').indexOf(c) < 0) self.className = (self.className + ' ' + c).trim(); }); },
      remove(...cs) { cs.forEach(c => { self.className = self.className.split(' ').filter(x => x && x !== c).join(' '); }); },
      toggle(c, on) { if (on === undefined) on = !this.contains(c); if (on) this.add(c); else this.remove(c); },
      contains(c) { return self.className.split(' ').indexOf(c) >= 0; }
    };
  }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v == null ? '' : v); this.children = []; }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v == null ? '' : v); }
  get outerHTML() {
    const cls = this.className ? ' class="' + this.className + '"' : '';
    const id = this.attrs.id ? ' id="' + this.attrs.id + '"' : '';
    return '<' + this.tagName.toLowerCase() + id + cls + '>' + this._html + this._text + '</' + this.tagName.toLowerCase() + '>';
  }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter(x => x !== c); return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); }
  getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter(x => x !== f); }
  dispatch(t, ev) {
    (this.listeners[t] || []).forEach(f => f.call(this, ev || { currentTarget: this, target: this, preventDefault() {}, key: '' }));
    if (t === 'click' && typeof this.onclick === 'function') this.onclick(ev || {});
  }
  click() { this.dispatch('click'); }
  focus() { this.focused = true; }
  blur() { this.focused = false; }
  scrollIntoView() { this.scrolled = true; }
  getBoundingClientRect() { return { top: 0, left: 0, right: 120, bottom: 24, width: 120, height: 24 }; }
  get offsetWidth() { return 120; }
  get offsetHeight() { return 24; }
  get scrollHeight() { return 1200; }
  get scrollTop() { return this._st || 0; }
  set scrollTop(v) { this._st = v; }
  /* 递归取全部文本（含 innerHTML 原文） */
  allText() {
    let out = this._html + this._text;
    this.children.forEach(c => { out += ' ' + c.allText(); });
    return out;
  }
  /* 递归找元素 */
  find(pred, acc) {
    acc = acc || [];
    this.children.forEach(c => { if (pred(c)) acc.push(c); c.find(pred, acc); });
    return acc;
  }
  querySelectorAll(sel) {
    const parts = String(sel).trim().split(/\s+/);
    let list = [this];
    for (const part of parts) {
      const next = [];
      list.forEach(scope => scope.find(e => matchesSel(part, e)).forEach(e => next.push(e)));
      list = next;
    }
    return list;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}

function makeDoc() {
  const ids = ['appWrap', 'timeline', 'tlInner', 'app', 'topbar', 'verLabel', 'btnStatus', 'btnBag', 'btnCard',
    'btnMap', 'btnCodex', 'btnChron', 'btnSet', 'stage', 'logWrap', 'log', 'dock', 'chips', 'inputRow', 'cmd', 'send',
    'hintline', 'hint', 'side', 'sideTitle', 'sideClose', 'sideTabs', 'sideBody', 'landing', 'landMotto',
    'landStart', 'landContinue', 'landMap', 'landCodex', 'landChron', 'landSet', 'landAbout', 'modal', 'modalBox', 'tlTip'];
  const byId = {};
  const root = new El('body');
  ids.forEach(id => {
    const e = new El(id === 'cmd' ? 'textarea' : (id.indexOf('btn') === 0 || id.indexOf('land') === 0 || id === 'send' || id === 'sideClose' ? 'button' : 'div'));
    e.setAttribute('id', id);
    byId[id] = e;
    root.appendChild(e);
  });
  ['status', 'bag', 'quest'].forEach(t => {
    const b = new El('button');
    b.setAttribute('data-side', t);
    byId.sideTabs.appendChild(b);
  });
  const docListeners = {};
  function matchOne(sel, scope) {
    sel = sel.trim();
    let m;
    if ((m = /^#([\w-]+)$/.exec(sel))) return byId[m[1]] || null;
    if ((m = /^\.([\w-]+)$/.exec(sel))) return scope.find(e => e.classList.contains(m[1]))[0] || null;
    if ((m = /^\[([\w-]+)="?([^"\]]*)"?\]$/.exec(sel))) return scope.find(e => e.getAttribute(m[1]) === m[2])[0] || null;
    if ((m = /^([\w-]+)\[([\w-]+)="?([^"\]]*)"?\]$/.exec(sel))) return scope.find(e => e.tagName === m[1].toUpperCase() && e.getAttribute(m[2]) === m[3])[0] || null;
    return null;
  }
  function matches(sel, e) {
    sel = sel.trim();
    let m;
    if ((m = /^#([\w-]+)$/.exec(sel))) return e.getAttribute('id') === m[1];
    if ((m = /^\.([\w-]+)$/.exec(sel))) return e.classList.contains(m[1]);
    if ((m = /^([\w-]+)$/.exec(sel))) return e.tagName === m[1].toUpperCase();
    if ((m = /^\.([\w-]+)\.([\w-]+)$/.exec(sel))) return e.classList.contains(m[1]) && e.classList.contains(m[2]);
    if ((m = /^([\w-]+)\.([\w-]+)$/.exec(sel))) return e.tagName === m[1].toUpperCase() && e.classList.contains(m[2]);
    if ((m = /^\[([\w-]+)="?([^"\]]*)"?\]$/.exec(sel))) return e.getAttribute(m[1]) === m[2];
    if ((m = /^([\w-]+)\[([\w-]+)="?([^"\]]*)"?\]$/.exec(sel))) return e.tagName === m[1].toUpperCase() && e.getAttribute(m[2]) === m[3];
    return false;
  }
  const document = {
    getElementById(id) { return byId[id] || null; },
    createElement(tag) { return new El(tag); },
    addEventListener(t, f) { (docListeners[t] = docListeners[t] || []).push(f); },
    dispatch(t, ev) { (docListeners[t] || []).forEach(f => f(ev)); },
    querySelector(sel) {
      const parts = sel.trim().split(/\s+/);
      if (parts.length === 1) {
        const all = root.find(() => true);
        return all.filter(e => matches(parts[0], e))[0] || null;
      }
      let scope = matchOne(parts[0], root);
      if (!scope) {
        const found = root.find(e => matches(parts[0], e));
        scope = found[0] || null;
      }
      if (!scope) return null;
      for (let i = 1; i < parts.length; i++) {
        const deep = scope.find(e => matches(parts[i], e));
        if (!deep.length) return null;
        scope = deep[0];
      }
      return scope;
    },
    querySelectorAll(sel) {
      const parts = sel.trim().split(/\s+/);
      if (parts.length === 1) {
        const all = root.find(() => true);
        const hit = all.filter(e => matches(parts[0], e));
        if (byId[parts[0].replace('#', '')] && parts[0][0] === '#') hit.unshift(byId[parts[0].slice(1)]);
        return hit;
      }
      let scope = matchOne(parts[0], root);
      if (!scope) { const found = root.find(e => matches(parts[0], e)); scope = found[0] || null; }
      if (!scope) return [];
      let list = [scope];
      for (let i = 1; i < parts.length; i++) {
        const next = [];
        list.forEach(s => s.find(e => matches(parts[i], e)).forEach(e => next.push(e)));
        list = next;
      }
      return list;
    },
    body: root, documentElement: root
  };
  return { document, root, byId };
}

/* ---------------- 加载 ---------------- */
function loadGame() {
  const { document, root, byId } = makeDoc();
  const store = new Map();
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear()
  };
  const sandbox = {
    console, setTimeout, clearTimeout, Date, JSON, Math,
    document, localStorage, innerHeight: 900, innerWidth: 1400,
    addEventListener() {}, removeEventListener() {}, scrollTo() {},
    navigator: { userAgent: 'node' }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);
  ORDER.forEach(name => {
    const code = fs.readFileSync(path.join(BUILD, name), 'utf8');
    vm.runInContext(code, ctx, { filename: name });
  });
  return { win: sandbox, document, root, byId, localStorage, store };
}

/* ---------------- 断言 ---------------- */
const R = { pass: 0, fail: 0, fails: [] };
function ok(cond, label, extra) {
  if (cond) { R.pass++; }
  else { R.fail++; R.fails.push(label + (extra ? '  << ' + extra + ' >>' : '')); }
}
function eq(a, b, label) { ok(a === b, label, 'got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); }
function noThrow(fn, label) {
  try { const v = fn(); R.pass++; return v; }
  catch (e) { R.fail++; R.fails.push(label + '  << ' + e.message + ' @ ' + (e.stack || '').split('\n')[1] + ' >>'); return null; }
}
function report(title) {
  console.log('--- ' + title + ' ---');
  console.log('PASS ' + R.pass + '  FAIL ' + R.fail);
  R.fails.slice(0, 40).forEach(f => console.log('  [X] ' + f));
  return R.fail === 0;
}
function reset() { R.pass = 0; R.fail = 0; R.fails = []; }

module.exports = { loadGame, ok, eq, noThrow, report, reset, R, El, ROOT, BUILD, ORDER };
