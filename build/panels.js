/* ============================================================
   面板生成器 · 严格照《LaTeX 美化面板制作规范》
   所有函数返回 \(...\) 包裹的 LaTeX 子集字符串（禁止 $$）。
   主题：gold 奶金 / blue 雾蓝 / pink 玫粉 / lav 薰衣草 / matcha 抹茶 /
         coral 珊瑚 / orange 蜜橘 / lightgold 浅金 / grayblue 灰蓝 / sand 浅砂
   ============================================================ */
(function (global) {
  'use strict';

  var LTX = global.LTX, WD = global.WD || {}, ENG = global.ENG, TB = global.TB || {};
  var T = LTX.THEMES, INK = LTX.INK, ATTR = LTX.ATTR, BG = LTX.BG;

  /* LaTeX 内容消毒：数据里的 { } % & # _ $ 与反斜杠不能进面板 */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/\\/g, '/')
      .replace(/([{}%&#_$])/g, '\\$1');
  }
  function t(v, color) { return '\\textcolor{' + (color || INK.body) + '}{' + esc(v) + '}'; }
  function b(v, color) { return '\\textcolor{' + (color || INK.em) + '}{\\textbf{' + esc(v) + '}}'; }
  function kv(k, v, kc, vc) { return t(k + '：', kc || INK.dim) + t(v, vc || INK.body); }
  function rule(color, n) { return '\\textcolor{' + (color || T.blue.bd) + '}{\\overline{' + '\\qquad'.repeat(n || 6) + '}}'; }
  function bar(label, cur, max, color) {
    return t(label, INK.body) + '\\quad ' + LTX.bar(cur, max, color) + '\\quad ' +
      t(Math.round(cur) + '/' + Math.round(max), color || INK.body);
  }
  function small(v, color) { return '\\textcolor{' + (color || INK.dim) + '}{\\footnotesize ' + esc(v) + '}'; }

  function panel(o) {
    o = o || {};
    var lines = (o.lines || []).filter(function (x) { return x != null && x !== ''; });
    return LTX.mkPanel({
      theme: o.theme || 'blue', bg: o.bg, title: o.title ? esc(o.title) : null,
      lines: lines, foot: o.foot ? esc(o.foot) : null, scale: o.scale || 0.8
    });
  }
  function wrap(code, cls) { return LTX.panel(LTX.latexToHtml(code), { cls: cls }); }

  /* ---------------- 状态栏（第二十二卷 · 完整版） ---------------- */
  function status(st) {
    var pc = st.pc, L = [];
    var li = ENG.char.levelInfo(pc.level);
    L.push(t(pc.name + '   ' + pc.raceName + '   ' + pc.clsName, INK.em) + '\\quad ' + b('Lv' + pc.level + ' ' + li.name, T.gold.ti));
    L.push(rule(T.blue.bd, 5));
    L.push(bar('生命', pc.hp.cur, pc.hp.max, ATTR.hp));
    L.push(bar(pc.powerName || '法力', pc.mp.cur, pc.mp.max, ATTR.joy));
    L.push(bar('经验', pc.xp, pc.xpNext, ATTR.xp) + '\\quad ' + small(pc.xp + ' / ' + pc.xpNext));
    L.push(rule(T.blue.bd, 5));
    L.push(kv('状态', pc.status, INK.dim, pc.status === '健康' ? T.matcha.ti : T.coral.ti) +
      '\\quad ' + kv('疲劳', (pc.fatigue || 0) + ' 级', INK.dim, pc.fatigue ? T.coral.ti : INK.body));
    L.push(kv('饥渴', (pc.hunger || '饱足') + ' / ' + (pc.thirst || '正常'), INK.dim, (pc.hunger !== '饱足' || pc.thirst !== '正常') ? T.coral.ti : INK.body));
    L.push(kv('负重', (pc.weight ? pc.weight.cur + ' / ' + pc.weight.max + ' 磅' : '—'), INK.dim, INK.body) +
      '\\quad ' + t((pc.enc ? pc.enc.name : ''), INK.dim));
    L.push(kv('持币', ENG.money.fmt(ENG.money.total(st)), INK.dim, ATTR.gold));
    var heatNow = (ENG.travel && ENG.travel.heat) ? ENG.travel.heat(st) : 0;
    L.push(kv('位置', st.place + '（' + (st.region || st.terrain || '') + '）') +
      (heatNow ? ('\\quad ' + t('出行热度 ' + heatNow, heatNow >= 3 ? T.coral.ti : T.lightgold.ti)) : ''));
    var reps = Object.keys(st.rep || {}).slice(0, 3).map(function (k) {
      return t(k + ' ' + st.rep[k].level, INK.dim);
    });
    L.push(kv('声望', '') + (reps.length ? reps.join('  ') : t('尚未与任何势力打过交道', INK.dim)));
    var q = (st.quests || []).filter(function (x) { return x.state === '进行中'; })[0];
    L.push(kv('当前任务', q ? (q.name + '（' + q.type + ' · ' + q.state + '）') : '无', INK.dim, q ? T.lightgold.ti : INK.body));
    return panel({
      theme: 'blue', title: '玩 家 状 态', lines: L,
      foot: ENG.time.stamp(st) + ' · 第 ' + st.turn + ' 回合'
    });
  }

  /* ---------------- 完整角色卡（第二十二卷第六章） ---------------- */
  function card(st) {
    var pc = st.pc, L = [];
    L.push(t('姓名 ' + pc.name + ' · 年龄 ' + (pc.age || '—') + ' · 性别 ' + pc.gender, INK.body) +
      '\\quad ' + t('种族 ' + pc.raceName, INK.body));
    L.push(t('职业 ' + pc.clsName + ' · 等级 ' + pc.level + '（' + ENG.char.levelName(pc.level) + '）', INK.body));
    L.push(t('背景 ' + (pc.bgName || '—') + ' · 身份 ' + (pc.identityName || '—'), INK.body));
    L.push(t('阵营 ' + (pc.alignName || '—') + '（' + (pc.alignId || '—') + '）', INK.body));
    L.push(rule(T.gold.bd, 6));
    var line1 = [], line2 = [];
    ENG.ATTR_KEYS.forEach(function (k, i) {
      var s = t(ENG.attrCN(k) + ' ' + pc.attrs[k], INK.body) + small('（' + (ENG.attrMod(pc.attrs[k]) >= 0 ? '+' : '') + ENG.attrMod(pc.attrs[k]) + '）');
      (i < 3 ? line1 : line2).push(s);
    });
    L.push(line1.join('\\quad ')); L.push(line2.join('\\quad '));
    L.push(rule(T.gold.bd, 6));
    L.push(bar('生命', pc.hp.cur, pc.hp.max, ATTR.hp));
    L.push(bar(pc.powerName || '法力', pc.mp.cur, pc.mp.max, ATTR.joy));
    L.push(kv('护甲', String(pc.ac), INK.dim) + '\\quad ' + kv('先攻', (pc.init >= 0 ? '+' : '') + pc.init, INK.dim) +
      '\\quad ' + kv('速度', Math.round(pc.speed) + ' 英尺', INK.dim));
    L.push(kv('近战加值', (ENG.combat.attackBonus(st, false) >= 0 ? '+' : '') + ENG.combat.attackBonus(st, false), INK.dim) +
      '\\quad ' + kv('远程加值', (ENG.combat.attackBonus(st, true) >= 0 ? '+' : '') + ENG.combat.attackBonus(st, true), INK.dim));
    L.push(rule(T.gold.bd, 6));
    L.push(kv('技能熟练', (pc.skills || []).join('、') || '无'));
    L.push(kv('语言', (pc.langs || []).join('、') || '通用语'));
    if ((pc.talents || []).length) L.push(kv('天赋', pc.talents.map(function (x) { return x.name + '（' + x.grade + '）'; }).join('、'), INK.dim, T.lav.ti));
    if ((pc.spells || []).length) L.push(kv('法术', pc.spells.slice(0, 8).join('、')));
    if ((pc.injured || []).length) L.push(kv('永久损伤', pc.injured.map(function (x) { return x.name; }).join('、'), INK.dim, T.coral.ti));
    if ((pc.trauma || []).length) L.push(kv('创伤心魔', pc.trauma.join('、'), INK.dim, T.coral.ti));
    L.push(rule(T.gold.bd, 6));
    L.push(kv('持币', ENG.money.fmt(ENG.money.total(st)), INK.dim, ATTR.gold) +
      '\\quad ' + kv('负重', (pc.weight ? pc.weight.cur + '/' + pc.weight.max + ' 磅' : '—'), INK.dim));
    L.push(kv('队友随从', (st.team || []).map(function (x) { return x.name + '（' + x.status + '）'; }).join('、') || '无'));
    L.push(kv('出身地', pc.homeland || '—') + '\\quad ' + kv('生日', pc.born ? (pc.born.year + '年' + pc.born.month + '月' + pc.born.day + '日') : '—'));
    return panel({ theme: 'gold', title: '角 色 卡', lines: L, foot: '依据设定集第二十二卷第六章 · 完整版角色卡' });
  }

  /* ---------------- 物品栏 ---------------- */
  function bag(st) {
    var L = [], bag = st.bag || [];
    L.push(kv('随身物品', bag.length + ' 类', INK.dim) + '\\quad ' +
      kv('总重', (st.pc.weight ? st.pc.weight.cur + ' / ' + st.pc.weight.max + ' 磅' : '—'), INK.dim) +
      '\\quad ' + kv('持币', ENG.money.fmt(ENG.money.total(st)), INK.dim, ATTR.gold));
    L.push(rule(T.orange.bd, 6));
    if (!bag.length) L.push(t('空无一物。', INK.dim));
    bag.slice(0, 26).forEach(function (it) {
      var mark = it.equip ? b('[装备] ', T.matcha.ti) : '';
      var q = (it.qty || 1) > 1 ? t(' x' + it.qty, INK.dim) : '';
      L.push(mark + t(it.name, INK.body) + q + '\\quad ' + small((it.kind || '') + (it.dmg ? ' · ' + it.dmg : '') + (it.ac ? ' · AC ' + it.ac : '') +
        (it.weight ? ' · ' + (it.weight * (it.qty || 1)) + ' 磅' : '')));
      if (it.desc) L.push(small('    ' + it.desc, INK.dim));
    });
    if (bag.length > 26) L.push(small('其余 ' + (bag.length - 26) + ' 类未列出。', INK.dim));
    L.push(rule(T.orange.bd, 6));
    L.push(small('装备中的武器/护甲按最佳一件结算；卖出价为原价之半。', INK.dim));
    return panel({ theme: 'orange', title: '物 品 栏', lines: L, foot: '依据设定集第六卷 · 第九卷 · 第十六卷' });
  }

  /* ---------------- 战斗 ---------------- */
  function combat(st) {
    var cb = st.combat, pc = st.pc, L = [];
    if (!cb) return panel({ theme: 'coral', title: '战 斗', lines: [t('当前没有战斗。', INK.dim)] });
    L.push(t('第 ' + cb.round + ' 轮', INK.em) + '\\quad ' + small(st.place));
    L.push(rule(T.coral.bd, 6));
    L.push(t(pc.name + ' ' + pc.clsName + ' Lv' + pc.level, INK.body) + '\\quad ' + LTX.bar(pc.hp.cur, pc.hp.max, ATTR.hp) +
      '\\quad ' + t(Math.max(0, Math.round(pc.hp.cur)) + '/' + pc.hp.max, ATTR.hp));
    if ((pc.cond || []).length) L.push(t('自身状态：' + pc.cond.join('、'), T.coral.ti));
    L.push(rule(T.coral.bd, 6));
    cb.foes.forEach(function (f, i) {
      var dead = f.hp <= 0;
      L.push(b('[' + 'abcde'[i] + '] ', dead ? T.matcha.ti : T.coral.ti) +
        t(f.name, dead ? INK.dim : INK.body) + '\\quad ' + LTX.bar(Math.max(0, f.hp), f.hpMax, dead ? T.matcha.bd : T.coral.bd) +
        '\\quad ' + t(Math.max(0, Math.round(f.hp)) + '/' + f.hpMax, INK.dim) + '\\quad ' + small('AC ' + f.ac + ' 攻击 +' + f.atk));
      if (!dead && f.trait) L.push(small('    ' + f.trait, INK.dim));
      if (dead) L.push(small('    已倒下。', T.matcha.ti));
    });
    L.push(rule(T.coral.bd, 6));
    L.push(small('命中判定 = d20 + 攻击加值 对抗 AC；伤害 = 武器骰 + 属性调整值。', INK.dim));
    return panel({ theme: 'coral', title: '战 斗 · ' + (cb.ctx && cb.ctx.name ? esc(cb.ctx.name) : '接 敌'), lines: L, bg: BG.warn });
  }

  /* ---------------- 任务 ---------------- */
  function task(st, one) {
    var L = [], list = one ? [one] : (st.quests || []);
    if (!list.length) {
      return panel({ theme: 'lightgold', title: '任 务', lines: [t('手上没有委托。告示板、酒馆与公会都能接活。', INK.dim)] });
    }
    list.forEach(function (q, i) {
      if (i) L.push(rule(T.lightgold.bd, 6));
      L.push(b(q.name, T.lightgold.ti) + '\\quad ' + t('【' + q.type + '】', INK.dim) + '\\quad ' + t(q.state, q.state === '完成' ? T.matcha.ti : INK.body));
      L.push(kv('委托人', q.giver + (q.giverTrait ? '（' + q.giverTrait + '）' : '')));
      L.push(kv('目标地点', q.place));
      L.push(kv('主要目标', q.goal));
      if (q.extra) L.push(kv('次要目标', q.extra));
      L.push(kv('预估难度', q.diff + '（' + (q.diffLevel ? q.diffLevel.join('-') + '级' : '') + ' · DC ' + q.dc + '）', INK.dim, T.coral.ti));
      L.push(kv('基础报酬', q.reward + ' GP', INK.dim, ATTR.gold) + '\\quad ' + small(q.rewardNote || ''));
      L.push(kv('潜在风险', q.risk, INK.dim, T.coral.ti));
      L.push(kv('时间限制', q.limit ? q.limit + ' 天内完成，否则目标转移' : '无期限', INK.dim, q.limit ? T.coral.ti : INK.body));
    });
    return panel({ theme: 'lightgold', title: '任 务 · 委 托 书', lines: L, foot: '依据设定集第十九卷 · 任务生成模板' });
  }

  /* ---------------- 商店 ---------------- */
  function shop(st, list, title) {
    var L = [];
    L.push(kv('持币', ENG.money.fmt(ENG.money.total(st)), INK.dim, ATTR.gold) + '\\quad ' + small('1 GP = 10 SP = 100 CP · 1 PP = 10 GP'));
    L.push(rule(T.orange.bd, 6));
    (list || []).forEach(function (it, i) {
      L.push(b('[' + 'abcdefghijklmn'[i] + '] ', T.orange.ti) + t(it.name, INK.body) + '\\quad ' +
        t(it.price + ' GP', ATTR.gold) + '\\quad ' + small((it.quality || ENG.item.qualityOf(it.price)) + (it.dmg ? ' · ' + it.dmg : '') + (it.ac ? ' · AC ' + it.ac : '')));
      if (it.effect || it.desc) L.push(small('    ' + (it.effect || it.desc), INK.dim));
    });
    L.push(rule(T.orange.bd, 6));
    L.push(small('按下对应字母买入；卖出价为原价之半。定价规则见第十八卷第四章。', INK.dim));
    return panel({ theme: 'orange', title: title || '商 铺 · 价 目', lines: L });
  }

  /* ---------------- 升级 ---------------- */
  function levelup(st, res) {
    var pc = st.pc, L = [];
    L.push(b('等级提升', T.matcha.ti) + '\\quad ' + t('Lv' + res.level + ' · ' + res.name, INK.em));
    L.push(rule(T.matcha.bd, 6));
    L.push(kv('职业', res.cls));
    L.push(kv('生命上限', '+' + res.gain + '（现 ' + pc.hp.max + '）', INK.dim, ATTR.hp));
    L.push(kv('境界', res.name + ' · ' + (ENG.char.levelInfo(pc.level).stand || ''), INK.dim, T.matcha.ti));
    L.push(kv('社会地位', ENG.char.levelInfo(pc.level).status || '—'));
    L.push(kv('寿命影响', ENG.char.levelInfo(pc.level).life || '—'));
    if (pc.slots) L.push(kv('法术位', '1环 ' + (pc.slots[1] || 0) + ' · 2环 ' + (pc.slots[2] || 0) + ' · 3环 ' + (pc.slots[3] || 0)));
    L.push(kv('下一级所需', pc.xpNext + ' 经验', INK.dim, ATTR.xp));
    return panel({ theme: 'matcha', title: '升 级', lines: L, foot: '升级所需经验 = 当前等级 x 1000 + 500' });
  }

  /* ---------------- 死亡 ---------------- */
  function death(st, info) {
    var pc = st.pc, L = [], t0 = st.time;
    L.push(b('你死了。', T.coral.ti));
    L.push(rule(T.coral.bd, 6));
    L.push(kv('姓名', pc.name) + '\\quad ' + kv('种族', pc.raceName) + '\\quad ' + kv('性别', pc.gender));
    L.push(kv('职业', pc.clsName + ' Lv' + pc.level + '（' + ENG.char.levelName(pc.level) + '）'));
    L.push(kv('出生时间', pc.born ? (pc.born.year + '年' + pc.born.month + '月' + pc.born.day + '日') : '—'));
    L.push(kv('死亡时间', t0.year + '年' + t0.month + '月' + t0.day + '日 ' + ENG.time.shichen(t0), INK.dim, T.coral.ti));
    L.push(kv('死亡地点', st.place + '（' + (st.region || '') + '）'));
    L.push(kv('死亡原因', info && info.cause ? info.cause : '伤重不治', INK.dim, T.coral.ti));
    L.push(kv('所属阵营', (pc.alignName || '—') + ' · ' + (pc.identityName || '—')));
    L.push(kv('最终身份', ENG.char.levelName(pc.level) + ' ' + pc.clsName));
    if ((pc.deeds || []).length) {
      L.push(rule(T.coral.bd, 6));
      L.push(t('行迹：', INK.dim));
      pc.deeds.slice(-6).forEach(function (d) { L.push(small('  · ' + d, INK.body)); });
    }
    L.push(rule(T.coral.bd, 6));
    L.push(small('传奇级以下没有复活魔法。这一局到此为止；世界继续走，它不为你停留。', INK.dim));
    return panel({ theme: 'coral', title: '死 亡 通 告', lines: L, bg: BG.warn });
  }

  /* ---------------- 时间 ---------------- */
  function time(st) {
    var t0 = st.time, mi = ENG.time.monthInfo(t0), wd = ENG.time.weekday(t0), fs = ENG.time.festival(st);
    var L = [];
    L.push(b(ENG.time.stamp(st), T.blue.ti));
    L.push(rule(T.blue.bd, 6));
    L.push(kv('纪元', '当代纪元 · 帝国崩塌后第 ' + t0.year + ' 年'));
    L.push(kv('月份', mi.name + '（' + t0.month + '月 · ' + mi.season + '）'));
    L.push(kv('月令', mi.trait || '—'));
    L.push(kv('星曜', wd.name + '（' + wd.meaning + '）'));
    L.push(kv('时刻', ENG.time.shichen(t0) + ' · ' + ENG.time.partOfDay(t0)));
    L.push(kv('天候', ENG.time.weather(st)));
    if (fs) L.push(kv('节庆', fs.name + '：' + fs.desc, INK.dim, T.gold.ti));
    L.push(rule(T.blue.bd, 6));
    L.push(small('一年 365 日 · 12 月 x 30 日 + 年末 5 节庆日 · 星母历以帝国崩塌之年为元年', INK.dim));
    return panel({ theme: 'blue', title: '星 母 历', lines: L });
  }

  /* ---------------- 天赋选择 ---------------- */
  /* 天赋面板：开局抽选规则 / 抽选记录 / 自由选择，三处共用。
     list 里放的是抽选记录（{grade,n,cn,list}）或天赋条目本身。 */
  function talents(st, list, title) {
    var L = [];
    L.push(small('开局的天赋不自己写：按概率抽一组，抽到多少就带走多少。可重复抽取五次，最后收下其中一组。', INK.dim));
    L.push(rule(T.lav.bd, 6));
    /* 概率表公开 */
    var odds = ENG.talent.odds();
    L.push(b('抽 选 概 率', T.lav.ti));
    odds.forEach(function (o) {
      L.push(small('    ' + (o.p * 100) + '%　' + o.cn + '（从 ' + o.grade + ' 级的 ' + ENG.talent.byGrade(o.grade).length + ' 条里随机取，不重复）', INK.body));
    });
    L.push(small('    抽到的这一组不能改写；不满意可以再抽（最多五次），全部到手，不需要从中挑。', INK.dim));
    if ((list || []).length) {
      L.push(rule(T.lav.bd, 6));
      var isDraws = !!(list[0] && list[0].list);
      if (isDraws) {
        L.push(b('抽 选 记 录', T.lav.ti));
        list.forEach(function (d, i) {
          L.push(b('第 ' + (i + 1) + ' 次：' + d.cn, INK.em) + '\\quad ' + small(d.list.map(function (x) { return x.name; }).join('、'), T.matcha.ti));
        });
      } else {
        L.push(b('已 选 ' + list.length + ' 项', T.lav.ti));
        list.forEach(function (x, i) {
          L.push(b('[' + 'abcdefghij'[i] + '] ', T.lav.ti) + b(x.name + '（' + x.grade + '）', INK.em));
          L.push(small('    ' + (x.desc || ''), INK.body));
          var ef = effectText(x.effect);
          if (ef) L.push(small('    效果：' + ef, T.matcha.ti));
        });
      }
    }
    return panel({ theme: 'lav', title: title || '天 赋 · 抽 选', lines: L, bg: BG.mystic });
  }
  function effectText(e) {
    if (!e) return '';
    var out = [];
    if (e.attrs) for (var k in e.attrs) out.push(ENG.attrCN(k) + (e.attrs[k] >= 0 ? '+' : '') + e.attrs[k]);
    if (e.checks) out.push('所有检定 +' + e.checks);
    if (e.ac) out.push('AC +' + e.ac);
    if (e.hp) out.push('生命上限 +' + e.hp);
    if (e.atk) out.push('攻击 +' + e.atk);
    if (e.dmg) out.push('伤害 +' + e.dmg);
    if (e.gold) out.push('起始金币 +' + e.gold + ' GP');
    if (e.rep) for (var o in e.rep) out.push(o + ' 声望 +' + e.rep[o]);
    if (e.special) out.push(specialText(e.special));
    return out.join(' · ');
  }
  var SPECIAL = {
    reroll_first: '每场战斗的第一次判定可重掷一次，重掷的结果必须接受',
    death_door: '濒死时生死豁免两次成功即可稳定',
    contract_bond: '契约与誓约对你更有效力，交涉类检定优势',
    extra_hours: '每日可用时间更长，赶路与钻研的耗时有减免',
    immune_fear_charm: '免疫恐慌与魅惑',
    xp_discount: '经验获取 +10%',
    delay_damage: '致命伤害延后一轮结算，给你一次反应机会',
    untrackable: '无法被追踪灵光与预言锁定',
    breath_weapon: '每日一次吐息攻击，2d6 元素伤害',
    power_speech: '威吓与说服检定优势',
    kill_heal: '每次击杀回复少量生命',
    foresee_round: '战斗首轮先攻视为最高',
    oath_boon: '誓言未破时 AC +1',
    last_stand: '生命低于四分之一时攻击加值 +2'
  };
  function specialText(id) { return SPECIAL[id] || id; }
  function specialGet(id) { return SPECIAL[id] || ''; }

  /* ---------------- 选项气泡 ---------------- */
  function options(list) {
    return LTX.options((list || []).map(function (o) {
      return { k: o.k || o.key, label: esc(o.label != null ? o.label : o) };
    }));
  }

  /* ---------------- 通用通告 ---------------- */
  function notice(title, lines, theme, foot) {
    return panel({ theme: theme || 'grayblue', title: title, lines: (lines || []).map(function (x) { return t(x, INK.body); }), foot: foot });
  }
  function tight(title, lines, theme) {
    var code = panel({ theme: theme || 'sand', title: title, lines: (lines || []).map(function (x) { return t(x, INK.body); }), scale: 0.72 });
    return LTX.panel(LTX.latexToHtml(code), { cls: 'tight' });
  }

  /* ---------------- 典籍（分卷浏览） ---------------- */
  var CODEX = [
    { id: 'myth', name: '创世与神系' }, { id: 'world', name: '地理与国度' }, { id: 'race', name: '种族' },
    { id: 'class', name: '力量与职业' }, { id: 'magic', name: '魔法' }, { id: 'craft', name: '超凡百艺' },
    { id: 'money', name: '经济与物价' }, { id: 'rule', name: '战斗与死亡' }, { id: 'align', name: '阵营与声望' },
    { id: 'item', name: '道具与神器' }, { id: 'chron', name: '纪元与大事记' }, { id: 'cal', name: '历法与节日' },
    { id: 'lang', name: '语言与文字' }, { id: 'mon', name: '怪物图鉴' }, { id: 'table', name: '遭遇表' },
    { id: 'hero', name: '英雄名录' }, { id: 'legend', name: '传说与谣言' }, { id: 'tal', name: '天赋' }
  ];
  function codex(id, st, page) {
    var L = [], th = 'grayblue', title = '典 籍';
    page = page || 0;
    function chunk(arr) { return arr.slice(page * 12, page * 12 + 12); }
    if (id === 'myth') {
      title = '创 世 与 神 系';
      L.push(t('原初之炎与永恒之冰碰撞，迸出第一缕秩序之光，凝结为众星之母。', INK.body));
      L.push(t('祂以身躯化为艾尔德兰，以肋骨造巨龙，以泪水造精灵，以热血造人类。', INK.body));
      L.push(t('最大的恶龙被圣光之矛钉入地心，骸骨化为龙骨山脉；如今祂沉睡于世界之核。', INK.body));
      L.push(rule(T.sand.bd, 6));
      (WD.COSMOS || []).forEach(function (c) { L.push(small('  ' + c.name + '：' + c.desc, INK.dim)); });
      L.push(rule(T.sand.bd, 6));
      (WD.GODS || []).forEach(function (g) {
        L.push(b(g.name, T.sand.ti) + '\\quad ' + small(g.domain + ' · ' + g.align + ' · ' + g.symbol + ' · ' + g.org));
        if (g.creed) L.push(small('    ' + g.creed, INK.dim));
      });
      th = 'sand';
    } else if (id === 'world') {
      title = '地 理 与 国 度';
      (WD.NATIONS || []).forEach(function (n) {
        L.push(b(n.name, T.blue.ti) + '\\quad ' + small((n.capital || '') + ' · ' + (n.gov || '')));
        L.push(small('    ' + (n.trait || ''), INK.dim));
      });
      L.push(rule(T.blue.bd, 6));
      L.push(t('跨种族组织', T.blue.ti));
      (WD.ORGS || []).forEach(function (o) { L.push(small('  ' + o.name + '：' + o.desc, INK.dim)); });
      L.push(rule(T.blue.bd, 6));
      L.push(t('可往之地（' + (WD.REGIONS || []).length + ' 处，节选）', T.blue.ti));
      chunk(WD.REGIONS || []).forEach(function (r) {
        L.push(b(r.name, T.blue.ti) + '\\quad ' + small(r.terrain + ' · ' + (r.nation || '无主') + ' · 威胁 ' + ((r.threat || [1, 1]).join('-'))));
        L.push(small('    ' + (r.desc || ''), INK.dim));
      });
    } else if (id === 'race') {
      title = '种 族';
      (WD.RACES || []).forEach(function (r) {
        L.push(b(r.name + (r.sub ? '（' + r.sub + '）' : ''), T.matcha.ti) + '\\quad ' +
          small('身高 ' + (r.height || '—') + ' · 寿命 ' + (r.life || '—')));
        L.push(small('    ' + (r.traits || ''), INK.dim));
        if (r.society) L.push(small('    社会：' + r.society, INK.dim));
        var bn = [];
        if (r.bonus) for (var k in r.bonus) bn.push((k === 'any' ? '任意两项' : ENG.attrCN(k)) + '+' + r.bonus[k]);
        if (bn.length) L.push(small('    属性加成：' + bn.join('、'), T.matcha.ti));
      });
      th = 'matcha';
    } else if (id === 'class') {
      title = '力 量 与 职 业';
      (WD.SOURCES || []).forEach(function (s) { L.push(small('  ' + s.name + '：' + s.attr + ' · ' + s.how + ' · ' + s.jobs, INK.dim)); });
      L.push(rule(T.gold.bd, 6));
      (WD.CLASSES || []).forEach(function (c) {
        L.push(b(c.name, T.gold.ti) + '\\quad ' + small((c.source || '') + ' · 生命骰 d' + (c.hpDie || 8) + (c.caster ? ' · 施法者' : '')));
        L.push(small('    核心：' + (c.core || ''), INK.dim));
        if (c.subs && c.subs.length) L.push(small('    子类：' + c.subs.join('、'), INK.dim));
        L.push(small('    长处：' + (c.pros || '') + '　弱项：' + (c.cons || ''), INK.dim));
        (c.kits || []).forEach(function (k, i) { L.push(small('    初始包' + (i + 1) + '（' + k.name + '）：' + (k.items || []).join(' + '), INK.dim)); });
      });
      L.push(rule(T.gold.bd, 6));
      (WD.LEVELS || []).forEach(function (l) {
        L.push(small('  ' + l.name + '（' + (l.range || []).join('-') + '）：' + l.stand + ' · ' + l.status + ' · ' + l.life, INK.dim));
      });
      th = 'gold';
    } else if (id === 'magic') {
      title = '魔 法';
      L.push(t('法术等级：' + (WD.SPELL_LV || []).join(' → '), T.lav.ti));
      L.push(small('奥术施法者每日记忆法术或消耗法术位；神术施法者通过祈祷获得当日法术；法术可超魔增效。', INK.dim));
      L.push(rule(T.lav.bd, 6));
      var byLv = {};
      (WD.SPELLS || []).forEach(function (s) { byLv[s.lv] = byLv[s.lv] || []; byLv[s.lv].push(s); });
      Object.keys(byLv).forEach(function (lv) {
        L.push(t('  ' + lv, T.lav.ti));
        byLv[lv].forEach(function (s) {
          L.push(small('    ' + s.name + '（' + (s.school || '') + '）：' + (s.effect || '') +
            (s.forbidden ? '　[禁忌 ' + s.forbidden + ']' : ''), s.forbidden ? T.coral.ti : INK.dim));
        });
      });
      L.push(rule(T.lav.bd, 6));
      L.push(small('禁忌魔法：死灵系操控灵魂与死者；惑控系强制操控心智；恶魔召唤易致死亡或堕落；时间魔法可能引发时空悖论。', T.coral.ti));
      th = 'lav';
    } else if (id === 'craft') {
      title = '超 凡 百 艺';
      L.push(t('进度：' + (WD.CRAFT_TIERS || []).join(' → '), T.orange.ti));
      (WD.CRAFTS || []).forEach(function (c) {
        var mine = (st && st.crafts && st.crafts[c.name]) || { value: 0, tier: (WD.CRAFT_TIERS || [])[0] };
        L.push(b(c.name, T.orange.ti) + '\\quad ' + small(c.attr + ' · 投入 ' + c.cost + ' · 产出 ' + c.out, INK.dim));
        L.push(t('    你的进度：', INK.dim) + LTX.bar(mine.value, 100, T.orange.bd) + '\\quad ' + small(mine.tier + '（' + mine.value + '/100）', INK.dim));
      });
      th = 'orange';
    } else if (id === 'money') {
      title = '经 济 与 物 价';
      L.push(t('铜币 CP · 银币 SP · 金币 GP · 铂金币 PP', T.gold.ti));
      L.push(kv('换算', '100 CP = 1 SP · 10 SP = 1 GP · 10 GP = 1 PP') + '\\quad ' + kv('持币', ENG.money.fmt(ENG.money.total(st)), INK.dim, ATTR.gold));
      L.push(rule(T.gold.bd, 6));
      (WD.PRICES || []).forEach(function (p) { L.push(small('  ' + p.name + '：' + p.price + (p.unit || ''), INK.dim)); });
      L.push(rule(T.gold.bd, 6));
      (WD.QUALITY || []).forEach(function (q) {
        L.push(small('  ' + q.name + '：' + q.desc + '（' + (q.range || []).join('-') + ' GP）', INK.dim));
      });
      L.push(rule(T.gold.bd, 6));
      (WD.PRICING || []).forEach(function (p) { L.push(small('  ' + p.kind + '：' + p.formula, INK.dim)); });
      th = 'gold';
    } else if (id === 'rule') {
      title = '战 斗 与 死 亡';
      L.push(t('先攻 → 标准动作 + 附赠动作 + 反应 → 命中判定（攻击加值 vs AC）→ 伤害（武器骰 + 属性）→ 豁免。', INK.body));
      L.push(rule(T.coral.bd, 6));
      (WD.STATUSES || []).forEach(function (s) { L.push(small('  ' + s.name + '：' + s.effect, INK.dim)); });
      L.push(rule(T.coral.bd, 6));
      L.push(small('重伤濒死：生命归零进入濒死，需生死豁免（三次失败即死）。', INK.dim));
      L.push(small('永久损伤：断肢、内脏损伤、重度烧伤等，可能无法恢复。', INK.dim));
      L.push(small('死亡：传奇级以下没有复活魔法。', T.coral.ti));
      th = 'coral';
    } else if (id === 'align') {
      title = '阵 营 与 声 望';
      (WD.ALIGNMENTS || []).forEach(function (a) {
        L.push(b(a.name + '（' + a.id + '）', T.grayblue.ti) + '\\quad ' + small(a.core + ' · ' + (a.who || ''), INK.dim));
      });
      L.push(rule(T.grayblue.bd, 6));
      L.push(t('声望等级：' + (WD.REP_LEVELS || []).join(' → '), T.grayblue.ti));
      Object.keys((st && st.rep) || {}).forEach(function (k) {
        L.push(small('  ' + k + '：' + st.rep[k].level + '（' + st.rep[k].value + '）', INK.dim));
      });
      L.push(small('声望决定任务委托权、资源购买权与保护权。', INK.dim));
      th = 'grayblue';
    } else if (id === 'item') {
      title = '道 具 与 神 器';
      var I = WD.ITEMS || {};
      ['consumable', 'weapon', 'armor', 'gear'].forEach(function (k) {
        L.push(t('  ' + ({ consumable: '消耗品', weapon: '武器', armor: '防具', gear: '戒指与奇物' })[k], T.orange.ti));
        (I[k] || []).slice(0, 14).forEach(function (it) {
          L.push(small('    ' + it.name + '（' + (it.quality || ENG.item.qualityOf(it.price)) + ' · ' + it.price + ' GP）' +
            (it.dmg ? ' ' + it.dmg : '') + (it.ac ? ' AC ' + it.ac : '') + (it.effect ? ' ' + it.effect : ''), INK.dim));
        });
      });
      L.push(rule(T.sand.bd, 6));
      (WD.ARTIFACTS || []).forEach(function (a) {
        L.push(b(a.name, T.sand.ti) + '\\quad ' + small(a.type, INK.dim));
        L.push(small('    能力：' + a.power, INK.dim));
        L.push(small('    代价：' + a.cost, T.coral.ti));
      });
      th = 'sand';
    } else if (id === 'chron' || id === 'cal') {
      if (id === 'chron') {
        title = '纪 元 与 大 事 记';
        var tl = WD.TIMELINE || {};
        (tl.eras || []).forEach(function (e) {
          L.push(b(e.name, T.sand.ti) + '\\quad ' + small(e.dur, INK.dim));
          L.push(small('    ' + e.event, INK.dim));
        });
        L.push(rule(T.sand.bd, 6));
        L.push(t('近期大事（星母历724-824）', T.sand.ti));
        (tl.events || []).forEach(function (e) {
          L.push(small('  ' + e.year + '年 ' + e.name + '：' + e.desc, INK.dim));
        });
        L.push(rule(T.sand.bd, 6));
        (tl.omens || []).forEach(function (o) { L.push(small('  ' + o, T.coral.ti)); });
        th = 'sand';
      } else {
        title = '历 法 与 节 日';
        var C = WD.CALENDAR || {};
        L.push(t('当前：' + ENG.time.stamp(st), T.blue.ti));
        L.push(rule(T.blue.bd, 6));
        (C.months || []).forEach(function (m) { L.push(small('  ' + m.n + '月 ' + m.name + '（' + m.season + '）：' + m.trait, INK.dim)); });
        L.push(rule(T.blue.bd, 6));
        (C.weekdays || []).forEach(function (w) { L.push(small('  周' + '一二三四五六日'[w.n - 1] + ' ' + w.name + '：' + w.meaning, INK.dim)); });
        L.push(rule(T.blue.bd, 6));
        (C.festivals || []).forEach(function (f) { L.push(small('  ' + f.month + '月' + f.day + '日 ' + f.name + '：' + f.desc, T.gold.ti)); });
        (C.omens || []).forEach(function (o) { L.push(small('  ' + o.name + '（' + o.cycle + '）：' + o.desc, T.lav.ti)); });
        th = 'blue';
      }
    } else if (id === 'lang') {
      title = '语 言 与 文 字';
      (WD.LANGS || []).forEach(function (l) {
        L.push(b(l.name, T.lav.ti) + '\\quad ' + small(l.users, INK.dim));
        L.push(small('    ' + l.script + ' · ' + l.trait, INK.dim));
      });
      L.push(rule(T.lav.bd, 6));
      (WD.DEAD_LANGS || []).forEach(function (l) { L.push(small('  ' + l.name + '：' + l.desc, INK.dim)); });
      L.push(rule(T.lav.bd, 6));
      (WD.DIALECTS || []).forEach(function (l) { L.push(small('  ' + l.name + '：' + l.desc, INK.dim)); });
      th = 'lav';
    } else if (id === 'mon') {
      title = '怪 物 图 鉴';
      chunk(WD.MONSTERS || []).forEach(function (m) {
        L.push(b(m.name, T.coral.ti) + '\\quad ' + small((m.cls || '') + ' · 威胁 ' + ((m.threat || []).join('-')), INK.dim));
        L.push(small('    栖息：' + (m.habitat || []).join('、') + '　掉落：' + (m.drop || []).join('、'), INK.dim));
        if (m.trait) L.push(small('    特性：' + m.trait, INK.dim));
        if (m.weak) L.push(small('    弱点：' + m.weak, T.matcha.ti));
      });
      L.push(rule(T.coral.bd, 6));
      L.push(small('图鉴第 ' + (page + 1) + ' 页 / 共 ' + Math.max(1, Math.ceil((WD.MONSTERS || []).length / 12)) + ' 页', INK.dim));
      th = 'coral';
    } else if (id === 'table') {
      title = '遭 遇 表';
      var rows = (TB.WILD || {})[st.terrain] || [];
      L.push(t('当前地形：' + st.terrain + '（d20）', T.blue.ti));
      rows.forEach(function (r) {
        L.push(small('  ' + r.n1 + '-' + r.n2 + ' ' + r.name + '：' + r.desc +
          (r.check ? '　[' + r.check + ' DC ' + r.dc + ']' : '') + (r.dmg ? ' ' + r.dmg : ''), INK.dim));
      });
      L.push(rule(T.blue.bd, 6));
      L.push(t('城市事件（d12）', T.blue.ti));
      (TB.CITY || []).forEach(function (r) { L.push(small('  ' + r.n1 + '-' + r.n2 + ' ' + r.name + '：' + r.desc, INK.dim)); });
      L.push(rule(T.blue.bd, 6));
      L.push(t('夜间事件（d10）', T.blue.ti));
      (TB.NIGHT || []).forEach(function (r) { L.push(small('  ' + r.n1 + '-' + r.n2 + ' ' + r.name + '：' + r.desc, INK.dim)); });
    } else if (id === 'hero') {
      title = '英 雄 名 录';
      (WD.HEROES || []).forEach(function (h) {
        L.push(b(h.name, T.gold.ti) + '\\quad ' + small((h.race || '') + ' ' + (h.job || '') + ' · ' + (h.title || ''), INK.dim));
        L.push(small('    活跃：' + (h.area || '') + '　等级：' + (h.level || '未知'), INK.dim));
        L.push(small('    ' + (h.bio || ''), INK.dim));
      });
      L.push(rule(T.gold.bd, 6));
      L.push(t('已逝的传奇', T.sand.ti));
      (WD.LEGEND_HEROES || []).forEach(function (h) {
        L.push(small('  ' + h.name + '（' + h.era + '）：' + h.deed + '　遗产：' + h.legacy, INK.dim));
      });
      th = 'gold';
    } else if (id === 'legend') {
      title = '传 说 与 谣 言';
      (WD.LEGENDS || []).forEach(function (g) {
        L.push(t('  ' + g.region, T.lav.ti));
        (g.rows || []).forEach(function (r) { L.push(small('    ' + r.text, INK.dim)); });
      });
      L.push(rule(T.lav.bd, 6));
      L.push(t('酒馆谣言（d20）', T.lav.ti));
      chunk(WD.RUMORS || []).forEach(function (r) {
        L.push(small('  ' + r.n + '. ' + r.text + '　[' + r.truth + ']', INK.dim));
      });
      L.push(small('第 ' + (page + 1) + ' 页 / 共 ' + Math.max(1, Math.ceil((WD.RUMORS || []).length / 12)) + ' 页', INK.dim));
      th = 'lav';
    } else if (id === 'tal') {
      title = '天 赋';
      var TT = WD.TALENTS || {};
      L.push(b('开 局 抽 选', T.lav.ti) + '\\quad' + small('按概率抽一组，抽到多少就带走多少；可重复抽五次，最后收下其中一组', INK.dim));
      (ENG.talent.odds ? ENG.talent.odds() : []).forEach(function (o) {
        L.push(small('  ' + (o.p * 100) + '%　' + o.cn + '（' + o.grade + ' 级共 ' + ENG.talent.byGrade(o.grade).length + ' 条，同次不重复）', INK.body));
      });
      L.push(small('  抽到的不能改写；天赋步的对话框里另有暗号，输对了可以自由选择（上限四项）。', INK.dim));
      L.push(rule(T.lav.bd, 6));
      L.push(b('SSS 级', T.lav.ti) + '\\quad' + small('五档里最稀的一档', INK.dim));
      (TT.SSS || []).forEach(function (x) {
        L.push(small('  ' + x.name + '：' + x.desc + '　[' + effectText(x.effect) + ']', INK.dim));
      });
      ['A', 'B', 'C', 'D'].forEach(function (g) {
        L.push(rule(T.lav.bd, 6));
        L.push(b(g + ' 级', T.lav.ti));
        (TT[g] || []).forEach(function (x) { L.push(small('  ' + x.name + '：' + x.desc + '　[' + effectText(x.effect) + ']', INK.dim)); });
      });
      th = 'lav';
    } else {
      L.push(t('典籍没有这一卷。', INK.dim));
    }
    return panel({ theme: th, title: title, lines: L, foot: '典籍 · 依据设定集逐卷录入' });
  }
  function codexList() { return CODEX; }

  /* ---------------- 起始页开篇选择面板 ---------------- */
  function opening(list) {
    var L = [];
    list.forEach(function (o, i) {
      L.push(b('[' + 'abcde'[i] + '] ', T.gold.ti) + b(o.name, INK.em));
      L.push(small('    起点：' + o.place + '（' + (o.region || '') + '）', INK.dim));
      L.push(small('    基调：' + (o.tone || ''), INK.dim));
      if (o.task) L.push(small('    第一件事：' + o.task, T.lightgold.ti));
    });
    return panel({ theme: 'gold', title: '四 种 开 篇', lines: L, foot: '依据设定集第二十一卷 · 选择其一作为起点' });
  }

  /* ---------------- 长途出行 · 走法挡位 ---------------- */
  function tripTiers(st, bundle, altBundle) {
    var L = [];
    if (!bundle) return panel({ theme: 'coral', title: '长 途 出 行', lines: [t('这条路走不通。', INK.dim)] });
    var plan = bundle.plan, d = plan.dest, info = GEO.regionInfo(d);
    L.push(b('目的地：' + d.name, T.coral.ti) + '\\quad ' +
      t((d.kind ? GEO.kindCN(d.kind) : '') + (d.terrain || '') + ' · 威胁 ' + (d.threat || [1, 1]).join('-'), INK.body));
    L.push(kv('所在', (info ? info.nationName + ' · ' + info.position : '—')));
    L.push(kv('路线', plan.route.join(' → ') + '（' + plan.stops + ' 站 · 基准约 ' + plan.days + ' 天）'));
    L.push(small('　三站以上按过境行军算，风险已折减；下面是不同走法的账。', INK.dim));
    L.push(rule(T.coral.bd, 6));
    L.push(b('选一种走法，代价各不相同', T.coral.ti));
    bundle.tiers.forEach(function (x, i) {
      var tag = 'abc'[i] || ('第' + (i + 1));
      var col = x.ok ? (x.atLeastOne > 0.5 ? T.coral.ti : (x.atLeastOne > 0.3 ? T.lightgold.ti : T.matcha.ti)) : INK.dim;
      L.push(b('[' + tag + '] ' + x.name, x.ok ? INK.em : INK.dim) + '\\quad ' +
        t('约 ' + x.days + ' 天 · 盘缠约 ' + (x.costSP / 10).toFixed(1) + ' GP · 疲劳 +' + x.fatigue +
          ' · 每站风险 ' + Math.round(x.riskMax * 100) + '% 以内 · 全程至少出一次事 ' + Math.round(x.atLeastOne * 100) + '%', col));
      L.push(small('　' + x.desc + (x.note ? ('　' + x.note) : ''), INK.dim));
      if (!x.ok) L.push(small('　不能选：' + x.reason, T.coral.ti));
    });
    L.push(rule(T.coral.bd, 6));
    L.push(b('无论走哪一档，都要付这些', T.coral.ti));
    L.push(kv('饥渴', '按天吃喝，盘缠不够就得挨饿', INK.dim, INK.body));
    L.push(kv('出行热度', plan.heatNow + ' → ' + plan.heatAfter + '（每两天降一点，长休也降）', INK.dim, T.lightgold.ti));
    L.push(kv('可能失去', '钱、随身物品、健康（永久损伤）；风险高的档位，命也可能丢在半路', INK.dim, T.coral.ti));
    if (altBundle) {
      L.push(rule(T.coral.bd, 6));
      L.push(b('换条稳路再算一遍', T.matcha.ti));
      L.push(small('　绕开险地：' + altBundle.plan.route.join(' → ') + '（' + altBundle.plan.stops + ' 站 · 基准约 ' +
        altBundle.plan.days + ' 天 · 最低一档全程至少出一次事 ' +
        Math.round(Math.min.apply(null, altBundle.tiers.map(function (x) { return x.atLeastOne; })) * 100) + '%）', INK.dim));
    } else {
      L.push(small('　（没有更稳的绕法：这一路要么险，要么根本没有别的走法）', INK.dim));
    }
    return panel({ theme: 'coral', title: '长 途 出 行 · 走 法 与 代 价', lines: L, bg: BG.warn });
  }
  function trip(st, plan, alt) {
    var L = [];
    if (!plan) return panel({ theme: 'coral', title: '长 途 出 行', lines: [t('这条路走不通。', INK.dim)] });
    var d = plan.dest, info = GEO.regionInfo(d);
    L.push(b('目的地：' + d.name, T.coral.ti) + '\\quad ' +
      t((d.kind ? GEO.kindCN(d.kind) : '') + (d.terrain || '') + ' · 威胁 ' + (d.threat || [1, 1]).join('-'), INK.body));
    L.push(kv('所在', (info ? info.nationName + ' · ' + info.position : '—')));
    L.push(rule(T.coral.bd, 6));
    L.push(b('两条路，代价不一样', T.coral.ti));
    function line(tag, p, color) {
      L.push(b(tag + '·' + p.route.join(' → '), color || INK.body));
      L.push(small('　' + p.stops + ' 站 · 约 ' + p.days + ' 天 · 盘缠约 ' + (Math.round(p.costSP / 10) / 10) + ' GP · 疲劳 +' + p.fatigue +
        ' · 每站风险 ' + Math.round(p.riskMax * 100) + '% 以内 · 全程至少出一次事 ' + Math.round(p.atLeastOne * 100) + '%', INK.dim));
    }
    line('最快 ', plan, T.coral.ti);
    if (alt) line('绕开险地 ', alt, T.matcha.ti);
    else L.push(small('　（没有更稳的绕法：这一路要么险，要么根本没有别的走法）', INK.dim));
    L.push(rule(T.coral.bd, 6));
    L.push(b('要付的代价', T.coral.ti));
    if (plan.march) L.push(small('　（三站以上按过境行军算：不在险地久留，每站风险已折减）', INK.dim));
    L.push(kv('路程', '约 ' + plan.days + ' 天（按站结算，每站都可能出事）', INK.dim, T.lightgold.ti));
    L.push(kv('盘缠', '约 ' + (Math.round(plan.costSP / 10) / 10) + ' GP（' + plan.costSP + ' SP：干粮、住店、过路）', INK.dim, ATTR.gold));
    L.push(kv('身体', '疲劳 +' + plan.fatigue + '，路上法力不回', INK.dim, T.coral.ti));
    L.push(kv('饥渴', '按天吃喝，盘缠不够就得挨饿', INK.dim, INK.body));
    L.push(kv('出行热度', plan.heatNow + ' → ' + plan.heatAfter + '（每两天降一点，长休也降）', INK.dim, T.lightgold.ti));
    L.push(rule(T.coral.bd, 6));
    L.push(b('路上可能失去的东西', T.coral.ti));
    L.push(t('钱（拦路的抽走一成上下）、随身物品（车马出事会掉）、健康（天灾与伤病，可能落下永久损伤）；' +
      '风险高的时候，命也可能丢在半路。', INK.body));
    L.push(small('确认后按站结算；想稳妥就选「绕开险地」，或者干脆一站一站走。', INK.dim));
    return panel({ theme: 'coral', title: '长 途 出 行 · 代 价', lines: L, bg: BG.warn });
  }

  global.PANEL = {
    esc: esc, panel: panel, wrap: wrap, status: status, card: card, bag: bag, combat: combat,
    task: task, shop: shop, levelup: levelup, death: death, time: time, talents: talents,
    options: options, notice: notice, tight: tight, codex: codex, codexList: codexList,
    opening: opening, effectText: effectText, specialText: specialText, specialGet: specialGet,
    trip: trip, tripTiers: tripTiers,
    rule: rule, kv: kv, t: t, b: b, small: small, bar: bar
  };
})(window);
