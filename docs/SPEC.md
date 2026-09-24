# 工程规范（SPEC）— 《剑与魔法命运编年史》网页游戏

> 所有模块必须严格遵守本文件的全局名、数据结构与编码约束。数据源：`docs/设定集.md`、`docs/设定集-续.md`。

## 0. 交付形态
- 用户双击即可玩的**单文件 HTML**（无外部依赖、无 CDN、无字体外链、离线可用）。
- `build.py` 把 `build/` 下所有片段拼进 `build/shell.html` 的 `/*__CSS__*/` 与 `/*__JS__*/`，输出 `剑与魔法命运编年史.html`。
- `build.py` 的 `ORDER` 必须与脚本依赖顺序一致（靠前先加载）：
  `['latex.js','world.js','tables.js','narr.js','engine.js','panels.js','create.js','game.js']`

## 1. 编码约束（违反即构建失败）
1. **零 emoji**：任何文件不得出现 emoji / 表情符号 / 图形符号（U+1F300–U+1FAFF、U+2600–U+27BF 等）。装饰只用 `◈ ✦ ◆ ◇ ─ │ 〔〕 【】 ·` 与 LaTeX 命令。
2. **零外部资源**：不得出现 `http://`、`https://`、`src=`、`@import`、`<link`、`fonts.googleapis`。
3. 字符串里不得出现 `</script>`。
4. 每个模块用 IIFE 包裹并挂到 `window` 全局：`(function(global){ 'use strict'; ... global.XX = MOD; })(window);`
5. 允许 ES6（const/let/箭头函数/模板字符串）。禁止 `import`/`export`、`require`、动态 `eval`。
6. 不使用 `Math.random()`：**所有随机数必须走 `ENG` 的种子随机**（`ENG.rnd()`、`ENG.int(a,b)`、`ENG.pick(arr)`、`ENG.roll(n,faces)`、`ENG.d20()`）。数据模块不得调用随机。
7. 玩家可见文案与剧情文本**禁止**出现这些 AI 模板词句：
   `微不可查` `不易察觉` `不由得` `不禁` `随即` `片刻后` `只见` `就在这时` `深刻地` `无比` `极其` `格外` `至关` `关键性` `错综复杂` `交织` `谱写` `画卷` `织锦` `镌刻` `烙印`
   以及句式 `不是……而是……`、`从来不是……而是……`、`不仅仅是……更是……`、三句一组的排比。
   说明：数据文件里引用设定集原文（如"极其罕见"）允许保留；`narr.js` 的原创叙述**零容忍**。
8. 面板一律用 `\(...\)` 包裹的 LaTeX 子集，禁止 `$$...$$`、禁止放进代码块。

## 2. 美术方向（冷峻写实 · 高自由度 · 因果严明）
- 外壳（顶栏、左侧节点栏、底栏、起始页）用**冷石板灰蓝近黑**，正文面板用**奶白 `#FDF6F0`**＋莫兰迪边框——冷峻的壳，克制的纸。
- 排版：中文衬线优先（`Songti SC / Source Han Serif / Noto Serif CJK SC / STSong / SimSun`），标签用等宽或小号大写字距；细线代替色块，无圆角糖果感，动效克制（≤180ms）。
- 配色表、面板骨架、进度条、选项气泡严格照 `docs/设定集-续.md` 附录甲。

## 3. 模块与全局命名

### 3.1 `latex.js` → `window.LTX`（已有实现，直接沿用并扩展）
`LTX.latexToHtml(src) -> string`、`LTX.panel(code, opts)`、`LTX.esc(s)`、`LTX.COLORS`。
必须支持：`\fcolorbox`、`\colorbox`、`\textcolor`、`\textbf`、`\text`、`\begin{array}{l}`、`\\`、`\scalebox`、`\rule{w}{h}`、`\overline{}`、`\quad`、`\qquad`、`\;`、`\Large/\large/\normalsize/\small/\footnotesize`、`\overline`（=CSS 细线）、`\(...\)` 定界符、`\bullet`、`\#`。
解析失败时**原样输出源码**，绝不静默吞掉内容。

### 3.2 `world.js` → `window.WD`（静态设定数据，无逻辑）
必须导出下列键，字段名不得改动：

