/* 直连模式验证：页面从 file:// 打开（没有任何服务器），直接连本地 OpenAI 兼容端点
   证明：不需要总服务器，每台设备各自连自己的 DeepSeek / Ollama 也能跑 */
'use strict';
const http = require('http');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const ROOT = '' + (process.env.JYMF_ROOT || require('path').resolve(__dirname, '..')) + '';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MODEL_PORT = 8801, CDP_PORT = 9368;
const FILE = 'file:///' + encodeURI(path.join(ROOT, '剑与魔法命运编年史.html').replace(/\\/g, '/'));

let pass = 0, fail = 0; const fails = [];
function ok(c, l, e) { if (c) pass++; else { fail++; fails.push(l + (e ? '  << ' + e + ' >>' : '')); } }
function eq(a, b, l) { ok(a === b, l, 'got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------- 假的本地模型端点（OpenAI 兼容 + CORS） ---------------- */
let mode = 'text';          /* text | banned | event | custom | down */
let hits = { models: 0, chat: 0, options: 0 };
const model = http.createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type,authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  };
  if (req.method === 'OPTIONS') { hits.options++; res.writeHead(204, cors); res.end(); return; }
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', async () => {
    if (req.url.indexOf('/models') >= 0) {
      hits.models++;
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors));
      res.end(JSON.stringify({ data: [{ id: 'deepseek-r1:7b' }, { id: 'qwen2.5:14b' }] }));
      return;
    }
    hits.chat++;
    if (mode === 'down') { res.writeHead(500, cors); res.end('{"error":"model crashed"}'); return; }
    const parsed = JSON.parse(body || '{}');
    const sys = (parsed.messages || []).map(m => m.content).join('\n');
    const isEvent = /只返回一行 JSON[\s\S]*"kind"/.test(sys);
    const isCustom = /"act"/.test(sys) && /generic/.test(sys);
    const isImprov = /"tags"/.test(sys);
    if (isEvent || isCustom || isImprov) {
      let content = '{"name":"骨片","desc":"磨得发亮的骨片，边上刻着三道浅痕。","tags":["旧物","来路不明"]}';
      if (isEvent) content = JSON.stringify({ kind: '遭遇', text: '坡下有人在烧湿柴，烟贴地爬过来。', foes: ['__LEGAL__'], dc: null, dmg: null, loot: null, why: '雪把气味压住了' });
      if (isCustom) content = JSON.stringify({ act: 'pray', arg: '__GOD__', text: '本机模型接手：你朝天上念了两句，声音散在风里。', check: null });
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors));
      res.end(JSON.stringify({ choices: [{ message: { content } }], usage: { total_tokens: 24 } }));
      return;
    }
    /* 叙述：SSE 流式（这台假模型是本地跑的，回话里塞了违禁词，用来验证客户端闸门） */
    const parts = mode === 'banned'
      ? ['拐角处的动静微不可查。', '你不由得握紧了刀。']
      : ['雪面下有一层硬壳。', '你踩上去，它先响了一声，又静了。'];
    res.writeHead(200, Object.assign({ 'Content-Type': 'text/event-stream' }, cors));
    for (const p of parts) { res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: p } }] }) + '\n\n'); await sleep(20); }
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
  await sleep(180);
}
async function clickLive(nth) {
  const box = await ev(`
    const g=[...document.querySelectorAll('#log .opts')].pop();
    if(!g) return null;
    const bs=[...g.querySelectorAll('.opt-btn')].filter(b=>!b.disabled);
    const el = bs[${JSON.stringify(nth)}];
    if(!el) return null;
    el.scrollIntoView({behavior:'instant', block:'center'});
    const r=el.getBoundingClientRect();
    return {x:r.left+r.width/2, y:r.top+r.height/2};
  `);
  if (!box) return null;
  await clickPoint(box.x, box.y);
  return box;
}

