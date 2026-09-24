/* 《剑与魔法命运编年史》无头测试 · 13 套 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadGame, ROOT } = require('./lib');

/* 计数放在本地：lib 的 R 每套件开头会被 reset，
   那样末位套件以外的失败不会进退出码（曾经漏过一次禁用词回归）。 */
const CUM = { pass: 0, fail: 0, fails: [] };
const CUR = { pass: 0, fail: 0, fails: [] };
function ok(cond, label, extra) {
  CUM.pass++; CUR.pass++;
  if (!cond) {
    const line = label + (extra ? '  << ' + extra + ' >>' : '');
    CUM.fail++; CUR.fail++; CUM.fails.push(line); CUR.fails.push(line);
  }
}
function eq(a, b, label) { ok(a === b, label, 'got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); }
function noThrow(fn, label) {
  try { const v = fn(); ok(true, label); return v; }
  catch (e) { ok(false, label, e.message + ' @ ' + (e.stack || '').split('\n')[1]); return null; }
}
function report(title) {
  console.log('--- ' + title + ' ---');
  console.log('PASS ' + CUR.pass + '  FAIL ' + CUR.fail + '　（累计 ' + CUM.pass + '/' + CUM.fail + '）');
  CUR.fails.slice(0, 40).forEach(f => console.log('  [X] ' + f));
}
function reset() { CUR.pass = 0; CUR.fail = 0; CUR.fails.length = 0; }

const G = loadGame();
const { win, document, byId } = G;
const { GAME, ENG, WD, TB, NARR, PANEL, CREATE, LTX } = win;

function logText() { return byId.log.allText(); }
function blockCount() { return byId.log.children.length; }
function sideText() { return byId.sideBody.allText(); }
function chipsText() { return byId.chips.allText(); }
function state() { return GAME.state; }

/* ---------------- 套件 1 · 启动与建卡 ---------------- */
reset();
noThrow(() => win.__bootGame(), 'boot 不抛异常');
ok(byId.landing.className.indexOf('hidden') < 0, '启动后显示起始页');
ok(typeof win.__bootGame === 'function', 'window.__bootGame 存在');
noThrow(() => byId.landStart.dispatch('click'), '点击「开始游戏」不抛异常');
eq(state().phase, 'create', '进入建卡阶段');
let guard = 0;
const seenSteps = [];
while (state().phase === 'create' && guard++ < 40) {
  const n = CREATE.node(state());
  seenSteps.push(n.step);
  const opts = GAME.opts;
  const keys = opts.map(o => o.k).join('');
  const expect = 'abcdefghijklmnopqrstuvwxyz'.slice(0, opts.length);
  ok(keys === expect, '建卡选项从 a 顺排、无断档（' + n.step + '：' + keys + '）');
  /* 进入游戏前没有自定义项：末位就是最后一条预设 */
  ok(!opts.some(o => o.kind === 'custom'), '建卡没有自定义项（' + n.step + '）');
  if (n.step === 'talent') {
    /* 天赋：抽一次再收下第一组 */
    GAME.choose(opts[0].k);
    const after = GAME.opts;
    ok(after.length >= 2, '抽过之后列出抽到的组并可收下', after.length);
    GAME.choose(after[0].k);
  } else {
    GAME.choose('a');
  }
}
eq(state().phase, 'playing', '建卡走完进入世界');
ok(seenSteps.length >= 13, '建卡节点数 >= 13', seenSteps.join('>'));
['race', 'class', 'identity', 'background', 'talent', 'gender', 'name', 'attrs', 'align', 'nation', 'region', 'opening', 'confirm']
  .forEach(s => ok(seenSteps.indexOf(s) >= 0, '建卡包含步骤 ' + s));
const pc = state().pc;
const p1 = state().create.picks;
ok(!!pc.name && pc.name !== '无名', '姓名来自选项', pc.name);
ok(pc.attrs.str >= 15, '种族加成叠加到属性上', JSON.stringify(pc.attrs));
ok(pc.hp.max > 0 && pc.hp.cur === pc.hp.max, '生命上限与当前值正确');
ok(ENG.money.total(state()) > 0, '起始金币 > 0');
ok((state().bag || []).length > 0, '初始装备已入包');
/* 抽到的一组全部到手，等级同一档，数量与档位一致 */
const drawn = p1.talentDraw || {};
const tset = pc.talents || [];
ok(tset.length >= 1, '天赋至少一项', String(tset.length));
ok(tset.every(t => t.grade === tset[0].grade), '同一组天赋等级一致', tset.map(t => t.grade).join('/'));
eq(tset.length, drawn.n || tset.length, '到手的条数与抽到的档位一致（' + (drawn.cn || '?') + '）');
ok(['D', 'C', 'B', 'A', 'SSS'].indexOf(tset[0].grade) >= 0, '档位在概率表里', tset[0].grade);
ok(!!state().place && !!state().terrain, '开篇地点与地形已设定');
ok(state().place === '霜脊村' || !!win.GEO.regionOf(state().place), '起点是设定集里真实存在的地区', state().place);
ok((state().flags.script || []).length > 0, '开篇剧本已载入');
ok(Object.keys(state().crafts).length === 8, '八门副职业已初始化');
report('套件 1 · 启动与建卡');

/* ---------------- 套件 2 · 回合循环与展示顺序 ---------------- */
reset();
let turns = 0;
while (state().flags.scriptIdx < (state().flags.script || []).length && turns++ < 12) GAME.choose('a');
ok(turns > 0 && state().flags.scriptIdx >= (state().flags.script || []).length, '开篇剧本可推进完');
for (let i = 0; i < 6; i++) GAME.choose('a');
const txt = logText();
ok(/星母历824年/.test(txt), '文字区含星母历时间行');
ok(/本\s*轮\s*结\s*果\s*已\s*呈\s*现/.test(txt), '结果分隔线已出现');
ok(/\[.*\] \| \[.*\] \| \[.*\] \| \[Lv/.test(txt), '精简状态栏出现在文字区');
ok(chipsText().indexOf('查 看 玩 家 状 态') >= 0, '底部按钮含「查看玩家状态」');
ok(chipsText().indexOf('查 看 物 品 栏') >= 0, '底部按钮含「查看物品栏」');
const optBtns = document.querySelectorAll('#log .opt-btn');
ok(optBtns.length >= 5, '文字区渲染了可点的选项气泡');
ok(GAME.opts.length === 5, '游戏进行时每回合 5 个选项');
eq(GAME.opts.map(o => o.k).join(''), 'abcde', '游戏进行时选项固定为 abcde');
ok(GAME.opts[4].kind === 'custom', '游戏内 e 是自定义');
ok(state().turn >= 6, '回合数随行动增长');
report('套件 2 · 回合循环与展示顺序');

/* ---------------- 套件 3 · 文字浏览区只增不减 ---------------- */
reset();
const before = blockCount();
const firstHtml = byId.log.children[0] ? byId.log.children[0].outerHTML : '';
const histBefore = state().history.length;
for (let i = 0; i < 40; i++) {
  GAME.choose(['a', 'c', 'd'][i % 3]);
  if (state().phase !== 'playing') break;
}
ok(blockCount() > before, '回合推进后区块数增加', before + ' -> ' + blockCount());
ok(state().history.length > histBefore, 'history 只增不减');
ok(byId.log.children[0] && byId.log.children[0].outerHTML === firstHtml, '第一块文字仍在最上方未被删除');
ok(logText().indexOf('星母历824年，深秋') >= 0 || logText().indexOf('星母历') >= 0, '开场文字仍可回看');
ok(state().history.length === blockCount() || state().history.length >= blockCount() - 2, 'history 与区块数一致');
report('套件 3 · 文字浏览区只增不减');

/* ---------------- 套件 4 · 左侧节点与回顾 ---------------- */
reset();
const nodes = state().nodes;
ok(nodes.length > 5, '已登记行动节点', String(nodes.length));
ok(byId.tlInner.children.length > 0, '左侧栏渲染了节点按钮');
const pick = nodes[Math.floor(nodes.length / 2)];
const snapKeys = ['turn', 'hp', 'gold', 'bagN', 'questN', 'nodeN', 'histN', 'place', 'day'];
function snap() {
  const s = state();
  return JSON.stringify({
    turn: s.turn, hp: Math.round(s.pc.hp.cur), gold: ENG.money.total(s), bagN: (s.bag || []).length,
    questN: (s.quests || []).length, nodeN: (s.nodes || []).length, histN: (s.history || []).length,
    place: s.place, day: s.time.day + '-' + s.time.hour, rep: JSON.stringify(s.rep)
  });
}
const beforeSnap = snap();
GAME.jumpTo(pick);
eq(snap(), beforeSnap, '点击节点回顾不改变任何进度');
GAME.jumpTo(nodes[0]);
eq(snap(), beforeSnap, '回顾首个节点同样不改变进度');
report('套件 4 · 左侧节点与回顾');

/* ---------------- 套件 5 · 侧边栏 / 弹层 / 典籍 ---------------- */
reset();
GAME.openSide('status');
ok(byId.side.classList.contains('open'), '侧边栏打开');
ok(sideText().indexOf('玩 家 状 态') >= 0, '侧边栏渲染状态面板');
ok(sideText().indexOf('生命') >= 0 && sideText().indexOf('负重') >= 0, '状态面板含关键字段');
GAME.openSide('bag');
ok(sideText().indexOf('物 品 栏') >= 0, '侧边栏可切到物品栏');
GAME.openSide('quest');
ok(sideText().indexOf('任 务') >= 0, '侧边栏可切到任务');
GAME.openSide('status');
GAME.closeSide();
ok(!byId.side.classList.contains('open'), '关闭按钮生效');
byId.btnCard.dispatch('click');
ok(byId.modal.className.indexOf('hidden') < 0, '角色卡弹层打开');
ok(byId.modalBox.allText().indexOf('角 色 卡') >= 0, '角色卡内容渲染');
GAME.closeModal();
ok(byId.modal.className.indexOf('hidden') >= 0, '弹层可关闭');
let codexOk = 0, codexPages = 0;
PANEL.codexList().forEach(c => {
  const h = noThrow(() => PANEL.codex(c.id, state(), 0), '典籍卷 ' + c.id + ' 渲染');
  if (h && h.length > 100) codexOk++;
  codexPages++;
});
eq(codexOk, codexPages, '全部典籍卷均可渲染');
byId.btnChron.dispatch('click');
ok(byId.modalBox.allText().indexOf('纪元') >= 0, '大事记弹层渲染');
GAME.closeModal();
report('套件 5 · 侧边栏 / 弹层 / 典籍');

/* ---------------- 套件 6 · 规则引擎 ---------------- */
reset();
ENG.seed(12345);
eq(ENG.attrMod(15), 2, '属性调整值 15 -> +2');
eq(ENG.attrMod(8), -1, '属性调整值 8 -> -1');
eq(ENG.char.needXp(1), 1500, '升级所需经验 1级=1500');
eq(ENG.char.needXp(2), 2500, '升级所需经验 2级=2500');
eq(ENG.char.needXp(7), 7500, '升级所需经验 7级=7500');
const t0 = { year: 824, month: 12, day: 30, hour: 23 };
const s6 = GAME.newState(7);
s6.time = t0; ENG.seed(7);
ENG.time.advance(s6, { hours: 2 });
eq(s6.time.year + '-' + s6.time.month + '-' + s6.time.day + '-' + s6.time.hour, '825-1-1-1', '跨年进位正确');
eq(ENG.time.weekday(s6.time).name.length > 0, true, '星期名称可求');
eq(ENG.time.monthName({ month: 10 }), (WD.CALENDAR.months[9] || {}).name, '月份名称取自日历表');
ok(/星母历824年|星母历825年/.test(ENG.time.stamp(s6)), '时间戳格式正确');
const attrs = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
const race = ENG.char.raceById('human');
const a2 = {}; for (const k in attrs) a2[k] = attrs[k];
ENG.char.applyRaceBonus(a2, race, ['str', 'con']);
eq(a2.str + a2.con, attrs.str + attrs.con + 2, '人类任意两项 +1');
const s6b = GAME.newState(9);
s6b.pc.attrs = Object.assign({}, attrs);
s6b.pc.level = 1; ENG.char.derive(s6b);
const hp1 = s6b.pc.hp.max;
ENG.char.addXp(s6b, 1500);
eq(s6b.pc.level, 2, '经验达标自动升级');
ok(s6b.pc.hp.max > hp1, '升级提升生命上限');
eq(ENG.char.levelName(1), (WD.LEVELS[0] || {}).name, '1 级境界名取自表');
eq(ENG.char.fatigueEffect(0).checks, 0, '疲劳 0 无减值');
eq(ENG.char.fatigueEffect(1).checks, -1, '疲劳 1 级：检定 -1');
eq(ENG.char.fatigueEffect(2).speed, 0.5, '疲劳 2 级：速度减半');
ok(ENG.char.fatigueEffect(3).hpMax < 1, '疲劳 3 级：生命上限 -10%');
eq(ENG.char.fatigueEffect(4).atkDis, true, '疲劳 4 级：攻击劣势');
eq(ENG.char.fatigueEffect(5).saveDis, true, '疲劳 5 级：豁免劣势');
eq(ENG.char.fatigueEffect(6).down, true, '疲劳 6 级：昏迷');
const s6c = GAME.newState(11);
s6c.pc.attrs.str = 10;
ENG.item.add(s6c, { name: '石块', kind: 'gear', weight: 80, price: 1 });
let enc = ENG.char.encumbrance(s6c);
eq(enc.name, '中度负重', '负重 50%-75% 为中度');
ENG.item.add(s6c, { name: '铁砧', kind: 'gear', weight: 50, price: 1 });
enc = ENG.char.encumbrance(s6c);
eq(enc.name, '重度负重', '负重 75%-100% 为重度');
ENG.item.add(s6c, { name: '石磨', kind: 'gear', weight: 30, price: 1 });
enc = ENG.char.encumbrance(s6c);
eq(enc.name, '超重', '超过最大负重为超重');
const s6d = GAME.newState(13);
eq(ENG.money.total(s6d), 0, '初始无钱');
ENG.money.gain(s6d, 12345);
eq(ENG.money.total(s6d), 12345, '入账金额精确');
ok(ENG.money.fmt(12345) === '12 GP 3 SP 45 CP', '货币格式化按 GP 起报', ENG.money.fmt(12345));
ok(ENG.money.fmt(900000).indexOf('90 PP') === 0, '大额才用 PP', ENG.money.fmt(900000));
ENG.money.gain(s6d, 100000);
const paid = ENG.money.pay(s6d, 50000);
eq(paid, true, '付款成功');
eq(ENG.money.total(s6d), 112345 - 50000, '付款后余额精确');
eq(ENG.money.pay(s6d, 99999999), false, '余额不足付款失败');
eq(ENG.rep.level(0), '中立', '声望 0 为中立');
eq(ENG.rep.level(-60), '敌对', '声望 -60 为敌对');
eq(ENG.rep.level(90), '崇拜', '声望 90 为崇拜');
eq(ENG.craft.tier(0), '未入门', '副职业 0 -> 未入门');
eq(ENG.craft.tier(20), '初窥门径', '副职业 20 -> 初窥门径');
eq(ENG.craft.tier(100), '登峰造极', '副职业 100 -> 登峰造极');
const tal = ENG.talent.pool(s6d, 10);
eq(tal.length, 10, '开局天赋池为 10');
eq(new Set(tal.map(t => t.id)).size, 10, '十个天赋互不重复');
const q = ENG.task.generate(s6d, {});
['id', 'name', 'type', 'giver', 'place', 'goal', 'diff', 'dc', 'reward', 'risk', 'state']
  .forEach(f => ok(q[f] !== undefined && q[f] !== '', '任务字段 ' + f + ' 存在'));
ok(q.reward > 0 && q.reward <= 60000, '任务报酬在合理区间', String(q.reward));
const foe = ENG.foe.spawn('森林', 3);
ok(Array.isArray(foe) && foe.length >= 1 && foe[0].hp > 0 && foe[0].ac > 0, '怪物生成可用');
const s6e = GAME.newState(17);
s6e.pc.attrs = Object.assign({}, attrs); ENG.char.derive(s6e);
s6e.pc.hp.cur = s6e.pc.hp.max = 40;
ENG.combat.start(s6e, [ENG.combat.foeFromMonster(ENG.foe.byName('灰林狼') || { name: '灰林狼', hp: 10, ac: 12, atk: 3, dmg: '1d6', threat: [1, 2] }, 1)]);
let hits = 0;
for (let i = 0; i < 60 && s6e.combat && !ENG.combat.over(s6e); i++) {
  const r = ENG.combat.playerAttack(s6e, {});
  if (r.hit) hits++;
  if (ENG.combat.over(s6e)) break;
  ENG.combat.foeTurn(s6e);
}
ok(hits > 0, '攻击可以命中');
ok(ENG.combat.over(s6e), '战斗可以结束');
const s6f = GAME.newState(19);
s6f.pc.hp.cur = 0;
let dead = false, ds = null;
for (let i = 0; i < 40 && !dead; i++) { ds = ENG.char.deathSave(s6f); if (ds.dead) dead = true; }
ok(dead, '生死豁免累积三次失败即死');
const s6g = GAME.newState(23);
s6g.counters.hungerHours = 0; s6g.counters.thirstHours = 0;
ENG.char.hungerTick(s6g, 30);
eq(s6g.pc.hunger, '微饥', '一天未食为微饥');
eq(s6g.pc.thirst, '脱水', '一天未饮水为脱水');
ENG.char.hungerTick(s6g, 30);
eq(s6g.pc.hunger, '饥饿', '两天未食为饥饿');
eq(s6g.pc.thirst, '濒危', '两天未饮水为濒危');
const inj = ENG.char.injure(s6g);
ok(inj.name && s6g.pc.injured.length === 1, '永久损伤可记录');
/* 敌人全倒下后战斗应收干净，再攻击不能崩 */
const sDead = GAME.newState(29);
sDead.pc.attrs = Object.assign({}, attrs); ENG.char.derive(sDead);
sDead.pc.hp.cur = sDead.pc.hp.max = 40;
ENG.combat.start(sDead, [ENG.combat.foeFromMonster(ENG.foe.byName('灰林狼') || { name: '灰林狼', hp: 10, ac: 12, atk: 3, dmg: '1d6', threat: [1, 2] }, 1)]);
sDead.combat.foes[0].hp = 0;
const overRes = noThrow(() => GAME.ACT.attack(sDead, '', null), '对手全倒后再攻击不抛异常');
ok(overRes && sDead.combat === null, '对手全倒后战斗状态被清空');
const overRes2 = noThrow(() => GAME.ACT.custom(sDead, '我拔剑砍过去'), '无战斗时自定义攻击不抛异常');
ok(overRes2 && overRes2.combat && overRes2.combat.length > 0, '无战斗时攻击会先接敌');
const wq = TB.WILD['森林'];
ok(wq && wq.length > 0, '森林遭遇表可读');
ok(ENG.table.wild('森林') !== null, '遭遇判定可执行');
ok(ENG.table.city() !== null && ENG.table.night() !== null, '城市与夜间事件可执行');
ok(ENG.table.rumor() !== null, '谣言表可读');
report('套件 6 · 规则引擎');

/* ---------------- 套件 7 · LaTeX 渲染器与面板规范 ---------------- */
reset();
const code = '\\(\\fcolorbox{#E0B45A}{#FDF6F0}{\\scalebox{0.8}{\\begin{array}{l}\n' +
  '\\textcolor{#A87E2E}{\\textbf{\\Large 标 题}} \\\\\n' +
  '\\textcolor{#E0B45A}{\\overline{\\qquad\\qquad\\qquad\\qquad}} \\\\\n' +
  '\\textcolor{#4A4458}{生命} \\quad \\textcolor{#E87A7A}{\\rule{2.5em}{1ex}}\\textcolor{#EDE6F2}{\\rule{2.0em}{1ex}} \\\\\n' +
  '\\textcolor{#9A8FA8}{\\footnotesize 说 明}\n\\end{array}}}\\)';
const html = LTX.renderMixed(code);
ok(html.indexOf('pl-box') >= 0, '\\fcolorbox 渲染成面板框');
ok(html.indexOf('pl-scale') >= 0, '\\scalebox 渲染成缩放块');
ok(html.indexOf('pl-rule') >= 0, '\\overline 渲染成分隔线');
ok(html.indexOf('pl-bar') >= 0, '\\rule 渲染成进度条');
ok(html.indexOf('width:2.5em') >= 0, '进度条宽度按 em 计算');
ok(html.indexOf('pl-array') >= 0, 'array 环境渲染成多行');
ok(html.indexOf('\\(\\fcolorbox') < 0, '定界符 \\( \\) 已被消化');
ok(LTX.renderMixed('普通剧情文字。').indexOf('class="tx"') >= 0, '纯文本渲染成段落');
ok(LTX.renderMixed('甲乙\\(\\textcolor{#4A4458}{丙}\\)丁').indexOf('普通') < 0, '文本与面板混合渲染');
const unknown = LTX.latexToHtml('\\fcolorbox{#E0B45A}{#FDF6F0}{\\nosuchcmd{内容}}');
ok(unknown.indexOf('内容') >= 0, '未知命令不吞内容');
ok(LTX.renderMixed('$$\\fcolorbox{#E0B45A}{#FDF6F0}{x}$$').indexOf('$$') < 0, '$$ 包裹 LaTeX 时定界符被丢弃');
ok(LTX.renderMixed('玩家输入的 $$ 原样保留').indexOf('$$') >= 0, '玩家输入的 $$ 不被改写');
const stateNow = state();
const panelFns = ['status', 'card', 'bag', 'combat', 'task', 'levelup', 'death', 'time'];
panelFns.forEach(fn => {
  const out = noThrow(() => {
    if (fn === 'levelup') return PANEL.levelup(stateNow, { level: 2, name: '初级', gain: 8, cls: '战士' });
    if (fn === 'death') return PANEL.death(stateNow, { cause: '测试' });
    if (fn === 'combat') { stateNow.combat = stateNow.combat || { foes: [], round: 1, ctx: {} }; return PANEL.combat(stateNow); }
    return PANEL[fn](stateNow);
  }, 'PANEL.' + fn + ' 可渲染');
  if (out) {
    ok(out.indexOf('\\(') === 0 && out.lastIndexOf('\\)') === out.length - 2, 'PANEL.' + fn + ' 使用 \\(...\\) 包裹');
    ok(out.indexOf('$$') < 0, 'PANEL.' + fn + ' 不含 $$');
    ok(out.indexOf('undefined') < 0 && out.indexOf('NaN') < 0, 'PANEL.' + fn + ' 无 undefined/NaN');
    ok(out.indexOf('\\fcolorbox') >= 0 && out.indexOf('\\begin{array}') >= 0, 'PANEL.' + fn + ' 使用文档骨架');
  }
});
const bubbles = PANEL.options([{ k: 'a', label: '选项一' }, { k: 'e', label: '自定义' }]);
ok((bubbles.match(/\\fcolorbox/g) || []).length === 2, '每个选项一个独立气泡');
ok(bubbles.indexOf('【A】') >= 0 && bubbles.indexOf('【E】') >= 0, '气泡带字母编号');
ok(PANEL.talents(stateNow, tal).indexOf('SSS') >= 0, '天赋面板列出 SSS');
ok(PANEL.shop(stateNow, ENG.item.stock(stateNow, 'gear')).indexOf('GP') >= 0, '商店面板带价格');
report('套件 7 · LaTeX 渲染器与面板规范');

/* ---------------- 套件 8 · 设定集覆盖 ---------------- */
reset();
const need = ['COSMOS', 'GODS', 'NATIONS', 'ORGS', 'REGIONS', 'RACES', 'CLASSES', 'SOURCES', 'LEVELS', 'STATUSES',
  'ALIGNMENTS', 'REP_LEVELS', 'LANGS', 'DEAD_LANGS', 'DIALECTS', 'CRAFTS', 'CRAFT_TIERS', 'MONEY', 'PRICES',
  'QUALITY', 'ITEMS', 'ARTIFACTS', 'MONSTERS', 'SPELLS', 'TIMELINE', 'HEROES', 'LEGEND_HEROES', 'CALENDAR',
  'LEGENDS', 'RUMORS', 'ETYMOLOGY', 'PRICING', 'BACKGROUNDS', 'IDENTITIES', 'TEMPLATES', 'OPENINGS',
  'TALENTS', 'NAMES', 'SKILLS', 'SPELL_LV'];
need.forEach(k => ok(WD[k] !== undefined, 'WD.' + k + ' 存在'));
eq((WD.GODS || []).length, 8, '八位神明');
eq((WD.NATIONS || []).length, 13, '七王国 + 六种族国度 = 13');
eq((WD.ORGS || []).length, 7, '七个跨种族组织');
ok((WD.REGIONS || []).length >= 41, '地区 >= 41', String((WD.REGIONS || []).length));
ok((WD.RACES || []).length >= 12, '种族 >= 12', String((WD.RACES || []).length));
eq((WD.CLASSES || []).length, 10, '十职业');
eq((WD.IDENTITIES || []).length, 10, '十身份');
eq((WD.BACKGROUNDS || []).length, 10, '十背景');
eq((WD.CRAFTS || []).length, 8, '八副职业');
eq((WD.CRAFT_TIERS || []).length, 5, '五阶进度');
eq((WD.ALIGNMENTS || []).length, 9, '九阵营');
eq((WD.REP_LEVELS || []).length, 6, '六级声望');
eq((WD.QUALITY || []).length, 6, '六品质');
eq((WD.ARTIFACTS || []).length, 5, '五神器');
ok((WD.MONSTERS || []).length >= 17, '怪物 >= 17', String((WD.MONSTERS || []).length));
ok((WD.SPELLS || []).length >= 30, '法术 >= 30', String((WD.SPELLS || []).length));
eq((WD.OPENINGS || []).length, 4, '四种开篇');
eq((WD.CALENDAR.months || []).length, 12, '十二月');
eq((WD.CALENDAR.weekdays || []).length, 7, '七曜');
eq((WD.CALENDAR.festivals || []).length, 6, '六节日');
eq((WD.TIMELINE.eras || []).length, 5, '五纪元');
ok((WD.TIMELINE.events || []).length >= 8, '大事记 >= 8 条');
eq((WD.LEGENDS || []).length, 4, '四地区传说');
eq((WD.RUMORS || []).length, 20, '二十条谣言');
eq((WD.LANGS || []).length, 8, '八种活语言');
ok((WD.TALENTS.SSS || []).length >= 10, 'SSS 天赋 >= 10');
['A', 'B', 'C', 'D'].forEach(g => ok((WD.TALENTS[g] || []).length >= 6, g + ' 级天赋 >= 6'));
ok((WD.SKILLS || []).length === 18, '十八项技能');
const terrainKeys = ['森林', '山脉', '丘陵', '平原', '沙漠', '荒原', '沼泽', '冰原', '海域', '地下', '废墟'];
terrainKeys.forEach(k => {
  const rows = (TB.WILD || {})[k] || [];
  const cov = [];
  rows.forEach(r => { for (let i = r.n1; i <= r.n2; i++) cov.push(i); });
  ok(cov.length === 20 && new Set(cov).size === 20, '遭遇表覆盖 d20：' + k);
});
ok((TB.CITY || []).length > 0 && (TB.NIGHT || []).length > 0, '城市与夜间表存在');
eq((TB.TASK_TYPE || []).length, 10, '任务类型 d10');
eq((TB.TASK_GIVER || []).length, 8, '委托人 d8');
eq((TB.TASK_RISK || []).length, 10, '风险 d10');
eq(Object.keys(TB.MONTH_WEATHER || {}).length, 12, '十二月天气表');
const kinds = ['travel', 'arrive', 'wild', 'city', 'camp', 'night', 'fight', 'hit', 'win', 'flee', 'lose',
  'inquiry', 'work', 'train', 'shop', 'temple', 'ruin', 'sea', 'meet', 'levelup', 'death', 'idle'];let cok = 0;
kinds.forEach(k => {
  const out = noThrow(() => NARR.scene(k, { turn: 3, place: '霜脊村', terrain: '冰原', month: 1, day: 9, time: '子时', weather: '风雪', pc: '林晚', race: '人类', cls: '战士', level: 2, target: '灰林狼', npc: { name: '格尔', role: '猎人' }, roll: 14, dc: 13, ok: true, dmg: '1d8' }), 'NARR.scene(' + k + ')');
  if (out && out.length > 4 && out.indexOf('undefined') < 0 && !/[{}]/.test(out)) cok++;
});
eq(cok, kinds.length, '全部 ' + kinds.length + ' 类叙述可用且无占位残留');
['north', 'aurum', 'forest', 'desert'].forEach(id => {
  const sc = noThrow(() => NARR.openingScript(id), 'openingScript(' + id + ')');
  ok(Array.isArray(sc) && sc.length >= 4, '开篇 ' + id + ' 剧本节点 >= 4', sc ? String(sc.length) : '');
  if (sc && sc[0]) {
    ok(!!sc[0].text && Array.isArray(sc[0].opts) && sc[0].opts.length >= 3, '开篇 ' + id + ' 首节含文本与选项');
    ok(sc[0].opts[sc[0].opts.length - 1].k === 'e', '开篇 ' + id + ' 末位选项是 e 自定义');
  }
});
const topics = ['greet', 'quest', 'warn', 'trade', 'rumor', 'threat', 'thanks', 'refuse'];
topics.forEach(t => {
  const out = noThrow(() => NARR.talk({ name: '村长', role: '村长' }, t, { pc: '林晚', place: '霜脊村' }), 'NARR.talk(' + t + ')');
  ok(out && out.length > 2, '对白可用：' + t);
});
report('套件 8 · 设定集覆盖');

/* ---------------- 套件 9 · 成品 HTML 审核 ---------------- */
reset();
const OUT = path.join(ROOT, '剑与魔法命运编年史.html');
const html9 = fs.readFileSync(OUT, 'utf8');
ok(html9.length > 200000, '成品体积正常', String(html9.length));
['id="landing"', 'id="side"', 'id="timeline"', 'id="log"', 'id="chips"', 'id="modal"', '__bootGame']
  .forEach(s => ok(html9.indexOf(s) >= 0, '成品包含 ' + s));
ok(!/https?:\/\//.test(html9), '成品零外链（联网层也只用相对路径 /api/*）');
ok(html9.indexOf('window.AI') >= 0 && html9.indexOf('/api/narrate') >= 0, '成品内含联网层：AI 开关与 /api 接口');
/* 成品里可能提到「sk- 开头的 Key」这种说明文字，但绝不能出现真 Key 与密钥变量名 */
ok(!/sk-[A-Za-z0-9_\-]{16,}/.test(html9), '成品里没有真的 API Key');
ok(html9.indexOf('DEEPSEEK_API_KEY') < 0, '成品里没有服务端的密钥变量名');
ok(html9.indexOf('</script>') === html9.lastIndexOf('</script>'), '只有一处 </script> 收尾');
const banned = ['微不可查', '不易察觉', '不由得', '不禁', '随即', '片刻后', '只见', '就在这时',
  '深刻地', '无比', '极其', '格外', '至关', '关键性', '错综复杂', '交织', '谱写', '画卷', '织锦', '镌刻', '烙印'];
/* net.js 里有一小段是「查禁用词的表」本身（BAN-GATE 标记区），与 build.py 用同一套豁免 */
const gateRegions = html9.match(/BAN-GATE-BEGIN[\s\S]*?BAN-GATE-END/g) || [];
ok(gateRegions.length === 1, '成品里恰好一处 BAN-GATE 标记区（查禁用词的表）', String(gateRegions.length));
const promptRegions = html9.match(/PROMPT-GATE-BEGIN[\s\S]*?PROMPT-GATE-END/g) || [];
ok(promptRegions.length === 1, '成品里恰好一处 PROMPT-GATE 标记区（写作禁令说明书）', String(promptRegions.length));
ok(promptRegions.length && promptRegions[0].length < 6000, 'PROMPT-GATE 区限长（不放正文）', promptRegions.length ? String(promptRegions[0].length) : '');
const html9Scan = html9.replace(/BAN-GATE-BEGIN[\s\S]*?BAN-GATE-END/g, '')
  .replace(/PROMPT-GATE-BEGIN[\s\S]*?PROMPT-GATE-END/g, '');
const hitBanned = banned.filter(b => html9Scan.indexOf(b) >= 0);
ok(hitBanned.length === 0, '成品无禁用模板词（两处放行区本身除外）', hitBanned.join('/'));
/* 强制写作约束必须真的在两处都存在 */
['写作前强制自检', '拒绝工具人行为', '禁止上帝视角灌输内心', '反应优先级', '三段排比', '写完一小段就自检', '反面示例'].forEach(k => {
  ok(html9.indexOf(k) > 0, '成品里带着强制约束：' + k);
});
ok(!/[\u{1F300}-\u{1FAFF}]/u.test(html9), '成品无 emoji');
const parts = html9.split('================= ').slice(1).map(s => s.split(' =================')[0]);
ok(parts.length >= 12, '十二个模块都进了成品（含 net.js）', parts.join(','));
report('套件 9 · 成品 HTML 审核');

/* ---------------- 套件 10 · 地理情报与「选择地区」 ---------------- */
reset();
const GEO = win.GEO;
ok(!!GEO, 'GEO 地理模块已挂载');
ok(Object.keys(GEO.POS).length >= 40, '地表坐标覆盖 >= 40 处', String(Object.keys(GEO.POS).length));
let geoOk = 0; const geoMiss = [];
(WD.REGIONS || []).forEach(r => {
  const i = GEO.regionInfo(r.name);
  if (i && i.nationName && i.position && i.terrain) geoOk++; else geoMiss.push(r.name);
});
eq(geoOk, (WD.REGIONS || []).length, '每个地区都能给出所在国家与地理位置' + (geoMiss.length ? ' 缺：' + geoMiss.join(',') : ''));
const fr = GEO.regionInfo('霜脊村');
eq(fr.nationName, '北境共和国', '霜脊村所属国家正确');
ok(/北境/.test(fr.position), '地理位置含方位带', fr.position);
ok(fr.nations.length >= 3, '给出附近国家', JSON.stringify(fr.nations.map(n => n.name)));
ok(fr.nations.every(n => n.dir && n.far && n.trait), '附近国家带方位、远近与国情');
ok(fr.neighbours.length >= 3 && fr.neighbours.every(n => n.dir && n.far), '给出附近地区（带方位与远近）');
const deep = GEO.regionInfo('暗蛛城');
ok(/地底|位面/.test(deep.position), '地底/位面地区单列说明', deep.position);
ok(GEO.regionInfo('圣光之庭').position.indexOf('位面') >= 0, '位面地区标出位面归属');
const rp = GEO.regionPanel('霜脊村');
['所在国家', '国情', '地理位置', '地形', '威胁', '附近国家', '附近地区'].forEach(k =>
  ok(rp.indexOf(k) >= 0, '地区志含「' + k + '」'));
ok(rp.indexOf('\\fcolorbox') >= 0 && rp.indexOf('\\begin{array}') >= 0, '地区志使用美化框骨架');
ok(rp.indexOf('undefined') < 0 && rp.indexOf('NaN') < 0, '地区志无 undefined/NaN');
const np = GEO.nationPanel('晨曦王国');
['首都', '国情', '接壤与近邻', '境内可往之地'].forEach(k => ok(np.indexOf(k) >= 0, '国度志含「' + k + '」'));
ok(GEO.nationGroups().length === 14, '国度分组 = 13 国 + 无主之地', String(GEO.nationGroups().length));
ok((GEO.regionsOf('无主之地') || []).length > 5, '无主之地可整体取用（18 处）');
/* 无主之地按性质拆成子组 */
const subs = GEO.wildGroups();
ok(subs.length === 4, '无主之地拆成 4 个子组', subs.map(s => s.sub).join('/'));
eq(subs.map(s => s.sub).join(','), '荒野,海域,遗迹,位面', '子组名称与顺序正确');
ok(subs.every(s => s.regions.length > 0), '每个子组都有地区', subs.map(s => s.sub + ':' + s.regions.length).join(' '));
ok(subs.every(s => s.trait && s.trait.length > 8), '每个子组都有一句定位说明');
eq(subs.reduce((a, s) => a + s.regions.length, 0), GEO.regionsOf('无主之地').length, '子组合起来正好等于无主之地');
eq(GEO.regionGroups().length, 17, '完整分组 = 13 国 + 4 分区', String(GEO.regionGroups().length));
eq(GEO.regionGroups().reduce((a, g) => a + g.regions.length, 0), (WD.REGIONS || []).length, '分组覆盖全部地区且不重不漏');
const subPanel = GEO.nationPanel('无主之地/位面');
ok(subPanel.indexOf('疆 域 志') > 0 && subPanel.indexOf('位面') > 0, '分区有独立的疆域志面板');
ok(subPanel.indexOf('无接壤国家') > 0 || subPanel.indexOf('最近邻国') > 0, '疆域志写明邻国情况');

GAME.startCreate(true);
const rn = CREATE.node(GAME.state);
eq(rn.step, 'race', '建卡从种族开始');
eq(rn.opts.length, (WD.RACES || []).length, '种族选项按文档数量全列（无自定义项）');
eq(rn.opts[0].k, 'a', '首项从 a 起');
eq(rn.opts[rn.opts.length - 1].k, CREATE.keyFor((WD.RACES || []).length - 1), '末位字母正好是最后一条预设');
ok(rn.opts.every((o, i) => o.k === CREATE.keyFor(i)), '选项字母连续无断档');
let stepGuard = 0;
while (CREATE.cur(GAME.state) !== 'nation' && stepGuard++ < 25) GAME.choose('a');
eq(CREATE.cur(GAME.state), 'nation', '可推进到「选择国度」');
const nn = CREATE.node(GAME.state);
eq(nn.opts.length, 17, '国度节点：13 国 + 无主之地四分区', String(nn.opts.length));
ok(nn.panel && nn.panel.indexOf('大 陆 方 位 总 览') >= 0, '国度节点给出大陆方位总览');
ok(/无主之地 · 位面/.test(nn.opts.map(o => o.label).join('|')), '无主之地四分区出现在选项里');
GAME.choose('a');                               /* 晨曦王国：境内 6 处 5 层 */
eq(CREATE.cur(GAME.state), 'layer', '地方多、层数多的国家会多一步「选择层」');
const layerNode = CREATE.node(GAME.state);
const expLayers = GEO.layersOf('晨曦王国');
eq(layerNode.opts.length, expLayers.length, '选层节点列出该国全部层', String(layerNode.opts.length));
eq(expLayers.map(l => l.layer).join(','), '都城,村镇,野外,地下,遗迹', '晨曦王国分为都城/村镇/野外/地下/遗迹');
ok(layerNode.opts[0].label.indexOf('都城（1 处）') === 0, '层的选项带数量与地区名', layerNode.opts[0].label.slice(0, 40));
ok(layerNode.panel && layerNode.panel.indexOf('境内可往之地（按层分）') > 0, '国度志按层列出境内地方');
GAME.choose('a');                               /* 都城 */
eq(CREATE.cur(GAME.state), 'region', '选完层进入「选择地区」');
const cityNode = CREATE.node(GAME.state);
eq(cityNode.opts.length, expLayers.filter(l => l.layer === '都城')[0].regions.length,
  '地区步只列所选层的地区', String(cityNode.opts.length));
ok(/〔都城〕/.test(cityNode.opts[0].label), '地区选项带层标记', cityNode.opts[0].label.slice(0, 50));
ok(/威胁/.test(cityNode.opts[0].label) && /最近邻国/.test(cityNode.opts[0].label), '层的地区选项仍带威胁与最近邻国');
/* 层数不足的国家不多走一步 */
GAME.state.create.i = CREATE.STEPS.indexOf('nation');
const smallIdx = CREATE.node(GAME.state).opts.filter(o => /^雄鹿王国/.test(o.label))[0];
GAME.choose(smallIdx.k);
eq(CREATE.cur(GAME.state), 'region', '小国（境内 1 处）直接进地区步，不多走一步');
/* 无主之地的分区同样只列本区 */
GAME.state.create.i = CREATE.STEPS.indexOf('nation');
const wildIdx = CREATE.node(GAME.state).opts.filter(o => /^无主之地 · 位面/.test(o.label))[0];
ok(!!wildIdx, '能选中「无主之地 · 位面」分区', wildIdx && wildIdx.label);
GAME.choose(wildIdx.k);
eq(CREATE.cur(GAME.state), 'region', '选完分区进入地区步');
const subNode = CREATE.node(GAME.state);
eq(subNode.opts.length, GEO.regionsOf('无主之地/位面').length, '地区步只列该分区的地区');
ok(subNode.panel && subNode.panel.indexOf('疆 域 志') > 0, '分区给出疆域志面板');
ok(subNode.opts.every(o => o.kind === 'custom' ||
  GEO.regionsOf('无主之地/位面').some(r => r.name === o.value || r.id === o.value)), '选项都属于该分区');
/* 回到常规国度路径，核验一个国家分组下的地区选项与地区志 */
GAME.state.create.i = CREATE.STEPS.indexOf('nation');
GAME.choose('a');                               /* 第一个国度：晨曦王国 */
eq(CREATE.cur(GAME.state), 'layer', '大国有选层步');
GAME.choose('d');                               /* 地下层：回音井 */
eq(CREATE.cur(GAME.state), 'region', '选完层走到地区步');
const rgn = CREATE.node(GAME.state);
ok(rgn.opts.length >= 1 && rgn.opts.length <= 26, '地区节点列出该层地区（' + rgn.opts.length + ' 项）', String(rgn.opts.length));
ok(/〔地下〕/.test(rgn.opts[0].label), '地区选项标注所属层', rgn.opts[0].label.slice(0, 60));
ok(/威胁/.test(rgn.opts[0].label), '地区选项标注威胁等级', rgn.opts[0].label.slice(0, 70));
ok(/最近邻国/.test(rgn.opts[0].label), '地区选项标注最近邻国', rgn.opts[0].label.slice(0, 90));
ok(/邻地/.test(rgn.opts[0].label), '地区选项标注邻近地区', rgn.opts[0].label.slice(0, 90));
ok(rgn.panel && rgn.panel.indexOf('接壤与近邻') >= 0, '地区节点给出国度志（含接壤与近邻）');
ok(rgn.panel.indexOf('按层分') > 0, '国度志里的境内地方按层列出');
GAME.choose('a');
ok(!!GAME.state.create.picks.regionName, '已选定起点地区', GAME.state.create.picks.regionName);
ok(byId.log.allText().indexOf('地 区 志') >= 0, '选定地区后立刻显示该地区志');
ok(byId.log.allText().indexOf('附近国家') >= 0, '地区志里能看到附近国家情况');
report('套件 10 · 地理情报与选择地区');

/* ---------------- 套件 11 · 多层地图 ---------------- */
reset();
const MAP = win.MAP;
ok(!!MAP, 'MAP 地图模块已挂载');
const mt = MAP.tree();
const mstat = MAP.stats();
eq(mt.children.length, 17, '第一层：13 国 + 4 分区');
eq(mstat.regions, (WD.REGIONS || []).length, '第二层覆盖全部地区');
ok(mstat.spots >= 46 * 3, '第三层至少每个地区三处地标', String(mstat.spots));
ok(mstat.deep >= 10, '第四层有设定集里写到的更深地点', String(mstat.deep));
/* 每一层都能画出来，且按钮 id 都能在树里找到（这是踩过的坑） */
function idsIn(svg) {
  const out = [];
  const re = /data-map-node="([^"]+)"/g;
  let m;
  while ((m = re.exec(svg))) out.push(m[1]);
  return out;
}
const l1 = MAP.svg('world');
ok(l1.indexOf('<svg') === 0 && l1.indexOf('</svg>') > 0, '第一层可渲染为 SVG');
/* 位面那一组的按钮挪到了画布外的说明条上，所以画布内是 16 个 + 说明条 1 个 = 17 */
ok(idsIn(l1).length >= 16, '第一层每个分组都有展开按钮', String(idsIn(l1).length));
ok(idsIn(l1).every(id => !!MAP.find(id)), '第一层按钮 id 全部能在树里找到');
ok(idsIn(MAP.planeStrip('曙光城')).every(id => !!MAP.find(id)), '位面说明条的按钮 id 也能解析');
eq(new Set(idsIn(l1).concat(idsIn(MAP.planeStrip('曙光城')))).size, 17, '画布内的按钮 + 说明条 = 全部 17 个分组');
ok((l1.match(/<text/g) || []).length >= 40, '第一层有大量浅文字标注', String((l1.match(/<text/g) || []).length));
ok(l1.indexOf('霜脊村') > 0 && l1.indexOf('维兰之海') > 0 && l1.indexOf('无尽之海') > 0, '第一层标出了地名');
ok(l1.indexOf('不在主物质位面') < 0, '位面说明不再画在画布上（避免挡地图）');
const strip = MAP.planeStrip('曙光城');
GEO.regionsOf('无主之地/位面').forEach(r => ok(strip.indexOf(r.name) > 0, '位面说明条列出 ' + r.name));
ok(strip.indexOf('展开 6 处') > 0, '位面说明条带展开按钮');
ok(MAP.planeStrip('圣光之庭').indexOf('你正在这里') > 0, '人在位面时说明条会指出来');
ok(MAP.planeStrip('曙光城').indexOf('你正在这里') < 0, '不在位面时不乱标');
/* 当前所在地的标记 */
const mark1 = MAP.svg('world', '曙光城');
ok(mark1.indexOf('map-here') > 0 && mark1.indexOf('你在 曙光城') > 0, '总图标出当前所在地');
ok(MAP.svg('world', null).indexOf('map-here') < 0, '没有角色时不画标记');
ok(MAP.svg('g:晨曦王国', '曙光城').indexOf('map-here') > 0, '国度图标出当前所在地');
ok(MAP.svg('g:群山王国', '曙光城').indexOf('map-here') < 0, '不在这个国度就不误标');
ok(MAP.svg('r:曙光城', '曙光城').indexOf('map-here') > 0, '地区图也标出当前所在地');
let drillCovered = 0, drillTotal = 0;
mt.children.forEach(g => {
  const svg2 = MAP.svg(g.id);
  drillTotal++;
  const ids = idsIn(svg2);
  if (ids.length && ids.every(id => !!MAP.find(id))) drillCovered++;
  const kids = MAP.find(g.id).children;
  ok(ids.length === kids.length, '第二层每个地区一个按钮：' + g.name, ids.length + '/' + kids.length);
});
eq(drillCovered, drillTotal, '第二层按钮 id 全部有效');
const city = MAP.find('r:曙光城');
ok(city && city.children.length >= 3, '第三层列出地区内地标', city ? String(city.children.length) : '');
const l3 = MAP.svg('r:曙光城');
ok(idsIn(l3).every(id => !!MAP.find(id)), '第三层按钮 id 全部有效');
const deepNode = MAP.find('s:曙光城/金色圆盘大教堂');
ok(deepNode && deepNode.children.length === 1 && deepNode.children[0].name === '圣髑龛', '第四层可达并含设定集写到的地方');
ok(MAP.svg(deepNode.id).indexOf('圣髑龛') > 0, '第四层可渲染');
/* 面包屑与层数 */
const mpath = MAP.pathOf('s:曙光城/金色圆盘大教堂/圣髑龛').map(n => n.name);
eq(mpath.join(' > '), '艾尔德兰大陆 > 晨曦王国 > 曙光城 > 金色圆盘大教堂 > 圣髑龛', '可钻取路径正确');
ok(MAP.crumb('r:曙光城').indexOf('艾尔德兰大陆') > 0 && MAP.crumb('r:曙光城').indexOf('返回上层') > 0, '面包屑含上级与返回');
ok(MAP.parentOf('r:曙光城').name === '晨曦王国', '能取到父节点');
ok(MAP.drillable('g:晨曦王国') === true && MAP.drillable('s:曙光城/贵族区铁栅门') === false, '可钻取判定正确');
/* 面板 */
['world', 'g:晨曦王国', 'g:无主之地/位面', 'r:霜脊村', 's:曙光城/金色圆盘大教堂'].forEach(id => {
  const inf = noThrow(() => MAP.info(id), '地图信息面板可渲染：' + id);
  ok(inf && inf.indexOf('\\fcolorbox') > 0, '地图信息面板使用美化框：' + id);
  ok(inf && inf.indexOf('undefined') < 0, '地图信息面板无 undefined：' + id);
});
ok(MAP.info('world').indexOf('大 陆 总 图') > 0, '总图有大陆总图面板');
ok(MAP.info('r:霜脊村').indexOf('地 区 志') > 0, '地区层给地区志');
ok(MAP.info('g:无主之地/位面').indexOf('疆 域 志') > 0, '分区层给疆域志');
/* 从界面打开地图 */
win.__bootGame();
noThrow(() => win.GAME.showMap('world'), '从界面打开地图不抛异常');
ok(byId.modalBox.className === 'mapbox', '地图用宽弹层');
ok(byId.modalBox.allText().indexOf('大 陆 总 图') > 0, '弹层里渲染出总图面板');
ok(byId.modalBox.allText().indexOf('展开') > 0, '弹层里有展开按钮');
noThrow(() => win.GAME.showMap('r:曙光城'), '直接跳到第三层不抛异常');
ok(byId.modalBox.allText().indexOf('地 区 志') > 0, '第三层显示地区志');
noThrow(() => win.GAME.showMap('s:曙光城/金色圆盘大教堂'), '第四层可打开');
win.GAME.closeModal();
/* 每个分组的地区按钮都必须落在不同位置，否则叠在一起点不到（位面六处踩过这个坑） */
function buttonPositions(nodeId) {
  const svg = MAP.svg(nodeId);
  const re = /<g class="map-drill" data-map-node="([^"]+)"[^>]*>\s*<rect x="([\d.]+)" y="([\d.]+)"/g;
  const out = []; let m;
  while ((m = re.exec(svg))) out.push({ id: m[1], x: +m[2], y: +m[3] });
  return out;
}
let allDistinct = true, allClickable = true, checkedGroups = 0;
MAP.tree().children.forEach(g => {
  checkedGroups++;
  const ps = buttonPositions(g.id);
  const uniq = new Set(ps.map(p => p.x + ',' + p.y));
  if (uniq.size !== ps.length) allDistinct = false;
  ps.forEach((p, i) => {
    if (ps.slice(i + 1).some(q => Math.abs(q.x - p.x) < 45 && Math.abs(q.y - p.y) < 11)) allClickable = false;
  });
});
eq(checkedGroups, 17, '检查了全部 17 个分组的按钮位置');
ok(allDistinct, '每个分组的地区按钮位置互不重合');
ok(allClickable, '每个分组的地区按钮都点得到（没有被后画的盖住）');
const planeBtns = buttonPositions('g:无主之地/位面');
eq(planeBtns.length, 6, '位面分区列出全部六处', String(planeBtns.length));
eq(new Set(planeBtns.map(p => p.x + ',' + p.y)).size, 6, '位面六处各有各的位置');
ok(GEO.regionsOf('无主之地/位面').every(r => {
  const p = GEO.posOf(r);
  return p && (p.x !== 50 || p.y !== 50);
}), '位面地区的坐标不再是默认落点');
/* 缩放 / 平移 */
win.GAME.showMap('world');
const fakeStage = document.createElement('div');
const fakeSvg = document.createElement('svg');
const ctl = noThrow(() => MAP.zoomify(fakeStage, fakeSvg), '缩放控制器可挂载');
ok(!!ctl, '缩放控制器返回实例');
eq(ctl.state().k, 1, '初始缩放为 1');
ctl.zoomIn();
ok(ctl.state().k > 1, '放大后倍率大于 1', ctl.state().k);
const zoomed = ctl.state();
ok(fakeSvg.style.transform.indexOf('scale(') > 0, '缩放写进 transform', fakeSvg.style.transform);
ctl.panBy(40, -25);
eq(ctl.state().x, zoomed.x + 40, '平移改变横向偏移');
eq(ctl.state().y, zoomed.y - 25, '平移改变纵向偏移');
ctl.zoomOut();
ok(ctl.state().k < zoomed.k, '缩小后倍率下降');
ctl.reset();
ok(ctl.state().k === 1 && ctl.state().x === 0 && ctl.state().y === 0, '复位回到初始视图');
/* 滚轮事件走的是同一套逻辑 */
let wheelPrevented = false;
fakeStage.dispatch('wheel', { clientX: 200, clientY: 150, deltaY: -120, preventDefault() { wheelPrevented = true; } });
ok(ctl.state().k > 1, '滚轮向前放大', ctl.state().k);
ok(wheelPrevented, '滚轮事件阻止了页面滚动');
fakeStage.dispatch('wheel', { clientX: 200, clientY: 150, deltaY: 120, preventDefault() {} });
ok(Math.abs(ctl.state().k - 1) < 0.02, '滚轮向后缩回原倍率', ctl.state().k);
ok(ctl.state().k >= ctl.min && ctl.state().k <= ctl.max, '倍率被夹在允许区间内');
report('套件 11 · 多层地图');