```js
WD.COSMOS      = [{name, desc}]                                  // 6 条位面
WD.GODS        = [{name, domain, align, symbol, org, creed}]      // 8 位神明
WD.NATIONS     = [{name, capital, gov, trait, kind}]              // kind:'human'|'race'，13 条
WD.ORGS        = [{name, desc}]                                   // 7 个跨种族组织
WD.REGIONS     = [{id, name, terrain, nation, kind, threat:[a,b], desc, landmarks:[..]}]
                 // kind:'city'|'town'|'wild'|'sea'|'under'|'ruin'
                 // terrain ∈ '冰原','山脉','丘陵','平原','森林','沙漠','荒原','沼泽','海域','地下','废墟'
                 // 41+ 条，覆盖：北境冰原/龙骨山脉/银峰山脉/维兰之海/中部平原/艾索洛伦森林/
                 // 铁锤山脉/黄铜沙漠/南境荒原/无尽之海/灰雾平原/幽暗地域 与七王国首都、种族国度首都
WD.RACES       = [{id, name, sub, height, life, traits, bonus, society, homeland, speed, size}]
                 // bonus 形如 {str:2,dex:1} 或 {any:1}；16+ 条（人类/高等精灵/木精灵/卓尔/
                 // 山地矮人/山丘矮人/龙裔/金属龙/彩色龙/宝石龙/半身人/半兽人/狮人/哥布林/食人魔/娜迦/巨人/半精灵）
WD.CLASSES     = [{id, name, source, core, subs:[], pros, cons, hpDie, kits:[{name, items:[..]}], caster}]
                 // 10 条：法师/术士/战士/游侠/游荡者/牧师/圣骑士/野蛮人/德鲁伊/吟游诗人
WD.SOURCES     = [{name, attr, how, jobs}]                        // 5 力量本源
WD.LEVELS      = [{name, range:[a,b], stand, status, life}]       // 等级体系 7 档
WD.STATUSES    = [{name, effect}]                                 // 8 条负面状态
WD.ALIGNMENTS  = [{id, name, core, who}]                          // 9 阵营，id:'LG'..'CE'
WD.REP_LEVELS  = ['敌对','冷淡','中立','友好','尊敬','崇拜']
WD.LANGS       = [{name, users, script, trait}]                   // 8 活语言
WD.DEAD_LANGS  = [{name, desc}]                                   // 3 死语言
WD.DIALECTS    = [{name, desc}]                                   // 4 方言/俚语
WD.CRAFTS      = [{name, attr, cost, out, tiers:[五阶]}]           // 8 副职业
WD.CRAFT_TIERS = ['未入门','初窥门径','小有所成','融会贯通','登峰造极']
WD.MONEY       = {cp:1, sp:100, gp:1000, pp:10000}                // 以铜币为单位的兑换率
WD.PRICES      = [{name, price, unit}]                            // 10 条物价参考
WD.QUALITY     = [{name, desc, range:[min,max]}]                  // 6 品质
WD.ITEMS       = {
  consumable: [{id, name, quality, price, effect, kind}],          // 8 条消耗品
  weapon:     [{id, name, quality, price, dmg, dmgType, props, hands}], // 20+ 条（普通武器 + 附魔武器）
  armor:      [{id, name, quality, price, ac, kind, props}],       // 10+ 条
  gear:       [{id, name, quality, price, effect, slot}]           // 10+ 条（戒指/奇物）
}
WD.ARTIFACTS   = [{name, type, power, cost}]                      // 5 神器
WD.MONSTERS    = [{id, name, cls, habitat:[terrain], threat:[a,b], drop:[], trait, weak,
                   hp, ac, atk, dmg, xp}]                         // 17 条（普通野兽/魔法生物/不死/异界）
WD.SPELLS      = [{lv, name, school, effect, forbidden}]          // 30+ 条；forbidden ∈ null|'死灵'|'惑控'|'恶魔'|'时间'
WD.TIMELINE    = {eras:[{name, dur, event}], events:[{year, name, desc}], omens:[str], current:{year:824, era, season}}
WD.HEROES      = [{name, race, job, title, area, bio, level, cr}]  // 5 当代英雄
WD.LEGEND_HEROES = [{name, era, deed, legacy}]                    // 3 已逝传奇
WD.CALENDAR    = {months:[{n, name, season, trait}], weekdays:[{n, name, meaning}],
                  festivals:[{month, day, name, desc}], omens:[{name, cycle, desc}]}
WD.LEGENDS     = [{region, rows:[{n1, n2, text}]}]                // 4 地区 × 4 条地方传说
WD.RUMORS      = [{n, text, truth}]                               // 20 条酒馆谣言，truth ∈ '真'|'假'|'半真半假'
WD.ETYMOLOGY   = [{name, origin, meaning}]                        // 6 地名词源
WD.PRICING     = [{kind, formula}]                                // 4 定价公式
WD.BACKGROUNDS = [{id, name, skills:[], item}]                    // 10 背景（d10）
WD.IDENTITIES  = [{id, name, desc, skills:[], gold}]              // 10 身份
WD.TEMPLATES   = [{name, race, job, origin, gold, traits:[]}]     // 5 预设模板
WD.OPENINGS    = [{id, name, place, region, terrain, nation, month, day, hook, initial, task, tone, npc:{name, role}}]
WD.TALENTS     = {SSS:[{id,name,grade,desc,effect}], A:[..], B:[..], C:[..], D:[..]}
                 // 开局按概率抽一组给玩家（5D/4C/3B/2A/1SSS），可抽五次，整组到手；
                 // 五档各自要有足够条目（SSS 14 / A 8 / B 8 / C 8 / D 8），抽到的条目之间不重复
                 // effect = {attrs:{str:1,..}, checks:1, ac:0, hp:0, atk:0, dmg:0, gold:0,
                 //           rep:{org:1}, special:'id'}，字段可省略
WD.NAMES       = {byRace:{raceId:{male:[], female:[], family:[]}}, place:[], org:[]}
WD.SKILLS      = ['运动','体操','巧手','隐匿','奥秘','历史','洞悉','威吓','调查','医药','自然','觉察','表演','说服','宗教','生存','驯兽','游说']
WD.SPELL_LV    = ['戏法','1环','2环','3环','4环','5环','6环','7环','8环','9环','传奇']
```

