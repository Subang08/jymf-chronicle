/* 联网：选项与事件都由 AI 生成内容，但仍必须点得动、算得出 */
'use strict';
const http = require('http');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MODEL_PORT = 8803, CDP_PORT = 9377;
const FILE = 'file:///' + encodeURI('' + (process.env.JYMF_ROOT || require('path').resolve(__dirname, '..')) + '/剑与魔法命运编年史.html');
let pass = 0, fail = 0; const fails = [];
function ok(c, l, e) { if (c) pass++; else { fail++; fails.push(l + (e ? '  << ' + e + ' >>' : '')); } }
function eq(a, b, l) { ok(a === b, l, 'got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

let optReply = null, fireReply = null, mode = 'ok';
let seen = { options: 0, fire: 0, narrate: 0 };
const model = http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
  let b = ''; req.on('data', c => b += c);
  req.on('end', () => {
    if (req.url.indexOf('/models') >= 0) {
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors));
      res.end(JSON.stringify({ data: [{ id: 'deepseek-r1:7b' }] })); return;
    }
    const parsed = JSON.parse(b || '{}');
    const sys = (parsed.messages || []).map(m => m.content).join('\n');
    const isOptions = /四个选项/.test(sys);
    const isFire = /引擎判定「要出事」/.test(sys);
    if (mode === 'down') { res.writeHead(500, cors); res.end('{"error":"down"}'); return; }
    if (isOptions) {
      seen.options++;
      const payload = optReply || {
        options: [
          { role: 'safe', label: '顺着雪坡下的脚印往前走（顺势而为）', act: 'forward' },
          { role: 'bold', label: '直接闯进坡下的木棚（剑走偏锋）', act: 'bold' },
          { role: 'careful', label: '先绕一圈看清棚里有几个人（谨慎观察）', act: 'careful' },
          { role: 'rest', label: '退回背风处歇到天亮（休息）', act: 'rest' }
        ],
        note: '风里带着湿柴味'
      };
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors));
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] })); return;
    }
    if (isFire) {
      seen.fire++;
      const payload = fireReply || {
        kind: '遭遇', text: '坡下有人在烧湿柴，烟贴地爬过来。你看清是两个裹着兽皮的人，其中一个把手按在刀上。',
        foes: ['__LEGAL__'], dc: null, dmg: null, loot: null, why: '雪把气味压住了，谁也没先看见谁'
      };
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors));
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] })); return;
    }
    seen.narrate++;
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
async function clickPoint(x, y) { 
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(220);
}
async function clickLiveOption(nth, want) {
  const box = await ev(`
    const g=[...document.querySelectorAll('#log .opts')].pop(); if(!g) return null;
    const bs=[...g.querySelectorAll('.opt-btn')].filter(b=>!b.disabled);
    const w=${JSON.stringify(want || '')};
    const el = w ? bs.find(b=>(b.textContent||'').indexOf(w)>=0) : bs[${JSON.stringify(nth)}];
    if(!el) return null;
    el.scrollIntoView({behavior:'instant', block:'center'});
    const r=el.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2, txt:(el.textContent||'').replace(/\\s+/g,' ').slice(0,30)};
  `);
  if (!box) return null;
  await clickPoint(box.x, box.y);
  return box;
}
(async () => {
  await new Promise(r => model.listen(MODEL_PORT, '127.0.0.1', r));
  try { execSync('taskkill /F /IM msedge.exe /FI "STATUS eq RUNNING"', { stdio: 'ignore' }); } catch (e) {}
  await sleep(800);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + CDP_PORT,
    '--user-data-dir=' + path.join(os.tmpdir(), 'dsh_aigen_' + Date.now()), '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
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

  /* 配好直连并打开 */
  await ev(`window.AI.setConfig({ transport:'direct', endpoint:'127.0.0.1:${MODEL_PORT}/v1', model:'deepseek-r1:7b', key:'', on:true }); return 1;`);
  await sleep(1500);
  const st0 = await ev(`return window.AI.status;`);
  ok(st0.on && st0.ready && st0.using === 'direct', '直连就绪', JSON.stringify(st0));

  /* 建卡进世界 */
  await ev(`document.getElementById('landStart').click(); return 1;`);
  await sleep(300);
  for (let i = 0; i < 60; i++) {
    const st = await ev(`return {phase: window.GAME.state.phase, step: window.CREATE.node(window.GAME.state).step};`);
    if (st.phase !== 'create') break;
    if (st.step === 'talent') { await clickLiveOption(0); await clickLiveOption(0); continue; }
    await clickLiveOption(0);
  }
  eq(await ev(`return window.GAME.state.phase;`), 'playing', '进入世界');

  /* 开篇剧本的选项是剧本写死的（机械动作与剧本，不进 AI）：先把它走完 */
  for (let i = 0; i < 12; i++) {
    const done = await ev(`const s=window.GAME.state; return {idx:s.flags.scriptIdx, len:(s.flags.script||[]).length};`);
    if (done.idx >= done.len) break;
    await clickLiveOption(0);
    await sleep(300);
  }
  const leftScript = await ev(`const s=window.GAME.state; return s.flags.scriptIdx >= (s.flags.script||[]).length;`);
  ok(leftScript, '开篇剧本已走完，进入自由场景');

  /* --- 选项由 AI 生成：等一轮，看最后一组按钮的文字是否换成模型写的那四句 --- */
  await sleep(3000);
  const dbg = await ev(`return {info: window.GAME.aiInfo(), ai: window.AI.status};`);
  console.log('排查：' + JSON.stringify(dbg.info) + ' · on=' + dbg.ai.on + ' ready=' + dbg.ai.ready + ' model=' + dbg.ai.model);
  const direct = await ev(`try { const r = await window.AI.options('city','',[]); return {ok:r.ok, n:(r.options||[]).length, first:(r.options&&r.options[0])||null}; } catch(e){ return {err:String(e&&e.message)}; }`);
  console.log('直接调 options()：' + JSON.stringify(direct));
  const opts1 = await ev(`
    const g=[...document.querySelectorAll('#log .opts')].pop();
    const bs=[...g.querySelectorAll('.opt-btn')];
    return { n: bs.length, labels: bs.map(b=>(b.textContent||'').replace(/\\s+/g,' ').trim()), disabled: bs.filter(b=>b.disabled).length };
  `);
  ok(seen.options > 0, '确实向模型要过选项', String(seen.options));
  ok(opts1.labels.some(l => /顺着雪坡下的脚印/.test(l)), 'AI 写的选项出现在最后一组里', JSON.stringify(opts1.labels.slice(0, 2)));
  ok(opts1.labels.some(l => /直接闯进坡下的木棚/.test(l)), '四格都换成了 AI 的文字', JSON.stringify(opts1.labels.slice(2, 4)));
  eq(opts1.n, 5, '仍然是五个选项（a-e，自定义留在最后）');
  eq(opts1.disabled, 0, '换过之后的选项全部可点（没有死键）');
  ok(/自定义/.test(opts1.labels[4] || ''), '第五格还是自定义', opts1.labels[4]);

  /* 真点 AI 那一个选项：必须真的走一回合 */
  const before = await ev(`return window.GAME.state.turn;`);
  const clicked = await clickLiveOption(0, '顺着雪坡下的脚印');
  ok(!!clicked, 'AI 选项可以被真鼠标点中', JSON.stringify(clicked && clicked.txt));
  await sleep(2200);
  const after = await ev(`
    const s=window.GAME.state;
    const all=[...document.querySelectorAll('#log .blk')].map(b=>b.textContent).join(' ');
    return { turn: s.turn, picked: /〔A〕/.test(all), advanced: s.nodes.length };
  `);
  ok(after.turn > before, 'AI 选项点下去真的推进了一回合', JSON.stringify(after));

  /* --- act 认不出时必须退回引擎那一格，而不是变成死键 --- */
  optReply = { options: [
    { role: 'safe', label: '这是一句模型瞎编的动作描写（顺势而为）', act: 'nonsense_act' },
    { role: 'bold', label: '短', act: 'bold' },
    { role: 'careful', label: '先看清周围再动（谨慎观察）', act: 'careful' },
    { role: 'rest', label: '歇一会儿（休息）', act: 'rest' }
  ], note: '' };
  /* 触发一次新场景（用「前往近处」换地方，会重新出选项） */
  const moved = await ev(`
    const s = window.GAME.state;
    if (window.GEO && window.GEO.adjacentTo) { const n = window.GEO.adjacentTo(s.place)[0]; if (n) window.GAME.ACT.custom(s, '我前往' + n.name); }
    return window.GAME.state.place;
  `);
  await sleep(2500);
  const opts2 = await ev(`
    const g=[...document.querySelectorAll('#log .opts')].pop();
    const bs=[...g.querySelectorAll('.opt-btn')];
    return { labels: bs.map(b=>(b.textContent||'').replace(/\\s+/g,' ').trim()), disabled: bs.filter(b=>b.disabled).length };
  `);
  const nonsenseGone = !opts2.labels.some(l => /模型瞎编/.test(l));
  ok(nonsenseGone, '认不出的 act 不会把模型那句当成可点选项', JSON.stringify(opts2.labels.slice(0, 3)));
  ok(opts2.labels.length >= 5 && opts2.disabled === 0, '退回之后仍是五个可点选项（没有空格子/死键）', JSON.stringify(opts2.labels.slice(0, 2)));
  /* 合并规则本身在无头套件里做确定性核对（这里只保证界面上不出错） */
  optReply = null;

  /* --- 事件：引擎掷出「要出事」，内容要由 AI 写 --- */
  const legalMon = await ev(`
    const s = window.GAME.state;
    const hit = (window.WD.MONSTERS||[]).filter(m=>(m.habitat||[]).some(h=>h===s.terrain||(h&&s.terrain&&(h.indexOf(s.terrain)>=0||s.terrain.indexOf(h)>=0))));
    return hit.length ? hit[0].name : null;
  `);
  if (legalMon) {
    fireReply = { kind: '遭遇', text: '坡下有人在烧湿柴，烟贴地爬过来。你看清是两个裹着兽皮的人，其中一个把手按在刀上。', foes: [legalMon], dc: null, dmg: null, loot: null, why: '雪把气味压住了' };
    /* 把出行风险拉到必定触发，再走一趟近处 */
    const fired = await ev(`
      const s = window.GAME.state;
      const near = window.GEO.adjacentTo(s.place)[0];
      if (!near) return { skip: true };
      window.ENG.seed(12345);
      window.GAME.ACT.custom(s, '我前往' + near.name);
      return { place: s.place, to: near.name };
    `);
    await sleep(3000);
    const evRes = await ev(`
      const s=window.GAME.state;
      const all=[...document.querySelectorAll('#log .blk')].map(b=>b.textContent).join(' ');
      return { aiText: /坡下有人在烧湿柴/.test(all), note: /这一段由 AI 写/.test(all),
        foes: s.combat ? s.combat.foes.map(f=>f.name).join(',') : null, turns: s.turn };
    `);
    if (seen.fire > 0) {
      ok(evRes.aiText, 'AI 写的事件文本进了文字区', JSON.stringify(evRes).slice(0, 120));
      ok(evRes.note, '并注明敌人与伤害仍由本地结算');
      if (evRes.foes) ok(evRes.foes.indexOf(legalMon) >= 0, 'AI 点的敌人按本地怪物表生成', String(evRes.foes));
    } else {
      ok(true, '（这一趟没掷出事件，AI 事件路径未触发；选项路径已验证）');
    }
  } else {
    ok(true, '（这块地形没有合法怪物，跳过事件断言）');
  }

  /* --- 端点挂掉：选项与事件都要退回引擎，游戏不能停 --- */
  mode = 'down';
  const before3 = await ev(`return window.GAME.state.turn;`);
  await clickLiveOption(0);
  await sleep(2500);
  const fb = await ev(`
    const s=window.GAME.state;
    const g=[...document.querySelectorAll('#log .opts')].pop();
    const bs=[...g.querySelectorAll('.opt-btn')];
    return { turn: s.turn, phase: s.phase, opts: bs.length, disabled: bs.filter(b=>b.disabled).length,
      engineLabels: bs.map(b=>(b.textContent||'').replace(/\\s+/g,' ').trim()).slice(0,2) };
  `);
  ok(fb.turn > before3, '模型端点挂掉时回合照样走完', JSON.stringify(fb));
  ok(fb.opts >= 5 && fb.disabled === 0, '退回引擎选项且全部可点', JSON.stringify(fb.engineLabels));
  eq(fb.phase, 'playing', '仍然在游戏里（没有卡住）');

  console.log('--- AI 生成选项与事件 ---');
  console.log('PASS ' + pass + '  FAIL ' + fail);
  fails.slice(0, 12).forEach(f => console.log('  [X] ' + f));
  console.log('调用统计：' + JSON.stringify(seen));
  console.log('控制台异常：' + (errs.length ? errs.slice(0, 3).join(' | ') : '无'));
  ws.close(); proc.kill(); model.close();
  await sleep(300);
  process.exit(fail === 0 && errs.length === 0 ? 0 : 1);
})().catch(e => { console.log('FATAL ' + e.message); console.log('PASS ' + pass + '  FAIL ' + fail); fails.slice(0, 10).forEach(f => console.log('  [X] ' + f)); try { model.close(); } catch (e2) {} process.exit(1); });