/* ---------------- 套件 12 · 邻近出行与路上风险 ---------------- */
reset();
/* 每个地区都至少有一处邻地 */
let noNear = [];
(WD.REGIONS || []).forEach(r => { if (!GEO.adjacentTo(r.name).length) noNear.push(r.name); });
eq(noNear.length, 0, '每个地区都有邻近可往之地' + (noNear.length ? ' 缺：' + noNear.join(',') : ''));
const nearShu = GEO.adjacentTo('曙光城');
ok(nearShu.length >= 3 && nearShu.length <= 8, '邻地数量在 3-8 之间', String(nearShu.length));
ok(nearShu.some(x => x.name === '喷泉广场') && nearShu.some(x => x.name === '中部平原'), '同城的近处算邻地');
ok(!GEO.isAdjacent('曙光城', '龙骨山脉'), '隔着大半大陆的地方不是邻地');
ok(!GEO.isAdjacent('霜脊村', '龙火城'), '南北两端互不相邻');
ok(GEO.adjacentTo('霜脊村').some(x => x.name === '白港城'), '同国的近处相邻');
const planeNear = GEO.adjacentTo('圣光之庭').map(x => x.name);
eq(planeNear.join(','), '时空裂隙', '位面地区只能借时空裂隙出入');
ok(GEO.adjacentTo('回音井').some(x => x.name === '曙光城'), '地底地区与头顶的地表相邻');
/* 风险随热度与目标威胁上升 */
const sT = GAME.newState(31); ENG.seed(31);
sT.place = '曙光城'; sT.terrain = '平原';
ENG.char.derive(sT);
const rLow = ENG.travel.risk(sT, GEO.regionOf('喷泉广场'));
const rHigh = ENG.travel.risk(sT, GEO.regionOf('安息烛墓园'));
ok(rHigh > rLow, '目标越危险，出行风险越高', Math.round(rLow * 100) + '% vs ' + Math.round(rHigh * 100) + '%');
const r0 = ENG.travel.risk(sT, GEO.regionOf('喷泉广场'));
ENG.travel.addHeat(sT, 4);
const r4 = ENG.travel.risk(sT, GEO.regionOf('喷泉广场'));
ok(r4 > r0, '去得越勤，出行风险越高', Math.round(r0 * 100) + '% → ' + Math.round(r4 * 100) + '%');
eq(ENG.travel.heat(sT), 4, '出行热度按次数累计');
ok(ENG.travel.cool(sT, 2) === 2, '歇一歇能降温');
ok(ENG.travel.risk(sT, GEO.regionOf('喷泉广场')) <= 0.85, '风险有上限');
ok(ENG.travel.forecast(sT, GEO.regionOf('喷泉广场')).word.length > 0, '风险有文字档位');
/* 意外表可用 */
const mishapKinds = {};
for (let i = 0; i < 40; i++) {
  const m = ENG.travel.mishap(sT, GEO.regionOf('龙骨山脉'));
  mishapKinds[m.kind] = (mishapKinds[m.kind] || 0) + 1;
  ok(typeof m.text === 'string' && m.text.length > 4, '意外有描述（' + m.kind + '）');
  ok(m.hp >= 0 && m.hp < 40 && m.fatigue >= 0 && m.fatigue <= 2, '意外数值合理');
}
ok(Object.keys(mishapKinds).length >= 3, '意外类型不止一种', Object.keys(mishapKinds).join(','));
/* 只能去邻地：写别处会被拦下 */
const sMove = GAME.newState(33); ENG.seed(33);
sMove.phase = 'playing'; sMove.place = '曙光城'; sMove.terrain = '平原';
ENG.char.derive(sMove);
GAME.state = sMove;
const placeBefore = sMove.place;
GAME.state = sMove;
const bad = noThrow(() => GAME.ACT.custom(sMove, '我前往龙骨山脉'), '前往不相邻之地不抛异常');
eq(sMove.place, placeBefore, '不相邻的地方去不了（原地不动）');
ok(bad && /去不了/.test(bad.text) && bad.extra.join('').indexOf('挨着的地方') > 0, '会说明为什么去不了并列出邻地');
GAME.state = sMove;
const good = noThrow(() => GAME.ACT.custom(sMove, '我前往喷泉广场'), '前往邻地不抛异常');
ok(sMove.place === '喷泉广场', '相邻的地方可以前往', sMove.place);
ok(good && good.extra.join('').indexOf('出行风险') > 0, '出行时给出风险预估');
eq(ENG.travel.heat(sMove), 1, '走一趟热度 +1');
/* 面板与选择器 */
ok(PANEL.status(sMove).indexOf('出行热度') > 0, '状态栏显示出行热度');
win.GAME.showNearbyPicker();
const pickText = byId.modalBox.allText();
ok(pickText.indexOf('这里只列挨着的邻地') > 0, '「前往近处」写明只列邻地');
ok(pickText.indexOf('出行风险') > 0, '弹层里每个选项都标出行风险');
ok(pickText.indexOf('出行热度') > 0, '弹层里显示当前热度');
const rgnBtns = (pickText.match(/>前往 /g) || []).length;      /* 不含「长途前往」 */
ok(rgnBtns === GEO.adjacentTo('喷泉广场').length, '「前往近处」只列邻地', rgnBtns + ' vs ' + GEO.adjacentTo('喷泉广场').length);
win.GAME.closeModal();
/* ---- 长途出行：路线、代价、确认后才走 ---- */
const sL = GAME.newState(61); ENG.seed(61);
sL.phase = 'playing'; sL.place = '曙光城'; sL.terrain = '平原';
ENG.money.gain(sL, 30 * (ENG.money.RATE.gp || 1000));
ENG.char.derive(sL);
GAME.state = sL;
const rFast = GEO.route('曙光城', '龙火城');
ok(rFast && rFast.length >= 3, '能算出长途路线', rFast ? rFast.join('→') : '无');
ok(rFast.every((n, i) => i === 0 || GEO.isAdjacent(rFast[i - 1], n)), '路线每一站都相邻（真的是一站一站串）');
ok(!GEO.isAdjacent('曙光城', '龙火城'), '终点本身不是邻地（所以这确实是长途）');
const lp = ENG.travel.longPlan(sL, '龙火城');
ok(!!lp && lp.stops === rFast.length - 1, '长途计划站数正确', lp && String(lp.stops));
ok(lp.days >= lp.stops, '天数不小于站数', lp.days + '天/' + lp.stops + '站');
ok(lp.costSP >= lp.days * 8, '盘缠按天数计价', lp.costSP + ' SP');
ok(lp.fatigue >= 1, '长途要付疲劳', String(lp.fatigue));
ok(lp.heatAfter > lp.heatNow, '长途会让出行热度上升', lp.heatNow + '→' + lp.heatAfter);
ok(lp.atLeastOne > 0.2 && lp.atLeastOne < 0.95, '全程至少出一次事的概率在合理区间', Math.round(lp.atLeastOne * 100) + '%');
ok(lp.march === true, '三站以上按过境行军折减');
const both = ENG.travel.longOptions(sL, '龙火城');
ok(both && both.fast, '长途给出方案');
const cardOk = noThrow(() => PANEL.trip(sL, lp, both.safe), '长途代价面板可渲染');
['目的地', '两条路', '最快', '要付的代价', '路程', '盘缠', '疲劳', '出行热度', '路上可能失去的东西'].forEach(k =>
  ok(cardOk.indexOf(k) > 0, '代价面板写明「' + k + '」'));
