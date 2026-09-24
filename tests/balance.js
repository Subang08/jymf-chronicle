/* 多种子存活率抽查：看是不是平衡回归 */
'use strict';
const { loadGame } = require('./lib');
const G = loadGame();
const { win, byId } = G;
const { GAME, ENG, CREATE, WD } = win;
function run(seed, turns) {
  GAME.startCreate(true);
  GAME.state.seed = seed; ENG.seed(seed);
  let g = 0;
  while (GAME.state.phase === 'create' && g++ < 40) {
    const n = CREATE.node(GAME.state);
    if (n.step === 'name') GAME.choose(n.opts[n.opts.length - 1].k, '抽查');
    else GAME.choose('a');
  }
  while (GAME.state.flags.scriptIdx < (GAME.state.flags.script || []).length) GAME.choose('a');
  const customs = ['我观察四周的脚印', '我打听这里的传闻', '我修炼剑术', '我去冒险者公会看委托',
    '我吃点东西', '我找份活干', '我包扎伤口', '我在酒馆喝一杯'];
  for (let i = 0; i < turns; i++) {
    const st = GAME.state;
    if (st.phase === 'dead') break;
    if (st.flags.dying) { GAME.choose('a'); continue; }
    const ratio = st.pc.hp.cur / st.pc.hp.max;
    const opts = GAME.opts || [];
    const has = a => opts.filter(o => o.act === a)[0];
    if (has('eat')) GAME.choose(has('eat').k);
    else if (ratio < 0.6 && has('rest')) GAME.choose(has('rest').k);
    else if (i % 5 === 4) GAME.choose('e', customs[(i / 5 | 0) % customs.length]);
    else if (st.quests.some(x => x.state === '进行中') && has('quest')) GAME.choose(has('quest').k);
    else if (!st.quests.length && has('guild')) GAME.choose(has('guild').k);
    else GAME.choose(['a', 'c', 'd'][i % 3]);
  }
  const s = GAME.state;
  return { dead: s.phase === 'dead', turns: s.turn, lv: s.pc.level, done: s.quests.filter(q => q.state === '完成').length };
}
let alive = 0, dead = 0, sumT = 0, sumLv = 0, sumQ = 0;
const seeds = [101, 202, 303, 404, 505, 606, 707, 808];
seeds.forEach(sd => {
  const r = run(sd, 60);
  if (r.dead) dead++; else alive++;
  sumT += r.turns; sumLv += r.lv; sumQ += r.done;
  console.log('种子 ' + sd + '：' + (r.dead ? '死亡' : '存活') + ' · ' + r.turns + ' 回合 · Lv' + r.lv + ' · 完成委托 ' + r.done);
});
console.log('存活 ' + alive + '/' + seeds.length + ' · 平均 ' + Math.round(sumT / seeds.length) + ' 回合 · 平均 Lv' + (sumLv / seeds.length).toFixed(1) + ' · 平均完成委托 ' + (sumQ / seeds.length).toFixed(1));
