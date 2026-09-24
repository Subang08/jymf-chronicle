/* ============================================================
   建卡流程 · 选项按设定集实际数量从 a 起顺序排列（有多少列多少）
   末位永远是「自定义（直接输入）」；进入游戏后的行动选项才固定 a-e。
   顺序：种族 → 职业 → 身份 → 背景 → 天赋 → 性别 → 姓名 → 属性 → 阵营
        → 选择国度 → 选择层（国境内地方多时才有这一步）→ 选择地区 → 开篇 → 确认
   选择国度/层/地区时会给出：所在国家、地理位置、附近国家情况。
   ============================================================ */
(function (global) {
  'use strict';

  var WD = global.WD || {}, GEO = global.GEO, ENG = global.ENG, PANEL = global.PANEL, IMPROV = global.IMPROV;
  var LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
  var STEPS = ['race', 'class', 'identity', 'background', 'talent', 'gender', 'name', 'attrs', 'align', 'nation', 'layer', 'region', 'opening', 'confirm'];

  function keyFor(i) { return LETTERS[i] || ('z' + LETTERS[i - 26]); }
  function customKey(n) { return keyFor(n); }

  function listOf(step, st) {
    if (step === 'race') return WD.RACES || [];
    if (step === 'class') return WD.CLASSES || [];
    if (step === 'identity') return WD.IDENTITIES || [];
    if (step === 'background') return WD.BACKGROUNDS || [];
    if (step === 'align') return WD.ALIGNMENTS || [];
    if (step === 'nation') return GEO.regionGroups();
    if (step === 'layer') return GEO.layersOf(st.create.picks.nation || '无主之地');
    if (step === 'region') {
      var rs = GEO.regionsOf(st.create.picks.nation || '无主之地');
      var L = st.create.picks.layer;
      if (L && L !== '全部') rs = rs.filter(function (r) { return GEO.layerOf(r) === L; });
      return rs;
    }
    return [];
  }

  function begin(st) {
    st.phase = 'create';
    st.create = { i: 0, picks: {}, pool: ENG.talent.pool(st, 10), tal: newTal() };
    return node(st);
  }
  /* 天赋抽选的内部状态：draws 是抽过的每一组（最多五次），mode=free 表示暗号已解锁 */
  function newTal() {
    return { draws: [], mode: 'draw', stage: 'grade', grade: null, picked: [], unlocked: false };
  }
  function tal(st) { if (!st.create.tal) st.create.tal = newTal(); return st.create.tal; }
  var TAL_MAX_DRAW = 5;      /* 可以重复抽取五次 */
  var TAL_FREE_MAX = 4;      /* 解锁后可自由选择的天赋上限 */
  var TAL_KEY = '剑与魔法';   /* 暗号 */
  function cur(st) { return STEPS[st.create.i]; }

  /* ---------------- 节点渲染 ---------------- */
  function node(st) {
    var c = st.create, step = cur(st);
    var title = '', text = '', panel = null, opts = [];
    var items = [], labels = [];

    if (step === 'race') {
      title = '选 择 种 族';
      text = '众星之母用肋骨造了巨龙，用泪水造了精灵，用热血造了人类。血统决定你的身高、寿数与别人看你的第一眼。';
      items = listOf('race', st);
      labels = items.map(function (r) {
        var bn = [];
        if (r.bonus) for (var k in r.bonus) bn.push((k === 'any' ? '任意两项' : ENG.attrCN(k)) + '+' + r.bonus[k]);
        return r.name + (r.sub ? '（' + r.sub + '）' : '') + ' · ' + (r.life || '') + ' · ' + bn.join(' ');
      });
    } else if (step === 'class') {
      title = '选 择 职 业';
      text = '力量有五源：奥术、神术、战职、诡术、自然。你走哪一条，决定你在战场上、酒桌上、教堂里的分量。';
      items = listOf('class', st);
      labels = items.map(function (x) { return x.name + ' · ' + (x.core || '') + ' · 生命骰 d' + (x.hpDie || 8); });
    } else if (step === 'identity') {
      title = '选 择 身 份';
      text = '身份是你走进这个世界时，别人已经替你写好的那半页纸。';
      items = listOf('identity', st);
      labels = items.map(function (x) { return x.name + ' · ' + (x.desc || '') + '（起始 ' + (x.gold || 0) + ' GP）'; });
    } else if (step === 'background') {
      title = '选 择 背 景';
      text = '背景给出两样东西：两门熟练技艺，和一件舍不得扔的旧物。';
      items = listOf('background', st);
      labels = items.map(function (x) { return x.name + ' · ' + (x.skills || []).join('、') + ' · ' + (x.item || ''); });
    } else if (step === 'talent') {
      var TL = tal(st);
      if (TL.mode === 'free') {
        /* 暗号解锁后：自由选择，最多四项 */
        var pickedIds = TL.picked.map(function (x) { return x.id; });
        if (TL.stage === 'list' && TL.grade) {
          title = '自 由 选 择 天 赋 · ' + TL.grade + ' 级';
          text = '这是' + TL.grade + '级的全部条目。已选 ' + TL.picked.length + ' / ' + TAL_FREE_MAX +
            ' 项：点一条选进来，再点同一条就撤掉。选满或提前收手都行。';
          items = ENG.talent.byGrade(TL.grade).map(function (x) { return { v: 'pick:' + x.id, talent: x }; });
          items.push({ v: 'gradeback', n: '回到等级选择' });
          if (TL.picked.length) items.push({ v: 'freego', n: '就这 ' + TL.picked.length + ' 项，进下一步' });
          labels = items.map(function (x) {
            if (x.n) return x.n;
            return x.talent.name + (pickedIds.indexOf(x.talent.id) >= 0 ? '（已选，再点撤掉）' : '') + ' · ' + (x.talent.desc || '');
          });
        } else {
          title = '自 由 选 择 天 赋（已选 ' + TL.picked.length + ' / ' + TAL_FREE_MAX + '）';
          text = '暗号从对话框进来，这门就开了：不抽，直接挑，任何等级都行。挑满四项就收手，也可以提前收。';
          items = ['SSS', 'A', 'B', 'C', 'D'].map(function (g) { return { v: 'grade:' + g, g: g }; });
          if (TL.picked.length) items.push({ v: 'freego', n: '就这 ' + TL.picked.length + ' 项，进下一步' });
          labels = items.map(function (x) {
            if (x.n) return x.n;
            var total = ENG.talent.byGrade(x.g).length;
            var have = TL.picked.filter(function (y) { return y.grade === x.g; }).length;
            return x.g + ' 级 · 共 ' + total + ' 条' + (have ? '（已选 ' + have + '）' : '');
          });
        }
        panel = PANEL.talents(st, TL.picked, '已 选 天 赋 · 自 由 选 择');
      } else if (TL.draws.length) {
        /* 抽过了：把每一组列出来，挑一组收下；还能再抽 */
        title = '天 赋 抽 选 · 已抽 ' + TL.draws.length + ' / ' + TAL_MAX_DRAW + ' 次';
        text = '抽到的一组全部归你。同一次抽到的条目不会重复；换一组就换一次命，最多抽五次。';
        items = TL.draws.map(function (d, i) { return { v: 'take:' + i, draw: d, n: '收下第 ' + (i + 1) + ' 次：' + d.cn + '（' + d.list.map(function (x) { return x.name; }).join('、') + '）' }; });
        if (TL.draws.length < TAL_MAX_DRAW) items.push({ v: 'draw', n: '再抽一次（第 ' + (TL.draws.length + 1) + ' 次，共 ' + TAL_MAX_DRAW + ' 次）' });
        labels = items.map(function (x) { return x.n; });
        panel = PANEL.talents(st, TL.draws, '抽 选 记 录');
      } else {
        /* 第一步：抽 */
        title = '天 赋 抽 选';
        text = '开局的天赋不由你挑：按下抽选，命运按它的概率给一组，给多少就带走多少。' +
          '抽到的一组不能改写；不满意可以再抽，最多五次，最后收下其中一组。';
        items = [{ v: 'draw', n: '抽取天赋（第 1 次，共 ' + TAL_MAX_DRAW + ' 次）' }];
        labels = items.map(function (x) { return x.n; });
        panel = PANEL.talents(st, [], '抽 选 规 则');
      }
    } else if (step === 'gender') {
      title = '选 择 性 别';
      text = '这一项不设门槛，写什么就是什么。';
      items = [{ v: '男' }, { v: '女' }, { v: '未述' }, { v: '随机' }];
      labels = ['男性', '女性', '不透露', '让骰子决定'];
    } else if (step === 'name') {
      title = '确 定 姓 名';
      text = '名字是这个世界记住你的方式。下面这些来自你血统的取名习惯。';
      var race = ENG.char.raceById(c.picks.raceId);
      items = namesFor(race, c.picks.gender).slice(0, 12).map(function (n) { return { v: n }; });
      labels = items.map(function (x) { return x.v; });
    } else if (step === 'attrs') {
      title = '分 配 属 性';
      text = '标准数组 15 / 14 / 13 / 12 / 10 / 8，六项各一个，种族加成随后叠加。';
      items = [
        { v: 'str,con,dex,wis,cha,int', n: '力15 体14 敏13 感12 魅10 智8', d: '战职：战士、圣骑士、野蛮人' },
        { v: 'dex,con,wis,str,int,cha', n: '敏15 体14 感13 力12 智10 魅8', d: '游侠、游荡者、德鲁伊' },
        { v: 'int,dex,con,wis,cha,str', n: '智15 敏14 体13 感12 魅10 力8', d: '法师' },
        { v: 'cha,con,dex,int,wis,str', n: '魅15 体14 敏13 智12 感10 力8', d: '术士、吟游诗人、圣骑士' },
        { v: 'wis,con,dex,str,int,cha', n: '感15 体14 敏13 力12 智10 魅8', d: '牧师' },
        { v: 'con,str,dex,wis,int,cha', n: '体15 力14 敏13 感12 智10 魅8', d: '抗打型：野蛮人、盾卫战士' }
      ];
      labels = items.map(function (x) { return x.n + '（' + x.d + '）'; });
      panel = PANEL.notice('属 性 分 配 规 则', [
        '六项：力量 敏捷 体质 智力 感知 魅力。',
        '调整值 =（属性 - 10）÷ 2，向下取整。',
        '自定义输入格式：力15 敏14 体13 智12 感10 魅8（或直接写六个数字）'
      ], 'blue');
    } else if (step === 'align') {
      title = '选 择 阵 营';
      text = '阵营不是标签，是别人替你记的账。九种里挑一种。';
      items = listOf('align', st);
      labels = items.map(function (x) { return x.name + '（' + x.id + '） · ' + (x.core || '') + ' · ' + (x.who || ''); });
    } else if (step === 'nation') {
      title = '选 择 国 度 / 疆 域';
      text = '先定你要落在哪一片：大陆上有七个人类王国、六个种族国度；' +
        '剩下那些不在任何王国治下的地方按性质分成四区（荒野、海域、遗迹、位面），各自单列。' +
        '下面每个选项都标出它的方位与境内地区数，面板里是各国彼此的远近与接壤情况。';
      var groups = GEO.regionGroups();
      panel = worldMapPanel();
      items = groups.map(function (g) { return { value: g.key, g: g }; });
      labels = groups.map(function (g) {
        return g.nation + ' · ' + (g.sub ? ('无主之地 · ' + g.band) : ('首都 ' + g.capital + ' · ' + g.band)) +
          ' · ' + (g.trait || '').slice(0, 20) + '（境内 ' + g.regions.length + ' 处）';
      });
    } else if (step === 'layer') {
      var natL = c.picks.nation || '无主之地';
      title = '选 择 层 · ' + natL;
      text = natL + '境内的地方不止一类，按性质分层。先挑你要落在哪一层：' +
        '都城有官府与公会，村镇靠田猎与商路，野外没有常驻官府，地下与遗迹另有规矩。';
      items = listOf('layer', st).map(function (ly) { return { value: ly.layer, ly: ly }; });
      panel = GEO.nationPanel(natL);
      labels = items.map(function (it) {
        var ly = it.ly;
        return ly.layer + '（' + ly.regions.length + ' 处）· ' + ly.regions.map(function (r) { return r.name; }).join('、') +
          ' · ' + ly.desc;
      });
    } else if (step === 'region') {
      var nat = c.picks.nation || '无主之地';
      var lay = c.picks.layer;
      title = '选 择 地 区 · ' + nat + (lay && lay !== '全部' ? ' / ' + lay : '');
      text = '你选的疆域是' + nat + (lay && lay !== '全部' ? ('，层是' + lay + '（' + (GEO.LAYER_DESC[lay] || '') + '）') : '') +
        '。下面列出这里的每一处可往之地：每个选项都带方位、地形、威胁等级与最近的邻国；选定后会给出该地区的完整地区志。';
      items = listOf('region', st);
      panel = GEO.nationPanel(nat);
      labels = items.map(function (r) {
        var i = GEO.regionInfo(r);
        var near = (i.nations && i.nations[0]) ? (' · 最近邻国 ' + i.nations[0].name + '（' + i.nations[0].dir + ' · ' + i.nations[0].far + '）') : '';
        var n2 = (i.neighbours && i.neighbours[0]) ? (' · 邻地 ' + i.neighbours[0].name + '（' + i.neighbours[0].dir + '）') : '';
        return '〔' + GEO.layerOf(r) + '〕' + r.name + ' · ' + (r.kind ? GEO.kindCN(r.kind) : '') + (r.terrain || '') +
          ' · 威胁 ' + (r.threat || [1, 1]).join('-') + ' · ' + i.position + near + n2;
      });
    } else if (step === 'opening') {
      title = '选 择 开 篇';
      text = '四条正式开篇对应四场已经出事的麻烦；也可以就用你自己挑的起点，' +
        '那条线没有剧本，从落地那一刻起由你自己找事做。';
      var myRegion = c.picks.regionName;
      items = [{ v: 'self', name: '沿用我选的起点' + (myRegion ? '：' + myRegion : ''), place: myRegion }];
      (WD.OPENINGS || []).forEach(function (o) { items.push({ v: o.id, name: o.name, place: o.place, o: o }); });
      var L = [];
      items.forEach(function (it, i) {
        if (it.v === 'self') {
          var info = myRegion ? GEO.regionInfo(myRegion) : null;
          L.push(PANEL.b(KEY(i), T('#A87E2E')) + PANEL.b(' 沿用我选的起点', '#2E2A3A') +
            '\\quad ' + PANEL.small(info ? (info.nationName + ' · ' + info.position) : '（还没选地区，将落在起点默认处）', '#9A8FA8'));
          return;
        }
        var o = it.o, info2 = GEO.regionInfo(o.place);
        L.push(PANEL.b(KEY(i), '#A87E2E') + PANEL.b(' ' + o.name, '#2E2A3A') +
          '\\quad ' + PANEL.small(o.place + ' · ' + (o.month || 1) + '月' + (o.day || 1) + '日', '#9A8FA8'));
        L.push(PANEL.small('    ' + (info2 ? ('所在国家 ' + info2.nationName + ' · ' + info2.position +
          ' · 附近国家 ' + (info2.nations[0] ? info2.nations[0].name + '（' + info2.nations[0].dir + '）' : '无')) : ''), '#4A4458'));
        L.push(PANEL.small('    基调：' + (o.tone || '') + '　第一件事：' + (o.task || ''), '#9A8FA8'));
      });
      panel = PANEL.panel({ theme: 'gold', title: '开 篇 · 四 条 线 与 自 定 起 点', lines: L, foot: '选定开篇后可用左右节点回看你做过的每个选择' });
      labels = items.map(function (it) {
        return it.v === 'self' ? ('沿用我选的起点' + (it.place ? '：' + it.place : '')) :
          (it.name + ' · ' + it.place + ' · ' + (it.o.tone || ''));
      });
    } else if (step === 'confirm') {
      title = '确 认 角 色 卡';
      text = '核对一遍。踏进去以后，改不了血统，也改不了别人已经知道的事。';
      panel = preview(st);
      items = [
        { v: 'go', n: '确认，进入艾尔德兰' },
        { v: 'region', n: '改起点地区' },
        { v: 'rename', n: '换个名字' },
        { v: 'reattr', n: '重分配属性' },
        { v: 'restart', n: '推倒重来，重新建卡' }
      ];
      labels = items.map(function (x) { return x.n; });
    }

    /* 选项一律从 a 起顺排，有多少列多少。
       进入游戏前不再提供自定义项：建卡只能从选项里选（天赋那一步的暗号走对话框）。 */
    opts = items.map(function (it, i) {
      var val = it;
      if (it && typeof it === 'object') {
        if (it.value !== undefined) val = it.value;
        else if (it.v !== undefined) val = it.v;
        else if (it.id !== undefined) val = it.id;
      }
      return { k: keyFor(i), label: labels[i], kind: 'safe', value: val, idx: i };
    });

    return {
      step: step, title: title, text: text, panel: panel, opts: opts,
      count: items.length, firstKey: 'a', lastKey: opts[opts.length - 1].k,
      hint: hintFor(step, items.length)
    };
  }
  function KEY(i) { return '【' + keyFor(i).toUpperCase() + '】'; }
  function T(c) { return c; }
  function hintFor(step, n) {
    var tail = '　·　共 ' + n + ' 项（a-' + keyFor(n - 1) + '）';
    if (step === 'talent') return '天赋不能自己写：按字母抽选或收下（最多抽五次，最后收下其中一组）';
    if (step === 'gender') return '按 a-d 选择' + tail;
    if (step === 'name') return '按对应字母选名字' + tail;
    if (step === 'attrs') return '按 a-f 选择预设数组' + tail;
    if (step === 'nation') return '按字母选国度或疆域（无主之地已拆成荒野/海域/遗迹/位面四区）' + tail;
    if (step === 'layer') return '按字母选层（都城/村镇/野外/地下/遗迹/海域/位面）' + tail;
    if (step === 'region') return '按字母选地区；选项里已标出方位、威胁与最近邻国，选定后再看地区志' + tail;
    if (step === 'opening') return '按字母选开篇；第一个选项是沿用你自己挑的起点' + tail;
    if (step === 'confirm') return '按 a 进入世界；要改就按对应字母回退';
    return '按字母从选项里选' + tail;
  }

  /* ---------------- 万国方位表 ---------------- */
  function worldMapPanel() {
    var L = [];
    L.push(PANEL.t('原初之炎与永恒之冰碰撞，凝结为众星之母；祂的身躯化为艾尔德兰。', '#4A4458'));
    L.push(PANEL.rule('#8FC1DE', 6));
    GEO.regionGroups().forEach(function (g) {
      if (g.sub) return;
      L.push(PANEL.b(g.nation, '#5E8FAE') + '\\quad ' +
        PANEL.small('首都 ' + g.capital + ' · ' + g.band + '（方格 ' + (GEO.NATION_ANCHOR[g.nation] || [50, 50]).join(':') + '） · 境内 ' + g.regions.length + ' 处', '#9A8FA8'));
      L.push(PANEL.small('    ' + (g.trait || ''), '#4A4458'));
    });
    L.push(PANEL.rule('#8FC1DE', 6));
    L.push(PANEL.b('无主之地（按性质分四区）', '#9E9078'));
    GEO.wildGroups().forEach(function (g) {
      L.push(PANEL.small('  ' + g.nation + ' · ' + g.band + ' · 境内 ' + g.regions.length + ' 处：' +
        g.regions.map(function (r) { return r.name; }).join('、'), '#4A4458'));
      L.push(PANEL.small('      ' + g.trait, '#9A8FA8'));
    });
    return PANEL.panel({ theme: 'blue', title: '大 陆 方 位 总 览', lines: L, foot: '依据设定集第二卷 · 艾尔德兰大陆全图' });
  }

  /* ---------------- 姓名池 ---------------- */
  function namesFor(race, gender) {
    var N = WD.NAMES || {}, by = N.byRace || {};
    var pack = by[race && race.id] || by[race && race.name] || null;
    if (!pack) { for (var k in by) { pack = by[k]; break; } }
    var out = [];
    if (pack) {
      var g = (gender === '女') ? pack.female : pack.male;
      var fam = pack.family || [];
      (g || []).slice(0, 8).forEach(function (n) {
        out.push(n);
        if (fam.length) out.push(fam[ENG.int(0, fam.length - 1)] + '·' + n);
      });
    }
    if (!out.length) out = ['无名', '阿德尔', '卡尔文', '塞拉'];
    return ENG.shuffle(out);
  }

  /* ---------------- 选择处理 ---------------- */
  function pick(st, k, raw) {
    var c = st.create, step = cur(st), n = node(st);
    var msg = '', infoPanel = null;
    var opt = null;
    (n.opts || []).forEach(function (o) { if (o.k === k) opt = o; });
    if (!opt) {
      /* 对话框来的文字：键对不上任何一个选项时，仍然交给 custom 去判（暗号就走这条路） */
      if (raw != null && String(raw).trim()) return custom(st, step, raw);
      return { ok: false, msg: '没有这个选项。可用的是 a-' + n.lastKey + '。' };
    }
    if (opt.kind === 'custom') return custom(st, step, raw);
    var v = opt.value;

    if (step === 'race') { c.picks.raceId = v; c.picks.raceName = nameOf(WD.RACES, v); }
    else if (step === 'class') { c.picks.clsId = v; c.picks.clsName = nameOf(WD.CLASSES, v); }
    else if (step === 'identity') { c.picks.identityId = v; c.picks.identityName = nameOf(WD.IDENTITIES, v); }
    else if (step === 'background') { c.picks.bgId = v; c.picks.bgName = nameOf(WD.BACKGROUNDS, v); }
    else if (step === 'talent') {
      var TL = tal(st);
      var vs = String(v == null ? '' : v);
      /* 抽一次：结果进抽选记录，留在这一步，让玩家决定收下哪一组或再抽 */
      if (vs === 'draw') {
        if (TL.draws.length >= TAL_MAX_DRAW) return { ok: false, msg: '已经抽满 ' + TAL_MAX_DRAW + ' 次，收下其中一组。' };
        var d = ENG.talent.draw(st);
        TL.draws.push(d);
        var names = d.list.map(function (x) { return x.name + '（' + x.grade + '）'; }).join('、');
        msg = '第 ' + TL.draws.length + ' 次抽到' + d.cn + '：' + names +
          (TL.draws.length < TAL_MAX_DRAW ? '　·　还可以再抽 ' + (TAL_MAX_DRAW - TL.draws.length) + ' 次' : '　·　已经抽满五次，收下其中一组');
        infoPanel = drawPanel(st, d, TL.draws.length);
        return { ok: true, msg: msg, infoPanel: infoPanel, keep: true };
      }
      /* 收下第 N 次抽到的那一组：整组归角色所有 */
      if (vs.indexOf('take:') === 0) {
        var idx = parseInt(vs.slice(5), 10);
        var got = TL.draws[idx];
        if (!got) return { ok: false, msg: '没有这一次的抽选记录。' };
        c.picks.talents = got.list.slice();
        c.picks.talent = got.list[0] || null;
        c.picks.talentId = got.list[0] ? got.list[0].id : null;
        c.picks.talentDraw = { grade: got.grade, n: got.n, cn: got.cn, times: TL.draws.length, which: idx + 1 };
        c.picks.talentCustom = false;
        msg = '收下第 ' + (idx + 1) + ' 次抽到的' + got.cn + '：' + got.list.map(function (x) { return x.name; }).join('、');
      } else if (vs.indexOf('grade:') === 0) {
        TL.stage = 'list'; TL.grade = vs.slice(6);
        return { ok: true, msg: '翻 ' + TL.grade + ' 级的天赋。', keep: true };
      } else if (vs === 'gradeback') {
        TL.stage = 'grade'; TL.grade = null;
        return { ok: true, msg: '回到等级选择。已选 ' + TL.picked.length + ' / ' + TAL_FREE_MAX + ' 项。', keep: true };
      } else if (vs.indexOf('pick:') === 0) {
        var tk = ENG.talent.byId(vs.slice(5));
        if (!tk) return { ok: false, msg: '名录里没有这一条。' };
        var already = TL.picked.some(function (x) { return x.id === tk.id; });
        if (already) {
          TL.picked = TL.picked.filter(function (x) { return x.id !== tk.id; });
          msg = '撤掉 ' + tk.name + '。现在 ' + TL.picked.length + ' / ' + TAL_FREE_MAX + ' 项。';
        } else {
          if (TL.picked.length >= TAL_FREE_MAX) return { ok: false, msg: '自由选择的上限是 ' + TAL_FREE_MAX + ' 项，先撤一个再挑。' };
          TL.picked.push(tk);
          msg = '选入 ' + tk.name + '（' + tk.grade + '）。现在 ' + TL.picked.length + ' / ' + TAL_FREE_MAX + ' 项。';
        }
        infoPanel = freePanel(st);
        return { ok: true, msg: msg, infoPanel: infoPanel, keep: true };
      } else if (vs === 'freego') {
        if (!TL.picked.length) return { ok: false, msg: '还没选。' };
        c.picks.talents = TL.picked.slice();
        c.picks.talent = TL.picked[0];
        c.picks.talentId = TL.picked[0].id;
        c.picks.talentDraw = { grade: '自由选择', n: TL.picked.length, cn: TL.picked.length + ' 项（自由选择）', free: true };
        c.picks.talentCustom = false;
        msg = '收下 ' + TL.picked.map(function (x) { return x.name; }).join('、');
      } else {
        return { ok: false, msg: '这一步没有这个选项。' };
      }
    } else if (step === 'gender') {
      c.picks.gender = (v === '随机') ? (ENG.chance(0.5) ? '男' : '女') : v;
    } else if (step === 'name') { c.picks.name = v; }
    else if (step === 'attrs') {
      var order = String(v).split(',');
      var arr = [15, 14, 13, 12, 10, 8];
      var attrs = {};
      order.forEach(function (kk, i) { attrs[kk.trim()] = arr[i]; });
      c.picks.attrs = attrs;
    } else if (step === 'align') { c.picks.alignId = v; c.picks.alignName = nameOf(WD.ALIGNMENTS, v); }
    else if (step === 'nation') {
      c.picks.nation = v;
      c.picks.regionId = null; c.picks.regionName = null;
      c.picks.layer = null;
      if (GEO.needLayerStep(v)) {
        msg = '所在疆域：' + v + '　（境内地方分 ' + GEO.layersOf(v).length + ' 层，下一步选层）';
        c.i = STEPS.indexOf('layer');
        return { ok: true, msg: msg };
      }
      var ls0 = GEO.layersOf(v);
      if (ls0.length === 1) c.picks.layer = ls0[0].layer;
      msg = '所在疆域：' + v + (ls0.length === 1 ? ('（全境属' + ls0[0].layer + '）') : '');
      c.i = STEPS.indexOf('region');
      return { ok: true, msg: msg };
    } else if (step === 'layer') {
      var lay = null;
      GEO.layersOf(c.picks.nation || '无主之地').forEach(function (x) { if (x.layer === v) lay = x; });
      if (!lay) return { ok: false, msg: '这一层不存在。' };
      c.picks.layer = lay.layer;
      msg = '所选层：' + lay.layer + '（' + lay.regions.length + ' 处）';
      c.i = STEPS.indexOf('region');
      return { ok: true, msg: msg };
    } else if (step === 'region') {
      var reg = GEO.regionOf(v);
      if (!reg) return { ok: false, msg: '查无此地。' };
      c.picks.regionId = reg.id; c.picks.regionName = reg.name;
      c.picks.regionTerrain = reg.terrain; c.picks.regionNation = reg.nation || '无主之地';
      msg = '起点地区：' + reg.name;
      infoPanel = GEO.regionPanel(reg.name);      /* 选定后立刻给地区志 */
    } else if (step === 'opening') {
      if (v === 'self') {
        c.picks.openingId = 'custom';
        var rname = c.picks.regionName || '曙光城';
        var rg = GEO.regionOf(rname) || { name: rname, terrain: '平原', nation: '' };
        c.picks.opening = {
          id: 'custom', name: '自定起点 · ' + rg.name, place: rg.name, region: rg.name,
          terrain: rg.terrain || '平原', nation: rg.nation || '', month: 10, day: 12,
          tone: '没有剧本，从落地那一刻起由你自己找事做',
          task: '先弄清这里现在出什么事了，再决定要站在哪一边。',
          hook: '', initial: '', npc: null
        };
      } else {
        var op = null;
        (WD.OPENINGS || []).forEach(function (x) { if (x.id === v) op = x; });
        if (!op) return { ok: false, msg: '开篇列表里没有这一项。' };
        c.picks.openingId = op.id; c.picks.opening = op;
        c.picks.regionName = op.place;
        c.picks.regionTerrain = op.terrain;
        c.picks.regionNation = op.nation || '';
      }
    } else if (step === 'confirm') {
      if (v === 'go') return { ok: true, msg: '进入世界', done: true };
      if (v === 'region') { c.i = STEPS.indexOf('nation'); return { ok: true, msg: '重新挑起点。' }; }
      if (v === 'rename') { c.i = STEPS.indexOf('name'); return { ok: true, msg: '重新取名。' }; }
      if (v === 'reattr') { c.i = STEPS.indexOf('attrs'); return { ok: true, msg: '重新分配属性。' }; }
      if (v === 'restart') return { ok: true, msg: '推倒重来。', restart: true };
    }
    c.i = Math.min(STEPS.length - 1, c.i + 1);
    return { ok: true, msg: msg, infoPanel: infoPanel };
  }
  function nameOf(list, id) {
    for (var i = 0; i < (list || []).length; i++) if (list[i].id === id || list[i].name === id) return list[i].name;
    return id;
  }

  /* ---------------- 自定义输入 ---------------- */
  /* 天赋：刚抽到的这一组，单独印一张，避免玩家在大段文字里找 */
  function drawPanel(st, d, nth) {
    var L = [];
    L.push(PANEL.t('第 ' + nth + ' 次抽选结果：' + d.cn, '#8F74B8'));
    L.push(PANEL.rule('#8F74B8', 6));
    d.list.forEach(function (x) {
      L.push(PANEL.b('—— ' + x.name + '（' + x.grade + '）', '#6E5A96'));
      L.push(PANEL.small('　　' + (x.desc || ''), '#4A4458'));
      var ef = PANEL.effectText(x.effect);
      if (ef) L.push(PANEL.small('　　效果：' + ef, '#5FA98A'));
    });
    L.push(PANEL.rule('#8F74B8', 6));
    L.push(PANEL.small('这一组到手就是全部，不需要从中挑；要换就再抽一次（最多五次）。', '#9A8FA8'));
    return PANEL.panel({ theme: 'lav', title: '刚 才 抽 到 的', lines: L, bg: '#F4EEF9', foot: '抽到的条目不能改写' });
  }
  /* 暗号解锁：把门开给玩家看 */
  function freeUnlockPanel(st) {
    var TL = tal(st);
    var L = [];
    L.push(PANEL.t('『' + TAL_KEY + '』这四个字不在选项里，只在对话框里。', '#8F74B8'));
    L.push(PANEL.rule('#8F74B8', 6));
    L.push(PANEL.small('　这一步改为自由选择：五档天赋随便翻，不必抽。', '#4A4458'));
    L.push(PANEL.small('　可选上限 ' + TAL_FREE_MAX + ' 项；选多了要先撤掉一项。', '#4A4458'));
    L.push(PANEL.small('　抽选记录留在那里不动，随时可以不管它。', '#9A8FA8'));
    return PANEL.panel({ theme: 'lav', title: '暗 号 已 接 受', lines: L, bg: '#F4EEF9', foot: '自由选择 · 上限四项' });
  }
  function freePanel(st) {
    var TL = tal(st);
    var L = [];
    L.push(PANEL.t('自由选择 · 已选 ' + TL.picked.length + ' / ' + TAL_FREE_MAX, '#8F74B8'));
    L.push(PANEL.rule('#8F74B8', 6));
    if (!TL.picked.length) L.push(PANEL.small('　还没选。先翻一个等级进去。', '#9A8FA8'));
    TL.picked.forEach(function (x) {
      L.push(PANEL.b('—— ' + x.name + '（' + x.grade + '）', '#6E5A96'));
      L.push(PANEL.small('　　' + (x.desc || ''), '#4A4458'));
      var ef = PANEL.effectText(x.effect);
      if (ef) L.push(PANEL.small('　　效果：' + ef, '#5FA98A'));
    });
    return PANEL.panel({ theme: 'lav', title: '已 选 天 赋', lines: L, bg: '#F4EEF9', foot: '上限四项 · 可撤可选' });
  }
  /* 自创条目面板：把生成出来的数值、物品与背景文字摆给玩家看 */
  function improvPanel(made) {
    if (!made || !made.length) return null;
    var L = [];
    made.forEach(function (m) {
      L.push(PANEL.b(m.kind + '：' + m.obj.name + '（自创）', '#8F74B8'));
      (m.obj.blurb || []).forEach(function (line) { L.push(PANEL.small('　' + line, '#4A4458')); });
      if (m.kind === '种族') {
        var bn = [];
        if (m.obj.bonus) for (var k in m.obj.bonus) bn.push((k === 'any' ? '任意两项' : ENG.attrCN(k)) + '+' + m.obj.bonus[k]);
        L.push(PANEL.small('　数值：' + (bn.join('、') || '无加成') + '　速度 ' + m.obj.speed + ' 英尺　体型 ' + m.obj.size, '#5FA98A'));
        L.push(PANEL.small('　寿数 ' + m.obj.life + '　身高 ' + m.obj.height + '　出身 ' + m.obj.homeland, '#9A8FA8'));
      } else if (m.kind === '职业') {
        L.push(PANEL.small('　数值：生命骰 ' + m.obj.hpDie + '　' + (m.obj.caster ? ('施法者（' + ENG.attrCN(m.obj.casterAttr || 'int') + '）') : '非施法者') +
          '　源流 ' + m.obj.source, '#5FA98A'));
        L.push(PANEL.small('　物品：' + ((m.obj.kits && m.obj.kits[0] && m.obj.kits[0].items) || []).join(' + '), '#C0863E'));
      } else if (m.kind === '身份') {
        L.push(PANEL.small('　数值：熟练 ' + (m.obj.skills || []).join('、') + '　起始金币 ' + m.obj.gold + ' GP', '#5FA98A'));
      } else if (m.kind === '天赋') {
        L.push(PANEL.small('　数值：' + PANEL.effectText(m.obj.effect) + '　等级 ' + m.obj.grade, '#5FA98A'));
        L.push(PANEL.small('　状态：写进角色卡的天赋栏，随时生效。', '#9A8FA8'));
      } else if (m.kind === '阵营') {
        L.push(PANEL.small('　数值：阵营归到 ' + m.obj.name + '（' + m.obj.id + '），声望与行为判定按这一格算。', '#5FA98A'));
      } else if (m.kind === '国度') {
        L.push(PANEL.small('　数值：政体 ' + m.obj.gov + '　首都 ' + m.obj.capital + '（自创国度没有在地图上的疆域，地区仍从图上挑）', '#5FA98A'));
      } else if (m.kind === '背景') {
        L.push(PANEL.small('　数值：熟练 ' + (m.obj.skills || []).join('、'), '#5FA98A'));
        L.push(PANEL.small('　物品：' + m.obj.item + '　（' + (global.IMPROV ? (IMPROV.item(m.obj.item).desc || '一件旧物') : '一件旧物') + '）', '#C0863E'));
      }
    });
    return PANEL.panel({ theme: 'lav', title: '自 创 条 目 · 已 生 成', lines: L, bg: '#F4EEF9',
      foot: '这些内容会写进角色卡、状态栏与物品栏' });
  }
  /* 建卡阶段不再有自定义：对话框只认天赋那一步的暗号，其余一律退回选项。
     （进入游戏之后的自定义行动不受影响，仍走 GAME.ACT.custom。） */
  function custom(st, step, raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return { ok: false, msg: '对话框是空的：建卡阶段请用字母选项。' };
    if (step === 'talent') {
      var TL = tal(st);
      if (s.replace(/\s|　/g, '') === TAL_KEY) {
        TL.mode = 'free'; TL.stage = 'grade'; TL.grade = null; TL.picked = []; TL.unlocked = true;
        return { ok: true, keep: true, msg: '暗号对上了。这一步不再抽选：' + ['SSS', 'A', 'B', 'C', 'D'].join(' / ') +
          ' 五档随你翻，最多挑 ' + TAL_FREE_MAX + ' 项。', infoPanel: freeUnlockPanel(st) };
      }
      return { ok: false, msg: '抽到的天赋不能自己改。要换一组就按字母再抽一次（最多五次）。' };
    }
    return { ok: false, msg: '进入游戏之前不接受自己写内容：这一步请按字母从选项里选。' };
  }
  function fuzzy(list, s) {
    var q = String(s).trim();
    var i;
    for (i = 0; i < (list || []).length; i++) if (list[i].name === q || list[i].id === q) return list[i];
    for (i = 0; i < (list || []).length; i++) {
      var y = list[i];
      if ((y.name && y.name.indexOf(q) >= 0) || (q.length > 1 && y.name && q.indexOf(y.name) >= 0)) return y;
      if (y.sub && y.sub.indexOf(q) >= 0) return y;
    }
    return null;
  }
  function parseAttrs(s) {
    var map = { '力': 'str', '敏': 'dex', '体': 'con', '智': 'int', '感': 'wis', '魅': 'cha',
      '力量': 'str', '敏捷': 'dex', '体质': 'con', '智力': 'int', '感知': 'wis', '魅力': 'cha',
      str: 'str', dex: 'dex', con: 'con', int: 'int', wis: 'wis', cha: 'cha' };
    var out = {}, found = 0;
    var re = /(力量|敏捷|体质|智力|感知|魅力|力|敏|体|智|感|魅|str|dex|con|int|wis|cha)\s*[:：]?\s*(\d{1,2})/gi;
    var m;
    while ((m = re.exec(s))) { var k = map[m[1]] || map[m[1].toLowerCase()]; if (k) { out[k] = parseInt(m[2], 10); found++; } }
    if (found >= 6) return out;
    var nums = s.match(/\d{1,2}/g);
    if (nums && nums.length >= 6) {
      var keys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      var o2 = {};
      keys.forEach(function (k, i) { o2[k] = parseInt(nums[i], 10); });
      return o2;
    }
    return null;
  }

  /* ---------------- 角色卡预览 ---------------- */
  function preview(st) {
    var p = st.create.picks;
    var race = ENG.char.raceById(p.raceId), cls = ENG.char.classById(p.clsId);
    var attrs = {}; for (var k in (p.attrs || {})) attrs[k] = p.attrs[k];
    ENG.char.applyRaceBonus(attrs, race, ['str', 'con']);
    var L = [];
    L.push(PANEL.b(p.name || '（未取名）', '#A87E2E') + '\\quad ' + PANEL.t(p.gender + ' · ' + race.name + ' · ' + cls.name, '#4A4458'));
    L.push(PANEL.rule('#E0B45A', 6));
    var a1 = [], a2 = [];
    ENG.ATTR_KEYS.forEach(function (kk, i) {
      var s = PANEL.t(ENG.attrCN(kk) + ' ' + attrs[kk], '#4A4458') + PANEL.small('（' + (ENG.attrMod(attrs[kk]) >= 0 ? '+' : '') + ENG.attrMod(attrs[kk]) + '）');
      (i < 3 ? a1 : a2).push(s);
    });
    L.push(a1.join('\\quad ')); L.push(a2.join('\\quad '));
    L.push(PANEL.rule('#E0B45A', 6));
    L.push(PANEL.kv('身份', p.identityName || '—') + (p.identityCustom ? PANEL.small('（自创）', '#8F74B8') : ''));
    /* 注意：kv 的值参数里不能再塞一条命令（渲染器读参数时会把它当普通文字吐出来），
       标记要作为同一行的并列片段拼在参数之外。 */
    L.push(PANEL.kv('背景', (p.bgName || '—') + '（' + (((p.bgObj && p.bgObj.skills) || ((WD.BACKGROUNDS || []).filter(function (x) { return x.id === p.bgId; })[0] || {}).skills) || []).join('、') + '）'));
    if (p.bgCustom) L[L.length - 1] += '\\quad ' + PANEL.small('（自创）', '#8F74B8');
    if (p.raceObj) L.push(PANEL.kv('血统', p.raceObj.life + ' · ' + p.raceObj.height + ' · 速度 ' + p.raceObj.speed, '#9A8FA8', '#5FA98A'));
    if (p.clsObj) L.push(PANEL.kv('职业底子', '生命骰 ' + p.clsObj.hpDie + ' · ' + (p.clsObj.caster ? '施法者' : '非施法者') + ' · ' + p.clsObj.source, '#9A8FA8', '#5FA98A'));
    /* 自创条目的背景文字 */
    var blurbs = [];
    [p.raceObj, p.clsObj, p.identityObj, p.bgObj, p.alignObj, p.nationObj].forEach(function (o) {
      if (o && o.custom && o.blurb) o.blurb.forEach(function (line) { blurbs.push(line); });
    });
    blurbs.slice(0, 8).forEach(function (line) { L.push(PANEL.small('　' + line, '#4A4458')); });
    /* 天赋：抽到的一组全部列出（等级 + 一句话） */
    var tAll = (p.talents && p.talents.length) ? p.talents : (p.talent ? [p.talent] : []);
    var tD = p.talentDraw;
    L.push(PANEL.kv('天赋来源', tD ? (tD.free ? ('自由选择 ' + tD.n + ' 项（暗号解锁）') : ('抽选第 ' + tD.which + ' 次 / 共抽 ' + tD.times + ' 次 · ' + tD.cn)) : '—', '#9A8FA8', '#8F74B8'));
    if (!tAll.length) L.push(PANEL.kv('天赋', '—'));
    tAll.forEach(function (t) {
      L.push(PANEL.kv('天赋 · ' + t.grade, t.name + '　' + (t.desc || ''), '#9A8FA8', '#4A4458'));
    });
    L.push(PANEL.kv('阵营', p.alignName || '—'));
    var info = p.regionName ? GEO.regionInfo(p.regionName) : null;
    L.push(PANEL.kv('起点地区', (p.regionName || '—') + (info ? '（' + info.nationName + ' · ' + info.position + '）' : '')));
    if (info && info.nations.length) {
      L.push(PANEL.kv('附近国家', info.nations.map(function (n) { return n.name + '（' + n.dir + ' · ' + n.far + '）'; }).join('　'), '#9A8FA8', '#4A4458'));
    }
    L.push(PANEL.kv('开篇', (p.opening ? p.opening.name + ' · ' + (p.opening.place || '') : '—')));
    L.push(PANEL.kv('初始装备', ((cls.kits && cls.kits[0] && cls.kits[0].items) || []).join(' + ')));
    if (cls.custom) {
      var kit = (cls.kits && cls.kits[0] && cls.kits[0].items) || [];
      kit.slice(0, 4).forEach(function (nm) {
        var it = (global.IMPROV ? IMPROV.item(nm) : null);
        if (it) L.push(PANEL.small('　' + nm + '：' + it.kind + ' · ' + it.price + ' GP · ' + it.desc, '#C0863E'));
      });
    }
    L.push(PANEL.kv('起始金币', '2d4 x 10 GP（另计身份加成）', '#9A8FA8', '#D9AE4E'));
    return PANEL.panel({ theme: 'gold', title: '角 色 卡 · 待 确 认', lines: L, foot: '确认后进入艾尔德兰；血统与身份不可再改。' });
  }

  global.CREATE = {
    STEPS: STEPS, begin: begin, node: node, pick: pick, custom: custom, cur: cur,
    preview: preview, namesFor: namesFor, parseAttrs: parseAttrs, fuzzy: fuzzy,
    keyFor: keyFor, customKey: customKey, worldMapPanel: worldMapPanel
  };
})(window);