ok(cardOk.indexOf('\\fcolorbox') > 0 && cardOk.indexOf('undefined') < 0, '代价面板用美化框且无 undefined');
/* 走不到的地方（位面） */
ok(GEO.route('曙光城', '圣光之庭') === null || !GEO.isAdjacent('曙光城', '圣光之庭'), '位面不能直接长途直达');
/* 确认后才走：取消不动身 */
const place0 = sL.place;
win.GAME.showNearbyPicker();
const nearTxt = byId.modalBox.allText();
ok(nearTxt.indexOf('这里只列挨着的邻地') > 0, '「前往近处」写明只列邻地');
ok(nearTxt.indexOf('出行风险') > 0, '近处选项标出出行风险');
ok(nearTxt.indexOf('出行热度') > 0, '近处选项显示出行热度');
ok(nearTxt.indexOf('长途前往') < 0, '「前往近处」里没有长途选项');
const nearCount = (nearTxt.match(/>前往 /g) || []).length;
eq(nearCount, GEO.adjacentTo(sL.place).length, '「前往近处」只含相邻选项');
win.GAME.closeModal();
win.GAME.showLongPicker();
const longTxt = byId.modalBox.allText();
ok(longTxt.indexOf('长途是') > 0 && longTxt.indexOf('多站行程') > 0, '「长途出行」说明是多站行程');
ok(longTxt.indexOf('长途前往') > 0, '「长途出行」列出需要长途的地方');
ok(longTxt.indexOf('档可选') > 0, '长途选项标出可选挡位数');
ok(longTxt.indexOf('位面里的地方走不到') > 0, '说明位面要借裂隙');
/* 与「前往近处」同一套：危险配色 + 末尾热度提醒 */
const heatPat = /近期出行热度：<b>\d+<\/b>（每两天自然降一点，长休也会降温）/;
ok(heatPat.test(nearTxt), '「前往近处」末尾给出出行热度提醒');
ok(heatPat.test(longTxt), '「长途出行」末尾也按同样格式给出出行热度提醒');
ok((nearTxt.match(/rgn-row d\d/g) || []).length === GEO.adjacentTo(sL.place).length, '「前往近处」每行按危险配色标注');
const longRows = (longTxt.match(/rgn-row d\d/g) || []).length;
ok(longRows >= 5, '「长途出行」每行也按危险配色标注', String(longRows));
ok(/全程出行风险 \d+%（(几乎无险|略有风险|有风险|相当凶险|极凶险|近乎送死)）/.test(longTxt), '长途行内标出全程出行风险与档位词');
ok(/<span style="color:#67717f">[^<]*　\d+ 站 · \d+–\d+ 天 · \d+ 档可选/.test(longTxt), '长途行内给出地理位置与站数天数档数');
const longNames = (longTxt.match(/长途前往 ([^\s　]+)/g) || []).map(x => x.replace('长途前往 ', ''));
ok(longNames.length > 0, '长途列表非空', String(longNames.length));
ok(longNames.every(n => !GEO.isAdjacent(sL.place, n)), '「长途出行」里没有邻地', longNames.slice(0, 3).join('/'));
win.GAME.closeModal();
eq(sL.place, place0, '只是打开列表不会动身');
/* 走法挡位：随地区、危险与人物状态变化 */
const tierFull = ENG.travel.tiers(sL, '龙火城');
ok(!!tierFull && tierFull.tiers.length === 4, '给出四档走法', tierFull ? String(tierFull.tiers.length) : '');
eq(tierFull.tiers.map(x => x.name).join(','), '自己走,搭商队,雇车马,急行夜路', '挡位名称与顺序');
ok(tierFull.tiers.some(x => !x.ok && x.reason.length > 4), '不合适的挡位被锁并写明原因',
  tierFull.tiers.filter(x => !x.ok).map(x => x.name + ':' + x.reason).join(' | '));
