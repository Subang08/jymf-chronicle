/* ============================================================
   地理情报 · 艾尔德兰
   依据设定集第二卷的大陆全图，给每个地区一个地图坐标，
   由此推导：所属国家 / 地理位置 / 附近国家 / 附近地区。
   坐标只用于方位与距离（0-100 的方格），不画地图。
   ============================================================ */
(function (global) {
  'use strict';

  var WD = global.WD || {}, LTX = global.LTX;
  var T = (LTX && LTX.THEMES) || {}, INK = (LTX && LTX.INK) || {}, BG = (LTX && LTX.BG) || {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/\\/g, '/').replace(/([{}%&#_$])/g, '\\$1');
  }

  /* 地表坐标：照第二卷地图的排布（北境冰原在北，黄铜沙漠在东南，维兰之海在西…） */
  var POS = {
    '北境冰原': [25, 6], '世界之喉': [29, 11],
    '龙骨山脉': [62, 8], '巨鹰崖': [70, 22],
    '银峰山脉': [18, 26], '星辉城': [88, 22],
    '白港城': [22, 18], '霜脊村': [31, 13],
    '哥特王国': [52, 34], '高塔城': [52, 34],
    '雄鹿王国': [58, 40], '铁王座堡': [58, 40],
    '维兰之海': [14, 48],
    '中部平原': [48, 48], '曙光城': [48, 50], '喷泉广场': [49, 50],
    '帝国旧道': [44, 44], '旧坟场': [53, 55], '安息烛墓园': [44, 57],
    '艾索洛伦森林': [82, 48], '幽影堡': [84, 43], '林语门': [74, 52], '倒影湖': [88, 53],
    '洛林公国': [72, 56], '玫瑰堡': [72, 56],
    '铁锤山脉': [20, 64],
    '迷雾沼泽': [30, 58], '白骨渡口': [40, 63],
    '灰雾平原': [36, 72],
    '黄铜沙漠': [82, 66], '龙烬遗迹': [78, 62], '黄金城': [89, 72], '烬墟镇': [76, 70],
    '边境领': [60, 80], '哨兵堡': [60, 80],
    '南境荒原': [40, 84],
    '南方联合王国': [66, 76], '烈日城': [66, 76],
    '格瑞纳达': [73, 85], '龙火城': [73, 85],
    '无尽之海': [60, 94],
    /* 不在主物质位面的六处：不按地表画，但各自要有自己的位置，
       否则在地图上会全部落在同一点、按钮叠成一堆 */
    '圣光之庭': [38, 10], '元素混沌': [50, 26], '时空裂隙': [64, 34],
    '永恒森林': [86, 40], '先祖大厅': [22, 74], '深渊之渊': [58, 90]
  };
  /* 地底与位面：不在方格图上，单列说明 */
  var SPECIAL = {
    '幽暗地域': { where: '主物质位面 · 地底', under: '大陆之下数千尺的洞窟世界' },
    '暗蛛城': { where: '主物质位面 · 地底', under: '幽暗地域深处，卓尔的主城' },
    '铁砧大厅': { where: '主物质位面 · 地底', under: '铁锤山脉之下，矮人地下要塞群' },
    '回音井': { where: '主物质位面 · 地底', under: '曙光城地下的古代下水道' },
    '元素混沌': { where: '元素位面交汇处', under: '四大元素位面彼此挤压的夹缝' },
    '时空裂隙': { where: '位面薄弱处', under: '可跨界穿梭的裂口' },
    '圣光之庭': { where: '上层位面', under: '善良神祇的居所' },
    '深渊之渊': { where: '下层位面', under: '恶魔的巢穴' },
    '永恒森林': { where: '中环位面', under: '精灵的永恒森林' },
    '先祖大厅': { where: '中环位面', under: '矮人的先祖大厅' }
  };
  /* 地下/位面地区用来算「附近」的锚（挂靠它所在的那座城） */
  var HANG = {
    '幽暗地域': [52, 34], '暗蛛城': [52, 34], '铁砧大厅': [20, 64], '回音井': [48, 50]
  };

  /* 国家锚点（用于国家之间的远近） */
  var NATION_ANCHOR = {
    '北境共和国': [24, 16], '晨曦王国': [48, 50], '雄鹿王国': [58, 40], '哥特王国': [52, 34],
    '南方联合王国': [66, 76], '洛林公国': [72, 56], '边境领': [60, 80],
    '群山王国': [20, 64], '银冠王庭': [88, 22], '绿林议会': [80, 48],
    '格瑞纳达': [73, 85], '幽暗地域': [52, 34], '荒原部落': [42, 84]
  };

  function regionOf(name) {
    var rs = WD.REGIONS || [];
    for (var i = 0; i < rs.length; i++) if (rs[i].name === name || rs[i].id === name) return rs[i];
    return null;
  }
  /* 数据里无主地区可能写作 nation:''、缺字段或 '无主'，统一成「无主之地」 */
  function nationKey(r) {
    var n = r && r.nation;
    if (!n || n === '无主' || n === '无') return '无主之地';
    return n;
  }
  function nationOf(name) {
    var ns = WD.NATIONS || [];
    for (var i = 0; i < ns.length; i++) if (ns[i].name === name) return ns[i];
    return null;
  }
  function posOf(region) {
    if (!region) return null;
    var p = POS[region.name] || HANG[region.name];
    if (p) return { x: p[0], y: p[1] };
    var na = NATION_ANCHOR[region.nation];
    if (na) return { x: na[0], y: na[1] };
    /* 实在没有坐标的：按名字散开，绝不重叠在同一点 */
    var h = 0;
    String(region.name).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 9973; });
    return { x: 26 + (h % 48), y: 22 + (Math.floor(h / 48) % 56) };
  }
  function dist(a, b) { return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)); }
  function dirOf(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var ns = dy > 7 ? '南' : (dy < -7 ? '北' : '');
    var ew = dx > 7 ? '东' : (dx < -7 ? '西' : '');
    return (ns + ew) || '同处一地';
  }
  function farWord(d) {
    if (d <= 12) return '紧邻';
    if (d <= 26) return '一日路程';
    if (d <= 45) return '数日路程';
    if (d <= 70) return '跨越大半大陆';
    return '远在另一头';
  }
  function band(y) {
    if (y <= 18) return '北境';
    if (y <= 34) return '中北部';
    if (y <= 52) return '中土';
    if (y <= 70) return '中南部';
    if (y <= 86) return '南陆';
    return '远南海域';
  }
  function planeOf(region) {
    if (!region) return null;
    if (SPECIAL[region.name]) return SPECIAL[region.name];
    return { where: '主物质位面 · 地表', under: '' };
  }

  /* ---------- 地区情报 ---------- */
  function regionInfo(nameOrRegion) {
    var r = typeof nameOrRegion === 'string' ? regionOf(nameOrRegion) : nameOrRegion;
    if (!r) return null;
    var pl = planeOf(r), my = posOf(r);
    var nation = nationOf(r.nation);
    var out = {
      region: r, nation: nation, nationName: r.nation || '无主之地',
      plane: pl.where, under: pl.under,
      terrain: r.terrain, kind: r.kind, threat: r.threat || [1, 1],
      desc: r.desc || '', landmarks: r.landmarks || [],
      position: '', neighbours: [], nations: []
    };
    if (SPECIAL[r.name]) {
      out.position = pl.where + '（' + pl.under + '）';
    } else {
      out.position = band(my.y) + ' · ' + (r.terrain || '—') + ' · 方格 ' +
        Math.round(my.x) + ':' + Math.round(my.y);
    }
    /* 主物质位面包含地表与地底：两者互为邻地；位面地区只跟同一位面互为邻地 */
    var mainPlane = pl.where.indexOf('主物质') >= 0;
    function planeClass(x) {
      var w = planeOf(x).where;
      return w.indexOf('主物质') >= 0 ? 'main' : w;
    }
    var myClass = mainPlane ? 'main' : pl.where;
    /* 附近地区（同层，取最近三处） */
    var list = [];
    (WD.REGIONS || []).forEach(function (o) {
      if (o.name === r.name) return;
      if (planeClass(o) !== myClass) return;
      var p = posOf(o), d = dist(my, p);
      list.push({ region: o, d: d, dir: dirOf(my, p) });
    });
    list.sort(function (a, b) { return a.d - b.d; });
    out.neighbours = list.slice(0, 4).map(function (x) {
      return { name: x.region.name, nation: x.region.nation || '无主之地', terrain: x.region.terrain, dir: x.dir, far: farWord(x.d), d: Math.round(x.d) };
    });
    if (!out.neighbours.length) {
      out.neighbourNote = mainPlane
        ? '四周没有已勘明的地方。'
        : ('不在主物质位面（' + pl.where + '），四周没有可以走过去的地方，只能借时空裂隙或高阶传送抵达。');
    }
    /* 附近国家（按国家锚点远近，排除本国） */
    var nl = [];
    Object.keys(NATION_ANCHOR).forEach(function (n) {
      if (n === r.nation) return;
      var p = { x: NATION_ANCHOR[n][0], y: NATION_ANCHOR[n][1] };
      nl.push({ name: n, d: dist(my, p), dir: dirOf(my, p) });
    });
    nl.sort(function (a, b) { return a.d - b.d; });
    out.nations = nl.slice(0, 3).map(function (x) {
      var nn = nationOf(x.name) || {};
      return { name: x.name, dir: x.dir, far: farWord(x.d), capital: nn.capital || '无固定', trait: nn.trait || '', kind: nn.kind || '' };
    });
    if (!mainPlane) {
      out.nations = [];
      out.nationNote = '此地不在主物质位面，没有接壤的王国；来路只有时空裂隙、位面法术或神明的许可。';
    }
    return out;
  }

  /* ---------- 面板 ---------- */
  function regionPanel(nameOrRegion, theme) {
    var i = regionInfo(nameOrRegion);
    if (!i) return LTX.mkPanel({ theme: 'blue', title: '地 区', lines: ['\\textcolor{' + INK.dim + '}{查无此地。}'] });
    var L = [];
    L.push('\\textcolor{' + (T.blue ? T.blue.ti : '#5E8FAE') + '}{\\textbf{\\Large ' + esc(i.region.name) + '}}');
    L.push('\\textcolor{' + (T.blue ? T.blue.bd : '#8FC1DE') + '}{\\overline{\\qquad\\qquad\\qquad\\qquad\\qquad}}');
    L.push('\\textcolor{' + INK.dim + '}{所在国家：}\\textcolor{' + INK.body + '}{' + esc(i.nationName) + '}' +
      (i.nation ? '\\quad \\textcolor{' + INK.dim + '}{首都：}\\textcolor{' + INK.body + '}{' + esc(i.nation.capital) + '}' : ''));
    if (i.nation) L.push('\\textcolor{' + INK.dim + '}{国情：}\\textcolor{' + INK.body + '}{' + esc(i.nation.trait || '') + '}');
    L.push('\\textcolor{' + INK.dim + '}{地理位置：}\\textcolor{' + INK.body + '}{' + esc(i.position) + '}' +
      (i.under && i.plane.indexOf('地表') < 0 ? '\\quad \\textcolor{' + INK.dim + '}{' + esc(i.under) + '}' : ''));
    L.push('\\textcolor{' + INK.dim + '}{地形：}\\textcolor{' + INK.body + '}{' + esc(i.terrain) + '}' +
      '\\quad \\textcolor{' + INK.dim + '}{威胁：}\\textcolor{#C05F55}{' + i.threat[0] + '-' + i.threat[1] + '}' +
      '\\quad \\textcolor{' + INK.dim + '}{类型：}\\textcolor{' + INK.body + '}{' + esc(kindCN(i.kind)) + '}');
    if (i.desc) L.push('\\textcolor{' + INK.body + '}{' + esc(i.desc) + '}');
    if (i.landmarks.length) L.push('\\textcolor{' + INK.dim + '}{地标：' + esc(i.landmarks.join('、')) + '}');
    if (i.nations.length) {
      L.push('\\textcolor{' + (T.gold ? T.gold.bd : '#E0B45A') + '}{\\overline{\\qquad\\qquad\\qquad\\qquad\\qquad}}');
      L.push('\\textcolor{' + (T.gold ? T.gold.ti : '#A87E2E') + '}{\\textbf{附近国家}}');
      i.nations.forEach(function (n) {
        L.push('\\textcolor{' + INK.body + '}{' + esc(n.name) + '}\\quad \\textcolor{' + INK.dim + '}{' +
          esc(n.dir) + ' · ' + esc(n.far) + ' · 首都 ' + esc(n.capital) + '}');
        if (n.trait) L.push('\\textcolor{' + INK.dim + '}{\\footnotesize ' + esc(n.trait) + '}');
      });
    } else if (i.nationNote) {
      L.push('\\textcolor{' + (T.gold ? T.gold.bd : '#E0B45A') + '}{\\overline{\\qquad\\qquad\\qquad\\qquad\\qquad}}');
      L.push('\\textcolor{' + (T.gold ? T.gold.ti : '#A87E2E') + '}{\\textbf{附近国家}}');
      L.push('\\textcolor{' + INK.dim + '}{' + esc(i.nationNote) + '}');
    }
    if (i.neighbours.length) {
      L.push('\\textcolor{' + (T.gold ? T.gold.bd : '#E0B45A') + '}{\\overline{\\qquad\\qquad\\qquad\\qquad\\qquad}}');
      L.push('\\textcolor{' + (T.gold ? T.gold.ti : '#A87E2E') + '}{\\textbf{附近地区}}');
      i.neighbours.forEach(function (n) {
        L.push('\\textcolor{' + INK.body + '}{' + esc(n.name) + '}\\quad \\textcolor{' + INK.dim + '}{' +
          esc(n.dir) + ' · ' + esc(n.far) + ' · ' + esc(n.terrain) + ' · ' + esc(n.nation) + '}');
      });
    } else if (i.neighbourNote) {
      L.push('\\textcolor{' + (T.gold ? T.gold.bd : '#E0B45A') + '}{\\overline{\\qquad\\qquad\\qquad\\qquad\\qquad}}');
      L.push('\\textcolor{' + (T.gold ? T.gold.ti : '#A87E2E') + '}{\\textbf{附近地区}}');
      L.push('\\textcolor{' + INK.dim + '}{' + esc(i.neighbourNote) + '}');
    }
    return LTX.mkPanel({ theme: theme || 'blue', title: '地 区 志', lines: L, scale: 0.78 });
  }
  function kindCN(k) {
    return ({ city: '城邦', town: '村镇', wild: '荒野', sea: '海域', under: '地底', ruin: '遗迹' })[k] || (k || '—');
  }

  function nationPanel(name) {
    /* 无主之地的分区：按分区出一张「疆域志」 */
    if (String(name).indexOf('/') >= 0) {
      var parts = String(name).split('/');
      var sub = parts[1];
      var rs = regionsOf(name);
      var L2 = [];
      L2.push('\\textcolor{' + (T.gold ? T.gold.ti : '#A87E2E') + '}{\\textbf{\\Large ' + esc(name) + '}}');
      L2.push('\\textcolor{' + (T.gold ? T.gold.bd : '#E0B45A') + '}{\\overline{\\qquad\\qquad\\qquad\\qquad\\qquad}}');
      L2.push('\\textcolor{' + INK.dim + '}{归属：}\\textcolor{' + INK.body + '}{无主之地（不在任何王国治下）}' +
        '\\quad \\textcolor{' + INK.dim + '}{境内：}\\textcolor{' + INK.body + '}{' + rs.length + ' 处}');
      L2.push('\\textcolor{' + INK.body + '}{' + esc(SUB_TRAIT[sub] || '') + '}');
      L2.push('\\textcolor{' + (T.gold ? T.gold.bd : '#E0B45A') + '}{\\overline{\\qquad\\qquad\\qquad\\qquad\\qquad}}');
      L2.push('\\textcolor{' + (T.gold ? T.gold.ti : '#A87E2E') + '}{\\textbf{本区可往之地（按层分）}}');
      layersOf(name).forEach(function (ly) {
        L2.push('\\textcolor{' + INK.body + '}{\\textbf{' + esc(ly.layer) + '}}\\quad \\textcolor{' + INK.dim +
          '}{\\footnotesize ' + esc(ly.regions.map(function (r) { return r.name; }).join('、')) + '}');
      });
      rs.forEach(function (r) {
        var i = regionInfo(r);
        L2.push('\\textcolor{' + INK.body + '}{' + esc(r.name) + '}\\quad \\textcolor{' + INK.dim + '}{' +
          esc(i.position) + ' · 威胁 ' + (r.threat || [1, 1]).join('-') + '}');
        L2.push('\\textcolor{' + INK.dim + '}{\\footnotesize 最近邻国 ' +
          esc(i.nations.length ? (i.nations[0].name + '（' + i.nations[0].dir + ' · ' + i.nations[0].far + '）') : '无接壤国家') +
          (i.neighbours.length ? ('　邻地 ' + esc(i.neighbours[0].name + '（' + i.neighbours[0].dir + '）')) : '') + '}');
      });
      return LTX.mkPanel({ theme: 'sand', title: '疆 域 志', lines: L2, scale: 0.78 });
    }
    var n = nationOf(name), a = NATION_ANCHOR[name] || [50, 50];
    var L = [];
    var own = (WD.REGIONS || []).filter(function (r) { return r.nation === name; });
    L.push('\\textcolor{' + (T.gold ? T.gold.ti : '#A87E2E') + '}{\\textbf{\\Large ' + esc(name) + '}}');
    L.push('\\textcolor{' + (T.gold ? T.gold.bd : '#E0B45A') + '}{\\overline{\\qquad\\qquad\\qquad\\qquad\\qquad}}');
    L.push('\\textcolor{' + INK.dim + '}{首都：}\\textcolor{' + INK.body + '}{' + esc((n && n.capital) || '无固定') + '}' +
      '\\quad \\textcolor{' + INK.dim + '}{政体：}\\textcolor{' + INK.body + '}{' + esc((n && n.gov) || '—') + '}');
    L.push('\\textcolor{' + INK.dim + '}{国情：}\\textcolor{' + INK.body + '}{' + esc((n && n.trait) || '') + '}');
    L.push('\\textcolor{' + INK.dim + '}{大致方位：}\\textcolor{' + INK.body + '}{' + band(a[1]) + '（方格 ' + a[0] + ':' + a[1] + '）}');
    var nl = [];
    Object.keys(NATION_ANCHOR).forEach(function (k) {
      if (k === name) return;
      var p = { x: NATION_ANCHOR[k][0], y: NATION_ANCHOR[k][1] };
      var my = { x: a[0], y: a[1] };
      nl.push({ name: k, d: dist(my, p), dir: dirOf(my, p) });
    });
    nl.sort(function (x, y) { return x.d - y.d; });
    L.push('\\textcolor{' + (T.gold ? T.gold.bd : '#E0B45A') + '}{\\overline{\\qquad\\qquad\\qquad\\qquad\\qquad}}');
    L.push('\\textcolor{' + (T.gold ? T.gold.ti : '#A87E2E') + '}{\\textbf{接壤与近邻}}');
    nl.slice(0, 4).forEach(function (x) {
      var nn = nationOf(x.name) || {};
      L.push('\\textcolor{' + INK.body + '}{' + esc(x.name) + '}\\quad \\textcolor{' + INK.dim + '}{' + esc(x.dir) + ' · ' + esc(farWord(x.d)) + '}' +
        '\\quad \\textcolor{' + INK.dim + '}{\\footnotesize ' + esc((nn.trait || '').slice(0, 26)) + '}');
    });
    if (own.length) {
      L.push('\\textcolor{' + (T.gold ? T.gold.bd : '#E0B45A') + '}{\\overline{\\qquad\\qquad\\qquad\\qquad\\qquad}}');
      L.push('\\textcolor{' + (T.gold ? T.gold.ti : '#A87E2E') + '}{\\textbf{境内可往之地（按层分）}}');
      layersOf(name).forEach(function (ly) {
        L.push('\\textcolor{' + INK.body + '}{\\textbf{' + esc(ly.layer) + '}}' +
          '\\quad \\textcolor{' + INK.dim + '}{\\footnotesize ' + esc(ly.regions.map(function (r) { return r.name; }).join('、')) + '}');
        L.push('\\textcolor{' + INK.dim + '}{\\footnotesize ' + esc(ly.desc) + '}');
      });
    }
    return LTX.mkPanel({ theme: 'gold', title: '国 度 志', lines: L, scale: 0.78 });
  }

  /* ---------- 国家内部分层 ----------
     一个国家境内往往同时有都城、村镇、野外、地下、遗迹、海域几种地方，
     按性质分层：看地区时先看层，再看具体地方。 */
  var LAYER_ORDER = ['都城', '村镇', '野外', '地下', '遗迹', '海域', '位面'];
  var LAYER_DESC = {
    '都城': '国王、宫廷与公会总部所在。律法最密，耳目也最多。',
    '村镇': '都城之外的定居点，靠田、猎、矿或过路商队吃饭。',
    '野外': '国境之内没有常驻官府的地方，出了事只能自己扛。',
    '地下': '主物质位面的地下空间：矿道、暗河与不见天日的城。',
    '遗迹': '旧帝国与更早的东西留下的残骸，值钱的和要命的都在里面。',
    '海域': '领海与远洋，风浪与海盗都不认王法。',
    '位面': '不在主物质位面的去处，凡人得借裂隙或法术才到得了。'
  };
  function layerOf(r) {
    var sp = SPECIAL[r.name];
    /* 主物质位面的地下（矿道、下水道）算「地下」，其余（元素/上层/下层/中环/裂隙）才算「位面」 */
    if (sp) return sp.where.indexOf('主物质') >= 0 ? '地下' : '位面';
    if (r.kind === 'city') return '都城';
    if (r.kind === 'town') return '村镇';
    if (r.kind === 'sea') return '海域';
    if (r.kind === 'ruin') return '遗迹';
    if (r.kind === 'under') return '地下';
    return '野外';
  }
  /* 某个分组（国名 / 无主之地 · 分区）按层拆开 */
  function layersOf(key) {
    var rs = regionsOf(key);
    var out = [];
    LAYER_ORDER.forEach(function (L) {
      var hit = rs.filter(function (r) { return layerOf(r) === L; });
      if (hit.length) out.push({ layer: L, desc: LAYER_DESC[L] || '', regions: hit });
    });
    return out;
  }
  /* 国境内地方够多、层数也够多时，才值得多走一步「选层」 */
  function needLayerStep(key) {
    if (String(key).indexOf('/') >= 0) return false;
    return layersOf(key).length >= 2 && regionsOf(key).length >= 4;
  }

  /* ---------- 无主之地分区 ----------
     无主之地有十八处，一次列完太长，按性质拆成子组：
     荒野 / 海域 / 遗迹 / 地底 / 位面。分组只看数据里的 kind 与位面归属。 */
  var SUB_ORDER = ['荒野', '海域', '遗迹', '地底', '位面'];
  var SUB_TRAIT = {
    '荒野': '不属于任何王国的山脉、沙漠、荒原、沼泽与古道。没有律法，也没有保护；想活下去只能靠自己带够东西。',
    '海域': '维兰之海与无尽之海。船是唯一的依仗，风暴与深海里的东西都不讲道理。',
    '遗迹': '露出沙面的古代废墟与传说中的黄金之城。财宝与死法一样多，进去的人多半只带回一件东西。',
    '地底': '不在任何王国编制里的地下空间，靠矿脉与暗河连着。',
    '位面': '元素交汇处、位面薄弱处、上层与下层位面、中环位面。凡人走不进去，进去了也未必回得来。'
  };
  function subgroupOf(r) {
    var sp = SPECIAL[r.name];
    if (sp) return sp.where.indexOf('主物质') >= 0 ? '地底' : '位面';
    if (r.kind === 'sea') return '海域';
    if (r.kind === 'ruin') return '遗迹';
    if (r.kind === 'under') return '地底';
    return '荒野';
  }
  function wildGroups() {
    var wl = (WD.REGIONS || []).filter(function (r) { return nationKey(r) === '无主之地'; });
    var out = [];
    SUB_ORDER.forEach(function (s) {
      var rs = wl.filter(function (r) { return subgroupOf(r) === s; });
      if (!rs.length) return;
      var ys = rs.map(function (r) { return posOf(r).y; });
      var avgY = ys.reduce(function (a, b) { return a + b; }, 0) / ys.length;
      out.push({
        nation: '无主之地 · ' + s, key: '无主之地/' + s, parent: '无主之地', sub: s,
        capital: '无', gov: '无', kind: 'none', band: band(avgY),
        trait: SUB_TRAIT[s] || '', regions: rs
      });
    });
    return out;
  }
  /* 建卡与弹层用的完整分组：13 国 + 无主之地的各分区 */
  function regionGroups() {
    var out = nationGroups().filter(function (g) { return g.nation !== '无主之地'; }).map(function (g) {
      var a = NATION_ANCHOR[g.nation] || [50, 50];
      g.key = g.nation; g.parent = null; g.sub = null; g.band = band(a[1]);
      return g;
    });
    return out.concat(wildGroups());
  }

  /* ---------- 邻近可往之地：只能一站一站走 ----------
     同一层（主物质位面的地表与地底算一层，各外层位面各自一层）里按距离取近处；
     位面里没有地表邻居时，时空裂隙是唯一的出入口。 */
  function adjacentTo(nameOrRegion, limit) {
    var r = typeof nameOrRegion === 'string' ? regionOf(nameOrRegion) : nameOrRegion;
    if (!r) return [];
    limit = limit || 8;
    var my = posOf(r), pl = planeOf(r);
    var mainPlane = pl.where.indexOf('主物质') >= 0;
    function pc(x) { var w = planeOf(x).where; return w.indexOf('主物质') >= 0 ? 'main' : w; }
    var myClass = mainPlane ? 'main' : pl.where;
    var list = [];
    (WD.REGIONS || []).forEach(function (o) {
      if (o.name === r.name) return;
      if (pc(o) !== myClass) return;
      var p = posOf(o), d = dist(my, p);
      list.push({ region: o, d: d, dir: dirOf(my, p), far: farWord(d) });
    });
    list.sort(function (a, b) { return a.d - b.d; });
    var near = list.filter(function (x) { return x.d <= 26; });
    if (near.length < 2) near = list.slice(0, Math.min(3, list.length));
    if (!near.length && !mainPlane) {
      if (r.name === '时空裂隙') {
        /* 裂隙本身就是跨界穿梭的口子：既能去各个位面，也能回主物质位面 */
        var off = [];
        (WD.REGIONS || []).forEach(function (o) {
          if (o.name === r.name) return;
          if (pc(o) === 'main') return;
          off.push({ region: o, d: dist(my, posOf(o)), dir: '跨界', far: '借裂隙' });
        });
        var back = [];
        (WD.REGIONS || []).forEach(function (o) {
          if (pc(o) !== 'main') return;
          back.push({ region: o, d: dist(my, posOf(o)), dir: dirOf(my, posOf(o)), far: farWord(dist(my, posOf(o))) });
        });
        back.sort(function (a, b) { return a.d - b.d; });
        near = off.concat(back.slice(0, 2));
      } else {
        var rift = regionOf('时空裂隙');
        if (rift) near = [{ region: rift, d: 0, dir: '裂隙', far: '借道' }];
      }
    }
    return near.slice(0, limit).map(function (x) {
      return { region: x.region, name: x.region.name, d: Math.round(x.d), dir: x.dir, far: x.far,
        sameNation: nationKey(x.region) === nationKey(r) };
    });
  }
  function isAdjacent(a, b) {
    var want = (typeof b === 'string') ? b : (b && b.name);
    return adjacentTo(a).some(function (x) { return x.name === want; });
  }
  /* ---------- 长途路线：一站一站串起来（广度优先，取最少站数） ----------
     opts.avoidDanger 会绕开威胁偏高（>4.5）的地区，用来算「稳一点」的那条路。 */
  function route(from, to, opts) {
    from = (typeof from === 'string') ? from : (from && from.name);
    to = (typeof to === 'string') ? to : (to && to.name);
    if (!from || !to || from === to) return [from];
    opts = opts || {};
    var maxHops = opts.maxHops || 16;
    var risky = function (name) {
      if (!opts.avoidDanger) return false;
      if (name === to || name === from) return false;
      var r = regionOf(name);
      if (!r) return true;
      var t = ((r.threat && r.threat[0]) || 1) + ((r.threat && r.threat[1]) || 1);
      return (t / 2) > 4.5;
    };
    var graph = {};
    (WD.REGIONS || []).forEach(function (r) {
      graph[r.name] = adjacentTo(r.name).map(function (x) { return x.name; }).filter(function (n) { return !risky(n); });
    });
    var queue = [[from]], seen = {};
    seen[from] = 1;
    while (queue.length) {
      var path = queue.shift();
      var last = path[path.length - 1];
      if (path.length > maxHops) continue;
      var next = graph[last] || [];
      for (var i = 0; i < next.length; i++) {
        var n = next[i];
        if (seen[n]) continue;
        var np = path.concat([n]);
        if (n === to) return np;
        seen[n] = 1;
        queue.push(np);
      }
    }
    return null;
  }
  /* 两站之间大概要走几天：按坐标距离估 */
  function hopDays(a, b) {
    var ra = regionOf(a), rb = regionOf(b);
    if (!ra || !rb) return 2;
    var d = dist(posOf(ra), posOf(rb));
    return Math.max(1, Math.round(d / 9));
  }

  function nationGroups() {
    var groups = [];
    (WD.NATIONS || []).forEach(function (n) {
      var own = (WD.REGIONS || []).filter(function (r) { return nationKey(r) === n.name; });
      groups.push({ nation: n.name, capital: n.capital, kind: n.kind, trait: n.trait, gov: n.gov, regions: own });
    });
    groups.push({
      nation: '无主之地', capital: '无', kind: 'none',
      trait: '不在任何王国治下的荒野、海域、遗迹与位面裂口，谁都可以进，谁都不管。',
      gov: '无', regions: (WD.REGIONS || []).filter(function (r) { return nationKey(r) === '无主之地'; })
    });
    return groups;
  }
  function regionsOf(nation) {
    var want = (!nation || nation === '无主') ? '无主之地' : nation;
    if (String(want).indexOf('/') >= 0) {
      var parts = String(want).split('/');
      return (WD.REGIONS || []).filter(function (r) { return nationKey(r) === parts[0] && subgroupOf(r) === parts[1]; });
    }
    return (WD.REGIONS || []).filter(function (r) { return nationKey(r) === want; });
  }

  global.GEO = {
    POS: POS, SPECIAL: SPECIAL, NATION_ANCHOR: NATION_ANCHOR,
    SUB_ORDER: SUB_ORDER, SUB_TRAIT: SUB_TRAIT,
    LAYER_ORDER: LAYER_ORDER, LAYER_DESC: LAYER_DESC,
    regionOf: regionOf, nationOf: nationOf, posOf: posOf, planeOf: planeOf, nationKey: nationKey,
    dist: dist, dirOf: dirOf, farWord: farWord, band: band, kindCN: kindCN,
    regionInfo: regionInfo, regionPanel: regionPanel, nationPanel: nationPanel,
    nationGroups: nationGroups, regionGroups: regionGroups, wildGroups: wildGroups,
    subgroupOf: subgroupOf, layerOf: layerOf, layersOf: layersOf, needLayerStep: needLayerStep,
    adjacentTo: adjacentTo, isAdjacent: isAdjacent, route: route, hopDays: hopDays,
    regionsOf: regionsOf
  };
})(window);
