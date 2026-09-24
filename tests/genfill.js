/* 生成器填空检查：随便什么名字，都要有介绍文字 */
const { loadGame } = require('./lib');
const { win } = loadGame();
const I = win.IMPROV;
const names = ['猫人', '火绒盒', '一副灌铅骰子', '祖传长弓', '影裔', 'ZZZ', '王二狗', '铁锅',
  '半身人', '霜巨人', '占星师', '掏粪工', '卖唱的', '亡灵', '破靴子', '三枚铜板', '不知名的骨片',
  '吟游诗人', '影舞者', '黑帆船主', '雾港自治领', '星坠之地', '因果', '无声之誓', '血月'];
const gens = ['race', 'cls', 'identity', 'background', 'align', 'item', 'nation', 'talent'];
let bad = 0, n = 0;
gens.forEach(g => {
  const fn = I[g]; if (!fn) { console.log('缺少生成器', g); bad++; return; }
  names.forEach(nm => {
    let o; try { o = fn(nm); } catch (e) { console.log('抛错', g, nm, e.message); bad++; return; }
    n++;
    const txt = [o.desc, o.blurb && o.blurb.join(' '), o.traits, o.note, o.duty].filter(Boolean).join(' ');
    if (!txt || /undefined|\[object/.test(txt)) { console.log('空介绍', g, nm, JSON.stringify(o).slice(0, 120)); bad++; }
  });
});
/* 每个生成物必须带有可用的数值字段 */
const r = I.race('猫人');
if (!r.bonus || typeof r.bonus !== 'object') { console.log('种族缺加成'); bad++; }
const c = I.cls('剑舞者');
['hpDie', 'kits', 'skills'].forEach(f => { if (!c[f]) { console.log('职业缺', f); bad++; } });
const it = I.item('火绒盒');
['kind', 'price', 'weight', 'desc'].forEach(f => { if (it[f] === undefined || it[f] === '') { console.log('物品缺', f); bad++; } });
const t = I.talent('无声之誓');
if (!t.effect || !t.grade) { console.log('天赋缺 effect/grade'); bad++; }
console.log('检查 ' + n + ' 个生成物，问题 ' + bad + ' 处');