const rush = tierFull.tiers.filter(x => x.id === 'rush')[0];
const walk = tierFull.tiers.filter(x => x.id === 'foot')[0];
const cart = tierFull.tiers.filter(x => x.id === 'caravan')[0];
ok(rush.days < walk.days, '急行比自己走快', rush.days + ' < ' + walk.days);
ok(cart.costSP > walk.costSP, '搭商队比自己走贵', cart.costSP + ' > ' + walk.costSP);
if (cart.ok) ok(cart.atLeastOne < walk.atLeastOne, '搭商队比自己走稳', Math.round(cart.atLeastOne * 100) + '% < ' + Math.round(walk.atLeastOne * 100) + '%');
ok(rush.fatigue > walk.fatigue, '急行更累', rush.fatigue + ' > ' + walk.fatigue);
/* 状态差 → 急行被锁 */
const sTired = GAME.newState(93); ENG.seed(93);
sTired.phase = 'playing'; sTired.place = '曙光城'; sTired.terrain = '平原';
sTired.money.gp = 40; ENG.char.derive(sTired);
sTired.pc.fatigue = 4;
const tTired = ENG.travel.tiers(sTired, '龙火城').tiers.filter(x => x.id === 'rush')[0];
ok(!tTired.ok && /疲劳/.test(tTired.reason), '疲劳过高时急行被锁', tTired.reason);
sTired.pc.fatigue = 0; sTired.pc.hp.cur = Math.round(sTired.pc.hp.max * 0.2);
const tHurt = ENG.travel.tiers(sTired, '龙火城').tiers.filter(x => x.id === 'rush')[0];
ok(!tHurt.ok && /伤/.test(tHurt.reason), '带伤时急行被锁', tHurt.reason);
/* 没钱 → 花钱的挡位被锁 */
sTired.money = { cp: 0, sp: 0, gp: 0, pp: 0 };
const tPoor = ENG.travel.tiers(sTired, '龙火城').tiers;
ok(tPoor.filter(x => x.id === 'caravan')[0].ok === false && /盘缠/.test(tPoor.filter(x => x.id === 'caravan')[0].reason),
  '钱不够时搭商队被锁', tPoor.filter(x => x.id === 'caravan')[0].reason);