### 3.3 `tables.js` → `window.TB`（随机表 + 判定难度）
```js
TB.WILD = { '<terrain>': [{n1, n2, name, desc, check, dc, dmg, reward, fight}] }
   // terrain 键覆盖：'森林','山脉','丘陵','平原','沙漠','荒原','沼泽','冰原','海域','地下','废墟'
   // 每张表必须完整覆盖 d20 的 1..20（行不重叠、无空缺）；森林与山脉严格照文档两张表
TB.CITY  = [{n1, n2, name, desc, opts:[{k, label, kind}]}]        // d12，覆盖 1..12
TB.NIGHT = [{n1, n2, name, desc, check, dc, dmg}]                 // d10，覆盖 1..10
TB.TASK_TYPE   = [{n, name, goal}]                                 // d10
TB.TASK_GIVER  = [{n, name, trait}]                                // d8
TB.TASK_PLACE  = [{n1, n2, name}]                                  // d12
TB.TASK_RISK   = [{n, text, kind}]                                 // d10
TB.TASK_ADJ    = []   // 任务名形容词
TB.TASK_NOUN   = []   // 任务名名词
TB.DIFFICULTY  = [{name, dc, level:[a,b]}]                         // 5 档难度
TB.MONTH_WEATHER = {'1':[...], ...}                                // 12 个月各自天气/气温描写（纯文本）
```
所有表必须自洽：`n1..n2` 升序且首尾相连。

