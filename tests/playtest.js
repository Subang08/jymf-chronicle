/* 长时间试玩：四个开篇各推 60 回合，统计系统触发与文本样本 */
'use strict';
const { loadGame } = require('./lib');
const G = loadGame();
const { win, byId, document } = G;
const { GAME, ENG, WD, CREATE, NARR, PANEL } = win;

function logText() { return byId.log.allText(); }

function playOpening(opIdx, turns, seed) {
  win.localStorage.clear();
  GAME.state = null;
  win.__bootGame && (byId.landing.classList.contains('hidden') ? null : null);
  GAME.startCreate(true);
  const st0 = GAME.state;
  st0.seed = seed; ENG.seed(seed);
  let guard = 0;
  const steps = [];
  while (GAME.state.phase === 'create' && guard++ < 40) {
    const n = CREATE.node(GAME.state);
    steps.push(n.step);
    /* 全程选 a（确认步的 a 就是「进入世界」），只在指定步换选择，避免在确认页来回弹 */
    if (n.step === 'opening') GAME.choose(['a', 'b', 'c', 'd'][opIdx]);
    else if (n.step === 'name') GAME.choose('e', '试玩者' + opIdx);
    else if (n.step === 'class') GAME.choose(['a', 'c', 'd', 'b'][opIdx % 4]);
    else GAME.choose('a');
  }
  const s = GAME.state;
  const stats = {
    opening: WD.OPENINGS[opIdx].name, place: s.place, terrain: s.terrain, cls: s.pc.clsName, race: s.pc.raceName,
    turns: 0, combats: 0, kills: 0, quests: 0, questsDone: 0, levelups: 0, deaths: 0, dying: 0,
    encounters: 0, panics: 0, items: 0, gold: 0, custom: 0, errors: []
  };
  const startLevel = s.pc.level;
  const customActs = ['我观察四周的脚印', '我前往曙光城', '我打听这里的传闻', '我修炼剑术', '我在市集买 治疗微伤药水',
    '我去冒险者公会看委托', '我拔剑砍过去', '我潜行溜进去', '我吃点东西', '我找份活干', '我包扎伤口', '我施法试探', '我在酒馆喝一杯'];
  for (let i = 0; i < turns; i++) {
    try {
      const phase = GAME.state.phase;
      if (phase === 'dead') { stats.deaths++; break; }
      if (GAME.state.flags.dying) {
        stats.dying++;
        const before = GAME.state.pc.hp.cur;
        GAME.choose('a');
        if (GAME.state.pc.hp.cur > before || !GAME.state.flags.dying) stats.panics++;
        continue;
      }
      const before = {
        hp: GAME.state.pc.hp.cur, gold: ENG.money.total(GAME.state), bag: GAME.state.bag.length,
        lvl: GAME.state.pc.level, q: GAME.state.quests.length,
        done: GAME.state.quests.filter(x => x.state === '完成').length,
        combat: !!GAME.state.combat
      };
      if (i % 4 === 3) { GAME.choose('e', customActs[(i / 4 | 0) % customActs.length]); stats.custom++; }
      else {
        /* 像个正常玩家那样打：血少就歇，有委托就推进，其余按 a/c/b 轮换 */
        const st = GAME.state;
        const ratio = st.pc.hp.cur / st.pc.hp.max;
        const hasQ = st.quests.some(x => x.state === '进行中');
        const opts = GAME.opts.map(o => o.act);
        let k = 'a';
        if (ratio < 0.5 && opts.indexOf('rest') >= 0) k = GAME.opts.filter(o => o.act === 'rest')[0].k;
        else if (hasQ && opts.indexOf('quest') >= 0) k = GAME.opts.filter(o => o.act === 'quest')[0].k;
        else if (opts.indexOf('guild') >= 0 && !hasQ) k = GAME.opts.filter(o => o.act === 'guild')[0].k;
        else k = ['a', 'c', 'a', 'd'][i % 4];
        GAME.choose(k);
      }
      const after = GAME.state;
      if (!before.combat && after.combat) stats.combats++;
      if (before.combat && !after.combat) stats.kills++;
      if (after.pc.level > before.lvl) stats.levelups += after.pc.level - before.lvl;
      if (after.quests.length > before.q) stats.quests++;
      if (after.quests.filter(x => x.state === '完成').length > before.done) stats.questsDone++;
      const t = logText();
      stats.encounters += (t.match(/遭 遇 ·/g) || []).length ? 0 : 0;
      stats.turns++;
    } catch (e) {
      stats.errors.push('turn' + i + ': ' + e.message);
      if (stats.errors.length > 3) break;
    }
  }
  const f = GAME.state;
  stats.items = f.bag.length;
  stats.gold = Math.round(ENG.money.total(f) / 1000);
  stats.finalLevel = f.pc.level;
  stats.levelGain = f.pc.level - startLevel;
  stats.place = f.place;
  stats.day = f.time.month + '/' + f.time.day;
  stats.hist = f.history.length;
  stats.nodes = f.nodes.length;
  stats.encounterPanels = (logText().match(/遭 遇 ·/g) || []).length;
  stats.taskPanels = (logText().match(/委 托 书/g) || []).length;
  stats.shopPanels = (logText().match(/市 集 · 价 目/g) || []).length;
  stats.levelPanels = (logText().match(/升 级/g) || []).length;
  stats.undefinedHits = (logText().match(/undefined|NaN/g) || []).length;
  stats.sample = logText().replace(/\s+/g, ' ').slice(1200, 1900);
  return stats;
}

const results = [];
for (let i = 0; i < 4; i++) results.push(playOpening(i, 60, 4242 + i * 77));

let bad = 0;
results.forEach(r => {
  console.log('=== 开篇 ' + (results.indexOf(r) + 1) + ' · ' + r.opening + ' ===');
  console.log('  起点 ' + r.place + ' / ' + r.terrain + ' · ' + r.race + r.cls + ' · 回合 ' + r.turns + ' · 等级 ' + r.finalLevel + '(+' + r.levelGain + ')');
  console.log('  交战 ' + r.combats + ' · 脱离/结束 ' + r.kills + ' · 濒死 ' + r.dying + ' · 死亡 ' + r.deaths +
    ' · 任务接取 ' + r.quests + ' / 完成 ' + r.questsDone + ' · 自定义行动 ' + r.custom);
  console.log('  遭遇面板 ' + r.encounterPanels + ' · 委托书 ' + r.taskPanels + ' · 价目 ' + r.shopPanels + ' · 升级面板 ' + r.levelPanels);
  console.log('  物品 ' + r.items + ' 类 · 持币 ' + r.gold + ' GP · 文字块 ' + r.hist + ' · 节点 ' + r.nodes + ' · 日期 ' + r.day + ' @ ' + r.place);
  console.log('  文本样本：' + r.sample.slice(0, 260));
  if (r.errors.length) { console.log('  错误：' + r.errors.join(' | ')); bad++; }
  if (r.undefinedHits) { console.log('  出现 undefined/NaN 次数：' + r.undefinedHits); bad++; }
  console.log('');
});
console.log(bad === 0 ? '试玩通过：无异常、无 undefined' : '试玩发现问题：' + bad);
process.exit(bad === 0 ? 0 : 1);