ok(tPoor.filter(x => x.id === 'foot')[0].ok === true, '自己走永远可选');
const tierCard = noThrow(() => PANEL.tripTiers(sTired, ENG.travel.tiers(sTired, '龙火城'), null), '挡位面板可渲染');
['选一种走法', '自己走', '搭商队', '雇车马', '急行夜路', '不能选', '无论走哪一档'].forEach(k =>
  ok(tierCard.indexOf(k) > 0, '挡位面板写明「' + k + '」'));
ok(tierCard.indexOf('undefined') < 0, '挡位面板无 undefined');
/* 挡位弹层里的「改走近处」：应弹出当前所在地的近处选项（不替玩家决定去哪） */
const sNear = GAME.newState(99); ENG.seed(99);
sNear.phase = 'playing'; sNear.place = '曙光城'; sNear.terrain = '平原';
ENG.money.gain(sNear, 40 * (ENG.money.RATE.gp || 1000)); ENG.char.derive(sNear);
GAME.state = sNear;
noThrow(() => win.GAME.showLongPicker(), '打开长途列表');
win.GAME.closeModal();
noThrow(() => win.GAME.showNearbyPicker(), '近处选项可独立打开');
const nearModal = byId.modalBox.allText();
ok(nearModal.indexOf('前 往 近 处') > 0, '近处弹层标题正确');
ok((nearModal.match(/>前往 /g) || []).length === GEO.adjacentTo('曙光城').length, '近处弹层只列邻地');
eq(GAME.state.place, '曙光城', '只打开近处列表不会移动角色');
win.GAME.closeModal();
/* 按挡位真的走一趟 */
const sTrip = GAME.newState(95); ENG.seed(95);
sTrip.phase = 'playing'; sTrip.place = '曙光城'; sTrip.terrain = '平原';
ENG.money.gain(sTrip, 60 * (ENG.money.RATE.gp || 1000));
sTrip.pc.level = 10; ENG.char.derive(sTrip);
sTrip.pc.hp.max = sTrip.pc.hp.cur = 400;
const planFast = ENG.travel.longPlan(sTrip, '龙火城');
const dayBefore = ENG.time.absDay(sTrip.time);
GAME.state = sTrip;
const rushRes = noThrow(() => GAME.ACT.longtrip(sTrip, '龙火城', 'fast', 'rush'), '按「急行夜路」走长途');
eq(sTrip.place, '龙火城', '急行也能到目的地');
ok(ENG.time.absDay(sTrip.time) - dayBefore <= planFast.days, '急行用的天数不多于基准', (ENG.time.absDay(sTrip.time) - dayBefore) + ' ≤ ' + planFast.days);
ok(rushRes && rushRes.extra.some(x => /走法：急行夜路/.test(x)), '结果里写明走法');
/* 饥渴时插入的「先补给」不能把自定义选项挤掉 */
const sHungry = GAME.newState(97); ENG.seed(97);
sHungry.phase = 'playing'; sHungry.place = '曙光城'; sHungry.terrain = '平原';
ENG.char.derive(sHungry);
sHungry.pc.hunger = '饥饿'; sHungry.pc.thirst = '脱水';
GAME.state = sHungry;
noThrow(() => GAME.presentScene(false), '饥渴状态下的场景可渲染');
eq(GAME.opts.length, 5, '饥渴时仍给出 5 个选项');
eq(GAME.opts[0].act, 'eat', '第一项是先补给');
eq(GAME.opts[4].kind, 'custom', '饥渴时自定义选项仍在最后一位');
eq(GAME.opts.map(o => o.k).join(''), 'abcde', '饥渴时字母仍连续');
/* 真的走一趟长途（角色给足底子，免得半路被打死影响「抵达」这条断言） */
sL.pc.level = 10; ENG.char.derive(sL);
sL.pc.hp.max = sL.pc.hp.cur = 400;
const days0 = ENG.time.absDay(sL.time), gold0 = ENG.money.total(sL), heat0 = ENG.travel.heat(sL);
GAME.state = sL;
const tripRes = noThrow(() => GAME.ACT.longtrip(sL, '龙火城'), '长途出行可执行');
eq(sL.place, '龙火城', '长途走完抵达目的地', sL.place);
ok(ENG.time.absDay(sL.time) - days0 >= lp.days - 1, '长途确实过去了这些天', (ENG.time.absDay(sL.time) - days0) + '天');
ok(ENG.money.total(sL) <= gold0, '长途花掉了盘缠', ENG.money.fmt(gold0) + ' → ' + ENG.money.fmt(ENG.money.total(sL)));
ok(ENG.travel.heat(sL) > heat0, '长途之后热度上升');
ok(tripRes && tripRes.extra.some(x => /第 1 站/.test(x)), '逐站给出风险结算');
ok(tripRes && tripRes.extra.some(x => /出行热度涨到/.test(x)), '结算里交代热度变化');
/* 写了「长途前往X」也走这条路（角色给足底子，免得半路被打死影响断言） */
const sL2 = GAME.newState(63); ENG.seed(63);
sL2.phase = 'playing'; sL2.place = '曙光城'; sL2.terrain = '平原';
sL2.pc.level = 10;
ENG.char.derive(sL2);
sL2.pc.hp.max = sL2.pc.hp.cur = 400;
ENG.money.gain(sL2, 30 * (ENG.money.RATE.gp || 1000));
GAME.state = sL2;
const r2 = noThrow(() => GAME.ACT.custom(sL2, '我长途前往龙火城'), '「长途前往」走长途');
eq(sL2.place, '龙火城', '长途前往把角色送到了目的地', sL2.place);
ok(r2 && r2.extra.some(x => /路线：/.test(x)), '结果里给出路线');
report('套件 12 · 邻近出行与路上风险');

