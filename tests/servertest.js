/* 联网版服务器测试：用本地假 DeepSeek 上游跑通全部接口，并核对闸门与回退 */
'use strict';
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = '' + (process.env.JYMF_ROOT || require('path').resolve(__dirname, '..')) + '';
const MOCK_PORT = 8799, SRV_PORT = 8798;
const KEY = 'sk-test-key-should-never-leak-123456';

let pass = 0, fail = 0; const fails = [];
function ok(cond, label, extra) {
  if (cond) pass++;
  else { fail++; fails.push(label + (extra ? '  << ' + extra + ' >>' : '')); }
}
function eq(a, b, label) { ok(a === b, label, 'got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------- 假上游：按脚本回话 ---------------- */
let mode = 'text';        /* text | json | banned | broken | slow */
let lastReq = null;
const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', async () => {
    lastReq = { url: req.url, auth: req.headers.authorization || '', body: JSON.parse(body || '{}') };
    const sys = (lastReq.body.messages || []).map(m => m.content).join('\n');
    if (mode === 'broken') {
      /* 上游给了废格式：合法 JSON 外壳、内容是废话，走重试 → 502 那条路 */
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: '这个格式不是 JSON，只是一句废话。' } }] }));
      return;
    }
    if (mode === 'banned') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      const chunk = '拐角处的动静微不可查，你不由得握紧了刀。';
      res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: chunk } }] }) + '\n\n');
      res.write('data: [DONE]\n\n'); res.end(); return;
    }
    if (/四个选项/.test(sys)) {
      const content = JSON.stringify({ options: [
        { role: 'safe', label: '顺着脚印往坡下走（顺势而为）', act: 'forward' },
        { role: 'bold', label: '直接翻墙进去（剑走偏锋）', act: 'bold' },
        { role: 'careful', label: '先绕一圈看清院子（谨慎观察）', act: 'careful' },
        { role: 'rest', label: '退回背风处歇着（休息）', act: '不存在的动作' }
      ], note: '风里有湿柴味' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content } }], usage: { total_tokens: 30 } }));
      return;
    }
    if (/引擎判定「要出事」/.test(sys)) {
      const content = JSON.stringify({ kind: '遭遇', text: '三个人从坡下上来，手上拿着短矛。', foes: ['灰林狼', '自造的怪'], dc: 19, dmg: '2d6', loot: '旧匕首', why: '雪把气味压住了' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content } }], usage: { total_tokens: 30 } }));
      return;
    }
    if (mode === 'json' || mode === 'broken') {
      /* 事件 / 自定义 / 条目：一次性 JSON 响应 */
      let content = '{"kind":"遭遇","text":"三个人从坡下上来，手上拿着短矛。","foes":["灰林狼","编造的怪"],"dc":19,"dmg":"2d6","loot":"旧匕首","why":"这一带狼群被赶下来了"}';
      if (/只回一行 JSON：\{"act"/.test(sys) || sys.includes('act：') || sys.includes('"act"')) {
        content = '{"act":"useitem","arg":"治疗微伤药水","text":"你咬开塞子灌下去，喉咙一阵发热。","check":{"attr":"con","dc":20,"why":"看你能不能顶住"}}';
      }
      if (/一份条目/.test(sys)) content = '{"name":"骨片","desc":"磨得发亮的骨片，边上刻着三道浅痕。","tags":["旧物","来路不明"]}';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content } }], usage: { total_tokens: 42 } }));
      return;
    }
    /* 默认：流式文本 */
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const parts = ['你蹲下摸了摸地面。', '土是松的，有人在这里站过。', '风把草压向一边，远处有铃声。'];
    for (const p of parts) {
      res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: p } }] }) + '\n\n');
      await sleep(30);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  });
});