### 3.4 `narr.js` → `window.NARR`（叙述引擎 · 纯文本，**零禁用词**）
```js
NARR.scene(kind, ctx) -> string
   // kind ∈ 'travel','arrive','wild','city','camp','night','fight','hit','win','flee','lose',
   //        'inquiry','work','train','shop','temple','ruin','sea','meet','levelup','death','idle'
   // ctx = {terrain, place, month, day, time, weather, pc:{name,race,cls,level,hp,hpMax},
   //        target, npc, roll, dc, ok, dmg, item, gold, task}
   // 返回 1-3 句：环境刺激 -> 身体本能 -> 语言（若有）。禁止内心独白式总结、禁止副词堆砌。
NARR.talk(npc, topic, ctx) -> string      // 简短台词，贴合身份；topic ∈ 'greet','quest','warn','trade','rumor','threat','thanks','refuse'
NARR.openingScript(id) -> [{title, text, opts:[{k,label,kind}]}]   // 4 个开篇各 4-6 个剧本节点
NARR.frag = {...}                          // 可加内部结构，不对外承诺
```

### 3.5 `engine.js` → `window.ENG`（规则引擎）
```js
ENG.seed(n) / ENG.rnd() / ENG.int(a,b) / ENG.pick(arr) / ENG.roll(n,faces) / ENG.d20()
ENG.attrMod(v) -> floor((v-10)/2)
ENG.check(mod, dc, adv) -> {roll, total, dc, ok, crit, fumble}
ENG.opposed(a, b) -> {a, b, ok}
ENG.time = {advance(st, {hours|days|months}), label(st), weekday(st), monthName(st), festival(st)}
ENG.char  = {build(st, picks), attrs, derived(st), addXp(st, n), levelUp(st),
             fatigue(st), hunger(st, kind), encumbrance(st), restShort(st), restLong(st),
             injury(st), deathSave(st)}
ENG.combat = {start(st, foes), round(st, action), end(st)}
ENG.money  = {total(st) -> cp, fmt(cp) -> 'x GP y SP z CP', pay(st, cp), gain(st, cp)}
ENG.shop   = {stock(place, kind), buy(st, item), sell(st, item)}
ENG.rep    = {get(st, org), add(st, org, n), level(v)}
ENG.craft  = {tierOf(v), advance(st, craftName, n)}
ENG.task   = {generate(st, place, level)}   // 用 TB.* 生成完整任务对象
ENG.foe    = {spawn(terrain, level)}        // 用 WD.MONSTERS
ENG.talent = {pool(st, n)}                  // 开局十个 SSS
ENG.applyTalent(st, talent)
ENG.weight(item) / ENG.qualityOf(price)
```
所有改动只写 `st`（state），不直接碰 DOM。

### 3.6 `panels.js` → `window.PANEL`（LaTeX 面板生成，全部返回 `\(...\)` 字符串）
```
PANEL.status(st) / PANEL.card(st) / PANEL.bag(st) / PANEL.combat(st) / PANEL.task(st)
PANEL.shop(st, list) / PANEL.levelup(st) / PANEL.death(st) / PANEL.time(st)
PANEL.world(st) / PANEL.codex(topic) / PANEL.talents(st, list) / PANEL.opening(list)
PANEL.options(list) -> 一串独立 \(...\) 选项气泡（a-e）
PANEL.notice(title, lines, theme)
```
主题键：`gold(奶金) blue(雾蓝) pink(玫粉) lav(薰衣草) matcha(抹茶) coral(珊瑚) orange(蜜橘) lightgold(浅金) grayblue(灰蓝) sand(浅砂)`，取值严格照附录甲。

### 3.7 `create.js` → `window.CREATE`（建卡流程，选项一个个来）
```
CREATE.STEPS = ['race','class','identity','background','talent','gender','name','attrs','align','nation','layer','region','opening','confirm']
CREATE.begin(st) / CREATE.node(st) -> {title, text, opts:[{k,label,kind}], custom:bool}
CREATE.pick(st, k, raw) -> {ok, msg}
```
规则：**进入游戏前的每一步都只列预设选项**（按设定集实际数量从 a 顺排，18 个种族就是 a-r），**没有自定义项**；
打字（`raw`）在除天赋步以外的任何一步都会被退回，提示改用字母选项。
**天赋步**特殊：先按概率抽选——50% 五个 D 级 / 30% 四个 C 级 / 15% 三个 B 级 / 4% 两个 A 级 / 1% 一个 SSS 级，
**抽到的一组全部归角色所有**，同一次抽选内不重复；**可重复抽取五次**，最后收下其中一组。
抽到的天赋不能改写；在天赋步的对话框里输入「剑与魔法」可解锁**自由选择**（五档随便翻，上限四项，可逐条增删）。

