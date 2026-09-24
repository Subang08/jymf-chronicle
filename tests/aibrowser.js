/* 真浏览器 + 真服务器 + 假 DeepSeek 上游：验证联网叙述、AI 解读自定义内容、AI 事件、断线回退 */
'use strict';
const http = require('http');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const ROOT = '' + (process.env.JYMF_ROOT || require('path').resolve(__dirname, '..')) + '';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MOCK_PORT = 8799, SRV_PORT = 8797, CDP_PORT = 9366;
const KEY = 'sk-browser-test-key';

let pass = 0, fail = 0; const fails = [];
function ok(c, l, e) { if (c) pass++; else { fail++; fails.push(l + (e ? '  << ' + e + ' >>' : '')); } }
function eq(a, b, l) { ok(a === b, l, 'got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------- 假上游（可用控制口改行为） ---------------- */
let mode = 'text';                 /* text | json | broken */
let customReply = null;            /* /api/custom 的回话 */
let eventReply = null;             /* /api/event 的回话 */
const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', async () => {
    if (req.url === '/__set') {
      const j = JSON.parse(body || '{}');
      if (j.mode) mode = j.mode;
      if (j.customReply !== undefined) customReply = j.customReply;
      if (j.eventReply !== undefined) eventReply = j.eventReply;
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}'); return;
    }
    const parsed = JSON.parse(body || '{}');
    const sys = (parsed.messages || []).map(m => m.content).join('\n');
    const isEvent = /只返回一行 JSON[\s\S]*kind/.test(sys);
    const isCustom = /"act"/.test(sys) && /generic/.test(sys);
    if (mode === 'broken') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'upstream exploded' } }));
      return;
    }
    if (isEvent || isCustom) {
      const payload = isEvent
        ? (eventReply || { kind: '遭遇', text: '坡下传来铁器磕碰声，两个人影顺着雪脊摸上来。', foes: ['灰林狼'], dc: null, dmg: null, loot: null, why: '雪把气味压住了' })
        : (customReply || { act: 'generic', arg: null, text: '你照着心里的想法试了一遍，四周没有立刻回应。', check: { attr: 'wis', dc: 13, why: '看你稳不稳' } });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }], usage: { total_tokens: 30 } }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const parts = ['雪面下有一层硬壳。', '你踩上去，它先响了一声，又静了。', '前方三十步，有人把柴火堆在路中间。'];
    for (const p of parts) { res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: p } }] }) + '\n\n'); await sleep(25); }
    res.write('data: [DONE]\n\n'); res.end();
  });
});
function setMock(obj) {
  return fetch('http://127.0.0.1:' + MOCK_PORT + '/__set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
}

let srv = null;
function startServer() {
  return new Promise((resolve, reject) => {
    srv = spawn('D:\\node.exe', [path.join(ROOT, 'server', 'server.js')], {
      env: Object.assign({}, process.env, { PORT: String(SRV_PORT), DEEPSEEK_BASE_URL: 'http://127.0.0.1:' + MOCK_PORT, DEEPSEEK_API_KEY: KEY }),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let out = ''; srv.stdout.on('data', d => out += d); srv.stderr.on('data', d => out += d);
    const t0 = Date.now();
    (function wait() {
      fetch('http://127.0.0.1:' + SRV_PORT + '/api/health').then(r => r.json()).then(() => resolve(out))
        .catch(() => { if (Date.now() - t0 > 9000) reject(new Error('服务器没起来：' + out)); else setTimeout(wait, 200); });
    })();
  });
}

/* ---------------- CDP ---------------- */
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
async function clickPoint(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(200);
}
async function clickLive(nth, want) {
  const box = await ev(`
    const g=[...document.querySelectorAll('#log .opts')].pop();
    if(!g) return null;
    const bs=[...g.querySelectorAll('.opt-btn')].filter(b=>!b.disabled);
    const w=${JSON.stringify(want || '')};
    const el = w ? bs.find(b=>(b.textContent||'').indexOf(w)>=0) : bs[${JSON.stringify(nth)}];
    if(!el) return null;
    el.scrollIntoView({behavior:'instant', block:'center'});
    const r=el.getBoundingClientRect();
    return {x:r.left+r.width/2, y:r.top+r.height/2, txt:(el.textContent||'').replace(/\\s+/g,' ').slice(0,22)};
  `);
  if (!box) return null;
  await clickPoint(box.x, box.y);
  return box;
}

(async () => {
  await new Promise(r => mock.listen(MOCK_PORT, '127.0.0.1', r));
  await startServer();

  try {
    const { execSync } = require('child_process');
    execSync('taskkill /F /IM msedge.exe /FI "STATUS eq RUNNING"', { stdio: 'ignore' });
  } catch (e) { /* 没有残留就直接走 */ }
  await sleep(800);
  const ud = path.join(os.tmpdir(), 'dsh_edge_ai_' + Date.now());
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + CDP_PORT,
    '--user-data-dir=' + ud, '--window-size=1440,1100', 'about:blank'], { stdio: 'ignore' });
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

  /* 从服务器网址进入 */
  await send('Page.navigate', { url: 'http://127.0.0.1:' + SRV_PORT + '/' });
  await sleep(2800);
  const boot = await ev(`return {ai: !!window.AI, http: location.protocol, chip: !!document.getElementById('aiChip'), status: window.AI ? window.AI.status : null};`);
  ok(boot.ai && boot.http === 'http:', '从网址进入时联网层已挂载', JSON.stringify(boot));
  ok(boot.chip, '底部出现 AI 开关');
  ok(boot.status.ready === true, '健康检查通过：服务端已配 Key', JSON.stringify(boot.status));

  /* 开关状态存在 localStorage：先清掉再刷新，保证从「未开」开始 */
  await ev(`localStorage.removeItem('jymf.ai.on'); return 1;`);
  await send('Page.navigate', { url: 'http://127.0.0.1:' + SRV_PORT + '/' });
  await sleep(2600);
  const fresh = await ev(`return {on: window.AI.status.on, ready: window.AI.status.ready};`);
  ok(fresh.on === false && fresh.ready === true, '初始状态：服务可用但联网没开', JSON.stringify(fresh));

  /* 开始游戏 → 走到进世界（起始页盖着底部按钮，先进世界再点开关） */
  await ev(`document.getElementById('landStart').click(); return 1;`);
  await sleep(300);
  let guard = 0;
  while (guard++ < 60) {
    const st = await ev(`return {phase: window.GAME.state.phase, step: window.CREATE.node(window.GAME.state).step};`);
    if (st.phase !== 'create') break;
    if (st.step === 'talent') { await clickLive(0); await sleep(200); await clickLive(0); await sleep(200); continue; }
    await clickLive(0);
  }
  const playing = await ev(`return {phase: window.GAME.state.phase, name: window.GAME.state.pc.name};`);
  eq(playing.phase, 'playing', '建卡走完进入世界');

  /* 真点 AI 开关（真鼠标，坐标取自元素中心） */
  const chipBox = await ev(`const b=document.getElementById('aiChip'); if(!b) return null; b.scrollIntoView({behavior:'instant',block:'center'}); const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,txt:b.textContent};`);
  ok(!!chipBox, '底部有 AI 开关', JSON.stringify(chipBox));
  if (chipBox) await clickPoint(chipBox.x, chipBox.y);
  await sleep(600);
  const on = await ev(`return window.AI.status;`);
  ok(on.on === true && on.ready === true, '点开关后联网打开', JSON.stringify(on));

  /* 联网叙述：推进几回合，看有没有文字块被 AI 就地接手 */
  await setMock({ mode: 'text' });
  for (let i = 0; i < 6; i++) { await clickLive(0); await sleep(500); }
  await sleep(1200);
  const narr = await ev(`
    const done=[...document.querySelectorAll('#log .blk[data-ai="done"]')];
    const all=[...document.querySelectorAll('#log .blk')].map(b=>b.textContent).join(' ');
    return {done:done.length, sample: done.length? done[0].textContent.replace(/\\s+/g,' ').slice(0,60):'', hasSnow:/雪面下有一层硬壳/.test(all)};
  `);
  ok(narr.done > 0, '有文字块被 AI 接手（data-ai=done）', JSON.stringify(narr));
  ok(narr.hasSnow, 'AI 写的句子真的出现在文字区里', JSON.stringify(narr));

  /* AI 解读自定义内容：先说一句本地规则读不出来的话 */
  const godName = await ev(`return (window.WD.GODS||[])[0].name;`);
  const localRead = await ev(`return JSON.stringify(window.GAME.interpret(window.GAME.state, '我朝天上念了两句听不清的话'));`);
  eq(localRead, 'null', '这句话本地规则读不出来（所以只能靠 AI）');
  await setMock({ customReply: { act: 'pray', arg: godName, text: 'AI 接手：你朝天上念了两句，声音散在风里。', check: null } });
  const inputBox = await ev(`const c=document.getElementById('cmd'); c.scrollIntoView({behavior:'instant',block:'center'}); const r=c.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};`);
  await clickPoint(inputBox.x, inputBox.y);
  await ev(`document.getElementById('cmd').value=''; return 1;`);
  await send('Input.insertText', { text: '我朝天上念了两句听不清的话' });
  const sendBox = await ev(`const s=document.getElementById('send'); const r=s.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};`);
  await clickPoint(sendBox.x, sendBox.y);
  await sleep(1600);
  const cust = await ev(`
    const all=[...document.querySelectorAll('#log .blk')].map(b=>b.textContent).join(' ');
    return {aiText:/AI 接手：你朝天上念了两句/.test(all), prayed:/祈祷判定/.test(all) || /没有回音/.test(all) || /祭坛/.test(all), turn: window.GAME.state.turn};
  `);
  ok(cust.aiText, 'AI 写的自定义内容叙述出现在文字区', JSON.stringify(cust));
  ok(cust.prayed, 'AI 提的意图被本地引擎接住并真的按「祈祷」结算了', JSON.stringify(cust));

  /* AI 事件前先脱战：引擎的随机遭遇会挡住「AI 事件」 */
  for (let i = 0; i < 12; i++) {
    const c = await ev(`return !!window.GAME.state.combat;`);
    if (!c) break;
    await ev(`if (window.GAME.state.combat) { window.GAME.state.combat.foes.forEach(f=>{f.hp=0;}); } return 1;`);
    await clickLive(0);
    await sleep(400);
  }
  /* AI 事件：敌人用当前地形真有的怪，免得被白名单剔掉 */
  const legalMon = await ev(`
    const s=window.GAME.state;
    const hit=(window.WD.MONSTERS||[]).filter(m=>(m.habitat||[]).some(h=>h===s.terrain||(h&&s.terrain&&(h.indexOf(s.terrain)>=0||s.terrain.indexOf(h)>=0))));
    return hit.length? hit[0].name : null;
  `);
  if (legalMon) await setMock({ eventReply: { kind: '遭遇', text: '坡下传来铁器磕碰声，两个人影顺着雪脊摸上来。', foes: [legalMon], dc: null, dmg: null, loot: null, why: '雪把气味压住了' } });
  /* AI 事件：真点底部那一格，敌人与伤害仍由引擎结算 */
  const before = await ev(`return {turn: window.GAME.state.turn, combat: !!window.GAME.state.combat};`);
  const evBox = await ev(`
    const b=[...document.querySelectorAll('#chips .chip')].find(x=>/AI 事 件/.test(x.textContent||''));
    if(!b) return null; b.scrollIntoView({behavior:'instant',block:'center'});
    const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};
  `);
  ok(!!evBox, '底部有「AI 事件」这一格');
  if (evBox) await clickPoint(evBox.x, evBox.y);
  await sleep(2000);
  const after = await ev(`
    const s=window.GAME.state;
    const all=[...document.querySelectorAll('#log .blk')].map(b=>b.textContent).join(' ');
    return {turn:s.turn, text:/坡下传来铁器磕碰声/.test(all), note:/AI 只出了这一段/.test(all),
      combat: s.combat? s.combat.foes.map(f=>f.name+':'+f.hp).join(',') : null};
  `);
  ok(after.turn > before.turn, 'AI 事件推进了一回合', JSON.stringify(after));
  ok(after.text, 'AI 出的事件文本进了文字区', JSON.stringify(after));
  ok(after.note, '并标注了数值由本地引擎结算');
  ok(!!after.combat && after.combat.indexOf(legalMon) >= 0, 'AI 点的敌人按引擎的怪物表生成（' + legalMon + '）', String(after.combat));

  /* 断线回退：上游罢工时，回合照样走完，文字退回引擎模板 */
  await setMock({ mode: 'broken' });
  const before2 = await ev(`return window.GAME.state.turn;`);
  await clickLive(0);
  await sleep(1500);
  const fb = await ev(`
    const s=window.GAME.state;
    const failed=[...document.querySelectorAll('#log .blk[data-ai="failed"]')].length;
    const empty=[...document.querySelectorAll('#log .blk[data-ai="empty"]')].length;
    const keptTemplate=[...document.querySelectorAll('#log .blk')].some(b=>b.textContent.length>6);
    const done=[...document.querySelectorAll('#log .blk[data-ai="done"]')].length;
    return {turn:s.turn, failed, empty, done, keptTemplate, err: window.AI.status.err, phase: s.phase};
  `);
  ok(fb.turn > before2, '上游罢工时回合照样走完（游戏不卡）', JSON.stringify(fb));
  ok(fb.failed + fb.empty > 0, '没拿到 AI 文字的文字块被如实标出（failed/empty）', JSON.stringify(fb));
  ok(!!fb.err, '状态里记下了失败原因', String(fb.err));
  ok(fb.keptTemplate, '引擎模板文字原样留着（断线不影响可读性）', JSON.stringify(fb));

  /* Key 全程不出现在页面里 */
  const leak = await ev(`return document.documentElement.outerHTML.indexOf('sk-browser-test-key') >= 0;`);
  ok(leak === false, '页面里始终没有 API Key');

  console.log('--- 联网版真浏览器 ---');
  console.log('PASS ' + pass + '  FAIL ' + fail);
  fails.slice(0, 12).forEach(f => console.log('  [X] ' + f));
  console.log('控制台异常：' + (errs.length ? errs.slice(0, 3).join(' | ') : '无'));
  ws.close(); proc.kill(); srv.kill(); mock.close();
  await sleep(400);
  process.exit(fail === 0 && errs.length === 0 ? 0 : 1);
})().catch(async e => {
  console.log('FATAL ' + e.message);
  console.log('PASS ' + pass + '  FAIL ' + fail);
  fails.slice(0, 12).forEach(f => console.log('  [X] ' + f));
  try { srv.kill(); } catch (e2) {}
  try { mock.close(); } catch (e3) {}
  process.exit(1);
});
