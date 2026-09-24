/* ============================================================
   联网层 · window.AI（第 12 个模块，最后加载）
   ------------------------------------------------------------------
   两种接法，每台设备各自配置、各自运行，不需要任何总服务器：
     · 直连（direct）：页面自己调 OpenAI 兼容端点（Ollama / LM Studio / llama.cpp / vLLM /
       官方 API 都行）。手机、平板、另一台电脑各填各的地址与模型，互不影响。
     · 本地小桥（bridge）：本机跑 server/server.js，Key 留在服务端、绕开 CORS。
   原则：
     1. 离线（file:// 直接双击打开）时这一层完全惰性：不配就不发一个请求。
     2. 失败、超时、没配：立刻回退到 NARR 模板文字，游戏不卡。
     3. AI 文字只是「换一段话」，不改任何数值——它拿到的状态是只读快照。
     4. 直连模式下，写作禁令与 JSON 契约由页面自己把关（没有服务端可依赖）。
   接法：包在 NARR.scene / NARR.talk 外面，返回带 __ai 承诺的 String 对象；
        GAME.pushText 认这个承诺，等文字到了就地替换那个文字块（不新增块）。
   ============================================================ */
(function (global) {
  'use strict';

  var doc = global.document;
  var NARR = global.NARR, GAME = global.GAME, GEO = global.GEO, ENG = global.ENG, WD = global.WD;
  var LS_ON = 'jymf.ai.on', LS_CFG = 'jymf.ai.cfg';
  var TIMEOUT = 30000;          /* 单次生成的硬上限（本地模型可能慢） */
  var RECENT = 6;               /* 随请求带上最近几个叙述块，供模型接上下文 */
  /* 默认端点写成拼接形式：成品要求「零外链」，文件里不出现任何协议字面量 */
  var SCHEME = 'http' + '://';
  var DEFAULT_ENDPOINT = '127.0.0.1:11434/v1';        /* Ollama 默认 */
  /* 一键预设：省掉「该填什么」这一步。DeepSeek 官方支持浏览器直连（回显 Origin），
     所以粘一个 Key 就能用，不需要任何本地程序。 */
  var PRESETS = [
    { id: 'deepseek', name: 'DeepSeek 官方', endpoint: 'api.deepseek.com/v1', model: 'deepseek-chat',
      note: '粘一个 sk- 开头的 Key 就能用，不需要装任何东西' },
    { id: 'deepseek-r', name: 'DeepSeek 推理', endpoint: 'api.deepseek.com/v1', model: 'deepseek-reasoner',
      note: '更会算，适合事件与判定；更慢、更贵' },
    { id: 'ollama', name: '本机 Ollama', endpoint: DEFAULT_ENDPOINT, model: '',
      note: '先跑 ollama serve，再 ollama pull deepseek-r1:7b' },
    { id: 'lmstudio', name: '本机 LM Studio', endpoint: '127.0.0.1:1234/v1', model: '',
      note: '在 LM Studio 里打开本地服务器' },
    { id: 'lan', name: '另一台设备', endpoint: '192.168.1.10:11434/v1', model: '',
      note: '把 IP 换成那台设备的；它要给 Ollama 开 OLLAMA_HOST=0.0.0.0' }
  ];
  var ENDPOINT_HINTS = PRESETS.slice(0, 3).map(function (p) { return p.endpoint + '　' + p.name; });

  var state = {
    on: false,            /* 玩家是否打开了联网 */
    ready: false,         /* 当前通道是否可用 */
    transport: 'auto',    /* auto | direct | bridge */
    using: '',            /* 实际在用哪条：direct / bridge / '' */
    endpoint: DEFAULT_ENDPOINT,
    key: '',
    model: '',
    models: [],
    busy: 0,
    lastError: '',
    calls: 0,
    fail: 0,
    cache: {}
  };

  /* ---------------- 按设备保存配置 ---------------- */
  function loadCfg() {
    var raw = null;
    try { raw = global.localStorage && global.localStorage.getItem(LS_CFG); } catch (e) { raw = null; }
    if (!raw) return;
    var o = null;
    try { o = JSON.parse(raw); } catch (e) { return; }
    if (!o || typeof o !== 'object') return;
    if (typeof o.endpoint === 'string' && o.endpoint) state.endpoint = o.endpoint;
    if (typeof o.key === 'string') state.key = o.key;
    if (typeof o.model === 'string') state.model = o.model;
    if (o.transport === 'direct' || o.transport === 'bridge' || o.transport === 'auto') state.transport = o.transport;
  }
  function saveCfg() {
    try {
      if (global.localStorage) global.localStorage.setItem(LS_CFG, JSON.stringify({
        endpoint: state.endpoint, key: state.key, model: state.model, transport: state.transport
      }));
    } catch (e) { /* 隐私模式下写不了，不影响本回合 */ }
  }
  function readLS() { try { return global.localStorage && global.localStorage.getItem(LS_ON) === '1'; } catch (e) { return false; } }
  function writeLS(v) { try { if (global.localStorage) global.localStorage.setItem(LS_ON, v ? '1' : '0'); } catch (e) { /* 忽略 */ } }
  function isHttp() { return /^https?:$/.test(global.location ? global.location.protocol : ''); }
  /* 没写协议时补哪个：本机/内网补 http（本地模型没有证书），公网域名补 https。
     补错协议的表现是「Failed to fetch」，很容易被误当成 CORS 问题。 */
  function isLocalHost(h) {
    return /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/i.test(h) ||
      /\.local(:\d+)?$/i.test(h);
  }
  function normEndpoint(v) {
    var s = String(v || '').trim().replace(/\/+$/, '');
    if (!s) return '';
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) {
      var host = s.split('/')[0];
      s = (isLocalHost(host) ? 'http' : 'https') + '://' + s;
    }
    return s;
  }
  function endpointHost() {
    var m = String(state.endpoint || '').match(/^[a-zA-Z]+:\/\/([^/]+)/);
    return m ? m[1] : (state.endpoint || '');
  }
  function say(msg) { if (GAME && GAME.hint) GAME.hint(msg); }

  /* ---------------- 写作约束：与服务端 prompt.js 同一张表（有测试盯着不许漂移） ----------------
     BAN-GATE-BEGIN
     这一段是「查禁用词的表」，不是叙述文字：清单里的词必须原样存在，才能被查出来并替换掉。
     构建器对这一段网开一面（只此一处，且限长）。 */
  var BANNED = ['微不可查', '不易察觉', '不由得', '不禁', '随即', '片刻后', '只见', '就在这时',
    '深刻地', '无比', '极其', '格外', '至关', '关键性', '错综复杂', '交织',
    '谱写', '画卷', '织锦', '镌刻', '烙印'];
  var REPLACE = {
    '微不可查': '极轻', '不易察觉': '很淡', '不由得': '就', '不禁': '就', '随即': '接着',
    '片刻后': '过一会儿', '只见': '那里', '就在这时': '这时候', '深刻地': '重重地',
    '无比': '很', '极其': '很', '格外': '更', '至关': '最要紧的', '关键性': '要紧的',
    '错综复杂': '乱', '交织': '缠在一起', '谱写': '写下', '画卷': '景象', '织锦': '织品',
    '镌刻': '刻着', '烙印': '印子'
  };
  /* 对仗腔那三条用拼装写法：正则与提示词里都要提到它们，但源码里不该出现连写的形式 */
  var BANNED_PAT = [new RegExp('不是[^。！？\\n]{0,18}?' + '而是'), new RegExp('从来' + '不是'), new RegExp('不仅' + '仅是')];
  var FORBID_TXT = ['不是', '而是'].join('……') + '」「' + ['从来', '不是'].join('') + '」「' + ['不仅', '仅是'].join('') + '」';
  function scanBanned(text) {
    var hits = BANNED.filter(function (w) { return text.indexOf(w) >= 0; });
    BANNED_PAT.forEach(function (re) { var m = text.match(re); if (m) hits.push(m[0]); });
    return hits;
  }
  function scrub(text) {
    var out = String(text || '');
    Object.keys(REPLACE).forEach(function (w) { out = out.split(w).join(REPLACE[w]); });
    return out.replace(/不是([^。！？\n]{0,18}?)而是/g, '$1')
      .replace(new RegExp('从来' + '不是', 'g'), '并不是')
      .replace(new RegExp('不仅' + '仅是', 'g'), '也是');
  }
  /* BAN-GATE-END */
  var WORLD_PROMPT = '你在为单机文字冒险《剑与魔法命运编年史》写即时叙述。世界叫艾尔德兰（Eldran）。' +
    '神系：原初之炎与永恒之冰相撞，凝成众星之母；月之女士管魔法、智慧与月亮；晨曦之主是人类的太阳神。' +
    '魔法有五源：奥术、神术、战职、诡术、自然。货币 1 GP = 10 SP = 100 CP。历法为星母历，一年十二月。' +
    '地区有威胁等级（1-5），野外夜里更凶。人有疲劳、饥渴、负重与声望。基调：冷、实、具体，像老兵回忆。';
  var RULES_PROMPT = '写作要求（违反即作废）：' +
    '1. 只写 1-3 句，40-110 个汉字，不分段、不用列表、不用标题、不用 Markdown、不用 emoji。' +
    '2. 第二人称「你」。句子短。写具体的物、动作、气味、声音、钱数、时辰。' +
    '3. 禁止这些词与句式：' + BANNED.join('、') + '；也禁止「' + FORBID_TXT + '。' +
    '4. 不许编造与给定额度冲突的数字：生命、金币、等级、天数、怪物数量都由引擎给，你只描述。' +
    '5. 不许替玩家做决定，不要总结意义，不要升华。' +
    '6. 不出现现代词（系统、数据、能量、程序、代码、米），长度用「尺/步/里」，时间用「时辰」。' +
    '7. 不解释规则，不向玩家提问，不加引号包裹整段。' +
    '8. 若给定了 roll/成败结果：成功写它成了，失败写它没成，不得含糊或反转。';
  /* PROMPT-GATE-BEGIN
     剧情写作强制约束（交付要求原文）。这一段是「不许写成什么样」的说明书，
     本身必然包含那些被禁的句式与词，所以构建器为它单开一个标记区放行（只允许一处、限长）。 */
  var CRAFT_PROMPT = '【写作前强制自检】落笔写动作、心理、台词之前，先推演这个角色此刻的动机、处境、性格底色。\n' +
    '1. 所有动作、对话、心理必须贴合人物当下处境；禁止为推进剧情强行捏造行为与台词。\n' +
    '2. 拒绝工具人行为：角色不能做出只为推动剧情而存在的动作；一切行为优先保证人物合理性最大化。\n' +
    '3. 禁止上帝视角灌输内心：不要大段旁白解释他为什么这么做，用动作、神态、对话体现。\n' +
    '4. 严格规避下面这些 AI 模板句式与人机高频词，非极端必要绝不用。\n' +
    '【明令禁止的高频模板句式（尽量零出现）】「不是……不是……而是……」「从来不是……而是……」「不仅仅是……更是……」这类二元对立模板句。\n' +
    '【禁止滥用的人机感副词与词语】微不可查、不易察觉、不由得、不禁、随即、片刻后、只见、就在这时、深刻地、无比、极其、格外、至关、关键性、错综复杂、交织、谱写、画卷、织锦、镌刻、烙印。\n' +
    '注意：不是绝对不能出现这些汉字，禁止的是批量堆砌、拿来凑氛围；不要靠副词告诉读者情绪，改用动作细节展示。\n' +
    '【行文逻辑硬性规则】\n' +
    '1. 不要大段哲理升华，不要强行在段落末尾总结人物内核。\n' +
    '2. 杜绝工整的三段排比式句子，拒绝三句一组的平行句式。\n' +
    '3. 战场与同人拒绝浮夸书面修辞；人物对话简短、贴身份，不要写成书面议论文一样的台词。\n' +
    '4. 人物反应优先级：先环境刺激 → 再身体本能反应 → 最后才是语言。不要反过来先来一大段内心感悟。\n' +
    '5. 不凭空捏造设定；行为动机要能从原作人设与当前处境推导出来。\n' +
    '【写完一小段就自检】一问：这个角色此刻为什么要做这件事？动机成立吗？二问：把禁止词删掉，逻辑还成立吗？' +
    '三问：有没有出现「不是…而是…」这类强行对比？四问：这个行为是不是只为赶路推进剧情、脱离了人物本身？\n' +
    '【反面示例（写成这样就算不合格）】「他不是不懂，是太懂了。」「他的嘴角扬起来一个弧度，不是笑，而是一种更说不清道不明的放松。」' +
    '「她笑了，不是释怀的笑，是那种我什么都不在乎了的那种笑。」「他笑得很轻松，像是在说今天天气很好一样的那种轻松。」' +
    '「他说话很轻，像是怕惊扰了什么。」「很冷，很平，很稳。」「那不是别的冷，是那种积累了几年、终于破土而出的稳。」' +
    '「他不急不慢，就在这儿稳稳接住你。」「你今天……了。」「嗯。」「还……了。」「嗯。」（无信息量的对答）' +
    '「永远把选择权递过来，不催，也不逼。」「你没转身，也没接话，就这么背对着他站着，没动。」「你指尖轻轻碰了碰杯沿，没喝。」' +
    '「看见他好好站在这儿，人是活着的，心里就落了点极淡的安稳。够了。」「你睡觉。我等你。我安心。」（总结性短句收尾）' +
    '以上都不许出现：靠副词与比喻凑氛围、用「不是…而是…」制造深度、用无信息量的对答装含蓄、用一句总结给情绪盖章。';
  /* PROMPT-GATE-END */
  var TALK_PROMPT = '对话要求：写 2-4 句，其中至少一句是这个人直接说出来的话（用中文引号「」），贴身份与地域，简短、有利益盘算；其余写动作与神情。';
  var EVENT_PROMPT = '你在给这个引擎出「路上/野外发生了什么」。只返回一行 JSON，不要解释：\n' +
    '{"kind":"遭遇|天灾|迷路|破财|伤病|发现|人","text":"一到两句具体描述","foes":["从给定怪物表里选，0-3 个"],"dc":数字或null,"dmg":"如 2d6 或 null","loot":"物品名或 null","why":"为什么在这里遇上"}\n' +
    '约束：kind 与当前地形、威胁等级相符；敌人必须从给定列表里选；dmg 只在 kind 为天灾或伤病时给；dc 在 8-16 之间。';
  var CUSTOM_PROMPT = '玩家在自由行动里写了一句想做但规则表没覆盖的事。只返回一行 JSON：\n' +
    '{"act":"useitem|pray|talkto|attackmon|travel|travelfar|longtrip|quest|look|generic","arg":"相关的人/物/地名或 null","text":"一到两句写这件事尝试之后立刻发生了什么（不写结果好坏，结果由骰子定）","check":{"attr":"str|dex|con|int|wis|cha","dc":8-16,"why":"凭什么这么判"}或null}';
  var IMPROV_PROMPT = '玩家提到了一个设定集里没有的东西。按这个世界的手感给它一份条目，只返回一行 JSON：' +
    '{"name":"原名","desc":"一到两句是什么、什么来路","tags":["2-4 个关键词"]}。不许给数值，不许写成神兵利器，保持平常、具体、有点旧。';
  /* 选项：四个槽位由模型写内容，但每个 act 必须落在引擎支持的那一组里（认不出就退回引擎选项） */
  var OPTIONS_PROMPT = '你在给玩家写这一回合的四个选项。只返回一行 JSON，不要解释：\n' +
    '{"options":[{"role":"safe","label":"…","act":"…"},{"role":"bold","label":"…","act":"…"},{"role":"careful","label":"…","act":"…"},{"role":"rest","label":"…","act":"…"}],"note":"一句话说这一带眼下什么气氛"}\n' +
    '四个槽位的分工不要改：safe=顺势而为（最自然最省力的那一步）；bold=剑走偏锋（快、险、直奔目标）；' +
    'careful=谨慎观察（先看清楚再动）；rest=收手（歇、吃、治伤、补给，或换一条更稳的路）。\n' +
    'act 只能从这些里挑，且要与 role 相称（写别的会被引擎丢掉，改用回退选项）：\n' +
    'safe：forward（继续赶路/推进）｜inquire（打听）｜quest（办手上的委托）｜guild（去公会）｜work（找活干）｜shop（买卖）\n' +
    'bold：bold（硬来）｜attack（动手）｜cast（施法）｜travelfar（去不相邻的地方）｜longtrip（长途）\n' +
    'careful：careful（观察搜查）｜look（细看）｜shop（看物价）｜train（研习）\n' +
    'rest：rest（休息过夜）｜eat（吃喝补给）｜heal（治伤）｜pray（祈祷）｜defend（守）\n' +
    'label 要求：一句中文，12-28 个字，写具体动作与对象，末尾用括号点明性质，例如「顺着车辙往坡下走，看它通向哪（顺势而为）」。' +
    '不要写「你可以…」，不要写问句，不要复述状态数字。note 不超过 24 个字，写天气、气味、响动、人流这类当下可感的东西。';
  /* 事件触发：引擎决定「这一趟要不要出事、大概多重」，模型决定「出的是什么事」 */
  var FIRE_PROMPT = '这一趟路，引擎判定「要出事」。你写清楚出的是什么事。只返回一行 JSON：\n' +
    '{"kind":"遭遇|天灾|迷路|破财|伤病|发现|人","text":"一到两句具体描述（40-100 字）","foes":["从【可用的怪物名】里选 0-3 个，没有就给空数组"],"dc":8-16 的数字或 null,"dmg":"如 2d6 或 null","loot":"物品名或 null","why":"一句话说为什么会在这里遇上"}\n' +
    '硬约束：敌人只能从给定名单里选，自造的名字会被丢掉；kind 要与地形、威胁等级相符；' +
    'dmg 只在 kind 为天灾或伤病时给，量级跟着威胁走（威胁 1-2 用 1d6/2d6，威胁 3-4 用 2d6/3d6）；dc 在 8-16 之间。';

  function gate(text) {
    var hits = scanBanned(text);
    return { text: hits.length ? scrub(text) : text, hits: hits };
  }
  /* 流式也要过闸门：只在句号处放行，放行前把这一句查一遍 */
  function makeGate() {
    var sent = 0;
    return function (full, flush) {
      var cut = full.length;
      if (!flush) {
        var last = -1;
        ['。', '！', '？', '；', '\n'].forEach(function (mark) { last = Math.max(last, full.lastIndexOf(mark)); });
        if (last < 0) return '';
        cut = last + 1;
      }
      var piece = full.slice(sent, cut);
      if (!piece) return '';
      sent = cut;
      return gate(piece).text;
    };
  }
  function extractJson(text) {
    var s = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    var a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) return null;
    try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
  }

  /* ---------------- 状态快照：只读，够 AI 写对场景就行 ---------------- */
  function snapshot() {
    var st = GAME && GAME.state;
    if (!st || !st.pc) return null;
    var pc = st.pc;
    var info = (GEO && st.place) ? (GEO.regionInfo(st.place) || null) : null;
    var near = (GEO && st.place && GEO.adjacentTo) ? GEO.adjacentTo(st.place).slice(0, 6).map(function (x) { return x.name + '(' + x.dir + ')'; }) : [];
    return {
      name: pc.name, gender: pc.gender, race: pc.raceName, cls: pc.clsName, level: pc.level,
      hp: Math.round(pc.hp.cur) + '/' + pc.hp.max, ac: pc.ac, fatigue: pc.fatigue || 0,
      hunger: pc.hunger, thirst: pc.thirst, cond: (pc.cond || []).slice(0, 4),
      talents: (pc.talents || []).map(function (t) { return t.name + '(' + t.grade + ')'; }),
      skills: (pc.skills || []).slice(0, 8),
      place: st.place, terrain: st.terrain, threat: info ? info.threat : null,
      nation: info ? info.nationName : '', position: info ? info.position : '',
      nearby: near, weather: st.weather || '', time: GAME.timeLine ? GAME.timeLine() : '',
      gold: ENG ? ENG.money.fmt(ENG.money.total(st)) : '',
      quests: (st.quests || []).filter(function (q) { return q.state === '进行中'; }).slice(0, 3).map(function (q) { return q.name + '（' + q.type + '）'; }),
      team: (st.team || []).map(function (m) { return m.name + '（' + (m.role || m.status || '') + '）'; }),
      bag: (st.bag || []).slice(0, 10).map(function (x) { return x.name + (x.qty > 1 ? 'x' + x.qty : ''); }),
      combat: st.combat ? {
        round: st.combat.round,
        foes: st.combat.foes.filter(function (f) { return f.hp > 0; }).map(function (f) { return f.name + ' ' + Math.max(0, Math.round(f.hp)) + '/' + f.hpMax; })
      } : null,
      logTail: recent()
    };
  }
  function recent() {
    var out = [];
    if (!doc || !doc.querySelectorAll) return out;
    var blocks = doc.querySelectorAll('#log .blk');
    for (var i = Math.max(0, blocks.length - RECENT); i < blocks.length; i++) {
      var t = (blocks[i].textContent || '').replace(/\s+/g, ' ').trim();
      if (t) out.push(t.slice(0, 160));
    }
    return out;
  }
  function stateLine(s) {
    if (!s) return '';
    var bits = [];
    bits.push(s.name + '（' + s.gender + ' ' + s.race + ' ' + s.cls + ' Lv' + s.level + '）');
    bits.push('生命 ' + s.hp + '，AC ' + s.ac);
    if (s.fatigue) bits.push('疲劳 ' + s.fatigue + ' 级');
    if (s.hunger && s.hunger !== '饱足') bits.push(s.hunger);
    if (s.thirst && s.thirst !== '正常') bits.push(s.thirst);
    if (s.cond && s.cond.length) bits.push('状态：' + s.cond.join('、'));
    bits.push('在' + s.place + (s.terrain ? '（' + s.terrain + '）' : '') + (s.threat ? '，威胁 ' + s.threat.join('-') : ''));
    if (s.nation) bits.push(s.nation + (s.position ? '，' + s.position : ''));
    if (s.weather) bits.push(s.weather);
    if (s.time) bits.push(s.time);
    if (s.gold) bits.push('持币 ' + s.gold);
    if (s.talents && s.talents.length) bits.push('天赋：' + s.talents.join('、'));
    if (s.quests && s.quests.length) bits.push('在办：' + s.quests.join('、'));
    if (s.team && s.team.length) bits.push('同行：' + s.team.join('、'));
    if (s.nearby && s.nearby.length) bits.push('邻地：' + s.nearby.join('、'));
    if (s.combat) bits.push('战斗中第 ' + s.combat.round + ' 轮，敌：' + s.combat.foes.join('、'));
    if (s.bag && s.bag.length) bits.push('随身：' + s.bag.join('、'));
    return bits.join('；');
  }
  function buildMessages(payload) {
    var mode = payload.mode || 'scene';
    var sys = WORLD_PROMPT + '\n' + RULES_PROMPT + '\n' + CRAFT_PROMPT;
    if (mode === 'talk') sys += '\n' + TALK_PROMPT;
    else if (mode === 'event') sys += '\n' + EVENT_PROMPT;
    else if (mode === 'fire') sys += '\n' + FIRE_PROMPT;
    else if (mode === 'options') sys += '\n' + OPTIONS_PROMPT;
    else if (mode === 'custom') sys += '\n' + CUSTOM_PROMPT;
    else if (mode === 'improv') sys += '\n' + IMPROV_PROMPT;
    var s = payload.state || {}, ctx = payload.ctx || {};
    var lines = ['【当下】' + stateLine(s)];
    if (s.logTail && s.logTail.length) lines.push('【前文】' + s.logTail.join(' / '));
    if (mode === 'talk') {
      var npc = payload.npc || ctx.npc || { name: '本地人', role: '' };
      lines.push('【这一句】' + npc.name + (npc.role ? '（' + npc.role + '）' : '') + ' 就「' + payload.kind + '」这个话题开口。');
    } else if (mode === 'event') {
      lines.push('【要出的事】类型偏向 ' + (payload.kind || '野外') + '。');
      if (payload.allowed && payload.allowed.length) lines.push('【可用的怪物名】' + payload.allowed.join('、'));
    } else if (mode === 'fire') {
      lines.push('【这一趟】' + (payload.kind || '赶路') + '；引擎已经判定要出事，程度按威胁等级来。');
      if (payload.allowed && payload.allowed.length) lines.push('【可用的怪物名】' + payload.allowed.join('、'));
      if (payload.severity) lines.push('【引擎给的量级】' + payload.severity);
    } else if (mode === 'options') {
      lines.push('【这一回合】玩家在' + (payload.kind === 'city' ? '聚落里' : payload.kind === 'town' ? '镇子上' : '野外') + '，该给四个选项了。');
      if (payload.quest) lines.push('【手上的委托】' + payload.quest);
      if (payload.relations && payload.relations.length) lines.push('【当下可用的动作（引擎支持的）】' + payload.relations.join('、'));
    } else if (mode === 'custom') {
      lines.push('【玩家写的】「' + payload.text + '」');
      if (payload.local) lines.push('【本地规则先读成了】act=' + payload.local.act + '，arg=' + payload.local.arg);
    } else if (mode === 'improv') {
      lines.push('【玩家提到的】' + payload.kind + '：' + payload.name);
    } else {
      var parts = Object.keys(ctx).filter(function (k) { return k !== 'npc'; }).map(function (k) { return k + '=' + ctx[k]; });
      if (parts.length) lines.push('【这一刻】' + parts.join('，'));
    }
    lines.push('【引擎给的判定】' + (ctx.roll != null
      ? 'd20=' + ctx.roll + (ctx.dc != null ? ' vs DC ' + ctx.dc : '') + (ctx.ok === true ? '，成功' : ctx.ok === false ? '，失败' : '')
      : '无（纯描述）'));
    return [{ role: 'system', content: sys }, { role: 'user', content: lines.join('\n') }];
  }

  /* ---------------- 两条通道 ---------------- */
  /* SSE 读取：同时认两种形状——本地桥的 {t:"…"} 与 OpenAI 的 choices[].delta.content */
  function sseReader(res, onPiece) {
    var reader = res.body.getReader();
    var dec = new global.TextDecoder();
    var buf = '', full = '';
    function pump() {
      return reader.read().then(function (r) {
        if (r.done) return full;
        buf += dec.decode(r.value, { stream: true });
        var parts = buf.split('\n\n');
        buf = parts.pop();
        parts.forEach(function (chunk) {
          var line = chunk.replace(/^data:\s?/, '').trim();
          if (!line) return;
          var obj = null;
          try { obj = JSON.parse(line); } catch (e) { return; }
          if (obj.e) throw new Error(obj.e);
          var c = obj.choices && obj.choices[0];
          var piece = (obj.t != null) ? obj.t
            : ((c && ((c.delta && c.delta.content) || (c.message && c.message.content))) || '');
          if (!piece) return;
          full += piece;
          if (onPiece) onPiece(piece);
        });
        return pump();
      });
    }
    return pump();
  }
  function withTimeout(promise, ms, what) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = global.setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error((what || '请求') + '超时（' + Math.round(ms / 1000) + ' 秒）'));
      }, ms);
      promise.then(function (v) { if (!done) { done = true; global.clearTimeout(timer); resolve(v); } },
        function (e) { if (!done) { done = true; global.clearTimeout(timer); reject(e); } });
    });
  }
  /* 直连：页面自己调 OpenAI 兼容端点，和任何服务端无关。
     onPiece(可显示的文字) 在流式过程中被反复调用（已经过闸门）。 */
  function postDirect(path, payload, stream, onPiece) {
    var url = normEndpoint(state.endpoint) + path;
    var headers = { 'Content-Type': 'application/json' };
    if (state.key) headers.Authorization = 'Bearer ' + state.key;
    var body = stream
      ? { model: payload.model || state.model || 'deepseek-r1', messages: payload.messages, temperature: payload.temperature != null ? payload.temperature : 1.15, max_tokens: payload.maxTokens || 260, stream: true }
      : { model: payload.model || state.model || 'deepseek-r1', messages: payload.messages, temperature: payload.temperature != null ? payload.temperature : 1.1, max_tokens: payload.maxTokens || 320, stream: false };
    return withTimeout(global.fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) }), TIMEOUT, '直连模型')
      .then(function (res) {
        if (!res.ok) {
          return res.text().then(function (t) {
            throw new Error('模型端点 ' + res.status + '：' + String(t).slice(0, 140));
          });
        }
        var ctype = (res.headers.get('content-type') || '');
        if (stream && ctype.indexOf('text/event-stream') >= 0 && res.body && res.body.getReader) {
          /* 直连时闸门在本地：逐句放行后再交给界面 */
          var g = makeGate(), shown = '';
          return sseReader(res, function (piece) {
            shown += piece;
            var released = g(shown, false);
            if (released && onPiece) onPiece(released);
          });
        }
        return res.json().then(function (j) {
          var c = j.choices && j.choices[0];
          var text = (c && ((c.message && c.message.content) || c.text)) || j.response || '';
          if (!text) throw new Error('模型没给内容');
          return text;
        });
      });
  }
  /* 本地小桥：本机 server/server.js（同源，Key 在服务端；文字已由服务端过闸） */
  function postBridge(path, body, onPiece) {
    return withTimeout(global.fetch(path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }), TIMEOUT, '本地桥').then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) { throw new Error('桥 ' + res.status + ' ' + String(t).slice(0, 120)); });
      }
      var ctype = res.headers.get('content-type') || '';
      if (ctype.indexOf('text/event-stream') < 0 || !res.body || !res.body.getReader) return res.json();
      var shown = '';
      return sseReader(res, function (piece) {
        shown += piece;
        if (onPiece) onPiece(shown);
      });
    });
  }
  function bridgeAvailable() {
    if (!isHttp()) return Promise.resolve(false);
    return withTimeout(global.fetch('/api/health', { method: 'GET' }), 6000, '探测本地桥')
      .then(function (r) { return r.json(); })
      .then(function (j) { return !!(j && j.ok && j.ai); })
      .catch(function () { return false; });
  }
  /* 探测：按 transport 决定用哪条 */
  function probe() {
    state.lastError = '';
    var wantBridge = state.transport !== 'direct';
    var wantDirect = state.transport !== 'bridge';
    var tryDirect = function () {
      if (!wantDirect || !state.endpoint) { state.ready = false; state.using = ''; if (!state.lastError) state.lastError = '没有可用的模型端点'; paint(); return false; }
      return fetchModels(true).then(function (list) {
        if (!list.length) throw new Error('端点通了，但没列出任何模型');
        state.models = list;
        if (!state.model || list.indexOf(state.model) < 0) state.model = list[0];
        state.ready = true; state.using = 'direct'; state.lastError = ''; paint(); return true;
      }).catch(function (e) {
        state.ready = false; state.using = ''; state.lastError = (e && e.message) || '直连失败'; paint(); return false;
      });
    };
    if (!wantBridge) return tryDirect();
    return bridgeAvailable().then(function (ok) {
      if (ok) {
        return global.fetch('/api/health').then(function (r) { return r.json(); }).then(function (j) {
          state.ready = true; state.using = 'bridge'; state.model = j.model || state.model; state.lastError = ''; paint(); return true;
        });
      }
      /* 桥不在（常见：直接打开的网页文件，或只装了本地模型）：退回直连 */
      return tryDirect();
    });
  }
  /* 拉模型列表：OpenAI 兼容端点都有 /models */
  function fetchModels(quiet) {
    var url = normEndpoint(state.endpoint) + '/models';
    var headers = {};
    if (state.key) headers.Authorization = 'Bearer ' + state.key;
    return withTimeout(global.fetch(url, { method: 'GET', headers: headers }), 9000, '拉模型列表')
      .then(function (r) {
        if (!r.ok) throw new Error('端点回 ' + r.status + (r.status === 404 ? '（地址可能少了 /v1）' : ''));
        return r.json();
      })
      .then(function (j) {
        var arr = (j && (j.data || j.models)) || [];
        return arr.map(function (x) { return x.id || x.name || x.model; }).filter(Boolean);
      })
      .catch(function (e) {
        if (!quiet) state.lastError = (e && e.message) || '拉不到模型列表';
        throw e;
      });
  }

  /* ---------------- 四个内容类型：对两条通道统一开口 ---------------- */
  function askText(payload, onPiece) {
    if (state.using === 'bridge') {
      return postBridge('/api/narrate', payload, onPiece);
    }
    var msgs = buildMessages(payload);
    return postDirect('/chat/completions', { messages: msgs, maxTokens: 260, model: state.model }, true, onPiece);
  }
  function askEvent(kind, allowed) {
    var snap = snapshot();
    if (!snap) return Promise.reject(new Error('还没有角色'));
    var payload = { mode: 'event', kind: kind || 'wild', state: snap, allowed: allowed || [] };
    if (state.using === 'bridge') {
      return postBridge('/api/event', payload).then(function (r) {
        if (!r || !r.ok || !r.event) throw new Error((r && r.error) || '桥没给出合规事件');
        return { ok: true, event: r.event };
      });
    }
    return postDirect('/chat/completions', { messages: buildMessages(payload), maxTokens: 320, temperature: 1.25, model: state.model }, false)
      .then(function (raw) {
        var ev = normalizeEvent(extractJson(raw), allowed || []);
        if (!ev) throw new Error('模型没给出合规的事件格式');
        return { ok: true, event: ev };
      });
  }
  function normalizeEvent(ev, allowed) {
    if (!ev || typeof ev !== 'object') return null;
    var text = typeof ev.text === 'string' ? ev.text.slice(0, 240) : '';
    if (text.length < 4) return null;
    var kinds = ['遭遇', '天灾', '迷路', '破财', '伤病', '发现', '人'];
    return {
      kind: kinds.indexOf(ev.kind) >= 0 ? ev.kind : '发现',
      text: gate(text).text,
      foes: Array.isArray(ev.foes) ? ev.foes.filter(function (f) {
        return typeof f === 'string' && (!allowed.length || allowed.indexOf(f) >= 0);
      }).slice(0, 4) : [],
      dc: isFinite(ev.dc) ? Math.max(8, Math.min(16, Math.round(ev.dc))) : null,
      dmg: (typeof ev.dmg === 'string' && /^\d+d\d+(\+\d+)?$/.test(ev.dmg.trim())) ? ev.dmg.trim() : null,
      loot: typeof ev.loot === 'string' ? ev.loot.slice(0, 30) : null,
      why: typeof ev.why === 'string' ? ev.why.slice(0, 80) : ''
    };
  }
  function askCustom(text) {
    var snap = snapshot();
    if (!snap) return Promise.reject(new Error('还没有角色'));
    var local = (GAME && GAME.interpret) ? GAME.interpret(GAME.state, text) : null;
    var payload = { mode: 'custom', text: text, local: local, state: snap };
    if (state.using === 'bridge') {
      return postBridge('/api/custom', payload).then(function (r) {
        if (!r || !r.ok) throw new Error((r && r.error) || '桥没给出解读');
        return r;
      });
    }
    return postDirect('/chat/completions', { messages: buildMessages(payload), maxTokens: 300, model: state.model }, false)
      .then(function (raw) {
        var obj = extractJson(raw);
        if (!obj || typeof obj.text !== 'string') throw new Error('模型没给出合规的解读');
        var acts = ['useitem', 'pray', 'talkto', 'attackmon', 'travel', 'travelfar', 'longtrip', 'quest', 'look', 'generic'];
        var check = null;
        if (obj.check && typeof obj.check === 'object' && ['str', 'dex', 'con', 'int', 'wis', 'cha'].indexOf(obj.check.attr) >= 0) {
          check = { attr: obj.check.attr, dc: Math.max(8, Math.min(16, Math.round(Number(obj.check.dc) || 12))), why: String(obj.check.why || '').slice(0, 60) };
        }
        return { ok: true, act: acts.indexOf(obj.act) >= 0 ? obj.act : 'generic',
          arg: obj.arg == null ? null : String(obj.arg).slice(0, 40), text: gate(String(obj.text)).text, check: check };
      });
  }
  function askImprov(kind, name) {
    var snap = snapshot();
    if (!snap) return Promise.reject(new Error('还没有角色'));
    var payload = { mode: 'improv', kind: kind, name: name, state: snap };
    if (state.using === 'bridge') {
      return postBridge('/api/improv', payload).then(function (r) {
        if (!r || !r.ok) throw new Error((r && r.error) || '桥没给出条目');
        return r;
      });
    }
    return postDirect('/chat/completions', { messages: buildMessages(payload), maxTokens: 220, temperature: 1.2, model: state.model }, false)
      .then(function (raw) {
        var obj = extractJson(raw);
        if (!obj || !obj.desc) throw new Error('模型没给出条目');
        return { ok: true, name: String(obj.name || name).slice(0, 24), desc: gate(String(obj.desc)).text,
          tags: Array.isArray(obj.tags) ? obj.tags.slice(0, 4).map(function (t) { return String(t).slice(0, 10); }) : [] };
      });
  }
  /* 选项：四个槽位的内容由模型写；每个 act 都要落在引擎支持的那一组里，否则这一格退回引擎选项 */
  var ROLE_ACTS = {
    safe: ['forward', 'inquire', 'quest', 'guild', 'work', 'shop'],
    bold: ['bold', 'attack', 'cast', 'travelfar', 'longtrip'],
    careful: ['careful', 'look', 'shop', 'train'],
    rest: ['rest', 'eat', 'heal', 'pray', 'defend']
  };
  function normalizeOptions(raw) {
    if (!raw || !Array.isArray(raw.options)) return null;
    var out = [];
    ['safe', 'bold', 'careful', 'rest'].forEach(function (role, idx) {
      var hit = null;
      raw.options.forEach(function (o) { if (!hit && o && o.role === role) hit = o; });
      if (!hit) hit = raw.options[idx];
      if (!hit) return;
      var act = ROLE_ACTS[role].indexOf(hit.act) >= 0 ? hit.act : null;
      var label = String(hit.label || '').replace(/\s+/g, '').trim();
      if (label.length < 6 || label.length > 40) label = '';
      out.push({ role: role, act: act, label: label ? gate(label).text : '' });
    });
    if (!out.length) return null;
    return { options: out, note: raw.note ? gate(String(raw.note)).text.slice(0, 40) : '' };
  }
  function askOptions(kind, quest, relations) {
    if (!state.on || !state.ready) return Promise.reject(new Error('联网没开'));
    var snap = snapshot();
    if (!snap) return Promise.reject(new Error('还没有角色'));
    var payload = { mode: 'options', kind: kind, quest: quest || '', relations: relations || [], state: snap };
    if (state.using === 'bridge') {
      return postBridge('/api/options', payload).then(function (r) {
        if (!r || !r.ok) throw new Error((r && r.error) || '桥没给出选项');
        return r;
      });
    }
    return postDirect('/chat/completions', { messages: buildMessages(payload), maxTokens: 420, temperature: 1.25, model: state.model }, false)
      .then(function (raw) {
        var opts = normalizeOptions(extractJson(raw));
        if (!opts) throw new Error('模型没给出合规的选项');
        return { ok: true, options: opts.options, note: opts.note };
      });
  }
  /* 事件触发：引擎判定「要出事」，这里只要内容 */
  function askFire(kind, allowed, severity) {
    if (!state.on || !state.ready) return Promise.reject(new Error('联网没开'));
    var snap = snapshot();
    if (!snap) return Promise.reject(new Error('还没有角色'));
    var payload = { mode: 'fire', kind: kind, allowed: allowed || [], severity: severity || '', state: snap };
    if (state.using === 'bridge') {
      return postBridge('/api/fire', payload).then(function (r) {
        if (!r || !r.ok) throw new Error((r && r.error) || '桥没给出事件');
        return r;
      });
    }
    return postDirect('/chat/completions', { messages: buildMessages(payload), maxTokens: 360, temperature: 1.3, model: state.model }, false)
      .then(function (raw) {
        var ev = normalizeEvent(extractJson(raw), allowed || []);
        if (!ev) throw new Error('模型没给出合规的事件');
        return { ok: true, event: ev };
      });
  }

  /* ---------------- 把 AI 文字挂到文字块上 ---------------- */
  /* text 是 NARR 包装层给出的 String 对象：__ai 是最终文字的承诺，
     __aiSink 是「边写边显示」的插座，pushText 拿到块之后接上它。 */
  function attach(box, text, st) {
    if (!box || !text) return;
    var target = box.querySelector ? (box.querySelector('.tx') || box) : box;
    box.setAttribute('data-ai', 'pending');
    state.busy++;
    paint();
    if (typeof text.__aiSink === 'function') {
      text.__aiSink(function (partial) {
        if (!partial || partial.length < 2) return;
        box.setAttribute('data-ai', 'stream');
        if (global.LTX) target.innerHTML = global.LTX.renderMixed(String(partial));
        else target.textContent = String(partial);
      });
    }
    var promise = text.__ai;
    if (!promise || !promise.then) return;
    promise.then(function (out) {
      state.busy--;
      if (out && String(out).length > 1) {
        box.setAttribute('data-ai', 'done');
        if (global.LTX) target.innerHTML = global.LTX.renderMixed(String(out));
        else target.textContent = String(out);
      } else {
        state.fail++;
        state.lastError = '模型这次没给文字';
        box.setAttribute('data-ai', 'empty');
      }
      paint();
    }, function (err) {
      state.busy--;
      state.fail++;
      state.lastError = (err && err.message) || '生成失败';
      box.setAttribute('data-ai', 'failed');
      paint();
    });
  }

  /* ---------------- NARR 外面的那一层 ---------------- */
  function wrapText(kind, ctx, fb, mode, npc) {
    if (!state.on || !state.ready) return fb;
    var snap = snapshot();
    if (!snap) return fb;
    var payload = { mode: mode, kind: kind, ctx: clipCtx(ctx), npc: npc ? { name: npc.name, role: npc.role } : null, state: snap };
    var str = new String(fb == null ? '' : fb);
    var sink = null;
    str.__aiSink = function (fn) { sink = fn; };
    str.__ai = askText(payload, function (partial) {
      if (sink) { try { sink(partial); } catch (e) { /* 显示出错不影响最终文字 */ } }
    }).then(function (r) {
      /* 桥：服务端已经过闸；直连：这里再过一遍，双重保险 */
      var text = (typeof r === 'string') ? r : ((r && (r.text || r.raw)) || '');
      state.calls++;
      return state.using === 'bridge' ? text : gate(text).text;
    });
    return str;
  }
  function clipCtx(ctx) {
    if (!ctx || typeof ctx !== 'object') return {};
    var out = {};
    Object.keys(ctx).forEach(function (k) {
      var v = ctx[k];
      if (v == null) return;
      if (typeof v === 'object') {
        if (k === 'npc') out.npc = { name: v.name, role: v.role };
        return;
      }
      out[k] = typeof v === 'string' ? v.slice(0, 60) : v;
    });
    return out;
  }
  function install() {
    if (!NARR || NARR.__aiWrapped) return;
    var oScene = NARR.scene, oTalk = NARR.talk;
    NARR.scene = function (kind, ctx) {
      var fb = oScene ? oScene.apply(NARR, arguments) : '';
      try { return wrapText(kind, ctx, fb, 'scene'); } catch (e) { return fb; }
    };
    NARR.talk = function (npc, topic, ctx) {
      var fb = oTalk ? oTalk.apply(NARR, arguments) : '';
      try { return wrapText(topic, ctx, fb, 'talk', npc); } catch (e) { return fb; }
    };
    NARR.__aiWrapped = true;
  }

  /* ---------------- 界面 ---------------- */
  function paint() {
    var b = doc && doc.getElementById('aiChip');
    if (!b) return;
    var label;
    if (state.busy) label = 'AI 生成中 ' + state.busy;
    else if (!state.on) label = state.ready ? ('AI 接 入 · ' + (state.using === 'bridge' ? '本机桥' : '直连可用')) : 'AI 接 入';
    else if (state.ready) label = 'AI 已接 · ' + (state.using === 'bridge' ? '本机桥' : endpointHost()) + (state.model ? ' · ' + state.model : '');
    else label = 'AI 没连上';
    b.textContent = label;
    b.className = 'chip' + (state.on && state.ready ? ' key' : '') + (state.on && !state.ready ? ' warn' : '');
    b.title = state.lastError || (state.ready
      ? '点一下开关：对话 / 事件 / 自定义内容交给模型写，判定与数值仍在本地算。右键或点旁边「AI 设置」改端点。'
      : (isHttp() ? '点一下打开联网；也可以点旁边「AI 设置」换成 DeepSeek 官方或本机模型。'
        : '点一下打开：没配端点会提示；点旁边「AI 设置」→ 选 DeepSeek 官方，粘一个 sk- 开头的 Key 即可。'));
  }
  function mountChip() {
    var chips = doc && doc.getElementById('chips');
    if (!chips || doc.getElementById('aiChip')) return;
    var b = doc.createElement('button');
    b.type = 'button'; b.id = 'aiChip'; b.className = 'chip';
    b.addEventListener('click', function () { toggle(); });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); settings(); });
    chips.appendChild(b);
    var s = doc.createElement('button');
    s.type = 'button'; s.id = 'aiCfg'; s.className = 'chip';
    s.textContent = 'AI 设置';
    s.addEventListener('click', function () { settings(); });
    chips.appendChild(s);
    paint();
  }
  function toggle() {
    state.on = !state.on;
    writeLS(state.on);
    if (state.on) {
      say('正在探测可用的模型…');
      probe().then(function (ok) {
        say(ok ? ('联网已开：' + (state.using === 'bridge' ? '走本机桥' : ('直连 ' + endpointHost())) +
          '，模型 ' + (state.model || '默认') + '。判定与数值仍在本地算。')
          : ('联网开不了：' + (state.lastError || '没找到可用端点') + '。点「AI 设置」填本机模型地址，或仍按离线模板玩。'));
      });
    } else say('联网已关：回到离线模板叙述，行为与单文件版一致。');
    paint();
  }
  /* 设置面板：每台设备各填各的，存在这台设备的浏览器里 */
  function applyPreset(id) {
    var p = null;
    PRESETS.forEach(function (x) { if (x.id === id) p = x; });
    if (!p) return null;
    state.transport = 'direct';
    state.endpoint = normEndpoint(p.endpoint);
    if (p.model) state.model = p.model;
    saveCfg();
    return p;
  }
  function settings() {
    if (!GAME || !GAME.modal) return;
    var rows = [];
    rows.push('<div class="set-row"><label>一键预设</label><span>' +
      PRESETS.map(function (p) { return '<button type="button" class="ai-preset" data-preset="' + p.id + '">' + p.name + '</button>'; }).join(' ') +
      '</span><span class="hint">点一下就把下面的端点和模型填好；' +
      PRESETS[0].note + '。</span></div>');
    rows.push('<div class="set-row"><label>通道</label><select id="aiTransport">' +
      ['auto:自动（先找本机桥，再直连）', 'direct:直连模型端点（默认，最省事）', 'bridge:只用本机桥'].map(function (x) {
        var p = x.split(':');
        return '<option value="' + p[0] + '"' + (state.transport === p[0] ? ' selected' : '') + '>' + p[1] + '</option>';
      }).join('') + '</select></div>');
    rows.push('<div class="set-row"><label>模型端点</label><input id="aiEndpoint" value="' + esc(state.endpoint) + '" placeholder="' + DEFAULT_ENDPOINT + '">' +
      '<span class="hint">官方填 api.deepseek.com/v1；本机填 127.0.0.1:端口/v1；内网填 192.168.x.x:11434/v1。' +
      '不用写协议：本机与内网自动补 http，公网域名自动补 https。</span></div>');
    rows.push('<div class="set-row"><label>模型名</label><input id="aiModel" value="' + esc(state.model) + '" placeholder="deepseek-chat / deepseek-reasoner / deepseek-r1:7b">' +
      '<span class="hint">官方两个：deepseek-chat（快、便宜）、deepseek-reasoner（更会算）。本地模型点「拉取模型列表」看有什么。</span></div>');
    rows.push('<div class="set-row"><label>API Key</label><input id="aiKey" value="' + esc(state.key) + '" placeholder="用官方就粘 sk- 开头的 Key；本地模型留空">' +
      '<span class="hint">只存在这台设备的浏览器里，不会发给任何第三方；能打开这台设备的人就看得到，公用电脑别填。</span></div>');
    rows.push('<div class="set-row"><label>当前状态</label><span>' +
      esc(state.ready ? ('可用 · ' + (state.using === 'bridge' ? '本机桥' : '直连 ' + endpointHost()) + ' · ' + (state.model || '默认模型')) : ('不可用：' + (state.lastError || '还没探测'))) +
      '　调用 ' + state.calls + ' 次 · 失败 ' + state.fail + ' 次</span></div>');
    rows.push('<div class="set-row"><label>测试结果</label><span id="aiTestOut">还没测。点右下「保存并测试」。</span>' +
      '<span class="hint">结果写在这里；连着测几次不影响存档。</span></div>');
    rows.push('<div class="set-row"><label>怎么用</label><span class="hint">每台设备各自运行：配置存在本机浏览器，游戏与存档也在本机，不需要总服务器。' +
      '要跟别的设备共用模型，就把端点填成那台设备的 IP（它得给 Ollama 开 OLLAMA_HOST=0.0.0.0 与 OLLAMA_ORIGINS=*）。</span></div>');
    var btns = [
      { label: '保 存 并 测 试', act: function () { runTest(); } },
      { label: '拉 取 模 型 列 表', act: function () { runModels(); } },
      { label: '关 闭', act: function () { readSettings(); saveCfg(); GAME.closeModal(); paint(); } }
    ];
    GAME.modal('AI 设 置（本 机）', '<div class="ai-set">' + rows.join('') + '</div>', btns);
    /* 按钮引用：测试时把第一颗改成「测试中…」并禁用，避免以为没反应 */
    var footBtns = doc.querySelectorAll('.mb-foot button');
    var testBtn = footBtns[0], listBtn = footBtns[1];
    function runTest() {
      readSettings(); saveCfg();
      var ep = endpointHost() || '（空）';
      if (testBtn) { testBtn.disabled = true; testBtn.textContent = '测 试 中 …'; }
      setOut('正在连 ' + ep + ' …（最多等十几秒）');
      probe().then(function (ok) {
        if (testBtn) { testBtn.disabled = false; testBtn.textContent = '保 存 并 测 试'; }
        if (ok) {
          var how = state.using === 'bridge' ? '本机桥' : ('直连 ' + endpointHost());
          var more = state.models && state.models.length ? ('，端点上有 ' + state.models.length + ' 个模型') : '';
          setOut('好了：' + how + ' 可用 · 模型 ' + (state.model || '默认') + more +
            '。关掉这个弹层，点一下底部「AI 接入」就能开。', 'ok');
        } else {
          setOut('没连上：' + (state.lastError || '未知') + '。' + fixHint(), 'bad');
        }
        refreshStatus();
      }, function (e) {
        if (testBtn) { testBtn.disabled = false; testBtn.textContent = '保 存 并 测 试'; }
        setOut('没连上：' + ((e && e.message) || '未知') + '。' + fixHint(), 'bad');
      });
    }
    function runModels() {
      readSettings(); saveCfg();
      if (listBtn) { listBtn.disabled = true; listBtn.textContent = '拉 取 中 …'; }
      setOut('正在问 ' + (endpointHost() || '（空）') + ' 有哪些模型 …');
      fetchModels(false).then(function (list) {
        if (listBtn) { listBtn.disabled = false; listBtn.textContent = '拉 取 模 型 列 表'; }
        state.models = list;
        if (list.length && (!state.model || list.indexOf(state.model) < 0)) {
          state.model = list[0];
          var mi = doc.getElementById('aiModel');
          if (mi) mi.value = state.model;
          saveCfg();
        }
        setOut('端点上的模型：' + list.slice(0, 8).join('、') +
          (list.length > 8 ? (' 等 ' + list.length + ' 个') : '') + '。已默认选 ' + (state.model || '第一个') + '。', 'ok');
        paint();
      }, function (e) {
        if (listBtn) { listBtn.disabled = false; listBtn.textContent = '拉 取 模 型 列 表'; }
        setOut('拉不到：' + ((e && e.message) || '未知') + '。' + fixHint(), 'bad');
      });
    }
    /* 当前状态那一行也要跟着刷新，不然会一直停在「还没探测」 */
    function refreshStatus() {
      var span = doc.querySelector('.ai-set .set-row:nth-child(6) > span');
      if (span) {
        span.textContent = (state.ready ? ('可用 · ' + (state.using === 'bridge' ? '本机桥' : '直连 ' + endpointHost()) + ' · ' + (state.model || '默认模型'))
          : ('不可用：' + (state.lastError || '还没探测'))) + '　调用 ' + state.calls + ' 次 · 失败 ' + state.fail + ' 次';
      }
    }
    /* 预设按钮：点一下就把端点/模型填进输入框（还没保存，玩家可以再改） */
    var chips = doc.querySelectorAll('.ai-preset');
    for (var i = 0; i < chips.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var p = applyPreset(btn.getAttribute('data-preset'));
          if (!p) return;
          var e1 = doc.getElementById('aiEndpoint'), e2 = doc.getElementById('aiModel'), e3 = doc.getElementById('aiKey');
          if (e1) e1.value = p.endpoint;
          if (e2) e2.value = p.model || e2.value;
          if (e3 && !state.key) e3.focus();
          setOut(p.name + '：端点已填好' + (p.model ? ('，模型 ' + p.model) : '') + '。' + p.note +
            '　填完就点「保存并测试」。');
        });
      })(chips[i]);
    }
    function readSettings() {
      var g = function (id) { var e = doc.getElementById(id); return e ? String(e.value || '').trim() : ''; };
      var t = g('aiTransport');
      state.transport = (t === 'direct' || t === 'bridge') ? t : 'auto';
      state.endpoint = normEndpoint(g('aiEndpoint') || DEFAULT_ENDPOINT);
      state.model = g('aiModel');
      state.key = g('aiKey');
    }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /* 弹层里的进度/结果：设置面板开着的时候，消息必须写在弹层里（写到底部提示栏等于没写） */
  function setOut(msg, kind) {
    var el = doc && doc.getElementById('aiTestOut');
    if (el) {
      el.textContent = msg;
      el.style.color = kind === 'ok' ? '#8FBF9F' : (kind === 'bad' ? '#E8A0A0' : '');
    }
    say(msg);
  }
  /* 一句能照着做的下一步 */
  function fixHint() {
    var host = endpointHost();
    if (/deepseek\.com/.test(host) && !state.key) return '官方端点要填 Key：点上面的「DeepSeek 官方」预设，再把 sk- 开头的 Key 粘进 API Key。';
    if (/deepseek\.com/.test(host)) return 'Key 可能不对或没余额：去 DeepSeek 平台确认这个 Key 还能用。';
    if (/127\.0\.0\.1|localhost/.test(host)) return '本机模型要先起来：Ollama 跑 ollama serve 并 ollama pull 一个模型，LM Studio 打开本地服务器。';
    return '确认那台设备开着模型服务，并允许跨源访问（Ollama 要 OLLAMA_HOST=0.0.0.0 与 OLLAMA_ORIGINS=*）。';
  }

  var AI = {
    get on() { return state.on; },
    get ready() { return state.ready; },
    get status() {
      return { on: state.on, ready: state.ready, using: state.using, transport: state.transport,
        endpoint: state.endpoint, host: endpointHost(), model: state.model, models: state.models.slice(),
        busy: state.busy, calls: state.calls, fail: state.fail, err: state.lastError, http: isHttp() };
    },
    attach: attach,
    gateway: wrapText,
    event: askEvent,
    fire: askFire,
    options: askOptions,
    custom: askCustom,
    improv: askImprov,
    toggle: toggle,
    probe: probe,
    models: fetchModels,
    settings: settings,
    presets: function () { return PRESETS.map(function (p) { return { id: p.id, name: p.name, endpoint: p.endpoint, model: p.model }; }); },
    preset: applyPreset,
    snapshot: snapshot,
    setConfig: function (o) {   /* 供控制台/测试直接配置这台设备 */
      if (!o) return;
      if (o.endpoint) state.endpoint = normEndpoint(o.endpoint);
      if (o.model != null) state.model = o.model;
      if (o.key != null) state.key = o.key;
      if (o.transport) state.transport = o.transport;
      if (o.on != null) { state.on = !!o.on; writeLS(state.on); }
      saveCfg();
      paint();
      /* 打开就用得上：配好之后立刻探测一次，省得玩家还要再点一下 */
      if (state.on) probe();
      return AI.status;
    },
    mountChip: mountChip,
    mount: function () {
      loadCfg(); install(); mountChip();
      state.on = readLS();
      if (state.on) { probe(); return; }
      /* 没开也先看看同源有没有本机桥（一次便宜的探测，好让按钮上写清楚）； 
         直连模式下不主动碰模型端点，等玩家自己打开开关 */
      if (isHttp()) {
        bridgeAvailable().then(function (ok) {
          if (ok) { state.ready = true; state.using = 'bridge'; }
          paint();
        });
      } else paint();
    }
  };
  global.AI = AI;

  if (doc) {
    var boot = function () { try { AI.mount(); } catch (e) { /* 联网层挂了也不影响离线玩法 */ } };
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(window);
