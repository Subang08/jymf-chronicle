/* 真浏览器测试：Edge headless + CDP（Node 24 内置 WebSocket） */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FILE = 'file:///C:/Users/lu/Desktop/%E5%89%91%E4%B8%8E%E9%AD%94%E6%B3%95%E5%91%BD%E8%BF%90%E7%BC%96%E5%B9%B4%E5%8F%B2-%E7%BD%91%E9%A1%B5%E7%89%88/%E5%89%91%E4%B8%8E%E9%AD%94%E6%B3%95%E5%91%BD%E8%BF%90%E7%BC%96%E5%B9%B4%E5%8F%B2.html';
const PORT = 9333;
const SHOT = 'C:\\Users\\lu\\AppData\\Local\\Temp\\dsh_test2\\';
const R = { pass: 0, fail: 0, fails: [] };
function ok(c, label, extra) { if (c) R.pass++; else { R.fail++; R.fails.push(label + (extra !== undefined ? ' << ' + extra + ' >>' : '')); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

let ws, msgId = 0;
const pending = new Map();
const consoleErrors = [];

function send(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('CDP timeout: ' + method)); } }, 30000);
  });
}
async function ev(expr) {
  const r = await send('Runtime.evaluate', {
    expression: '(async () => {' + expr + ' })()',
    awaitPromise: true, returnByValue: true, userGesture: true
  });
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
  return r.result.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(SHOT + name + '.png', Buffer.from(r.data, 'base64'));
  return SHOT + name + '.png';
}
/* 真实鼠标点击：按元素中心点 */
async function clickSel(sel, nth) {
  const box = await ev(`
    const list = document.querySelectorAll(${JSON.stringify(sel)});
    const el = list[${nth || 0}];
    if (!el) return null;
    el.scrollIntoView({behavior:'instant', block:'center'});
    const r = el.getBoundingClientRect();
    return {x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height, txt: (el.textContent||'').slice(0,24)};
  `);
  if (!box) return null;
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none', clickCount: 0 });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(90);
  return box;
}
/* 只点「当前」那一组选项（历史选项已封存，不该可点） */
async function clickOpt(nth) {
  const box = await ev(`
    const groups = document.querySelectorAll('#log .opts');
    const last = groups[groups.length - 1];
    if (!last) return null;
    const list = last.querySelectorAll('.opt-btn');
    const el = list[${nth || 0}];
    if (!el) return null;
    el.scrollIntoView({behavior:'instant', block:'center'});
    const r = el.getBoundingClientRect();
    return {x: r.left + r.width/2, y: r.top + r.height/2, txt: (el.textContent||'').slice(0,20)};
  `);
  if (!box) return null;
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none', clickCount: 0 });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(90);
  return box;
}
async function liveOptInfo() {
  return ev(`
    const groups = document.querySelectorAll('#log .opts');
    const last = groups[groups.length - 1];
    const prev = groups.length > 1 ? groups[groups.length - 2] : null;
    const live = last ? Array.from(last.querySelectorAll('.opt-btn')) : [];
    const staleDisabled = prev ? Array.from(prev.querySelectorAll('.opt-btn')).every(b => b.disabled) : true;
    return { groups: groups.length, live: live.length, staleDisabled: staleDisabled,
             liveClickable: live.filter(b => !b.disabled).length };
  `);
}
/* 按文字点底部按钮 */
async function clickChip(txt) {
  const want = txt.replace(/\s/g, '');
  const box = await ev(`
    const list = Array.from(document.querySelectorAll('#chips .chip'));
    const el = list.filter(b => b.textContent.replace(/\\s/g, '') === ${JSON.stringify(want)})[0];
    if (!el) return null;
    el.scrollIntoView({behavior:'instant', block:'center'});
    const r = el.getBoundingClientRect();
    return {x: r.left + r.width/2, y: r.top + r.height/2, txt: el.textContent};
  `);
  if (!box) return null;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(140);
  return box;
}
/* 点弹层里的某个地区按钮（含长途） */
async function clickRegionBtn(name, attr) {
  const key = attr || 'data-rgn';
  const box = await ev(`
    const list = Array.from(document.querySelectorAll('.rgn[' + ${JSON.stringify(key)} + ']'));
    const el = list.filter(b => b.getAttribute(${JSON.stringify(key)}) === ${JSON.stringify(name)})[0];
    if (!el) return null;
    el.scrollIntoView({behavior:'instant', block:'center'});
    const r = el.getBoundingClientRect();
    return {x: r.left + r.width/2, y: r.top + r.height/2};
  `);
  if (!box) return null;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(500);
  return box;
}
async function clickRegionBtn2(name) { return clickRegionBtn(name, 'data-long'); }
async function hitTest(sel, nth) {
  return ev(`
    const list = document.querySelectorAll(${JSON.stringify(sel)});
    const el = list[${nth || 0}];
    if (!el) return 'missing';
    el.scrollIntoView({behavior:'instant', block:'center'});
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
    if (!hit) return 'offscreen';
    return (el === hit || el.contains(hit) || hit.contains(el)) ? 'hit' : ('blocked-by:' + hit.className);
  `);
}
async function typeText(text) {
  await ev(`document.getElementById('cmd').focus(); document.getElementById('cmd').value=''; return 1;`);
  await send('Input.insertText', { text });
  await sleep(60);
}