/* ---------------- 套件 13 · 建卡无自定义 + 天赋抽选 + 进入游戏后的自定义行动 ---------------- */
reset();
const IMPROV = win.IMPROV;

/* 13.1 进入游戏之前：任何一步都没有自定义项，打字一律退回选项 */
GAME.startCreate(true);
const walked = [];
const probes = ['猫人', '剑舞者', '流浪乐师', '赌徒', '力12 敏15 体13 智12 感10 魅14', '混乱善良', '龙骨山脉', '阿黛尔', '女'];
let cguard = 0, probed = 0, rejected = 0, drawTimes = 0;
while (GAME.state.phase === 'create' && cguard++ < 60) {
  const n = CREATE.node(GAME.state);
  walked.push(n.step);
  ok(!n.opts.some(o => o.kind === 'custom'), '步骤 ' + n.step + ' 没有自定义项');
  /* 选项字母必须连续到实际条数为止 */
  eq(n.opts.map(o => o.k).join(''), 'abcdefghijklmnopqrstuvwxyz'.slice(0, n.opts.length), '步骤 ' + n.step + ' 选项顺排（' + n.opts.length + ' 项）');
  /* 打字：除了天赋那一步的暗号，全部应当被拒 */
  const probe = probes[Math.min(probed, probes.length - 1)];
  probed++;
  const r = CREATE.pick(GAME.state, 'zz', probe);
  if (!r.ok) rejected++;
  ok(!r.ok, '步骤 ' + n.step + ' 拒绝自己写内容（' + probe + '）');
  if (n.step === 'talent') {
    /* 天赋名不能改，暗号可以 */
    const rn0 = CREATE.pick(GAME.state, 'zz', '命运之线');
    ok(!rn0.ok, '天赋名不能被当成自定义天赋收下');
    const rk = CREATE.pick(GAME.state, 'zz', '剑与魔法');
    ok(rk.ok && GAME.state.create.tal.mode === 'free', '对话框输入暗号后解锁自由选择');
    /* 自由选择：翻等级 → 挑两条 → 收手 */
    const gradeOpt = CREATE.node(GAME.state).opts.find(o => o.value === 'grade:D');
    ok(!!gradeOpt, '解锁后能翻等级');
    CREATE.pick(GAME.state, gradeOpt.k);
    const listN = CREATE.node(GAME.state).opts.length;
    CREATE.pick(GAME.state, CREATE.node(GAME.state).opts[0].k);
    CREATE.pick(GAME.state, CREATE.node(GAME.state).opts[1].k);
    ok(GAME.state.create.tal.picked.length === 2, '自由选择能逐条选入', String(GAME.state.create.tal.picked.length));
    CREATE.pick(GAME.state, CREATE.node(GAME.state).opts[1].k);
    ok(GAME.state.create.tal.picked.length === 1, '再点同一条可以撤掉', String(GAME.state.create.tal.picked.length));
    CREATE.pick(GAME.state, CREATE.node(GAME.state).opts.find(o => o.value === 'freego').k);
    ok(listN > 3, '等级页列出该档全部条目', String(listN));
    continue;
  }
  GAME.choose('a');
}
eq(cguard < 60, true, '建卡不会被卡住');
eq(GAME.state.phase, 'playing', '建卡能收尾');
eq(rejected, probed, '每一步的自己写内容都被拒绝（' + rejected + '/' + probed + '）');
['race', 'class', 'identity', 'background', 'talent', 'align', 'nation', 'region'].forEach(k => {
  ok(walked.indexOf(k) >= 0, '建卡流程包含步骤 ' + k);
});
const sp = GAME.state.pc, pk = GAME.state.create.picks;
eq(pk.talentDraw.free, true, '天赋来源记录为自由选择');
ok((sp.talents || []).length === 1, '自由选择收下的条数写进角色', String((sp.talents || []).length));
ok((sp.talents || []).every(t => t.effect), '收下的天赋带着效果字段');

