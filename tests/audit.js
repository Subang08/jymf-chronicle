/* 目标条款逐项核验：静态标记 + 活体交互 + 设定集覆盖 */
'use strict';
const fs = require('fs');
const { loadGame, R } = require('./lib');
const HTML = '' + (process.env.JYMF_ROOT || require('path').resolve(__dirname, '..')) + '/剑与魔法命运编年史.html';
const h = fs.readFileSync(HTML, 'utf8');
let pass = 0, fail = 0; const fails = [];
function ok(c, label, extra) { if (c) pass++; else { fail++; fails.push(label + (extra !== undefined ? ' << ' + extra + ' >>' : '')); } }

/* ---------- 一、静态：单文件与美术硬约束 ---------- */
ok(!/https?:\/\//.test(h), '单文件零外链');
ok(!/@import|<link/.test(h), '无外部样式/字体引用');
ok(!/[\u{1F300}-\u{1FAFF}]/u.test(h), '零 emoji（补充平面）');
ok(!/[\u2190-\u21FF\u2B00-\u2BFF\uFE0F]/u.test(h.replace(/[→←]/g, '')), '零箭头/变体选择符等图形符号');
ok(h.indexOf('\\fcolorbox') >= 0 && h.indexOf('\\begin{array}') >= 0 && h.indexOf('\\scalebox') >= 0, 'LaTeX 面板骨架命令在成品中');
ok(h.indexOf('\\rule') >= 0 && h.indexOf('\\overline') >= 0, '进度条与分隔线命令在成品中');
ok(h.indexOf('--paper: #FDF6F0') >= 0 && h.indexOf('#E0B45A') >= 0 && h.indexOf('#8FC1DE') >= 0, '莫兰迪配色写入样式');
ok(h.indexOf('id="landing"') > 0 && h.indexOf('id="timeline"') > 0 && h.indexOf('id="side"') > 0, '起始页/左侧节点/右侧边栏结构齐备');
ok(h.indexOf('__bootGame') > 0 && h.indexOf('readyState') > 0, '自动启动钩子存在（按钮不会是死键）');
ok(/进入游戏前只有选项，没有自定义/.test(h) && /进入游戏后，每个回合的行动选项固定 a-e/.test(h), '起始页已说明选项规则（建卡只有选项、游戏内固定 a-e）');
ok(/天赋是抽的/.test(h) && /50% 五个 D 级/.test(h), '起始页已说明天赋按概率抽选');
ok(/AI 接 入/.test(h) && /接不接都能玩/.test(h), '起始页有 AI 接入入口并说明可选');
ok(/选择地区时会给出所在国家/.test(h), '起始页已说明选择地区会介绍国家与邻国');
ok(h.indexOf('选择地 区') > 0 || h.indexOf('选 择 地 区') > 0, '成品含「选择地区」入口');

/* ---------- 二、设定集条款：数据与面板覆盖 ---------- */
const G = loadGame();
const { win, byId, document } = G;
const { GAME, ENG, WD, TB, NARR, PANEL, CREATE, LTX, GEO } = win;
const need31 = {
  '创世神话': () => WD.COSMOS.length >= 6 && PANEL.codex('myth', GAME.state).indexOf('众星之母') > 0,
  '神系八神': () => WD.GODS.length === 8,
  '地理与国度': () => WD.REGIONS.length >= 41 && WD.NATIONS.length === 13 && WD.ORGS.length === 7,
  '种族': () => WD.RACES.length >= 12,
  '职业': () => WD.CLASSES.length === 10,
  '等级体系': () => WD.LEVELS.length >= 7,
  '魔法与禁忌': () => WD.SPELLS.length >= 30 && WD.SPELLS.some(s => s.forbidden),
  '副职业五阶': () => WD.CRAFTS.length === 8 && WD.CRAFT_TIERS.length === 5,
  '经济与物价': () => WD.PRICES.length >= 8 && WD.MONEY.gp === 1000 && WD.MONEY.pp === 10000,
  '战斗与死亡状态': () => WD.STATUSES.length >= 8,
  '阵营与声望': () => WD.ALIGNMENTS.length === 9 && WD.REP_LEVELS.length === 6,
  '道具神器品质': () => WD.QUALITY.length === 6 && WD.ARTIFACTS.length === 5 && WD.ITEMS.consumable.length >= 8,
  '纪元与时间线': () => WD.TIMELINE.eras.length === 5 && WD.TIMELINE.events.length >= 8,
  '行动ABCDE': () => {
    const css = PANEL.options([{ k: 'a', label: '顺势而为' }, { k: 'b', label: '剑走偏锋' }, { k: 'c', label: '谨慎观察' }, { k: 'd', label: '另一条路' }, { k: 'e', label: '自定义行动（直接输入）' }]);
    return ['【A】', '【B】', '【C】', '【D】', '【E】'].every(m => css.indexOf(m) > 0) &&
      h.indexOf('自定义行动') > 0 && css.split('\\fcolorbox').length === 6;
  },
  '状态栏字段': () => { const s = GAME.newState(1); const p = PANEL.status(s); return ['生命', '疲劳', '饥渴', '负重', '持币', '位置', '声望', '当前任务'].every(k => p.indexOf(k) >= 0); },
  '历法十二月份七曜六节': () => WD.CALENDAR.months.length === 12 && WD.CALENDAR.weekdays.length === 7 && WD.CALENDAR.festivals.length === 6,
  '语言体系': () => WD.LANGS.length === 8 && WD.DEAD_LANGS.length === 3 && WD.DIALECTS.length === 4,
  '怪物图鉴': () => WD.MONSTERS.length >= 17,
  '随机表覆盖': () => ['森林', '山脉', '丘陵', '平原', '沙漠', '荒原', '沼泽', '冰原', '海域', '地下', '废墟'].every(k => {
    const rows = (TB.WILD || {})[k] || []; const c = [];
    rows.forEach(r => { for (let i = r.n1; i <= r.n2; i++) c.push(i); });
    return c.length === 20 && new Set(c).size === 20;
  }) && (TB.CITY || []).length > 0 && (TB.NIGHT || []).length > 0,
  '任务模板四表': () => TB.TASK_TYPE.length === 10 && TB.TASK_GIVER.length === 8 && TB.TASK_PLACE.length > 0 && TB.TASK_RISK.length === 10,
  '快速建卡十背景十身份': () => WD.BACKGROUNDS.length === 10 && WD.IDENTITIES.length === 10,
  '四种开篇+剧本': () => WD.OPENINGS.length === 4 && ['north', 'aurum', 'forest', 'desert'].every(id => NARR.openingScript(id).length >= 4),
  '十二至二十七卷补遗': () => WD.LEGENDS.length === 4 && WD.RUMORS.length === 20 && WD.HEROES.length >= 5 && WD.LEGEND_HEROES.length >= 3 && WD.ETYMOLOGY.length >= 5 && WD.PRICING.length >= 4,
  '天赋五档可抽': () => ['SSS', 'A', 'B', 'C', 'D'].every(g => WD.TALENTS[g].length >= 6) && typeof ENG.talent.draw === 'function' && ENG.talent.odds().length === 5,
  '建卡选项顺排且无自定义': () => {
    GAME.startCreate(true);
    const n0 = CREATE.node(GAME.state);
    const raceCount = (WD.RACES || []).length;
    return CREATE.STEPS.length === 14 && n0.opts.length === raceCount &&
      n0.opts[0].k === 'a' && n0.opts.every((o, i) => o.k === CREATE.keyFor(i)) &&
      !n0.opts.some(o => o.kind === 'custom') && GAME.state.phase === 'create';
  },
  '建卡打字被退回（暗号除外）': () => {
    GAME.startCreate(true);
    const r = CREATE.pick(GAME.state, 'zz', '猫人');
    let g = 0;
    while (CREATE.cur(GAME.state) !== 'talent' && g++ < 30) GAME.choose('a');
    const rt = CREATE.pick(GAME.state, 'zz', '命运之线');
    const rk = CREATE.pick(GAME.state, 'zz', '剑与魔法');
    return r.ok === false && rt.ok === false && rk.ok === true && GAME.state.create.tal.mode === 'free';
  },
  '天赋按概率抽选且整组到手': () => {
    ENG.seed(97);
    const n = {};
    for (let i = 0; i < 20000; i++) { const d = ENG.talent.draw(GAME.state); n[d.grade] = (n[d.grade] || 0) + 1; }
    const pct = g => (n[g] || 0) / 20000 * 100;
    GAME.startCreate(true);
    let g = 0;
    while (CREATE.cur(GAME.state) !== 'talent' && g++ < 30) GAME.choose('a');
    for (let i = 0; i < 6; i++) {
      const d = CREATE.node(GAME.state).opts.find(o => o.value === 'draw');
      if (!d) break;
      CREATE.pick(GAME.state, d.k);
    }
    const draws = GAME.state.create.tal.draws;
    const take = CREATE.node(GAME.state).opts.find(o => String(o.value).indexOf('take:') === 0);
    CREATE.pick(GAME.state, take.k);
    const got = GAME.state.create.picks.talents;
    return draws.length === 5 && Math.abs(pct('D') - 50) < 1.5 && Math.abs(pct('C') - 30) < 1.5 &&
      Math.abs(pct('B') - 15) < 1.2 && Math.abs(pct('A') - 4) < 0.7 && Math.abs(pct('SSS') - 1) < 0.4 &&
      got.length === draws[0].list.length && got.every((t, i) => t.id === draws[0].list[i].id);
  },
  '游戏内选项固定a-e': () => {
    GAME.startCreate(true);
    let g = 0;
    while (GAME.state.phase === 'create' && g++ < 40) {
      const n = CREATE.node(GAME.state);
      GAME.choose(n.opts[n.opts.length - 1].kind === 'custom' && n.step === 'name' ? n.opts[n.opts.length - 1].k : 'a',
        n.step === 'name' ? '选项核验' : undefined);
    }
    while (GAME.state.flags.scriptIdx < (GAME.state.flags.script || []).length) GAME.choose('a');
    return GAME.state.phase === 'playing' && GAME.opts.map(o => o.k).join('') === 'abcde';
  },
  '选择地区给出国家/地理位置/附近国家': () => {
    const info = GEO.regionInfo('霜脊村');
    const p = GEO.regionPanel('霜脊村');
    return info.nationName === '北境共和国' && /北境/.test(info.position) &&
      info.nations.length >= 3 && info.nations.every(n => n.dir && n.far && n.trait) &&
      ['所在国家', '地理位置', '附近国家', '附近地区', '国情'].every(k => p.indexOf(k) > 0);
  },
  '全部地区都有地理情报': () => (WD.REGIONS || []).every(r => {
    const i = GEO.regionInfo(r.name);
    if (!i || !i.nationName || !i.position) return false;    return (i.neighbours.length >= 1 || !!i.neighbourNote) && (i.nations.length >= 1 || !!i.nationNote);
  }),
  '建卡含国度与地区两步': () => CREATE.STEPS.indexOf('nation') >= 0 && CREATE.STEPS.indexOf('region') >= 0 &&
    GEO.nationGroups().length === 14 && GEO.regionsOf('无主之地').length > 5,
  '国家内部分层': () => {
    const c = GEO.layersOf('晨曦王国');
    const cover = GEO.regionGroups().every(g =>
      GEO.layersOf(g.key || g.nation).reduce((a, l) => a + l.regions.length, 0) === g.regions.length);
    return c.map(l => l.layer).join(',') === '都城,村镇,野外,地下,遗迹' &&
      GEO.needLayerStep('晨曦王国') === true && GEO.needLayerStep('雄鹿王国') === false &&
      cover && /按层分/.test(GEO.nationPanel('晨曦王国')) &&
      GEO.layerOf(GEO.regionOf('回音井')) === '地下' && GEO.layerOf(GEO.regionOf('圣光之庭')) === '位面';
  },
  '地下与位面的邻接判定正确': () => {
    const echo = GEO.regionInfo('回音井');      /* 主物质位面的地底：应有邻国与地表邻地 */
    const holy = GEO.regionInfo('圣光之庭');    /* 上层位面：应写明无接壤国家 */
    const mid = GEO.regionInfo('永恒森林');     /* 中环位面：与先祖大厅互为邻地 */
    return echo.nations.length >= 1 && echo.neighbours.length >= 1 &&
      holy.nations.length === 0 && !!holy.nationNote && !!holy.neighbourNote &&
      mid.neighbours.some(n => n.name === '先祖大厅');
  },
  '多层地图': () => {
    const M = win.MAP;
    if (!M) return false;
    const res = id => { const m = M.svg(id).match(/data-map-node="([^"]+)"/g) || []; return m.map(x => x.replace(/.*"(.*)"/, '$1')); };
    const l1 = res('world');
    const strip = res('world').length ? (M.planeStrip('曙光城').match(/data-map-node="([^"]+)"/g) || []).map(x => x.replace(/.*"(.*)"/, '$1')) : [];
    const l2ok = M.tree().children.every(g => M.svg(g.id).length > 500);
    return M.stats().regions === (WD.REGIONS || []).length &&
      l1.length >= 16 && l1.every(id => !!M.find(id)) &&
      strip.length === 1 && !!M.find(strip[0]) &&
      M.svg('world', '曙光城').indexOf('map-here') > 0 &&
      M.svg('world').indexOf('不在主物质位面') < 0 && /不在主物质位面/.test(M.planeStrip('曙光城')) &&
      l2ok && !!M.find('s:曙光城/金色圆盘大教堂/圣髑龛') &&
      /地 区 志/.test(M.info('r:曙光城')) && /疆 域 志/.test(M.info('g:无主之地/位面')) &&
      M.pathOf('s:曙光城/金色圆盘大教堂/圣髑龛').length === 5;
  },
  '长途出行与走法挡位': () => {
    const s = GAME.newState(77);
    s.place = '曙光城'; s.terrain = '平原';
    ENG.seed(77); ENG.char.derive(s);
    ENG.money.gain(s, 80 * (ENG.money.RATE.gp || 1000));
    const b = ENG.travel.tiers(s, '龙火城');
    if (!b || b.tiers.length !== 4) return false;
    const foot = b.tiers.filter(x => x.id === 'foot')[0];
    const cart = b.tiers.filter(x => x.id === 'caravan')[0];
    const mount = b.tiers.filter(x => x.id === 'mount')[0];
    const rush = b.tiers.filter(x => x.id === 'rush')[0];
    const everyHopAdjacent = b.plan.route.every((n, i) => i === 0 || GEO.isAdjacent(b.plan.route[i - 1], n));
    /* 状态差 → 挡位被锁 */
    const tired = GAME.newState(78); tired.place = '曙光城'; tired.terrain = '平原';
    ENG.seed(78); ENG.char.derive(tired); tired.pc.fatigue = 5;
    const rushLocked = ENG.travel.tiers(tired, '龙火城').tiers.filter(x => x.id === 'rush')[0].ok === false;
    const broke = GAME.newState(79); broke.place = '曙光城'; broke.terrain = '平原';
    ENG.seed(79); ENG.char.derive(broke);
    const payLocked = ENG.travel.tiers(broke, '龙火城').tiers.filter(x => x.id === 'caravan')[0].ok === false;
    const card = PANEL.tripTiers(s, b, null);
    return everyHopAdjacent && !GEO.isAdjacent('曙光城', '龙火城') &&
      b.tiers.map(x => x.name).join(',') === '自己走,搭商队,雇车马,急行夜路' &&
      rush.days < foot.days && cart.costSP > foot.costSP &&
      (cart.ok ? cart.atLeastOne < foot.atLeastOne : true) &&
      rush.fatigue > foot.fatigue && mount.days < foot.days &&
      b.plan.march === true && ENG.travel.tiers(s, '圣光之庭') === null &&
      rushLocked && payLocked &&
      ['选一种走法', '自己走', '搭商队', '雇车马', '急行夜路', '无论走哪一档'].every(k => card.indexOf(k) > 0);
  },
  '长途出行与代价清单': () => {
    const s = GAME.newState(77);
    s.place = '曙光城'; s.terrain = '平原';
    ENG.seed(77); ENG.char.derive(s);
    const fast = ENG.travel.longPlan(s, '龙火城');
    const both = ENG.travel.longOptions(s, '龙火城');
    if (!fast || !both) return false;
    const card = PANEL.trip(s, fast, both.safe);
    const everyHopAdjacent = fast.route.every((n, i) => i === 0 || GEO.isAdjacent(fast.route[i - 1], n));
    return fast.stops >= 2 && everyHopAdjacent && !GEO.isAdjacent('曙光城', '龙火城') &&
      fast.days >= fast.stops && fast.costSP >= fast.days * 8 && fast.fatigue >= 1 &&
      fast.heatAfter > fast.heatNow && fast.march === true &&
      fast.atLeastOne > 0.2 && fast.atLeastOne < 0.95 &&
      ['目的地', '最快', '要付的代价', '路程', '盘缠', '疲劳', '出行热度', '路上可能失去的东西'].every(k => card.indexOf(k) > 0) &&
      GEO.route('曙光城', '圣光之庭') === null;
  },
  '地图画布等比缩小': () => {
    const css = fs.readFileSync('' + (process.env.JYMF_ROOT || require('path').resolve(__dirname, '..')) + '/build/style.css', 'utf8');
    const stage = /\.mapstage\s*\{[^}]*\}/.exec(css);
    return !!stage && /aspect-ratio:\s*1000\s*\/\s*620/.test(stage[0]) &&
      /width:\s*min\(100%,\s*790px\)/.test(stage[0]) && /\.map-planes\s*\{[^}]*width:\s*min\(100%,\s*790px\)/.test(css);
  },
  '邻近出行与路上风险': () => {
    const noNear = (WD.REGIONS || []).filter(r => GEO.adjacentTo(r.name).length === 0);
    const s = GAME.newState(99);
    s.place = '曙光城'; s.terrain = '平原';
    ENG.seed(99); ENG.char.derive(s);
    const low = ENG.travel.risk(s, GEO.regionOf('喷泉广场'));
    const high = ENG.travel.risk(s, GEO.regionOf('安息烛墓园'));
    const before = ENG.travel.risk(s, GEO.regionOf('喷泉广场'));
    ENG.travel.addHeat(s, 5);
    const after = ENG.travel.risk(s, GEO.regionOf('喷泉广场'));
    const cooled = ENG.travel.cool(s, 3);
    return noNear.length === 0 &&
      !GEO.isAdjacent('曙光城', '龙骨山脉') &&
      GEO.adjacentTo('圣光之庭').map(x => x.name).join(',') === '时空裂隙' &&
      high > low && after > before && cooled === 2 &&
      ENG.travel.forecast(s, GEO.regionOf('喷泉广场')).word.length > 0 &&
      ENG.travel.mishap(s, GEO.regionOf('龙骨山脉')).kind.length > 0;
  },
  '无主之地拆成子组': () => {
    const subs = GEO.wildGroups();
    const total = subs.reduce((a, s) => a + s.regions.length, 0);
    return subs.length === 4 && subs.map(s => s.sub).join(',') === '荒野,海域,遗迹,位面' &&
      total === GEO.regionsOf('无主之地').length &&
      GEO.regionGroups().length === 17 &&
      GEO.regionGroups().reduce((a, g) => a + g.regions.length, 0) === (WD.REGIONS || []).length &&
      /疆 域 志/.test(GEO.nationPanel('无主之地/位面'));
  },
};
GAME.startCreate(true);
for (const k in need31) {
  try { ok(need31[k](), '设定集条款：' + k); }
  catch (e) { ok(false, '设定集条款：' + k, e.message); }
}