### 3.8 `game.js` → `window.GAME`（控制器）```
GAME.state / GAME.boot() / GAME.initLanding() / GAME.start()
GAME.push(html, cls)            // 追加到 #log，只增不减
GAME.turn() / GAME.choose(k, raw) / GAME.showStatus() / GAME.showBag()
GAME.openSide(tab) / GAME.closeSide() / GAME.modal(html) / GAME.save() / GAME.load()
GAME.interpret(st, text)        // 自定义内容的本地规则理解器（AI 的提议也要过 aiResolve 校验）
GAME.aiEvent()                  // 联网专属：向服务端要一件事，敌人/伤害/掉落仍由引擎结算
window.__bootGame = GAME.boot
```

### 3.12 `net.js` → `window.AI`（联网层，最后加载）
```
AI.on / AI.ready / AI.status           // {on, ready, using:'direct'|'bridge', transport, endpoint, host, model, models, busy, calls, fail, err, http}
AI.presets() / AI.preset(id)           // 一键预设：deepseek / deepseek-r / ollama / lmstudio / lan
AI.setConfig({transport,endpoint,model,key,on})   // 每台设备各存各的（localStorage）
AI.settings()                          // 设置弹层：预设 / 通道 / 端点 / 模型 / Key + 保存并测试 + 拉取模型列表
AI.mountChip()                         // 挂「AI 开关」与「AI 设置」两颗按钮（按钮排每回合重建，game.js 会再挂一次）
AI.probe() / AI.models()               // 探测可用通道 / 拉取端点上的模型列表
AI.gateway(kind, ctx, fallback, mode, npc)
                                       // 包在 NARR.scene / NARR.talk 外面：AI 关或不可用时原样返回 fallback；
                                       // 开着时返回带 __ai（最终文字）与 __aiSink（边写边显示）的 String 对象
AI.attach(box, text, st)               // 接上 __aiSink 逐句流式显示；承诺到了替换最终文字
                                       // 块上标记 data-ai = pending | stream | done | failed | empty
AI.event(kind, allowed) / AI.fire(kind, allowed, severity) / AI.options(kind, quest, relations)
AI.custom(text) / AI.improv(kind, name) / AI.snapshot()
GAME.aiMergeOptions(base, ai) / GAME.aiInfo()   // 选项合并规则与内部计数（只读，供测试与排查）
```
两条通道，**每台设备各自配置、各自运行，没有总服务器**：
- **direct（默认，最省事）**：页面直接调 OpenAI 兼容端点。官方 `api.deepseek.com/v1` 支持浏览器直连（回显 Origin，预检允许
  `authorization,content-type`），粘一个 `sk-` Key 即可；本地 Ollama `127.0.0.1:11434/v1`、LM Studio `127.0.0.1:1234/v1`、
  或局域网另一台设备的 `IP:11434/v1` 都走这条。直连模式下提示词组装、禁用词按句拦截、事件/自定义/选项的 JSON 契约校验**全在页面里**。
  端点补协议规则：本机与内网补 `http`，公网域名补 `https`（补错会表现为 `Failed to fetch`）。
- **bridge（可选）**：本机 `server/server.js`，Key 留在服务端、绕开 CORS；文字由服务端过闸。
  接口：`GET /api/health|stats`、`POST /api/narrate|event|fire|options|custom|improv`。

**刷新与选项流程**：`GAME.refreshView(quiet)` / `GAME.refreshClick()` —— 重算派生值并把越界生命/法力/疲劳夹回区间、
重画右侧边栏与底部按钮排与时间行、把「当前未被点的选项组」按 `curOpts` 原样重画；**不追加或改写文字区内容、不重新生成选项、
不解封已封存的组、不消耗回合**，返回 `{before, after, untouched}` 供自检。
联网时 `presentScene` 不先渲染引擎选项：`renderOptsLoading()` 放一张不可点的等待占位（`curOpts` 为空，按键时给明确提示），
模型回来后 `replaceLiveOptions()` 就地把占位换成合并后的四格 + e 自定义；失败或 14 秒超时则就地换成引擎那一组。

**AI 生成选项的契约**（`ROLE_ACTS`，客户端与服务端同一张表）：
```
safe    : forward | inquire | quest | guild | work | shop
bold    : bold | attack | cast | travelfar | longtrip
careful : careful | look | shop | train
rest    : rest | eat | heal | pray | defend
```
模型返回 `{options:[{role,label,act}×4], note}`；`act` 必须与 `role` 相称，否则该格 `act=null`，
网页把它**退回引擎原话**（缺格也补引擎的）。字母顺序 a–e 与 e 自定义不变；战斗 / 濒死 / 开篇剧本的选项不由 AI 写。
**AI 生成事件的契约**：引擎掷触发与量级 → `POST /api/fire` → `{kind,text,foes,dc,dmg,loot,why}`，
敌人必须来自本地地形怪物名单，`dmg` 必须是 `NdM`，`dc` 钳在 8–16；超时或不合规则回退引擎自己的事件表。

契约：**引擎权威**——骰子、数值、判定、物品、战斗全在本地；联网层只换文字。
`game.js` 只在两处留口子：`pushText()` 认 `text.__ai`；底部按钮排重建后调 `AI.mountChip()`。
未开开关时这一层不发任何请求（`file://` 下连探测都不发），行为与单文件版完全一致。
写作禁令表在 `net.js` 里用 `BAN-GATE-BEGIN/END` 标出（构建器对这一段网开一面，只允许一处且限长）；
小桥侧对应 `server/prompt.js`，两边清单有测试盯着不许漂移。

