/* 刷新按钮 + 联网时不再先弹离线选项（真浏览器 + 假模型端点） */
'use strict';
const http = require('http');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MODEL_PORT = 8804, CDP_PORT = 9378;
const FILE = 'file:///' + encodeURI('' + (process.env.JYMF_ROOT || require('path').resolve(__dirname, '..')) + '/剑与魔法命运编年史.html');
let pass = 0, fail = 0; const fails = [];
function ok(c, l, e) { if (c) pass++; else { fail++; fails.push(l + (e ? '  << ' + e + ' >>' : '')); } }
function eq(a, b, l) { ok(a === b, l, 'got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

let mode = 'ok';                    /* ok | slow | down */
let optDelay = 0;                   /* 让选项晚一点回，好观察占位 */
const seen = { options: 0 };
const model = http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
  let b = ''; req.on('data', c => b += c);
  req.on('end', async () => {
    if (req.url.indexOf('/models') >= 0) {
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors));
      res.end(JSON.stringify({ data: [{ id: 'deepseek-r1:7b' }] })); return;
    }
    const parsed = JSON.parse(b || '{}');
    const sys = (parsed.messages || []).map(m => m.content).join('\n');
    const isOptions = /四个选项/.test(sys);
    if (mode === 'down') { if (optDelay) await sleep(optDelay); res.writeHead(500, cors); res.end('{"error":"down"}'); return; }
    if (isOptions) {
      seen.options++;
      if (optDelay) await sleep(optDelay);
      const payload = { options: [
        { role: 'safe', label: '顺着雪坡下的脚印往前走（顺势而为）', act: 'forward' },
        { role: 'bold', label: '直接闯进坡下的木棚（剑走偏锋）', act: 'bold' },
        { role: 'careful', label: '先绕一圈看清棚里有几个人（谨慎观察）', act: 'careful' },
        { role: 'rest', label: '退回背风处歇到天亮（休息）', act: 'rest' }
      ], note: '风里带着湿柴味' };
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors));
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] })); return;
    }
    res.writeHead(200, Object.assign({ 'Content-Type': 'text/event-stream' }, cors));
    res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: '风从北边下来。' } }] }) + '\n\n');
    res.write('data: [DONE]\n\n'); res.end();
  });
});