/* ---------- 三、活体：上一作交互规格 ---------- */
win.__bootGame();
ok(byId.landing.className.indexOf('hidden') < 0, '开始界面默认显示');
ok(byId.landStart && byId.landContinue && byId.landCodex && byId.landAbout, '开始界面按钮齐备');
GAME.startCreate(true);
let g = 0;
while (GAME.state.phase === 'create' && g++ < 40) {
  const n = CREATE.node(GAME.state);
  /* 建卡已无自定义项；天赋步先抽一次再收下第一组 */
  if (n.step === 'talent') { GAME.choose('a'); GAME.choose(GAME.opts[0].k); }
  else GAME.choose('a');
}
ok(GAME.state.phase === 'playing', '建卡可走完并进入世界');
ok(GAME.state.pc.talents.length >= 1, '天赋按抽到的档位到手（' + GAME.state.pc.talents.map(t => t.grade).join('/') + '）');
ok(GAME.state.pc.talents.every(t => t.grade === GAME.state.pc.talents[0].grade), '同一组天赋等级一致');
const firstHtml = byId.log.children[0].outerHTML;
const nodesBefore = GAME.state.nodes.length;
while (GAME.state.flags.scriptIdx < (GAME.state.flags.script || []).length) GAME.choose('a');
for (let i = 0; i < 8; i++) { GAME.state.pc.hp.cur = GAME.state.pc.hp.max; GAME.choose(['a', 'c', 'd'][i % 3]); }
ok(byId.log.children[0].outerHTML === firstHtml, '文字浏览区只增不减：首块仍在');
ok(GAME.state.nodes.length > nodesBefore + 5, '左侧行动节点随回合登记');
ok(byId.tlInner.children.length > 5, '左侧节点栏渲染');
const n0 = GAME.state.nodes[2];
const snap = () => JSON.stringify({ t: GAME.state.turn, hp: Math.round(GAME.state.pc.hp.cur), g: ENG.money.total(GAME.state), n: GAME.state.nodes.length, hz: GAME.state.history.length, day: GAME.state.time.day + ':' + GAME.state.time.hour });
const s1 = snap(); GAME.jumpTo(n0); const s2 = snap();
ok(s1 === s2, '点击节点纯回顾，进度零变化');
GAME.openSide('status'); ok(byId.side.classList.contains('open') && byId.sideBody.allText().indexOf('玩 家 状 态') >= 0, '右侧状态边栏可弹出');
GAME.openSide('bag'); ok(byId.sideBody.allText().indexOf('物 品 栏') >= 0, '右侧物品栏可切换');
GAME.closeSide(); ok(!byId.side.classList.contains('open'), '侧边栏关闭按钮生效');
byId.btnCard.dispatch('click'); ok(byId.modal.className.indexOf('hidden') < 0, '角色卡按钮有真实行为');
GAME.closeModal();
byId.btnCodex.dispatch('click'); ok(byId.modalBox.allText().indexOf('典 籍') >= 0, '典籍按钮有真实行为');
GAME.closeModal();
byId.btnChron.dispatch('click'); ok(byId.modalBox.allText().indexOf('纪 元') >= 0 || byId.modalBox.allText().length > 50, '大事记按钮有真实行为');
GAME.closeModal();
byId.btnSet.dispatch('click'); ok(byId.modalBox.allText().indexOf('存 档') >= 0, '设置按钮有真实行为');
GAME.closeModal();
ok(PANEL.options([{ k: 'a', label: 'x' }]).indexOf('【A】') > 0, '选项渲染为 LaTeX 气泡');
ok(GAME.opts.length === 5, '每回合五个选项 a-e');
ok(byId.chips.allText().indexOf('查 看 玩 家 状 态') >= 0 && byId.chips.allText().indexOf('查 看 物 品 栏') >= 0, '回合结束给出两个查看按钮');

console.log('=== 目标条款核验 ===');
console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
fails.forEach(f => console.log('  [X] ' + f));
process.exit(fail === 0 ? 0 : 1);
