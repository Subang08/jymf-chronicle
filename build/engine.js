/* ============================================================
   规则引擎 · 冷峻写实 · 因果严明
   骰子 / 检定 / 战斗 / 历法 / 疲劳六级 / 饥渴 / 负重 / 声望 /
   经济换算 / 副职业 / 任务生成 / 怪物 / 天赋
   所有随机都走种子随机（无 Math.random），所有改动只写状态对象 st。
   ============================================================ */
(function (global) {
  'use strict';

  var WD = global.WD || {}, TB = global.TB || {};

  /* ---------------- 种子随机（mulberry32） ---------------- */
  var _s = 0;
  function seed(n) { _s = (n >>> 0) || 0x9e3779b9; for (var i = 0; i < 4; i++) rnd(); }
  function rnd() {
    _s = (_s + 0x6D2B79F5) >>> 0;
    var t = _s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function int(a, b) { if (b == null) { b = a; a = 1; } return a + Math.floor(rnd() * (b - a + 1)); }
  function pick(arr) { return (arr && arr.length) ? arr[Math.floor(rnd() * arr.length)] : null; }
  function chance(p) { return rnd() < p; }
  function shuffle(arr) {
    var a = (arr || []).slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function d20() { return int(1, 20); }
  function roll(n, faces) { var s = 0; for (var i = 0; i < n; i++) s += int(1, faces); return s; }
  /* '2d6+3' / '1d8' / '4' -> number */
  function rollDice(expr) {
    if (expr == null) return 0;
    var s = String(expr).trim(), total = 0;
    var m = s.match(/(\d*)\s*d\s*(\d+)/i);
    if (m) total += roll(parseInt(m[1] || '1', 10), parseInt(m[2], 10));
    var plus = s.match(/\+\s*(\d+)/);
    if (plus) total += parseInt(plus[1], 10);
    var minus = s.match(/-\s*(\d+)/);
    if (minus) total -= parseInt(minus[1], 10);
    if (!m && !plus && !minus) total = parseInt(s, 10) || 0;
    return Math.max(0, total);
  }

  /* ---------------- 属性 ---------------- */
  function attrMod(v) { return Math.floor(((v || 10) - 10) / 2); }
  function profBonus(level) { return 2 + Math.floor(((level || 1) - 1) / 4); }
  var ATTR_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  var ATTR_CN = { str: '力量', dex: '敏捷', con: '体质', int: '智力', wis: '感知', cha: '魅力' };
  function attrCN(k) { return ATTR_CN[k] || k; }

  /* ---------------- 检定 ---------------- */
  function check(mod, dc, adv) {
    var a = d20(), b = d20(), use;
    if (adv > 0) use = Math.max(a, b);
    else if (adv < 0) use = Math.min(a, b);
    else use = a;
    var total = use + (mod || 0);
    return { roll: use, dice: [a, b], total: total, dc: dc, ok: total >= dc, crit: use === 20, fumble: use === 1 };
  }
  function opposed(a, b) { var r1 = d20() + (a || 0), r2 = d20() + (b || 0); return { a: r1, b: r2, ok: r1 >= r2 }; }

  /* ---------------- 历法（星母历） ---------------- */
  var MONTH_DAYS = 30;
  var WEEKDAYS = (WD.CALENDAR && WD.CALENDAR.weekdays) || [
    { n: 1, name: '日曜日', meaning: '圣光之主庇佑之日' }, { n: 2, name: '月曜日', meaning: '月之女士赐福魔法之日' },
    { n: 3, name: '火曜日', meaning: '战争与勇气之日' }, { n: 4, name: '土曜日', meaning: '大地与劳作之日' },
    { n: 5, name: '风曜日', meaning: '旅行与贸易之日' }, { n: 6, name: '影曜日', meaning: '秘密与安息之日' },
    { n: 7, name: '星曜日', meaning: '众星之母的圣日（宗教礼拜日）' }
  ];
  var SHICHEN = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];
  function absDay(t) { return ((t.year - 1) * 365) + ((t.month - 1) * MONTH_DAYS) + (t.day - 1); }
  function absHour(t) { return absDay(t) * 24 + t.hour; }
  function monthName(t) {
    if (!t) return '—';
    var ms = (WD.CALENDAR && WD.CALENDAR.months) || [];
    for (var i = 0; i < ms.length; i++) if (ms[i].n === t.month) return ms[i].name;
    return t.month + '月';
  }
  function monthInfo(t) {
    var ms = (WD.CALENDAR && WD.CALENDAR.months) || [];
    for (var i = 0; i < ms.length; i++) if (ms[i].n === t.month) return ms[i];
    return { n: t.month, name: t.month + '月', season: '未知', trait: '' };
  }
  function weekday(t) { return WEEKDAYS[absDay(t) % 7] || WEEKDAYS[0]; }
  function shichen(t) {
    if (!t || t.hour == null) return '未时';
    return SHICHEN[Math.floor(((t.hour % 24) + 1) % 24 / 2)] || '未时';
  }
  function partOfDay(t) {
    var h = (t && t.hour != null ? t.hour : 12) % 24;
    if (h < 5) return '深夜'; if (h < 8) return '清晨'; if (h < 11) return '上午';
    if (h < 13) return '正午'; if (h < 17) return '午后'; if (h < 20) return '黄昏'; return '入夜';
  }
  function normTime(t) {
    while (t.hour >= 24) { t.hour -= 24; t.day++; }
    while (t.hour < 0) { t.hour += 24; t.day--; }
    while (t.day > MONTH_DAYS) { t.day -= MONTH_DAYS; t.month++; }
    while (t.day < 1) { t.month--; if (t.month < 1) { t.month = 12; t.year--; } t.day += MONTH_DAYS; }
    while (t.month > 12) { t.month -= 12; t.year++; }
    while (t.month < 1) { t.month += 12; t.year--; }
    return t;
  }
  function advance(st, spec) {
    spec = spec || {};
    var t = st.time, hours = 0;
    if (spec.hours) hours += spec.hours;
    if (spec.days) hours += spec.days * 24;
    if (spec.months) hours += spec.months * MONTH_DAYS * 24;
    t.hour += hours;
    normTime(t);
    st.counters.hoursElapsed = (st.counters.hoursElapsed || 0) + hours;
    hungerTick(st, hours);
    return hours;
  }
  function stamp(st) {
    var t = st.time;
    return '星母历' + t.year + '年 ' + monthName(t) + ' ' + t.day + '日 · ' + weekday(t).name + ' · ' + shichen(t);
  }
  function stampShort(st) {
    var t = st.time;
    return t.year + '年' + t.month + '月' + t.day + '日 ' + shichen(t);
  }
  function festival(st) {
    var fs = (WD.CALENDAR && WD.CALENDAR.festivals) || [];
    for (var i = 0; i < fs.length; i++) if (fs[i].month === st.time.month && fs[i].day === st.time.day) return fs[i];
    return null;
  }
  function weather(st) {
    var mw = TB.MONTH_WEATHER || {};
    var list = mw[String(st.time.month)] || [];
    if (!list.length) return '天色平淡';
    return list[(absDay(st.time) + st.turn) % list.length];
  }

  /* ---------------- 饥渴 / 疲劳 / 负重 ---------------- */
  function hungerTick(st, hours) {
    var pc = st.pc, ev = [];
    var fh = st.counters.hungerHours == null ? 0 : st.counters.hungerHours;
    var wh = st.counters.thirstHours == null ? 0 : st.counters.thirstHours;
    fh += hours; wh += hours;
    st.counters.hungerHours = fh; st.counters.thirstHours = wh;

    pc.hunger = fh < 24 ? '饱足' : (fh < 48 ? '微饥' : '饥饿');
    pc.thirst = wh < 24 ? '正常' : (wh < 48 ? '脱水' : '濒危');

    if (pc.hunger === '饥饿') {
      var days = Math.floor(fh / 24) - 1;
      if (days > (st.counters.hungerFatigueDays || 0)) {
        st.counters.hungerFatigueDays = days;
        ev.push({ kind: 'fatigue', text: '两日未进食，身体开始拆自己的骨头烧。疲劳 +1。' });
        addFatigue(st, 1);
      }
    } else { st.counters.hungerFatigueDays = 0; }

    if (pc.thirst !== '正常') {
      var step = pc.thirst === '脱水' ? 4 : 2;
      var dmgTimes = Math.floor(hours / step) + (chance((hours % step) / step) ? 1 : 0);
      dmgTimes = Math.min(8, dmgTimes);   /* 单次结算最多八跳，避免一次长途把骰子摇到底 */
      for (var i = 0; i < dmgTimes; i++) {
        var d = pc.thirst === '脱水' ? roll(1, 4) : roll(1, 6);
        pc.hp.cur -= d;
        ev.push({ kind: 'thirst', text: '缺水（' + pc.thirst + '），生命 -' + d + '。' });
      }
      if (pc.thirst === '脱水') st.flags.noHeal = true;
    } else st.flags.noHeal = false;
    return ev;
  }
  function eat(st, kind) {
    if (kind === 'food') { st.counters.hungerHours = 0; st.pc.hunger = '饱足'; }
    else { st.counters.thirstHours = 0; st.pc.thirst = '正常'; }
  }
  function addFatigue(st, n) { st.pc.fatigue = Math.max(0, Math.min(6, (st.pc.fatigue || 0) + n)); return st.pc.fatigue; }
  function fatigueEffect(lv) {
    if (lv >= 6) return { text: '昏迷，无法行动', checks: 0, speed: 0, hpMax: 1, atkDis: true, saveDis: true, down: true };
    if (lv <= 0) return { text: '无', checks: 0, speed: 1, hpMax: 1, atkDis: false, saveDis: false };
    return {
      text: ['', '所有属性检定 -1', '移动速度减半', '生命值上限 -10%', '攻击检定劣势', '豁免检定劣势'][lv] || '',
      checks: -lv, speed: lv >= 2 ? 0.5 : 1, hpMax: lv >= 3 ? 0.9 : 1,
      atkDis: lv >= 4, saveDis: lv >= 5, down: false
    };
  }
  function encumbrance(st) {
    var max = Math.max(15, (st.pc.attrs.str || 10) * 15);
    var cur = 0;
    (st.bag || []).forEach(function (it) { cur += (it.weight || 0) * (it.qty || 1); });
    st.pc.weight = { cur: Math.round(cur * 10) / 10, max: max };
    var r = cur / max, lv;
    if (r > 1) lv = { name: '超重', speed: -999, note: '无法移动，每10分钟受1d6压力伤害' };
    else if (r > 0.75) lv = { name: '重度负重', speed: -20, note: '所有敏捷检定劣势' };
    else if (r > 0.5) lv = { name: '中度负重', speed: -10, note: '攀爬/游泳劣势' };
    else lv = { name: '轻度负重', speed: 0, note: '无影响' };
    st.pc.enc = lv;
    return lv;
  }

  /* ---------------- 角色 ---------------- */
  var HP_DIE = { 法师: 6, 术士: 6, 游荡者: 8, 吟游诗人: 8, 牧师: 8, 德鲁伊: 8, 游侠: 10, 战士: 10, 圣骑士: 10, 野蛮人: 12 };
  var CASTER_ATTR = { wizard: 'int', sorcerer: 'cha', cleric: 'wis', druid: 'wis', paladin: 'cha', bard: 'cha', ranger: 'wis', fighter: 'con', rogue: 'dex', barbarian: 'con' };
  /* 数据里 hpDie 写成 'd6' / 'd10'，一律解析成数字 */
  function hpDieNum(cls) {
    if (!cls) return 8;
    var v = cls.hpDie;
    if (typeof v === 'string') { var m = /(\d+)/.exec(v); v = m ? parseInt(m[1], 10) : 0; }
    if (!v) v = HP_DIE[cls.name] || 8;
    return v;
  }
  function casterAttrOf(cls) {
    if (!cls) return 'int';
    if (cls.casterAttr) return cls.casterAttr;
    return CASTER_ATTR[cls.id] || (cls.name === '法师' ? 'int' : 'cha');
  }
  /* 装备分位：轻甲/中甲/重甲/附魔 走护甲；盾牌/盾 走盾位 */
  function slotOf(it) {
    var k = String((it && it.kind) || '');
    if (/盾/.test(k) || /shield/i.test(k)) return 'shield';
    if (/甲|附魔|armor/i.test(k)) return 'armor';
    if (/weapon|melee|ranged|武器/i.test(k)) return 'weapon';
    return 'gear';
  }
  /* ---------- 自创条目登记处 ----------
     玩家在自定义里写出来的种族／职业／身份／背景／物品／国度登记在这里，
     之后所有按 id 查表的代码（建卡、角色卡、装备、物品栏）都能取到。 */
  var REG = { races: {}, classes: {}, identities: {}, backgrounds: {}, nations: {}, items: {} };
  function regPut(kind, obj) {
    if (!obj || !obj.id) return obj;
    if (!REG[kind]) REG[kind] = {};
    REG[kind][obj.id] = obj;
    return obj;
  }
  function regGet(kind, id) { return (REG[kind] || {})[id] || null; }
  function classById(id) {
    var cs = WD.CLASSES || [];
    for (var i = 0; i < cs.length; i++) if (cs[i].id === id || cs[i].name === id) return cs[i];
    var c = regGet('classes', id);
    if (c) return c;
    return cs[0] || { name: '战士', hpDie: 10, caster: false, source: '战职', kits: [{ name: '默认', items: ['长剑', '皮甲'] }] };
  }
  function raceById(id) {
    var rs = WD.RACES || [];
    for (var i = 0; i < rs.length; i++) if (rs[i].id === id || rs[i].name === id) return rs[i];
    var r = regGet('races', id);
    if (r) return r;
    return rs[0] || { id: 'human', name: '人类', bonus: { any: 1 }, speed: 30 };
  }
  function applyRaceBonus(attrs, race, chosen) {
    var b = (race && race.bonus) || {};
    if (b.any) {
      var order = chosen && chosen.length >= 2 ? chosen : ['str', 'con'];
      order.forEach(function (k) { if (attrs[k] != null) attrs[k] += b.any; });
    }
    ATTR_KEYS.forEach(function (k) { if (b[k]) attrs[k] += b[k]; });
    return attrs;
  }
  function powerName(cls) {
    var src = (cls && cls.source) || '';
    if (src.indexOf('奥术') >= 0) return '法力';
    if (src.indexOf('神术') >= 0) return '法力';
    if (src.indexOf('战职') >= 0) return '斗气';
    if (src.indexOf('诡术') >= 0) return '精力';
    if (src.indexOf('自然') >= 0) return '自然之力';
    return '法力';
  }
  function derive(st) {
    var pc = st.pc, cls = classById(pc.clsId), race = raceById(pc.raceId);
    var lv = pc.level || 1;
    var fat = fatigueEffect(pc.fatigue || 0);
    var die = hpDieNum(cls);
    var conMod = attrMod(pc.attrs.con);
    var hpMax = die + conMod + (lv - 1) * (Math.floor(die / 2) + 1 + conMod);
    /* 设定集只给等级与寿命，未给生命公式。低阶角色按骰面只有个位数生命，
       一条雪崩（3d6）就能带走，故补一条随等级递减的「新手喘息」缓冲：
       1级 +10，此后每级 -3，5 级起归零。 */
    hpMax += Math.max(0, 10 - (lv - 1) * 3);
    var tBonus = talentSum(pc.talents, 'hp');
    hpMax = Math.max(4, Math.round((hpMax + tBonus) * fat.hpMax));
    var ca = casterAttrOf(cls);
    var mpMax = (cls.caster ? (4 + lv * 3 + Math.max(0, attrMod(pc.attrs[ca] || 10)) * lv) : 0);
    if (!cls.caster) mpMax = 3 + lv * 2 + Math.max(0, attrMod(pc.attrs.con));
    var acDef = 10 + attrMod(pc.attrs.dex);
    var acBonus = 0, shield = 0, armorBase = 0;
    (st.bag || []).forEach(function (it) {
      if (!it.equip) return;
      var sl = slotOf(it);
      if (sl === 'shield') { shield = Math.max(shield, it.ac || 2); return; }
      if (sl === 'armor') {
        if ((it.ac || 0) >= 11) armorBase = Math.max(armorBase, it.ac);
        else acBonus += (it.ac || 0);
        return;
      }
      if (it.ac) acBonus += it.ac;
    });
    pc.ac = Math.max(acDef, armorBase) + acBonus + shield + talentSum(pc.talents, 'ac');
    pc.speed = Math.max(5, (race.speed || 30) + ((pc.enc && pc.enc.speed < 0 && pc.enc.speed > -100) ? pc.enc.speed : 0)) * (fat.speed || 1);
    pc.init = attrMod(pc.attrs.dex);
    pc.hp.max = hpMax; pc.mp.max = mpMax;
    pc.hp.cur = Math.min(pc.hp.cur == null ? hpMax : pc.hp.cur, hpMax);
    pc.mp.cur = Math.min(pc.mp.cur == null ? mpMax : pc.mp.cur, mpMax);
    pc.powerName = powerName(cls);
    pc.xpNext = needXp(lv);
    encumbrance(st);
    pc.status = hpStatus(pc);
    return pc;
  }
  /* 自动穿上最好的甲、拿上最好的武器（建卡与拾取后调用） */
  function autoEquip(st) {
    var bestArmor = null, bestShield = null, bestWeapon = null;
    (st.bag || []).forEach(function (it) {
      var sl = slotOf(it);
      it.equip = false;
      if (sl === 'armor' && (it.ac || 0) >= 11 && (!bestArmor || it.ac > (bestArmor.ac || 0))) bestArmor = it;
      else if (sl === 'shield' && (!bestShield || (it.ac || 0) > (bestShield.ac || 0))) bestShield = it;
      else if (sl === 'weapon' && (!bestWeapon || ENG_dmg(it) > ENG_dmg(bestWeapon))) bestWeapon = it;
    });
    [bestArmor, bestShield, bestWeapon].forEach(function (it) { if (it) it.equip = true; });
    return { armor: bestArmor ? bestArmor.name : null, shield: bestShield ? bestShield.name : null, weapon: bestWeapon ? bestWeapon.name : null };
  }
  function ENG_dmg(it) { return it && it.dmg ? (parseInt(String(it.dmg).replace(/[^\d]/g, '').slice(0, 2), 10) || 4) : 0; }
  function hpStatus(pc) {
    if (pc.hp.cur <= 0) return '濒死';
    var r = pc.hp.cur / Math.max(1, pc.hp.max);
    if (r > 0.9) return '健康';
    if (r > 0.6) return '轻伤';
    if (r > 0.25) return '重伤';
    return '濒死';
  }
  function needXp(level) { return level * 1000 + 500; }
  function talentSum(talents, key) {
    var s = 0;
    (talents || []).forEach(function (t) { var e = t && t.effect; if (e && e[key]) s += e[key]; });
    return s;
  }
  function checkMod(st, attrKey, skill, adv) {
    var pc = st.pc;
    var mod = attrMod(pc.attrs[attrKey]) + profBonus(pc.level) * ((pc.skills || []).indexOf(skill) >= 0 ? 1 : 0)
      + talentSum(pc.talents, 'checks') + fatigueEffect(pc.fatigue || 0).checks;
    if (pc.hunger === '饥饿') mod -= 1;
    var a = (adv || 0);
    if (pc.enc && /重度/.test(pc.enc.name) && (attrKey === 'dex')) a -= 1;
    if (st.flags && st.flags.curseCheck) mod -= st.flags.curseCheck;
    return check(mod, 0, a);
  }
  function addXp(st, n) {
    var pc = st.pc, ups = 0;
    pc.xp += Math.max(0, Math.round(n));
    while (pc.xp >= needXp(pc.level) && pc.level < 30) {
      pc.xp -= needXp(pc.level); pc.level++; ups++;
    }
    if (ups) levelUp(st, ups);
    return ups;
  }
  function levelUp(st, n) {
    var pc = st.pc, cls = classById(pc.clsId);
    n = n || 1;
    var die = hpDieNum(cls);
    var gain = 0;
    for (var i = 0; i < n; i++) gain += Math.max(1, Math.floor(die / 2) + 1 + attrMod(pc.attrs.con));
    pc.hp.max += gain; pc.hp.cur += gain;
    var lvName = levelName(pc.level);
    if (cls.caster) pc.slots = slotsFor(pc.level);
    return { gain: gain, level: pc.level, name: lvName, cls: cls.name };
  }
  function levelName(level) {
    var ls = WD.LEVELS || [];
    for (var i = 0; i < ls.length; i++) { var r = ls[i].range || [0, 0]; if (level >= r[0] && level <= r[1]) return ls[i].name; }
    return level >= 25 ? '神话' : (level >= 21 ? '史诗' : '见习');
  }
  function levelInfo(level) {
    var ls = WD.LEVELS || [];
    for (var i = 0; i < ls.length; i++) { var r = ls[i].range || [0, 0]; if (level >= r[0] && level <= r[1]) return ls[i]; }
    return ls[ls.length - 1] || { name: '见习', stand: '', status: '', life: '' };
  }
  function slotsFor(level) {
    var s = { 1: Math.min(4, 1 + Math.floor(level / 2)), 2: level >= 3 ? Math.min(3, Math.floor((level - 1) / 3)) : 0, 3: level >= 5 ? Math.min(2, Math.floor((level - 3) / 4)) : 0 };
    return s;
  }
  /* 长休 8 小时：疲劳 -2；整日休息：疲劳 -4 */
  function restLong(st) {
    addFatigue(st, -2);
    var pc = st.pc;
    var heal = Math.max(1, Math.round(pc.hp.max * 0.25));
    if (!st.flags.noHeal) pc.hp.cur = Math.min(pc.hp.max, pc.hp.cur + heal);
    pc.mp.cur = pc.mp.max;
    if (pc.slots) pc.slots = slotsFor(pc.level);
    eat(st, 'food'); eat(st, 'water');
    return { heal: heal, fatigue: pc.fatigue };
  }
  function restFullDay(st) { addFatigue(st, -4); return restLong(st); }

  /* ---------------- 死亡与损伤 ---------------- */
  var INJURIES = ['断肢', '内脏损伤', '重度烧伤', '失明（单眼）', '耳膜破裂', '旧伤复发'];
  function injure(st, kind) {
    var pc = st.pc;
    var inj = kind || pick(INJURIES);
    pc.injured.push({ name: inj, at: stampShort(st) });
    var eff = '';
    if (inj === '断肢') { pc.attrs.str = Math.max(3, pc.attrs.str - 3); pc.attrs.dex = Math.max(3, pc.attrs.dex - 3); eff = '力量与敏捷 -3'; }
    else if (inj === '内脏损伤') { pc.attrs.con = Math.max(3, pc.attrs.con - 3); eff = '体质 -3'; }
    else if (inj === '重度烧伤') { pc.attrs.cha = Math.max(3, pc.attrs.cha - 2); eff = '魅力 -2'; }
    else if (inj === '失明（单眼）') { eff = '远程攻击劣势'; }
    else eff = '阴雨天所有检定 -1';
    return { name: inj, eff: eff };
  }
  function deathSave(st) {
    var pc = st.pc;
    st.counters.ds = st.counters.ds || { ok: 0, fail: 0 };
    var r = d20();
    if (r >= 10) { st.counters.ds.ok++; }
    else { st.counters.ds.fail++; }
    var dead = st.counters.ds.fail >= 3;
    var stable = st.counters.ds.ok >= 3;
    if (dead) st.pc.hp.cur = -1;
    if (stable) { st.pc.hp.cur = 1; st.counters.ds = { ok: 0, fail: 0 }; }
    return { roll: r, ok: r >= 10, dead: dead, stable: stable, ds: st.counters.ds };
  }

  /* ---------------- 战斗 ---------------- */
  function weaponOf(st) {
    var w = null;
    (st.bag || []).forEach(function (it) { if (it.equip && (it.kind === 'weapon' || it.kind === 'melee' || it.kind === 'ranged')) w = w || it; });
    if (!w) w = { name: '徒手', dmg: '1d4', equip: true, kind: 'weapon' };
    return w;
  }
  function attackBonus(st, ranged) {
    var pc = st.pc, w = weaponOf(st);
    var k = ranged ? 'dex' : 'str';
    return profBonus(pc.level) + attrMod(pc.attrs[k]) + (w.bonus || 0) + talentSum(pc.talents, 'atk');
  }
  function damageOf(st) {
    var pc = st.pc, w = weaponOf(st);
    var k = (w.kind === 'ranged') ? 'dex' : 'str';
    return Math.max(1, rollDice(w.dmg || '1d6') + attrMod(pc.attrs[k]) + (w.dmgBonus || 0) + talentSum(pc.talents, 'dmg'));
  }
  function startCombat(st, foes, ctx) {
    var order = [{ side: 'pc', init: st.pc.init + d20() }];
    (foes || []).forEach(function (f, i) { f.idx = i; order.push({ side: 'foe', i: i, init: (f.init || 0) + d20() }); });
    order.sort(function (a, b) { return b.init - a.init; });
    st.combat = { foes: foes, round: 1, order: order, at: 0, ctx: ctx || {}, log: [] };
    return st.combat;
  }
  function foeFromMonster(m, level) {
    var t = (m.threat && m.threat[0]) || 1;
    var scale = Math.max(0.5, 1 + (level - t) * 0.08);
    return {
      id: m.id, name: m.name, cls: m.cls, hp: Math.round((m.hp || 10) * scale), hpMax: Math.round((m.hp || 10) * scale),
      ac: m.ac || 12, atk: m.atk || 3, dmg: m.dmg || '1d6', init: 1, status: [], trait: m.trait || '', weak: m.weak || '',
      drop: m.drop || [], threat: m.threat, xp: m.xp || (t * 40)
    };
  }
  function spawnFoe(terrain, level) {
    var ms = (WD.MONSTERS || []).filter(function (m) {
      if (!m.habitat) return false;
      var hit = m.habitat.some(function (h) { return h === terrain || (h && terrain && (h.indexOf(terrain) >= 0 || terrain.indexOf(h) >= 0)); });
      var th = (m.threat && m.threat[0]) || 1;
      return hit && th <= (level + 3);
    });
    if (!ms.length) ms = (WD.MONSTERS || []).filter(function (m) { return ((m.threat && m.threat[0]) || 1) <= level + 2; });
    if (!ms.length) ms = WD.MONSTERS || [];
    var m = pick(ms) || { name: '野狗', hp: 8, ac: 11, atk: 2, dmg: '1d4', threat: [1, 1] };
    /* 设定集的遭遇表按小队写（3d6 只灰林狼）。本作是单人局，
       群居怪的数量按等级放，1 级只碰一只，9 级起最多四只。 */
    var n = 1;
    if (/(狼|哥布林|骷髅|僵尸)/.test(m.name)) n = Math.min(4, 1 + Math.floor((level || 1) / 3));
    var foes = [];
    for (var i = 0; i < n; i++) foes.push(foeFromMonster(m, level));
    return foes;
  }
  function playerAttack(st, opts) {
    opts = opts || {};
    var pc = st.pc, cb = st.combat;
    if (!cb) return { ok: false, text: '没有战斗。' };
    var foes = cb.foes.filter(function (f) { return f.hp > 0; });
    if (!foes.length) return { ok: false, text: '敌人已经倒下。' };
    var target = opts.target != null ? cb.foes[opts.target] : foes[0];
    if (!target || target.hp <= 0) target = foes[0];
    var fat = fatigueEffect(pc.fatigue || 0);
    var adv = fat.atkDis ? -1 : 0;
    if ((pc.status === '重伤' || pc.status === '濒死')) adv -= 1;
    var rollR = check(attackBonus(st, opts.ranged), target.ac, adv);
    var out = { hit: rollR.ok, roll: rollR, target: target.name, dmg: 0, killed: false, crit: rollR.crit };
    if (rollR.ok) {
      var dmg = damageOf(st) * (rollR.crit ? 2 : 1);
      target.hp -= dmg; out.dmg = dmg;
      if (target.hp <= 0) {
        target.hp = 0; out.killed = true;
        var xp = target.xp || 40;
        out.xp = xp; addXp(st, xp);
        out.loot = [];
        (target.drop || []).forEach(function (d) { if (chance(0.5)) out.loot.push(d); });
      }
    }
    return out;
  }
  function foeTurn(st) {
    var cb = st.combat; if (!cb) return { hits: [], down: false };
    var res = { hits: [], down: false, dead: false };
    cb.foes.forEach(function (f) {
      if (f.hp <= 0) return;
      var r = check(f.atk || 2, st.pc.ac, (f.status || []).indexOf('束缚') >= 0 ? -1 : 0);
      if (r.ok) {
        var d = rollDice(f.dmg || '1d6');
        st.pc.hp.cur -= d;
        res.hits.push({ foe: f.name, dmg: d, roll: r.roll });
        if (/(毒|蝎尾|飞龙)/.test(f.name) && chance(0.35)) { pushStatus(st, '中毒'); res.hits[res.hits.length - 1].status = '中毒'; }
        if (/(幽魂)/.test(f.name) && chance(0.3)) { st.pc.attrs.con = Math.max(3, st.pc.attrs.con - 1); res.hits[res.hits.length - 1].status = '衰老之触 体质-1'; }
        if (/(石化蜥蜴)/.test(f.name) && chance(0.25)) { pushStatus(st, '束缚'); res.hits[res.hits.length - 1].status = '开始石化'; }
        if (/(骷髅|僵尸|食尸鬼)/.test(f.name) && chance(0.2)) { pushStatus(st, '中毒'); }
      }
    });
    if (st.pc.hp.cur <= 0) {
      st.pc.hp.cur = 0;
      pushStatus(st, '昏迷');
      res.down = true; res.dead = false;    /* 是否真的死，由控制器的生死豁免决定 */
    }
    cb.round++;
    st.pc.status = hpStatus(st.pc);
    return res;
  }
  function pushStatus(st, s) {
    st.pc.cond = st.pc.cond || [];
    if (st.pc.cond.indexOf(s) < 0) st.pc.cond.push(s);
    return st.pc.cond;
  }
  function statusTick(st) {
    var pc = st.pc, notes = [];
    (pc.cond || []).slice().forEach(function (s) {
      if (s === '中毒') { var d = roll(1, 4); pc.hp.cur -= d; notes.push('中毒发作，生命 -' + d); }
      if (s === '麻痹' && chance(0.4)) notes.push('四肢不听使唤');
    });
    /* 生死豁免只由控制器（GAME.rollDying）结算，这里不掷骰，
       否则两个循环互相重置计数，濒死会永远悬着。 */
    if (pc.hp.cur < 0) pc.hp.cur = 0;
    pc.cond = (pc.cond || []).filter(function (s) { return !(s === '束缚' && chance(0.4)) && !(s === '中毒' && chance(0.25)); });
    return notes;
  }
  function combatOver(st) {
    var cb = st.combat; if (!cb) return true;
    return !cb.foes.some(function (f) { return f.hp > 0; });
  }

  /* ---------------- 经济 ---------------- */
  var RATE = (WD.MONEY) || { cp: 1, sp: 100, gp: 1000, pp: 10000 };
  function moneyTotal(st) {
    var m = st.money || {};
    return (m.cp || 0) * (RATE.cp || 1) + (m.sp || 0) * (RATE.sp || 100) + (m.gp || 0) * (RATE.gp || 1000) + (m.pp || 0) * (RATE.pp || 10000);
  }
  function moneyFmt(cp) {
    cp = Math.max(0, Math.round(cp || 0));
    var pp = Math.floor(cp / (RATE.pp || 10000)); cp -= pp * (RATE.pp || 10000);
    var gp = Math.floor(cp / (RATE.gp || 1000)); cp -= gp * (RATE.gp || 1000);
    var sp = Math.floor(cp / (RATE.sp || 100)); cp -= sp * (RATE.sp || 100);
    var parts = [];
    /* 铂金币只在真的成堆出现时才用；日常开销一律按 GP 报，读起来才顺 */
    if (pp >= 50) parts.push(pp + ' PP');
    else gp += pp * 10;
    if (gp) parts.push(gp + ' GP');
    if (sp) parts.push(sp + ' SP');
    if (cp || !parts.length) parts.push(cp + ' CP');
    return parts.join(' ');
  }
  function moneyPay(st, cp) {
    cp = Math.round(cp || 0);
    if (moneyTotal(st) < cp) return false;
    var left = cp, m = st.money;
    ['pp', 'gp', 'sp', 'cp'].forEach(function (k) {
      var v = m[k] || 0, unit = RATE[k] || 1;
      var need = Math.ceil(left / unit);
      var take = Math.min(v, need);
      m[k] = v - take; left -= take * unit;
    });
    if (left < 0) { /* 找零 */ m.cp = (m.cp || 0) + (-left); }
    return true;
  }
  function moneyGain(st, cp) {
    cp = Math.round(cp || 0);
    st.money.gp = (st.money.gp || 0) + Math.floor(cp / (RATE.gp || 1000));
    var rest = cp % (RATE.gp || 1000);
    st.money.sp = (st.money.sp || 0) + Math.floor(rest / (RATE.sp || 100));
    st.money.cp = (st.money.cp || 0) + (rest % (RATE.sp || 100));
    return st.money;
  }
  function qualityOf(price) {
    var q = WD.QUALITY || [];
    for (var i = 0; i < q.length; i++) {
      var r = q[i].range || [0, 0];
      if (price >= r[0] && (r[1] >= 999999 || price <= r[1])) return q[i].name;
    }
    return (q[0] && q[0].name) || '凡品';
  }
  function itemPrice(it) {
    if (!it) return 0;
    if (it.priceGP != null) return it.priceGP * (RATE.gp || 1000);
    if (it.price == null) return 0;
    return it.price * (RATE.gp || 1000);   /* 数据表的 price 以求 GP 记 */
  }
  function allItems() {
    var out = [], I = WD.ITEMS || {};
    ['weapon', 'armor', 'gear', 'consumable'].forEach(function (k) {
      (I[k] || []).forEach(function (x) { var y = {}; for (var f in x) y[f] = x[f]; y.kind = y.kind || (k === 'weapon' ? 'weapon' : k); out.push(y); });
    });
    Object.keys(REG.items || {}).forEach(function (id) { out.push(REG.items[id]); });
    return out;
  }
  function findItem(name) {
    var all = allItems();
    for (var i = 0; i < all.length; i++) if (all[i].name === name || all[i].id === name) return all[i];
    return null;
  }
  function shopStock(st, kind) {
    var all = allItems();
    if (!all.length) return [];
    var lvl = st.pc.level || 1;
    return all.filter(function (it) {
      var p = it.price || 0;
      if (kind === 'consumable') return it.kind === 'consumable';
      if (kind === 'gear') return it.kind === 'gear' || it.kind === 'armor';
      if (kind === 'weapon') return it.kind === 'weapon' || it.kind === 'melee' || it.kind === 'ranged';
      return p <= 200 + lvl * 260;
    }).slice(0, 14);
  }
  function buy(st, item) {
    var p = itemPrice(item);
    if (!moneyPay(st, p)) return { ok: false, text: '钱不够：需要 ' + moneyFmt(p) + '。' };
    addItem(st, item);
    return { ok: true, text: '买下 ' + item.name + '，付出 ' + moneyFmt(p) + '。' };
  }
  function sell(st, name) {
    var idx = -1;
    (st.bag || []).forEach(function (it, i) { if (it.name === name && idx < 0) idx = i; });
    if (idx < 0) return { ok: false, text: '背包里没有 ' + name + '。' };
    var it = st.bag[idx];
    var p = Math.round(itemPrice(it) * 0.5);
    st.bag.splice(idx, 1);
    moneyGain(st, p);
    return { ok: true, text: '卖出 ' + it.name + '，得 ' + moneyFmt(p) + '。' };
  }
  function addItem(st, item, qty) {
    var name = typeof item === 'string' ? item : item.name;
    var found = null;
    (st.bag || []).forEach(function (it) { if (it.name === name) found = it; });
    if (found) { found.qty = (found.qty || 1) + (qty || 1); return found; }
    var base = typeof item === 'string' ? findItem(item) : item;
    /* 表里没有的东西：按名字生成一份（含介绍），登记后各处都能查到 */
    if (!base && typeof item === 'string' && global.IMPROV) {
      base = global.IMPROV.item(name);
      regPut('items', base);
    }
    if (!base) base = { name: name, kind: 'gear', price: 1, weight: 1 };
    var copy = {
      id: base.id || name, name: name, kind: base.kind || 'gear', qty: qty || 1,
      weight: base.weight != null ? base.weight : (base.kind === 'armor' ? 20 : 2),
      /* 介绍文字：表里有就用表里的，没有就按名字生成一句，物品栏里不留空 */
      price: base.price || 0, equip: false,
      desc: base.desc || base.effect || (global.IMPROV ? (global.IMPROV.item(name).desc || '') : ''),
      dmg: base.dmg, ac: base.ac, bonus: base.bonus, dmgBonus: base.dmgBonus
    };
    st.bag.push(copy);
    return copy;
  }
  /* --------- 声望 --------- */
  /* ---------- 赶路风险 ----------
     走得越勤（热度）、去的地方越凶（目标威胁）、当下地界越险，路上出事的可能越大。
     热度按游戏内时间自然消退（每两天降一点），长休与大歇也会降温。 */
  var DANGER_TERRAIN = { '山脉': 0.05, '沙漠': 0.05, '冰原': 0.05, '沼泽': 0.05, '荒原': 0.03, '废墟': 0.04, '地下': 0.04, '海域': 0.04 };
  function travelHeat(st) {
    var c = st.counters || (st.counters = {});
    var raw = c.travelHeat || 0;
    var at = c.travelHeatAt == null ? (c.hoursElapsed || 0) : c.travelHeatAt;
    var cool = Math.floor(((c.hoursElapsed || 0) - at) / 48);
    return Math.max(0, raw - cool);
  }
  function addHeat(st, n) {
    var c = st.counters || (st.counters = {});
    c.travelHeat = travelHeat(st) + (n || 1);
    c.travelHeatAt = c.hoursElapsed || 0;
    c.travelCount = (c.travelCount || 0) + 1;
    return c.travelHeat;
  }
  function coolHeat(st, n) {
    var c = st.counters || (st.counters = {});
    c.travelHeat = Math.max(0, travelHeat(st) - (n || 1));
    c.travelHeatAt = c.hoursElapsed || 0;
    return c.travelHeat;
  }
  function threatAvg(r) { return (r && r.threat) ? (r.threat[0] + r.threat[1]) / 2 : 2; }
  function travelRisk(st, dest) {
    var here = regionByName(st.place) || {};
    var p = 0.06
      + travelHeat(st) * 0.035                 /* 越频繁越容易出事 */
      + (threatAvg(dest) - 1) * 0.035          /* 目的地越危险越容易出事 */
      + (threatAvg(here) - 1) * 0.015
      + (DANGER_TERRAIN[(dest && dest.terrain) || ''] || 0)
      + (DANGER_TERRAIN[here.terrain || ''] || 0) * 0.5
      - (st.pc.level || 1) * 0.008
      + (st.pc.fatigue || 0) * 0.02
      + ((st.pc.hp.cur / Math.max(1, st.pc.hp.max)) < 0.4 ? 0.06 : 0);
    return Math.max(0.03, Math.min(0.85, p));
  }
  function riskWord(p) {
    if (p < 0.1) return '几乎无险';
    if (p < 0.2) return '略有风险';
    if (p < 0.32) return '有风险';
    if (p < 0.48) return '相当凶险';
    if (p < 0.65) return '极凶险';
    return '近乎送死';
  }
  function forecast(st, dest) {
    var p = travelRisk(st, dest);
    return { p: p, word: riskWord(p), heat: travelHeat(st), level: Math.round(p * 100) };
  }
  var MISHAP = [
    { k: 'ambush', n: '拦路的', re: function (t) { return 1 + t * 0.8; } },
    { k: 'disaster', n: '天灾', re: function (t) { return 1 + t * 0.6; } },
    { k: 'lost', n: '迷路', re: function () { return 1.4; } },
    { k: 'robbery', n: '破财', re: function (t) { return 0.8 + t * 0.3; } },
    { k: 'injury', n: '伤病', re: function (t) { return 0.9 + t * 0.5; } },
    { k: 'wreck', n: '车马舟船出事', re: function (t) { return 0.7 + t * 0.4; } }
  ];
  function travelMishap(st, dest, bias) {
    var t = threatAvg(dest);
    var pool = [];
    MISHAP.forEach(function (m) {
      var w = Math.max(1, Math.round(m.re(t) * 10 * ((bias && bias[m.k]) || 1)));
      for (var i = 0; i < w; i++) pool.push(m);
    });
    var m = pick(pool);
    var lvl = st.pc.level || 1;
    var out = { kind: m.k, name: m.n, text: '', hp: 0, mp: 0, fatigue: 0, gold: 0, loseItem: false, hours: 0, combat: null, injury: false };
    if (m.k === 'ambush') {
      out.combat = spawnFoe((dest && dest.terrain) || st.terrain, lvl);
      out.text = '路上有人等着：' + out.combat.map(function (f) { return f.name; }).join('、') + '。';
      out.fatigue = 1;
    } else if (m.k === 'disaster') {
      out.hp = roll(2, 6) + Math.round(t);
      out.fatigue = 1;
      out.text = '（' + ((dest && dest.terrain) || '野地') + '上的意外）你被砸中，' + out.hp + ' 点伤害。';
    } else if (m.k === 'lost') {
      out.hours = int(24, 48);
      out.fatigue = 1;
      out.text = '走岔了路，多绕了 ' + Math.round(out.hours / 24) + ' 天。';
    } else if (m.k === 'robbery') {
      var total = moneyTotal(st);
      out.gold = Math.max(1, Math.round(total * (0.12 + t * 0.03) / (RATE.gp || 1000)));
      out.text = '遇上剪径的，丢了 ' + out.gold + ' GP。';
    } else if (m.k === 'injury') {
      out.hp = roll(1, 8) + Math.round(t / 2);
      out.fatigue = 1;
      out.injury = chance(0.12 + t * 0.02);
      out.text = '旧伤裂开、新伤又添，' + out.hp + ' 点伤害。';
    } else {
      out.hours = int(12, 36);
      out.loseItem = chance(0.5);
      out.hp = roll(1, 6);
      out.text = '车轴断了（船板裂了），耽搁一天多，还伤了 ' + out.hp + ' 点。';
    }
    return out;
  }

  /* ---------- 长途出行：把代价先算清楚，再让玩家决定 ----------
     一站一站串成路线，算出天数、盘缠、疲劳、每站风险与「至少出一次事」的概率。 */
  /* 稳路：按「全程出事的概率最小」找路（Dijkstra，代价 = -ln(1-风险) + 天数权重），
     比硬性绕开危险地区靠谱——那样经常把路网切断，一条路都算不出来。 */
  function safeRoute(st, destName) {
    var geo = global.GEO;
    if (!geo || !destName) return null;
    var start = st.place;
    if (start === destName) return [start];
    var heatNow = travelHeat(st);
    function riskOf(from, to) {
      var fake = {
        counters: { travelHeat: heatNow, travelHeatAt: st.counters.hoursElapsed || 0, hoursElapsed: st.counters.hoursElapsed || 0 },
        place: from, terrain: (regionByName(from) || {}).terrain, pc: st.pc
      };
      return travelRisk(fake, regionByName(to));
    }
    var dist = {}, prev = {}, done = {}, queue = [start];
    dist[start] = 0;
    var guard = 0;
    while (queue.length && guard++ < 400) {
      queue.sort(function (a, b) { return dist[a] - dist[b]; });
      var cur = queue.shift();
      if (done[cur]) continue;
      done[cur] = 1;
      if (cur === destName) break;
      geo.adjacentTo(cur).forEach(function (x) {
        var n = x.name;
        if (done[n]) return;
        var p = riskOf(cur, n);
        var step = -Math.log(Math.max(0.02, 1 - p)) + 0.03 * geo.hopDays(cur, n);
        var nd = dist[cur] + step;
        if (dist[n] == null || nd < dist[n]) {
          dist[n] = nd; prev[n] = cur;
          if (queue.indexOf(n) < 0) queue.push(n);
        }
      });
    }
    if (prev[destName] == null) return null;
    var path = [destName], g2 = 0;
    while (path[0] !== start && g2++ < 40) path.unshift(prev[path[0]]);
    return path[0] === start && path.length > 1 ? path : null;
  }

  function longPlan(st, dest, mode) {
    var geo = global.GEO;
    if (!geo) return null;
    var destName = (typeof dest === 'string') ? dest : (dest && dest.name);
    var r = regionByName(destName);
    if (!r) return null;
    var path = (mode === 'safe') ? safeRoute(st, destName) : geo.route(st.place, destName);
    if (!path || path.length < 2) return null;
    var hops = [], days = 0, cost = 0, base = travelHeat(st);
    var risks = [];
    for (var i = 1; i < path.length; i++) {
      var a = path[i - 1], b = path[i];
      var d = geo.hopDays(a, b);
      days += d;
      cost += d * 8 + 4;                                   /* 干粮 4 SP + 住店 4 SP／天，过一站再加 4 SP */
      /* 热度按「整趟」算，不按站累加：一趟长途只让热度涨一档 */
      var fake = {
        counters: { travelHeat: base, travelHeatAt: st.counters.hoursElapsed || 0, hoursElapsed: st.counters.hoursElapsed || 0 },
        place: a, terrain: (regionByName(a) || {}).terrain, pc: st.pc
      };
      var rr = travelRisk(fake, regionByName(b));
      risks.push(rr);
      hops.push({ from: a, to: b, days: d, risk: rr });
    }
    var survive = 1;
    risks.forEach(function (p) { survive *= (1 - p); });
    /* 长途是「过境行军」：不在险地久留，每站风险按 0.6 折减，
       否则五到八站连乘下来几乎必定出事，长途就成了必亏的选择。 */
    var march = (path.length - 1) >= 3;
    if (march) {
      risks = risks.map(function (p) { return Math.max(0.03, p * 0.6); });
      hops.forEach(function (h, i) { h.risk = risks[i]; });
      survive = 1;
      risks.forEach(function (p) { survive *= (1 - p); });
    }
    return {
      mode: mode || 'fast', march: march,
      route: path, hops: hops, stops: path.length - 1, days: days,
      costSP: cost, fatigue: Math.max(1, Math.round((path.length - 1) / 2)),
      heatNow: base, heatAfter: base + (path.length - 1 >= 4 ? 2 : 1),
      risks: risks, riskMax: Math.max.apply(null, risks),
      riskAvg: risks.reduce(function (a, b) { return a + b; }, 0) / risks.length,
      atLeastOne: 1 - survive, dest: r
    };
  }
  /* 同一目的地给两条路：最快的、绕开险地的 */
  function longOptions(st, dest) {
    var fast = longPlan(st, dest, 'fast');
    if (!fast) return null;
    var safe = longPlan(st, dest, 'safe');
    if (safe && safe.route.join('>') === fast.route.join('>')) safe = null;
    return { fast: fast, safe: safe };
  }
  /* ---------- 走法挡位 ----------
     同样的路，可以自己走、搭商队、雇车马、急行夜路。
     每一档的天数、盘缠、疲劳、风险都由「路线经过什么地方 + 目的地危险程度 + 人物当下状态」算出来；
     不合适的挡位会被锁掉，并写明为什么。 */
  var TIERS = [
    { id: 'foot', name: '自己走', days: 1.15, cost: 0.55, fatigue: 1.0, risk: 1.15,
      desc: '省盘缠，用脚量过去，路上什么都得自己扛。' },
    { id: 'caravan', name: '搭商队', days: 1.05, cost: 2.4, fatigue: 0.5, risk: 0.5,
      desc: '跟着货车走官道，人多眼杂，出事了有人一起挡。', mishap: { ambush: 0.5, robbery: 1.3 } },
    { id: 'mount', name: '雇车马', days: 0.7, cost: 1.9, fatigue: 0.6, risk: 0.85,
      desc: '出钱买脚力，快，也省力；车轴断了要赔。', mishap: { wreck: 1.4 } },
    { id: 'rush', name: '急行夜路', days: 0.55, cost: 0.85, fatigue: 1.8, risk: 1.4,
      desc: '昼夜赶路，最省时间，最伤身子。', mishap: { injury: 1.5, lost: 1.3 } }
  ];
  function tiers(st, dest, mode) {
    var plan = longPlan(st, dest, mode);
    if (!plan) return null;
    var spUnit = RATE.sp || 100;
    var myMoney = moneyTotal(st);
    var route = plan.route;
    var cityOnRoute = route.some(function (n) { var r = regionByName(n); return r && (r.kind === 'city' || r.kind === 'town'); });
    var seaOnRoute = route.some(function (n) { var r = regionByName(n); return r && r.terrain === '海域'; });
    var badForCart = route.some(function (n, i) {
      if (i === 0) return false;
      var r = regionByName(n);
      return r && /沼泽|山脉|森林|地下/.test(r.terrain || '');
    });
    var out = [];
    TIERS.forEach(function (t) {
      var days = Math.max(1, Math.round(plan.days * t.days));
      var costSP = Math.round(plan.costSP * t.cost);
      var fatigue = Math.max(0, Math.round(plan.fatigue * t.fatigue));
      var risks = plan.risks.map(function (p) { return Math.max(0.03, Math.min(0.9, p * t.risk)); });
      var survive = 1;
      risks.forEach(function (p) { survive *= (1 - p); });
      var o = {
        id: t.id, name: t.name, desc: t.desc, days: days, costSP: costSP,
        dayMul: t.days, costMul: t.cost, fatigueMul: t.fatigue, riskMul: t.risk,
        costGP: Math.round(costSP / 10 * 10) / 100,
        fatigue: fatigue, risks: risks, riskMax: Math.max.apply(null, risks), atLeastOne: 1 - survive,
        mishap: t.mishap || null, ok: true, reason: '', note: ''
      };
      if (t.id === 'caravan') {
        if (seaOnRoute) { o.ok = false; o.reason = '这一路要过海，商队不走这条线'; }
        else if (!cityOnRoute) { o.ok = false; o.reason = '这一路不经过城镇，没有商队可搭'; }
        else if (myMoney < costSP * spUnit) { o.ok = false; o.reason = '盘缠不够（需约 ' + (costSP / 10).toFixed(1) + ' GP）'; }
        else o.note = '跟人搭伙：拦路的风险减半，但人多也招贼';
        if (o.ok && (st.pc.fatigue || 0) >= 3) o.note += '；你正累着，搭商队能缓一口气';
      }
      if (t.id === 'mount') {
        if (badForCart) { o.ok = false; o.reason = '路上有沼泽、山地或密林，车马过不去'; }
        else if (myMoney < costSP * spUnit) { o.ok = false; o.reason = '盘缠不够（需约 ' + (costSP / 10).toFixed(1) + ' GP）'; }
        else o.note = '平地赶车快，省力；车马出事会掉东西';
      }
      if (t.id === 'rush') {
        var hpRatio = st.pc.hp.cur / Math.max(1, st.pc.hp.max);
        if ((st.pc.fatigue || 0) >= 4) { o.ok = false; o.reason = '你已经疲劳 ' + st.pc.fatigue + ' 级，急行会直接倒下'; }
        else if (hpRatio < 0.4) { o.ok = false; o.reason = '身上带着伤（生命 ' + Math.round(hpRatio * 100) + '%），急行等于送命'; }
        else o.note = '能把路程压掉近一半，但疲劳翻倍、伤病更容易找上门';
        if (o.ok && (st.pc.fatigue || 0) >= 2) o.note += '；以你现在的疲劳，风险还要再加一层';
      }
      if (t.id === 'foot') o.note = myMoney < 200 ? '身上钱不多，这是最省的一档' : '不花钱，但最慢也最险';
      out.push(o);
    });
    return { plan: plan, tiers: out, mode: mode || 'fast', cityOnRoute: cityOnRoute, seaOnRoute: seaOnRoute, badForCart: badForCart };
  }
  function tierById(st, dest, mode, id) {
    var t = tiers(st, dest, mode);
    if (!t) return null;
    var hit = t.tiers.filter(function (x) { return x.id === id; })[0] || t.tiers[0];
    return { tier: hit, plan: t.plan };
  }

  function repLevel(v) {
    var ls = WD.REP_LEVELS || ['敌对', '冷淡', '中立', '友好', '尊敬', '崇拜'];
    if (v < -50) return ls[0]; if (v < -20) return ls[1]; if (v < 20) return ls[2];
    if (v < 50) return ls[3]; if (v < 80) return ls[4]; return ls[5];
  }
  function repAdd(st, org, n) {
    st.rep = st.rep || {};
    if (!st.rep[org]) st.rep[org] = { value: 0, level: '中立' };
    st.rep[org].value = Math.max(-100, Math.min(100, st.rep[org].value + n));
    st.rep[org].level = repLevel(st.rep[org].value);
    return st.rep[org];
  }
  function repGet(st, org) {
    st.rep = st.rep || {};
    if (!st.rep[org]) st.rep[org] = { value: 0, level: '中立' };
    return st.rep[org];
  }
  /* --------- 副职业 --------- */
  var CRAFT_TIERS = (WD.CRAFT_TIERS) || ['未入门', '初窥门径', '小有所成', '融会贯通', '登峰造极'];
  function craftTier(v) {
    if (v >= 85) return CRAFT_TIERS[4];
    if (v >= 60) return CRAFT_TIERS[3];
    if (v >= 40) return CRAFT_TIERS[2];
    if (v >= 20) return CRAFT_TIERS[1];
    return CRAFT_TIERS[0];
  }
  function craftAdd(st, name, n) {
    st.crafts = st.crafts || {};
    if (!st.crafts[name]) st.crafts[name] = { value: 0, tier: CRAFT_TIERS[0] };
    var c = st.crafts[name];
    var before = c.tier;
    c.value = Math.max(0, Math.min(100, c.value + n));
    c.tier = craftTier(c.value);
    return { value: c.value, tier: c.tier, up: c.tier !== before };
  }
  /* --------- 任务生成 --------- */
  function taskGenerate(st, opts) {
    opts = opts || {};
    var type = opts.type || pick(TB.TASK_TYPE || []) || { n: 1, name: '清剿', goal: '消灭{place}的怪物' };
    var giver = opts.giver || pick(TB.TASK_GIVER || []) || { n: 1, name: '冒险者公会', trait: '正规委托' };
    var place = opts.place || pick(TB.TASK_PLACE || []) || { name: '附近森林' };
    var risk = opts.risk || pick(TB.TASK_RISK || []) || { n: 10, text: '无额外风险（运气好）', kind: 'none' };
    var diffList = TB.DIFFICULTY || [{ name: '中级', dc: 15, level: [7, 9] }];
    var lvl = st.pc.level || 1;
    var diff = diffList[0];
    for (var i = 0; i < diffList.length; i++) { var r = diffList[i].level || [1, 3]; if (lvl >= r[0] && lvl <= r[1]) { diff = diffList[i]; break; } }
    var rewardBase = 20 + Math.pow(Math.max(1, lvl), 1.9) * 8;
    if (giver.name === '神秘委托人（匿名）') rewardBase *= 2.6;
    if (giver.name === '圣光教会') rewardBase *= 0.6;
    if (giver.name === '平民/村民') rewardBase *= 0.35;
    var reward = Math.round(rewardBase / 5) * 5;
    var adj = pick(TB.TASK_ADJ || ['沉默的']) || '沉默的';
    var noun = pick(TB.TASK_NOUN || ['信物']) || '信物';
    var limit = risk.kind === 'time' ? int(2, 5) : (chance(0.4) ? int(5, 12) : 0);
    return {
      id: 'q' + (st.counters.questSeq = (st.counters.questSeq || 0) + 1),
      name: adj + noun, type: type.name, giver: giver.name, giverTrait: giver.trait,
      place: place.name, goal: String(type.goal || '').replace('{place}', place.name).replace('{item}', noun).replace('{target}', adj + noun),
      extra: chance(0.5) ? '次要目标：' + pick(['取回一件信物', '带回活口', '绘制地形图', '保全证人']) + '（额外 +' + Math.round(reward * 0.4) + ' GP）' : '',
      diff: diff.name, diffLevel: diff.level, dc: diff.dc, reward: reward, rewardNote: rewardNote(reward, lvl),
      risk: risk.text, riskKind: risk.kind, limit: limit, state: '未接', progress: 0, born: stampShort(st)
    };
  }
  function rewardNote(gp, lvl) {
    if (gp >= 10000) return '奥金级报酬，另有情报分成';
    if (gp >= 2000) return '秘银级报酬，' + (chance(0.5) ? '附一件罕见魔法物品' : '附一件精良装备');
    if (gp >= 400) return '金级报酬，' + (chance(0.5) ? '附一件轻微附魔物品' : '差旅由委托人承担');
    return '公会担保，报酬透明';
  }
  /* --------- 天赋 --------- */
  function talentPool(st, n) {
    var src = (WD.TALENTS && WD.TALENTS.SSS) || [];
    if (!src.length) return [];
    var pool = shuffle(src).slice(0, Math.min(n || 10, src.length));
    while (pool.length < (n || 10) && src.length) pool = pool.concat(shuffle(src).slice(0, (n || 10) - pool.length));
    return pool.slice(0, n || 10);
  }
  function applyTalent(st, t) {
    if (!t) return;
    var pc = st.pc, e = t.effect || {};
    if (e.attrs) for (var k in e.attrs) if (pc.attrs[k] != null) pc.attrs[k] += e.attrs[k];
    if (e.gold) moneyGain(st, e.gold * (RATE.gp || 1000));
    if (e.rep) for (var o in e.rep) repAdd(st, o, e.rep[o]);
    pc.talents = pc.talents || [];
    pc.talents.push(t);
    derive(st);
    return pc.talents;
  }
  /* 开局天赋抽选：一档一组，抽到多少就带走多少。
     50% 五个 D · 30% 四个 C · 15% 三个 B · 4% 两个 A · 1% 一个 SSS */
  var TAL_DRAW = [
    { grade: 'D', n: 5, p: 0.50, cn: '五个 D 级' },
    { grade: 'C', n: 4, p: 0.30, cn: '四个 C 级' },
    { grade: 'B', n: 3, p: 0.15, cn: '三个 B 级' },
    { grade: 'A', n: 2, p: 0.04, cn: '两个 A 级' },
    { grade: 'SSS', n: 1, p: 0.01, cn: '一个 SSS 级' }
  ];
  function talentsOfGrade(g) { return ((WD.TALENTS || {})[g] || []).slice(); }
  function allTalents() {
    var out = [];
    ['SSS', 'A', 'B', 'C', 'D'].forEach(function (g) { talentsOfGrade(g).forEach(function (t) { out.push(t); }); });
    return out;
  }
  function talentById(id) {
    var all = allTalents();
    for (var i = 0; i < all.length; i++) if (all[i].id === id || all[i].name === id) return all[i];
    return null;
  }
  /* 抽一次：先按概率定档，再从该档里不重复地取够数量；该档不够就按实际条数给 */
  function drawTalents(st) {
    var r = rnd(), acc = 0, band = TAL_DRAW[TAL_DRAW.length - 1];
    for (var i = 0; i < TAL_DRAW.length; i++) {
      acc += TAL_DRAW[i].p;
      if (r < acc) { band = TAL_DRAW[i]; break; }
    }
    var pool = shuffle(talentsOfGrade(band.grade));
    var list = pool.slice(0, Math.min(band.n, pool.length));
    return { grade: band.grade, n: band.n, cn: band.cn, list: list };
  }
  /* 概率表本身也公开给界面用 */
  function talentOdds() { return TAL_DRAW.map(function (x) { return { grade: x.grade, n: x.n, p: x.p, cn: x.cn }; }); }
  /* --------- 怪物 / 掉落 --------- */
  function monsterByName(name) {
    var ms = WD.MONSTERS || [];
    for (var i = 0; i < ms.length; i++) if (ms[i].name === name) return ms[i];
    return null;
  }
  function monsterByThreat(terrain, level) {
    var ms = (WD.MONSTERS || []).filter(function (m) {
      var t = (m.threat && m.threat[0]) || 1;
      return Math.abs(t - level) <= 3 && (!terrain || (m.habitat || []).some(function (h) { return h.indexOf(terrain) >= 0 || terrain.indexOf(h) >= 0; }));
    });
    return pick(ms) || pick(WD.MONSTERS || []);
  }
  /* --------- 环境事件 --------- */
  function wildEvent(terrain) {
    var t = TB.WILD || {};
    var rows = t[terrain] || t['平原'] || [];
    if (!rows.length) return null;
    var d = d20();
    for (var i = 0; i < rows.length; i++) if (d >= rows[i].n1 && d <= rows[i].n2) {
      var r = {}; for (var k in rows[i]) r[k] = rows[i][k]; r.d20 = d; return r;
    }
    return null;
  }
  function cityEvent() {
    var rows = TB.CITY || []; if (!rows.length) return null;
    var d = int(1, 12);
    for (var i = 0; i < rows.length; i++) if (d >= rows[i].n1 && d <= rows[i].n2) { var r = {}; for (var k in rows[i]) r[k] = rows[i][k]; r.d12 = d; return r; }
    return rows[0];
  }
  function nightEvent() {
    var rows = TB.NIGHT || []; if (!rows.length) return null;
    var d = int(1, 10);
    for (var i = 0; i < rows.length; i++) if (d >= rows[i].n1 && d <= rows[i].n2) { var r = {}; for (var k in rows[i]) r[k] = rows[i][k]; r.d10 = d; return r; }
    return rows[0];
  }
  function rumor() {
    var rs = WD.RUMORS || []; if (!rs.length) return null;
    return rs[int(1, rs.length) - 1];
  }
  function legend(region) {
    var ls = WD.LEGENDS || [];
    for (var i = 0; i < ls.length; i++) {
      if (region && (ls[i].region.indexOf(region) >= 0 || region.indexOf(ls[i].region) >= 0)) {
        var rows = ls[i].rows || []; if (rows.length) return pick(rows).text;
      }
    }
    var all = [];
    ls.forEach(function (g) { (g.rows || []).forEach(function (r) { all.push(r.text); }); });
    return pick(all);
  }
  function heroFor(region) {
    var hs = WD.HEROES || [];
    for (var i = 0; i < hs.length; i++) if (region && hs[i].area && region.indexOf(hs[i].area) >= 0) return hs[i];
    return pick(hs);
  }
  function regionByName(name) {
    var rs = WD.REGIONS || [];
    for (var i = 0; i < rs.length; i++) if (rs[i].name === name) return rs[i];
    return null;
  }
  function godOf(domain) {
    var gs = WD.GODS || [];
    for (var i = 0; i < gs.length; i++) if (domain && (gs[i].domain.indexOf(domain) >= 0 || gs[i].name === domain)) return gs[i];
    return pick(gs);
  }
  function questRoll(st, kind) {
    /* 冒险者公会任务骰：用于打听消息 / 告示板 */
    return taskGenerate(st, {});
  }

  var ENG = {
    seed: seed, rnd: rnd, int: int, pick: pick, chance: chance, shuffle: shuffle, d20: d20, roll: roll, rollDice: rollDice,
    reg: REG, regPut: regPut, regGet: regGet,
    attrMod: attrMod, profBonus: profBonus, ATTR_KEYS: ATTR_KEYS, attrCN: attrCN,
    check: check, opposed: opposed, checkMod: checkMod,
    time: {
      absDay: absDay, absHour: absHour, advance: advance, stamp: stamp, stampShort: stampShort,
      weekday: weekday, monthName: monthName, monthInfo: monthInfo, shichen: shichen, partOfDay: partOfDay,
      festival: festival, weather: weather, normTime: normTime, MONTH_DAYS: MONTH_DAYS
    },
    char: {
      derive: derive, classById: classById, raceById: raceById, applyRaceBonus: applyRaceBonus,
      needXp: needXp, addXp: addXp, levelUp: levelUp, levelName: levelName, levelInfo: levelInfo,
      slotsFor: slotsFor, restLong: restLong, restFullDay: restFullDay, fatigueEffect: fatigueEffect,
      addFatigue: addFatigue, hungerTick: hungerTick, eat: eat, encumbrance: encumbrance,
      hpStatus: hpStatus, injure: injure, deathSave: deathSave, INJURIES: INJURIES,
      hpDieOf: function (id) { return hpDieNum(classById(id)); },
      casterAttrOf: casterAttrOf, slotOf: slotOf, autoEquip: autoEquip,
      powerName: powerName, talentSum: talentSum
    },
    combat: {
      start: startCombat, playerAttack: playerAttack, foeTurn: foeTurn, over: combatOver,
      pushStatus: pushStatus, statusTick: statusTick, weaponOf: weaponOf, attackBonus: attackBonus,
      damageOf: damageOf, spawnFoe: spawnFoe, foeFromMonster: foeFromMonster
    },
    money: { total: moneyTotal, fmt: moneyFmt, pay: moneyPay, gain: moneyGain, RATE: RATE },
    item: { all: allItems, find: findItem, price: itemPrice, qualityOf: qualityOf, add: addItem, stock: shopStock, buy: buy, sell: sell },
    rep: { get: repGet, add: repAdd, level: repLevel },
    travel: {
      heat: travelHeat, addHeat: addHeat, cool: coolHeat,
      risk: travelRisk, forecast: forecast, word: riskWord, mishap: travelMishap,
      longPlan: longPlan, longOptions: longOptions, safeRoute: safeRoute,
      tiers: tiers, tierById: tierById, TIERS: TIERS,
      DANGER_TERRAIN: DANGER_TERRAIN
    },
    craft: { add: craftAdd, tier: craftTier, TIERS: CRAFT_TIERS },
    task: { generate: taskGenerate },
    talent: { pool: talentPool, apply: applyTalent, sum: talentSum,
      draw: drawTalents, odds: talentOdds, all: allTalents, byGrade: talentsOfGrade, byId: talentById },
    foe: { spawn: spawnFoe, byName: monsterByName, byThreat: monsterByThreat },
    table: { wild: wildEvent, city: cityEvent, night: nightEvent, rumor: rumor, legend: legend, hero: heroFor },
    world: { region: regionByName, god: godOf },
    questRoll: questRoll
  };
  global.ENG = ENG;
})(window);