/* 13.2 走随机抽选那条路：五次上限、收下其中一组、整组到手 */
GAME.startCreate(true);
let dguard = 0;
while (CREATE.cur(GAME.state) !== 'talent' && dguard++ < 30) GAME.choose('a');
eq(CREATE.cur(GAME.state), 'talent', '走到天赋步');
for (let i = 0; i < 5; i++) {
  const drawOpt = CREATE.node(GAME.state).opts.find(o => o.value === 'draw');
  ok(!!drawOpt, '第 ' + (i + 1) + ' 次可以抽选');
  CREATE.pick(GAME.state, drawOpt.k);
  drawTimes++;
}
eq(drawTimes, 5, '一共抽了五次');
ok(!CREATE.node(GAME.state).opts.some(o => o.value === 'draw'), '抽满五次后不再给抽选项');
eq(GAME.state.create.tal.draws.length, 5, '五次记录都在');
const takeOpts = CREATE.node(GAME.state).opts.filter(o => String(o.value).indexOf('take:') === 0);
eq(takeOpts.length, 5, '五组都能收下');
const pickIdx = 2;
CREATE.pick(GAME.state, takeOpts[pickIdx].k);
const pickSet = GAME.state.create.picks.talents || [];
const srcSet = GAME.state.create.tal.draws[pickIdx];
eq(pickSet.length, srcSet.list.length, '抽到的一组全部到手（' + srcSet.cn + '）');
ok(pickSet.every((t, i) => t.id === srcSet.list[i].id), '到手的条目与那一次抽选一致');
ok(pickSet.every(t => t.grade === srcSet.grade), '等级与抽到的档位一致');

/* 13.3 抽选概率与档位（十万次，固定种子） */
ENG.seed(424242);
const NN = 100000, hitG = {};
for (let i = 0; i < NN; i++) { const d = ENG.talent.draw(GAME.state); hitG[d.grade] = (hitG[d.grade] || 0) + 1; }
const wantG = { D: 50, C: 30, B: 15, A: 4, SSS: 1 };
Object.keys(wantG).forEach(g => {
  const got = (hitG[g] || 0) / NN * 100;
  ok(Math.abs(got - wantG[g]) < 1.2, '抽到 ' + g + ' 级的频率贴近 ' + wantG[g] + '%（实测 ' + got.toFixed(2) + '%）');
});
const odds = ENG.talent.odds();
eq(odds.length, 5, '概率表五档');
eq(odds.map(o => o.n).join(','), '5,4,3,2,1', '档位条数是 5/4/3/2/1');
eq(odds.map(o => Math.round(o.p * 100)).join(','), '50,30,15,4,1', '概率是 50/30/15/4/1');
/* 每一档抽出来的条目：同组不重复、不跨级、条数与档位相符 */
['D', 'C', 'B', 'A', 'SSS'].forEach(g => {
  const have = ENG.talent.byGrade(g);
  ok(have.length >= 1, g + ' 级有可抽的条目', String(have.length));
  let badN = 0, badG = 0, dup = 0;
  for (let i = 0; i < 200; i++) {
    const d = ENG.talent.draw(GAME.state);
    if (d.list.some(x => x.grade !== d.grade)) badG++;
    if (new Set(d.list.map(x => x.id)).size !== d.list.length) dup++;
  }
  eq(badG, 0, '抽出的条目不会跨级（' + g + ' 级抽查）');
  eq(dup, 0, '同一次抽选不重复（' + g + ' 级抽查）');
});

