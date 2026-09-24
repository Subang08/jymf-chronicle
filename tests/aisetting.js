/* 真 UI 走「AI 设置」：失败路径与成功路径都要在弹层里看见结果（用户报的就是这一步没反应） */
'use strict';
const http = require('http');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MODEL_PORT = 8802, CDP_PORT = 9374;
const FILE = 'file:///' + encodeURI('' + (process.env.JYMF_ROOT || require('path').resolve(__dirname, '..')) + '/剑与魔法命运编年史.html');
let pass = 0, fail = 0; const fails = [];
function ok(c, l, e) { if (c) pass++; else { fail++; fails.push(l + (e ? '  << ' + e + ' >>' : '')); } }
function eq(a, b, l) { ok(a === b, l, 'got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* 假的本机模型端点（够 /models 与 /chat/completions） */
const model = http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
  let b = ''; req.on('data', c => b += c);
  req.on('end', () => {
    if (req.url.indexOf('/models') >= 0) {
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors));
      res.end(JSON.stringify({ data: [{ id: 'deepseek-r1:7b' }, { id: 'qwen2.5:14b' }] }));
      return;
    }
    res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors));
    res.end(JSON.stringify({ choices: [{ message: { content: '{"act":"generic","arg":null,"text":"试试就试试。","check":null}' } }] }));
  });
});

