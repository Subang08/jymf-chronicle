/* 扫描：所有面板与建卡每一步的预览，渲染之后都不该残留 LaTeX 命令原文 */
const { loadGame } = require('./lib');
const { win, byId } = loadGame();
const { GAME, CREATE, LTX, PANEL, ENG, WD } = win;
win.__bootGame();

const LEAK = /textcolor|footnotesize|footnotesize|textbf|textit|Large|small\b|quad|qquad|overline|scalebox|fcolorbox|begin\{array\}|end\{array\}|textbackslash|effectText/;
let bad = 0, checked = 0;
function scan(label, rendered) {
  checked++;
  const text = String(rendered).replace(/<[^>]+>/g, ' ');
  const m = text.match(LEAK);
  if (m) { bad++; console.log('泄漏 [' + label + '] → ' + m[0] + '　片段：' + text.replace(/\s+/g, ' ').slice(0, 160)); }
}

/* 1. 建卡每一步：预览与选项 */
GAME.startCreate(true);
const picks = { race: '猫人', class: '剑舞者', identity: '流浪乐师', background: '赌徒', talent: '命运之线',
  gender: '女', name: '阿黛尔', attrs: '力12 敏15 体13 智12 感10 魅14', align: '混乱善良',
  nation: '无主之地 · 荒野', region: '龙骨山脉', opening: '龙骨山脉' };
let g = 0;
while (GAME.state.phase === 'create' && g++ < 40) {
  const n = CREATE.node(GAME.state);
  scan('建卡·' + n.step + '·预览', LTX.renderMixed(CREATE.preview(GAME.state)));
  scan('建卡·' + n.step + '·选项', LTX.renderMixed(PANEL.options(n.opts)));
  GAME.renderSide();
  scan('建卡·' + n.step + '·侧栏', byId.sideBody.innerHTML || '');
  const v = picks[n.step];
  if (v == null) GAME.choose('a');
  else GAME.choose(n.opts[n.opts.length - 1].k, v);
}

/* 2. 自创角色的世界内文本与各面板 */
const s = GAME.state;
console.log('进入世界：' + s.phase + ' · ' + s.pc.name + ' ' + s.pc.raceName + ' ' + s.pc.clsName + ' · 熟练 ' + (s.pc.skills || []).join('、'));
ENG.item.add(s, '祖传长弓');
s.terrain = s.terrain || '山脉';
['status', 'card', 'bag', 'task', 'levelup', 'death', 'time', 'talents', 'shop'].forEach(fn => {
  let out = null;
  try {
    if (fn === 'levelup') out = PANEL.levelup(s, { level: 2, name: '初级', gain: 8, cls: s.pc.clsName });
    else if (fn === 'death') out = PANEL.death(s, { cause: '测试' });
    else if (fn === 'talents') out = PANEL.talents(s, [((s.pc.talents || [])[0] || { name: '命运之线', grade: 'SSS', desc: '重掷一次' })]);
    else if (fn === 'shop') out = PANEL.shop(s, ENG.item.stock(s, 'gear'));
    else out = PANEL[fn](s);
  } catch (e) { console.log('面板 ' + fn + ' 抛错：' + e.message); bad++; return; }
  scan('面板·' + fn, LTX.renderMixed(out));
});
/* 战斗与出行面板 */
s.combat = { round: 1, ctx: { name: '测试' }, foes: [{ name: '灰林狼', hp: 5, hpMax: 11, ac: 13, atk: 3, trait: '成群' }] };
scan('面板·combat', LTX.renderMixed(PANEL.combat(s)));
s.combat = null;
const destFar = (WD.REGIONS || []).map(x => x.name).filter(n => n !== s.place && !win.GEO.isAdjacent(s.place, n))[0];
const bundle = destFar ? ENG.travel.tiers(s, destFar, 'long') : null;
if (bundle) {
  scan('面板·tripTiers', LTX.renderMixed(PANEL.tripTiers(s, bundle, null)));
  scan('面板·trip', LTX.renderMixed(PANEL.trip(s, bundle.plan, null)));
  const alt = ENG.travel.tiers(s, destFar, 'safe');
  if (alt) scan('面板·tripTiers·绕路', LTX.renderMixed(PANEL.tripTiers(s, bundle, alt)));
} else console.log('（通往 ' + destFar + ' 没有长途方案，跳过 trip 面板）');
scan('面板·codex', LTX.renderMixed(PANEL.codex('world', s)));
scan('面板·opening', LTX.renderMixed(PANEL.opening([{ name: '北境冰原', place: '霜落城', note: '冷' }])));

/* 3. 走几回合，扫每回合追加到文字区的内容 */
let turns = 0;
for (let i = 0; i < 6 && s.phase === 'playing'; i++) {
  const opts = GAME.opts || [];
  const k = opts.length ? opts[Math.floor(i % Math.min(3, opts.length))].k : 'a';
  try { GAME.choose(k); } catch (e) { console.log('第 ' + (i + 1) + ' 回合抛错：' + e.message); bad++; break; }
  turns++;
  scan('回合' + (i + 1) + '·侧栏', byId.sideBody.innerHTML || '');
}
console.log('扫过 ' + checked + ' 处渲染（含 ' + turns + ' 个回合），泄漏 ' + bad + ' 处');
