/* ============================================================
   剑与魔法命运编年史 · 联网版服务器（零依赖，只用 Node 自带模块）
   ------------------------------------------------------------------
   它做三件事：
     1. 把单文件成品托管成一个网址：http://127.0.0.1:8787/
     2. 提供 /api/* 四类接口：叙述(narrate) / 对话(narrate+t talk) / 事件(event) /
        自定义内容(custom) / 自创条目(improv)
     3. 在服务端拿 DeepSeek 写文字：API Key 只留在服务端，浏览器一个字都看不到
   设计底线：
     · 引擎权威——骰子、数值、判定、物品、战斗全部在浏览器里算，这里只写字
     · 断网即回退——没配 Key 或上游不通，接口回 503，网页自动回到离线模板
     · 上游文字一律过禁用词闸门（交付要求的 AI 模板腔清单）
   启动：node server/server.js   （或双击 启动联网版.bat）
   ============================================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const P = require('./prompt');

const ROOT = path.resolve(__dirname, '..');
const GAME_FILE = path.join(ROOT, '剑与魔法命运编年史.html');
const CONFIG_FILE = path.join(__dirname, 'config.json');

/* ---------------- 配置 ---------------- */
function loadConfig() {
  let file = {};
  try { file = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch (e) { file = {}; }
  const env = process.env;
  const cfg = {
    port: Number(env.PORT || file.port || 8787),
    host: env.HOST || file.host || '127.0.0.1',
    apiKey: env.DEEPSEEK_API_KEY || file.apiKey || '',
    baseUrl: (env.DEEPSEEK_BASE_URL || file.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, ''),
    model: env.DEEPSEEK_MODEL || file.model || 'deepseek-chat',
    temperature: Number(env.DEEPSEEK_TEMP || file.temperature || 1.15),
    maxTokens: Number(env.DEEPSEEK_MAX_TOKENS || file.maxTokens || 260),
    timeoutMs: Number(env.DEEPSEEK_TIMEOUT_MS || file.timeoutMs || 45000),
    dailyCallCap: Number(env.DAILY_CALL_CAP || file.dailyCallCap || 3000),
    allowLan: !!(env.ALLOW_LAN === '1' || file.allowLan)
  };
  if (cfg.allowLan && cfg.host === '127.0.0.1') cfg.host = '0.0.0.0';
  return cfg;
}
const CFG = loadConfig();

/* ---------------- 计数与缓存 ---------------- */
const usage = { day: new Date().toISOString().slice(0, 10), calls: 0, tokens: 0, fails: 0, banned: 0 };
function rollDay() {
  const d = new Date().toISOString().slice(0, 10);
  if (d !== usage.day) { usage.day = d; usage.calls = 0; usage.tokens = 0; usage.fails = 0; usage.banned = 0; }
}
const cache = new Map();          /* 同样的场景不重复花钱 */
const CACHE_MAX = 240;
function cacheKey(obj) { return crypto.createHash('sha1').update(JSON.stringify(obj)).digest('hex'); }
function cacheGet(k) {
  const hit = cache.get(k);
  if (!hit) return null;
  if (Date.now() - hit.at > 1000 * 60 * 30) { cache.delete(k); return null; }
  return hit.text;
}
function cachePut(k, text) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(k, { at: Date.now(), text });
}

/* ---------------- DeepSeek 调用 ---------------- */
function upstream(messages, opts) {
  opts = opts || {};
  const url = CFG.baseUrl + '/chat/completions';
  const body = {
    model: opts.model || CFG.model,
    messages: messages,
    temperature: opts.temperature != null ? opts.temperature : CFG.temperature,
    max_tokens: opts.maxTokens || CFG.maxTokens,
    stream: !!opts.stream
  };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), CFG.timeoutMs);
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + CFG.apiKey },
    body: JSON.stringify(body),
    signal: ctl.signal
  }).finally(() => clearTimeout(timer));
}