(async () => {
  await new Promise(r => model.listen(MODEL_PORT, '127.0.0.1', r));
  try { execSync('taskkill /F /IM msedge.exe /FI "STATUS eq RUNNING"', { stdio: 'ignore' }); } catch (e) {}
  await sleep(700);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + CDP_PORT,
    '--user-data-dir=' + path.join(os.tmpdir(), 'dsh_edge_direct_' + Date.now()), '--window-size=1440,1100', 'about:blank'], { stdio: 'ignore' });
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

  /* 关键：从文件打开，没有任何服务器 */
  await send('Page.navigate', { url: FILE });
  await sleep(2800);
  const boot = await ev(`return {proto: location.protocol, ai: !!window.AI, chip: !!document.getElementById('aiChip'), cfgChip: !!document.getElementById('aiCfg'),
    direct: !!(window.AI && window.AI.setConfig && window.AI.models), status: window.AI.status};`);
  eq(boot.proto, 'file:', '页面是从本地文件打开的（没有服务器）');
  ok(boot.ai && boot.chip && boot.cfgChip, '联网层与「AI 设置」都在', JSON.stringify(boot));
  ok(boot.status.http === false, '确认不在 http 下：没有任何本地桥可用', JSON.stringify(boot.status));

  /* 配好这台设备的端点（相当于玩家在「AI 设置」里填地址） */
  const configured = await ev(`return window.AI.setConfig({ transport: 'direct', endpoint: '127.0.0.1:${MODEL_PORT}/v1', model: '' });`);
  eq(configured.transport, 'direct', '通道设为直连');
  ok(/11434|8801/.test(configured.endpoint) && configured.endpoint.indexOf('://') > 0, '没写协议的地址被自动补全', configured.endpoint);

  /* 打开开关：探测 → 拉模型列表 → 就绪 */
  const probed = await ev(`const ok = await window.AI.probe(); return {ok: ok, status: window.AI.status};`);
  ok(probed.ok === true && probed.status.using === 'direct', '直连成功（没有经过任何服务器）', JSON.stringify(probed.status));
  ok(probed.status.models.indexOf('deepseek-r1:7b') >= 0, '从本地端点拉到模型列表', JSON.stringify(probed.status.models));
  eq(probed.status.model, 'deepseek-r1:7b', '默认取列表第一个模型');
  ok(hits.models >= 1 && hits.chat === 0, '只调了 /models，还没花生成调用', JSON.stringify(hits));

  /* 「AI 设置」面板能打开（未写协议、端点、模型名都在） */
  const panel = await ev(`
    window.AI.settings();
    const box = document.getElementById('modalBox');
    const txt = box ? box.textContent.replace(/\\s+/g,' ') : '';
    const has = { open: !document.getElementById('modal').classList.contains('hidden'),
      endpoint: !!document.getElementById('aiEndpoint'), model: !!document.getElementById('aiModel'),
      key: !!document.getElementById('aiKey'), transport: !!document.getElementById('aiTransport') };
    window.GAME.closeModal();
    return {has: has, sample: txt.slice(0, 60)};
  `);
  ok(panel.has.open && panel.has.endpoint && panel.has.model && panel.has.key && panel.has.transport, '设置面板含端点/模型/Key/通道四项', JSON.stringify(panel.has));

  /* 最省事的路径：一键预设 DeepSeek 官方 → 粘 Key → 保存 → 就绪（不用装任何东西） */
  const presets = await ev(`return window.AI.presets();`);
  ok(presets.length >= 5 && presets[0].id === 'deepseek', '预设里有 DeepSeek 官方（排第一）', JSON.stringify(presets.map(p => p.name)));
  eq(presets[0].endpoint, 'api.deepseek.com/v1', '官方端点预设正确');
  eq(presets[0].model, 'deepseek-chat', '官方模型预设正确');
  ok(presets.some(p => p.model === 'deepseek-reasoner'), '提供 deepseek-reasoner 预设');
  const applied = await ev(`const p = window.AI.preset('deepseek'); return {p: p, st: window.AI.status};`);
  eq(applied.st.endpoint, 'https' + '://api.deepseek.com/v1', '公网域名补 https（补成 http 会 Failed to fetch）');
  eq(applied.st.transport, 'direct', '点预设后通道切成直连');
  eq(applied.st.model, 'deepseek-chat', '点预设后模型填成 deepseek-chat');
  /* 面板里真的有这几个按钮，且粘 Key 的输入框在 */
  const presetUI = await ev(`
    window.AI.settings();
    const btns=[...document.querySelectorAll('.ai-preset')].map(b=>b.textContent);
    const has={key:!!document.getElementById('aiKey'), endpoint:!!document.getElementById('aiEndpoint'), model:!!document.getElementById('aiModel')};
    window.GAME.closeModal();
    return {btns:btns, has:has};
  `);
  ok(presetUI.btns.length >= 5, '设置面板里有一排预设按钮', JSON.stringify(presetUI.btns));
  ok(presetUI.has.key && presetUI.has.endpoint && presetUI.has.model, '粘 Key / 改端点 / 改模型三处都在', JSON.stringify(presetUI.has));
  /* 官方端点确实允许浏览器直连（真网络探测；连不上就跳过，不算失败） */
  const corsProbe = await ev(`
    try {
      const r = await fetch('https://api.deepseek.com/v1/models', { headers: { Authorization: 'Bearer sk-probe-invalid' } });
      return { reachable: true, status: r.status, cors: r.type !== 'opaque' };
    } catch (e) { return { reachable: false, err: String(e && e.message).slice(0, 60) }; }
  `);
  if (corsProbe.reachable) {
    eq(corsProbe.status, 401, '官方端点可达并如实回 401（Key 无效时）');
    ok(corsProbe.cors, '官方端点允许浏览器直连读取响应（CORS 通过）');
  } else {
    ok(true, '（这台机器连不上官方端点，跳过 CORS 探测：' + corsProbe.err + '）');
  }

  /* 换回本地假模型继续测直连叙述 */
  await ev(`window.AI.setConfig({ transport: 'direct', endpoint: '127.0.0.1:${MODEL_PORT}/v1', model: '', key: '' }); return 1;`);

  /* 开局：真点按钮走到进世界 */
  await ev(`document.getElementById('landStart').click(); return 1;`);
  await sleep(300);
  let guard = 0;
  while (guard++ < 60) {
    const st = await ev(`return {phase: window.GAME.state.phase, step: window.CREATE.node(window.GAME.state).step};`);
    if (st.phase !== 'create') break;
    if (st.step === 'talent') { await clickLive(0); await sleep(180); await clickLive(0); await sleep(180); continue; }
    await clickLive(0);
  }
  eq(await ev(`return window.GAME.state.phase;`), 'playing', '建卡走完进入世界');

  /* 真点 AI 开关 → 直连叙述 */
  const chipBox = await ev(`const b=document.getElementById('aiChip'); b.scrollIntoView({behavior:'instant',block:'center'}); const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};`);
  await clickPoint(chipBox.x, chipBox.y);
  await sleep(900);
  const on = await ev(`return window.AI.status;`);
  ok(on.on === true && on.ready === true && on.using === 'direct', '点开关后直连可用', JSON.stringify(on));

  for (let i = 0; i < 5; i++) { await clickLive(0); await sleep(500); }
  await sleep(900);
  const narr = await ev(`
    const done=[...document.querySelectorAll('#log .blk[data-ai="done"]')];
    const all=[...document.querySelectorAll('#log .blk')].map(b=>b.textContent).join(' ');
    return {done:done.length, snow:/雪面下有一层硬壳/.test(all), sample: done.length?done[0].textContent.replace(/\\s+/g,' ').slice(0,40):''};
  `);
  ok(narr.done > 0 && narr.snow, '本机模型的文字被就地替换进文字区', JSON.stringify(narr));

  /* 客户端闸门：让假模型吐违禁词，页面自己得拦下来 */
  mode = 'banned';
  await clickLive(0);
  await sleep(1200);
  const banned = await ev(`
    const all=[...document.querySelectorAll('#log .blk')].map(b=>b.textContent).join(' ');
    return {dirty:/微不可查|不由得/.test(all), clean:/极轻|就/.test(all)};
  `);
  ok(!banned.dirty, '直连模式下禁用词被页面自己拦下（没有服务端可依赖）', JSON.stringify(banned));
  ok(banned.clean, '拦下之后换成了干净的词', JSON.stringify(banned));

  /* 直连的自定义内容：本地读不出来 → 交本机模型读 → 引擎按意图结算 */
  const ctx = await ev(`
    const s=window.GAME.state;
    const local = window.GAME.interpret(s, '我朝天上念了两句听不清的话');
    const god = (window.WD.GODS||[])[0].name;
    const mon = (window.WD.MONSTERS||[]).filter(m=>(m.habitat||[]).some(h=>h===s.terrain))[0];
    return {local: JSON.stringify(local), god: god, mon: mon?mon.name:null, terrain: s.terrain};
  `);
  eq(ctx.local, 'null', '这句话本地规则读不出来');
  mode = 'custom';
  await ev(`document.getElementById('cmd').value=''; return 1;`);
  await ev(`document.getElementById('cmd').focus(); return 1;`);
  await send('Input.insertText', { text: '我朝天上念了两句听不清的话' });
  const sendBox = await ev(`const s=document.getElementById('send'); const r=s.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};`);
  await clickPoint(sendBox.x, sendBox.y);
  await sleep(2000);
  const cust = await ev(`
    const all=[...document.querySelectorAll('#log .blk')].map(b=>b.textContent).join(' ');
    return {aiText:/本机模型接手/.test(all), byEngine:/祈祷/.test(all)};
  `);
  ok(cust.aiText, '本机模型写的自定义叙述进了文字区', JSON.stringify(cust));
  ok(cust.byEngine, '它给的意图被本地引擎接住并按祈祷结算', JSON.stringify(cust));

  /* 直连的 AI 事件 */
  for (let i = 0; i < 10; i++) {
    if (!(await ev(`return !!window.GAME.state.combat;`))) break;
    await ev(`if (window.GAME.state.combat) window.GAME.state.combat.foes.forEach(f=>{f.hp=0;}); return 1;`);
    await clickLive(0);
    await sleep(350);
  }
  if (ctx.mon) {
    /* 把合法怪物名塞进假模型的回话里 */
    mode = 'event';
    const before = await ev(`return window.GAME.state.turn;`);
    const evBox = await ev(`
      const b=[...document.querySelectorAll('#chips .chip')].find(x=>/AI 事 件/.test(x.textContent||''));
      if(!b) return null; b.scrollIntoView({behavior:'instant',block:'center'});
      const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};
    `);
    if (evBox) await clickPoint(evBox.x, evBox.y);
    await sleep(2200);
    const after = await ev(`
      const s=window.GAME.state;
      const all=[...document.querySelectorAll('#log .blk')].map(b=>b.textContent).join(' ');
      return {turn:s.turn, text:/坡下有人在烧湿柴/.test(all), note:/本地引擎结算/.test(all), combat: s.combat?s.combat.foes.map(f=>f.name).join(','):null};
    `);
    ok(after.turn > before, '直连的 AI 事件推进了回合', JSON.stringify(after));
    ok(after.text && after.note, '事件文本进文字区并标注数值由本地结算', JSON.stringify(after));
  } else {
    ok(true, '（这块地形没有合法怪物，跳过 AI 事件断言）');
  }

  /* 端点挂掉：回合照走，退回模板 */
  mode = 'down';
  const before2 = await ev(`return window.GAME.state.turn;`);
  await clickLive(0);
  await sleep(1800);
  const fb = await ev(`
    const s=window.GAME.state;
    return {turn:s.turn, failed:[...document.querySelectorAll('#log .blk[data-ai="failed"],#log .blk[data-ai="empty"]')].length,
      kept:[...document.querySelectorAll('#log .blk')].some(b=>b.textContent.length>6), err: window.AI.status.err};
  `);
  ok(fb.turn > before2, '端点挂掉时回合照样走完', JSON.stringify(fb));
  ok(fb.failed > 0 || fb.err, '失败被如实标出', JSON.stringify(fb));
  ok(fb.kept, '引擎模板文字仍在，可读性不受影响');

  /* 全程没有任何 /api 请求：这台设备根本没跑服务器 */
  const apiHit = await ev(`return window.AI.status.using;`);
  eq(apiHit, 'direct', '全程只用直连，没有走任何本地桥');
  ok(hits.chat > 3, '生成调用都打在本地模型端点上', JSON.stringify(hits));

  console.log('--- 直连模式（无服务器）---');
  console.log('PASS ' + pass + '  FAIL ' + fail);
  fails.slice(0, 12).forEach(f => console.log('  [X] ' + f));
  console.log('命中统计：' + JSON.stringify(hits));
  console.log('控制台异常：' + (errs.length ? errs.slice(0, 3).join(' | ') : '无'));
  ws.close(); proc.kill(); model.close();
  await sleep(300);
  process.exit(fail === 0 && errs.length === 0 ? 0 : 1);
})().catch(async e => {
  console.log('FATAL ' + e.message);
  console.log('PASS ' + pass + '  FAIL ' + fail);
  fails.slice(0, 12).forEach(f => console.log('  [X] ' + f));
  try { model.close(); } catch (e2) {}
  process.exit(1);
});
