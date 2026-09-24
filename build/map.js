/* ============================================================
   多层地图 · 艾尔德兰
   第一层：大陆总图（按设定集第二卷的排布，浅文字标注）
   第二层：国度／疆域图（国内按层画，点位沿用真实坐标）
   第三层：地区图（该地区的各处地标）
   第四层：地标内部（设定集里写到的更深一层，如回音井的七层螺旋梯）
   可展开的节点都带「展开」按钮；同一套画法逐层复用。
   ============================================================ */
(function (global) {
  'use strict';

  var WD = global.WD || {}, GEO = global.GEO, LTX = global.LTX;
  var esc = LTX.esc;

  /* 地形配色（莫兰迪浅色系，画在深色底上） */
  var TERRAIN = {
    '冰原': '#CFD8E3', '山脉': '#9E9078', '丘陵': '#B7A98F', '平原': '#9FCFB4',
    '森林': '#7FB08A', '沙漠': '#E6C95A', '荒原': '#CFC4B0', '沼泽': '#8FA88C',
    '海域': '#6E93B8', '地下': '#8E8578', '废墟': '#C78FBE'
  };
  var LAYER_COLOR = {
    '都城': '#E0B45A', '村镇': '#9FCFB4', '野外': '#8FA8CC', '地下': '#8E8578',
    '遗迹': '#C78FBE', '海域': '#6E93B8', '位面': '#BFA3DE'
  };
  var FILL = '#12171e', SEA = '#0e141b', LINE = '#2b3441', FAINT = '#7a8492', SOFT = '#9AA6B4';

  /* ---------- 第四层：设定集里写到的更深一层 ---------- */
  var SUB = {
    '回音井': [
      { name: '七层螺旋梯', note: '生锈的铁梯绕着井壁往下，第七层以下没有名字。',
        children: [{ name: '井底的回声', note: '对着井口说出的愿望，三日后必以某种形式实现——代价不明。' }] },
      { name: '刻满名字的井壁', note: '名字深浅不一，最早的一批已经磨平。' }
    ],
    '曙光城': [
      { name: '金色圆盘大教堂', note: '圣光教会总部，永恒之剑藏在这里。',
        children: [{ name: '圣髑龛', note: '艾奥瑞斯·逐日者的剑就锁在龛后，钥匙在大主教手里。' }] },
      { name: '贵族区铁栅门', note: '栅门以内是另一套律法。' },
      { name: '旧城墙与护城河', note: '墙根有几处通往下水道的口子。' }
    ],
    '高塔城': [
      { name: '法师公会尖塔', note: '枢密院七位大法师在此议事。',
        children: [
          { name: '第七层不存在的走廊', note: '走进去的人会出现在三天后的任何地方。' },
          { name: '封存室', note: '819 年那位研究时间魔法的大法师，笔记就锁在这里。' }
        ] },
      { name: '选帝侯广场', note: '七位大选帝侯推举国王的地方。' }
    ],
    '龙骨山脉': [
      { name: '第七号废弃矿道', note: '矿工撤走时没带走工具。',
        children: [{ name: '塌方段', note: '石缝里有风声，也有一截被钉住的骨头。' }] },
      { name: '肋骨隘口', note: '两排巨骨横在路两侧，像门框。' },
      { name: '龙晶矿脉', note: '未被开采的那条，据说是真的。' }
    ],
    '龙烬遗迹': [
      { name: '三重锁门', note: '羊皮纸上画的就是这扇门，锁是三层的。',
        children: [{ name: '门后密室', note: '里面的东西可能改变大陆格局，也可能什么也没有。' }] },
      { name: '皇家考古队营地', note: '格瑞纳达的兵守着，不让人靠近。' }
    ],
    '铁砧大厅': [
      { name: '深井升降机', note: '一趟下去要半刻钟。',
        children: [{ name: '熔渣河底', note: '矮人把废渣倒进地火里，河是红的。' }] },
      { name: '秘银兄弟会工坊街', note: '附魔与锻造的活只在这里接。',
        children: [{ name: '闭门工坊', note: '不接外活的那几间，门口有守卫。' }] },
      { name: '山丘之王熔炉', note: '大地之锤就挂在炉边。' }
    ],
    '白港城': [
      { name: '冻港栈桥', note: '冬天要凿冰才能靠船。' },
      { name: '十二家族会馆', note: '共和国的决定在这十二间屋子里做。',
        children: [{ name: '会馆密议厅', note: '飞空舰队的预算从这里批出去。' }] }
    ],
    '林语门': [
      { name: '活树哨门', note: '哨塔是活的，会自己合拢。',
        children: [{ name: '哨塔顶', note: '传说有只不死的夜莺栖在这里，它的歌让人看见自己最深的恐惧。' }] },
      { name: '人类伐木营地', note: '斧子就架在界石边上。' }
    ],
    '霜脊村': [
      { name: '通往冰川的旧猎道', note: '三道趾印往那个方向去。',
        children: [{ name: '冰川裂缝', note: '三百尺深，底下另有暗河，通向「世界之喉」。' }] },
      { name: '村中火塘', note: '夜里没人敢让它灭。' }
    ],
    '暗蛛城': [
      { name: '蛛后神殿', note: '母系与教派在这里合一。' },
      { name: '奴隶市场', note: '地底通用语的招牌挂在铁笼上。' },
      { name: '毒药巷', note: '买得到解药，也买得到没有解药的东西。' }
    ],
    '星辉城': [
      { name: '古代知识书库', note: '帝国古语与创世符文的抄本在这里。',
        children: [{ name: '锁卷室', note: '永恒女王三百年未露面这件事，卷宗里写得很清楚。' }] },
      { name: '星象露天台', note: '星母之泪每十七年一次，命运先知会在这里发布预言。' }
    ],
    '灰雾平原': [
      { name: '安息烛台', note: '亡者之夜必须点起来的那一支。' },
      { name: '雾中石阵', note: '石头的排法不是给活人看的。',
        children: [{ name: '阵心', note: '站进去能听见别人的名字被念出来。' }] }
    ],
    '黄铜沙漠': [
      { name: '风蚀石柱群', note: '柱子上有创世符文，现存可辨识的只有十二枚。' },
      { name: '沙下的城墙残段', note: '沙暴过后才会露出来。' }
    ],
    '黄金城': [
      { name: '位面裂隙口', note: '财富有诅咒，进来的人多半变成干涸喷泉边的一具骸骨。' },
      { name: '金砖街', note: '砖是真的，搬不动。' }
    ]
  };

  /* ---------- 建树 ---------- */
  /* 地区的地标＝设定集里给的三处 + 手写补充的地点（按名字去重，手写的在前、
     带注记与更深一层） */
  function landmarksOf(regionName) {
    var r = GEO.regionOf(regionName);
    var base = ((r && r.landmarks) || []).map(function (n) { return { name: n, note: '' }; });
    var subs = SUB[regionName] || [];
    var out = subs.slice();
    var have = {};
    out.forEach(function (s) { have[s.name] = 1; });
    base.forEach(function (b) { if (!have[b.name]) out.push(b); });
    return out;
  }
  function hasSub(name) { return !!(SUB[name] && SUB[name].length); }

  function regionNode(r) {
    var i = GEO.regionInfo(r) || {};
    return {
      id: 'r:' + r.name, name: r.name, kind: 'region', region: r,
      layer: GEO.layerOf(r), terrain: r.terrain, threat: r.threat,
      nation: i.nationName || '无主之地', position: i.position || '',
      children: landmarksOf(r.name).map(function (s) {
        return {
          id: 's:' + r.name + '/' + s.name, name: s.name, kind: 'spot', note: s.note || '',
          children: (s.children || []).map(function (t) {
            return { id: 's:' + r.name + '/' + s.name + '/' + t.name, name: t.name, kind: 'spot', note: t.note || '', children: [] };
          })
        };
      })
    };
  }
  function groupNode(g) {
    return {
      id: 'g:' + (g.key || g.nation), name: g.nation, kind: g.sub ? 'wild' : 'nation',
      sub: g.sub || null, capital: g.capital, trait: g.trait, band: g.band,
      regions: g.regions.map(regionNode), children: g.regions.map(regionNode)
    };
  }
  function tree() {
    return {
      id: 'world', name: '艾尔德兰大陆', kind: 'world',
      children: GEO.regionGroups().map(groupNode)
    };
  }
  function find(id, node) {
    node = node || tree();
    if (node.id === id) return node;
    for (var i = 0; i < (node.children || []).length; i++) {
      var hit = find(id, node.children[i]);
      if (hit) return hit;
    }
    return null;
  }
  function pathOf(id) {
    var out = [];
    (function walk(node, acc) {
      var chain = acc.concat([node]);
      if (node.id === id) { out = chain; return true; }
      for (var i = 0; i < (node.children || []).length; i++) if (walk(node.children[i], chain)) return true;
      return false;
    })(tree(), []);
    return out;
  }
  function parentOf(id) {
    var p = pathOf(id);
    return p.length >= 2 ? p[p.length - 2] : null;
  }

  /* ---------- 画图工具 ---------- */
  function pol(pts) { return pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }
  /* 凸包（给国家画疆域轮廓用） */
  function hull(points) {
    if (points.length < 3) return points.slice();
    var pts = points.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lower = [], upper = [], i;
    for (i = 0; i < pts.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop();
      lower.push(pts[i]);
    }
    for (i = pts.length - 1; i >= 0; i--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop();
      upper.push(pts[i]);
    }
    lower.pop(); upper.pop();
    return lower.concat(upper);
  }
  function padHull(pts, pad) {
    if (!pts.length) return pts;
    var cx = 0, cy = 0;
    pts.forEach(function (p) { cx += p[0]; cy += p[1]; });
    cx /= pts.length; cy /= pts.length;
    return pts.map(function (p) {
      var dx = p[0] - cx, dy = p[1] - cy, d = Math.sqrt(dx * dx + dy * dy) || 1;
      return [p[0] + dx / d * pad, p[1] + dy / d * pad];
    });
  }
  function label(x, y, text, size, color, anchor, weight) {
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + (size || 11) +
      '" fill="' + (color || FAINT) + '" text-anchor="' + (anchor || 'middle') + '"' +
      (weight ? ' font-weight="' + weight + '"' : '') +
      ' style="letter-spacing:.06em;paint-order:stroke;stroke:#0d1116;stroke-width:2.5px;stroke-opacity:.65">' +
      esc(text) + '</text>';
  }
  function marker(x, y, color) {
    return '<rect x="' + (x - 4).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" width="8" height="8" ' +
      'transform="rotate(45 ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')" fill="' + color + '" fill-opacity=".85" stroke="#0d1116" stroke-width="1"/>';
  }
  /* 可展开按钮 */
  function drillBtn(x, y, id, text, color) {
    var w = 12 + String(text).length * 11;
    return '<g class="map-drill" data-map-node="' + esc(id) + '" style="cursor:pointer">' +
      '<rect x="' + (x - w / 2).toFixed(1) + '" y="' + (y - 10).toFixed(1) + '" width="' + w + '" height="20" rx="3" ' +
      'fill="#171d25" stroke="' + (color || '#8FA8CC') + '" stroke-width="1"/>' +
      '<text x="' + x.toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" font-size="11" text-anchor="middle" fill="' +
      (color || '#8FA8CC') + '" style="letter-spacing:.08em">' + esc(text) + '</text></g>';
  }

  /* 当前所在地的小图标：金圈 + 呼吸动效，显眼但不抢画面 */
  function hereMark(x, y, label) {
    return '<g class="map-here">' +
      '<circle class="ring" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="17" fill="none" stroke="#E0B45A" stroke-width="2"/>' +
      '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4.5" fill="#E0B45A" stroke="#0d1116" stroke-width="1.2"/>' +
      '<text x="' + x.toFixed(1) + '" y="' + (y + 34).toFixed(1) + '" font-size="11" fill="#E0B45A" text-anchor="middle" ' +
      'style="letter-spacing:.08em;paint-order:stroke;stroke:#0d1116;stroke-width:2.5px;stroke-opacity:.7">' +
      esc(label || '你在这里') + '</text></g>';
  }

  /* ---------- 第一层：大陆总图 ---------- */
  function worldSVG(here) {
    var W = 1000, H = 620;
    var s = [];
    s.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + SEA + '"/>');
    /* 细网格：像学习用地图的经纬格 */
    for (var gx = 0; gx <= 10; gx++) s.push('<line x1="' + (gx * 100) + '" y1="0" x2="' + (gx * 100) + '" y2="' + H + '" stroke="#1c242e" stroke-width="1"/>');
    for (var gy = 0; gy <= 6; gy++) s.push('<line x1="0" y1="' + (gy * 100) + '" x2="' + W + '" y2="' + (gy * 100) + '" stroke="#1c242e" stroke-width="1"/>');
    /* 大陆轮廓 */
    var cont = [[120, 78], [268, 44], [430, 74], [530, 34], [706, 62], [872, 128], [912, 236], [866, 322], [896, 430], [820, 524], [700, 566], [560, 542], [432, 566], [300, 520], [178, 468], [118, 356], [88, 232]];
    s.push('<polygon points="' + pol(cont.map(function (p) { return [p[0], p[1] * 0.98]; })) + '" fill="' + FILL + '" stroke="' + LINE + '" stroke-width="1.5"/>');
    /* 海域：维兰之海（西）与无尽之海（南） */
    s.push('<path d="M 96 300 C 140 330 150 400 128 470 C 100 430 84 360 96 300 Z" fill="' + TERRAIN['海域'] + '" fill-opacity=".18" stroke="' + TERRAIN['海域'] + '" stroke-opacity=".45"/>');
    s.push('<path d="M 300 540 C 430 520 560 520 690 548 C 560 600 420 606 300 540 Z" fill="' + TERRAIN['海域'] + '" fill-opacity=".2" stroke="' + TERRAIN['海域'] + '" stroke-opacity=".45"/>');
    s.push(label(112, 372, '维兰之海', 10, '#8FB4D8', 'middle'));
    s.push(label(500, 580, '无尽之海', 10, '#8FB4D8', 'middle'));
    /* 地表地区的地形晕染 + 点位 */
    var groups = GEO.regionGroups();
    (WD.REGIONS || []).forEach(function (r) {
      var pl = GEO.planeOf(r);
      if (pl.where.indexOf('主物质') < 0) return;
      var p = GEO.posOf(r), x = p.x * 10, y = p.y * 6.2;
      var col = TERRAIN[r.terrain] || SOFT;
      var rr = r.kind === 'city' ? 26 : (r.kind === 'town' ? 20 : 34);
      s.push('<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="' + rr + '" ry="' + (rr * 0.66).toFixed(1) +
        '" fill="' + col + '" fill-opacity=".14" stroke="' + col + '" stroke-opacity=".3"/>');
    });
    var btnSpecs = [];
    groups.forEach(function (g) {
      /* 地底与位面的地区不画在地表轮廓上 */
      var pts = g.regions.filter(function (r) { return GEO.planeOf(r).where.indexOf('主物质') >= 0; })
        .map(function (r) { var p = GEO.posOf(r); return [p.x * 10, p.y * 6.2]; });      if (!pts.length) return;
      var col = g.sub ? (LAYER_COLOR[g.sub === '海域' ? '海域' : (g.sub === '位面' ? '位面' : (g.sub === '遗迹' ? '遗迹' : '野外'))] || SOFT) : NATION_COLOR(g.name);
      var h = padHull(hull(pts), pts.length === 1 ? 46 : 30);
      if (h.length >= 3) {
        s.push('<polygon points="' + pol(h) + '" fill="' + col + '" fill-opacity=".07" stroke="' + col +
          '" stroke-opacity=".5" stroke-dasharray="' + (g.sub ? '5 4' : '0') + '"/>');
      } else if (h.length) {
        s.push('<circle cx="' + h[0][0] + '" cy="' + h[0][1] + '" r="46" fill="' + col + '" fill-opacity=".07" stroke="' + col + '" stroke-opacity=".5" stroke-dasharray="5 4"/>');
      }
      var cx = 0, cy = 0;
      h.forEach(function (p) { cx += p[0]; cy += p[1]; });
      cx /= h.length; cy /= h.length;
      s.push(label(cx, cy - (pts.length === 1 ? 34 : 26), g.name, g.sub ? 11 : 13, g.sub ? SOFT : col, 'middle', g.sub ? '' : '600'));
      /* 按钮先记下来，等点位和浅字都画完再统一画，免得被盖住点不到 */
      btnSpecs.push({ x: cx, y: cy + 34, id: 'g:' + (g.key || g.nation), label: '展开 ' + g.regions.length + ' 处', color: col });
    });
    /* 地区点位与浅文字：位置太近的合成一行标注，免得字压字 */
    var clusters = [];
    (WD.REGIONS || []).forEach(function (r) {
      var pl = GEO.planeOf(r);
      if (pl.where.indexOf('主物质') < 0) return;
      var p = GEO.posOf(r), x = p.x * 10, y = p.y * 6.2;
      s.push(marker(x, y, LAYER_COLOR[GEO.layerOf(r)] || SOFT));
      var hit = null;
      clusters.forEach(function (c) { if (!hit && Math.abs(c.x - x) < 46 && Math.abs(c.y - y) < 22) hit = c; });
      if (hit) { hit.names.push(r.name); return; }
      clusters.push({ x: x, y: y, names: [r.name] });
    });
    clusters.forEach(function (c) {
      s.push(label(c.x, c.y + 16, c.names.join(' · '), c.names.length > 1 ? 9.5 : 10, FAINT, 'middle'));
    });
    /* 位面入口不画在图上（会挡住地图）：改成画布下方的一条说明，见 planeStrip() */
    /* 按钮最后画：一定在点位与浅字之上，点得到 */
    btnSpecs.forEach(function (b) { s.push(drillBtn(b.x, b.y, b.id, b.label, b.color)); });
    /* 当前所在地 */
    if (here) {
      var hr = GEO.regionOf(here);
      if (hr && GEO.planeOf(hr).where.indexOf('主物质') >= 0) {
        var hp = GEO.posOf(hr);
        s.push(hereMark(hp.x * 10, hp.y * 6.2, '你在 ' + hr.name));
      }
    }
    return '<svg class="mapsvg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' + s.join('') + '</svg>';
  }
  /* 位面说明条：放在地图画布外面，绝不挡地图 */
  function planeStrip(here) {
    var g = GEO.regionGroups().filter(function (x) { return x.sub === '位面'; })[0];
    if (!g) return '';
    var planes = g.regions;
    var mine = here && planes.some(function (r) { return r.name === here; });
    return '<div class="map-planes' + (mine ? ' on' : '') + '">' +
      '<span class="lbl">不在主物质位面：</span>' +
      '<span class="list">' + planes.map(function (r) { return esc(r.name); }).join('、') + '</span>' +
      '<button type="button" data-map-node="' + esc('g:' + (g.key || g.nation)) + '">展开 ' + planes.length + ' 处</button>' +
      (mine ? '<b>（你正在这里）</b>' : '') +
      '</div>';
  }
  var NATION_COLORS = ['#E0B45A', '#8FC1DE', '#E8A0BE', '#BFA3DE', '#9FCFB4', '#E8AF6E',
    '#E6C95A', '#8FA8CC', '#CFC4B0', '#E88A80', '#9FD3C7', '#A8B8E8', '#D8C08A'];
  function NATION_COLOR(name) {
    var ns = (WD.NATIONS || []);
    for (var i = 0; i < ns.length; i++) if (ns[i].name === name) return NATION_COLORS[i % NATION_COLORS.length];
    return SOFT;
  }

  /* ---------- 第二层：国度／疆域图 ---------- */
  function groupSVG(node, here) {
    var W = 1000, H = 620;
    var rs = node.children.filter(function (c) { return c.kind === 'region'; });
    var s = [];
    s.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + SEA + '"/>');
    for (var gx = 0; gx <= 10; gx++) s.push('<line x1="' + (gx * 100) + '" y1="0" x2="' + (gx * 100) + '" y2="' + H + '" stroke="#1c242e" stroke-width="1"/>');
    for (var gy = 0; gy <= 6; gy++) s.push('<line x1="0" y1="' + (gy * 100) + '" x2="' + W + '" y2="' + (gy * 100) + '" stroke="#1c242e" stroke-width="1"/>');
    /* 本图内部坐标：把该国度／分区的地区位置铺满画布 */
    var pts = rs.map(function (c) { return GEO.posOf(c.region); });
    var minX = Math.min.apply(null, pts.map(function (p) { return p.x; }));
    var maxX = Math.max.apply(null, pts.map(function (p) { return p.x; }));
    var minY = Math.min.apply(null, pts.map(function (p) { return p.y; }));
    var maxY = Math.max.apply(null, pts.map(function (p) { return p.y; }));
    var spanX = Math.max(14, maxX - minX), spanY = Math.max(14, maxY - minY);
    var pad = 90;
    function projRaw(p) {
      return [pad + (p.x - minX) / spanX * (W - pad * 2), pad + (p.y - minY) / spanY * (H - pad * 2)];
    }
    /* 同城簇（曙光城／喷泉广场／回音井 之类）原坐标几乎重合，先摊开再画，
       否则按钮叠在一起点不准 */
    var placed = rs.map(function (c) { return projRaw(GEO.posOf(c.region)); });
    for (var it = 0; it < 90; it++) {
      var moved = false;
      for (var a = 0; a < placed.length; a++) {
        for (var b = a + 1; b < placed.length; b++) {
          var dx = placed[b][0] - placed[a][0], dy = placed[b][1] - placed[a][1];
          var d = Math.sqrt(dx * dx + dy * dy);
          /* 两点完全重合时方向向量是 0，必须给一个确定的方向推，否则永远分不开 */
          if (d < 0.01) {
            var ang = (a * 2.3999632 + b * 0.7853982) % (Math.PI * 2);
            dx = Math.cos(ang); dy = Math.sin(ang); d = 1;
          }
          var need = 168;                                  /* 两个点位之间留出的最小间距 */
          if (d < need) {
            var push = (need - d) / 2, ux = dx / d, uy = dy / d;
            placed[a][0] -= ux * push; placed[a][1] -= uy * push;
            placed[b][0] += ux * push; placed[b][1] += uy * push;
            moved = true;
          }
        }
      }
      placed.forEach(function (p) {
        p[0] = Math.max(pad * 0.6, Math.min(W - pad * 0.6, p[0]));
        /* 下缘留出图说框的高度，否则按钮会落在图说上点不到 */
        p[1] = Math.max(pad * 0.7, Math.min(H - 130, p[1]));
      });
      if (!moved) break;
    }
    var layout = {};
    rs.forEach(function (c, i) { layout[c.id] = placed[i]; });
    function proj(p) { return projRaw(p); }
    /* 图说先画：它是底衬，不能盖住后面的点位与按钮 */
    s.push('<rect x="18" y="' + (H - 66) + '" width="640" height="48" rx="4" fill="#141a22" stroke="' + LINE + '"/>');
    s.push(label(32, H - 46, node.name + (node.sub ? '（无主之地 · ' + node.sub + '）' : ''), 12, SOFT, 'start', '600'));
    s.push(label(32, H - 30, (node.trait || '').slice(0, 52), 10, FAINT, 'start'));
    /* 地形晕染 */
    rs.forEach(function (c) {
      var xy = proj(GEO.posOf(c.region)), col = TERRAIN[c.terrain] || SOFT;
      s.push('<ellipse cx="' + xy[0].toFixed(1) + '" cy="' + xy[1].toFixed(1) + '" rx="86" ry="62" fill="' + col +
        '" fill-opacity=".13" stroke="' + col + '" stroke-opacity=".3"/>');
    });
    /* 层分带：按层给底色 */
    var layers = GEO.layersOf(node.sub ? ('无主之地/' + node.sub) : node.name);
    layers.forEach(function (ly, i) {
      var yy = 26 + i * 22;
      s.push('<rect x="18" y="' + yy + '" width="12" height="12" rx="2" fill="' + (LAYER_COLOR[ly.layer] || SOFT) + '" fill-opacity=".8"/>');
      s.push(label(38, yy + 11, ly.layer + '（' + ly.regions.length + ' 处）', 11, FAINT, 'start'));
    });
    /* 地区点位 + 浅文字 + 展开按钮（用摊开后的位置，避免按钮叠在一起） */
    rs.forEach(function (c) {
      var xy = layout[c.id] || proj(GEO.posOf(c.region));
      var col = LAYER_COLOR[c.layer] || SOFT;
      var isHere = here && c.name === here;
      if (isHere) s.push(hereMark(xy[0], xy[1], '你在 ' + c.name));
      s.push('<circle cx="' + xy[0].toFixed(1) + '" cy="' + xy[1].toFixed(1) + '" r="17" fill="' + col +
        '" fill-opacity=".1" stroke="' + col + '" stroke-opacity=".45"/>');
      s.push(marker(xy[0], xy[1], col));
      s.push(label(xy[0], xy[1] - 14, c.name, 12, '#C6CDD6', 'middle', '600'));
      s.push(label(xy[0], xy[1] + 26, (c.layer || '') + ' · ' + (c.terrain || '') + ' · 威胁 ' + (c.threat || [1, 1]).join('-'), 10, FAINT, 'middle'));
      if (c.children.length) s.push(drillBtn(xy[0], xy[1] + 46, c.id, '展开 ' + c.children.length + ' 处', col));
    });
    return '<svg class="mapsvg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' + s.join('') + '</svg>';
  }

  /* ---------- 第三／四层：地区与地标 ---------- */
  function nodeSVG(node, here) {
    var W = 1000, H = 620;
    var kids = node.children || [];
    var s = [];
    s.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + SEA + '"/>');
    var col = node.kind === 'region' ? (LAYER_COLOR[node.layer] || SOFT) : SOFT;
    var hereItself = here && node.name === here;
    if (node.kind === 'region') {
      var info = GEO.regionInfo(node.region) || {};
      s.push('<circle cx="500" cy="300" r="250" fill="' + (TERRAIN[node.terrain] || SOFT) + '" fill-opacity=".08" stroke="' + col + '" stroke-opacity=".3" stroke-dasharray="6 5"/>');
      s.push('<circle cx="500" cy="300" r="46" fill="' + col + '" fill-opacity=".16" stroke="' + col + '" stroke-opacity=".6"/>');
      s.push(label(500, 296, node.name, 15, '#DDE3EA', 'middle', '600'));
      s.push(label(500, 314, (node.layer || '') + ' · ' + (node.terrain || '') + ' · 威胁 ' + (node.threat || [1, 1]).join('-'), 10, FAINT, 'middle'));
      if (hereItself) s.push(hereMark(500, 252, '你在这里'));
      s.push(label(500, 522, node.nation + ' · ' + (info.position || ''), 11, FAINT, 'middle'));
      if (info.nations && info.nations.length) {
        s.push(label(500, 544, '附近国家：' + info.nations.map(function (n) { return n.name + '（' + n.dir + '）'; }).join('　'), 10, FAINT, 'middle'));
      }
    } else {
      s.push('<circle cx="500" cy="300" r="150" fill="' + SOFT + '" fill-opacity=".06" stroke="' + col + '" stroke-opacity=".3" stroke-dasharray="5 4"/>');
      s.push(label(500, 300, node.name, 16, '#DDE3EA', 'middle', '600'));
      if (node.note) s.push(label(500, 320, node.note.slice(0, 46), 10, FAINT, 'middle'));
    }
    /* 子节点环形排布（同一套画法） */
    if (kids.length) {
      var R = node.kind === 'region' ? 190 : 120;
      var cy = node.kind === 'region' ? 300 : 300;
      kids.forEach(function (k, i) {
        var a = -Math.PI / 2 + i * (Math.PI * 2 / kids.length);
        var x = 500 + Math.cos(a) * R * (kids.length > 4 ? 1.5 : 1);
        var y = cy + Math.sin(a) * R;
        if (kids.length > 4) x = 140 + (i % 4) * 240, y = 200 + Math.floor(i / 4) * 130;
        s.push('<line x1="500" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + LINE + '"/>');
        s.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="30" fill="' + SOFT + '" fill-opacity=".08" stroke="' + SOFT + '" stroke-opacity=".35"/>');
        s.push(marker(x, y, SOFT));
        s.push(label(x, y - 14, k.name, 12, '#C6CDD6', 'middle', '600'));
        if (k.note) s.push(label(x, y + 42, k.note.slice(0, 20), 9.5, FAINT, 'middle'));
        if (k.children && k.children.length) s.push(drillBtn(x, y + 60, k.id, '展开 ' + k.children.length + ' 处', SOFT));
      });
    } else {
      s.push(label(500, 400, '这里没有更细的图。', 12, FAINT, 'middle'));
    }
    return '<svg class="mapsvg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' + s.join('') + '</svg>';
  }

  function svg(nodeId, here) {
    var node = find(nodeId) || tree();
    if (node.kind === 'world') return worldSVG(here);
    if (node.kind === 'nation' || node.kind === 'wild') return groupSVG(node, here);
    return nodeSVG(node, here);
  }

  /* ---------- 面包屑与信息 ---------- */
  function crumb(nodeId) {
    var path = pathOf(nodeId);
    if (!path.length) path = [tree()];
    var out = [];
    path.forEach(function (n, i) {
      var last = i === path.length - 1;
      out.push('<button type="button" class="crumb' + (last ? ' on' : '') + '" data-map-node="' + esc(n.id) + '">' + esc(n.name) + '</button>');
      if (!last) out.push('<span class="crumb-sep">›</span>');
    });
    return '<div class="map-crumb">' + out.join('') +
      (path.length > 1 ? '<button type="button" class="map-back" data-map-back="' + esc(path[path.length - 2].id) + '">返回上层</button>' : '') +
      '</div>';
  }
  function info(nodeId) {
    var node = find(nodeId);
    if (!node) return '';
    function small(v) { return LTX.size(v, 'footnotesize'); }
    if (node.kind === 'world') {
      var L = [];
      L.push(LTX.txt('众星之母的身躯化为艾尔德兰。下面是这块大陆上所有的国度与疆域。', LTX.INK.body));
      L.push(LTX.rule('#8FC1DE', 6));
      GEO.regionGroups().forEach(function (g) {
        L.push(LTX.strong(g.nation, g.sub ? '#9E9078' : '#5E8FAE') + '\\quad ' +
          LTX.txt(small((g.sub ? '无主之地 · ' + g.band : '首都 ' + g.capital + ' · ' + g.band) + ' · 境内 ' + g.regions.length + ' 处'), LTX.INK.dim));
      });
      L.push(LTX.rule('#8FC1DE', 6));
      L.push(LTX.txt(small('浅字是地名，点方框里的「展开」进入下一层：国度 → 地区 → 地标，共四层。'), LTX.INK.dim));
      return LTX.mkPanel({ theme: 'blue', title: '大 陆 总 图', lines: L, foot: '点地图上的「展开」进入下一层' });
    }
    if (node.kind === 'nation' || node.kind === 'wild') {
      return GEO.nationPanel(node.sub ? ('无主之地/' + node.sub) : node.name);
    }
    if (node.kind === 'region') return GEO.regionPanel(node.name);
    return LTX.mkPanel({
      theme: 'sand', title: '地 标',
      lines: [LTX.strong(node.name, '#9E9078'), LTX.rule('#CFC4B0', 5),
        LTX.txt(node.note || '这里没有更多记载。', LTX.INK.body)]
    });
  }
  function stats() {
    var t = tree(), groups = t.children.length, regions = 0, spots = 0, deep = 0;
    t.children.forEach(function (g) {
      regions += g.children.length;
      g.children.forEach(function (r) {
        spots += r.children.length;
        r.children.forEach(function (s2) { deep += (s2.children || []).length; });
      });
    });
    return { groups: groups, regions: regions, spots: spots, deep: deep, layers: 4 };
  }

  /* ---------- 鼠标缩放 / 平移浏览 ----------
     滚轮在光标处缩放，按住拖动平移，双击复位；
     拖动超过阈值就吃掉那一次 click，免得松手时误触「展开」按钮。 */
  function zoomify(stage, svg) {
    if (!stage || !svg) return null;
    var ctl = { k: 1, x: 0, y: 0, min: 0.5, max: 8 };
    function apply() {
      svg.style.transformOrigin = '0 0';
      svg.style.transform = 'translate(' + ctl.x.toFixed(2) + 'px,' + ctl.y.toFixed(2) + 'px) scale(' + ctl.k.toFixed(4) + ')';
      stage.setAttribute('data-zoom', ctl.k.toFixed(2));
    }
    function zoomAt(mx, my, factor) {
      var k2 = Math.max(ctl.min, Math.min(ctl.max, ctl.k * factor));
      if (k2 === ctl.k) return ctl.k;
      ctl.x = mx - (mx - ctl.x) * (k2 / ctl.k);
      ctl.y = my - (my - ctl.y) * (k2 / ctl.k);
      ctl.k = k2;
      apply();
      return ctl.k;
    }
    function panBy(dx, dy) { ctl.x += dx; ctl.y += dy; apply(); }
    function reset() { ctl.k = 1; ctl.x = 0; ctl.y = 0; apply(); }
    function centre() {
      var r = stage.getBoundingClientRect ? stage.getBoundingClientRect() : { width: 900, height: 500 };
      return { x: (r.width || 900) / 2, y: (r.height || 500) / 2 };
    }
    ctl.zoomAt = zoomAt;
    ctl.panBy = panBy;
    ctl.reset = reset;
    ctl.zoomIn = function () { var c = centre(); return zoomAt(c.x, c.y, 1.25); };
    ctl.zoomOut = function () { var c = centre(); return zoomAt(c.x, c.y, 0.8); };
    ctl.state = function () { return { k: ctl.k, x: ctl.x, y: ctl.y }; };
    apply();

    if (typeof stage.addEventListener === 'function') {
      var dragging = false, moved = 0, sx = 0, sy = 0;
      stage.addEventListener('wheel', function (e) {
        if (e.preventDefault) e.preventDefault();
        var r = stage.getBoundingClientRect ? stage.getBoundingClientRect() : { left: 0, top: 0 };
        var mx = (e.clientX || 0) - (r.left || 0), my = (e.clientY || 0) - (r.top || 0);
        zoomAt(mx, my, (e.deltaY || 0) < 0 ? 1.15 : 1 / 1.15);
      });
      stage.addEventListener('mousedown', function (e) {
        if (e.button != null && e.button !== 0) return;
        dragging = true; moved = 0;
        sx = (e.clientX || 0) - ctl.x; sy = (e.clientY || 0) - ctl.y;
        stage.classList.add('grabbing');
      });
      stage.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        var nx = (e.clientX || 0) - sx, ny = (e.clientY || 0) - sy;
        moved += Math.abs(nx - ctl.x) + Math.abs(ny - ctl.y);
        ctl.x = nx; ctl.y = ny;
        apply();
      });
      stage.addEventListener('mouseup', function () { dragging = false; stage.classList.remove('grabbing'); });
      stage.addEventListener('mouseleave', function () { dragging = false; stage.classList.remove('grabbing'); });
      stage.addEventListener('dblclick', function () { reset(); });
      stage.addEventListener('click', function (e) {
        if (moved > 6) {                       /* 刚拖过：这一下不算点按钮 */
          if (e.stopPropagation) e.stopPropagation();
          if (e.preventDefault) e.preventDefault();
          moved = 0;
        }
      }, true);
    }
    stage.__mapCtl = ctl;
    return ctl;
  }
  function stage(nodeId, here) {
    return '<div class="mapstage">' + svg(nodeId, here) + '</div>' + planeStrip(here);
  }

  global.MAP = {
    tree: tree, find: find, pathOf: pathOf, parentOf: parentOf,
    svg: svg, stage: stage, crumb: crumb, info: info, stats: stats, zoomify: zoomify,
    planeStrip: planeStrip, hereMark: hereMark,
    TERRAIN: TERRAIN, LAYER_COLOR: LAYER_COLOR, SUB: SUB,
    drillable: function (nodeId) { var n = find(nodeId); return !!(n && n.children && n.children.length); }
  };
})(window);