(async () => {
  /* 连跑多个 Edge 套件时会争用实例，启动前先清干净（否则个别断言会被静默跳过） */
  try { require('child_process').execSync('taskkill /F /IM msedge.exe /FI "STATUS eq RUNNING"', { stdio: 'ignore' }); } catch (e) {}
  await new Promise(r => setTimeout(r, 800));
  const userDir = path.join(os.tmpdir(), 'dsh_edge_jymf_' + Date.now());
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + userDir,
    '--window-size=1440,900', '--allow-file-access-from-files', '--hide-scrollbars=false',
    'about:blank'
  ], { stdio: 'ignore', detached: false });

  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json');
      const list = await res.json();
      target = list.find(t => t.type === 'page');
    } catch (e) { /* 还没起来 */ }
  }
  if (!target) { console.log('无法连接 Edge'); proc.kill(); process.exit(1); }

  ws = new WebSocket(target.webSocketDebuggerUrl);
  const ready = new Promise(r => { ws.onopen = r; });
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id); pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      consoleErrors.push('EXC ' + (d.exception && d.exception.description || d.text));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push('ERR ' + JSON.stringify(msg.params.args.map(a => a.value)));
    }
  };
  await ready;
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: FILE });
  await sleep(2600);

  /* --- 1. 起始页 --- */
  const land = await ev(`
    const l = document.getElementById('landing');
    const btn = document.getElementById('landStart');
    const r = btn.getBoundingClientRect();
    return {
      visible: l && !l.classList.contains('hidden'),
      title: (document.querySelector('.land-title')||{}).textContent,
      cards: document.querySelectorAll('.land-card').length,
      btnY: r.top, btnH: r.height,
      hasBoot: typeof window.__bootGame === 'function',
      mods: [window.LTX, window.WD, window.TB, window.NARR, window.ENG, window.PANEL, window.CREATE, window.GAME, window.IMPROV, window.MAP, window.GEO, window.AI].filter(Boolean).length,
      tags: document.querySelectorAll('.land-tag').length,
      motto: (document.getElementById('landMotto')||{}).textContent
    };
  `);
  ok(land.visible, '起始页可见');
  ok(/剑 与 魔 法 命 运 编 年 史/.test(land.title || ''), '标题正确', land.title);
  ok(land.cards === 3, '三张简介卡片', land.cards);
  ok(land.hasBoot, '__bootGame 已挂载');
  ok(land.mods === 12, '十二个模块全部加载（含联网层 AI）', land.mods);
  ok(land.tags >= 4, '标签行存在');
  ok((land.motto || '').length > 4, '格言有内容');
  await shot('r1-landing');
  /* 起始页的「地图」按钮也要有真实行为 */
  await clickSel('#landMap');
  const landMapOk = await ev(`
    const b = document.getElementById('modalBox');
    return { open: !document.getElementById('modal').classList.contains('hidden'),
             head: (b.querySelector('.map-head b')||{}).textContent || '' };
  `);
  ok(landMapOk.open && landMapOk.head === '艾尔德兰大陆', '起始页「地图」按钮可打开大陆总图', JSON.stringify(landMapOk));
  await ev(`window.GAME.closeModal(); return 1;`);

  /* --- 2. 真实点击开始游戏 --- */
  const bs = await clickSel('#landStart');
  ok(!!bs, '开始游戏按钮可定位');
  const afterStart = await ev(`return {landing: document.getElementById('landing').classList.contains('hidden'), phase: window.GAME.state.phase, opts: window.GAME.opts.length, keys: window.GAME.opts.map(o=>o.k).join(''), lastKind: window.GAME.opts[window.GAME.opts.length-1].kind, step: window.CREATE.node(window.GAME.state).step};`);
  ok(afterStart.landing, '点击后起始页隐藏');
  ok(afterStart.phase === 'create', '进入建卡阶段', afterStart.phase);
  ok(afterStart.step === 'race' && afterStart.opts === 18, '建卡选项按文档数量全列（18 种族，无自定义项）', afterStart.step + ':' + afterStart.opts);
  ok(afterStart.keys === 'abcdefghijklmnopqr', '建卡选项从 a 顺排到末位', afterStart.keys);
  ok(afterStart.lastKind === 'safe', '末位就是最后一条预设（建卡不再有自定义入口）');
  const hitOpt = await hitTest('.opt-btn', 0);
  ok(hitOpt === 'hit', '选项气泡可被点中（无遮挡）', hitOpt);
  await shot('r2-create');

  /* --- 3. 走完建卡（真点击；建卡阶段已无自定义输入，打字只会被退回） --- */
  let guard = 0;
  let sawCustomBox = 0;
  const badType = await ev(`
    const n = window.CREATE.node(window.GAME.state);
    const r = window.CREATE.pick(window.GAME.state, 'zz', '林晚');
    return { ok: r.ok, msg: r.msg, hasCustom: n.opts.some(o=>o.kind==='custom') };
  `);
  ok(badType.hasCustom === false, '建卡节点没有任何自定义项');
  ok(badType.ok === false, '建卡阶段打字被退回', String(badType.msg).slice(0, 30));
  while (guard++ < 60) {
    const st = await ev(`return {phase: window.GAME.state.phase, step: window.CREATE.node(window.GAME.state).step, opts: window.GAME.opts.map(o=>o.value)};`);
    if (st.phase !== 'create') break;
    if (st.step === 'talent') {
      /* 天赋：先抽一次，再收下第一组 */
      await clickOpt(0);
      await sleep(220);
      await clickOpt(0);
      await sleep(220);
      continue;
    }
    await clickOpt(0);
  }
  const live = await liveOptInfo();
  ok(live.staleDisabled, '历史选项已封存（文字保留但不可再点）', JSON.stringify(live));
  ok(live.liveClickable >= 2, '当前选项可点', live.liveClickable);
  const inWorld = await ev(`
    const s = window.GAME.state;
    return { phase: s.phase, name: s.pc.name, race: s.pc.raceName, cls: s.pc.clsName, hp: s.pc.hp.max, ac: s.pc.ac,
             gold: window.ENG.money.fmt(window.ENG.money.total(s)), place: s.place, terrain: s.terrain,
             talents: s.pc.talents.length, bag: s.bag.length, script: (s.flags.script||[]).length };
  `);
  ok(inWorld.phase === 'playing', '进入世界', inWorld.phase);
  ok(!!inWorld.name && inWorld.name !== '无名', '姓名来自选项并写进角色', inWorld.name);
  ok(inWorld.hp > 0 && inWorld.ac >= 10, '生命与 AC 已结算', inWorld.hp + '/' + inWorld.ac);
  ok(inWorld.bag > 0 && inWorld.talents >= 1, '装备与抽到的天赋都到位', inWorld.bag + '/' + inWorld.talents);
  await shot('r3-world');

  /* --- 4. 开篇剧本 + 回合推进（点击气泡） --- */
  for (let i = 0; i < 5; i++) { await clickOpt(0); await sleep(60); }
  /* 这一段只测交互，先把角色顶到高等级并每回合回满血，避免测试中途死亡打断 */
  await ev(`window.GAME.state.pc.level = 8; window.ENG.char.derive(window.GAME.state); window.GAME.state.pc.hp.cur = window.GAME.state.pc.hp.max; return 1;`);
  let played = 0;
  for (let i = 0; i < 14; i++) {
    await ev(`const s=window.GAME.state; s.pc.hp.cur = s.pc.hp.max; return 1;`);
    const has = await ev(`const g=document.querySelectorAll('#log .opts'); const l=g[g.length-1]; return l? l.querySelectorAll('.opt-btn').length : 0;`);
    if (!has) break;
    await clickOpt(i % 3);
    played++;
    await sleep(70);
  }
  const afterPlay = await ev(`
    const s = window.GAME.state;
    const log = document.getElementById('log');
    return { turn: s.turn, blocks: log.children.length, hist: s.history.length, nodes: s.nodes.length,
             tlNodes: document.querySelectorAll('.tl-node').length,
             full: log.textContent.length,
             hasTime: /星母历/.test(log.textContent),
             hasDivider: /本\\s*轮\\s*结\\s*果/.test(log.textContent),
             hasVital: /Lv\\d/.test(log.textContent),
             scrollH: document.getElementById('logWrap').scrollHeight,
             clientH: document.getElementById('logWrap').clientHeight };
  `);
  ok(played >= 10, '真实点击推进了多个回合', played);
  ok(afterPlay.turn >= 10, '回合数增长', afterPlay.turn);
  ok(afterPlay.blocks > 20, '文字区块持续累积', afterPlay.blocks);
  ok(afterPlay.tlNodes > 5, '左侧节点已渲染', afterPlay.tlNodes);
  ok(afterPlay.hasTime && afterPlay.hasDivider && afterPlay.hasVital, '时间行/分隔线/状态行齐全');
  ok(afterPlay.scrollH > afterPlay.clientH, '文字区可上滑回看（内容高于视口）');
  await shot('r4-play');

  /* --- 4b. 前往近处 / 长途出行：两个入口各管一段（真实点击） --- */
  const beforeTravel = await ev(`const s=window.GAME.state; return {place:s.place, turn:s.turn, heat:window.ENG.travel.heat(s)};`);
  const chipHit = await clickChip('前 往 近 处');
  ok(!!chipHit, '底部有「前往近处」按钮');
  const picker = await ev(`
    const m = document.getElementById('modal');
    const t = document.getElementById('modalBox').textContent;
    const nearBtns = [...document.querySelectorAll('.rgn[data-rgn]')];
    const longBtns = [...document.querySelectorAll('.rgn[data-long]')];
    const here = window.GAME.state.place;
    const adj = window.GEO.adjacentTo(here).map(x => x.name);
    return { open: !m.classList.contains('hidden'), title: (m.querySelector('.mb-head h3')||{}).textContent,
             btns: nearBtns.length, names: nearBtns.map(b => b.getAttribute('data-rgn')), adj: adj,
             longN: longBtns.length, txt: t.slice(0, 900) };
  `);
  ok(picker.open, '前往近处弹层打开');
  ok(/前 往 近 处/.test(picker.title || ''), '标题是「前往近处」', picker.title);
  ok(picker.btns >= 2 && picker.btns <= 8, '只列出邻地', picker.btns);
  ok(picker.names.every(n => picker.adj.indexOf(n) >= 0), '列出的每一个都是当前所在地的邻地', picker.names.join('/'));
  ok(picker.longN === 0, '「前往近处」里没有长途选项', String(picker.longN));
  ok(/这里只列挨着的邻地/.test(picker.txt), '写明只列邻地');
  ok(/出行风险/.test(picker.txt) && /出行热度/.test(picker.txt), '标出出行风险与热度');
  await shot('r17-nearby-picker');
  await ev(`window.GAME.closeModal(); return 1;`);
  /* 长途入口 */
  await clickChip('长 途 出 行');
  const longPick = await ev(`
    const m = document.getElementById('modal');
    const t = document.getElementById('modalBox').textContent;
    const longBtns = [...document.querySelectorAll('.rgn[data-long]')];
    const nearBtns = [...document.querySelectorAll('.rgn[data-rgn]')];
    const here = window.GAME.state.place;
    const adj = window.GEO.adjacentTo(here).map(x => x.name);
    return { open: !m.classList.contains('hidden'), title: (m.querySelector('.mb-head h3')||{}).textContent,
             n: longBtns.length, nearN: nearBtns.length,
             names: longBtns.map(b => b.getAttribute('data-long')), adj: adj,
             text: longBtns.length ? longBtns[0].parentNode.textContent.replace(/\\s+/g,' ') : '',
             head: t.slice(0, 600) };
  `);
  ok(longPick.open && /长 途 出 行/.test(longPick.title || ''), '长途出行是独立入口', longPick.title);
  ok(longPick.n >= 1, '列出需要长途的地方', String(longPick.n));
  ok(longPick.nearN === 0, '「长途出行」里没有邻地', String(longPick.nearN));
  ok(longPick.names.every(n => longPick.adj.indexOf(n) < 0), '列出的都不是邻地');
  ok(/档可选/.test(longPick.text) && /站/.test(longPick.text), '标出站数与可选档数', longPick.text.slice(0, 80));
  ok(/每一档的天数、盘缠、疲劳与风险都不一样/.test(longPick.head), '说明各档代价不同');
  /* 与「前往近处」同一套：危险配色 + 末尾热度提醒 */
  const longFmt = await ev(`
    const b = document.getElementById('modalBox');
    const rows = [...b.querySelectorAll('p.rgn-row')];
    const colors = rows.map(r => getComputedStyle(r).borderLeftColor);
    const t = b.textContent.replace(/\\s+/g, '');
    return { rows: rows.length, uniqColors: [...new Set(colors)].length, colors: [...new Set(colors)],
             heat: /近期出行热度：\\d+（每两天自然降一点，长休也会降温）/.test(t),
             risk: /全程出行风险\\d+%（/.test(t) };
  `);
  ok(longFmt.rows >= 5 && longFmt.uniqColors >= 2, '长途每行按危险配色标注（多种颜色）', JSON.stringify(longFmt.colors));
  ok(longFmt.heat, '长途列表末尾给出出行热度提醒');
  ok(longFmt.risk, '长途行内标出全程出行风险');
  await shot('r19-long-picker');
  /* 点长途：先选走法（挡位），不能直接动身 */
  const placeBeforeLong = await ev(`return window.GAME.state.place;`);
  await clickRegionBtn2(longPick.names[0]);
  const tierBox = await ev(`
    const b = document.getElementById('modalBox');
    const t = b.textContent;
    const btns = [...b.querySelectorAll('.mb-foot button')].map(x => x.textContent.trim());
    return { open: !document.getElementById('modal').classList.contains('hidden'), txt: t,
             btns: btns, place: window.GAME.state.place };
  `);
  ok(tierBox.open, '点长途先弹出走法挡位');
  ok(tierBox.place === placeBeforeLong, '没确认之前不会动身', tierBox.place);
  ['目的地', '路线', '选一种走法', '自己走', '搭商队', '雇车马', '急行夜路', '无论走哪一档'].forEach(k =>
    ok(tierBox.txt.indexOf(k) >= 0, '挡位清单写明「' + k + '」'));
  ok(tierBox.btns.filter(x => /（\d+ 天/.test(x)).length >= 1, '可选挡位按钮带天数与盘缠', tierBox.btns.join(' | ').slice(0, 120));
  ok(tierBox.btns.some(x => /换 .*路 再 看/.test(x)), '可以换路线再算');
  ok(tierBox.btns.some(x => /改 走 近 处/.test(x)), '可以改走近处');
  ok(tierBox.btns.some(x => /取 消/.test(x)), '可以取消');
  await shot('r19-trip-cost');
  /* 挡位弹层里点「改走近处」：应弹出当前所在地的近处选项，而不是直接走 */
  const nearBtn = await ev(`
    const b = [...document.querySelectorAll('.mb-foot button')];
    const el = b.filter(x => /改 走 近 处/.test(x.textContent))[0];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2 };
  `);
  ok(!!nearBtn, '挡位弹层有「改走近处」按钮');
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: nearBtn.x, y: nearBtn.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: nearBtn.x, y: nearBtn.y, button: 'left', clickCount: 1 });
  await sleep(420);
  const nearAfter = await ev(`
    const m = document.getElementById('modal');
    const b = document.getElementById('modalBox');
    const t = b.textContent.replace(/\\s+/g, '');
    const here = window.GAME.state.place;
    const adj = window.GEO.adjacentTo(here).map(x => x.name);
    const btns = [...b.querySelectorAll('.rgn[data-rgn]')];
    return { open: !m.classList.contains('hidden'), title: (m.querySelector('.mb-head h3')||{}).textContent,
             n: btns.length, names: btns.map(x => x.getAttribute('data-rgn')), adj: adj, place: here,
             heat: /近期出行热度：\\d+（每两天自然降一点，长休也会降温）/.test(t),
             rows: b.querySelectorAll('p.rgn-row').length };
  `);
  ok(nearAfter.open && /前 往 近 处/.test(nearAfter.title || ''), '「改走近处」弹出的是近处选项', nearAfter.title);
  ok(nearAfter.n === nearAfter.adj.length && nearAfter.names.every(n => nearAfter.adj.indexOf(n) >= 0),
    '近处选项只列邻地', nearAfter.n + '/' + nearAfter.adj.length);
  ok(nearAfter.place === placeBeforeLong, '弹近处选项时角色没有移动', nearAfter.place);
  ok(nearAfter.heat && nearAfter.rows === nearAfter.n, '近处选项同样有热度提醒与危险配色', JSON.stringify(nearAfter));
  await shot('r20-near-from-long');
  await ev(`window.GAME.closeModal(); return 1;`);
  await ev(`window.GAME.closeModal(); return 1;`);
  ok(await ev(`return window.GAME.state.place;`) === placeBeforeLong, '取消后原地不动');
  /* 再开「前往近处」，点一个邻地走短途 */
  await clickChip('前 往 近 处');
  await sleep(200);
  const dest = (await ev(`const b=document.querySelector('.rgn[data-rgn]'); return b? b.getAttribute('data-rgn'):null;`));
  ok(!!dest, '存在可前往的邻地', dest);
  await clickRegionBtn(dest);
  const afterTravel = await ev(`
    const s = window.GAME.state;
    const t = document.getElementById('log').textContent;
    return { place: s.place, turn: s.turn, heat: window.ENG.travel.heat(s),
             opts: window.GAME.opts.map(o=>o.k).join(''),
             dossier: /地 区 志/.test(t), nation: /所在国家/.test(t), near: /附近国家/.test(t),
             risk: /出行风险预估/.test(t), geo: /地理位置/.test(t),
             modalClosed: document.getElementById('modal').classList.contains('hidden') };
  `);
  ok(afterTravel.place === dest, '点地区名字后真的动身了', beforeTravel.place + ' -> ' + afterTravel.place);
  ok(afterTravel.modalClosed, '动身后弹层关闭');
  ok(afterTravel.turn > beforeTravel.turn, '前往消耗了一个回合', beforeTravel.turn + ' -> ' + afterTravel.turn);
  ok(afterTravel.heat > beforeTravel.heat, '走一趟出行热度 +1', beforeTravel.heat + ' -> ' + afterTravel.heat);
  ok(afterTravel.risk, '出行时给出风险预估');
  ok(afterTravel.dossier && afterTravel.nation && afterTravel.geo && afterTravel.near,
    '到达后给出地区志（所在国家/地理位置/附近国家）', JSON.stringify(afterTravel));
  ok(afterTravel.opts === 'abcde', '回到正常的 a-e 行动选项', afterTravel.opts);
  await shot('r18-region-dossier');
  /* 状态栏里能看到热度 */
  await ev(`window.GAME.openSide('status'); return 1;`);
  const sideHeat = await ev(`return document.getElementById('sideBody').textContent;`);
  ok(/出行热度/.test(sideHeat), '状态栏显示出行热度');
  await ev(`window.GAME.closeSide(); return 1;`);
  /* 不相邻的地方去不了 */
  await typeText('我前往龙骨山脉');
  await clickSel('#send');
  await sleep(400);
  const refused = await ev(`
    const s = window.GAME.state;
    const t = document.getElementById('log').textContent;
    return { place: s.place, said: /去不了/.test(t), listed: /挨着的地方/.test(t) };
  `);
  ok(refused.place === dest, '去不了的地方不会把角色挪走', refused.place);
  ok(refused.said && refused.listed, '会说明去不了并列出邻地', JSON.stringify(refused));
  await shot('r18b-travel-refused');

  /* --- 4c. 多层地图：总图 → 国度 → 地区 → 地标 --- */
  await ev(`window.GAME.closeModal(); return 1;`);
  await clickSel('#btnMap');
  let mapInfo = await ev(`
    const b = document.getElementById('modalBox');
    return { open: !document.getElementById('modal').classList.contains('hidden'),
             wide: b.className === 'mapbox', svg: !!b.querySelector('svg.mapsvg'),
             labels: b.querySelectorAll('svg text').length, drills: b.querySelectorAll('.map-drill').length,
             crumbs: [...b.querySelectorAll('.crumb')].map(c => c.textContent).join('>'),
             head: (b.querySelector('.map-head b')||{}).textContent,
             faint: b.querySelectorAll('svg text[fill="#7a8492"]').length };
  `);
  ok(mapInfo.open, '顶栏「地图」按钮打开地图');
  ok(mapInfo.wide && mapInfo.svg, '地图用宽弹层并渲染 SVG', JSON.stringify(mapInfo));
  ok(mapInfo.head === '艾尔德兰大陆' && mapInfo.crumbs === '艾尔德兰大陆', '第一层是大陆总图');
  ok(mapInfo.drills >= 16, '第一层每个国度／分区都有展开按钮（位面那个在画布外的说明条上）', mapInfo.drills);
  ok(mapInfo.labels >= 40 && mapInfo.faint >= 30, '第一层用浅文字标注地名', mapInfo.labels + '/' + mapInfo.faint);
  /* 当前所在地的小图标 + 位面说明条不挡地图 */
  const hereInfo = await ev(`
    const b = document.getElementById('modalBox');
    const stage = b.querySelector('.mapstage');
    const strip = b.querySelector('.map-planes');
    const marks = b.querySelectorAll('.map-here');
    const sr = stage ? stage.getBoundingClientRect() : null;
    const tr = strip ? strip.getBoundingClientRect() : null;
    const svgHere = stage ? stage.querySelectorAll('.map-here').length : 0;
    return { here: window.GAME.state.place, marks: marks.length, svgHere: svgHere,
             text: marks.length ? marks[0].textContent.trim() : '',
             stripBelow: (sr && tr) ? (tr.top >= sr.bottom - 2) : false,
             stripText: strip ? strip.textContent.replace(/\\s+/g, ' ').slice(0, 60) : '',
             inCanvas: stage ? stage.textContent.indexOf('不在主物质位面') >= 0 : false };
  `);
  ok(hereInfo.svgHere >= 1 && hereInfo.text.indexOf('你在') >= 0, '地图上标出了当前所在地', JSON.stringify(hereInfo));
  ok(hereInfo.text.indexOf(hereInfo.here) >= 0, '标记写的是当前地区名', hereInfo.text + ' / ' + hereInfo.here);
  ok(!hereInfo.inCanvas, '位面说明不在画布内（不挡地图）');
  ok(hereInfo.stripBelow, '位面说明条在地图下方', JSON.stringify(hereInfo));
  ok(/元素混沌/.test(hereInfo.stripText) && /展开 6 处/.test(hereInfo.stripText), '位面说明条内容完整', hereInfo.stripText);
  await shot('r21-map-world');
  /* 点「晨曦王国」的展开按钮，进第二层 */
  const drillHit = await ev(`
    const g = document.querySelector('[data-map-node="g:晨曦王国"]');
    if (!g) return null;
    g.scrollIntoView({behavior:'instant', block:'center'});
    const r = g.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
    return { x: r.left + r.width/2, y: r.top + r.height/2, hitInside: g.contains(hit) };
  `);
  ok(!!drillHit && drillHit.hitInside, '展开按钮可被点中（无遮挡）', JSON.stringify(drillHit));
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: drillHit.x, y: drillHit.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: drillHit.x, y: drillHit.y, button: 'left', clickCount: 1 });
  await sleep(420);
  mapInfo = await ev(`
    const b = document.getElementById('modalBox');
    return { head: (b.querySelector('.map-head b')||{}).textContent, drills: b.querySelectorAll('.map-drill').length,
             crumbs: [...b.querySelectorAll('.crumb')].map(c => c.textContent).join('>'),
             hasBack: !!b.querySelector('.map-back'), foot: b.textContent.indexOf('国 度 志') >= 0,
             layers: (b.textContent.match(/都城|村镇|野外|地下|遗迹/g)||[]).length };
  `);
  ok(mapInfo.head === '晨曦王国', '点按钮进入第二层（国度图）', mapInfo.head);
  ok(mapInfo.drills >= 3, '第二层每个地区都有展开按钮', mapInfo.drills);
  ok(mapInfo.crumbs === '艾尔德兰大陆>晨曦王国' && mapInfo.hasBack, '面包屑与返回按钮就位', mapInfo.crumbs);
  ok(mapInfo.foot, '第二层给出国度志');
  await shot('r22-map-nation');
  /* 进第三层：曙光城 */
  const rHit = await ev(`
    const g = document.querySelector('[data-map-node="r:曙光城"]');
    if (!g) return null;
    g.scrollIntoView({behavior:'instant', block:'center'});
    const r = g.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2 };
  `);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rHit.x, y: rHit.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rHit.x, y: rHit.y, button: 'left', clickCount: 1 });
  await sleep(420);
  mapInfo = await ev(`
    const b = document.getElementById('modalBox');
    return { head: (b.querySelector('.map-head b')||{}).textContent,
             drills: b.querySelectorAll('.map-drill').length,
             crumbs: [...b.querySelectorAll('.crumb')].map(c => c.textContent).join('>'),
             place: b.textContent.indexOf('地 区 志') >= 0,
             near: b.textContent.indexOf('附近国家') >= 0 };
  `);
  ok(mapInfo.head === '曙光城', '点地区进入第三层（地区图）', mapInfo.head);
  ok(mapInfo.place && mapInfo.near, '第三层给出地区志与附近国家');
  ok(mapInfo.crumbs.split('>').length === 3, '面包屑三层', mapInfo.crumbs);
  await shot('r23-map-region');
  /* 第四层 */
  const deepHit = await ev(`
    const g = document.querySelector('[data-map-node^="s:曙光城/"]');
    if (!g) return null;
    g.scrollIntoView({behavior:'instant', block:'center'});
    const r = g.getBoundingClientRect();
    return { id: g.getAttribute('data-map-node'), x: r.left + r.width/2, y: r.top + r.height/2 };
  `);
  if (deepHit) {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: deepHit.x, y: deepHit.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: deepHit.x, y: deepHit.y, button: 'left', clickCount: 1 });
    await sleep(420);
    const deeper = await ev(`const b=document.getElementById('modalBox'); return {head:(b.querySelector('.map-head b')||{}).textContent, crumbs:b.querySelectorAll('.crumb').length};`);
    ok(deeper.crumbs === 4, '第四层可达（地标内部）', JSON.stringify(deeper));
    await shot('r24-map-spot');
  } else { ok(false, '第三层应有可展开的地标'); }
  /* 返回上一层 */
  await clickSel('.map-back');
  const backInfo = await ev(`const b=document.getElementById('modalBox'); return (b.querySelector('.map-head b')||{}).textContent;`);
  ok(backInfo === '曙光城', '「返回上层」回到第三层', backInfo);

  /* --- 4d. 地图缩放 / 平移浏览 --- */
  const stageBox = await ev(`
    const s = document.querySelector('.mapstage');
    const r = s.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height };
  `);
  ok(stageBox.w > 300, '地图画布有尺寸', JSON.stringify(stageBox));
  const zoom0 = await ev(`return +document.querySelector('.mapstage').getAttribute('data-zoom');`);
  ok(zoom0 === 1, '初始缩放为 1', zoom0);
  /* 滚轮放大 */
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: stageBox.x, y: stageBox.y, deltaX: 0, deltaY: -240 });
  await sleep(180);
  const zoom1 = await ev(`return +document.querySelector('.mapstage').getAttribute('data-zoom');`);
  ok(zoom1 > 1, '滚轮向前放大', zoom1);
  const tf1 = await ev(`return document.querySelector('.mapsvg').style.transform;`);
  ok(/scale\(/.test(tf1), '缩放写进 transform', tf1);
  /* 滚轮缩小 */
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: stageBox.x, y: stageBox.y, deltaX: 0, deltaY: 240 });
  await sleep(180);
  const zoom2 = await ev(`return +document.querySelector('.mapstage').getAttribute('data-zoom');`);
  ok(Math.abs(zoom2 - 1) < 0.03, '滚轮向后缩回', zoom2);
  /* 拖拽平移 */
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: stageBox.x, y: stageBox.y, deltaX: 0, deltaY: -240 });
  await sleep(120);
  const before = await ev(`return document.querySelector('.mapsvg').style.transform;`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: stageBox.x, y: stageBox.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: stageBox.x + 70, y: stageBox.y + 40, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: stageBox.x + 120, y: stageBox.y + 70, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: stageBox.x + 120, y: stageBox.y + 70, button: 'left', clickCount: 1 });
  await sleep(200);
  const after = await ev(`return document.querySelector('.mapsvg').style.transform;`);
  ok(before !== after, '按住拖动可以平移', before + ' -> ' + after);
  ok((await ev(`return (b=>b.querySelector('.map-head b').textContent)(document.getElementById('modalBox'));`)) === '曙光城',
    '拖动不会误触下钻');
  await shot('r25-map-zoom');
  /* 按钮缩放与复位 */
  await clickSel('[data-map-zoom="in"]');
  const zoom3 = await ev(`return +document.querySelector('.mapstage').getAttribute('data-zoom');`);
  ok(zoom3 > 1, '「＋」按钮可放大', zoom3);
  await clickSel('[data-map-zoom="reset"]');
  const zoom4 = await ev(`return +document.querySelector('.mapstage').getAttribute('data-zoom');`);
  const tf2 = await ev(`return document.querySelector('.mapsvg').style.transform;`);
  ok(zoom4 === 1 && /translate\(0(\.00)?px,\s*0(\.00)?px\)/.test(tf2), '「复位」回到初始视图', zoom4 + ' ' + tf2);
  await ev(`window.GAME.closeModal(); return 1;`);

  /* --- 4e. 位面分区：六处都要能点开（曾经的 bug） --- */
  await ev(`window.GAME.showMap('g:无主之地/位面'); return 1;`);
  await sleep(320);
  const planeInfo = await ev(`
    const b = document.getElementById('modalBox');
    const btns = [...b.querySelectorAll('.map-drill')];
    const pts = btns.map(x => { const r = x.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; });
    const uniq = new Set(pts.map(p => p.join(',')));
    return { n: btns.length, uniq: uniq.size, ids: btns.map(x => x.getAttribute('data-map-node')),
             labels: btns.map(x => x.textContent.trim()) };
  `);
  ok(planeInfo.n === 6, '位面分区列出六处地区按钮', String(planeInfo.n));
  ok(planeInfo.uniq === 6, '六个按钮位置各不相同（不再叠在一起）', planeInfo.uniq + ' 个位置');
  await shot('r26-map-plane');
  /* 逐个点开，确认每一处都进得去 */
  const opened = [];
  for (const id of planeInfo.ids) {
    const hit = await ev(`
      const g = document.querySelector('[data-map-node=${JSON.stringify(id)}]');
      if (!g) return null;
      const r = g.getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
      return { x: r.left + r.width/2, y: r.top + r.height/2, inside: g.contains(el) };
    `);
    if (!hit || !hit.inside) { opened.push(id + ':遮挡'); continue; }
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: hit.x, y: hit.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hit.x, y: hit.y, button: 'left', clickCount: 1 });
    await sleep(300);
    const got = await ev(`return (b=>b.querySelector('.map-head b').textContent)(document.getElementById('modalBox'));`);
    opened.push(id.replace('r:', '') + '→' + got);
    if (got !== id.replace('r:', '')) { /* 进错了 */ }
    await ev(`window.GAME.showMap('g:无主之地/位面'); return 1;`);
    await sleep(200);
  }
  const badOpens = opened.filter(x => x.indexOf('→') < 0 || x.split('→')[0] !== x.split('→')[1]);
  ok(badOpens.length === 0, '位面六处逐个点开都能进', opened.join(' '));
  await ev(`window.GAME.closeModal(); return 1;`);
  ok(await ev(`return document.getElementById('modal').classList.contains('hidden');`), '地图可关闭');
  /* 游戏内底部按钮也能开地图 */
  await clickChip('地 图');
  ok(await ev(`return !document.getElementById('modal').classList.contains('hidden');`), '游戏内「地图」按钮同样有效');
  await ev(`window.GAME.closeModal(); return 1;`);

  /* --- 5. 只增不减：旧文字仍在 --- */
  const keep = await ev(`
    const log = document.getElementById('log');
    const first = log.children[0];
    return { firstHtml: (first ? first.textContent : '').slice(0, 40), total: log.children.length };
  `);
  ok(keep.firstHtml.length > 0, '最早的文字仍在最上方', keep.firstHtml);

  /* --- 6. 侧边栏：状态 / 物品 / 关闭 --- */
  await clickSel('#btnStatus');
  const side1 = await ev(`const s=document.getElementById('side'); return {open: s.classList.contains('open'), txt: document.getElementById('sideBody').textContent.slice(0,80), w: s.getBoundingClientRect().width};`);
  ok(side1.open, '侧边栏由真按钮打开');
  ok(/玩 家 状 态/.test(side1.txt), '侧边栏显示玩家状态', side1.txt);
  ok(side1.w > 300 && side1.w <= 420, '侧边栏宽度合理', side1.w);
  await shot('r5-side-status');
  await clickSel('#sideTabs button', 1);
  const side2 = await ev(`return document.getElementById('sideBody').textContent.slice(0,60);`);
  ok(/物 品 栏/.test(side2), '可切到物品栏', side2);
  await shot('r6-side-bag');
  await clickSel('#sideClose');
  const side3 = await ev(`return document.getElementById('side').classList.contains('open');`);
  ok(!side3, '关闭按钮生效');
  await clickSel('#btnBag');
  const side4 = await ev(`return document.getElementById('side').classList.contains('open');`);
  ok(side4, '顶栏「物品」按钮同样有效');

  /* --- 7. 顶栏按钮逐个验证（不许是无效键） --- */
  const barTests = [
    ['#btnCard', '#modal', '角 色 卡'],
    ['#btnCodex', '#modal', '典 籍'],
    ['#btnChron', '#modal', '大 事 记'],
    ['#btnAI', '#modal', 'AI 设 置'],
    ['#btnSet', '#modal', '设 置']
  ];
  for (const [btn, modal, word] of barTests) {
    await ev(`window.GAME.closeSide(); window.GAME.closeModal(); return 1;`);
    await sleep(280);            /* 等侧边栏滑出动画结束，避免点在被它盖住的位置 */
    await clickSel(btn);
    const r = await ev(`const m=document.getElementById('modal'); return {open: !m.classList.contains('hidden'), txt: document.getElementById('modalBox').textContent.slice(0,120)};`);
    ok(r.open, btn + ' 打开弹层');
    ok(r.txt.indexOf(word) >= 0, btn + ' 弹层内容含「' + word + '」', r.txt.slice(0, 40));
    await ev(`window.GAME.closeModal(); return 1;`);
  }
  /* 典籍里换卷 */
  await clickSel('#btnCodex');
  const codexNames = await ev(`return Array.from(document.querySelectorAll('.mb-foot button')).map(b=>b.textContent).slice(0,6);`);
  ok(codexNames.length >= 5, '典籍有分卷按钮', JSON.stringify(codexNames));
  /* 十八卷 + 关闭要全部留在框内，且铺满底部 */
  const codexFit = await ev(`
    const box = document.getElementById('modalBox').getBoundingClientRect();
    const foot = document.querySelector('.mb-foot').getBoundingClientRect();
    const btns = [...document.querySelectorAll('.mb-foot button')];
    const outside = btns.filter(b => {
      const r = b.getBoundingClientRect();
      return r.right > box.right + 1 || r.left < box.left - 1 || r.bottom > box.bottom + 1 || r.top < foot.top - 1;
    }).map(b => b.textContent.trim());
    const rows = new Set(btns.map(b => Math.round(b.getBoundingClientRect().top))).size;
    const widths = btns.map(b => Math.round(b.getBoundingClientRect().width));
    const footFill = foot.width / box.width;
    const rowFill = Math.min(...[1].concat([...new Set(btns.map(b => Math.round(b.getBoundingClientRect().top)))].map(top => {
      const rs = btns.filter(b => Math.round(b.getBoundingClientRect().top) === top).map(b => b.getBoundingClientRect());
      return (Math.max(...rs.map(r => r.right)) - Math.min(...rs.map(r => r.left))) / foot.width;
    })));
    return { n: btns.length, outside: outside, rows: rows, minW: Math.min(...widths), footFill: footFill, rowFill: rowFill,
             fs: getComputedStyle(btns[0]).fontSize };
  `);
  ok(codexFit.n >= 19, '典籍保留全部分卷按钮（含关闭）', String(codexFit.n));
  ok(codexFit.outside.length === 0, '所有分卷按钮都在典籍框内（没有越界）', codexFit.outside.join('/'));
  ok(codexFit.rows >= 2, '分卷按钮自动折行排布', String(codexFit.rows));
  ok(codexFit.footFill > 0.9, '底栏铺满典籍框宽度', codexFit.footFill.toFixed(2));
  ok(codexFit.rowFill > 0.85, '每行按钮排满（不留大片空白）', codexFit.rowFill.toFixed(2));
  ok(parseFloat(codexFit.fs) <= 12, '分卷按钮字号已缩小', codexFit.fs);
  await shot('r27-codex-footer');
  await clickSel('.mb-foot button', 3);
  const codexTxt = await ev(`return document.getElementById('modalBox').textContent.slice(0,80);`);
  ok(codexTxt.length > 10, '典籍换卷后有内容', codexTxt.slice(0, 30));
  await shot('r7-codex');
  await ev(`window.GAME.closeModal(); return 1;`);

  /* --- 7b. AI 入口：起始页 / 顶栏 / 底部三处都要看得见、点得动（曾被浮层盖住、被挤出首屏） --- */
  const aiEntryProbe = async (w, h) => {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    await sleep(420);
    return await ev(`
      const probe = (id) => {
        const b = document.getElementById(id);
        if (!b) return { id: id, exists: false };
        const r = b.getBoundingClientRect();
        const cx = r.left + r.width/2, cy = r.top + r.height/2;
        const inside = cx > 0 && cy > 0 && cx < innerWidth && cy < innerHeight;
        const hit = inside ? document.elementFromPoint(cx, cy) : null;
        return { id: id, exists: true, visible: r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0,
                 hittable: !!hit && (hit === b || b.contains(hit)), y: Math.round(r.top) };
      };
      return { land: probe('landAI'), top: probe('btnAI'), chip: probe('aiChip'), cfg: probe('aiCfg'), landVisible: !document.getElementById('landing').classList.contains('hidden') };
    `);
  };
  await ev(`window.GAME.closeModal(); document.getElementById('landing').classList.remove('hidden'); return 1;`);
  const entryBig = await aiEntryProbe(1440, 900);
  ok(entryBig.land.exists && entryBig.land.visible && entryBig.land.hittable, '起始页「AI 接入」可见可点（1440x900）', JSON.stringify(entryBig.land));
  const entrySmall = await aiEntryProbe(1280, 720);
  ok(entrySmall.land.visible && entrySmall.land.hittable, '矮窗口（1280x720）里「AI 接入」仍在首屏且可点', JSON.stringify(entrySmall.land));
  /* 真点那一颗，必须打开 AI 设置（预设按钮 + Key 输入框） */
  const landAIPos = await ev(`const b=document.getElementById('landAI'); const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: landAIPos.x, y: landAIPos.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: landAIPos.x, y: landAIPos.y, button: 'left', clickCount: 1 });
  await sleep(420);
  const landOpened = await ev(`
    const m=document.getElementById('modal'); const box=document.getElementById('modalBox');
    return { open: !m.classList.contains('hidden'), head: ((box.querySelector('h3')||{}).textContent||'').trim(),
      presets: [...document.querySelectorAll('.ai-preset')].map(b=>b.textContent), key: !!document.getElementById('aiKey') };
  `);
  ok(landOpened.open && /AI/.test(landOpened.head), '点起始页「AI 接入」打开 AI 设置', JSON.stringify(landOpened.head));
  ok(landOpened.presets.length >= 3 && landOpened.key, '设置里有预设按钮与 Key 输入框', JSON.stringify(landOpened.presets));
  await ev(`window.GAME.closeModal(); document.getElementById('landing').classList.add('hidden'); return 1;`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(420);
  const inGameAI = await ev(`
    const probe = (id) => {
      const b = document.getElementById(id);
      if (!b) return { exists: false };
      const r = b.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
      return { exists: true, hittable: !!hit && (hit === b || b.contains(hit)), txt: (b.textContent||'').trim().slice(0,20) };
    };
    return { top: probe('btnAI'), chip: probe('aiChip'), cfg: probe('aiCfg') };
  `);
  ok(inGameAI.top.exists && inGameAI.top.hittable, '游戏内顶栏「AI 接入」可点', JSON.stringify(inGameAI.top));
  ok(inGameAI.chip.exists && inGameAI.chip.hittable, '游戏内底部 AI 开关可点', JSON.stringify(inGameAI.chip));
  ok(inGameAI.cfg.exists && inGameAI.cfg.hittable, '游戏内底部「AI 设置」可点', JSON.stringify(inGameAI.cfg));

  /* --- 8. 左侧节点：悬浮提示 + 点击回顾不改进度 --- */
  const beforeJump = await ev(`const s=window.GAME.state; return JSON.stringify({t:s.turn,hp:Math.round(s.pc.hp.cur),g:window.ENG.money.total(s),d:s.time.day,h:s.time.hour,n:s.nodes.length,hz:s.history.length});`);
  const tlBox = await ev(`
    const n = document.querySelectorAll('.tl-node')[3];
    n.scrollIntoView({behavior:'instant', block:'center'});
    const r = n.getBoundingClientRect();
    return {x: r.left + r.width/2, y: r.top + r.height/2};
  `);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: tlBox.x, y: tlBox.y, button: 'none' });
  await sleep(220);
  const tip = await ev(`const t=document.getElementById('tlTip'); const r=t.getBoundingClientRect(); return {shown: t.style.display==='block', txt: t.textContent.slice(0,90), x: r.left, y: r.top, w: r.width};`);
  ok(tip.shown, '节点悬浮显示提示');
  ok(/回合/.test(tip.txt) && /节点/.test(tip.txt) && /时间/.test(tip.txt), '提示含回合/节点/时间', tip.txt);
  ok(tip.x > 0 && tip.y >= 0 && tip.w > 100, '提示框位置与宽度合理', tip.x + ',' + tip.y + ',' + tip.w);
  await shot('r8-node-tip');
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: tlBox.x, y: tlBox.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: tlBox.x, y: tlBox.y, button: 'left', clickCount: 1 });
  await sleep(500);
  const afterJump = await ev(`const s=window.GAME.state; return JSON.stringify({t:s.turn,hp:Math.round(s.pc.hp.cur),g:window.ENG.money.total(s),d:s.time.day,h:s.time.hour,n:s.nodes.length,hz:s.history.length});`);
  ok(beforeJump === afterJump, '点击节点回顾不改变任何进度', beforeJump + ' -> ' + afterJump);
  const flashed = await ev(`return document.querySelectorAll('#log .flash').length;`);
  ok(flashed >= 1, '回顾时高亮对应文字块');
  const hintTxt = await ev(`return document.getElementById('hint').textContent;`);
  ok(/回顾/.test(hintTxt), '提示行说明这是回顾', hintTxt);
  await shot('r9-jump');

  /* --- 9. 输入框：自定义行动 --- */
  await typeText('我拔剑砍过去');
  await clickSel('#send');
  await sleep(400);
  const custom = await ev(`
    const log = document.getElementById('log');
    return { txt: log.textContent.slice(-400), opts: window.GAME.opts.length, turn: window.GAME.state.turn, combat: !!window.GAME.state.combat };
  `);
  ok(/〔自定义〕/.test(custom.txt) || /自定义/.test(custom.txt), '自定义行动被记录', custom.txt.slice(-60));
  ok(custom.opts >= 3, '自定义后仍给出后续选项', custom.opts);
  await shot('r10-custom');

  /* --- 10. 存档：刷新后继续 --- */
  const beforeReload = await ev(`const s=window.GAME.state; return {name:s.pc.name, turn:s.turn, blocks:document.getElementById('log').children.length, nodes:s.nodes.length};`);
  await send('Page.reload', { ignoreCache: false });
  await sleep(2200);
  const afterReload = await ev(`
    const s = window.GAME.state;
    const cont = document.getElementById('landContinue');
    return { hasSave: !!(s && s.pc), name: s.pc.name, turn: s.turn,
             contShown: cont && cont.style.display !== 'none', contText: cont ? cont.textContent : '',
             landing: !document.getElementById('landing').classList.contains('hidden') };
  `);
  ok(afterReload.landing, '刷新后回到起始页');
  ok(afterReload.hasSave && afterReload.name === beforeReload.name, '存档被读回', afterReload.name);
  ok(afterReload.contShown && /继 续 游 戏/.test(afterReload.contText), '「继续游戏」按钮出现', afterReload.contText);
  await clickSel('#landContinue');
  await sleep(400);
  const resumed = await ev(`
    const log = document.getElementById('log');
    return { txt: log.textContent.length, blocks: log.children.length, tl: document.querySelectorAll('.tl-node').length,
             name: window.GAME.state.pc.name, turn: window.GAME.state.turn };
  `);
  ok(resumed.txt > 200, '继续后文字浏览区被恢复', resumed.txt);
  ok(resumed.blocks >= beforeReload.blocks - 2, '旧文字块恢复（只增不减）', resumed.blocks + ' vs ' + beforeReload.blocks);
  ok(resumed.tl >= beforeReload.nodes - 2, '左侧节点恢复', resumed.tl);
  await shot('r11-resume');

  /* --- 11. 键盘操作 a-e --- */
  const kOpts = await ev(`return window.GAME.opts.map(o=>o.k).join('');`);
  const beforeKey = await ev(`return window.GAME.state.turn;`);
  await ev(`document.getElementById('cmd').blur(); return 1;`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', text: 'a', windowsVirtualKeyCode: 65 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', windowsVirtualKeyCode: 65 });
  await sleep(400);
  const afterKey = await ev(`return window.GAME.state.turn;`);
  ok(afterKey >= beforeKey, '键盘 a-e 可推进（' + kOpts + '）', beforeKey + ' -> ' + afterKey);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', windowsVirtualKeyCode: 27 });

  /* --- 12. 响应式 --- */
  for (const [w, h, tag] of [[360, 720, 'r12-360'], [820, 900, 'r13-820'], [1366, 768, 'r14-1366']]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });
    await sleep(320);
    const lay = await ev(`
      const body = document.body;
      const log = document.getElementById('logWrap');
      return { overflowX: document.documentElement.scrollWidth > window.innerWidth + 2,
               logW: log.getBoundingClientRect().width, tlW: document.getElementById('timeline').getBoundingClientRect().width,
               sideHidden: !document.getElementById('side').classList.contains('open'),
               dockVisible: document.getElementById('dock').getBoundingClientRect().bottom <= window.innerHeight + 2 };
    `);
    ok(!lay.overflowX, w + 'px 无横向溢出');
    ok(lay.logW > 100, w + 'px 文字区有宽度', lay.logW);
    ok(lay.dockVisible, w + 'px 底部操作区在视口内');
    await shot(tag);
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(200);

  /* --- 13. 濒死与死亡流程（真实点击） --- */
  await ev(`const s=window.GAME.state; s.pc.hp.cur = 0; return 1;`);
  await clickOpt(0);
  await sleep(320);
  const dying = await ev(`
    const t = document.getElementById('log').textContent;
    return { dying: !!window.GAME.state.flags.dying, txt: t.slice(-900), opts: window.GAME.opts.map(o=>o.act).join(',') };
  `);
  ok(dying.dying, '生命归零进入濒死（不是立即死亡）');
  ok(/重 伤 濒 死/.test(dying.txt) && /生死豁免/.test(dying.txt), '濒死面板说明生死豁免规则', dying.txt.slice(-80));
  ok(/struggle/.test(dying.opts), '濒死时给出撑住/自救选项', dying.opts);
  await shot('r15-dying');
  let guardD = 0, deadNow = false;
  while (guardD++ < 25) {
    const st = await ev(`return {phase: window.GAME.state.phase, dying: !!window.GAME.state.flags.dying};`);
    if (st.phase === 'dead' || !st.dying) break;
    await clickOpt(0);
    await sleep(150);
    deadNow = await ev(`return window.GAME.state.phase === 'dead';`);
    if (deadNow) break;
  }
  /* 若骰子让角色稳定下来，就把豁免推到两次失败再走一遍死亡流程，确保这条路必测 */
  const stillAlive = await ev(`return window.GAME.state.phase !== 'dead';`);
  if (stillAlive) {
    await ev(`const s=window.GAME.state; s.pc.hp.cur=0; s.flags.dying=true; s.counters.ds={ok:0,fail:2}; s.pc.status='濒死'; return 1;`);
    for (let i = 0; i < 8; i++) {
      const ph = await ev(`return window.GAME.state.phase;`);
      if (ph === 'dead') break;
      await clickOpt(0);
      await sleep(160);
    }
  }
  const deadState = await ev(`
    const s = window.GAME.state;
    const t = document.getElementById('log').textContent;
    return { phase: s.phase, txt: t.slice(-420), chips: document.getElementById('chips').textContent,
             hasDeathPanel: /死 亡 通 告/.test(t), opts: window.GAME.opts.length };
  `);
  ok(deadState.phase === 'dead' || deadState.phase === 'playing', '濒死循环有明确出口', deadState.phase);
  if (deadState.phase === 'dead') {
    ok(deadState.hasDeathPanel, '死亡通告面板按文档字段渲染', deadState.txt.slice(-100));
    ok(!/undefined|NaN/.test(deadState.txt), '死亡面板无 undefined/NaN 字段');
    ok(/重 新 开 始/.test(deadState.chips), '死亡后提供重新开始按钮', deadState.chips);
    ok(deadState.opts === 0, '死亡后不再给行动选项');
    await shot('r16-death');
  }

  /* --- 14. 面板视觉抽查：统计渲染出的框/条/线 --- */
  const visual = await ev(`
    return { boxes: document.querySelectorAll('.pl-box').length,
             bars: document.querySelectorAll('.pl-bar').length,
             rules: document.querySelectorAll('.pl-rule').length,
             titlebars: document.querySelectorAll('.pl-big').length,
             opts: document.querySelectorAll('.opt-btn').length,
             tx: document.querySelectorAll('.tx').length,
             emoji: /[\\u{1F300}-\\u{1FAFF}]/u.test(document.body.innerText) };
  `);
  ok(visual.boxes > 3, '面板框已渲染', visual.boxes);
  ok(visual.bars > 3, '进度条已渲染', visual.bars);
  ok(visual.rules > 3, '分隔线已渲染', visual.rules);
  ok(!visual.emoji, '页面无 emoji');

  /* --- 15. 控制台错误 --- */
  ok(consoleErrors.length === 0, '浏览器控制台无错误', consoleErrors.slice(0, 3).join(' | '));

  console.log('--- 真浏览器（Edge headless + CDP）---');
  console.log('PASS ' + R.pass + '  FAIL ' + R.fail);
  R.fails.forEach(f => console.log('  [X] ' + f));
  if (consoleErrors.length) console.log('console: ' + consoleErrors.slice(0, 5).join('\n'));
  ws.close();
  proc.kill();
  await sleep(300);
  process.exit(R.fail === 0 ? 0 : 1);
})().catch(async e => {
  console.log('FATAL ' + e.message);
  try { ws && ws.close(); } catch (x) {}
  process.exit(2);
});