let ws, id = 0; const pend = new Map();
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
    const r=b.getBoundingClientRect(); const cx=r.left+r.width/2, cy=r.top+r.height/2;
    const hit=document.elementFromPoint(cx,cy);
    return {x:cx,y:cy,txt:(b.textContent||'').trim(),hittable:!!hit&&(hit===b||b.contains(hit))};
  `);
  if (!box) return null;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(260);
  return box;
}
async function setField(idName, value) {
  await ev(`const e=document.getElementById(${JSON.stringify(idName)}); if(e){ e.value=${JSON.stringify(value)}; } return 1;`);
}
(async () => {
  await new Promise(r => model.listen(MODEL_PORT, '127.0.0.1', r));
  try { execSync('taskkill /F /IM msedge.exe /FI "STATUS eq RUNNING"', { stdio: 'ignore' }); } catch (e) {}
  await sleep(800);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + CDP_PORT,
    '--user-data-dir=' + path.join(os.tmpdir(), 'dsh_set_' + Date.now()), '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
  let t = null;
  for (let i = 0; i < 40 && !t; i++) { await sleep(400); try { const r = await fetch('http://127.0.0.1:' + CDP_PORT + '/json'); t = (await r.json()).find(x => x.type === 'page'); } catch (e) {} }
  ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });
  ws.onmessage = m => { const g = JSON.parse(m.data); if (g.id && pend.has(g.id)) { const p = pend.get(g.id); pend.delete(g.id); g.error ? p.rej(new Error(g.error.message)) : p.res(g.result); } };
  await send('Runtime.enable');
  await send('Page.navigate', { url: FILE });
  await sleep(2600);

  /* 从起始页那颗按钮进去（真鼠标） */
  const landBtn = await clickText('#landAI', 'AI 接 入');
  ok(!!landBtn && landBtn.hittable, '起始页「AI 接入」可点', JSON.stringify(landBtn));
  const opened = await ev(`return {open: !document.getElementById('modal').classList.contains('hidden'), out: (document.getElementById('aiTestOut')||{}).textContent||''};`);
  ok(opened.open, 'AI 设置弹层已打开');
  ok(/还没测/.test(opened.out), '弹层里有「测试结果」一行并写明还没测', opened.out);

  /* --- 失败路径：默认端点（本机没装 Ollama）+ 一个不存在的端口 --- */
  await setField('aiEndpoint', '127.0.0.1:59999/v1');
  await setField('aiModel', '');
  const before = await ev(`return (document.querySelectorAll('.mb-foot button')[0]||{}).textContent;`);
  const fb = await clickText('.mb-foot button', '保 存 并 测 试');
  ok(!!fb && fb.hittable, '「保存并测试」按钮可点', JSON.stringify(fb));
  await sleep(1200);
  const afterFail = await ev(`
    const out=(document.getElementById('aiTestOut')||{}).textContent||'';
    const btn=(document.querySelectorAll('.mb-foot button')[0]||{}).textContent||'';
    return { out: out, btn: btn, hint: (document.getElementById('hint').textContent||'').trim(), stillOpen: !document.getElementById('modal').classList.contains('hidden') };
  `);
  ok(/没连上/.test(afterFail.out), '失败结果写在弹层里（不是写在看不见的提示栏）', afterFail.out.slice(0, 60));
  ok(afterFail.out.length > 20, '失败时还给出下一步怎么做', afterFail.out.slice(0, 80));
  eq(afterFail.btn, before, '测试结束后按钮恢复原样（不会一直卡在测试中）');
  ok(afterFail.stillOpen, '测试不会把弹层关掉');
  ok(afterFail.hint.length > 0, '底部提示栏也同步说了同一件事（GAME.hint 真的可用）', afterFail.hint.slice(0, 40));

  /* --- 成功路径：换成真的在跑的假端点 --- */
  await setField('aiEndpoint', '127.0.0.1:' + MODEL_PORT + '/v1');
  await clickText('.mb-foot button', '保 存 并 测 试');
  await sleep(1600);
  const afterOk = await ev(`
    const out=(document.getElementById('aiTestOut')||{}).textContent||'';
    const st=window.AI.status;
    return { out: out, ready: st.ready, using: st.using, model: st.model, models: st.models.length };
  `);
  ok(afterOk.ready && afterOk.using === 'direct', '成功路径：直连就绪', JSON.stringify(afterOk));
  ok(/好了/.test(afterOk.out) && /可用/.test(afterOk.out), '成功结果也写在弹层里', afterOk.out.slice(0, 80));
  ok(afterOk.model === 'deepseek-r1:7b', '自动选中端点上的第一个模型', afterOk.model);

  /* --- 拉取模型列表也要在弹层里回话 --- */
  await clickText('.mb-foot button', '拉 取 模 型 列 表');
  await sleep(1200);
  const listed = await ev(`return (document.getElementById('aiTestOut')||{}).textContent||'';`);
  ok(/模型/.test(listed) && /deepseek-r1:7b|qwen2\.5/.test(listed), '「拉取模型列表」把结果写在弹层里', listed.slice(0, 80));

  /* --- 预设按钮也要有回话 --- */
  await clickText('.ai-preset', 'DeepSeek 官方');
  await sleep(400);
  const presetOut = await ev(`
    const out=(document.getElementById('aiTestOut')||{}).textContent||'';
    return { out: out, ep: document.getElementById('aiEndpoint').value, model: document.getElementById('aiModel').value };
  `);
  ok(/DeepSeek 官方/.test(presetOut.out), '点预设后弹层里说明填好了什么', presetOut.out.slice(0, 70));
  eq(presetOut.ep, 'api.deepseek.com/v1', '预设把端点填进输入框');
  eq(presetOut.model, 'deepseek-chat', '预设把模型填进输入框');

  /* --- 官方端点 + 没填 Key：要明确说要 Key --- */
  await setField('aiModel', 'deepseek-chat');
  await clickText('.mb-foot button', '保 存 并 测 试');
  await sleep(2000);
  const needKey = await ev(`return (document.getElementById('aiTestOut')||{}).textContent||'';`);
  ok(/Key/.test(needKey), '官方端点没填 Key 时，弹层直接说要点 Key', needKey.slice(0, 90));

  /* --- 关掉弹层；底部开关此时应能一键打开 --- */
  await clickText('.mb-foot button', '关 闭');
  await sleep(300);
  const closed = await ev(`return document.getElementById('modal').classList.contains('hidden');`);
  ok(closed, '「关闭」能关掉弹层');
  const saved = await ev(`return JSON.parse(localStorage.getItem('jymf.ai.cfg')||'{}');`);
  ok(saved.endpoint && saved.model, '设置已按设备保存在本机', JSON.stringify(saved).slice(0, 90));

  /* --- 真实官方端点 + 错 Key：提示必须能读懂 --- */
  await ev(`window.AI.settings(); return 1;`);
  await sleep(300);
  await setField('aiEndpoint', 'api.deepseek.com/v1');
  await setField('aiModel', 'deepseek-chat');
  await setField('aiKey', 'sk-definitely-invalid-probe');
  await clickText('.mb-foot button', '保 存 并 测 试');
  await sleep(4000);
  const official = await ev(`return (document.getElementById('aiTestOut')||{}).textContent||'';`);
  console.log('官方端点 + 错 Key 的提示：' + official.slice(0, 140));
  ok(!/Failed to fetch/.test(official), '官方端点不会卡在 Failed to fetch（协议与 CORS 都对）', official.slice(0, 80));
  ok(/401/.test(official), '官方端点如实回 401（浏览器直连确实成立）', official.slice(0, 80));
  ok(/401|Key|没连上/.test(official), '错误 Key 给出可读原因', official.slice(0, 80));
  await ev(`window.GAME.closeModal(); return 1;`);

  console.log('--- AI 设置交互 ---');
  console.log('PASS ' + pass + '  FAIL ' + fail);
  fails.slice(0, 10).forEach(f => console.log('  [X] ' + f));
  ws.close(); proc.kill(); model.close();
  await sleep(300);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.log('FATAL ' + e.message); console.log('PASS ' + pass + '  FAIL ' + fail); fails.slice(0, 10).forEach(f => console.log('  [X] ' + f)); try { model.close(); } catch (e2) {} process.exit(1); });