## 4. 状态对象 schema（唯一真源）
```js
st = {
  seed, phase:'landing'|'create'|'playing'|'dead',
  turn:0,
  time:{year:824, month:10, day:12, hour:8},
  place:'霜脊村', region:'北境冰原', terrain:'冰原',
  pc:{ name, gender, raceId, raceName, clsId, clsName, identityId, bgId, alignId,
       level:1, xp:0, xpNext:1500,
       attrs:{str,dex,con,int,wis,cha}, hp:{cur,max}, mp:{cur,max},
       ac, speed, init, skills:[], langs:[], talents:[], spells:[], slots:{},
       status:'健康', fatigue:0, hunger:'饱足', thirst:'饱足',
       injured:[], trauma:[], deeds:[], weight:{cur,max}, born:{year,month,day} },
  money:{cp:0,sp:0,gp:0,pp:0},
  bag:[{id,name,kind,qty,weight,price,desc,equip}],
  team:[{name,race,job,hp,hpMax,status,rel}],
  rep:{},            // {orgName:{value, level}}
  quests:[],         // {id,name,type,giver,place,goal,extra,diff,reward,risk,limit,state}
  crafts:{},         // {craftName:{value, tier}}
  combat:null,       // {foes:[{id,name,hp,hpMax,ac,atk,dmg,status,trait}], round, order, log:[]}
  flags:{}, counters:{}, nodes:[], history:[]
}
```
存档键：`localStorage['jymf_save_v1']`；`history` 存文字浏览区全部区块（刷新后原样恢复，只增不减）。

## 5. 交互规格（沿用上一作已被用户确认的细节）
1. **开始界面**：标题、小字简介（游戏内容/玩法/功能）、`开始游戏`、`继续游戏`（有档才显示）、典籍/设置/关于。
2. **按钮不许是无效键**：每个按钮都必须有真实行为；无内容时必须给出可读提示，不得静默无响应。
3. **回合流程**：先显示本回合剧情/对话与结果 → 分隔线 → 精简状态行 → 右侧边栏渲染状态与物品 → 底部按钮 `查看玩家状态`、`查看物品栏` → 选项 a-e 气泡。
4. **文字浏览区只增不减**：旧内容永不删除，可上滑回看；`history` 持久化。
5. **右侧边栏**：点按钮弹出，带关闭按钮，可切换「状态 / 物品」。
6. **左侧行动节点**：每个回合登记一个节点，悬浮显示提示（回合/节点号/类型/摘要/游戏内时间），点击回到对应文字（纯回顾，不改变任何进度）。
7. 键盘：`1-5` 或 `a-e` 选择、`Esc` 关弹层、`Enter` 提交自定义行动。