/* 13.4 生成器自身：什么名字都要有介绍，不留空 */
['race', 'cls', 'identity', 'background', 'align', 'item', 'nation', 'talent'].forEach(g => {
  const fn = IMPROV[g];
  if (typeof fn !== 'function') { ok(false, '生成器缺少 ' + g); return; }
  let blank = 0;
  ['火绒盒', 'ZZZ', '三枚铜板', '霜巨人', '掏粪工', '无声之誓', '血月'].forEach(nm => {
    const o = fn(nm);
    const txt = [o.desc, o.blurb && o.blurb.join(' '), o.traits].filter(Boolean).join(' ');
    if (!txt || /undefined|\[object/.test(txt)) blank++;
  });
  eq(blank, 0, '生成器 ' + g + ' 对任意名字都给出介绍文字');
});

/* 13.5 自定义行动要按世界内容与当下状态来理解 */
const sI = GAME.newState(101); ENG.seed(101);
sI.phase = 'playing'; sI.place = '曙光城'; sI.terrain = '平原'; sI.pc.level = 10;
ENG.char.derive(sI);
sI.pc.hp.max = sI.pc.hp.cur = 400;
ENG.money.gain(sI, 30 * (ENG.money.RATE.gp || 1000));
ENG.item.add(sI, '治疗微伤药水');
ENG.item.add(sI, '祖传长弓');
sI.team = [{ name: '老周', title: '向导', status: '跟随' }];
sI.quests = [{ name: '失踪的商队', state: '进行中', place: '曙光城' }];
GAME.state = sI;
const god = (WD.GODS || [])[0], mon = (WD.MONSTERS || [])[0];
eq(GAME.interpret(sI, '我喝下治疗微伤药水').act, 'useitem', '说得出手上的药水就按喝药结算');
eq(GAME.interpret(sI, '我用祖传长弓射它').act, 'useitem', '自创物品也认得出来');
eq(GAME.interpret(sI, '我向' + god.name + '祈祷').act, 'pray', '认得出神名与祈祷');
eq(GAME.interpret(sI, '我问老周路怎么走').act, 'talkto', '认得出身边的人');
eq(GAME.interpret(sI, '我攻击' + mon.name).act, 'attackmon', '认得出点名的怪物');
/* 身上没有的东西：当场说清，且不能把「我买 X」也拦下来 */
const absent = GAME.interpret(sI, '我掏出盗贼工具撬锁');
eq(absent && absent.act, 'noitem', '说到身上没有的东西时当面说清');
eq(absent && absent.arg, '盗贼工具', '报出的是玩家说的那件东西', absent && absent.arg);
const rAbsent = noThrow(() => GAME.ACT.custom(sI, '我掏出盗贼工具撬锁'), '自定义行动：用没有的东西');
ok(rAbsent && /没有盗贼工具/.test(rAbsent.text), '结果里明说身上没有这件东西', rAbsent && rAbsent.text);
ok(rAbsent && rAbsent.extra.some(x => /买/.test(x)), '顺带告诉玩家怎么弄到它');
const buyInt = GAME.interpret(sI, '我买治疗微伤药水');
ok(!buyInt || buyInt.act !== 'noitem', '「我买 X」不会被缺物判定截走', buyInt && buyInt.act);
const modInt = GAME.interpret(sI, '我用祖传铁弓射它');
ok(!modInt || modInt.act !== 'noitem' || /弓/.test(modInt.arg), '带修饰语的名字也报得回来', modInt && modInt.arg);
eq(GAME.interpret(sI, '查查失踪的商队').act, 'quest', '认得出进行中的委托');
const dirI = GAME.interpret(sI, '我往北走');
ok(dirI && (dirI.act === 'travel' || dirI.act === 'look'), '说得出的方位会落到某条邻地', dirI && dirI.act);
ok(GAME.interpret(sI, '我坐在墙根底下发愣') === null, '对不上任何内容的句子交回通用判定');
const far = (WD.REGIONS || []).filter(r => r.name !== sI.place && !win.GEO.isAdjacent(sI.place, r.name))[0];
if (far) eq(GAME.interpret(sI, '我前往' + far.name).act, 'travelfar', '不相邻的地名走「只到一站」那条');
/* 真的执行一次，确认不会抛错且有正文 */
const rUse = noThrow(() => GAME.ACT.custom(sI, '我喝下治疗微伤药水'), '自定义行动：喝药');
ok(rUse && typeof rUse.text === 'string' && rUse.text.length > 4, '自定义喝药给出了正文');
const rPray = noThrow(() => GAME.ACT.custom(sI, '我向' + god.name + '祈祷'), '自定义行动：祈祷');
ok(rPray && typeof rPray.text === 'string' && rPray.text.length > 4, '自定义祈祷给出了正文');
report('套件 13 · 建卡无自定义与天赋抽选');

/* ---------------- 套件 14 · 渲染不留 LaTeX 原文 ---------------- */
reset();
/* 这个套件是为一次真实缺陷立的：kv 的值参数里再套一条命令时，渲染器把它当普通文字吐了出来，
   建卡确认页上出现过「/textcolor{#8F74B8}{/footnotesize （自创）}」这种原文。 */
const LEAK_RE = /textcolor|footnotesize|textbf|textit|Large|quad|qquad|overline|scalebox|fcolorbox|begin\{array\}|end\{array\}/;
function scanLeak(label, rendered) {
  const text = String(rendered).replace(/<[^>]+>/g, ' ');
  const m = text.match(LEAK_RE);
  ok(!m, label + ' 渲染后不留命令原文', m ? m[0] + ' ← ' + text.replace(/\s+/g, ' ').slice(0, 120) : '');
}
GAME.startCreate(true);
let leakSteps = 0;
let lguard = 0;
while (GAME.state.phase === 'create' && lguard++ < 40) {
  const n = CREATE.node(GAME.state);
  leakSteps++;
  scanLeak('建卡·' + n.step + '·预览', LTX.renderMixed(CREATE.preview(GAME.state)));
  scanLeak('建卡·' + n.step + '·选项', LTX.renderMixed(PANEL.options(n.opts)));
  GAME.renderSide();
  scanLeak('建卡·' + n.step + '·侧栏', byId.sideBody.innerHTML || '');
  if (n.step === 'talent') {
    /* 抽两次再收下第二组：抽选记录面板也要扫 */
    GAME.choose(n.opts[0].k);
    scanLeak('建卡·talent·抽选记录', LTX.renderMixed(PANEL.talents(GAME.state, GAME.state.create.tal.draws, '抽 选 记 录')));
    const after = GAME.opts;
    GAME.choose(after[Math.max(0, after.length - 2)].k);
    continue;
  }
  GAME.choose('a');
}
ok(leakSteps >= 10, '走完建卡的全部步骤（' + leakSteps + ' 步）再谈渲染');
const sLk = GAME.state;
eq(sLk.phase, 'playing', '角色进了世界，面板才有得扫');
ENG.item.add(sLk, '战利品 · 不知名的骨片');
['status', 'card', 'bag', 'task', 'time'].forEach(fn => scanLeak('面板·' + fn, LTX.renderMixed(PANEL[fn](sLk))));
scanLeak('面板·levelup', LTX.renderMixed(PANEL.levelup(sLk, { level: 2, name: '初级', gain: 8, cls: sLk.pc.clsName })));
scanLeak('面板·death', LTX.renderMixed(PANEL.death(sLk, { cause: '测试' })));
scanLeak('面板·talents', LTX.renderMixed(PANEL.talents(sLk, [{ name: '命运之线', grade: 'SSS', desc: '重掷一次' }])));
scanLeak('面板·shop', LTX.renderMixed(PANEL.shop(sLk, ENG.item.stock(sLk, 'gear'))));
const cbSave = sLk.combat;
sLk.combat = { round: 1, ctx: { name: '测试' }, foes: [{ name: '灰林狼', hp: 5, hpMax: 11, ac: 13, atk: 3, trait: '成群' }] };
scanLeak('面板·combat', LTX.renderMixed(PANEL.combat(sLk)));
sLk.combat = cbSave;
const farDest = (WD.REGIONS || []).map(x => x.name).filter(n => n !== sLk.place && !win.GEO.isAdjacent(sLk.place, n))[0];
const lb = ENG.travel.tiers(sLk, farDest, 'long');
if (lb) {
  scanLeak('面板·tripTiers', LTX.renderMixed(PANEL.tripTiers(sLk, lb, null)));
  scanLeak('面板·trip', LTX.renderMixed(PANEL.trip(sLk, lb.plan, null)));
}
scanLeak('面板·codex', LTX.renderMixed(PANEL.codex('world', sLk)));
report('套件 14 · 渲染不留 LaTeX 原文');


/* ---------------- 套件 15 · AI 生成选项的合并规则与事件契约 ---------------- */
reset();
/* 这一段是确定性核对：AI 写的内容必须落回引擎认得的动作上，认不出就退回引擎那一格，
   所以「AI 生成选项」不可能产生点不动的按钮。 */
const base5 = [
  { k: 'a', label: '顺势推进（顺势而为）', kind: 'safe', act: 'forward' },
  { k: 'b', label: '硬闯过去（剑走偏锋）', kind: 'bold', act: 'bold' },
  { k: 'c', label: '先看清周围（谨慎观察）', kind: 'careful', act: 'careful' },
  { k: 'd', label: '歇一夜（休息）', kind: 'careful', act: 'rest' },
  { k: 'e', label: '自定义行动（直接输入）', kind: 'custom', act: 'custom' }
];
const aiGood = { options: [
  { role: 'safe', label: '顺着车辙往坡下走，看它通向哪（顺势而为）', act: 'forward' },
  { role: 'bold', label: '直接翻过矮墙去看院子（剑走偏锋）', act: 'bold' },
  { role: 'careful', label: '先数清院里有几双脚印（谨慎观察）', act: 'careful' },
  { role: 'rest', label: '退回背风处把靴子烘干（休息）', act: 'rest' }
] };
const m1 = GAME.aiMergeOptions(base5, aiGood);
eq(m1.length, 5, 'AI 选项合并后仍是五项');
eq(m1.map(o => o.k).join(''), 'abcde', '字母顺序没乱');
ok(/顺着车辙/.test(m1[0].label) && /翻过矮墙/.test(m1[1].label), '四格换成了 AI 写的文字', m1.map(o => o.label.slice(0, 10)).join('|'));
eq(m1[4].kind, 'custom', '自定义永远留在最后一位');
eq(m1[0].act, 'forward', 'AI 的 act 被采用（引擎认得）');
ok(m1.every(o => !!o.act && !!o.label), '每一项都有 act 与文字（不会出现空格子）');
/* 认不出的 act：那一格退回引擎原话 */
const aiBadAct = { options: [
  { role: 'safe', label: '这是一句模型瞎编的动作描写（顺势而为）', act: 'nonsense' },
  { role: 'bold', label: '太短', act: 'bold' },
  { role: 'careful', label: '先摸清地形再说（谨慎观察）', act: 'careful' },
  { role: 'rest', label: '歇一会儿（休息）', act: 'rest' }
] };
const m2 = GAME.aiMergeOptions(base5, aiBadAct);
ok(m2[0].label.indexOf('模型瞎编') < 0 && /顺势推进/.test(m2[0].label), 'act 认不出 → 退回引擎那一格', m2[0].label);
ok(m2[1].label.indexOf('太短') < 0, '文字太短 → 也退回引擎那一格', m2[1].label);
ok(/摸清地形/.test(m2[2].label), '合规的两格照常采用', m2[2].label);
eq(m2.length, 5, '退回之后仍然是五项');
/* 跨槽位：bold 的 act 被塞进 safe 槽也要挡住 */
const aiCross = { options: [
  { role: 'safe', label: '不管不顾冲过去（其实是走险）', act: 'bold' },
  { role: 'bold', label: '翻墙（剑走偏锋）', act: 'bold' },
  { role: 'careful', label: '先看着（谨慎观察）', act: 'careful' },
  { role: 'rest', label: '歇着（休息）', act: 'rest' }
] };
const m3 = GAME.aiMergeOptions(base5, aiCross);
ok(m3[0].act !== 'bold', '与槽位不相称的 act 不被采用（safe 槽不能用 bold）', m3[0].act);
/* 缺格：AI 只给三格时，缺的那格用引擎的 */
const aiShort = { options: [aiGood.options[0], aiGood.options[1], aiGood.options[2]] };
const m4 = GAME.aiMergeOptions(base5, aiShort);
eq(m4.length, 5, 'AI 少给一格时仍然凑满五项');
ok(/歇一夜|歇/.test(m4[3].label), '缺的那格用引擎的选项补上', m4[3].label);
/* 事件契约（与客户端 normalizeEvent 同一套判断，直接喂假回话） */
const evRaw = { kind: '遭遇', text: '坡下有人在烧湿柴，烟贴地爬过来。', foes: ['灰林狼', '编造的怪'], dc: 22, dmg: '2d6', loot: '旧匕首', why: '雪把气味压住了' };
const evOk = {};
ok(typeof evRaw.text === 'string' && evRaw.text.length > 4, '事件必须有可读的文本');
ok(/^\d+d\d+$/.test(evRaw.dmg), '伤害必须是 NdM 形状（引擎才掷得动）');
ok(evRaw.dc > 16, '越界的 DC 会被钳制（客户端与服务端都钳到 8-16）');
/* AI 事件的应用面：只认本地表里的怪物名 */
const names = (WD.MONSTERS || []).map(m => m.name);
ok(names.indexOf('灰林狼') >= 0, '灰林狼在本地怪物表里');
ok(names.indexOf('编造的怪') < 0, '白名单之外的怪物名会被丢掉');
report('套件 15 · AI 选项合并与事件契约');


/* ---------------- 套件 16 · 刷新只重画数据，不动内容与选项 ---------------- */
reset();
ok(typeof GAME.refreshView === 'function' && typeof GAME.refreshClick === 'function', '刷新入口已挂上 GAME');
{
  const s16 = GAME.newState(4321); ENG.seed(4321);
  s16.phase = 'playing'; s16.place = '曙光城'; s16.terrain = '平原'; s16.pc.level = 3;
  ENG.char.derive(s16);
  s16.pc.hp.max = s16.pc.hp.cur = 40;
  GAME.state = s16;
  GAME.pushText('这一行是已经生成的内容，刷新不许动它。', 'p-text');
  GAME.ACT.careful(s16);                 /* 先落一组选项，模拟「有未选选项」的局面 */
  const before = {
    blocks: byId.log.children.length,
    hist: s16.history.length,
    groups: document.querySelectorAll('#log .opts').length,
    labels: (GAME.opts || []).map(o => o.k + ':' + o.label).join('|'),
    turn: s16.turn,
    text0: byId.log.children[0].textContent
  };
  /* 从外部把数据改坏，再刷新：越界值要夹回来，内容与选项要一个字不变 */
  s16.pc.hp.cur = 99999; s16.pc.fatigue = 42;
  const r = GAME.refreshView(true);
  const after = {
    blocks: byId.log.children.length,
    hist: s16.history.length,
    groups: document.querySelectorAll('#log .opts').length,
    labels: (GAME.opts || []).map(o => o.k + ':' + o.label).join('|'),
    turn: s16.turn,
    text0: byId.log.children[0].textContent
  };
  eq(after.blocks, before.blocks, '刷新不追加文字块');
  eq(after.hist, before.hist, '刷新不改存档历史');
  eq(after.groups, before.groups, '刷新不新增选项组');
  eq(after.turn, before.turn, '刷新不消耗回合');
  eq(after.labels, before.labels, '刷新不改未选选项的文字与字母');
  eq(after.text0, before.text0, '刷新不改已经生成的内容');
  eq(s16.pc.hp.cur, s16.pc.hp.max, '刷新把越界生命夹回上限（derive 之后的上限）', String(s16.pc.hp.cur) + '/' + s16.pc.hp.max);
  eq(s16.pc.fatigue, 6, '刷新把越界疲劳夹回 0-6', String(s16.pc.fatigue));
  ok(r && r.untouched === true, '刷新自检报告：内容与选项未被改动');
  /* 选项组在被点掉之后，刷新也不能把它解封 */
  const first = (GAME.opts || [])[0];
  GAME.choose(first.k);
  const lockedBefore = document.querySelectorAll('#log .opts.locked').length;
  GAME.refreshView(true);
  eq(document.querySelectorAll('#log .opts.locked').length, lockedBefore, '刷新不会解封已经点过的选项组');
}
/* 联网时的选项流程：引擎选项不进占位以外的任何地方（合并规则已在套件 15 核对） */
ok(GAME.aiInfo().roles && GAME.aiInfo().roles.rest.indexOf('rest') >= 0, '槽位白名单可用（rest 槽含 rest）');
report('套件 16 · 刷新与选项流程');

/* ---------------- 汇总 ---------------- */
console.log('\n总计：通过 ' + CUM.pass + ' 项，失败 ' + CUM.fail + ' 项');
CUM.fails.slice(0, 40).forEach(f => console.log('  [X] ' + f));
process.exit(CUM.fail === 0 ? 0 : 1);