/* 上游是 fetch 出来的 Web ReadableStream：用异步迭代读，别当 Node 流用（没有 .on） */
async function readStream(res, onDelta) {
  let buf = '', full = '';
  for await (const chunk of res.body) {
    buf += Buffer.from(chunk).toString('utf8');
    const parts = buf.split('\n');
    buf = parts.pop();
    for (const line of parts) {
      const s = line.trim();
      if (!s.startsWith('data:')) continue;
      const payload = s.slice(5).trim();
      if (payload === '[DONE]') continue;
      let obj = null;
      try { obj = JSON.parse(payload); } catch (e) { continue; }
      const d = obj.choices && obj.choices[0] && (obj.choices[0].delta || obj.choices[0].message);
      const piece = d && d.content ? d.content : '';
      if (piece) { full += piece; if (onDelta) onDelta(full); }
    }
  }
  return full;
}

async function complete(messages, opts) {
  rollDay();
  if (usage.calls >= CFG.dailyCallCap) throw Object.assign(new Error('今天的调用上限到了（' + CFG.dailyCallCap + ' 次）'), { code: 'CAP' });
  usage.calls++;
  let res = await upstream(messages, opts);
  if (res.status === 429 || res.status >= 500) {
    await new Promise(r => setTimeout(r, 700));
    res = await upstream(messages, opts);
  }
  if (!res.ok) {
    usage.fails++;
    const t = await res.text().catch(() => '');
    throw Object.assign(new Error('上游 ' + res.status + '：' + String(t).slice(0, 160)), { code: 'UPSTREAM', status: res.status });
  }
  if (opts && opts.stream) return res;              /* 交给调用方边收边发 */
  const txt = await res.text();
  let j = null;
  try { j = JSON.parse(txt); }
  catch (e) { throw Object.assign(new Error('上游回的不是 JSON：' + txt.slice(0, 120)), { code: 'UPSTREAM' }); }
  if (j.usage) usage.tokens += (j.usage.total_tokens || 0);
  const c = j.choices && j.choices[0];
  const content = (c && ((c.message && c.message.content) || c.text)) || '';
  if (!content) throw Object.assign(new Error('上游没给内容'), { code: 'UPSTREAM' });
  return content;
}

/* ---------------- 输出闸门：禁用词 + JSON 契约 ---------------- */
function gate(text) {
  const hits = P.scanBanned(text);
  if (!hits.length) return { text, hits };
  usage.banned++;
  return { text: P.scrub(text), hits };
}
/* 流式也要过闸门：只在句号处放行，放行前把这一句查一遍 */
function makeGate() {
  let sent = 0, raw = '';
  return function (full, flush) {
    raw = full;
    let cut = full.length;
    if (!flush) {
      let last = -1;
      for (const mark of ['。', '！', '？', '；', '\n']) last = Math.max(last, full.lastIndexOf(mark));
      if (last < 0) return '';
      cut = last + 1;
    }
    const piece = full.slice(sent, cut);
    if (!piece) return '';
    sent = cut;
    return gate(piece).text;
  };
}
function extractJson(text) {
  const s = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
}

/* ---------------- 四类内容 ---------------- */
const MONSTER_WHITELIST = new Set();   /* 由客户端每次带上，见 normalizeEvent */

async function narrate(body) {
  const mode = body.mode === 'talk' ? 'talk' : 'scene';
  const messages = [
    { role: 'system', content: P.systemPrompt(mode) },
    { role: 'user', content: P.userPrompt(mode, body) }
  ];
  return messages;
}
function normalizeEvent(ev, body, allowed) {
  if (!ev || typeof ev !== 'object') return null;
  const text = typeof ev.text === 'string' ? ev.text.slice(0, 240) : '';
  if (text.length < 4) return null;
  const foes = Array.isArray(ev.foes)
    ? ev.foes.filter(f => typeof f === 'string' && (!allowed.length || allowed.includes(f))).slice(0, 4)
    : [];
  const dc = Number.isFinite(ev.dc) ? Math.max(8, Math.min(16, Math.round(ev.dc))) : null;
  const dmg = typeof ev.dmg === 'string' && /^\d+d\d+(\+\d+)?$/.test(ev.dmg.trim()) ? ev.dmg.trim() : null;
  const kinds = ['遭遇', '天灾', '迷路', '破财', '伤病', '发现', '人'];
  const kind = kinds.includes(ev.kind) ? ev.kind : '发现';
  return {
    kind, text: gate(text).text, foes, dc, dmg,
    loot: typeof ev.loot === 'string' ? ev.loot.slice(0, 30) : null,
    why: typeof ev.why === 'string' ? ev.why.slice(0, 80) : ''
  };
}