/* ---------------- 起真服务器 ---------------- */
let srv = null;
function startServer(env) {
  return new Promise((resolve, reject) => {
    srv = spawn('D:\\node.exe', [path.join(ROOT, 'server', 'server.js')], {
      env: Object.assign({}, process.env, { PORT: String(SRV_PORT), DEEPSEEK_BASE_URL: 'http://127.0.0.1:' + MOCK_PORT, DAILY_CALL_CAP: '50' }, env),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let out = '';
    srv.stdout.on('data', d => { out += d.toString(); });
    srv.stderr.on('data', d => { out += d.toString(); });
    const t0 = Date.now();
    (function wait() {
      fetch('http://127.0.0.1:' + SRV_PORT + '/api/health').then(async r => { await r.json(); resolve(out); })
        .catch(() => { if (Date.now() - t0 > 8000) reject(new Error('服务器没起来：' + out)); else setTimeout(wait, 200); });
    })();
  });
}
function stopServer() { return new Promise(r => { if (!srv) return r(); srv.once('exit', () => r()); srv.kill(); setTimeout(r, 800); }); }

async function sseText(res) {
  const txt = await res.text();
  let out = '';
  txt.split('\n\n').forEach(chunk => {
    const line = chunk.replace(/^data:\s?/, '').trim();
    if (!line) return;
    try { const o = JSON.parse(line); if (o.t) out += o.t; } catch (e) { /* 忽略 */ }
  });
  return out;
}
function post(p, body) {
  return fetch('http://127.0.0.1:' + SRV_PORT + p, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {})
  });
}
const SNAP = {
  name: '林晚', gender: '女', race: '人类', cls: '游侠', level: 3, hp: '18/24', ac: 15,
  place: '霜脊村', terrain: '冰原', threat: [2, 3], nation: '北境王国', gold: '31 GP',
  talents: ['眼力(D)'], quests: ['失踪的商队（护卫）'], nearby: ['霜落城(南)'], bag: ['治疗微伤药水', '长弓'],
  time: '星母历824年10月12日 辰时', weather: '风雪', logTail: ['你从北边下来。']
};

