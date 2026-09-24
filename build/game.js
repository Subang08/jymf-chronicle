/* ============================================================
   控制器 · 回合循环 / 只增不减的文字浏览区 / 左侧行动节点（回顾）/
   右侧状态与物品边栏 / 弹层典籍 / 存档 / 启动
   规则：每回合先给结果，再给按钮（查看玩家状态 · 查看物品栏），最后给 a-e 选项。
   ============================================================ */
(function (global) {
  'use strict';

  var WD = global.WD || {}, TB = global.TB || {}, ENG = global.ENG, NARR = global.NARR,
      PANEL = global.PANEL, CREATE = global.CREATE, LTX = global.LTX, GEO = global.GEO;

  var SAVE_KEY = 'jymf_save_v1';
  var st = null;
  var inputMode = null;   /* null | 'custom' */
  var nodeSeq = 0;

  /* ---------------- DOM ---------------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function esc(s) { return LTX.esc(s); }

  /* ---------------- 状态 ---------------- */
  function newState(seed) {
    var s = {
      seed: seed || (Date.now() % 2147483647),
      phase: 'landing', turn: 0,
      time: { year: 824, month: 10, day: 12, hour: 8 },
      place: '曙光城', region: '中部平原', terrain: '平原',
      pc: {
        name: '无名', gender: '未述', age: 20,
        raceId: 'human', raceName: '人类', clsId: 'fighter', clsName: '战士',
        identityId: '', identityName: '', bgId: '', bgName: '', alignId: 'TN', alignName: '绝对中立',
        level: 1, xp: 0, xpNext: 1500,
        attrs: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
        hp: { cur: 10, max: 10 }, mp: { cur: 0, max: 0 }, ac: 10, speed: 30, init: 0,
        skills: [], langs: ['通用语'], talents: [], spells: [], slots: {},
        status: '健康', fatigue: 0, hunger: '饱足', thirst: '正常',
        injured: [], trauma: [], deeds: [], weight: { cur: 0, max: 150 },
        homeland: '', born: { year: 804, month: 10, day: 12 }, cond: []
      },
      money: { cp: 0, sp: 0, gp: 0, pp: 0 },
      bag: [], team: [], rep: {}, quests: [], crafts: {},
      combat: null, flags: {}, counters: {}, nodes: [], history: []
    };
    return s;
  }
  function migrate(s) {
    var d = newState(s && s.seed);
    function fill(t, src) {
      if (!src) return t;
      for (var k in t) {
        if (src[k] === undefined) continue;
        if (t[k] && typeof t[k] === 'object' && !Array.isArray(t[k]) && typeof src[k] === 'object' && !Array.isArray(src[k])) fill(t[k], src[k]);
        else t[k] = src[k];
      }
      return t;
    }
    fill(d, s);
    ['flags', 'counters', 'rep', 'crafts', 'quests', 'nodes', 'history', 'bag', 'team'].forEach(function (k) {
      d[k] = (s && s[k] != null) ? s[k] : (Array.isArray(d[k]) ? [] : {});
    });
    /* 建卡中途存档也要能续上：create 进度不属于 newState 的字段，单独搬过来 */
    if (s && s.create && typeof s.create === 'object') d.create = s.create;
    if (s && s.log !== undefined) d.log = s.log;
    return d;
  }
  function save() {
    if (!st) return;
    try {
      var copy = JSON.parse(JSON.stringify(st));
      copy.history = (copy.history || []).slice(-600);
      copy.nodes = (copy.nodes || []).slice(-400);
      global.localStorage.setItem(SAVE_KEY, JSON.stringify(copy));
    } catch (e) { /* 存档失败不阻断游戏 */ }
  }
  function loadSave() {
    try {
      var raw = global.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.pc || !s.pc.name) return null;
      return migrate(s);
    } catch (e) { return null; }
  }

  /* ---------------- 文字浏览区（只增不减） ---------------- */
  var pendingAnchor = null;
  /* 每个回合的第一块文字挂上锚点，供左侧节点点击回看 */
  function anchorNext() { pendingAnchor = 'b' + (nodeSeq + 1); return pendingAnchor; }
  function push(html, cls, opts) {
    opts = opts || {};
    var box = el('div', 'blk ' + (cls || 'p-text'));
    var isNode = html && typeof html === 'object' && typeof html.appendChild === 'function';
    if (isNode) box.appendChild(html);
    else box.innerHTML = html;
    var anchor = opts.anchor || pendingAnchor || null;
    if (anchor) { box.setAttribute('data-anchor', anchor); pendingAnchor = null; }
    $('log').appendChild(box);
    if (!opts.noHist && st) {
      st.history.push({ c: cls || 'p-text', h: isNode ? html.outerHTML : html, a: anchor });
      if (st.history.length > 900) st.history.splice(0, st.history.length - 900);
    }
    scrollBottom();
    return box;
  }
  function pushText(text, cls) {
    if (!text) return null;
    var box = push(LTX.renderMixed(String(text)), cls || 'p-text');
    /* 联网模式下，文字块先按引擎文字落位，AI 补叙到了就地替换（流式推进），不新增块。
       联网层不在、或它自己出错，都只影响文字，不影响引擎判定。 */
    if (box && text && text.__ai && global.AI && global.AI.attach) {
      try { global.AI.attach(box, text, st); } catch (e) { /* 忽略：离线玩法照常 */ }
    }
    return box;
  }
  function pushPanel(code, cls) {
    if (!code) return null;
    return push(LTX.renderMixed(code), cls || 'p-panel');
  }
  function scrollBottom() {
    var w = $('logWrap');
    if (!w) return;
    var go = function () { w.scrollTop = w.scrollHeight; };
    go();
    /* 面板字体与排版落位后再补一次，确保新选项一定在视野里 */
    if (global.requestAnimationFrame) global.requestAnimationFrame(go);
    global.setTimeout(go, 80);
  }
  function divider(label) {
    return push('<div class="divider">' + esc(label || '本 轮 结 果 已 呈 现') + '</div>', 'p-div', { noHist: false });
  }
  function restoreHistory() {
    var log = $('log');
    log.innerHTML = '';
    (st.history || []).forEach(function (b) {
      var box = el('div', 'blk ' + b.c);
      box.innerHTML = b.h;
      if (b.a) box.setAttribute('data-anchor', b.a);
      log.appendChild(box);
    });
    paintTimeline();
  }

  /* ---------------- 左侧行动节点（点击=回顾，不影响进度） ---------------- */
  function pushNode(info) {
    nodeSeq++;
    var n = {
      i: nodeSeq, turn: st.turn, kind: info.kind || 'scene', label: info.label || '节点',
      detail: info.detail || '', time: ENG.time.stamp(st), anchor: info.anchor || null
    };
    st.nodes.push(n);
    paintTimeline();
    return n;
  }
  function paintTimeline() {
    var wrap = $('tlInner');
    wrap.innerHTML = '<div class="tl-head">行 动 节 点</div>';
    (st.nodes || []).forEach(function (n) {
      var b = el('button', 'tl-node k-' + n.kind);
      b.type = 'button';
      b.setAttribute('data-i', n.i);
      b.innerHTML = '<span class="tl-k">' + String(n.i).padStart(2, '0') + ' · ' + esc(shortLabel(n.label)) + '</span>' +
                    '<span class="tl-t">' + esc(shortTime(n.time)) + '</span>';
      b.addEventListener('mouseenter', function (e) { showTip(e, n); });
      b.addEventListener('mouseleave', hideTip);
      b.addEventListener('click', function () { jumpTo(n); });
      wrap.appendChild(b);
    });
    var tw = $('timeline');
    if (tw) tw.scrollTop = tw.scrollHeight;
  }
  function shortLabel(s) {
    s = String(s || '');
    var m = { '选 择 种 族': '种族', '选 择 职 业': '职业', '选 择 身 份': '身份', '选 择 背 景': '背景', '选 择 性 别': '性别', '确 定 姓 名': '姓名', '分 配 属 性': '属性', '选 择 阵 营': '阵营', '选 择 开 篇': '开篇', '确 认 角 色 卡': '确认' };
    if (m[s]) return m[s];
    if (/^选 择 天 赋/.test(s)) return '天赋';
    return s.replace(/\s/g, '').slice(0, 4);
  }
  /* 节点栏只显示「月/日 时辰」，完整时间留给悬浮提示 */
  function shortTime(full) {
    var t = st.time;
    return t.month + '/' + t.day + ' ' + ENG.time.shichen(t).replace('时', '');
  }
  function showTip(e, n) {
    var tip = $('tlTip');
    tip.innerHTML = '<b>第 ' + n.turn + ' 回合 · 节点 ' + n.i + '</b>' +
      '类型：<i>' + esc(kindName(n.kind)) + '</i><br>' +
      '摘要：' + esc(n.detail || n.label) + '<br>' +
      '时间：' + esc(n.time) + '<br><span style="color:#67717f">点击回到当时的文字（只回顾，不改变进度）</span>';
    tip.style.display = 'block';
    var r = e.currentTarget.getBoundingClientRect();
    var top = Math.min(global.innerHeight - tip.offsetHeight - 10, Math.max(8, r.top - 6));
    tip.style.left = (r.right + 10) + 'px';
    tip.style.top = top + 'px';
  }
  function hideTip() { $('tlTip').style.display = 'none'; }
  function kindName(k) {
    return ({ scene: '场景', open: '开篇', create: '建卡', fight: '交战', result: '结果', talk: '对话', task: '任务', rest: '休息', travel: '行路', event: '突发', death: '死亡' })[k] || k;
  }
  function jumpTo(n) {
    var box = document.querySelector('[data-anchor="' + n.anchor + '"]');
    if (!box) { hint('这一段已经不在浏览区里了。'); return; }
    box.scrollIntoView({ behavior: 'instant', block: 'center' });
    box.classList.remove('flash');
    void box.offsetWidth;
    box.classList.add('flash');
    Array.prototype.forEach.call(document.querySelectorAll('.tl-node'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-i') === String(n.i));
    });
    hint('回顾第 ' + n.turn + ' 回合 · 节点 ' + n.i + '（进度未改变）');
  }

  /* ---------------- 右侧边栏 ---------------- */
  var sideTab = 'status';
  function openSide(tab) {
    if (tab) sideTab = tab;
    renderSide();
    $('side').classList.add('open');
    $('side').setAttribute('aria-hidden', 'false');
    Array.prototype.forEach.call(document.querySelectorAll('#sideTabs button'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-side') === sideTab);
    });
  }
  function closeSide() { $('side').classList.remove('open'); $('side').setAttribute('aria-hidden', 'true'); }
  function renderSide() {
    if (!st || !st.pc) return;
    var body = $('sideBody');
    if (st.phase === 'create') {
      $('sideTitle').textContent = '◈ 建 卡 进 度 ◈';
      body.innerHTML = LTX.renderMixed(CREATE.preview(st));
      return;
    }
    $('sideTitle').textContent = sideTab === 'bag' ? '◈ 物 品 栏 ◈' : (sideTab === 'quest' ? '◈ 任 务 ◈' : '◈ 玩 家 状 态 ◈');
    var code = sideTab === 'bag' ? PANEL.bag(st) : (sideTab === 'quest' ? PANEL.task(st) : PANEL.status(st));
    body.innerHTML = LTX.renderMixed(code) +
      '<div class="side-note">状态与物品在这里展开；主界面每回合保留一行精简状态栏。' +
      '左侧节点可回看每一回合的文字。</div>';
  }

  /* ---------------- 弹层 ---------------- */
  function modal(title, bodyHtml, buttons, cls) {
    var box = $('modalBox');
    box.className = cls || '';
    box.innerHTML = '';
    var head = el('div', 'mb-head', '<h3>' + esc(title) + '</h3>');
    var x = el('button', 'mb-x', '✕');
    x.type = 'button';
    x.addEventListener('click', closeModal);
    head.appendChild(x);
    var body = el('div', 'mb-body', bodyHtml);
    var foot = el('div', 'mb-foot');
    (buttons || [{ label: '关 闭', act: closeModal }]).forEach(function (b) {
      var btn = el('button', null, esc(b.label));
      btn.type = 'button';
      btn.addEventListener('click', b.act || closeModal);
      foot.appendChild(btn);
    });
    box.appendChild(head); box.appendChild(body); box.appendChild(foot);
    $('modal').classList.remove('hidden');
  }
  function closeModal() { $('modal').classList.add('hidden'); $('modalBox').innerHTML = ''; }

  /* ---------------- 选项 / 按钮 ---------------- */
  var curOpts = [];
  var optGroups = [];          /* 按出现顺序记住每一组，最后一组是「还没被封存」的那一组 */
  function lockAllGroups() {
    optGroups.forEach(function (g) { g.locked = true; });
    Array.prototype.forEach.call(document.querySelectorAll('#log .opts'), function (g) {
      g.classList.add('locked');
      Array.prototype.forEach.call(g.querySelectorAll('.opt-btn'), function (b) { b.disabled = true; });
    });
  }
  function optionButton(o) {
    var btn = el('button', 'opt-btn' + (o.kind === 'custom' ? ' custom' : ''));
    btn.type = 'button';
    btn.setAttribute('data-k', o.k);
    btn.innerHTML = LTX.renderMixed(PANEL.options([o]));
    btn.addEventListener('click', function () { choose(o.k); });
    return btn;
  }
  function renderOpts(list) {
    curOpts = list || [];
    /* 旧选项一律封存：文字留着可以回看，但不能再被点（因果只往前走一次） */
    lockAllGroups();
    var wrap = el('div', 'opts' + (st && st.phase === 'dead' ? ' locked' : ''));
    var group = { locked: false, node: wrap };
    curOpts.forEach(function (o) { wrap.appendChild(optionButton(o)); });
    optGroups.push(group);
    if (optGroups.length > 60) optGroups.splice(0, optGroups.length - 60);
    push(wrap, 'p-opts', { anchor: null });
    scrollBottom();
    return group;
  }
  /* 联网时先不弹离线选项：放一张「正在推算」的占位，等模型回来再就地换成真选项。
     占位不可点（不是死键），a-e 此刻没有绑定任何动作。 */
  function renderOptsLoading(text) {
    curOpts = [];
    lockAllGroups();
    var wrap = el('div', 'opts loading');
    var btn = el('button', 'opt-btn loading');
    btn.type = 'button';
    btn.disabled = true;
    btn.setAttribute('data-k', '');
    btn.innerHTML = LTX.renderMixed(PANEL.options([{ k: 'a', label: text || 'AI 正在推算这一回合的选项…', kind: 'careful' }]));
    wrap.appendChild(btn);
    var group = { locked: false, loading: true, node: wrap };
    optGroups.push(group);
    if (optGroups.length > 60) optGroups.splice(0, optGroups.length - 60);
    push(wrap, 'p-opts', { anchor: null });
    scrollBottom();
    return group;
  }
  /* 就地换掉当前这一组的内容（不新增行、不动已经封存的组） */
  function replaceLiveOptions(list) {
    var g = liveOptGroup();
    curOpts = list || [];
    if (!g || !g.node) return renderOpts(curOpts);
    g.node.className = 'opts';
    g.loading = false;
    g.node.innerHTML = '';
    curOpts.forEach(function (o) { g.node.appendChild(optionButton(o)); });
    scrollBottom();
    return g;
  }
  /* 还没被点的最后一组：AI 选项到了就替换它；已经被点过的组不再动 */
  function liveOptGroup() {
    var last = optGroups.length ? optGroups[optGroups.length - 1] : null;
    return (last && !last.locked) ? last : null;
  }
  function showQuick() {
    var chips = $('chips');
    chips.innerHTML = '';
    function chip(label, fn, cls) {
      var b = el('button', 'chip' + (cls ? ' ' + cls : ''), esc(label));
      b.type = 'button';
      b.addEventListener('click', fn);
      chips.appendChild(b);
      return b;
    }
    /* 联网开关挂在按钮排的末尾：这一排每回合都会重建，重建后要再挂一次，否则它会被冲掉 */
    var remountAI = function () { if (global.AI && global.AI.mountChip) global.AI.mountChip(); };
    if (st.phase === 'dead') {
      chip('重 新 开 始', function () { restart(); }, 'key');
      chip('查 看 角 色 卡', function () { modal('角 色 卡', LTX.renderMixed(PANEL.card(st))); });
      chip('大 事 记', showChron);
      chip('刷 新', function () { refreshView(false); });
      remountAI();
      return;
    }
    if (st.phase === 'create') {
      var n = CREATE.node(st);
      chip('查 看 玩 家 状 态', function () { openSide('status'); }, 'key');
      chip('查 看 物 品 栏', function () { openSide('bag'); }, 'key');
      if (n.step === 'nation' || n.step === 'region') chip('大 陆 方 位 总 览', function () { modal('大 陆 方 位 总 览', LTX.renderMixed(CREATE.worldMapPanel())); });
      if (CREATE.STEPS.indexOf(n.step) > 0) chip('上 一 步', function () { choose(n.opts[n.opts.length - 1].k, '上一步'); });
      chip('刷 新', function () { refreshView(false); });
      remountAI();
      return;
    }
    chip('查 看 玩 家 状 态', function () { openSide('status'); }, 'key');
    chip('查 看 物 品 栏', function () { openSide('bag'); }, 'key');
    chip('地 图', function () { showMap(); });
    chip('前 往 近 处', function () { showNearbyPicker(); });
    chip('长 途 出 行', function () { showLongPicker(); }, 'warn');
    if ((st.quests || []).length) chip('查 看 任 务', function () { openSide('quest'); });
    if (st.combat) chip('战 斗 面 板', function () { modal('战 斗', LTX.renderMixed(PANEL.combat(st))); }, 'warn');
    chip('星 母 历', function () { modal('星 母 历', LTX.renderMixed(PANEL.time(st))); });
    chip('刷 新', refreshClick);
    chip('典 籍', showCodex);
    if (global.AI) chip('AI 事 件', aiEvent, 'warn');
    remountAI();
  }
  /* 联网专属：让 AI 按当下的地形与威胁出一件事，敌人只能从本地名单里挑，伤害与掉落由引擎掷 */
  function aiEvent() {
    if (!(global.AI && global.AI.on && global.AI.ready) || !global.AI.event) {
      hint('先在底部点「AI 未开 / AI 不可用」那一格，把联网打开（要从服务器网址进入）。');
      return;
    }
    if (!st || st.phase !== 'playing') { hint('还没有角色：先建卡进世界。'); return; }
    if (st.combat) { hint('战斗里先打完这一场，再让 AI 出别的事。'); return; }
    var allowed = (WD.MONSTERS || []).filter(function (m) {
      return (m.habitat || []).some(function (h) {
        return h === st.terrain || (h && st.terrain && (h.indexOf(st.terrain) >= 0 || st.terrain.indexOf(h) >= 0));
      });
    }).map(function (m) { return m.name; }).slice(0, 60);
    hint('正在按这一带的地形与威胁出事件…');
    var p = global.AI.event('wild', allowed);
    if (!p || !p.then) { hint('联网层没就绪，仍走离线表。'); return; }
    p.then(function (r) {
      if (!r || !r.ok || !r.event) { hint('这次没出成（' + ((r && r.error) || '上游没给合规结果') + '），仍走离线表。'); return; }
      var ev = r.event, notes = [];
      var res = { text: ev.text, extra: [] };
      if (ev.foes && ev.foes.length) {
        var foes = ev.foes.map(function (nm) {
          var m = (WD.MONSTERS || []).filter(function (x) { return x.name === nm; })[0];
          return m ? ENG.combat.foeFromMonster(m, st.pc.level) : null;
        }).filter(Boolean);
        if (foes.length) { res.combat = foes; res.combatName = 'AI 事件 · ' + ev.kind; notes.push('对手：' + foes.map(function (f) { return f.name; }).join('、')); }
      }
      if (ev.dmg) {
        var d = ENG.rollDice(ev.dmg);
        st.pc.hp.cur -= d;
        notes.push('生命 -' + d + '（' + ev.dmg + '）');
        res.cause = 'AI 事件：' + ev.kind;
      }
      if (ev.loot) { ENG.item.add(st, ev.loot); notes.push('拾得：' + ev.loot); }
      if (ev.why) notes.push('缘由：' + ev.why);
      notes.push('（AI 只出了这一段；伤害、敌人、掉落都由本地引擎结算）');
      res.extra = notes;
      st.turn++;
      push('<p class="tx">' + esc('〔AI〕' + ev.kind) + '</p>', 'p-pick');
      finishTurn('aievent', res);
    }, function (e) {
      hint('AI 出事件失败：' + ((e && e.message) || '未知') + '。仍走离线表。');
    });
  }
  function hint(t) { $('hint').textContent = t || ''; }

  /* ---------------- 刷新：只看数据，不动内容 ----------------
     刷新做三件事：重算派生值并把越界的生命/法力夹回上限、把右侧边栏与底部按钮排按当前状态重画、
     把「当前这一组还没被点的选项」按原样重画一遍（文字、字母、act 都不变）。
     它绝不：追加或改写文字区内容、重新生成选项、改动已封存的选项组、消耗一回合。 */
  function refreshView(quiet) {
    if (!st) return null;
    var snapshot = function () {
      return {
        hp: Math.round(st.pc ? st.pc.hp.cur : 0),
        gold: ENG.money.total(st),
        turn: st.turn, place: st.place,
        blocks: $('log') ? $('log').children.length : 0,
        hist: (st.history || []).length,
        groups: optGroups.length,
        labels: (curOpts || []).map(function (o) { return o.k + ':' + o.label; }).join('|')
      };
    };
    var before = snapshot();
    /* 1. 数据：重算派生值，夹回合法区间（外部脚本或旧存档改了数也不至于显示错） */
    if (st.pc) {
      if (typeof st.pc.hp.cur !== 'number' || !isFinite(st.pc.hp.cur)) st.pc.hp.cur = st.pc.hp.max;
      if (st.pc.hp.cur > st.pc.hp.max) st.pc.hp.cur = st.pc.hp.max;
      if (st.pc.hp.cur < 0) st.pc.hp.cur = 0;
      if (st.pc.mp) {
        if (!isFinite(st.pc.mp.cur)) st.pc.mp.cur = st.pc.mp.max;
        st.pc.mp.cur = Math.max(0, Math.min(st.pc.mp.cur, st.pc.mp.max));
      }
      if (st.pc.fatigue != null) st.pc.fatigue = Math.max(0, Math.min(6, st.pc.fatigue));
      ENG.char.derive(st);
    }
    /* 2. 界面：边栏、按钮排、时间行按当前状态重画 */
    renderSide();
    showQuick();
    var lbl = $('verLabel');
    if (lbl) lbl.textContent = ENG.time.stamp(st) + '　' + (st.place || '');
    /* 3. 当前这一组选项按原样重画（只换 DOM，不换内容、不封存、不新增行） */
    var g = liveOptGroup();
    if (g && g.node) {
      g.node.innerHTML = '';
      (curOpts || []).forEach(function (o) { g.node.appendChild(optionButton(o)); });
      if (g.loading) g.node.className = 'opts loading';
    }
    var after = snapshot();
    var same = before.labels === after.labels && before.blocks === after.blocks &&
      before.hist === after.hist && before.groups === after.groups && before.turn === after.turn;
    if (!quiet) {
      hint('已刷新：' + st.place + '　生命 ' + Math.max(0, Math.round(st.pc.hp.cur)) + '/' + st.pc.hp.max +
        '　持币 ' + ENG.money.fmt(ENG.money.total(st)) + '　第 ' + st.turn + ' 回合　·　文字与选项保持原样');
    }
    return { before: before, after: after, untouched: same };
  }
  function refreshClick() {
    if (!st || st.phase === 'landing') { hint('还没有角色：先开始游戏。'); return; }
    var r = refreshView(false);
    if (r && r.untouched) pushText('〔刷新〕已按当前状态重画界面：文字区与未选选项保持原样。', 'p-sys');
    else if (r) pushText('〔刷新〕界面已重画（数据有变化，逐项以当前状态为准）。', 'p-sys');
  }

  /* ---------------- 状态行 ---------------- */
  function vitalLine() {
    var pc = st.pc;
    var s = '[' + pc.name + '] | [' + pc.raceName + '] | [' + pc.clsName + '] | [Lv' + pc.level + ' ' + ENG.char.levelName(pc.level) + ']' +
      ' 生命：' + Math.max(0, Math.round(pc.hp.cur)) + '/' + pc.hp.max +
      ' ' + (pc.powerName || '法力') + '：' + Math.round(pc.mp.cur) + '/' + pc.mp.max +
      ' 经验：' + pc.xp + '/' + pc.xpNext +
      ' 状态：' + pc.status + ' 疲劳：' + (pc.fatigue || 0) + '级' +
      ' 饥渴：' + pc.hunger + '/' + pc.thirst +
      ' 持币：' + ENG.money.fmt(ENG.money.total(st)) +
      ' 位置：' + st.place + '（' + st.region + '）';
    push('<p class="tx">' + esc(s) + '</p>', 'p-sys');
  }

  /* ---------------- 建卡 ---------------- */
  function startCreate(fresh) {
    if (fresh) {
      var seed = Date.now() % 2147483647;
      st = newState(seed);
      ENG.seed(st.seed);
      $('log').innerHTML = '';
      nodeSeq = 0;
    }
    st.phase = 'create';
    CREATE.begin(st);
    pushText('星母历824年，深秋。你还没有名字，也还没有被人记住。', 'p-text');
    renderCreateNode();
  }
  function renderCreateNode() {
    var n = CREATE.node(st);
    var a = anchorNext();
    pushPanel(PANEL.notice(n.title, [n.text], 'blue'));
    if (n.panel) pushPanel(n.panel);
    pushNode({ kind: 'create', label: n.title.replace(/\s/g, ''), detail: n.text.slice(0, 40), anchor: a });
    renderOpts(n.opts);
    hint(n.hint);
    showQuick();
    renderSide();
    save();
  }
  /* 当前节点的「自定义」是哪个键：建卡阶段已经没有自定义项（返回 null），游戏里固定 e */
  function customKeyNow() {
    if (!st) return 'e';
    if (st.phase === 'create') {
      var n = CREATE.node(st);
      var last = n.opts[n.opts.length - 1];
      return (last && last.kind === 'custom') ? last.k : null;
    }
    var hit = null;
    (curOpts || []).forEach(function (o) { if (o.kind === 'custom') hit = o.k; });
    return hit || 'e';
  }
  function choose(k, raw) {
    if (!st) return;
    if (st.phase === 'create') {
      if (k === customKeyNow() && raw == null) { openInput('custom'); return; }
      var r = CREATE.pick(st, k, raw);
      if (!r.ok) { pushText('〔' + r.msg + '〕', 'p-sys'); hint(r.msg); return; }
      pushText(raw != null ? ('〔自定义〕' + raw) : ('〔选择〕' + k.toUpperCase()), 'p-pick');
      if (r.restart) { startCreate(true); return; }
      if (r.done) { enterWorld(); return; }
      if (r.infoPanel) pushPanel(r.infoPanel);      /* 选定地区后立刻给地区志 */
      renderCreateNode();
      return;
    }
    if (st.phase === 'dead') {
      if (k === 'a') restart();
      return;
    }
    if (k === customKeyNow() && raw == null) { openInput('custom'); return; }
    doTurn(k, raw);
  }

  /* ---------------- 进入世界 ---------------- */
  function enterWorld() {
    var p = st.create.picks;
    var pc = st.pc;
    /* 自创条目优先用生成出来的那一份（数值与物品都在里面） */
    var race = p.raceObj || ENG.char.raceById(p.raceId);
    var cls = p.clsObj || ENG.char.classById(p.clsId);
    var bg = p.bgObj || (WD.BACKGROUNDS || []).filter(function (x) { return x.id === p.bgId; })[0] || { skills: [], item: '' };
    var idn = p.identityObj || (WD.IDENTITIES || []).filter(function (x) { return x.id === p.identityId; })[0] || { gold: 0 };
    var al = p.alignObj || (WD.ALIGNMENTS || []).filter(function (x) { return x.id === p.alignId; })[0] || { name: '绝对中立', id: 'TN' };
    if (p.raceObj) ENG.regPut('races', p.raceObj);
    if (p.clsObj) ENG.regPut('classes', p.clsObj);
    if (p.identityObj) ENG.regPut('identities', p.identityObj);
    if (p.bgObj) ENG.regPut('backgrounds', p.bgObj);
    if (p.nationObj) ENG.regPut('nations', p.nationObj);

    pc.name = p.name || '无名'; pc.gender = p.gender || '未述';
    pc.raceId = race.id; pc.raceName = race.name;
    pc.clsId = cls.id; pc.clsName = cls.name;
    pc.bgId = bg.id || ''; pc.bgName = bg.name || '';
    pc.identityId = idn.id || ''; pc.identityName = idn.name || '';
    pc.alignId = al.id; pc.alignName = al.name;
    pc.attrs = {}; for (var k in (p.attrs || {})) pc.attrs[k] = p.attrs[k];
    ENG.ATTR_KEYS.forEach(function (kk) { if (pc.attrs[kk] == null) pc.attrs[kk] = 10; });
    ENG.char.applyRaceBonus(pc.attrs, race, ['str', 'con']);
    /* 熟练：背景表（设定集续卷第四章）那一份，加上身份与职业自带的那一份，去重合并。
       身份面板上印着「熟练 X」，这里就必须真的给，否则印的是空话。 */
    var skillSet = [];
    [bg.skills, idn.skills, cls.skills].forEach(function (list) {
      (list || []).forEach(function (sk) { if (sk && skillSet.indexOf(sk) < 0) skillSet.push(sk); });
    });
    pc.skills = skillSet;
    pc.age = 20 + ENG.int(0, 10);
    pc.born = { year: st.time.year - pc.age, month: ENG.int(1, 12), day: ENG.int(1, 30) };
    pc.homeland = race.homeland || '';
    pc.hp.cur = pc.hp.max = 999; pc.mp.cur = 0;
    pc.talents = [];
    /* 抽到的一组全部生效；只有一个时也走这条路 */
    var tlist = (p.talents && p.talents.length) ? p.talents : (p.talent ? [p.talent] : []);
    tlist.forEach(function (t) { ENG.talent.apply(st, t); });
    pc.hp.max = 0; ENG.char.derive(st);
    pc.hp.cur = pc.hp.max; pc.mp.cur = pc.mp.max;

    /* 初始装备 */
    (cls.kits && cls.kits[0] ? cls.kits[0].items : []).forEach(function (nm) { ENG.item.add(st, nm); });
    if (bg.item) ENG.item.add(st, bg.item);
    ENG.char.autoEquip(st);
    var gold = ENG.roll(2, 4) * 10 + (idn.gold || 0);
    ENG.money.gain(st, gold * (ENG.money.RATE.gp || 1000));
    st.crafts = {};
    (WD.CRAFTS || []).forEach(function (c) { st.crafts[c.name] = { value: 0, tier: (WD.CRAFT_TIERS || [])[0] }; });
    ['冒险者公会', '圣光教会', '法师公会'].forEach(function (o) { ENG.rep.add(st, o, 0); });

    /* 开篇 */
    var op = p.opening || (WD.OPENINGS || [])[0] || { place: '曙光城', region: '中部平原', terrain: '平原', name: '自定起点' };
    st.place = op.place; st.region = op.region || op.place; st.terrain = op.terrain || '平原';
    if (op.month) st.time.month = op.month;
    if (op.day) st.time.day = op.day;
    st.time.year = 824;
    if (op.terrain === '冰原') st.time.month = op.month || 1;

    ENG.char.derive(st);
    st.pc.deeds.push('星母历824年，以' + race.name + cls.name + '的身份抵达' + st.place + '。');
    var script = null;
    if (op.id === 'custom' && GEO) script = selfOriginScript(st, op);
    else script = (NARR && NARR.openingScript) ? NARR.openingScript(op.id || 'north') : [];
    st.flags.script = script || [];
    st.flags.scriptIdx = 0;
    st.phase = 'playing';
    var anchor0 = anchorNext();
    pushPanel(PANEL.notice('进 入 艾 尔 德 兰', [
      pc.name + '，' + pc.gender + '，' + race.name + cls.name + '，' + (pc.identityName || '无身份') + '。',
      '出身：' + (pc.homeland || '—') + '　阵营：' + pc.alignName,
      '天赋（' + tlist.length + ' 项）：' + (tlist.length ? tlist.map(function (t) { return t.name + '（' + t.grade + '）'; }).join('、') : '—'),
      '起始金币：' + ENG.money.fmt(ENG.money.total(st)),
      '第一件事：' + (op.task || '先弄清这里出什么事了。')
    ], 'gold'));
    pushNode({ kind: 'open', label: '开篇', detail: op.name + ' · ' + st.place, anchor: anchor0 });
    nextNode(true);
    save();
  }
  function restart() {
    try { global.localStorage.removeItem(SAVE_KEY); } catch (e) {}
    closeSide(); closeModal();
    startCreate(true);
  }

  /* 自定起点没有剧本：现搭三节——落地、问路、接活 */
  function selfOriginScript(st, op) {
    var info = GEO.regionInfo(op.place) || { nationName: '无主之地', position: '', desc: '', neighbours: [], nations: [] };
    var reg = GEO.regionOf(op.place) || { desc: '' };
    var task = ENG.task.generate(st, {});
    var local = { name: '本地人', role: /城|镇|堡|村|港/.test(op.place) ? '商贩' : '猎人' };
    var L1 = [NARR ? NARR.scene('arrive', narrCtx()) : '你到了。'];
    L1.push(reg.desc || (op.place + '。'));
    L1.push('这里是' + info.nationName + '，' + info.position + '。' +
      (info.neighbours[0] ? ('最近的去处是' + info.neighbours[0].name + '，在' + info.neighbours[0].dir + '，' + info.neighbours[0].far + '。') : ''));
    var L2 = [NARR ? NARR.talk(local, 'greet', narrCtx()) : '有人看了你一眼。'];
    L2.push('你身上只有' + ENG.money.fmt(ENG.money.total(st)) + '，和几件旧东西。' +
      (info.nation ? ('这地方归' + info.nationName + '管，' + (info.nation.trait || '')) : '这地方没人管。'));
    var L3 = [NARR ? NARR.talk(local, 'quest', narrCtx()) : '有人给你指了条路。'];
    L3.push('一桩事落到你手上：' + task.name + '（' + task.type + ' · ' + task.diff + ' · ' + task.reward + ' GP）。');
    st.quests.push(Object.assign({}, task, { state: '进行中' }));
    return [
      {
        title: '落地 · ' + op.place,
        text: L1.join(''),
        opts: [
          { k: 'a', label: '先站着看清楚这地方（谨慎观察）', kind: 'careful' },
          { k: 'b', label: '找个人问问这里出什么事了（顺势而为）', kind: 'safe' },
          { k: 'c', label: '直接往人声最密的地方走（剑走偏锋）', kind: 'bold' },
          { k: 'd', label: '先找地方吃喝、歇脚（休息）', kind: 'careful' },
          { k: 'e', label: '自定义行动（直接输入）', kind: 'custom' }
        ]
      },
      {
        title: '问路',
        text: L2.join(''),
        opts: [
          { k: 'a', label: '打听本地最近的麻烦（顺势而为）', kind: 'safe' },
          { k: 'b', label: '问清附近国家与道路远近（谨慎观察）', kind: 'careful' },
          { k: 'c', label: '直接开口要活干（剑走偏锋）', kind: 'bold' },
          { k: 'd', label: '不出声，先观察对方（谨慎观察）', kind: 'careful' },
          { k: 'e', label: '自定义行动（直接输入）', kind: 'custom' }
        ]
      },
      {
        title: '接活 · ' + task.name,
        text: L3.join(''),
        opts: [
          { k: 'a', label: '应下这桩事，按线索往' + task.place + '走（顺势而为）', kind: 'safe' },
          { k: 'b', label: '先问清报酬与风险再答应（谨慎观察）', kind: 'careful' },
          { k: 'c', label: '不要这活，自己在城里找门路（剑走偏锋）', kind: 'bold' },
          { k: 'd', label: '先去补给，再动身（休息）', kind: 'careful' },
          { k: 'e', label: '自定义行动（直接输入）', kind: 'custom' }
        ]
      }
    ];
  }

  /* ---------------- 回合主循环 ---------------- */
  function nextNode(first) {
    if (st.flags.dying) { presentDying(); return; }
    if (st.pc.hp.cur <= 0) { st.pc.hp.cur = 0; enterDying('伤重'); return; }
    if (st.combat) { presentCombat(); return; }
    var script = st.flags.script || [];
    if (st.flags.scriptIdx < script.length) { presentScript(); return; }
    presentScene(first);
  }
  /* 濒死状态下重新给出自救选项（不重复打印面板） */
  function presentDying() {
    var ds = st.counters.ds || { ok: 0, fail: 0 };
    pushText('生死豁免：成功 ' + ds.ok + '/3 · 失败 ' + ds.fail + '/3。人还倒在' + st.place + '。', 'p-sys');
    var a = anchorNext();
    pushNode({ kind: 'death', label: '濒死', detail: '豁免 ' + ds.ok + '/' + ds.fail, anchor: a });
    renderOpts([
      { k: 'a', label: '咬牙撑住：掷生死豁免（d20 >= 10）', kind: 'bold', act: 'struggle' },
      { k: 'b', label: '灌下药水或让人包扎', kind: 'careful', act: 'heal' },
      { k: 'c', label: '呼救：喊人来', kind: 'social', act: 'callhelp' },
      { k: 'd', label: '不再挣扎，听凭发生', kind: 'careful', act: 'yield' },
      { k: 'e', label: '自定义行动（直接输入）', kind: 'custom', act: 'custom' }
    ]);
    hint('濒死：三次成功稳定，三次失败即死');
    showQuick(); renderSide(); save();
  }
  function presentScript() {
    var node = st.flags.script[st.flags.scriptIdx];
    var a = anchorNext();
    push('<p class="tx">' + esc(ENG.time.stamp(st)) + '</p>', 'p-time');
    pushText(node.text, 'p-text');
    pushNode({ kind: 'open', label: node.title || '开篇', detail: (node.text || '').slice(0, 36), anchor: a });
    renderOpts(node.opts || defaultOpts('city'));
    hint('开篇剧本 · 第 ' + (st.flags.scriptIdx + 1) + '/' + st.flags.script.length + ' 节（a-e 选择，e 可自定义）');
    showQuick(); renderSide(); save();
  }
  function presentScene(first) {
    var reg = ENG.world.region(st.place) || {};
    /* 按设定集里的地区类型决定给哪套选项，而不是猜地名 */
    var kind = (reg.kind === 'city') ? 'city' : (reg.kind === 'town' ? 'town' : 'wild');
    if (!reg.kind) kind = /城|镇|堡|村|港|广场/.test(st.place) ? 'city' : 'wild';
    var ctx = narrCtx();
    var lead = NARR ? NARR.scene(kind === 'wild' ? 'wild' : 'city', ctx) : '';
    var a = anchorNext();
    var warn = (st.pc.thirst !== '正常' || st.pc.hunger === '饥饿') ? '　［' + st.pc.hunger + ' / ' + st.pc.thirst + '］' : '';
    push('<p class="tx">' + esc(ENG.time.stamp(st)) + '　' + esc(ENG.time.weather(st)) + '　' +
      esc(st.place + (reg.threat ? '（威胁 ' + reg.threat[0] + '-' + reg.threat[1] + '）' : '')) + esc(warn) + '</p>', 'p-time');
    pushText(lead, 'p-text');
    if (first) {
      pushText('你站在' + st.place + '的地界上。' + (reg.desc || ''), 'p-text');
      var lg = ENG.table.legend(st.region);
      if (lg && ENG.chance(0.5)) pushText('当地人说：' + lg, 'p-pick');
    }
    var q = activeQuest();
    if (q) pushText('委托还压在怀里：' + q.name + '（' + q.place + '）。', 'p-pick');
    pushNode({ kind: q ? 'task' : 'scene', label: q ? '任务' : '场景', detail: (q ? q.name + ' · ' : '') + st.place, anchor: a });
    var baseOpts = withNeeds(q ? questOpts(q) : defaultOpts(kind));
    if (aiOn()) {
      /* 联网时不再先弹离线选项：先占位，等模型把这一回合的选项算出来再就地换上 */
      renderOptsLoading();
      hint('AI 正在推算这一回合的选项…（也可以直接在下面打字）');
    } else {
      renderOpts(baseOpts);
      hint('a-e 选择　·　也可以直接在下面打字（等同 e 自定义）');
    }
    showQuick(); renderSide(); save();
    /* 联网时让 AI 按设定集写这四格的内容（act 认不出就退回上面那组引擎选项） */
    aiRefreshOptions(kind, baseOpts, q);
  }
  function narrCtx(extra) {
    var pc = st.pc;
    var c = {
      turn: st.turn, place: st.place, terrain: st.terrain, month: st.time.month, day: st.time.day,
      time: ENG.time.shichen(st.time), weather: ENG.time.weather(st), pc: pc.name, race: pc.raceName,
      cls: pc.clsName, level: pc.level, hp: Math.round(pc.hp.cur), hpMax: pc.hp.max, gold: ENG.money.fmt(ENG.money.total(st))
    };
    for (var k in (extra || {})) c[k] = extra[k];
    return c;
  }
  /* 饥渴不满时，把「补给」摆到第一位：环境给过提示，就得给得出动作。
     注意不能把「自定义」挤掉——它永远是最后一项。 */
  function withNeeds(list) {
    var pc = st.pc;
    var need = (pc.thirst === '脱水' || pc.thirst === '濒危' || pc.hunger === '饥饿');
    if (!need) return list;
    var warn = pc.thirst === '濒危' ? '（再拖就没命了）' : '（再不补给要出事）';
    var custom = list.filter(function (o) { return o.kind === 'custom'; })[0] || null;
    var others = list.filter(function (o) { return o.kind !== 'custom'; });
    var out = [{ k: 'a', label: '先补给：喝水、吃干粮' + warn, kind: 'careful', act: 'eat' }];
    others.slice(0, custom ? 3 : 4).forEach(function (o, i) {
      var c = {}; for (var k in o) c[k] = o[k];
      c.k = 'abcde'[i + 1];
      out.push(c);
    });
    if (custom) {
      var cc = {}; for (var k2 in custom) cc[k2] = custom[k2];
      cc.k = 'abcde'[out.length];
      out.push(cc);
    }
    return out;
  }
  function questOpts(q) {
    return [
      { k: 'a', label: '循线追下去：按委托给的方向推进（顺势而为）', kind: 'safe', act: 'quest' },
      { k: 'b', label: '直闯：先冲进去再说（剑走偏锋）', kind: 'bold', act: 'bold' },
      { k: 'c', label: '先探地形与人事（谨慎观察）', kind: 'careful', act: 'careful' },
      { k: 'd', label: '歇一夜，明日再动（休息）', kind: 'careful', act: 'rest' },
      { k: 'e', label: '自定义行动（直接输入）', kind: 'custom', act: 'custom' }
    ];
  }
  function threatLabel() {
    var reg = ENG.world.region(st.place) || {};
    var th = reg.threat || null;
    if (!th) return '';
    return '（威胁 ' + th[0] + '-' + th[1] + '）';
  }
  function defaultOpts(kind) {
    if (kind === 'city') {
      return [
        { k: 'a', label: '打听消息：酒馆、告示板、闲人（顺势而为）', kind: 'safe', act: 'inquire' },
        { k: 'b', label: '去冒险者公会看委托，接一票（剑走偏锋）', kind: 'bold', act: 'guild' },
        { k: 'c', label: '逛市集与铺子，先看物价（谨慎观察）', kind: 'careful', act: 'shop' },
        { k: 'd', label: '找地方吃喝住下，恢复体力（休息）', kind: 'careful', act: 'rest' },
        { k: 'e', label: '自定义行动（直接输入）', kind: 'custom', act: 'custom' }
      ];
    }
    if (kind === 'town') {
      return [
        { k: 'a', label: '在村里打听消息，问清这里出了什么事（顺势而为）', kind: 'safe', act: 'inquire' },
        { k: 'b', label: '出村往野地里走，循着痕迹追下去' + threatLabel() + '（剑走偏锋）', kind: 'bold', act: 'forward' },
        { k: 'c', label: '先看清楚：地形、脚印、风向（谨慎观察）', kind: 'careful', act: 'careful' },
        { k: 'd', label: '找户人家借宿，歇一夜（休息）', kind: 'careful', act: 'rest' },
        { k: 'e', label: '自定义行动（直接输入）', kind: 'custom', act: 'custom' }
      ];
    }
    return [
      { k: 'a', label: '顺路前行：沿当前地界往外走（顺势而为）', kind: 'safe', act: 'forward' },
      { k: 'b', label: '偏要走那处险地' + threatLabel() + '（剑走偏锋）', kind: 'bold', act: 'bold' },
      { k: 'c', label: '先看清楚再动：地形、脚印、风向（谨慎观察）', kind: 'careful', act: 'careful' },
      { k: 'd', label: '扎营歇息，埋锅造饭（休息）', kind: 'careful', act: 'rest' },
      { k: 'e', label: '自定义行动（直接输入）', kind: 'custom', act: 'custom' }
    ];
  }
  function presentCombat() {
    var cb = st.combat, ctx = narrCtx({ target: cb.foes[0] ? cb.foes[0].name : '', round: cb.round });
    var a = anchorNext();
    push('<p class="tx">' + esc(ENG.time.stamp(st)) + '</p>', 'p-time');
    pushText(NARR ? NARR.scene('fight', ctx) : '接敌。', 'p-text');
    if (!cb.shown) { pushPanel(PANEL.combat(st)); cb.shown = true; }
    else pushText(combatLine(st), 'p-sys');
    pushNode({ kind: 'fight', label: '交战', detail: cb.foes.map(function (f) { return f.name; }).join('、'), anchor: a });
    var opts = [];
    cb.foes.forEach(function (f, i) { if (f.hp > 0 && i < 3) opts.push({ k: 'abc'[i], label: '攻击 ' + f.name + '（AC ' + f.ac + '）', kind: 'safe', act: 'attack', target: i }); });
    var pads = [['稳住，找空当（防御）', 'careful'], ['贴地翻滚，避开正面（防御）', 'careful'], ['咬牙顶上去（防御）', 'bold']];
    var p = 0;
    while (opts.length < 3) { opts.push({ k: 'abc'[opts.length], label: pads[p % pads.length][0], kind: pads[p % pads.length][1], act: 'defend' }); p++; }
    opts.push({ k: 'd', label: '撤退：脱离接触（敏捷对抗）', kind: 'bold', act: 'flee' });
    opts.push({ k: 'e', label: '自定义行动（直接输入）', kind: 'custom', act: 'custom' });
    renderOpts(opts.slice(0, 5));
    hint('战斗第 ' + cb.round + ' 轮　·　完整战斗面板见右侧「战斗面板」按钮');
    showQuick(); renderSide(); save();
  }
  /* 战斗中的紧凑行：完整面板只在开打时印一次，之后每轮一行 */
  function combatLine(st) {
    var cb = st.combat, pc = st.pc;
    if (!cb) return '';
    return '第 ' + cb.round + ' 轮 · 你 ' + Math.max(0, Math.round(pc.hp.cur)) + '/' + pc.hp.max + ' · ' +
      cb.foes.map(function (f) { return f.name + ' ' + (f.hp <= 0 ? '已倒' : Math.max(0, Math.round(f.hp)) + '/' + f.hpMax); }).join(' · ') +
      ((pc.cond || []).length ? ' · 自身：' + pc.cond.join('、') : '');
  }
  function activeQuest() {
    var q = (st.quests || []).filter(function (x) { return x.state === '进行中'; });
    return q[0] || null;
  }

  /* ---------------- 联网：选项由 AI 写内容，事件由 AI 写内容 ----------------
     两条底线不变：(1) 每个选项的 act 必须是引擎支持的，认不出就把那一格退回引擎自带的选项，
     所以永远不会出现点不动的按钮；(2) 事件「发生不发生、多重」由引擎掷，AI 只写「是什么」。 */
  var ROLE_ACTS = {
    safe: ['forward', 'inquire', 'quest', 'guild', 'work', 'shop'],
    bold: ['bold', 'attack', 'cast', 'travelfar', 'longtrip'],
    careful: ['careful', 'look', 'shop', 'train'],
    rest: ['rest', 'eat', 'heal', 'pray', 'defend']
  };
  var aiOptToken = 0;          /* 换场次就作废旧请求，防止上一回合的选项盖住这一回合 */
  function aiOn() { return !!(global.AI && global.AI.on && global.AI.ready && global.AI.options); }
  /* 这一带真有的怪物名：AI 只能从里面挑，自造的名字会被丢掉 */
  function monsterNamesHere() {
    var ms = (WD.MONSTERS || []).filter(function (m) {
      return (m.habitat || []).some(function (h) {
        return h === st.terrain || (h && st.terrain && (h.indexOf(st.terrain) >= 0 || st.terrain.indexOf(h) >= 0));
      });
    }).map(function (m) { return m.name; });
    return ms.slice(0, 60);
  }
  /* 把 AI 的四格并进引擎选项：act 认不出、文字太短太长，都退回引擎那一格 */
  function mergeAiOptions(base, ai) {
    var out = [], custom = null;
    (base || []).forEach(function (o) { if (o.kind === 'custom') custom = o; });
    var roles = ['safe', 'bold', 'careful', 'rest'];
    var byRole = {};
    (base || []).forEach(function (o) {
      if (o.kind === 'custom') return;
      if (o.kind === 'safe' && !byRole.safe) byRole.safe = o;
      else if (o.kind === 'bold' && !byRole.bold) byRole.bold = o;
      else if (o.kind === 'careful' && !byRole.careful) byRole.careful = o;
      else if (!byRole.rest) byRole.rest = o;
    });
    var got = (ai && ai.options) || [];
    roles.forEach(function (role, i) {
      var baseOpt = byRole[role] || (base || []).filter(function (o) { return o.kind !== 'custom'; })[i] || null;
      var aiOpt = null;
      got.forEach(function (g) { if (g && g.role === role) aiOpt = g; });
      var pick = null;
      var labelOk = aiOpt && typeof aiOpt.label === 'string' && aiOpt.label.length >= 6 && aiOpt.label.length <= 40;
      if (aiOpt && aiOpt.act && ROLE_ACTS[role].indexOf(aiOpt.act) >= 0 && labelOk) {
        pick = { k: 'abcde'[out.length], label: aiOpt.label, kind: (baseOpt && baseOpt.kind) || role, act: aiOpt.act };
      } else if (baseOpt) {
        pick = { k: 'abcde'[out.length], label: baseOpt.label, kind: baseOpt.kind, act: baseOpt.act };
        if (baseOpt.target) pick.target = baseOpt.target;
      }
      if (pick) out.push(pick);
    });
    if (custom) out.push({ k: 'abcde'[out.length], label: custom.label, kind: 'custom', act: 'custom' });
    return out;
  }
  /* 请求 AI 选项并就地换掉当前这一组。
     联网时不给引擎选项打前站：先是一张「正在推算」的占位，模型回来后就地换成真选项；
     模型失败/超时就把占位换成引擎那一组，玩家永远不会卡在「没有选项」的状态。 */
  function aiRefreshOptions(kind, base, quest) {
    if (!aiOn()) return;
    var token = ++aiOptToken;
    if (!liveOptGroup()) return;                 /* 玩家已经点过了，不再替换 */
    var rel = ROLE_ACTS.safe.concat(ROLE_ACTS.bold, ROLE_ACTS.careful, ROLE_ACTS.rest);
    var settle = false;
    var useEngine = function (why) {
      if (settle || token !== aiOptToken || !liveOptGroup()) return;
      settle = true;
      replaceLiveOptions(base);
      if (why) hint('这次按引擎给的选项走（' + why + '）。');
    };
    var timer = global.setTimeout(function () { useEngine('模型太久没回'); }, 14000);
    global.AI.options(kind, quest ? quest.name : '', rel).then(function (r) {
      global.clearTimeout(timer);
      if (settle || token !== aiOptToken) return;
      if (!r || !r.ok || !r.options || !r.options.length) { useEngine('模型没给出合规选项'); return; }
      if (!liveOptGroup()) return;                          /* 玩家在这段时间里点了 */
      var merged = mergeAiOptions(base, r);
      if (merged.length < 4) { useEngine('模型的选项不全'); return; }
      settle = true;
      replaceLiveOptions(merged);
      if (r.note) hint('AI 说：' + r.note + '　·　a-e 选择，e 仍可自己写');
    }, function () { global.clearTimeout(timer); useEngine('模型没连上'); });
  }
  /* 引擎说「这一趟要出事」：让 AI 写是什么事，数值仍由引擎结算 */
  function aiFireEvent(kind, allowed, severity, apply) {
    if (!aiOn() || !global.AI.fire) return false;
    global.AI.fire(kind, allowed, severity).then(function (r) {
      if (!r || !r.ok || !r.event) return;
      apply(r.event);
    }, function () { /* 保持引擎原判 */ });
    return true;
  }
  function doTurn(k, raw, ai) {
    var opt = null;
    (curOpts || []).forEach(function (o) { if (o.k === k) opt = o; });
    var act = opt ? (opt.act || 'custom') : (raw != null ? 'custom' : 'forward');
    if (raw != null) { act = 'custom'; opt = { k: 'e', label: raw }; }
    push('<p class="tx">' + esc('〔' + k.toUpperCase() + '〕' + (opt && opt.label ? opt.label : '')) + '</p>', 'p-pick');

    /* 濒死状态下，除了自救与放手，别的动作都不成立 */
    if (st.flags.dying && ['struggle', 'heal', 'callhelp', 'yield'].indexOf(act) < 0) act = 'struggle';
    if (st.flags.script && st.flags.scriptIdx < st.flags.script.length) {
      st.flags.scriptIdx++;
      st.turn++;
      finishTurn(act, { text: '你选定了方向。' });
      return;
    }
    st.turn++;
    var res = ACT[act] ? ACT[act](st, raw, opt, ai) : ACT.custom(st, raw || (opt && opt.label) || '', opt, ai);
    finishTurn(act, res);
  }
  function finishTurn(act, res) {
    res = res || {};
    /* 引擎判定「要出事」，但「出的是什么事」交给 AI 写：先落引子，拿到再结算；
       拿不到（超时/报错/离线）就用引擎自己那一行，流程与从前一模一样。 */
    if (res.aiEventSpec && aiOn() && global.AI.fire) { resolveAiEventThenFinish(res); return; }
    if (res.text) pushText(res.text, res.quote ? 'p-quote' : 'p-text');
    (res.extra || []).forEach(function (x) { pushText(x, 'p-text'); });
    finishTurnTail(res);
  }
  function resolveAiEventThenFinish(res) {
    var spec = res.aiEventSpec;
    if (res.text) pushText(res.text, res.quote ? 'p-quote' : 'p-text');
    (res.extra || []).forEach(function (x) { pushText(x, 'p-text'); });
    pushText('〔' + (spec.label || '路上出事') + '〕让 AI 写这一段…', 'p-sys');
    var done = false;
    var finish = function () { if (done) return; done = true; finishTurnTail(res); };
    var fallback = function () {
      var fb = spec.fallback ? spec.fallback() : null;
      if (fb) {
        (fb.extra || []).forEach(function (x) { pushText(x, 'p-text'); });
        if (fb.combat) { res.combat = fb.combat; res.combatName = fb.combatName || '路上出事'; }
        if (fb.cause) res.cause = fb.cause;
      }
      finish();
    };
    var timer = global.setTimeout(fallback, 12000);
    global.AI.fire(spec.kind, spec.allowed || [], spec.severity || '').then(function (r) {
      global.clearTimeout(timer);
      if (!r || !r.ok || !r.event) { fallback(); return; }
      var ev = r.event, notes = [];
      pushText(ev.text, 'p-text');
      if (ev.foes && ev.foes.length) {
        var foes = ev.foes.map(function (nm) {
          var m = (WD.MONSTERS || []).filter(function (x) { return x.name === nm; })[0];
          return m ? ENG.combat.foeFromMonster(m, st.pc.level) : null;
        }).filter(Boolean);
        if (foes.length) {
          res.combat = foes; res.combatName = '路上出事 · ' + ev.kind;
          notes.push('对手：' + foes.map(function (f) { return f.name; }).join('、') + '（按本地怪物表生成）');
        }
      }
      if (ev.dmg) {
        var d = ENG.rollDice(ev.dmg);
        st.pc.hp.cur -= d;
        notes.push('生命 -' + d + '（' + ev.dmg + '，本地掷）');
        res.cause = '路上出事：' + ev.kind;
      }
      if (ev.dc) {
        var mod = ENG.attrMod(st.pc.attrs.con) + ENG.profBonus(st.pc.level);
        var rr = ENG.check(mod, ev.dc, 0);
        notes.push('判定：体质 d20(' + rr.roll + ') + ' + mod + ' vs DC ' + ev.dc + '　' + (rr.ok ? '扛住了' : '吃了亏'));
        if (!rr.ok && !ev.dmg) { var d2 = ENG.rollDice('1d6'); st.pc.hp.cur -= d2; notes.push('生命 -' + d2 + '。'); }
      }
      if (ev.loot) { ENG.item.add(st, ev.loot); notes.push('拾得：' + ev.loot); }
      if (ev.why) notes.push('缘由：' + ev.why);
      notes.push('（这一段由 AI 写，敌人与伤害仍按本地表结算）');
      notes.forEach(function (x) { pushText(x, 'p-text'); });
      finish();
    }, function () { global.clearTimeout(timer); fallback(); });
  }
  function finishTurnTail(res) {
    if (res.panel) pushPanel(res.panel);
    if (res.itemPanel) pushPanel(res.itemPanel);
    if (res.combat && !st.combat) ENG.combat.start(st, res.combat, { name: res.combatName || '遭遇' });
    /* 敌人全倒下就把战斗状态收干净，免得下一轮对着尸体挥刀 */
    if (st.combat && ENG.combat.over(st)) {
      pushText('战斗结束。' + st.combat.foes.map(function (f) { return f.name; }).join('、') + '都躺下了。', 'p-sys');
      st.combat = null;
    }
    ENG.char.derive(st);
    if (st.pc.hp.cur <= 0) {
      if (st.flags.dying) { rollDying(res.cause); return; }
      enterDying(res.cause); return;
    }
    divider('本 轮 结 果 已 呈 现');
    vitalLine();
    showQuick();
    renderSide();
    save();
    if (st.combat) presentCombat(); else nextNode(false);
  }
  /* 生命归零 = 重伤濒死：进入生死豁免，不倒就还有下一轮 */
  function enterDying(cause) {
    st.pc.hp.cur = 0;
    st.flags.dying = true;
    st.flags.dyingCause = cause || '伤重';
    st.counters.ds = { ok: 0, fail: 0 };
    st.pc.status = '濒死';
    st.pc.cond = st.pc.cond || [];
    if (st.pc.cond.indexOf('昏迷') < 0) st.pc.cond.push('昏迷');
    st.combat = null;
    var a = anchorNext();
    pushPanel(PANEL.notice('重 伤 濒 死', [
      '生命归零，你倒在' + st.place + '的地上（' + (cause || '伤重') + '）。',
      '生死豁免：每回合掷 d20，10 以上记一次成功，三次成功即稳定在 1 点生命；',
      '三次失败，这一局到此为止。传奇级以下没有复活魔法。',
      '也可以尝试自救：灌药、包扎、呼救。'
    ], 'coral'));
    pushNode({ kind: 'death', label: '濒死', detail: cause || '伤重', anchor: a });
    renderOpts([
      { k: 'a', label: '咬牙撑住：掷生死豁免（d20 >= 10）', kind: 'bold', act: 'struggle' },
      { k: 'b', label: '灌下药水或让人包扎（若有药水/同伴）', kind: 'careful', act: 'heal' },
      { k: 'c', label: '呼救：喊人来（魅力判定）', kind: 'social', act: 'callhelp' },
      { k: 'd', label: '不再挣扎，听凭发生', kind: 'careful', act: 'yield' },
      { k: 'e', label: '自定义行动（直接输入）', kind: 'custom', act: 'custom' }
    ]);
    hint('濒死：三次成功可稳定，三次失败即死');
    showQuick(); renderSide(); save();
  }
  function rollDying(cause) {
    var r = ENG.char.deathSave(st);
    var a = anchorNext();
    pushText('生死豁免：d20 = ' + r.roll + '　' + (r.ok ? '成功 +1' : '失败 +1') +
      '（成功 ' + r.ds.ok + '/3 · 失败 ' + r.ds.fail + '/3）', 'p-sys');
    if (r.dead) { pushNode({ kind: 'death', label: '死亡', detail: cause || '伤重', anchor: a }); doDeath(st.flags.dyingCause || cause); return; }
    if (r.stable) {
      st.flags.dying = false;
      /* 稳住不等于痊愈：回到两成生命，逼玩家去养伤，但不至于下回合又倒 */
      st.pc.hp.cur = Math.max(2, Math.round(st.pc.hp.max * 0.2));
      st.pc.cond = (st.pc.cond || []).filter(function (x) { return x !== '昏迷'; });
      ENG.char.addFatigue(st, 1);
      var inj = ENG.chance(0.45) ? ENG.char.injure(st) : null;
      st.pc.deeds.push('在' + st.place + '从濒死里撑了回来（' + ENG.time.stampShort(st) + '）。');
      ENG.char.derive(st);
      pushPanel(PANEL.notice('稳 住 了', [
        '血止住了。你活下来，代价留在身上。',
        inj ? ('永久损伤：' + inj.name + '（' + inj.eff + '）') : '这次没落下残伤。',
        '生命回到 ' + st.pc.hp.cur + ' 点，疲劳 +1；接下来得找地方养。'
      ], 'matcha'));
      pushNode({ kind: 'rest', label: '醒转', detail: '从濒死中稳定', anchor: a });
      divider('本 轮 结 果 已 呈 现');
      vitalLine(); showQuick(); renderSide(); save();
      nextNode(false);
      return;
    }
    pushNode({ kind: 'death', label: '濒死', detail: '生死豁免 ' + r.ds.ok + '/' + r.ds.fail, anchor: a });
    renderOpts([
      { k: 'a', label: '再撑一次（生死豁免）', kind: 'bold', act: 'struggle' },
      { k: 'b', label: '灌药、包扎', kind: 'careful', act: 'heal' },
      { k: 'c', label: '呼救', kind: 'social', act: 'callhelp' },
      { k: 'd', label: '听凭发生', kind: 'careful', act: 'yield' },
      { k: 'e', label: '自定义行动（直接输入）', kind: 'custom', act: 'custom' }
    ]);
    hint('生死豁免 ' + r.ds.ok + ' 成功 / ' + r.ds.fail + ' 失败');
    showQuick(); renderSide(); save();
  }
  function doDeath(cause) {
    st.phase = 'dead';
    st.pc.hp.cur = 0;
    var a = anchorNext();
    pushPanel(PANEL.death(st, { cause: cause }));
    pushText(NARR ? NARR.scene('death', narrCtx({ cause: cause })) : '你死了。', 'p-text');
    pushNode({ kind: 'death', label: '死亡', detail: cause, anchor: a });
    presentDead();
    save();
  }

  /* 行动实现表 */
  var ACT = {};
  /* 推进时间：默认推当前局的状态；显式传入 target 时推那一个
     （行动函数都带 st 参数，避免「改了别人家的钟」这类隐患） */
  function advance(hours, note, target) {
    var S = target || st;
    ENG.time.advance(S, { hours: hours });
    var notes = [];
    if (S.pc && S.pc.cond && S.pc.cond.length) notes = ENG.combat.statusTick(S) || [];
    return { hours: hours, notes: notes };
  }
  function gain(xp, gold, note) {
    var out = [];
    if (xp) { var up = ENG.char.addXp(st, xp); out.push('经验 +' + xp + '。'); if (up) out.push('LEVELUP'); }
    if (gold) { ENG.money.gain(st, gold * (ENG.money.RATE.gp || 1000)); out.push('金币 +' + gold + ' GP。'); }
    return out;
  }
  function encounter(terrain) {
    var row = ENG.table.wild(terrain);
    if (!row) return null;
    return row;
  }
  ACT.forward = function (st) {
    var reg = ENG.world.region(st.place) || {};
    var q = activeQuest();
    /* 没有委托在身时，顺势而为有时就是「走到下一个地方去」 */
    if (!q && ENG.chance(0.4)) {
      var nb = neighborRegion(st);
      if (nb) {
        var r2 = travelTo(st, nb.name, ENG.int(1, 3));
        (r2.extra = r2.extra || []).unshift('你顺着路往下走。');
        return r2;
      }
    }
    advance(ENG.int(3, 7));
    var text = NARR ? NARR.scene('travel', narrCtx()) : '你往前走了半天。';
    var extra = [], panel = null, combat = null;
    if (q && ENG.chance(0.5)) {
      q.progress = Math.min(100, (q.progress || 0) + ENG.int(20, 45));
      extra.push('你离「' + q.place + '」近了一步（进度 ' + q.progress + '%）。');
      if (q.progress >= 100) {
        q.state = '完成';
        ENG.money.gain(st, q.reward * (ENG.money.RATE.gp || 1000));
        ENG.rep.add(st, q.giver, 6);
        var ups = ENG.char.addXp(st, 420 + q.dc * 30);
        extra.push('委托「' + q.name + '」交差了：' + q.reward + ' GP 入手，' + q.giver + ' 的账上记了你一笔。');
        if (ups) extra.push('LEVELUP');
        st.pc.deeds.push('完成委托「' + q.name + '」（' + q.giver + '）。');
      }
    }
    var row = encounter(st.terrain);
    if (row) {
      panel = PANEL.notice('遭 遇 · ' + row.name, [
        'd20 = ' + row.d20 + '　' + row.desc,
        row.check ? '需要' + row.check + '豁免 DC ' + row.dc : '无需豁免',
        row.dmg ? '伤害 ' + row.dmg : '', row.reward ? '可得 ' + row.reward : ''
      ], 'grayblue');
      if (row.check && row.dc) {
        var key0 = attrKeyOf(row.check);
        var rr = ENG.check(ENG.attrMod(st.pc.attrs[key0]), row.dc, 0);
        if (!rr.ok && row.dmg) {
          var d = ENG.rollDice(row.dmg);
          st.pc.hp.cur -= d;
          extra.push('豁免失败（d20 = ' + rr.roll + ' + ' + ENG.attrMod(st.pc.attrs[key0]) + ' vs DC ' + row.dc + '）：生命 -' + d + '。');
        } else if (rr.ok) extra.push('豁免通过（d20 = ' + rr.roll + ' vs DC ' + row.dc + '）。');
      }
      if (row.fight) { combat = ENG.combat.spawnFoe(st.terrain, st.pc.level); extra.push('动手了。'); }
      if (row.reward && ENG.chance(0.6)) {
        ENG.item.add(st, row.reward);
        extra.push('你拿到了：' + row.reward + '。');
      }
      /* 探索发现计入经验（第二十二卷第五章） */
      extra = extra.concat(gain(80 + st.pc.level * 15, 0));
    }
    return { text: text, extra: extra, panel: panel, combat: combat, combatName: row ? row.name : '' };
  };
  function attrKeyOf(cn) {
    var m = { '力量': 'str', '敏捷': 'dex', '体质': 'con', '智力': 'int', '感知': 'wis', '魅力': 'cha' };
    return m[cn] || 'dex';
  }
  /* 「治疗微伤药水」写成「微伤药水」也认 */
  function fuzzyItem(want) {
    var all = ENG.item.all();
    for (var i = 0; i < all.length; i++) {
      if (all[i].name.indexOf(want) >= 0 || want.indexOf(all[i].name) >= 0) return all[i];
    }
    var short = want.replace(/^(一瓶|一把|一件|一副|一个|张|把|瓶|件)/, '');
    for (var j = 0; j < all.length; j++) {
      if (all[j].name.indexOf(short) >= 0 || short.indexOf(all[j].name) >= 0) return all[j];
    }
    return null;
  }
  /* 隔壁地区：同国优先，其次同地形，用来做「顺势往前走」的落点 */
  function neighborRegion(st) {
    var all = WD.REGIONS || [];
    var cur = ENG.world.region(st.place) || {};
    var pool = all.filter(function (r) { return r.name !== st.place && r.nation && r.nation === cur.nation; });
    if (!pool.length) pool = all.filter(function (r) { return r.name !== st.place && r.terrain === st.terrain; });
    if (!pool.length) pool = all.filter(function (r) { return r.name !== st.place; });
    return ENG.pick(pool);
  }
  ACT.bold = function (st) {
    advance(ENG.int(4, 9));
    var dc = 13 + Math.floor(st.pc.level / 3) + ENG.int(0, 3);
    var key = ENG.pick(['str', 'dex', 'con', 'cha']);
    var r = ENG.check(ENG.attrMod(st.pc.attrs[key]) + ENG.profBonus(st.pc.level), dc, 0);
    var text = NARR ? NARR.scene('wild', narrCtx({ roll: r.roll, dc: dc, ok: r.ok })) : '你赌了一把。';
    var extra = ['冒险判定：' + ENG.attrCN(key) + ' d20(' + r.roll + ') + ' + (ENG.attrMod(st.pc.attrs[key]) + ENG.profBonus(st.pc.level)) + ' vs DC ' + dc + '　' + (r.ok ? '成功' : '失败')];
    var combat = null, panel = null;
    if (r.ok) {
      var xp = 60 + dc * 6, gold = ENG.int(5, 40) * st.pc.level;
      extra = extra.concat(gain(xp, gold));
      if (ENG.chance(0.55)) { var it = ENG.pick(ENG.item.all()); if (it) { ENG.item.add(st, it); extra.push('翻出了' + it.name + '。'); } }
      st.pc.deeds.push('在' + st.place + '做了一件不要命的事，成了。');
    } else {
      var d = ENG.rollDice('1d6+' + Math.floor(st.pc.level / 2));
      st.pc.hp.cur -= d;
      extra.push('失手：生命 -' + d + '。');
      if (ENG.chance(0.45)) combat = ENG.combat.spawnFoe(st.terrain, st.pc.level);
      if (st.pc.hp.cur <= 0) extra.push('你倒下了。');
    }
    return { text: text, extra: extra, panel: panel, combat: combat, combatName: '硬闯的代价' };
  };
  ACT.careful = function (st) {
    advance(ENG.int(1, 3));
    var key = 'wis';
    var r = ENG.check(ENG.attrMod(st.pc.attrs[key]) + ENG.profBonus(st.pc.level) + (st.pc.skills.indexOf('觉察') >= 0 ? 2 : 0), 12, 0);
    var extra = ['观察判定：d20(' + r.roll + ') vs DC 12　' + (r.ok ? '看清楚了' : '没看出什么')];
    var text = NARR ? NARR.scene('wild', narrCtx({ roll: r.roll, dc: 12, ok: r.ok })) : '你停下来看了一会儿。';
    if (r.ok) {
      var lg = ENG.table.legend(st.region);
      if (lg) extra.push('你想起本地的一桩旧事：' + lg);
      var ru = ENG.table.rumor();
      if (ru) extra.push('顺带听到一句风声：' + ru.text + '（' + ru.truth + '）');
      extra = extra.concat(gain(110, 0));
    }
    return { text: text, extra: extra, panel: null };
  };
  ACT.rest = function (st) {
    advance(8);
    var r = ENG.char.restLong(st);
    var cooled = ENG.travel.cool(st, 1);
    var night = ENG.table.night();
    var extra = ['长休 8 小时：生命 +' + r.heal + '，法力回满，疲劳降为 ' + r.fatigue + ' 级。'];
    if (ENG.travel.heat(st) < cooled + 1 && cooled >= 0) extra.push('歇下来，出行热度降到 ' + cooled + '。');
    var panel = null, combat = null;
    if (night) {
      panel = PANEL.notice('夜 间 · ' + night.name, [night.desc, night.check ? '需要' + night.check + '豁免 DC ' + night.dc : ''], 'lav');
      if (night.dmg && ENG.chance(0.5)) {
        var d = ENG.rollDice(night.dmg); st.pc.hp.cur -= d;
        extra.push('夜里出了事：生命 -' + d + '。');
      }
      if (/野兽|袭击|骚扰/.test(night.name)) combat = ENG.combat.spawnFoe(st.terrain, st.pc.level);
    }
    return { text: NARR ? NARR.scene('camp', narrCtx()) : '你睡了一觉。', extra: extra, panel: panel, combat: combat, combatName: '夜袭' };
  };
  ACT.inquire = function (st) {
    advance(2);
    var city = ENG.table.city();
    var r = ENG.check(ENG.attrMod(st.pc.attrs.cha) + ENG.profBonus(st.pc.level), 12, 0);
    var extra = ['交涉判定：d20(' + r.roll + ') vs DC 12　' + (r.ok ? '有人愿意说' : '没人搭理你')];
    var panel = null;
    if (city) panel = PANEL.notice('城 市 事 件 · d12=' + city.d12 + ' ' + city.name, [city.desc], 'grayblue');
    if (r.ok) {
      var ru = ENG.table.rumor();
      if (ru) extra.push('酒馆里的说法：' + ru.text + '（' + ru.truth + '）');
      ENG.rep.add(st, '冒险者公会', 1);
      extra = extra.concat(gain(90, 0));
      /* 打听消息也能碰上活计：告示板、村口、酒桌 */
      if (!activeQuest() && ENG.chance(0.4)) {
        var t = ENG.task.generate(st, {});
        t.state = '进行中';
        st.quests.push(t);
        extra.push('有人问你要不要接一桩事：' + t.name + '（' + t.type + ' · ' + t.diff + ' · ' + t.reward + ' GP）。你应下了。');
        panel = PANEL.task(st, t);
      }
    } else if (city && city.opts && city.opts.length) {
      extra.push('眼前有人递话：' + city.opts[0].label);
    }
    return { text: NARR ? NARR.scene('inquiry', narrCtx()) : '你四处问了问。', extra: extra, panel: panel };
  };
  ACT.shop = function (st) {
    advance(2);
    var list = ENG.item.stock(st, 'gear');
    var panel = PANEL.shop(st, list, '市 集 · 价 目');
    st.flags.shop = list.map(function (x) { return x.name; });
    return {
      text: NARR ? NARR.scene('shop', narrCtx()) : '你在市集上转了一圈。', extra: ['想买什么，直接输入「买 <名字>」；也可以输入「卖 <名字>」。'], panel: panel
    };
  };
  ACT.guild = function (st) {
    advance(3);
    var q = ENG.task.generate(st, {});
    st.quests.push(q);
    q.state = '进行中';
    return {
      text: NARR ? NARR.scene('city', narrCtx()) : '公会墙上钉着一排纸。',
      extra: ['你接下了一单：' + q.name + '（' + q.type + ' · ' + q.diff + ' · ' + q.reward + ' GP）。'],
      panel: PANEL.task(st, q)
    };
  };
  ACT.quest = function (st) {
    var q = activeQuest();
    if (!q) return ACT.forward(st);
    advance(ENG.int(3, 8));
    q.progress = Math.min(100, (q.progress || 0) + ENG.int(25, 50));
    var extra = ['委托进度：' + q.progress + '%。'];
    var combat = null, panel = null;
    if (q.progress >= 100) {
      q.state = '完成';
      ENG.money.gain(st, q.reward * (ENG.money.RATE.gp || 1000));
      ENG.rep.add(st, q.giver, 6);
      var ups = ENG.char.addXp(st, 420 + q.dc * 30);
      extra.push('交差：' + q.reward + ' GP 入手，' + q.giver + ' 记了你一笔。');
      if (ups) extra.push('LEVELUP');
      st.pc.deeds.push('完成委托「' + q.name + '」。');
    } else if (ENG.chance(0.45)) {
      combat = ENG.combat.spawnFoe(st.terrain, st.pc.level);
      extra.push('路上撞上了。');
    }
    return { text: NARR ? NARR.scene('travel', narrCtx()) : '你按线索往下走。', extra: extra, panel: panel, combat: combat, combatName: q.name };
  };
  ACT.attack = function (st, raw, opt) {
    /* 对手已经倒光时不该再骰：收家伙，结束战斗 */
    var cb = st.combat;
    var alive = cb ? cb.foes.filter(function (f) { return f.hp > 0; }) : [];
    if (!cb || !alive.length) {
      st.combat = null;
      return { text: '对手都躺下了。你把家伙收回去。', extra: ['战斗结束。'] };
    }
    var r = ENG.combat.playerAttack(st, { target: opt && opt.target });
    if (!r || r.ok === false || !r.roll) {
      st.combat = null;
      return { text: '没有可以打的东西了。', extra: [r && r.text ? r.text : '战斗结束。'] };
    }
    var text;
    var extra = [];
    if (r.hit) {
      text = NARR ? NARR.scene('hit', narrCtx({ target: r.target, dmg: r.dmg, roll: r.roll.roll })) : '命中了。';
      extra.push('命中：d20(' + r.roll.roll + ') + 加值 vs AC ' + (r.roll.dc) + '　伤害 ' + r.dmg + (r.crit ? '（暴击，翻倍）' : ''));
      if (r.killed) {
        extra.push(r.target + '倒下了。');
        if (r.xp) extra.push('经验 +' + r.xp + '。');
        (r.loot || []).forEach(function (d) { ENG.item.add(st, d); extra.push('取到材料：' + d + '。'); });
      }
    } else {
      text = NARR ? NARR.scene('fight', narrCtx({ target: r.target, roll: r.roll.roll })) : '没打中。';
      extra.push('未命中：d20(' + r.roll.roll + ') + 加值 vs AC ' + r.roll.dc + '。');
    }
    var ft = ENG.combat.foeTurn(st);
    ft.hits.forEach(function (h) { extra.push(h.foe + '反击命中，你受 ' + h.dmg + ' 点伤害' + (h.status ? '，' + h.status : '') + '。'); });
    if (!ft.hits.length) extra.push('它们的攻击都落了空。');
    if (ft.down) extra.push(ft.dead ? '你失去意识，血从嘴里出来。' : '你被打倒在地，勉强吊着一口气。');
    if (r.killed) extra.push(combatLine(st));
    return { text: text, extra: extra, panel: r.killed ? PANEL.combat(st) : null, cause: '死于' + (st.combat && st.combat.foes[0] ? st.combat.foes[0].name : '战斗') };
  };
  ACT.defend = function (st) {
    st.pc.ac += 2;
    var ft = ENG.combat.foeTurn(st);
    st.pc.ac -= 2;
    var extra = ['你收势防守，AC 临时 +2。'];
    ft.hits.forEach(function (h) { extra.push(h.foe + '仍然打中，你受 ' + h.dmg + ' 点。'); });
    if (!ft.hits.length) extra.push('这一轮你没挨到。');
    return { text: NARR ? NARR.scene('fight', narrCtx()) : '你稳住呼吸。', extra: extra };
  };
  ACT.flee = function (st) {
    var cb = st.combat;
    var r = ENG.opposed(ENG.attrMod(st.pc.attrs.dex) + ENG.profBonus(st.pc.level), (cb && cb.foes[0] ? cb.foes[0].atk : 2) + 2);
    var extra = ['脱离对抗：你 d20+' + (ENG.attrMod(st.pc.attrs.dex) + ENG.profBonus(st.pc.level)) + '=' + r.a + ' vs 对方 ' + r.b];
    if (r.ok || ENG.chance(0.25)) {
      st.combat = null;
      extra.push('你脱身了。');
      st.pc.deeds.push('在' + st.place + '从' + (cb && cb.foes[0] ? cb.foes[0].name : '敌人') + '手里走脱。');
      return { text: NARR ? NARR.scene('flee', narrCtx()) : '你退了出去。', extra: extra };
    }
    var ft = ENG.combat.foeTurn(st);
    extra.push('没走成。');
    ft.hits.forEach(function (h) { extra.push(h.foe + '追上来咬住你，' + h.dmg + ' 点伤害。'); });
    return { text: NARR ? NARR.scene('fight', narrCtx()) : '你退了两步又被迫站住。', extra: extra };
  };
  /* 自定义行动的理解器：先查「世界内容」，再查「当下状态」。
     顺序：随身物 → 神祇 → 身边人 → 怪物 → 地名/方位 → 任务 → 一般意图。 */
  function interpret(st, s) {
    var text = String(s || '').trim();
    if (!text) return null;
    var out = { act: null, arg: null, why: '' };

    /* 1. 用随身的东西：按物品名找包里的那一件（自定义物品也认） */
    var bagHit = null;
    (st.bag || []).forEach(function (it) {
      if (bagHit) return;
      if (text.indexOf(it.name) >= 0) bagHit = it;
    });
    if (!bagHit) {
      /* 说「药水」「卷轴」这类通名时，找同类的第一件 */
      var kindWant = /药水|药剂/.test(text) ? 'consumable' : (/卷轴/.test(text) ? 'consumable' : (/武器|剑|刀/.test(text) ? 'weapon' : null));
      if (kindWant) (st.bag || []).forEach(function (it) { if (!bagHit && it.kind === kindWant) bagHit = it; });
    }
    if (bagHit && /用|喝|吃|使|拿|掏出|取出|灌|吞|点燃|点|展开|读/.test(text)) {
      return { act: 'useitem', arg: bagHit.name, why: '你身上带着 ' + bagHit.name };
    }

    /* 1b. 点到某件具体的东西、身上却没有：当场说清，不装作没听见。
       只有在「用/喝/掏」这类动作里才拦，免得挡住「我买 X」和别的事。 */
    if (!/买|卖|购|交易|出售|价钱|价格/.test(text)) {
      var named = null;
      ENG.item.all().forEach(function (x) {
        if (!x.name || text.indexOf(x.name) < 0) return;
        if (!named || x.name.length > named.name.length) named = x;
      });
      var useVerb = /用|喝|吃|掏|取|拿|点|展开|读|装备|戴上|穿上|吞|灌|摸出/.test(text);
      var owned = (st.bag || []).some(function (b) { return !!named && b.name === named.name; });
      if (named && useVerb && !owned) {
        /* 把玩家自己加的修饰语带上：「用祖传长弓」报的就是祖传长弓，不是表里的长弓 */
        var at = text.indexOf(named.name), pre = '';
        for (var bi = at - 1, k = 0; bi >= 0 && k < 4; bi--, k++) {
          var ch = text.charAt(bi);
          if (/[，。、！？\s]/.test(ch) || /用|喝|掏|取|拿|点|展开|读|装备|戴上|穿上|吞|灌|摸出|把|将|的|下|出|起|了|着|过|来|去|开/.test(ch)) break;
          pre = ch + pre;
        }
        var shown = pre + named.name;
        return { act: 'noitem', arg: shown, kind: named.kind, price: named.price,
          why: shown + (named.price ? '（铺子里约 ' + named.price + ' GP）' : '') };
      }
    }

    /* 2. 对着哪位神明行事 */
    var god = null;
    (WD.GODS || []).forEach(function (g) {
      if (god) return;
      if (text.indexOf(g.name) >= 0 || (g.org && text.indexOf(g.org) >= 0)) god = g;
    });
    if (god && /祈祷|祷告|拜|求|供奉|祭|sign|pray|求神|上香/.test(text)) {
      return { act: 'pray', arg: god.name, why: god.name + '——' + god.domain };
    }

    /* 3. 身边的人／随从／名人 */
    var who = null;
    (st.team || []).forEach(function (m) { if (!who && text.indexOf(m.name) >= 0) who = m; });
    if (!who) (WD.HEROES || []).forEach(function (h) { if (!who && text.indexOf(h.name) >= 0) who = h; });
    if (who && /问|说|聊|谈|找|请教|商量|告诉|喊|叫/.test(text)) {
      return { act: 'talkto', arg: who.name, why: who.title ? (who.name + '，' + (who.title || '')) : (who.name + '就在近旁') };
    }

    /* 4. 点名打某只怪物：附近有才成立 */
    var mon = null;
    (WD.MONSTERS || []).forEach(function (m) {
      if (mon) return;
      if (text.indexOf(m.name) >= 0) mon = m;
    });
    if (mon && /攻击|砍|杀|打|射|劈|刺|揍|动手|迎上去|冲上去/.test(text)) {
      var here = (m => (m.habitat || []).some(function (h) { return h === st.terrain || (h && st.terrain && (h.indexOf(st.terrain) >= 0 || st.terrain.indexOf(h) >= 0)); }))(mon);
      return { act: 'attackmon', arg: mon.name, why: here ? (mon.name + '在这一带出没') : (mon.name + '的栖息地不在这里（' + (mon.habitat || []).join('、') + '）') };
    }

    /* 5. 地名与方位：说得出地名就往那儿走 */
    var place = null;
    (WD.REGIONS || []).forEach(function (r) { if (!place && text.indexOf(r.name) >= 0) place = r; });
    if (place) {
      if (place.name === st.place) return { act: 'look', arg: place.name, why: '你已经在' + place.name };
      if (GEO && GEO.isAdjacent(st.place, place.name)) return { act: 'travel', arg: place.name, why: '邻地' };
      if (/长途|绕行/.test(text)) return { act: 'longtrip', arg: place.name, why: '多站行程' };
      return { act: 'travelfar', arg: place.name, why: '不相邻，只走得到一站' };
    }
    var dirHit = /往?北|向南|往东|向西/.exec(text);
    if (dirHit && GEO) {
      var near = GEO.adjacentTo(st.place);
      var want = dirHit[0].replace('往', '');
      var match = near.filter(function (x) { return x.dir.indexOf(want.replace('北', '北').replace('向', '')) >= 0; })[0]
        || near.filter(function (x) { return x.dir.indexOf({ '北': '北', '南': '南', '东': '东', '西': '西' }[want.replace('向', '')]) >= 0; })[0];
      if (match) return { act: 'travel', arg: match.name, why: '往' + want + '是' + match.name };
      return { act: 'look', arg: null, why: '这一带你分不清南北，最近的是：' + near.map(function (x) { return x.name; }).join('、') };
    }

    /* 6. 手上的委托 */
    var q = (st.quests || []).filter(function (x) { return x.state === '进行中'; })[0];
    if (q && (text.indexOf(q.name) >= 0 || /委托|任务|查案|线索/.test(text))) {
      return { act: 'quest', arg: q.name, why: '手上的委托：' + q.name + '（' + q.place + '）' };
    }
    return null;
  }
  var INTENT = [
    { k: 'attack', re: /(攻击|砍|杀|打|劈|刺|射|揍|动手|厮杀|开打)/ },
    { k: 'cast', re: /(施法|法术|魔法|念咒|祈祷术|召唤)/ },
    { k: 'steal', re: /(偷|摸包|扒|撬锁|潜行|溜进去|翻窗)/ },
    { k: 'travel', re: /(前往|去|出发|动身|上路|赶路|走向|离开|回)/ },
    { k: 'look', re: /(观察|看|检查|搜查|翻找|探查|打量|侦察)/ },
    { k: 'talk', re: /(打听|问|聊|谈|交涉|说服|劝|交谈|询价)/ },
    { k: 'buy', re: /(买|购|交易|卖|出售)/ },
    { k: 'eat', re: /(吃|喝|进食|喝酒|填肚子)/ },
    { k: 'train', re: /(修炼|练|冥想|锻炼|研习|祈祷|打坐)/ },
    { k: 'work', re: /(工作|干活|打工|帮工|搬|接活)/ },
    { k: 'rest', re: /(休息|睡|扎营|过夜|歇)/ },
    { k: 'help', re: /(治疗|包扎|止血|救|照顾)/ },
    { k: 'quest', re: /(任务|委托|告示|赏金)/ },
    { k: 'buy', re: /(商铺|市集|摊)/ }
  ];
  /* 联网模式：AI 提出的意图要过本地这一关才算数（东西在身上、怪在图鉴里、地方真的相邻）。
     过不了就丢掉，退回本地规则理解器 —— 数值与可能性始终由引擎说了算。 */
  function aiResolve(st, s, ai) {
    if (!ai || !ai.act || ai.act === 'generic' || ai.act === 'look') return null;
    var a = ai.act, arg = ai.arg == null ? null : String(ai.arg);
    if (a === 'useitem') {
      var have = (st.bag || []).filter(function (x) { return x.name === arg; })[0];
      return have ? { act: 'useitem', arg: have.name, why: '你身上带着 ' + have.name } : null;
    }
    if (a === 'pray') {
      var god = (WD.GODS || []).filter(function (x) { return x.name === arg; })[0];
      return god ? { act: 'pray', arg: god.name, why: god.name + '——' + (god.domain || '') } : null;
    }
    if (a === 'talkto') {
      var who = (st.team || []).filter(function (x) { return x.name === arg; })[0] ||
        (WD.HEROES || []).filter(function (x) { return x.name === arg; })[0];
      return who ? { act: 'talkto', arg: who.name, why: 'AI：' + who.name } : null;
    }
    if (a === 'attackmon') {
      var mon = (WD.MONSTERS || []).filter(function (x) { return x.name === arg; })[0];
      return mon ? { act: 'attackmon', arg: mon.name, why: 'AI：' + mon.name } : null;
    }
    if (a === 'travel' || a === 'travelfar' || a === 'longtrip') {
      var reg = GEO && GEO.regionOf(arg);
      if (!reg || reg.name === st.place) return null;
      var near = GEO.isAdjacent(st.place, reg.name);
      if (a === 'longtrip' && !near) return { act: 'longtrip', arg: reg.name, why: 'AI：要走路长途' };
      if (near) return { act: 'travel', arg: reg.name, why: 'AI：邻地' };
      return { act: 'travelfar', arg: reg.name, why: 'AI：不相邻，只走得到一站' };
    }
    if (a === 'quest') {
      var q = (st.quests || []).filter(function (x) { return x.state === '进行中'; })[0];
      return q ? { act: 'quest', arg: q.name, why: '手上的委托：' + q.name } : null;
    }
    return null;
  }
  /* AI 写的那段话替掉通用叙述；它提的检定由本地掷，成败后果也由本地定 */
  function aiProse(st, res, ai) {
    if (!ai) return res;
    if (ai.check && ai.check.attr) {
      var key = ai.check.attr;
      var dc = Math.max(8, Math.min(16, Math.round(ai.check.dc || 12)));
      var mod = ENG.attrMod(st.pc.attrs[key]) + ENG.profBonus(st.pc.level);
      var r = ENG.check(mod, dc, 0);
      var line = '判定：' + ENG.attrCN(key) + ' d20(' + r.roll + ') + ' + mod + ' vs DC ' + dc + '　' + (r.ok ? '成了' : '不成');
      if (ai.check.why) line += '　·　' + ai.check.why;
      res.extra = (res.extra || []).concat([line]);
      if (r.ok) res.extra = res.extra.concat(gain(40 + dc * 4, 0));
      else if (ENG.chance(0.3)) { ENG.char.addFatigue(st, 1); res.extra.push('疲劳 +1。'); }
    }
    if (ai.text) res.text = ai.text;
    return res;
  }
  ACT.custom = function (st, raw, opt, ai) {
    var s = String(raw || '').trim();
    if (!s) return { text: '你什么也没做。', extra: ['写点具体的：想做什么、对谁做、用什么手段。'] };
    /* 先查世界内容与当下状态：能对上就按那条走（联网时 AI 的提议也算在内） */
    var it = aiResolve(st, s, ai) || interpret(st, s);
    if (it) {
      /* 这一支是「读懂了这句话」的走法：AI 写的叙述替掉引擎那句，
         但结算（判定、物品、钱、疲劳）一律保留引擎的 extra。 */
      if (it.act === 'useitem') return aiProse(st, ACT.useItem(st, it.arg), ai);
      if (it.act === 'noitem') {
        var sameKind = (st.bag || []).filter(function (x) { return x.kind === it.kind; });
        var hint = sameKind.length
          ? ('随身的同类只有：' + sameKind.slice(0, 4).map(function (x) { return x.name; }).join('、') + '。')
          : '这一带要买的话，得找铺子。';
        return { text: '你把身上翻了一遍，没有' + it.arg + '。',
          extra: [hint + (it.price ? '（' + it.arg + ' 铺子里约 ' + it.price + ' GP）' : ''),
            '要买就写「我买 ' + it.arg + '」；要空手来，就写清你打算怎么做。'] };
      }
      if (it.act === 'pray') return aiProse(st, ACT.pray(st, it.arg), ai);
      if (it.act === 'talkto') return aiProse(st, ACT.talkTo(st, it.arg), ai);
      if (it.act === 'attackmon') return aiProse(st, ACT.attackMon(st, it.arg, it.why), ai);
      if (it.act === 'travel') return aiProse(st, travelTo(st, it.arg), ai);
      if (it.act === 'longtrip') return aiProse(st, ACT.longtrip(st, it.arg), ai);
      if (it.act === 'travelfar') return aiProse(st, travelTo(st, it.arg), ai);
      if (it.act === 'quest') return aiProse(st, ACT.quest(st), ai);
      if (it.act === 'look') return aiProse(st, { text: it.why + '。', extra: ACT.careful(st).extra }, ai);
    }
    /* 买卖：不要求写在开头，「我在市集买 治疗微伤药水」也要认 */
    var mb = s.match(/买\s*([^\s，。！？、]{2,24})/), ms = s.match(/卖\s*([^\s，。！？、]{2,24})/);
    if (mb && !/买卖/.test(s)) {
      var want = mb[1];
      var it = ENG.item.find(want) || fuzzyItem(want);
      if (!it) return { text: '铺子里没有「' + want + '」这样东西。', extra: ['可用：' + (st.flags.shop || ENG.item.stock(st, 'gear').map(function (x) { return x.name; })).slice(0, 10).join('、')] };
      var r0 = ENG.item.buy(st, it);
      advance(1);
      return { text: r0.text, extra: [r0.ok ? '钱找回来，收好。' : '钱袋不够。'] };
    }
    if (ms) {
      var r1 = ENG.item.sell(st, ms[1]);
      advance(1);
      return { text: r1.text, extra: [] };
    }
    /* 长途出行：写在「前往」之前判，别被短途那条吃掉 */
    var tierNames = ENG.travel.TIERS.map(function (x) { return x.name; }).join('|');
    var lt = s.match(new RegExp('(?:长途|绕行|(' + tierNames + '))\\s*(?:前往|赶路|跋涉|去)?\\s*([^\\s，。！？]{2,10})'));
    if (lt) {
      var ltMode = /绕行/.test(s) ? 'safe' : 'fast';
      var ltTier = null;
      ENG.travel.TIERS.forEach(function (x) { if (s.indexOf(x.name) >= 0) ltTier = x.id; });
      var ltName = lt[2] || lt[1];
      var ltReg = ENG.world.region(ltName) || null;
      if (!ltReg) {
        var all = WD.REGIONS || [];
        all.forEach(function (r) { if (!ltReg && r.name.indexOf(ltName) >= 0) ltReg = r; });
      }
      if (!ltReg) return { text: '地图上没有「' + ltName + '」。', extra: ['点底部「长途出行」可以看有哪些地方要走长途。'] };
      if (ltReg.name === st.place) return { text: '你已经在' + ltReg.name + '了。', extra: [] };
      if (GEO && GEO.isAdjacent(st.place, ltReg.name)) return travelTo(st, ltReg.name);
      return ACT.longtrip(st, ltReg.name, ltMode, ltTier);
    }
    /* 前往某地 */
    var tr = s.match(/(?:前往|去|走向|动身去|离开去)\s*([^\s，。！？]{2,10})/);
    if (tr) return travelTo(st, tr[1]);
    var intent = null;
    for (var i = 0; i < INTENT.length; i++) if (INTENT[i].re.test(s)) { intent = INTENT[i].k; break; }
    if (!intent) return aiProse(st, attempt(st, s, (ai && ai.check && ai.check.attr) || ENG.pick(['str', 'dex', 'con', 'int', 'wis', 'cha']),
      (ai && ai.check && ai.check.dc) || 13), ai);
    if (intent === 'attack') {
      if (!st.combat) {
        var foes = ENG.combat.spawnFoe(st.terrain, st.pc.level);
        return { text: NARR ? NARR.scene('meet', narrCtx({ target: foes[0].name })) : '你拔了家伙。', extra: ['对手：' + foes.map(function (f) { return f.name; }).join('、')], combat: foes, combatName: '你先动的手' };
      }
      return ACT.attack(st, raw, null);
    }
    if (intent === 'cast') return ACT.cast(st, s);
    if (intent === 'steal') return attempt(st, s, 'dex', 14 + Math.floor(st.pc.level / 3));
    if (intent === 'travel') return ACT.forward(st);
    if (intent === 'look') return ACT.careful(st);
    if (intent === 'talk') return ACT.inquire(st);
    if (intent === 'buy') return ACT.shop(st);
    if (intent === 'eat') {
      advance(1); ENG.char.eat(st, 'food'); ENG.char.eat(st, 'water');
      var cost = ENG.int(1, 5);
      ENG.money.pay(st, cost * (ENG.money.RATE.sp || 100));
      return { text: NARR ? NARR.scene('camp', narrCtx()) : '你吃了顿饭。', extra: ['饥饿与口渴清零（花 ' + cost + ' SP）。'] };
    }
    if (intent === 'train') return ACT.train(st);
    if (intent === 'work') return ACT.work(st);
    if (intent === 'rest') return ACT.rest(st);
    if (intent === 'help') return ACT.heal(st);
    if (intent === 'quest') return ACT.guild(st);
    return attempt(st, s, 'wis', 13);
  };
  /* 长途：按路线一站一站结算，每一站都可能出事 */
  ACT.longtrip = function (st, destName, mode, tierId) {
    var picked = ENG.travel.tierById(st, destName, mode, tierId || 'foot');
    var plan = picked ? picked.plan : ENG.travel.longPlan(st, destName, mode);
    var tier = picked ? picked.tier : null;
    if (!plan) return ACT.custom(st, '我前往' + destName);
    var extra = [];
    if (tier) extra.push('走法：' + tier.name + '——' + tier.desc);
    var paid = ENG.money.pay(st, (tier ? tier.costSP : plan.costSP) * (ENG.money.RATE.sp || 100));
    extra.push('路线：' + plan.route.join(' → ') + '（' + plan.stops + ' 站 · 约 ' + (tier ? tier.days : plan.days) + ' 天）。');
    extra.push(paid ? ('盘缠 ' + (tier ? tier.costSP : plan.costSP) + ' SP 先付出去（干粮、住店、过路' +
      (tier && tier.id === 'caravan' ? '、商队抽头' : '') + (tier && tier.id === 'mount' ? '、车马钱' : '') + '）。')
      : '钱不够，只能沿途打零工、讨水喝。');
    if (tier && tier.fatigue) {
      ENG.char.addFatigue(st, tier.fatigue);
      extra.push('疲劳 +' + tier.fatigue + '。');
    }
    var mishaps = [], died = false;
    var tierRisks = tier ? tier.risks : plan.risks;
    for (var i = 1; i < plan.route.length; i++) {
      var from = plan.route[i - 1], to = plan.route[i];
      var dDays = GEO.hopDays(from, to);
      /* 用挡位的「倍率」缩每一站的天数，不能用挡位的总天数（那是整趟的） */
      if (tier && tier.dayMul) dDays = Math.max(1, Math.round(dDays * tier.dayMul));
      for (var dd = 0; dd < dDays; dd++) {
        advance(12, null, st);
        if (paid) { ENG.char.eat(st, 'food'); ENG.char.eat(st, 'water'); }
        advance(12, null, st);
        if (paid) { ENG.char.eat(st, 'food'); ENG.char.eat(st, 'water'); }
      }
      st.place = to; st.region = to;
      var tr = ENG.world.region(to);
      if (tr) st.terrain = tr.terrain || st.terrain;
      var risk = tierRisks[Math.min(i - 1, tierRisks.length - 1)] || ENG.travel.risk(st, tr || {});
      extra.push('第 ' + i + ' 站到' + to + '：风险 ' + Math.round(risk * 100) + '%。');
      if (ENG.chance(risk)) {
        var m = ENG.travel.mishap(st, tr || {}, tier ? tier.mishap : null);
        mishaps.push(m);
        extra.push('　〔' + m.name + '〕' + m.text);
        if (m.hp) { st.pc.hp.cur -= m.hp; extra.push('　生命 -' + m.hp + '。'); }
        if (m.gold) { ENG.money.pay(st, m.gold * (ENG.money.RATE.gp || 1000)); }
        if (m.fatigue) ENG.char.addFatigue(st, m.fatigue);
        if (m.hours) advance(m.hours);
        if (m.loseItem && (st.bag || []).length) {
          var lost = ENG.pick(st.bag);
          st.bag = st.bag.filter(function (x) { return x !== lost; });
          extra.push('　丢了：' + lost.name + '。');
        }
        if (m.injury) {
          var inj = ENG.char.injure(st);
          extra.push('　落下永久损伤：' + inj.name + '（' + inj.eff + '）。');
        }
        if (m.combat && !st.combat) { ENG.combat.start(st, m.combat, { name: m.name }); extra.push('　就地接敌。'); }
        if (st.pc.hp.cur <= 0) { died = true; extra.push('　你倒在往' + to + '的路上。'); break; }
      }
      if (ENG.chance(0.25)) {
        var ru = ENG.table.legend(st.region);
        if (ru) extra.push('　路宿' + to + '，听人说：' + ru);
      }
    }
    st.pc.deeds.push('星母历' + st.time.year + '年' + st.time.month + '月，长途跋涉抵达' + st.place + '。');
    ENG.travel.addHeat(st, plan.stops >= 4 ? 2 : 1);      /* 一趟长途只涨一到两档热度 */
    extra.push('出行热度涨到 ' + ENG.travel.heat(st) + '。');
    extra = extra.concat(gain(260 + st.pc.level * 30 + plan.stops * 20, 0));
    extra.push('长途跋涉计入经验。');
    return {
      text: NARR ? NARR.scene('travel', narrCtx()) : '你上了路。',
      extra: extra,
      panel: GEO.regionPanel(st.place),
      cause: '长途跋涉途中' + (mishaps.length ? mishaps[mishaps.length - 1].name : '力竭'),
      longTrip: { plan: plan, mishaps: mishaps.length, died: died }
    };
  };

  /* 用随身的东西：药水真回血，卷轴真放一次法术，别的至少给个交代 */
  ACT.useItem = function (st, name) {
    var it = null;
    (st.bag || []).forEach(function (x) { if (!it && x.name === name) it = x; });
    if (!it) return { text: '你身上没有' + name + '。', extra: [] };
    advance(1);
    var extra = [];
    if (/治疗|微伤|重伤|药水/.test(it.name)) {
      var h = ENG.rollDice(/重伤/.test(it.name) ? '4d6+6' : '2d4+2');
      st.pc.hp.cur = Math.min(st.pc.hp.max, st.pc.hp.cur + h);
      extra.push('喝下' + it.name + '：生命 +' + h + '（现 ' + Math.round(st.pc.hp.cur) + '/' + st.pc.hp.max + '）。');
    } else if (/隐形/.test(it.name)) {
      st.flags.invisible = 1;
      extra.push('身形淡下去，一个时辰内不容易被看见。');
    } else if (/飞行/.test(it.name)) {
      st.flags.flying = 1;
      extra.push('脚离了地，风从衣缝里穿过去。');
    } else if (/卷轴/.test(it.name)) {
      var sp = ENG.pick(WD.SPELLS || []) || { name: '一道法术', school: '奥术' };
      extra.push('展开卷轴念完，' + sp.name + '（' + (sp.school || '') + '）烧成灰。');
      ENG.char.addXp(st, 60);
    } else if (/爆裂/.test(it.name)) {
      var foes = st.combat ? st.combat.foes.filter(function (f) { return f.hp > 0; }) : [];
      if (foes.length) {
        var d = ENG.rollDice('6d6');
        foes.forEach(function (f) { f.hp -= Math.round(d / foes.length); });
        extra.push('符文石炸开：' + d + ' 点火焰伤害分摊给 ' + foes.length + ' 个对手。');
      } else extra.push('你把它在空地上砸开，炸出一个坑。');
    } else {
      extra.push('你用掉了' + it.name + '（' + (it.desc || '说不上有什么用，但总归是用了') + '）。');
    }
    it.qty = (it.qty || 1) - 1;
    if (it.qty <= 0) st.bag = st.bag.filter(function (x) { return x !== it; });
    extra.push('（' + it.name + ' 已从物品栏扣除）');
    return { text: NARR ? NARR.scene('camp', narrCtx()) : '你动用了随身的东西。', extra: extra };
  };
  /* 祈祷：按神职给一点对应领域的好处，代价是得摆出信徒的样子 */
  ACT.pray = function (st, godName) {
    advance(1);
    var god = ENG.world.god(godName) || {};
    var r = ENG.check(ENG.attrMod(st.pc.attrs.wis) + ENG.profBonus(st.pc.level), 12, 0);
    var extra = ['祈祷判定 d20(' + r.roll + ') vs DC 12　' + (r.ok ? '心里落定' : '没有回音')];
    if (r.ok) {
      st.pc.mp.cur = Math.min(st.pc.mp.max, st.pc.mp.cur + 4);
      ENG.char.addFatigue(st, -1);
      extra.push('法力 +4，疲劳 -1。' + (god.domain ? ('（' + god.name + '管的是' + god.domain + '）') : ''));
      if (god.org) ENG.rep.add(st, god.org, 2);
      extra = extra.concat(gain(40, 0));
    } else if (god.name) {
      extra.push('没回音。' + god.name + '的祭坛不在这里，你也未必算祂的人。');
    }
    return { text: NARR ? NARR.scene('temple', narrCtx()) : '你低头说了一段话。', extra: extra };
  };
  /* 找人说句话：按对方的身份给线索 */
  ACT.talkTo = function (st, name) {
    advance(1);
    var hero = null;
    (WD.HEROES || []).forEach(function (h) { if (h.name === name) hero = h; });
    var mate = null;
    (st.team || []).forEach(function (m) { if (m.name === name) mate = m; });
    var extra = [];
    var r = ENG.check(ENG.attrMod(st.pc.attrs.cha) + ENG.profBonus(st.pc.level), hero ? 16 : 12, 0);
    extra.push('开口判定 d20(' + r.roll + ') vs DC ' + (hero ? 16 : 12) + '　' + (r.ok ? '他答了' : '他没接话'));
    if (hero) {
      extra.push(hero.name + '（' + hero.race + hero.job + ' · ' + hero.title + '）：' + hero.bio);
      extra.push(r.ok ? '他记住了你的脸。' : '他看了你一眼就走开了——这种人不是随便拦得住的。');
      if (r.ok) ENG.rep.add(st, '冒险者公会', 3);
    } else if (mate) {
      extra.push(mate.name + '（' + mate.job + ' · ' + mate.status + '）跟你说了几句。');
    }
    if (r.ok) {
      var ru = ENG.table.rumor();
      if (ru) extra.push('顺带听到：' + ru.text + '（' + ru.truth + '）');
      extra = extra.concat(gain(35, 0));
    }
    return { text: NARR ? NARR.talk(hero ? { name: hero.name, role: hero.job } : { name: name, role: '路人' }, 'greet', narrCtx()) : '你先开的口。', extra: extra };
  };
  /* 点名打某只怪：栖息地不符就只当你在找它 */
  ACT.attackMon = function (st, name, why) {
    var m = ENG.foe.byName(name);
    if (!m) return ACT.attack(st, null, null);
    var here = (m.habitat || []).some(function (h) { return h === st.terrain || (h && st.terrain && (h.indexOf(st.terrain) >= 0 || st.terrain.indexOf(h) >= 0)); });
    if (!here) {
      advance(ENG.int(1, 3));
      return { text: '你找了半天。', extra: [why + '；这一带没有它的踪迹。',
        '要找它得去：' + (m.habitat || []).join('、') + '。'] };
    }
    if (!st.combat) {
      var foes = [ENG.combat.foeFromMonster(m, st.pc.level)];
      var n = /(狼|哥布林|骷髅|僵尸)/.test(m.name) ? Math.min(4, 1 + Math.floor(st.pc.level / 3)) : 1;
      for (var i = 1; i < n; i++) foes.push(ENG.combat.foeFromMonster(m, st.pc.level));
      advance(1);
      return { text: '你朝' + m.name + '去了。', extra: [why + '。' + (m.trait || '')], combat: foes, combatName: m.name };
    }
    return ACT.attack(st, null, null);
  };

  function attempt(st, s, key, dc) {
    advance(ENG.int(1, 4));
    var mod = ENG.attrMod(st.pc.attrs[key]) + ENG.profBonus(st.pc.level);
    var r = ENG.check(mod, dc, 0);
    var extra = ['判定：' + ENG.attrCN(key) + ' d20(' + r.roll + ') + ' + mod + ' vs DC ' + dc + '　' + (r.ok ? '成了' : '不成')];
    if (r.ok) {
      extra = extra.concat(gain(80 + dc * 8, ENG.chance(0.5) ? ENG.int(1, 12) * st.pc.level : 0));
      st.pc.deeds.push('在' + st.place + '：' + s.slice(0, 24));
    } else {
      if (ENG.chance(0.4)) { var d = ENG.rollDice('1d6+' + Math.floor(st.pc.level / 2)); st.pc.hp.cur -= d; extra.push('代价：生命 -' + d + '。'); }
      if (ENG.chance(0.2)) extra.push('疲劳 +1。'), ENG.char.addFatigue(st, 1);
    }
    return { text: NARR ? NARR.scene(ENG.chance(0.5) ? 'wild' : 'city', narrCtx({ roll: r.roll, dc: dc, ok: r.ok })) : '你试了试。', extra: extra, cause: '试图' + s.slice(0, 20) + '时失手' };
  }
  ACT.cast = function (st, s) {
    var cls = ENG.char.classById(st.pc.clsId);
    if (!cls.caster) return attempt(st, s, 'con', 13);
    if (st.pc.mp.cur <= 0) return { text: '法力见了底，念不出东西。', extra: ['先休息，或者用别的手段。'] };
    var cost = 2 + Math.floor(st.pc.level / 3);
    st.pc.mp.cur -= cost;
    advance(1);
    var dc = 12 + Math.floor(st.pc.level / 3);
    var r = ENG.check(ENG.attrMod(st.pc.attrs[ENG.char.casterAttrOf(cls)]) + ENG.profBonus(st.pc.level), dc, 0);
    var extra = ['消耗法力 ' + cost + '。施法判定 d20(' + r.roll + ') vs DC ' + dc + '　' + (r.ok ? '法术成立' : '法术散了')];
    if (r.ok && st.combat) {
      var dmg = ENG.rollDice((1 + Math.floor(st.pc.level / 4)) + 'd6');
      var target = st.combat.foes.filter(function (f) { return f.hp > 0; })[0];
      if (target) {
        target.hp -= dmg;
        extra.push('法术打在' + target.name + '身上，' + dmg + ' 点伤害。');
        if (target.hp <= 0) { target.hp = 0; extra.push(target.name + '倒下。'); ENG.char.addXp(st, (target.xp || 40) * 2); }
      }
    } else if (r.ok) {
      var sp = ENG.pick(WD.SPELLS || []);
      if (sp) { st.pc.spells.push(sp.name); extra.push('你摸清了一道法术：' + sp.name + '（' + (sp.school || '') + '）。'); }
      if (sp && sp.forbidden) {
        extra.push('这是禁忌的门类（' + sp.forbidden + '）。手指头到现在还在抖。');
        st.flags.curseCheck = (st.flags.curseCheck || 0) + 1;
        st.pc.trauma.push('碰过' + sp.forbidden + '的东西');
      }
      extra = extra.concat(gain(110, 0));
    }
    return { text: NARR ? NARR.scene('train', narrCtx({ roll: r.roll, dc: dc, ok: r.ok })) : '你念完了咒。', extra: extra };
  };
  ACT.train = function (st) {
    advance(ENG.int(4, 8));
    var key = ENG.pick(ENG.ATTR_KEYS);
    var r = ENG.check(ENG.attrMod(st.pc.attrs[key]) + ENG.profBonus(st.pc.level), 13, 0);
    var extra = ['修炼判定：d20(' + r.roll + ') vs DC 13　' + (r.ok ? '有进境' : '白练一场')];
    if (r.ok) {
      extra.push(ENG.attrCN(key) + ' +1（上限 20）。');
      st.pc.attrs[key] = Math.min(20, st.pc.attrs[key] + 1);
      extra = extra.concat(gain(140 + 20 * st.pc.level, 0));
      var c = ENG.pick(WD.CRAFTS || []);
      if (c) {
        var cr = ENG.craft.add(st, c.name, ENG.int(2, 6));
        extra.push('顺带在' + c.name + '上花了些工夫：' + cr.tier + '（' + cr.value + '/100）' + (cr.up ? '　进阶了' : ''));
      }
    } else { ENG.char.addFatigue(st, 1); extra.push('疲劳 +1。'); }
    ENG.char.derive(st);
    return { text: NARR ? NARR.scene('train', narrCtx()) : '你练了很久。', extra: extra };
  };
  ACT.work = function (st) {
    advance(ENG.int(5, 9));
    var pay = [20, 30, 45, 80][ENG.int(0, 3)] * (1 + Math.floor(st.pc.level / 4));
    ENG.money.gain(st, pay * (ENG.money.RATE.sp || 100) * 10);
    ENG.char.addFatigue(st, 1);
    ENG.char.eat(st, 'food');
    ENG.char.eat(st, 'water');
    var out = ['工钱 ' + pay + ' GP，疲劳 +1，管一顿饭。'];
    return {
      text: NARR ? NARR.scene('work', narrCtx()) : '你干了一天活。',
      extra: out.concat(gain(90, 0))
    };
  };
  ACT.eat = function (st) {
    advance(1);
    var cost = ENG.int(1, 4);
    var paid = ENG.money.pay(st, cost * (ENG.money.RATE.sp || 100));
    ENG.char.eat(st, 'food'); ENG.char.eat(st, 'water');
    ENG.char.addFatigue(st, -1);
    var h = ENG.rollDice('1d4+1');
    st.pc.hp.cur = Math.min(st.pc.hp.max, st.pc.hp.cur + h);
    return {
      text: NARR ? NARR.scene('camp', narrCtx()) : '你把干粮掰开，就着水囊吃下去。',
      extra: [
        paid ? ('一餐一水，花 ' + cost + ' SP。') : '身上没钱，只能讨口热水。',
        '饥渴清零，疲劳 -1，生命 +' + h + '。'
      ]
    };
  };
  ACT.heal = function (st) {
    advance(2);
    /* 濒死时优先灌药：找一瓶治疗药水 */
    if (st.flags.dying) {
      var pot = null;
      (st.bag || []).forEach(function (it) { if (!pot && /药水/.test(it.name) && /治疗|微伤|重伤/.test(it.name) && (it.qty || 1) > 0) pot = it; });
      if (pot) {
        pot.qty = (pot.qty || 1) - 1;
        if (pot.qty <= 0) st.bag = st.bag.filter(function (x) { return x !== pot; });
        var heal2 = ENG.rollDice('2d4+2');
        st.pc.hp.cur = Math.max(1, heal2);
        st.flags.dying = false;
        st.pc.cond = (st.pc.cond || []).filter(function (x) { return x !== '昏迷'; });
        st.counters.ds = { ok: 0, fail: 0 };
        ENG.char.derive(st);
        return { text: '你咬开瓶塞，把药灌下去。', extra: ['喝掉 ' + pot.name + '，生命恢复到 ' + st.pc.hp.cur + ' 点，脱离了濒死。'] };
      }
      var c = ENG.check(ENG.attrMod(st.pc.attrs.wis) + ENG.profBonus(st.pc.level), 14, -1);
      if (c.ok) {
        st.pc.hp.cur = 1; st.flags.dying = false;
        st.pc.cond = (st.pc.cond || []).filter(function (x) { return x !== '昏迷'; });
        st.counters.ds = { ok: 0, fail: 0 };
        ENG.char.derive(st);
        return { text: '你扯下衣摆按住伤口。', extra: ['临时包扎判定 d20(' + c.roll + ') vs DC 14 通过：生命回到 1 点，脱离濒死。'] };
      }
      return { text: '手在抖，布条缠不上。', extra: ['包扎判定 d20(' + c.roll + ') vs DC 14 失败：仍处于濒死。'] };
    }
    var r = ENG.check(ENG.attrMod(st.pc.attrs.wis) + ENG.profBonus(st.pc.level), 12, 0);
    var h = ENG.rollDice('1d8+2');
    if (r.ok) { st.pc.hp.cur = Math.min(st.pc.hp.max, st.pc.hp.cur + h); }
    return {
      text: NARR ? NARR.scene('camp', narrCtx()) : '你把伤口处理了一遍。',
      extra: [r.ok ? '生命 +' + h + '。' : '手法生疏，只止住了血。', (st.pc.cond || []).length ? '仍有些不舒服：' + st.pc.cond.join('、') : '']
    };
  };
  ACT.struggle = function (st) {
    advance(1);
    /* 真正的结算在 finishTurn -> rollDying，这里只给一句动作描写 */
    return { text: NARR ? NARR.scene('death', narrCtx()) : '你把牙咬紧。', extra: [] };
  };
  ACT.callhelp = function (st) {
    advance(1);
    var r = ENG.check(ENG.attrMod(st.pc.attrs.cha) + ENG.profBonus(st.pc.level), 13, -1);
    if (r.ok) {
      st.flags.dying = false;
      st.pc.hp.cur = 1;
      st.pc.cond = (st.pc.cond || []).filter(function (x) { return x !== '昏迷'; });
      st.counters.ds = { ok: 0, fail: 0 };
      var who = (st.team || [])[0];
      ENG.char.derive(st);
      return {
        text: '你喊出声。有人过来了。',
        extra: ['呼救判定 d20(' + r.roll + ') vs DC 13 通过：' + (who ? who.name + '把你拖到背风处，' : '过路的人把你拖到背风处，') + '生命回到 1 点，脱离濒死。']
      };
    }
    return { text: '喊声被风吹散了。', extra: ['呼救判定 d20(' + r.roll + ') vs DC 13 失败：' + st.place + '附近没有人应。'] };
  };
  ACT.yield = function (st) {
    advance(1);
    return { text: '你不再动了。', extra: ['视野收窄。下一回合结算生死豁免（三次失败即死）。'] };
  };
  function travelTo(st, name, forceDays) {
    var reg = ENG.world.region(name);
    if (!reg) {
      var all = WD.REGIONS || [];
      var guess = null;
      all.forEach(function (r) { if (!guess && r.name.indexOf(name) >= 0) guess = r; });
      if (!guess) return { text: '你在地图上找不到「' + name + '」。', extra: ['手边能确定的地方：' + all.slice(0, 12).map(function (r) { return r.name; }).join('、')] };
      reg = guess;
    }
    if (reg.name === st.place) return { text: '你已经在这里了。', extra: [] };
    /* 只能一站一站走：先去挨着的地方 */
    if (GEO && !GEO.isAdjacent(st.place, reg.name)) {
      var near = GEO.adjacentTo(st.place);
      return {
        text: '从' + st.place + '去不了' + reg.name + '——中间还隔着路。',
        extra: [
          '得先走一站。当下挨着的地方有：' + near.map(function (x) {
            return x.name + '（' + x.dir + ' · ' + x.far + '）';
          }).join('、') + '。',
          '想远行就一站一站挪过去；也可以点底部的「选择地区」看邻近可往之地。'
        ]
      };
    }
    var destForecast = ENG.travel.forecast(st, reg);
    var days = forceDays || Math.max(1, ENG.int(2, 6) - Math.floor(st.pc.level / 6));
    var provision = days * 4;
    var paid = ENG.money.pay(st, provision * (ENG.money.RATE.sp || 100));
    /* 赶路按半天一段走：每段结束都吃喝一次，免得一次结算把几十个小时的
       缺水伤害叠在一起把人直接算死 */
    for (var dd = 0; dd < days; dd++) {
      advance(12);
      if (paid) { ENG.char.eat(st, 'food'); ENG.char.eat(st, 'water'); }
      advance(12);
      if (paid) { ENG.char.eat(st, 'food'); ENG.char.eat(st, 'water'); }
    }
    var extra = ['路程 ' + days + ' 天，' + (days > 1 ? '路上风餐露宿。' : '当天到。')];
    extra.push(paid ? ('路上买干粮与水，花 ' + provision + ' SP。') : ('盘缠不够，' + days + ' 天里只能省着吃喝。'));
    if (days >= 3) { ENG.char.addFatigue(st, 1); extra.push('长途赶路，疲劳 +1。'); }
    st.place = reg.name; st.region = reg.name; st.terrain = reg.terrain || st.terrain;
    var cost = days * ENG.int(2, 6);
    if (ENG.money.pay(st, cost * (ENG.money.RATE.sp || 100))) extra.push('住店与杂费 ' + cost + ' SP。');
    /* 出行风险：走一趟热度 +1，按概率抽一次意外 */
    var heatNow = ENG.travel.addHeat(st, 1);
    extra.push('出行风险预估 ' + destForecast.level + '%（' + destForecast.word + '）· 近期出行热度 ' + heatNow + '。');
    var mishap = null;
    if (ENG.chance(destForecast.p)) {
      var doMishap = function () {
        var m2 = ENG.travel.mishap(st, reg);
        var ex = ['〔路上出事〕' + m2.name + '：' + m2.text];
        if (m2.hp) { st.pc.hp.cur -= m2.hp; ex.push('生命 -' + m2.hp + '。'); }
        if (m2.gold) { ENG.money.pay(st, m2.gold * (ENG.money.RATE.gp || 1000)); }
        if (m2.fatigue) { ENG.char.addFatigue(st, m2.fatigue); ex.push('疲劳 +' + m2.fatigue + '。'); }
        if (m2.hours) { advance(m2.hours); ex.push('多耗 ' + Math.round(m2.hours / 24 * 10) / 10 + ' 天。'); }
        if (m2.loseItem && (st.bag || []).length) {
          var lost = ENG.pick(st.bag);
          st.bag = st.bag.filter(function (x) { return x !== lost; });
          ex.push('丢了：' + lost.name + '。');
        }
        if (m2.injury) { var inj = ENG.char.injure(st); ex.push('落下永久损伤：' + inj.name + '（' + inj.eff + '）。'); }
        return { extra: ex, combat: m2.combat || null, combatName: m2.name, cause: '赶路途中' + m2.name };
      };
      if (aiOn() && global.AI.fire) {
        /* 概率与量级是引擎掷的，事件内容让 AI 写；写不出来就回上面这一套 */
        var sev = destForecast.p > 0.45 ? '严重（威胁高、热度高）' : (destForecast.p > 0.22 ? '中等' : '轻微');
        st.flags.pendingEvent = { kind: '赶路', allowed: monsterNamesHere(), severity: sev, fallback: doMishap };
        extra.push('出行风险预估 ' + destForecast.level + '%（' + destForecast.word + '）· 近期出行热度 ' + heatNow + '　—— 这一趟出事了。');
        return {
          text: NARR ? NARR.scene('arrive', narrCtx()) : ('你到了' + reg.name + '。'),
          extra: extra, panel: GEO ? GEO.regionPanel(reg.name) : null,
          aiEventSpec: { kind: '赶路', allowed: monsterNamesHere(), severity: sev, label: '路上出事', fallback: doMishap },
          cause: '赶路途中出事'
        };
      }
      mishap = ENG.travel.mishap(st, reg);
      extra.push('〔路上出事〕' + mishap.name + '：' + mishap.text);
      if (mishap.hp) { st.pc.hp.cur -= mishap.hp; extra.push('生命 -' + mishap.hp + '。'); }
      if (mishap.gold) { ENG.money.pay(st, mishap.gold * (ENG.money.RATE.gp || 1000)); }
      if (mishap.fatigue) { ENG.char.addFatigue(st, mishap.fatigue); extra.push('疲劳 +' + mishap.fatigue + '。'); }
      if (mishap.hours) {
        advance(mishap.hours);
        extra.push('多耗 ' + Math.round(mishap.hours / 24 * 10) / 10 + ' 天。');
      }
      if (mishap.loseItem && (st.bag || []).length) {
        var lost = ENG.pick(st.bag);
        st.bag = st.bag.filter(function (x) { return x !== lost; });
        extra.push('丢了：' + lost.name + '。');
      }
      if (mishap.injury) {
        var inj = ENG.char.injure(st);
        extra.push('落下永久损伤：' + inj.name + '（' + inj.eff + '）。');
      }
      if (st.pc.hp.cur <= 0) extra.push('你倒在了半路上。');
    }
    if (ENG.chance(0.4) && !mishap) {
      var row = encounter(st.terrain);
      if (row) {
        extra.push('路上遇到：' + row.name + '。' + row.desc);
      }
    }
    st.pc.deeds.push('星母历' + st.time.year + '年' + st.time.month + '月，抵达' + reg.name + '。');
    extra = extra.concat(gain(150 + st.pc.level * 25, 0));
    return {
      text: NARR ? NARR.scene('arrive', narrCtx()) : '你到了' + reg.name + '。',
      extra: extra,
      panel: GEO ? GEO.regionPanel(reg.name) : null,
      combat: mishap && mishap.combat ? mishap.combat : null,
      combatName: mishap ? mishap.name : '路上遭遇',
      cause: mishap ? ('赶路途中' + mishap.name) : '赶路途中'
    };
  }

  /* ---------------- 输入框 ---------------- */
  function openInput(mode) {
    inputMode = mode || 'custom';
    $('cmd').placeholder = st.phase === 'create' ? '建卡阶段用字母选项（回车提交）' : '写你要做的事，越具体判定越准（回车提交）';
    $('cmd').focus();
    hint(st.phase === 'create' ? '这一步请按字母从选项里选。' : '自定义输入中：写清楚做什么、对谁、用什么手段；直接回车提交。');
  }
  function submitInput() {
    var v = $('cmd').value.trim();
    if (!v) return;
    $('cmd').value = '';
    $('cmd').style.height = 'auto';
    inputMode = null;
    /* 建卡阶段没有自定义项：文字仍然送进去，由 CREATE 判定（只有天赋那一步的暗号会成立） */
    if (st.phase === 'create') choose(customKeyNow(), v);
    else if (st.phase === 'dead') hint('这一局已经结束：点「重新开始新角色」。');
    else {
      pushText('〔自定义〕' + v, 'p-pick');
      /* 联网模式下先把这句话交给 AI 读一遍（读不懂也没关系，本地规则兜底），再走这一回合 */
      if (global.AI && global.AI.on && global.AI.ready && global.AI.custom) {
        hint('正在把这句话读成行动…');
        var pend = global.AI.custom(v);
        if (pend && pend.then) {
          pend.then(function (r) {
            doTurn('e', v, r && r.ok ? r : null);
          }, function () { doTurn('e', v, null); });
          return;
        }
      }
      doTurn('e', v, null);
    }
  }

  /* 长途出行：先亮各档走法与代价，选一档才动身 */
  function confirmLongTrip(destName, mode) {
    mode = mode || 'fast';
    var bundle = ENG.travel.tiers(st, destName, mode);
    if (!bundle) { hint('从这里走不到' + destName + '。'); return; }
    var opt = ENG.travel.longOptions(st, destName);
    var alt = (opt && opt.safe) ? ENG.travel.tiers(st, destName, 'safe') : null;
    var body = '<div class="mb-list">' + LTX.renderMixed(PANEL.tripTiers(st, bundle, alt)) + '</div>';
    var btns = [];
    bundle.tiers.forEach(function (x) {
      if (!x.ok) return;
      btns.push({
        label: x.name + '（' + x.days + ' 天 · ' + (x.costSP / 10).toFixed(1) + ' GP · 至少一次 ' + Math.round(x.atLeastOne * 100) + '%）',
        act: function () {
          closeModal();
          pushText('〔长途·' + x.name + '〕前往' + destName + '（' + bundle.plan.stops + ' 站 · 约 ' + x.days + ' 天）', 'p-pick');
          doTurn('e', '我' + x.name + '前往' + destName);
        }
      });
    });
    if (alt && alt.tiers.some(function (x) { return x.ok; })) {
      btns.push({
        label: mode === 'fast' ? '换 绕 开 险 地 的 路 再 看' : '换 最 快 的 路 再 看',
        act: function () { closeModal(); confirmLongTrip(destName, mode === 'fast' ? 'safe' : 'fast'); }
      });
    }
    btns.push({
      label: '改 走 近 处（看邻地）', act: function () {
        closeModal();
        /* 不替你决定去哪：把当前所在地的近处选项摆出来 */
        showNearbyPicker();
      }
    });
    btns.push({ label: '取 消', act: closeModal });
    modal('长 途 出 行 · 选 走 法（' + (mode === 'fast' ? '最快路线' : '绕开险地') + '）', body, btns, 'codexbox wrapfoot');
  }

  /* ---------------- 多层地图 ---------------- */
  var mapAt = 'world';
  function showMap(nodeId) {
    if (!global.MAP) { hint('地图模块没载入。'); return; }
    mapAt = nodeId || mapAt || 'world';
    var node = MAP.find(mapAt) || MAP.tree();
    mapAt = node.id;
    var html =
      MAP.crumb(mapAt) +
      '<div class="map-head"><b>' + esc(node.name) + '</b>' +
      '<span>' + esc(node.kind === 'world' ? '大陆总图 · 浅字为地名，点「展开」进入下一层'
        : (node.kind === 'region' ? ('地区图 · ' + (node.layer || '') + ' · ' + (node.terrain || ''))
          : (node.kind === 'spot' ? '地标图' : ('疆域图 · 境内 ' + (node.children || []).length + ' 处')))) + '</span>' +
      '<span class="map-zoom">' +
      '<button type="button" data-map-zoom="out" title="缩小">－</button>' +
      '<button type="button" data-map-zoom="reset" title="复位（双击地图同效）">复位</button>' +
      '<button type="button" data-map-zoom="in" title="放大">＋</button>' +
      '<i>滚轮缩放 · 按住拖动平移 · 双击复位</i></span></div>' +
      MAP.stage(mapAt, (st && st.place) ? st.place : null) +
      '<div class="map-foot">' + LTX.renderMixed(MAP.info(mapAt)) + '</div>';
    modal('游 戏 地 图 · ' + node.name, html, [{ label: '关 闭', act: closeModal }], 'mapbox');
    bindMap();
  }
  function bindMap() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-map-node]'), function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-map-node');
        var n = MAP.find(id);
        if (!n) return;
        if (n.kind === 'world' || n.kind === 'nation' || n.kind === 'wild' || (n.children && n.children.length)) showMap(id);
        else hint('这里没有更细的图。');
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-map-back]'), function (el) {
      el.addEventListener('click', function () { showMap(el.getAttribute('data-map-back')); });
    });
    /* 缩放 / 平移 / 复位 */
    var stageEl = document.querySelector('.mapstage'), svgEl = document.querySelector('.mapsvg');
    var ctl = MAP.zoomify(stageEl, svgEl);
    Array.prototype.forEach.call(document.querySelectorAll('[data-map-zoom]'), function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-map-zoom');
        if (!ctl) return;
        if (act === 'in') ctl.zoomIn();
        else if (act === 'out') ctl.zoomOut();
        else ctl.reset();
      });
    });
  }
  /* ---------------- 前往近处 / 长途出行（两个入口，各管一段） ---------------- */
  /* 危险配色：与「前往近处」同一套（低=抹茶 / 中=浅金 / 高=珊瑚） */
  function dangerClass(p) { return p > 0.32 ? 'd3' : (p > 0.18 ? 'd2' : 'd1'); }
  function dangerColor(p) { return p > 0.32 ? '#E88A80' : (p > 0.18 ? '#E0B45A' : '#9FCFB4'); }
  function heatLine() {
    return '近期出行热度：<b>' + ENG.travel.heat(st) + '</b>（每两天自然降一点，长休也会降温）。';
  }
  function showNearbyPicker() {
    var near = GEO.adjacentTo(st.place);
    var html = '<div class="mb-list">';
    html += '<p>你当前在 <b>' + esc(st.place) + '</b>。<b>这里只列挨着的邻地</b>——一趟一站，走完再决定下一步。' +
      '每一项都标出方位、远近、威胁与<b>出行风险</b>；<b>去得越勤、目标越凶，路上出事的可能越大</b>。</p>';
    if (!near.length) html += '<p>这里没有可以走过去的邻地。</p>';
    near.forEach(function (x) {
      var r = x.region;
      var i = GEO.regionInfo(r) || { position: '', nations: [], neighbours: [] };
      var f = ENG.travel.forecast(st, r);
      html += '<p class="rgn-row ' + dangerClass(f.p) + '">' +
        '<button class="rgn" type="button" data-rgn="' + esc(r.name) + '">前往 ' + esc(r.name) + '</button> ' +
        esc((r.kind ? GEO.kindCN(r.kind) : '') + (r.terrain || '') + ' · 威胁 ' + (r.threat || [1, 1]).join('-')) +
        '　' + esc(x.dir + ' · ' + x.far + (x.sameNation ? ' · 同属' + GEO.nationKey(r) : ' · 越境到' + (GEO.nationKey(r) === '无主之地' ? '无主之地' : GEO.nationKey(r)))) +
        '　<span style="color:' + dangerColor(f.p) + '">出行风险 ' + f.level + '%（' + esc(f.word) + '）</span>' +
        '<br><span style="color:#67717f">' + esc(i.position) + '</span></p>';
    });
    html += '<p>' + heatLine() + '</p>';
    html += '<p style="color:#67717f">去远处请点「长途出行」；想看全大陆，点顶栏「地图」。</p>';
    html += '</div>';
    modal('前 往 近 处 · 邻 地', html, [{ label: '关 闭', act: closeModal }]);
    Array.prototype.forEach.call(document.querySelectorAll('.rgn'), function (b) {
      b.addEventListener('click', function () {
        var name = b.getAttribute('data-rgn');
        closeModal();
        if (name === st.place) { hint('你已经在' + name + '了。'); return; }
        pushText('〔前往近处〕' + name, 'p-pick');
        doTurn('e', '我前往' + name);
      });
    });
  }
  function showLongPicker() {
    var far = [];
    (WD.REGIONS || []).forEach(function (r) {
      if (r.name === st.place) return;
      if (GEO.isAdjacent(st.place, r.name)) return;
      var bundle = ENG.travel.tiers(st, r.name);
      if (bundle) far.push({ r: r, b: bundle });
    });
    far.sort(function (a, b) { return a.b.plan.stops - b.b.plan.stops; });
    var html = '<div class="mb-list">';
    html += '<p>长途是<b>一站一站串过去</b>的多站行程。这里只列需要长途才能到的地方；' +
      '点名字先选走法（自己走／搭商队／雇车马／急行夜路），<b>每一档的天数、盘缠、疲劳与风险都不一样</b>，' +
      '能选哪一档要看你身上的钱、疲劳、伤势与这一路经过什么地方。</p>';
    var shown = 0;
    far.forEach(function (x) {
      if (shown >= 16) return;
      shown++;
      var r = x.r, p = x.b.plan;
      var open = x.b.tiers.filter(function (t) { return t.ok; });
      var best = open.slice().sort(function (a, b) { return a.atLeastOne - b.atLeastOne; })[0] || x.b.tiers[0];
      var quick = open.slice().sort(function (a, b) { return a.days - b.days; })[0] || best;
      var info = GEO.regionInfo(r) || { position: '' };
      var risk = best.atLeastOne;
      html += '<p class="rgn-row ' + dangerClass(risk) + '">' +
        '<button class="rgn long" type="button" data-long="' + esc(r.name) + '">长途前往 ' + esc(r.name) + '</button> ' +
        esc((r.kind ? GEO.kindCN(r.kind) : '') + (r.terrain || '') + ' · 威胁 ' + (r.threat || [1, 1]).join('-')) +
        '　<span style="color:' + dangerColor(risk) + '">全程出行风险 ' + Math.round(risk * 100) + '%（' + esc(ENG.travel.word(risk)) + '）</span>' +
        '<br><span style="color:#67717f">' + esc(info.position || '') + '　' + p.stops + ' 站 · ' + quick.days + '–' +
        Math.max(quick.days, best.days) + ' 天 · ' + open.length + ' 档可选（最稳 ' + esc(best.name) + '）</span></p>';
    });
    if (!shown) html += '<p>从这里出发，没有需要长途才能到的地方（邻地请点「前往近处」）。</p>';
    if (far.length > shown) html += '<p style="color:#67717f">另有 ' + (far.length - shown) + ' 处更远的地方没列出：先走近处缩短路程，再来看。</p>';
    html += '<p>' + heatLine() + '</p>';
    html += '<p style="color:#67717f">位面里的地方走不到，得借时空裂隙。</p>';
    html += '</div>';
    modal('长 途 出 行 · 需 要 多 站 的 地 方', html, [{ label: '关 闭', act: closeModal }]);
    Array.prototype.forEach.call(document.querySelectorAll('.rgn[data-long]'), function (b) {
      b.addEventListener('click', function () {
        var name = b.getAttribute('data-long');
        closeModal();
        confirmLongTrip(name, 'fast');
      });
    });
  }

  /* ---------------- 典籍 / 大事记 / 设置 / 关于 ---------------- */
  function showCodex(id, page) {
    var list = PANEL.codexList();
    var cur = id || (st && st.flags.codex) || list[0].id;
    if (st) st.flags.codex = cur;
    var btns = [];
    list.forEach(function (c) {
      btns.push({
        label: c.name, act: function () { showCodex(c.id, 0); }
      });
    });
    btns.push({ label: '关 闭', act: closeModal });
    var pageCount = 1;
    if (cur === 'mon') pageCount = Math.max(1, Math.ceil((WD.MONSTERS || []).length / 12));
    if (cur === 'legend') pageCount = Math.max(1, Math.ceil((WD.RUMORS || []).length / 12));
    if (cur === 'world') pageCount = Math.max(1, Math.ceil((WD.REGIONS || []).length / 12));
    var p = page || 0;
    var head = '';
    if (pageCount > 1) {
      head = '<div class="rowbtns"><button class="mb-x" style="width:auto;padding:4px 12px" onclick="window.__codexPage(' + Math.max(0, p - 1) + ')">上一页</button>' +
        '<span class="p" style="margin:0 8px">第 ' + (p + 1) + '/' + pageCount + ' 页</span>' +
        '<button class="mb-x" style="width:auto;padding:4px 12px" onclick="window.__codexPage(' + Math.min(pageCount - 1, p + 1) + ')">下一页</button></div>';
    }
    var body = '<div class="mb-list">' + head + LTX.renderMixed(PANEL.codex(cur, st || { pc: {}, rep: {}, crafts: {}, terrain: '平原' }, p)) + '</div>';
    global.__codexPage = function (np) { showCodex(cur, np); };
    /* 十八卷分卷全列出，按钮缩小靠紧，铺满典籍框底部 */
    modal('典 籍 · ' + (list.filter(function (x) { return x.id === cur; })[0] || {}).name, body, btns, 'codexbox wrapfoot');
  }
  function showChron() {
    var tl = WD.TIMELINE || {};
    var html = '<div class="mb-list"><h4>纪元</h4>';
    (tl.eras || []).forEach(function (e) { html += '<p><b>' + esc(e.name) + '</b>（' + esc(e.dur) + '）：' + esc(e.event) + '</p>'; });
    html += '<h4>近期大事（724-824）</h4>';
    (tl.events || []).forEach(function (e) { html += '<p><b>' + e.year + '年 ' + esc(e.name) + '</b>：' + esc(e.desc) + '</p>'; });
    html += '<h4>预言与星象</h4>';
    (tl.omens || []).forEach(function (o) { html += '<p>' + esc(o) + '</p>'; });
    html += '<h4>你的行迹</h4>';
    (st.pc.deeds || []).slice(-20).forEach(function (d) { html += '<p>· ' + esc(d) + '</p>'; });
    html += '</div>';
    modal('大 事 记', html);
  }
  /* 联网接入的统一入口：顶栏、起始页、设置弹层、底部按钮四处都指到这里 */
  function openAI() {
    if (global.AI && global.AI.settings) { global.AI.settings(); return; }
    modal('AI 接 入', '<div class="mb-list"><p>这个构建里没有联网层。用官网给的成品文件（含 net.js 的那份）就能接入。</p></div>');
  }
  function showSettings() {
    var aiLine = global.AI
      ? ('<h3>AI 接 入</h3><p>底部「AI 接入」或这里都能打开设置：选「DeepSeek 官方」粘一个 sk- 开头的 Key，' +
        '或者填本机 Ollama / LM Studio 的地址。每台设备各配各的，不需要服务器。</p>')
      : '';
    var html = '<div class="mb-list">' +
      '<h3>存 档</h3><p>游戏在每回合结束后自动写入本机浏览器存储（键名 jymf_save_v1）。这里不会上传任何数据。</p>' +
      aiLine +
      '<h3>操 作</h3><p>选项一律 a-e：a-d 为预设，e 为自定义（也可在底部直接打字）。键盘 a-e 或 1-5 选择，回车提交输入，Esc 关闭弹层。</p>' +
      '<h3>显 示</h3><p>界面面板全部由 LaTeX 美化框渲染，不使用 emoji。窗口宽度不足时右侧边栏会占满屏宽。</p>' +
      '</div>';
    var btns = [];
    if (global.AI) btns.push({ label: 'AI 接 入 设 置', act: function () { closeModal(); openAI(); } });
    btns.push({ label: '清 除 存 档 并 重 开', act: function () { restart(); } });
    btns.push({ label: '关 闭', act: closeModal });
    modal('设 置', html, btns);
  }
  function showAbout() {
    var html = '<div class="mb-list">' +
      '<h3>剑 与 魔 法 命 运 编 年 史</h3>' +
      '<p>依据《剑与魔法命运编年史》设定集 v1.0（卷一至卷二十七）实现的单文件网页游戏：冷峻写实、高自由度、因果严明。</p>' +
      '<h3>在 线 版 与 联 网</h3><p>在线游玩地址：subang08.github.io/jymf-chronicle　（也可以离线双击本文件玩）。' +
      '接 AI：底部「AI 接入」→ 选 DeepSeek 官方 → 粘一个 sk- 开头的 Key；' +
      '对话、事件、每回合的四个选项会交给模型写，骰子与数值仍在这台设备上算。</p>' +
      '<h3>实 现 范 围</h3><p>十二种族、十职业、十身份、十背景、SSS 天赋十选一；九阵营与六级声望；' +
      '八门副职业五阶进度；星母历十二个月与六个节日；十七种怪物与三张遭遇表；' +
      '任务生成表（d10+d8+d12+d10）；货币四档与物价表；疲劳六级、饥渴、负重、永久损伤与生死豁免。</p>' +
      '<h3>写 作 约 束</h3><p>叙述遵守设定集的强制约束：先环境、再身体反应、后语言；不写上帝视角的内心灌输，' +
      '不用二元对立的模板句式，不用副词凑氛围。</p>' +
      '<h3>技 术</h3><p>单文件 HTML，零外部依赖，可离线运行；随机数使用种子随机，同一存档可复现。</p>' +
      '</div>';
    modal('关 于', html);
  }

  /* ---------------- 启动 ---------------- */
  function bindEvents() {
    /* 一律走 on()：缺元素只跳过，绝不让整页按钮跟着一起死 */
    function on(id, fn) {
      var el = $(id);
      if (!el) return null;
      el.addEventListener('click', fn);
      return el;
    }
    on('btnStatus', function () {
      if (!st || st.phase === 'landing') { hint('还没有角色。先开始游戏。'); return; }
      openSide('status');
    });
    on('btnBag', function () {
      if (!st || st.phase === 'landing') { hint('还没有物品。先开始游戏。'); return; }
      openSide('bag');
    });
    on('btnCard', function () {
      if (!st || !st.pc || st.phase === 'landing') { hint('还没有角色卡。'); return; }
      if (st.phase === 'create') { modal('角 色 卡 · 待 确 认', LTX.renderMixed(CREATE.preview(st))); return; }
      modal('角 色 卡', LTX.renderMixed(PANEL.card(st)));
    });
    on('btnMap', function () { showMap('world'); });
    on('btnCodex', function () { showCodex(); });
    on('btnChron', showChron);
    on('btnSet', showSettings);
    on('sideClose', closeSide);
    Array.prototype.forEach.call(document.querySelectorAll('#sideTabs button'), function (b) {
      b.addEventListener('click', function () { openSide(b.getAttribute('data-side')); });
    });
    on('send', submitInput);
    var cmd = $('cmd');
    if (cmd) {
      cmd.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitInput(); }
      });
      cmd.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(96, this.scrollHeight) + 'px';
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) {
        if (e.key === 'Escape') { e.target.blur(); }
        return;
      }
      if (e.key === 'Escape') { closeModal(); closeSide(); return; }
      var k = String(e.key).toLowerCase();
      var live = {};
      (curOpts || []).forEach(function (o) { live[o.k] = 1; });
      if (/^[a-z]$/.test(k) && !live[k] && !Object.keys(live).length && st && st.phase === 'playing') {
        hint('选项还在推算：稍等一下，或直接在下面打字。');
        return;
      }
      if (/^[a-z]$/.test(k) && live[k]) { e.preventDefault(); choose(k); return; }
      if (/^[1-9]$/.test(k) && curOpts.length) {
        var idx = parseInt(k, 10) - 1;
        if (curOpts[idx]) { e.preventDefault(); choose(curOpts[idx].k); }
      }
    });
    /* 起始页按钮 */
    on('landStart', function () { hideLanding(); startCreate(true); });
    on('landContinue', function () { hideLanding(); resume(); });
    on('landMap', function () { showMap('world'); });
    on('landCodex', function () { showCodex(); });
    on('landChron', showChron);
    on('landAI', openAI);
    on('landSet', showSettings);
    on('btnAI', openAI);
    on('landAbout', showAbout);
  }
  function hideLanding() { $('landing').classList.add('hidden'); }
  function showLanding() {
    $('landing').classList.remove('hidden');
    var mottos = [
      '冷 峻 写 实 · 高 度 自 由 · 因 果 严 明',
      '众 星 之 母 沉 睡 于 世 界 之 核',
      '当 天 空 染 上 血 色 ， 深 渊 之 喉 将 再 度 开 启',
      '没 有 复 活 魔 法 ； 死 了 就 是 死 了'
    ];
    $('landMotto').textContent = mottos[ENG.int(0, mottos.length - 1)];
  }
  function resume() {
    if (!st || !st.pc) { startCreate(true); return; }
    if (st.phase === 'dead') {
      restoreHistory();
      pushText('（这一局已经结束。左侧节点可以回看全过程；要接着玩，就点下面的「重新开始新角色」。）', 'p-sys');
      presentDead();
      return;
    }
    if (st.phase === 'create') {
      if (!st.create || st.create.i == null) { startCreate(true); return; }
      restoreHistory();
      renderCreateNode();
      return;
    }
    restoreHistory();
    pushText('—— 继续。', 'p-pick');
    if (st.flags.dying) presentDying();
    else if (st.combat) presentCombat();
    else nextNode(false);
  }
  /* 死亡后的按钮区（不重复打印死亡通告） */
  function presentDead() {
    renderOpts([]);
    var chips = $('chips');
    chips.innerHTML = '';
    var b1 = el('button', 'chip key', '重 新 开 始 新 角 色');
    b1.type = 'button'; b1.addEventListener('click', restart);
    var b2 = el('button', 'chip', '查 看 角 色 卡');
    b2.type = 'button'; b2.addEventListener('click', function () { modal('角 色 卡', LTX.renderMixed(PANEL.card(st))); });
    var b3 = el('button', 'chip', '大 事 记');
    b3.type = 'button'; b3.addEventListener('click', showChron);
    chips.appendChild(b1); chips.appendChild(b2); chips.appendChild(b3);
    hint('这一局结束了。世界照旧，它不为你停留。');
  }

  var booted = false;
  function boot() {
    if (booted) return;          /* 自动启动与测试调用只生效一次，避免事件重复绑定 */
    booted = true;
    bindEvents();
    showLanding();
    var s = loadSave();
    if (s) {
      st = s;
      ENG.seed(st.seed);
      $('landContinue').style.display = '';
      $('landContinue').textContent = '继 续 游 戏 · ' + st.pc.name + ' Lv' + st.pc.level;
    } else {
      st = newState();
      ENG.seed(st.seed);
      st.phase = 'landing';
    }
    $('verLabel').textContent = '星母历' + st.time.year + '年 · ' + ENG.time.monthName(st.time);
  }

  global.GAME = {
    boot: boot, get state() { return st; }, set state(v) { st = v; },
    choose: choose, push: push, pushText: pushText, pushPanel: pushPanel, divider: divider,
    turn: function () { nextNode(false); },
    startCreate: startCreate, restart: restart, resume: resume,
    openSide: openSide, closeSide: closeSide, renderSide: renderSide,
    modal: modal, closeModal: closeModal, showCodex: showCodex, showChron: showChron,
    showMap: showMap, showNearbyPicker: showNearbyPicker, showLongPicker: showLongPicker,
    jumpTo: jumpTo, save: save, loadSave: loadSave, newState: newState, migrate: migrate,
    ACT: ACT, vitalLine: vitalLine, presentScene: presentScene, attrKeyOf: attrKeyOf,
    hint: hint, modalOpen: function () { return !$('modal').classList.contains('hidden'); },
    interpret: interpret, aiEvent: aiEvent, aiResolve: aiResolve,
    refreshView: refreshView, refreshClick: refreshClick,
    /* 联网选项：把合并逻辑与内部计数暴露出来，便于测试与排查（只读） */
    aiMergeOptions: mergeAiOptions, aiInfo: function () {
      return { token: aiOptToken, groups: optGroups.length, live: !!liveOptGroup(), on: aiOn(), roles: ROLE_ACTS };
    },
    get opts() { return curOpts; }
  };
  global.__bootGame = boot;

  /* 自动启动：脚本在 body 末尾，DOM 已就绪；若仍是加载中就等 DOMContentLoaded。
     这一步没有，页面上的按钮就会全是死键。 */
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(window);
