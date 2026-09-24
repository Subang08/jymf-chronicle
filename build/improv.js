/* ============================================================
   自创条目生成器
   玩家在「自定义」里写的东西，不能因为不在册就被拒。
   这里按关键词 + 当前状态，推出一份与设定集同构的条目：
   数值（属性加成／生命骰／速度）、物品（初始装备包／随身物）、
   以及背景文字、状态说明与物品介绍，供角色卡与状态栏直接使用。
   全部确定性生成（同一输入同一结果），不调用随机。
   ============================================================ */
(function (global) {
  'use strict';

  var WD = global.WD || {}, GEO = global.GEO;
  function hash(s) {
    var h = 2166136261;
    String(s).split('').forEach(function (c) { h ^= c.charCodeAt(0); h = (h * 16777619) >>> 0; });
    return h >>> 0;
  }
  function pickBy(list, seed, salt) { return list[(seed + (salt || 0)) % list.length]; }

  /* ---------------- 种族 ---------------- */
  var RACE_KEYS = [
    { id: 'dragon', re: /龙|竜|dragon/i, bonus: { str: 2, cha: 1 }, speed: 30, size: '中型',
      height: '6-7 英尺', life: '600-1500 年',
      traits: '血里带着龙的东西：鳞片、吐息，还有不肯低头的脾气。',
      society: '多半独居，或依附某个龙裔家族。', homeland: '南方的龙裔地界',
      note: '吐息是本能，不是法术；情绪上来时先烫到自己。' },
    { id: 'elf', re: /精灵|妖精|仙|elf|fae/i, bonus: { dex: 2, int: 1 }, speed: 30, size: '中型',
      height: '5.5-6.5 英尺', life: '400-900 年',
      traits: '天生会入定，四小时顶别人一夜睡眠；眼睛在暗处比人好使。',
      society: '按母系或议会过日子，辈分比年纪重要。', homeland: '森林或白色城邦',
      note: '外人看你先是「精灵」，然后才是你。' },
    { id: 'dwarf', re: /矮人|侏儒|dwarf|gnome/i, bonus: { con: 2, str: 1 }, speed: 25, size: '中型',
      height: '4-4.5 英尺', life: '250-400 年',
      traits: '骨骼密度高，毒素与魔法都难上身；黑暗里能看清六十尺。',
      society: '氏族制，账目与恩怨都记得极清楚。', homeland: '北方山脉的地下城',
      note: '酒量比个子大得多。' },
    { id: 'beast', re: /兽|狼|狮|虎|豹|猫|狐|熊|beast|cat|wolf|lion/i, bonus: { str: 2, dex: 1 }, speed: 35, size: '中型',
      height: '5.5-7 英尺', life: '80-200 年',
      traits: '耳朵与尾巴藏不住情绪；嗅觉辨人，夜里看得比白天清楚。',
      society: '按族裔与荣誉结社，认亲不认法。', homeland: '草原、荒原或边境林',
      note: '别人先看你的耳朵，再听你说话。' },
    { id: 'winged', re: /天使|翼|羽|鸟|天使|angel|wing/i, bonus: { cha: 2, wis: 1 }, speed: 30, size: '中型',
      height: '5.5-6.5 英尺', life: '300-800 年',
      traits: '背上有一对能收起来的翼，滑翔没问题，长途飞行伤身。',
      society: '多与圣光教会或某个神系有旧约。', homeland: '高处或圣所附近',
      note: '翅膀一露，身份就瞒不住了。' },
    { id: 'fiend', re: /恶魔|魔|鬼|堕|妖|fiend|demon|devil/i, bonus: { cha: 2, int: 1 }, speed: 30, size: '中型',
      height: '5.5-6.5 英尺', life: '200-600 年',
      traits: '血里有深渊或下层位面的东西；对火焰与毒素耐受。',
      society: '不被任何教会接纳，靠契约与交易活着。', homeland: '无',
      note: '圣水烫手，教堂门口过不去。' },
    { id: 'undead', re: /不死|亡灵|骨|尸|幽|骸|undead|skeleton|ghost/i, bonus: { con: 2, str: 1 }, speed: 30, size: '中型',
      height: '5.5-6.5 英尺', life: '不计年',
      traits: '不必呼吸与进食，痛觉迟钝；圣光与银器伤得到你。',
      society: '死亡教团或独自游荡。', homeland: '灰雾平原一类的边地',
      note: '活人怕你，你也怕火。' },
    { id: 'element', re: /元素|火|水|风|土|雷|冰|element|flame|frost/i, bonus: { int: 1, con: 1, cha: 1 }, speed: 30, size: '中型',
      height: '5-6 英尺', life: '300-1000 年',
      traits: '身体是元素位面挤出来的：对同类元素亲和，对相反元素脆弱。',
      society: '多与法师公会有往来。', homeland: '元素混沌或四大位面',
      note: '情绪会写在体表上。' },
    { id: 'construct', re: /机械|构装|石像|傀儡|齿轮|construct|golem|automaton/i, bonus: { con: 2, str: 1 }, speed: 25, size: '中型',
      height: '6-7 英尺', life: '不计年',
      traits: '不需要睡眠与食物，靠驱动核心行动；修理比治疗更管用。',
      society: '多半有主人，或者正在找主人。', homeland: '制造你的那座工坊',
      note: '核心一裂，就是葬礼。' },
    { id: 'giant', re: /巨人|巨魔|食人魔|巨|giant|troll|ogre/i, bonus: { str: 2, con: 2 }, speed: 35, size: '大型',
      height: '8-12 英尺', life: '200-600 年',
      traits: '骨架与力气远超常人；门窗与马匹都得挑大一号的。',
      society: '氏族或部落，讲力气也讲辈分。', homeland: '山脉与荒原',
      note: '低头进门是对你的第一课。' },
    { id: 'aquatic', re: /海|鱼|蛇|娜迦|水族|深海|naga|mer|fish/i, bonus: { wis: 2, dex: 1 }, speed: 25, size: '中型',
      height: '5-7 英尺', life: '200-400 年',
      traits: '水下呼吸与游泳是天生的；离水久了皮肤会干裂。',
      society: '深海或沼泽的城邦，按潮汐记事。', homeland: '维兰之海或无尽之海',
      note: '淡水与海水都能喝，酒不行。' },
    { id: 'plant', re: /植物|树|花|藤|木|plant|tree|dryad/i, bonus: { con: 2, wis: 1 }, speed: 25, size: '中型',
      height: '5-6.5 英尺', life: '150-500 年',
      traits: '晒太阳就能补回一半的精力；怕火，也怕盐。',
      society: '与自然之环或德鲁伊结社亲近。', homeland: '古老林地',
      note: '伤口结痂像树皮。' },
    { id: 'slime', re: /史莱姆|软|黏液|胶|slime|ooze/i, bonus: { con: 2, dex: 1 }, speed: 20, size: '中型',
      height: '4-6 英尺（可压扁）', life: '50-300 年',
      traits: '能挤过比身体窄的缝，钝器打你没什么用，怕火与盐。',
      society: '几乎没有社会。', homeland: '地下的湿处',
      note: '被人当成怪物的时候比被当人时多。' },
    { id: 'spirit', re: /灵|魂|精神|影|梦|spirit|shade|dream/i, bonus: { wis: 2, cha: 1 }, speed: 30, size: '中型',
      height: '5-6 英尺（虚实不定）', life: '不计年',
      traits: '半身在别处：能穿薄的墙，也会被圣光与驱邪逼退。',
      society: '与命运先知会或死亡教团有牵连。', homeland: '无',
      note: '镜子里有时看不到自己。' }
  ];

  function improvRace(name, st) {
    var seed = hash(name);
    var hit = null;
    RACE_KEYS.forEach(function (k) { if (!hit && k.re.test(name)) hit = k; });
    var life = hit ? hit.life : pickBy(['60-90 年（与人族相仿）', '90-160 年（比人族长些）', '200-400 年（算得上长寿）'], seed, 1);
    var height = hit ? hit.height : pickBy(['5.5-6.5 英尺', '5-6 英尺', '6-7 英尺'], seed, 3);
    var speed = hit ? hit.speed : pickBy([30, 30, 25, 35], seed, 5);
    var size = hit ? hit.size : '中型';
    var bonus = hit ? Object.assign({}, hit.bonus) : { any: 1 };
    var blurb = hit
      ? [name + '：不在册的血统，按' + (hit.id === 'dragon' ? '龙' : hit.id === 'elf' ? '精灵' : hit.id === 'dwarf' ? '矮人' : hit.id === 'beast' ? '兽类' : '异种') + '的底子算。',
         hit.traits, hit.society + '　' + hit.note]
      : [name + '：不在册的血统，按人族偏上的标准算——寿数、体格与常人相仿，只是名声另算。',
         '把它写进角色卡，就当这片大陆上确实有这一支；数值按人族的规矩走。'];
    return {
      id: 'custom-race-' + seed.toString(36), name: name, sub: '自创血统', height: height, life: life,
      traits: (hit ? hit.traits : '与常人相仿的体格，寿数也不出奇。'),
      society: (hit ? hit.society : '散居各地，没有自己的国度。'),
      homeland: (hit ? hit.homeland : '说不清'),
      speed: speed, size: size, bonus: bonus, custom: true, blurb: blurb,
      note: hit ? hit.note : ''
    };
  }

  /* ---------------- 职业 ---------------- */
  var CLS_KEYS = [
    { id: 'wizard', re: /法|术|咒|魔|元|秘|奥|wizard|mage|magic/i, source: '奥术', core: '智力 · 法术书 · 准备施法',
      subs: ['防护', '咒法', '预言', '塑能'], pros: '法术选择最广，遗迹与古代文字只有他们读得完整',
      cons: '体质薄弱，近战完全无能', hpDie: 'd6', caster: true, attr: 'int', kit: ['法杖', '法术书', '普通长袍', '材料包'] },
    { id: 'fighter', re: /剑|刀|战|武|枪|斧|盾|骑|fence|blade|warrior|knight/i, source: '战职', core: '力量／敏捷 · 所有武器与护甲',
      subs: ['武器大师', '盾卫者', '勇士'], pros: '战斗续航极强，什么兵器都拿得动',
      cons: '没有超凡手段，面对魔法时脆弱', hpDie: 'd10', caster: false, attr: 'str', kit: ['链甲', '长剑', '盾牌'] },
    { id: 'ranger', re: /弓|猎|游侠|野|追|ranger|hunter|archer/i, source: '自然', core: '敏捷／感知 · 双武器／弓箭',
      subs: ['猎人', '驯兽师', '守望者'], pros: '地形适应，与自然生物说得上话',
      cons: '输出不如纯战士和法师', hpDie: 'd10', caster: false, attr: 'dex', kit: ['皮甲', '长弓', '两把短剑'] },
    { id: 'rogue', re: /盗|刺|影|潜|偷|锁|rogue|thief|assassin/i, source: '诡术', core: '敏捷 · 潜行、暗杀、开锁',
      subs: ['刺客', '盗贼', '诡术师'], pros: '爆发力极强，躲藏能力顶尖',
      cons: '正面战斗能力弱', hpDie: 'd8', caster: false, attr: 'dex', kit: ['皮甲', '两把匕首', '盗贼工具'] },
    { id: 'cleric', re: /牧|祭|神|光|誓|圣|教|cleric|priest|paladin/i, source: '神术', core: '感知／魅力 · 信仰施法',
      subs: ['生命', '战争', '光', '暗'], pros: '治疗与伤害兼备，可穿中甲',
      cons: '缺乏位移和控场法术', hpDie: 'd8', caster: true, attr: 'wis', kit: ['链甲', '钉头锤', '圣徽'] },
    { id: 'druid', re: /德|自然|树|兽|月|梦|druid|nature/i, source: '自然', core: '感知 · 自然施法',
      subs: ['大地结社', '月之结社', '梦境结社'], pros: '变形、自然法术、治疗与控场兼备',
      cons: '金属禁忌，城市中受限制', hpDie: 'd8', caster: true, attr: 'wis', kit: ['木盾', '木杖', '草药包'] },
    { id: 'bard', re: /歌|诗|吟|舞|乐|琴|bard|song|dance/i, source: '奥术', core: '魅力 · 音乐施法',
      subs: ['勇气', '学识', '剑舞', '魅惑'], pros: '全能，擅长社交与收集消息',
      cons: '输出能力有限', hpDie: 'd8', caster: true, attr: 'cha', kit: ['皮甲', '长剑', '乐器'] },
    { id: 'barbarian', re: /狂|怒|蛮|血|战吼|barbar|berserk/i, source: '战职', core: '力量／体质 · 狂怒',
      subs: ['狂战士', '图腾战士'], pros: '血量最厚，输出恐怖',
      cons: '战斗后极度虚弱，不能穿重甲', hpDie: 'd12', caster: false, attr: 'str', kit: ['皮甲', '巨斧', '两把手斧'] },
    { id: 'necromancer', re: /死|亡|骨|尸|魂|冥|necro|death/i, source: '奥术', core: '智力 · 死灵法术',
      subs: ['操骨', '缚魂'], pros: '能差遣死者，也算得清命数',
      cons: '任何教会都容不下；死灵系属禁忌', hpDie: 'd6', caster: true, attr: 'int',
      kit: ['法杖', '法术书', '灰色长袍'], forbidden: '死灵' },
    { id: 'monk', re: /僧|武僧|拳|气|苦修|monk|fist/i, source: '战职', core: '敏捷／感知 · 徒手与气',
      subs: ['四象', '暗影', '开阳'], pros: '不依赖兵器与甲胄，动作快得离谱',
      cons: '缺了气就只是个人', hpDie: 'd8', caster: false, attr: 'dex', kit: ['短棍', '布衣', '行囊'] }
  ];
  function improvClass(name, st) {
    var seed = hash(name), hit = null;
    CLS_KEYS.forEach(function (k) { if (!hit && k.re.test(name)) hit = k; });
    var base = hit || { id: 'fighter', source: '战职', core: '力量／敏捷 · 武器与护甲', subs: ['自成一派'],
      pros: '能打，也肯学', cons: '没有哪一门特别出挑', hpDie: 'd10', caster: false, attr: 'str', kit: ['皮甲', '长剑'] };
    var subs = hit ? base.subs.slice(0, 3) : [pickBy(['独门', '野路子', '游学'], seed, 2) + '一支'];
    var blurb = [
      name + '：算作' + (base.source === '奥术' ? '奥术' : base.source === '神术' ? '神术' : base.source === '自然' ? '自然' : base.source === '诡术' ? '诡术' : '战职') +
      '一脉，生命骰按 d' + String(base.hpDie).replace('d', '') + ' 算。',
      '核心：' + (hit ? base.core : '力量／敏捷 · 自成一派的手法') + '　擅长：' + base.pros,
      '短处：' + base.cons + (base.forbidden ? '　而且这是禁忌的门类（' + base.forbidden + '）。' : '')
    ];
    return {
      id: 'custom-cls-' + seed.toString(36), name: name, source: base.source,
      core: (hit ? base.core : '力量／敏捷 · 自成一派的手法'), subs: subs,
      pros: base.pros, cons: base.cons, hpDie: base.hpDie, caster: !!base.caster,
      casterAttr: base.attr, kits: [{ name: '自备行装', items: base.kit.slice() }],
      custom: true, forbidden: base.forbidden || null, blurb: blurb
    };
  }

  /* ---------------- 身份 ---------------- */
  var ID_KEYS = [
    { re: /贵族|少爷|小姐|爵士|noble|lord/i, skills: ['历史', '说服'], gold: 40, desc: '姓氏还在，产业没了；认得你的人比愿意借你钱的人多。' },
    { re: /骑士|兵|军|武|knight|soldier/i, skills: ['运动', '威吓'], gold: 15, desc: '吃过军粮，懂得队列与口令，也懂得什么时候该退。' },
    { re: /学徒|学生|书|学|apprentice|student/i, skills: ['奥秘', '历史'], gold: 12, desc: '抄过书、守过夜、替导师背过锅。' },
    { re: /佣兵|浪人|游|mercenary/i, skills: ['运动', '觉察'], gold: 18, desc: '打过败仗，活着，且不想再提。' },
    { re: /猎|山|林|hunter/i, skills: ['生存', '隐匿'], gold: 8, desc: '靠山吃山，知道哪种脚印值得跟。' },
    { re: /孤儿|流浪|乞|街|orphan|street/i, skills: ['隐匿', '巧手'], gold: 3, desc: '城邦底层长大，认得每条暗巷。' },
    { re: /水手|船|海|sailor/i, skills: ['运动', '觉察'], gold: 10, desc: '在维兰之海与无尽之海之间来回过几趟。' },
    { re: /商|贩|trad|merchant/i, skills: ['洞悉', '说服'], gold: 35, desc: '算得出各地差价，也看得出谁在虚张声势。' },
    { re: /匠|工|铁|smith|artisan/i, skills: ['运动', '调查'], gold: 12, desc: '手上有茧，看得出东西的成色。' },
    { re: /僧|祭|牧|教|priest|monk/i, skills: ['宗教', '洞悉'], gold: 6, desc: '信仰还没被检验过。' },
    { re: /医|药|herb|healer/i, skills: ['医药', '自然'], gold: 10, desc: '见过太多救不回来的人。' },
    { re: /贼|盗|扒|thief/i, skills: ['巧手', '隐匿'], gold: 9, desc: '手上的活计见不得光，但管用。' },
    { re: /乐|歌|舞|bard|singer/i, skills: ['表演', '说服'], gold: 7, desc: '靠嘴和手吃饭，走到哪儿都能凑一桌。' }
  ];
  function improvIdentity(name, st) {
    var seed = hash(name), hit = null;
    ID_KEYS.forEach(function (k) { if (!hit && k.re.test(name)) hit = k; });
    var skills = hit ? hit.skills.slice() : [pickBy(WD.SKILLS || ['生存'], seed, 1), pickBy(WD.SKILLS || ['洞悉'], seed, 4)];
    var gold = hit ? hit.gold : 5 + (seed % 40);
    var blurb = [
      name + '：按这行当给你配了两样拿手的活计（' + skills.join('、') + '）与 ' + gold + ' GP 起步的盘缠。',
      hit ? hit.desc : '这一行的门道不必写在纸上：' + name + '的日子，靠的是手上的活和眼力。'
    ];
    return { id: 'custom-id-' + seed.toString(36), name: name, desc: hit ? hit.desc : ('自定的出身：' + name + '。'),
      skills: skills, gold: gold, custom: true, blurb: blurb };
  }

  /* ---------------- 背景 ---------------- */
  var BG_KEYS = [
    { re: /贵族|noble/i, skills: ['历史', '说服'], item: '家徽戒指' },
    { re: /兵|军|soldier/i, skills: ['运动', '威吓'], item: '军牌' },
    { re: /学|书|scholar/i, skills: ['奥秘', '历史'], item: '旧地图' },
    { re: /流浪|孤儿|街/i, skills: ['隐匿', '巧手'], item: '破旧斗篷' },
    { re: /商|trad/i, skills: ['洞悉', '说服'], item: '天秤' },
    { re: /猎|hunt/i, skills: ['生存', '隐匿'], item: '捕兽夹' },
    { re: /僧|祭|教|priest/i, skills: ['宗教', '洞悉'], item: '圣徽' },
    { re: /匠|工|artisan/i, skills: ['运动', '调查'], item: '工具套装' },
    { re: /水手|海|sailor/i, skills: ['运动', '觉察'], item: '旧罗盘' },
    { re: /赌|骗|cheat|gambl/i, skills: ['巧手', '洞悉'], item: '一副灌铅骰子' },
    { re: /医|药|heal/i, skills: ['医药', '自然'], item: '药囊' },
    { re: /乐|歌|诗|bard/i, skills: ['表演', '说服'], item: '旧琴' },
    { re: /逃|罪|囚|犯/i, skills: ['隐匿', '生存'], item: '断开的脚镣' },
    { re: /猎魔|屠|赏金|bounty/i, skills: ['调查', '生存'], item: '通缉令抄本' }
  ];
  function improvBackground(name, st) {
    var seed = hash(name), hit = null;
    BG_KEYS.forEach(function (k) { if (!hit && k.re.test(name)) hit = k; });
    var skills = hit ? hit.skills.slice() : [pickBy(WD.SKILLS || ['生存'], seed, 2), pickBy(WD.SKILLS || ['说服'], seed, 6)];
    var item = hit ? hit.item : pickBy(['旧信', '半张地图', '磨损的护身符', '一本笔记', '拓片'], seed, 3);
    var blurb = [
      name + '：给你两门熟练（' + skills.join('、') + '）和一件舍不得扔的旧物（' + item + '）。',
      hit ? ('这号背景的人，多半随身带着' + item + '——不一定值钱，但能证明你从哪儿来。')
        : ('旧物是' + item + '；它值不了几个钱，却总在你要做决定的时候被摸到。')
    ];
    return { id: 'custom-bg-' + seed.toString(36), name: name, skills: skills, item: item, custom: true, blurb: blurb };
  }

  /* ---------------- 阵营 ---------------- */
  function improvAlign(name) {
    var ls = WD.ALIGNMENTS || [];
    var s = String(name);
    var law = /守序|秩序|律|law/i.test(s) ? 'L' : (/混乱|自由|chaos/i.test(s) ? 'C' : 'N');
    var good = /善|好|光|正|good/i.test(s) ? 'G' : (/恶|坏|邪|evil|dark/i.test(s) ? 'E' : 'N');
    var want = law + good;
    var hit = null;
    ls.forEach(function (a) { if (!hit && a.id === want) hit = a; });
    if (!hit) ls.forEach(function (a) { if (!hit && a.id === 'TN') hit = a; });
    var blurb = [name + '：归到「' + hit.name + '（' + hit.id + '）」这一格算。',
      hit.core + '　典型代表：' + (hit.who || '') + '。'];
    return { id: hit.id, name: hit.name, core: hit.core, who: hit.who, custom: true, given: name, blurb: blurb };
  }

  /* ---------------- 物品（初始装备里没在册的东西） ---------------- */
  function improvItem(name) {
    var seed = hash(name), kind = 'gear', price = 2, weight = 2, desc = '';
    if (/药水|药剂|丹|potion/i.test(name)) { kind = 'consumable'; price = 50; weight = 0.5; desc = '喝下去能顶一阵子；具体管什么用，得看是谁配的。'; }
    else if (/卷轴|scroll/i.test(name)) { kind = 'consumable'; price = 40; weight = 0.2; desc = '一次性的法术，念完就烧成灰。'; }
    else if (/剑|刀|斧|锤|矛|枪|弓|匕首|棍|杖|sword|axe|bow/i.test(name)) { kind = 'weapon'; price = 25; weight = 3; desc = '趁手的家伙，保养得还行。'; }
    else if (/甲|盾|盔|铠|armor|shield/i.test(name)) { kind = 'armor'; price = 20; weight = 12; desc = '挡得住一刀，挡不住一辈子。'; }
    else if (/戒指|项链|护符|符|ring|amulet/i.test(name)) { kind = 'gear'; price = 30; weight = 0.1; desc = '贴身带着的东西，多半有来历。'; }
    else if (/干粮|酒|食物|肉|面包|food|wine/i.test(name)) { kind = 'gear'; price = 1; weight = 1; desc = '能填肚子，也能换人情。'; }
    else if (/绳|灯|工具|包|袋|罗盘|地图|火|盒|箱|tool|rope|lamp|box/i.test(name)) { kind = 'gear'; price = 5; weight = 2; desc = '用得上，也容易被忘在旅店里。'; }
    /* 认不出类别的：按名字定一句，物品栏里不留空 */
    if (!desc) desc = pickBy([
      '看不出门道，带着总没坏处。',
      '来历说不清，用处倒实在。',
      '别人塞给你的，你一直没扔。',
      '粗看平常，细看有点讲究。',
      '不值几个钱，紧要时救过急。'
    ], seed, 3);
    price = Math.max(1, Math.round(price * (0.8 + (seed % 7) / 10)));
    var blurb = ['『' + name + '』：不在物价表上，按同类作价 ' + price + ' GP，重 ' + weight + ' 磅。', desc];
    return { id: 'custom-item-' + seed.toString(36), name: name, kind: kind, price: price, weight: weight,
      desc: desc, custom: true, blurb: blurb };
  }

  /* ---------------- 国度 ---------------- */
  function improvNation(name) {
    var seed = hash(name);
    var gov = pickBy(['氏族制', '城邦自治', '商人议会', '军政府', '神权', '无定', '长老会'], seed, 1);
    var trait = pickBy([
      '自立门户的一支，不向七王国纳贡，靠地利与拳头站住脚。',
      '山里或水边的小国，人口不多，外人不常来。',
      '夹在两大势力之间，靠左右逢源过日子。',
      '立国不久，规矩还没定全，谁的刀快谁说了算。'
    ], seed, 2);
    return { name: name, capital: pickBy(['山堡', '旧城', '渡口', '营地'], seed, 3), gov: gov, trait: trait,
      kind: 'custom', custom: true,
      blurb: [name + '：' + gov + '，' + trait, '在册的七王国与六族国度里没有这一号，就当它自己成了一国。'] };
  }

  /* ---------------- 天赋 ---------------- */
  var TAL_KEYS = [
    { re: /命|运|星|预|fate|destiny/i, effect: { special: 'reroll_first' },
      desc: '命运替你留了一次反悔的机会：每场战斗的第一次判定可以重掷，重掷的结果必须接受。' },
    { re: /死|亡|不灭|不朽|death|undying/i, effect: { special: 'death_door' },
      desc: '你在生死簿上被写错过一次。濒死时，生死豁免两次成功就能稳住。' },
    { re: /伤|血|铁|骨|体|stone|iron/i, effect: { hp: 10, special: 'delay_damage' },
      desc: '筋骨比常人结实，致命伤会晚一步发作——给你一次反应的机会。' },
    { re: /眼|识|知|察|watch|insight/i, effect: { checks: 2 },
      desc: '你习惯先看清楚再动手：所有检定 +2。' },
    { re: /速|风|影|闪|swift|wind/i, effect: { ac: 1, special: 'foresee_round' },
      desc: '反应快半拍：AC +1，战斗首轮先攻视为最高。' },
    { re: /力|巨|猛|strength|titan/i, effect: { attrs: { str: 2 }, dmg: 1 },
      desc: '力气是练出来的，也是天生的：力量 +2，伤害 +1。' },
    { re: /智|书|学|谋|lore|wisdom/i, effect: { attrs: { int: 1, wis: 1 }, special: 'xp_discount' },
      desc: '学东西比谁都快：智力与感知 +1，经验获取 +10%。' },
    { re: /魅|言|歌|voice|charm/i, effect: { attrs: { cha: 2 }, special: 'power_speech' },
      desc: '开口就有人听：魅力 +2，威吓与说服检定优势。' },
    { re: /契|约|誓|oath|pact/i, effect: { special: 'contract_bond' },
      desc: '签过的字都算数：契约对你更有力，交涉类检定优势。' },
    { re: /幸|财|金|币|luck|fortune/i, effect: { gold: 60, special: 'extra_hours' },
      desc: '运气和盘缠都不缺：起始金币 +60 GP，每日可用时间更长。' }
  ];
  function improvTalent(name, st) {
    var seed = hash(name), hit = null;
    TAL_KEYS.forEach(function (k) { if (!hit && k.re.test(name)) hit = k; });
    var eff = hit ? Object.assign({}, hit.effect) : { checks: 1, hp: 4 };
    var desc = hit ? hit.desc : '自定的天赋：靠着它，你在所有判定上比常人稳一点（检定 +1，生命上限 +4）。';
    var blurb = [name + '（SSS · 自创）：' + desc];
    return { id: 'custom-tal-' + seed.toString(36), name: name, grade: 'SSS', desc: desc, effect: eff,
      custom: true, blurb: blurb };
  }

  global.IMPROV = {
    hash: hash, race: improvRace, cls: improvClass, identity: improvIdentity,
    background: improvBackground, align: improvAlign, item: improvItem, nation: improvNation,
    talent: improvTalent,
    RACE_KEYS: RACE_KEYS, CLS_KEYS: CLS_KEYS, ID_KEYS: ID_KEYS, BG_KEYS: BG_KEYS, TAL_KEYS: TAL_KEYS
  };
})(window);