(async () => {
  await new Promise(r => mock.listen(MOCK_PORT, '127.0.0.1', r));
  const banner = await startServer({ DEEPSEEK_API_KEY: KEY });

  /* 1. 静态托管 */
  const page = await fetch('http://127.0.0.1:' + SRV_PORT + '/');
  const html = await page.text();
  eq(page.status, 200, '根路径返回网页');
  ok(html.indexOf('window.AI') > 0, '网页里带着联网层');
  ok(html.indexOf(KEY) < 0 && !/sk-test/.test(html), '网页里不含任何 Key');

  /* 2. 健康检查 */
  const h = await (await fetch('http://127.0.0.1:' + SRV_PORT + '/api/health')).json();
  ok(h.ok === true && h.ai === true, '健康检查：服务在跑且已配 Key', JSON.stringify(h));
  eq(h.model, 'deepseek-chat', '默认模型 deepseek-chat');
  ok(JSON.stringify(h).indexOf(KEY) < 0, '健康检查不回显 Key');

  /* 3. 叙述（流式） */
  mode = 'text';
  const t1 = await sseText(await post('/api/narrate', { mode: 'scene', kind: 'wild', ctx: { roll: 14, dc: 13, ok: true }, state: SNAP }));
  ok(t1.length > 10 && /土是松的/.test(t1), '流式叙述拿到完整文字', t1.slice(0, 40));
  ok(/d20=14/.test(lastReq.body.messages[1].content), '请求里带上了引擎的判定结果');
  ok(lastReq.auth === 'Bearer ' + KEY, 'Key 只出现在服务端到上游的请求头里');
  /* 同样场景第二次：走缓存，不再调用上游 */
  const before = reqCount;
  const t2 = await sseText(await post('/api/narrate', { mode: 'scene', kind: 'wild', ctx: { roll: 14, dc: 13, ok: true }, state: SNAP }));
  eq(t2, t1, '同一场景第二次返回同样的文字');
  eq(reqCount, before, '同一场景第二次没有再花一次调用（走缓存）');

  /* 4. 对话模式：系统提示换成对话要求 */
  const t3 = await sseText(await post('/api/narrate', { mode: 'talk', kind: 'greet', npc: { name: '格尔', role: '猎人' }, state: SNAP }));
  ok(t3.length > 5, '对话模式也有文字');
  ok(/说话/.test(lastReq.body.messages[0].content) || /对话要求/.test(lastReq.body.messages[0].content), '对话模式用了对话版提示词');
  ok(/格尔/.test(lastReq.body.messages[1].content), '对话请求里写明了说话的人');

  /* 5. 禁用词闸门 */
  mode = 'banned';
  const t4 = await sseText(await post('/api/narrate', { mode: 'scene', kind: 'city', ctx: {}, state: SNAP }));
  ok(!/微不可查|不由得/.test(t4), '禁用词被拦下（流式也不漏）', t4);
  ok(t4.length > 4, '拦下之后仍然给出可读文字', t4);

  /* 6. 事件接口：结构化、白名单、区间钳制 */
  mode = 'json';
  const ev = await (await post('/api/event', { kind: 'wild', state: SNAP, allowed: ['灰林狼', '冰原狼'] })).json();
  ok(ev.ok === true && ev.event, '事件接口返回结构化事件');
  eq(ev.event.kind, '遭遇', '事件类型被保留');
  ok(ev.event.foes.indexOf('灰林狼') >= 0, '白名单里的敌人保留');
  ok(ev.event.foes.indexOf('编造的怪') < 0, '自造怪物名被剔掉');
  eq(ev.event.dc, 16, 'DC 被钳到上限 16');
  eq(ev.event.dmg, '2d6', '伤害骰格式合法时保留');
  eq(ev.event.loot, '旧匕首', '掉落名保留');

  /* 7. 自定义内容：act/check 都要过校验 */
  const cu = await (await post('/api/custom', { text: '我灌下药水', local: null, state: SNAP })).json();
  ok(cu.ok === true && cu.act === 'useitem', '自定义内容：意图被读出来', JSON.stringify(cu));
  eq(cu.check.dc, 16, '自定义内容的 DC 也被钳到 16');
  eq(cu.check.attr, 'con', '检定属性保留');
  ok(/灌下去/.test(cu.text), '自定义内容给出叙述文字');

  /* 8. 自创条目 */
  const im = await (await post('/api/improv', { kind: '物品', name: '骨片', state: SNAP })).json();
  ok(im.ok === true && /骨片/.test(im.desc), '自创条目：给名字与介绍', JSON.stringify(im));
  ok(!/\d+\s*GP|伤害|AC/.test(im.desc), '自创条目不给数值（数值仍由本地生成器定）');

  /* 8a. 强制写作约束：每个模式都要带上，两端不许漂移 */
  const P = require('' + (process.env.JYMF_ROOT || require('path').resolve(__dirname, '..')) + '/server/prompt.js');
  ['scene', 'talk', 'event', 'fire', 'options', 'custom', 'improv'].forEach(m => {
    const sys = P.systemPrompt(m);
    ok(/写作前强制自检/.test(sys) && /拒绝工具人行为/.test(sys) && /反应优先级/.test(sys), m + ' 模式带上强制约束');
  });
  ok(P.CRAFT && /三段排比/.test(P.CRAFT) && /反面示例/.test(P.CRAFT), '约束里含排比禁令与反面示例');
  const htmlBuilt = require('fs').readFileSync('' + (process.env.JYMF_ROOT || require('path').resolve(__dirname, '..')) + '/剑与魔法命运编年史.html', 'utf8');
  const clientCraft = (htmlBuilt.match(/PROMPT-GATE-BEGIN([\s\S]*?)PROMPT-GATE-END/) || [])[1] || '';
  ['写作前强制自检', '拒绝工具人行为', '禁止上帝视角灌输内心', '反应优先级', '三段排比', '写完一小段就自检', '反面示例'].forEach(k => {
    ok(clientCraft.indexOf(k) > 0, '客户端的约束与服务端同款：' + k);
  });

  /* 8b. 选项与事件触发（桥这条路） */
  const op = await (await post('/api/options', { mode: 'options', kind: 'city', state: SNAP, relations: ['forward', 'bold', 'careful', 'rest'] })).json();
  ok(op.ok === true && op.options.length === 4, '选项接口返回四格', JSON.stringify(op).slice(0, 80));
  ok(op.options[0].act === 'forward' && op.options[1].act === 'bold', '合规的 act 保留', JSON.stringify(op.options.map(o => o.act)));
  ok(!op.options[3].act, '与槽位不相称的 act 被丢空（网页会退回引擎那一格）', JSON.stringify(op.options[3]));
  ok(/脚印/.test(op.options[0].label) && op.note.length > 0, '文字与气氛提示都在', op.note);
  const fr = await (await post('/api/fire', { mode: 'fire', kind: '赶路', state: SNAP, allowed: ['灰林狼', '冰原狼'], severity: '中等' })).json();
  ok(fr.ok === true && fr.event, '事件触发接口返回结构化事件');
  ok(fr.event.foes.indexOf('灰林狼') >= 0 && fr.event.foes.indexOf('自造的怪') < 0, '敌人按白名单过滤', JSON.stringify(fr.event.foes));
  eq(fr.event.dc, 16, 'DC 被钳到上限');
  eq(fr.event.dmg, '2d6', '伤害骰格式合法时保留');

  /* 9. 上游给废格式：重试一次仍不合规 → 502，让网页回退离线 */
  mode = 'broken';
  const bad = await post('/api/custom', { text: '我随便试试', local: null, state: SNAP });
  eq(bad.status, 502, '两次都不合规就回 502（网页据此回退离线模板）');
  const badJson = await bad.json();
  ok(badJson.ok === false && /合规/.test(badJson.error || ''), '502 里说明了原因', JSON.stringify(badJson));

  /* 10. 统计接口 */
  const st = await (await fetch('http://127.0.0.1:' + SRV_PORT + '/api/stats')).json();
  ok(st.usage.calls > 0, '统计里有调用次数', String(st.usage.calls));
  ok(JSON.stringify(st).indexOf(KEY) < 0, '统计不回显 Key');

  /* 11. 不存在的接口 */
  eq((await post('/api/nope', {})).status, 404, '未知接口回 404');

  await stopServer();

  /* 12. 没配 Key：所有接口 503，网页据此全程走离线 */
  await startServer({ DEEPSEEK_API_KEY: '' });
  const h2 = await (await fetch('http://127.0.0.1:' + SRV_PORT + '/api/health')).json();
  ok(h2.ok === true && h2.ai === false, '没配 Key 时健康检查仍可用，但 ai=false', JSON.stringify(h2));
  ok(/Key/.test(h2.reason || ''), '并说明原因（提示去配 Key）');
  const r2 = await post('/api/narrate', { mode: 'scene', kind: 'wild', state: SNAP });
  eq(r2.status, 503, '没配 Key 时叙述接口回 503');
  const j2 = await r2.json();
  eq(j2.error, 'no-key', '503 带 no-key 标记');
  const page2 = await fetch('http://127.0.0.1:' + SRV_PORT + '/');
  eq(page2.status, 200, '没配 Key 也能照常打开网页（离线玩法不受影响）');
  await stopServer();

  mock.close();
  console.log('--- 联网版服务器 ---');
  console.log('PASS ' + pass + '  FAIL ' + fail);
  fails.slice(0, 12).forEach(f => console.log('  [X] ' + f));
  process.exit(fail === 0 ? 0 : 1);
})().catch(async e => {
  console.log('FATAL ' + e.message);
  try { await stopServer(); } catch (e2) {}
  try { mock.close(); } catch (e3) {}
  process.exit(1);
});

/* 上游被调用了几次（验证缓存） */
let reqCount = 0;
mock.on('request', () => { reqCount++; });