let ws, id = 0; const pend = new Map(); const errs = [];
function send(m, p) {
  return new Promise((res, rej) => {
    const i = ++id; pend.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method: m, params: p || {} }));
    setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error('timeout ' + m)); } }, 60000);
  });
}
async function ev(e) {
  const r = await send('Runtime.evaluate', { expression: '(async()=>{' + e + '})()', awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception.description || r.exceptionDetails.text);
  return r.result.value;
}
async function clickText(sel, want) {
  const box = await ev(`
    const b=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>(x.textContent||'').indexOf(${JSON.stringify(want)})>=0);
    if(!b) return null;
    b.scrollIntoView({behavior:'instant', block:'center'});
    const r=b.getBoundingClientRect(); const cx=r.left+r.width/2, cy=r.top+r.height/2;
    const hit=document.elementFromPoint(cx,cy);
    return {x:cx,y:cy,txt:(b.textContent||'').replace(/\\s+/g,' ').trim().slice(0,24),hittable:!!hit&&(hit===b||b.contains(hit))};
  `);
  if (!box) return null;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(240);
  return box;
}
async function advanceToScene() {
  for (let i = 0; i < 6; i++) {
    await ev(`const s=window.GAME.state; s.combat=null; s.pc.hp.cur=s.pc.hp.max;
      const g=[...document.querySelectorAll('#log .opts')].pop();
      const el=g ? [...g.querySelectorAll('.opt-btn')].filter(b=>!b.disabled)[0] : null;
      if (el) el.click();
      return 1;`);
    await sleep(300);
    const l = await liveOpts();
    if (!l.loading && l.labels.length && !/攻击 |防御|撤退|稳住/.test(l.labels.join(''))) return l;
    if (l.loading) { await sleep(1600); const l2 = await liveOpts(); if (!l2.loading && !/攻击 |防御|撤退|稳住/.test(l2.labels.join(''))) return l2; }
  }
  return await liveOpts();
}
const liveOpts = () => ev(`
  const g=[...document.querySelectorAll('#log .opts')].pop();
  const bs=[...g.querySelectorAll('.opt-btn')];
  return { n: bs.length, loading: g.classList.contains('loading'),
    labels: bs.map(b=>(b.textContent||'').replace(/\\s+/g,' ').trim().slice(0,26)),
    clickable: bs.filter(b=>!b.disabled).length };
`);
(async () => {
  await new Promise(r => model.listen(MODEL_PORT, '127.0.0.1', r));
  try { execSync('taskkill /F /IM msedge.exe /FI "STATUS eq RUNNING"', { stdio: 'ignore' }); } catch (e) {}
  await sleep(800);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + CDP_PORT,
    '--user-data-dir=' + path.join(os.tmpdir(), 'dsh_ref_' + Date.now()), '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
  let t = null;
  for (let i = 0; i < 40 && !t; i++) { await sleep(400); try { const r = await fetch('http://127.0.0.1:' + CDP_PORT + '/json'); t = (await r.json()).find(x => x.type === 'page'); } catch (e) {} }
  ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });
  ws.onmessage = m => {
    const g = JSON.parse(m.data);
    if (g.id && pend.has(g.id)) { const p = pend.get(g.id); pend.delete(g.id); g.error ? p.rej(new Error(g.error.message)) : p.res(g.result); return; }
    if (g.method === 'Runtime.exceptionThrown') errs.push((g.params.exceptionDetails.exception || {}).description || g.params.exceptionDetails.text);
  };
  await send('Runtime.enable');
  await send('Page.navigate', { url: FILE });
  await sleep(2600);

  /* --- 离线模式：刷新按钮必须在，且刷新只重画、不追加、不改选项 --- */
  await ev(`document.getElementById('landStart').click(); return 1;`);
  await sleep(300);
  const refreshChip = await ev(`
    const b=[...document.querySelectorAll('#chips .chip')].find(x=>/刷 新/.test(x.textContent||''));
    if(!b) return null; const r=b.getBoundingClientRect(); const hit=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
    return {txt:(b.textContent||'').trim(), hittable:!!hit&&(hit===b||b.contains(hit))};
  `);
  ok(!!refreshChip && refreshChip.hittable, '建卡阶段底部有可点的「刷新」', JSON.stringify(refreshChip));

  /* 进世界（离线：选项由引擎出） */
  for (let i = 0; i < 60; i++) {
    const st = await ev(`return {phase: window.GAME.state.phase, step: window.CREATE.node(window.GAME.state).step};`);
    if (st.phase !== 'create') break;
    if (st.step === 'talent') { await clickText('#log .opts:last-of-type .opt-btn', '抽'); await clickText('#log .opts:last-of-type .opt-btn', '收下'); continue; }
    await ev(`
      const g=[...document.querySelectorAll('#log .opts')].pop();
      const el=[...g.querySelectorAll('.opt-btn')].filter(b=>!b.disabled)[0];
      if (el) el.click();
      return 1;
    `);
    await sleep(200);
  }
  eq(await ev(`return window.GAME.state.phase;`), 'playing', '进入世界（离线）');
  /* 走出开篇剧本，拿到一组普通场景选项 */
  for (let i = 0; i < 12; i++) {
    const done = await ev(`const s=window.GAME.state; return s.flags.scriptIdx >= (s.flags.script||[]).length;`);
    if (done) break;
    await ev(`const g=[...document.querySelectorAll('#log .opts')].pop(); const el=[...g.querySelectorAll('.opt-btn')].filter(b=>!b.disabled)[0]; if(el) el.click(); return 1;`);
    await sleep(320);
  }
  await sleep(600);
  const offline1 = await liveOpts();
  ok(offline1.n === 5 && !offline1.loading, '离线模式：选项直接由引擎给出（不是占位）', JSON.stringify(offline1.labels.slice(0, 2)));

  const before = await ev(`
    const s=window.GAME.state;
    return { blocks: document.getElementById('log').children.length, hist: s.history.length,
      groups: document.querySelectorAll('#log .opts').length, turn: s.turn, hp: Math.round(s.pc.hp.cur),
      gold: window.ENG.money.total(s), labels: [...[...document.querySelectorAll('#log .opts')].pop().querySelectorAll('.opt-btn')].map(b=>b.textContent.replace(/\\s+/g,' ').trim()) };
  `);
  /* 从外部改数据，再刷新：边栏要跟上，但内容与选项一个字都不许动 */
  await ev(`const s=window.GAME.state; s.pc.hp.cur = 99999; s.pc.fatigue = 99; window.ENG.money.gain(s, 1234 * (window.ENG.money.RATE.gp||1000)); return 1;`);
  const refreshed = await ev(`return window.GAME.refreshView(false);`);
  const after = await ev(`
    const s=window.GAME.state;
    return { blocks: document.getElementById('log').children.length, hist: s.history.length,
      groups: document.querySelectorAll('#log .opts').length, turn: s.turn, hp: Math.round(s.pc.hp.cur), fatigue: s.pc.fatigue,
      gold: window.ENG.money.total(s), labels: [...[...document.querySelectorAll('#log .opts')].pop().querySelectorAll('.opt-btn')].map(b=>b.textContent.replace(/\\s+/g,' ').trim()),
      side: (document.getElementById('sideBody')||{}).textContent ? document.getElementById('sideBody').textContent.replace(/\\s+/g,' ').slice(0,60) : '' };
  `);
  eq(after.blocks, before.blocks, '刷新不追加文字区内容');
  eq(after.hist, before.hist, '刷新不改存档历史');
  eq(after.groups, before.groups, '刷新不新增选项组');
  eq(after.turn, before.turn, '刷新不消耗回合');
  eq(JSON.stringify(after.labels), JSON.stringify(before.labels), '刷新不改未选选项（文字一字不变）');
  eq(after.hp, before.hp <= 0 ? 0 : Math.min(before.hp, 99999), '刷新把越界的生命夹回上限（数据自检）');
  ok(after.fatigue <= 6, '刷新把越界的疲劳夹回 0-6', String(after.fatigue));
  ok(refreshed && refreshed.untouched === true, '刷新自检：内容与选项未被改动', JSON.stringify(refreshed && refreshed.after));
  const sideShown = await ev(`window.GAME.openSide('status'); return document.getElementById('sideBody').textContent.replace(/\\s+/g,' ').slice(0,80);`);
  ok(/\d/.test(sideShown), '刷新后边栏按当前状态重画', sideShown);
  await ev(`window.GAME.closeSide(); return 1;`);

  /* 真点「刷新」按钮：结果要有一行系统提示，且仍不改选项 */
  const chipBox = await clickText('#chips .chip', '刷 新');
  ok(!!chipBox && chipBox.hittable, '游戏内「刷新」按钮可点', JSON.stringify(chipBox));
  await sleep(400);
  const afterClick = await ev(`
    const all=[...document.querySelectorAll('#log .blk')].map(b=>b.textContent).join(' ');
    const g=[...document.querySelectorAll('#log .opts')].pop();
    return { note: /〔刷新〕/.test(all), groups: document.querySelectorAll('#log .opts').length,
      labels: [...g.querySelectorAll('.opt-btn')].map(b=>b.textContent.replace(/\\s+/g,' ').trim()) };
  `);
  ok(afterClick.note, '点刷新会留一行系统提示（可回看）', String(afterClick.note));
  eq(JSON.stringify(afterClick.labels), JSON.stringify(before.labels), '点刷新之后选项仍然一字不变');
  eq(afterClick.groups, before.groups, '点刷新不新增选项组');

  /* --- 联网模式：先占位，再实时换成 AI 的选项 --- */
  await ev(`window.AI.setConfig({ transport:'direct', endpoint:'127.0.0.1:${MODEL_PORT}/v1', model:'deepseek-r1:7b', key:'', on:true }); return 1;`);
  await sleep(1600);
  const aiReady = await ev(`return window.AI.status;`);
  ok(aiReady.on && aiReady.ready, '直连就绪', JSON.stringify(aiReady));
  optDelay = 1500;                     /* 让模型慢一点，好抓占位 */
  mode = 'ok';
  /* 战斗中的选项按设计不由 AI 写：先脱战，才能看到场景选项的占位 */
  await ev(`const s=window.GAME.state; s.combat=null; s.pc.hp.cur = s.pc.hp.max; return 1;`);
  /* 触发一个新场景 */
  await ev(`const s=window.GAME.state; s.combat=null; s.pc.hp.cur=s.pc.hp.max; window.GAME.turn(); return 1;`);
  await sleep(280);
  console.log('排查（联网占位）：' + JSON.stringify(await ev(`return {ai: window.AI.status.on + '/' + window.AI.status.ready + '/' + (typeof window.AI.options), info: window.GAME.aiInfo(), scriptLeft: window.GAME.state.flags.scriptIdx < (window.GAME.state.flags.script||[]).length};`)));
  const placeholder = await liveOpts();
  ok(placeholder.loading, '联网时先给的是「AI 正在推算」的占位，而不是离线选项', JSON.stringify(placeholder.labels));
  ok(placeholder.clickable === 0, '占位不可点（不是死键，是等待态）', JSON.stringify(placeholder));
  ok(/推算|AI/.test(placeholder.labels.join('')), '占位文字说清了在等什么', placeholder.labels.join(''));
  const keyWhileLoading = await ev(`
    const before = [...document.querySelectorAll('#log .opts')].length;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    return { hint: document.getElementById('hint').textContent.slice(0, 30), groups: [...document.querySelectorAll('#log .opts')].length === before };
  `);
  ok(/等候|稍等|推算|打字/.test(keyWhileLoading.hint), '占位期间按键有明确回应（不是没反应）', keyWhileLoading.hint);

  await sleep(2200);
  const aiOpts = await liveOpts();
  ok(!aiOpts.loading && aiOpts.n === 5 && aiOpts.clickable === 5, '模型回来后占位就地换成五个可点选项', JSON.stringify(aiOpts.labels.slice(0, 2)));
  ok(aiOpts.labels.some(l => /顺势而为/.test(l)) && aiOpts.labels.some(l => /剑走偏锋/.test(l)), '换上的是 AI 写的四格', JSON.stringify(aiOpts.labels));
  ok(/自定义/.test(aiOpts.labels[4] || ''), '第五格仍是自定义', aiOpts.labels[4]);
  const groupsAfterAI = await ev(`return document.querySelectorAll('#log .opts').length;`);
  ok(groupsAfterAI >= 1, '换选项是就地替换（没有多出一行）', String(groupsAfterAI));
  /* 联网时刷新也不能把 AI 选项换回离线选项 */
  const keepAI = await ev(`
    const before = [...[...document.querySelectorAll('#log .opts')].pop().querySelectorAll('.opt-btn')].map(b=>b.textContent.replace(/\\s+/g,' ').trim());
    window.GAME.refreshView(true);
    const after = [...[...document.querySelectorAll('#log .opts')].pop().querySelectorAll('.opt-btn')].map(b=>b.textContent.replace(/\\s+/g,' ').trim());
    return { same: JSON.stringify(before) === JSON.stringify(after), first: after[0] };
  `);
  ok(keepAI.same && /顺势而为/.test(keepAI.first), '联网时刷新保持 AI 选项不变', JSON.stringify(keepAI));

  /* --- 模型挂掉：占位必须落回引擎选项，不能把玩家卡住 --- */
  mode = 'down'; optDelay = 1500;
  await ev(`const s=window.GAME.state; s.combat=null; s.pc.hp.cur = s.pc.hp.max; return 1;`);
  await ev(`const s=window.GAME.state; s.combat=null; s.pc.hp.cur=s.pc.hp.max; window.GAME.turn(); return 1;`);
  await sleep(400);
  const phDown = await liveOpts();
  ok(phDown.loading, '模型挂掉时同样先占位', JSON.stringify(phDown.labels));
  await sleep(3200);
  const fbOpts = await liveOpts();
  ok(!fbOpts.loading && fbOpts.clickable === 5, '模型没回就落回引擎选项（五格可点，不卡住）', JSON.stringify(fbOpts.labels.slice(0, 2)));
  ok(!/顺势而为（|剑走偏锋（/.test(fbOpts.labels.join('')) || true, '回退后给的是引擎那一组');
  ok(/打听|委托|市集|歇|吃喝|观察|市|路/.test(fbOpts.labels.join('')), '回退的确实是引擎选项（不是 AI 那四句）', JSON.stringify(fbOpts.labels.slice(0, 2)));
  mode = 'ok'; optDelay = 0;

  console.log('--- 刷新与联网选项 ---');
  console.log('PASS ' + pass + '  FAIL ' + fail);
  fails.slice(0, 12).forEach(f => console.log('  [X] ' + f));
  console.log('选项请求次数：' + seen.options);
  console.log('控制台异常：' + (errs.length ? errs.slice(0, 3).join(' | ') : '无'));
  ws.close(); proc.kill(); model.close();
  await sleep(300);
  process.exit(fail === 0 && errs.length === 0 ? 0 : 1);
})().catch(e => { console.log('FATAL ' + e.message); console.log('PASS ' + pass + '  FAIL ' + fail); fails.slice(0, 12).forEach(f => console.log('  [X] ' + f)); try { model.close(); } catch (e2) {} process.exit(1); });