/* ---------------- HTTP ---------------- */
function sendJson(res, code, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(s);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let n = 0, chunks = [];
    req.on('data', c => {
      n += c.length;
      if (n > (limit || 200000)) { reject(new Error('请求体太大')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch (e) { reject(new Error('请求体不是 JSON')); }
    });
    req.on('error', reject);
  });
}
function serveGame(res) {
  fs.readFile(GAME_FILE, (err, buf) => {
    if (err) { sendJson(res, 500, { ok: false, error: '找不到成品文件：' + GAME_FILE + '（先在项目根目录跑 python build.py）' }); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}
function sse(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  return {
    delta(t) { res.write('data: ' + JSON.stringify({ t }) + '\n\n'); },
    done(obj) { res.write('data: ' + JSON.stringify(Object.assign({ done: true }, obj || {})) + '\n\n'); res.end(); },
    fail(msg) { res.write('data: ' + JSON.stringify({ e: msg }) + '\n\n'); res.end(); }
  };
}
function aiReady() { return !!CFG.apiKey; }

async function handleNarrate(req, res, body) {
  const key = cacheKey({ m: 'n', mode: body.mode, kind: body.kind, ctx: body.ctx, place: body.state && body.state.place, t: body.state && body.state.time, hp: body.state && body.state.hp });
  const hit = cacheGet(key);
  if (hit) {
    const out = sse(res);
    out.delta(hit);
    out.done({ cached: true });
    return;
  }
  const messages = await narrate(body);
  const up = await complete(messages, { stream: true });
  const out = sse(res);
  const ctype = (up.headers.get('content-type') || '');
  /* 上游有时不理 stream:true，直接回一整个 JSON：那就自己拆包，别让客户端收到空话 */
  if (ctype.indexOf('text/event-stream') < 0) {
    const txt = await up.text();
    let one = '';
    try { const j = JSON.parse(txt); const c = j.choices && j.choices[0]; one = (c && ((c.message && c.message.content) || c.text)) || ''; }
    catch (e) { one = ''; }
    if (!one) { out.fail('上游没按流式回话，也没给出可用内容'); return; }
    const clean = gate(P.scrub(one)).text;
    cachePut(key, clean);
    out.delta(clean);
    out.done({ whole: true });
    return;
  }
  const push = makeGate();
  let full = '';
  await readStream(up, (soFar) => {
    full = soFar;
    const piece = push(soFar, false);
    if (piece) out.delta(piece);
  });
  const tail = push(full, true);
  if (tail) out.delta(tail);
  const clean = gate(P.scrub(full)).text;
  cachePut(key, clean);
  out.done({ banned: clean !== full });
}

async function handleEvent(req, res, body) {
  const allowed = Array.isArray(body.allowed) ? body.allowed.slice(0, 60) : [];
  const messages = [
    { role: 'system', content: P.systemPrompt('event') },
    { role: 'user', content: P.userPrompt('event', body) + '\n【可用的怪物名】' + (allowed.join('、') || '（这一带没有成群的怪物，foes 给空数组）') }
  ];
  let raw = await complete(messages, { maxTokens: 320, temperature: 1.25 });
  let ev = normalizeEvent(extractJson(raw), body, allowed);
  if (!ev) {
    raw = await complete(messages.concat([
      { role: 'assistant', content: String(raw).slice(0, 400) },
      { role: 'user', content: '格式不对。只回一行 JSON，字段：kind/text/foes/dc/dmg/loot/why。' }
    ]), { maxTokens: 320, temperature: 1.0 });
    ev = normalizeEvent(extractJson(raw), body, allowed);
  }
  if (!ev) return sendJson(res, 502, { ok: false, error: '模型两次都没给出合规的事件，本次仍走离线模板' });
  sendJson(res, 200, { ok: true, event: ev });
}

async function handleCustom(req, res, body) {
  const messages = [
    { role: 'system', content: P.systemPrompt('custom') },
    { role: 'user', content: P.userPrompt('custom', body) }
  ];
  let raw = await complete(messages, { maxTokens: 300, temperature: 1.1 });
  let obj = extractJson(raw);
  if (!obj || typeof obj.text !== 'string') {
    raw = await complete(messages.concat([
      { role: 'assistant', content: String(raw).slice(0, 300) },
      { role: 'user', content: '只回一行 JSON：{"act":"...","arg":...,"text":"...","check":...}' }
    ]), { maxTokens: 300 });
    obj = extractJson(raw);
  }
  if (!obj || typeof obj.text !== 'string') return sendJson(res, 502, { ok: false, error: '模型没给出合规的解读' });
  const acts = ['useitem', 'pray', 'talkto', 'attackmon', 'travel', 'travelfar', 'longtrip', 'quest', 'look', 'generic'];
  const act = acts.includes(obj.act) ? obj.act : 'generic';
  let check = null;
  if (obj.check && typeof obj.check === 'object') {
    const attrs = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    if (attrs.includes(obj.check.attr)) {
      check = { attr: obj.check.attr, dc: Math.max(8, Math.min(16, Math.round(Number(obj.check.dc) || 12))), why: String(obj.check.why || '').slice(0, 60) };
    }
  }
  sendJson(res, 200, { ok: true, act, arg: obj.arg == null ? null : String(obj.arg).slice(0, 40),
    text: gate(String(obj.text)).text, check });
}

async function handleImprov(req, res, body) {
  const messages = [
    { role: 'system', content: P.systemPrompt('improv') },
    { role: 'user', content: P.userPrompt('improv', body) }
  ];
  const raw = await complete(messages, { maxTokens: 220, temperature: 1.2 });
  const obj = extractJson(raw);
  if (!obj || !obj.desc) return sendJson(res, 502, { ok: false, error: '模型没给出条目' });
  sendJson(res, 200, { ok: true, name: String(obj.name || body.name).slice(0, 24),
    desc: gate(String(obj.desc)).text,
    tags: Array.isArray(obj.tags) ? obj.tags.slice(0, 4).map(t => String(t).slice(0, 10)) : [] });
}

/* 选项：模型写四个槽位的内容，回调前把 role/act 归一化、label 过闸；
   认不出的 act 直接丢空（由网页把那一格退回引擎自带的选项），这样 AI 不可能给出点不动的按钮。 */
const ROLE_ACTS = {
  safe: ['forward', 'inquire', 'quest', 'guild', 'work', 'shop'],
  bold: ['bold', 'attack', 'cast', 'travelfar', 'longtrip'],
  careful: ['careful', 'look', 'shop', 'train'],
  rest: ['rest', 'eat', 'heal', 'pray', 'defend']
};
function normalizeOptions(raw) {
  if (!raw || !Array.isArray(raw.options)) return null;
  const out = [];
  for (const role of ['safe', 'bold', 'careful', 'rest']) {
    const hit = raw.options.find(o => o && o.role === role) || raw.options[out.length];
    if (!hit) continue;
    const allowed = ROLE_ACTS[role];
    const act = allowed.includes(hit.act) ? hit.act : null;
    let label = String(hit.label || '').replace(/\s+/g, '').trim();
    if (label.length < 6 || label.length > 40) label = '';
    out.push({ role, act, label: label ? gate(label).text : '' });
  }
  if (!out.length) return null;
  return { options: out, note: raw.note ? gate(String(raw.note)).text.slice(0, 40) : '' };
}
async function handleOptions(req, res, body) {
  const messages = [
    { role: 'system', content: P.systemPrompt('options') },
    { role: 'user', content: P.userPrompt('options', body) }
  ];
  let raw = await complete(messages, { maxTokens: 420, temperature: 1.25 });
  let opts = normalizeOptions(extractJson(raw));
  if (!opts) {
    raw = await complete(messages.concat([
      { role: 'assistant', content: String(raw).slice(0, 500) },
      { role: 'user', content: '格式不对。只回一行 JSON：{"options":[{role,label,act} × 4],"note":"…"}' }
    ]), { maxTokens: 420, temperature: 1.0 });
    opts = normalizeOptions(extractJson(raw));
  }
  if (!opts) return sendJson(res, 502, { ok: false, error: '模型没给出合规的选项，本次用引擎自带的' });
  sendJson(res, 200, { ok: true, options: opts.options, note: opts.note });
}

/* 事件触发：引擎说「这一趟要出事」，这里只要内容（文本 + 敌人 + 量级） */
async function handleFire(req, res, body) {
  const allowed = Array.isArray(body.allowed) ? body.allowed.slice(0, 60) : [];
  const messages = [
    { role: 'system', content: P.systemPrompt('fire') },
    { role: 'user', content: P.userPrompt('fire', body) }
  ];
  let raw = await complete(messages, { maxTokens: 360, temperature: 1.3 });
  let ev = normalizeEvent(extractJson(raw), body, allowed);
  if (!ev) {
    raw = await complete(messages.concat([
      { role: 'assistant', content: String(raw).slice(0, 400) },
      { role: 'user', content: '只回一行 JSON：kind/text/foes/dc/dmg/loot/why，敌人必须来自给定名单。' }
    ]), { maxTokens: 360, temperature: 1.0 });
    ev = normalizeEvent(extractJson(raw), body, allowed);
  }
  if (!ev) return sendJson(res, 502, { ok: false, error: '模型没给出合规的事件，本次仍走离线表' });
  sendJson(res, 200, { ok: true, event: ev });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || '127.0.0.1'));
  const p = url.pathname;

  if (req.method === 'GET' && (p === '/' || p === '/index.html' || p === '/play')) return serveGame(res);
  if (req.method === 'GET' && p === '/api/health') {
    return sendJson(res, 200, {
      ok: true, ai: aiReady(), model: CFG.model, baseUrl: CFG.baseUrl.replace(/^(https?:\/\/[^/]+).*$/, '$1'),
      reason: aiReady() ? '' : '服务端没配 DeepSeek API Key（server/config.json 或环境变量 DEEPSEEK_API_KEY）',
      day: usage.day, calls: usage.calls, cap: CFG.dailyCallCap, cached: cache.size
    });
  }
  if (req.method === 'GET' && p === '/api/stats') return sendJson(res, 200, { ok: true, usage, cache: cache.size, model: CFG.model });
  if (req.method === 'POST' && p === '/api/reload') { return sendJson(res, 200, { ok: true, note: '改 config.json 后重启进程即可' }); }

  if (req.method === 'POST' && p.startsWith('/api/')) {
    if (!aiReady()) return sendJson(res, 503, { ok: false, error: 'no-key', reason: '服务端没配 DeepSeek API Key，网页会自动走离线模板' });
    let body;
    try { body = await readBody(req); } catch (e) { return sendJson(res, 400, { ok: false, error: e.message }); }
    try {
      if (p === '/api/narrate') return await handleNarrate(req, res, body);
      if (p === '/api/event') return await handleEvent(req, res, body);
      if (p === '/api/custom') return await handleCustom(req, res, body);
      if (p === '/api/options') return await handleOptions(req, res, body);
      if (p === '/api/fire') return await handleFire(req, res, body);
      if (p === '/api/improv') return await handleImprov(req, res, body);
      return sendJson(res, 404, { ok: false, error: '没有这个接口' });
    } catch (e) {
      usage.fails++;
      const code = e.code === 'CAP' ? 429 : (e.code === 'UPSTREAM' ? 502 : 500);
      if (!res.headersSent) return sendJson(res, code, { ok: false, error: String(e.message || e) });
      try { res.end(); } catch (e2) { /* 已经断了 */ }
      return;
    }
  }
  sendJson(res, 404, { ok: false, error: '只提供 / 与 /api/*' });
});

if (require.main === module) {
  server.listen(CFG.port, CFG.host, () => {
    const shown = CFG.host === '0.0.0.0' ? '127.0.0.1' : CFG.host;
    console.log('《剑与魔法命运编年史》联网版已启动');
    console.log('  本机链接：http://' + shown + ':' + CFG.port + '/');
    if (CFG.host === '0.0.0.0') console.log('  局域网/公网：用本机 IP 或你的域名 + 端口访问（当前监听 0.0.0.0）');
    console.log('  模型：' + CFG.model + '　接口：' + CFG.baseUrl.replace(/^(https?:\/\/[^/]+).*$/, '$1'));
    console.log('  DeepSeek Key：' + (aiReady() ? '已配置（只留在服务端）' : '未配置 —— 网页会走离线模板，接口回 503'));
    console.log('  统计：http://' + shown + ':' + CFG.port + '/api/stats');
  });
}

module.exports = { server, CFG, usage, cache };
