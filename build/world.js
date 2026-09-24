(function (global) {
  'use strict';
  var WD = {};

  WD.COSMOS = [
    { name: '主物质位面', desc: '艾尔德兰大陆及周边海域。众星之母的身躯化作这片陆地，地脉魔法仍在岩层下流动，凡人在这里出生、劳作、病死。' },
    { name: '元素位面（四大）', desc: '火之位面、水之位面、风之位面、土之位面各自纯粹到无法久留：火之位面没有可呼吸的空气，水之位面没有可落脚的地面。四位面彼此挤压的地方形成元素混沌。' },
    { name: '圣光之庭', desc: '善良神祇的居所，光明与秩序的源头。圣光教会的祈祷从这里得到回应，回应者从不露面，只留下判词。' },
    { name: '深渊之渊', desc: '邪恶与混沌的深渊，恶魔的巢穴。封印每七年随赤月削弱一次，第三次恶魔战争的阴影正在这一侧聚集。' },
    { name: '中环位面', desc: '精灵的永恒森林、矮人的先祖大厅、亡者的灰雾平原并列于此。亡魂循雾而行，走完雾就归于骸骨之王的天平。' },
    { name: '时空裂隙', desc: '位面薄弱处，可跨界穿梭。进出的人带回过不属于本纪元的钱币与口音，也带回过年份错误的自己。' }
  ];

  WD.GODS = [
    { name: '圣光之主', domain: '正义、秩序、太阳', align: '守序善良', symbol: '金色圆盘', org: '圣光教会', creed: '教士在正午布道，把审判所的名单收在袖子里，先问罪，再给赦免。' },
    { name: '月之女士', domain: '魔法、智慧、月亮', align: '绝对中立', symbol: '银月', org: '法师公会（名义上）', creed: '法师先记星象再决定要不要回应祈祷，她的祭坛上摆的是星图与账本。' },
    { name: '战争之父', domain: '战争、勇气、荣耀', align: '混乱善良', symbol: '染血长剑', org: '各大骑士团', creed: '随军神父战前替骑兵按剑立誓，战后替死者收殓，不问谁先拔的刀。' },
    { name: '自然之母', domain: '生命、自然、野兽', align: '绝对中立', symbol: '橡树与鹿', org: '德鲁伊结社', creed: '结社成员不在石屋里过夜，向神交的是收成、林地边界与猎杀配额。' },
    { name: '命运编织者', domain: '命运、时间、预言', align: '绝对中立', symbol: '蛛网与纺锤', org: '命运先知会', creed: '先知只说日期与代价，不解释缘由，写完预言就封蜡，多问一句加一份钱。' },
    { name: '阴影之主', domain: '暗杀、秘密、夜', align: '混乱中立', symbol: '匕首与面具', org: '刺客兄弟会', creed: '兄弟会不在白天谈价钱，也不承认自己奉神之名，收据当场烧掉。' },
    { name: '深渊之喉', domain: '毁灭、贪婪、混沌', align: '混乱邪恶', symbol: '三叉舌', org: '被唾弃者', creed: '教徒在地窖里刻三叉舌，用活物作祭，教义只有一句：先毁掉，再谈分配。' },
    { name: '骸骨之王', domain: '死亡、永恒、安息', align: '绝对中立', symbol: '天平与骨杖', org: '死亡教团（地下）', creed: '教团替无人认领的尸体登记姓名、称重、下葬，收一枚铜币，不劝人信。' }
  ];

  WD.NATIONS = [
    { name: '晨曦王国', capital: '曙光城', gov: '世袭君主制', trait: '大陆最富庶，农业与贸易中心，圣光教会总部所在地', kind: 'human' },
    { name: '雄鹿王国', capital: '铁王座堡', gov: '世袭君主制', trait: '军事强国，骑士传统浓厚，与晨曦王国争霸数百年', kind: 'human' },
    { name: '哥特王国', capital: '高塔城', gov: '选举君主制', trait: '七位大选帝侯推举国王，法师公会在此影响力最强', kind: 'human' },
    { name: '北境共和国', capital: '白港城', gov: '商人议会制', trait: '寒冷但自由，由十二个大商人家族联合统治', kind: 'human' },
    { name: '南方联合王国', capital: '烈日城', gov: '分封制', trait: '多文化融合，与沙漠种族交往密切', kind: 'human' },
    { name: '洛林公国', capital: '玫瑰堡', gov: '公国制', trait: '紧邻精灵森林，文化优雅，盛产诗人与魔法', kind: 'human' },
    { name: '边境领', capital: '哨兵堡', gov: '军事总督制', trait: '抵抗兽人和北方野人的第一道防线', kind: 'human' },
    { name: '群山王国', capital: '铁砧大厅', gov: '山丘之王（选举）', trait: '矮人地下要塞群，掌控大陆八成珍稀矿脉', kind: 'race' },
    { name: '银冠王庭', capital: '星辉城', gov: '永恒女王', trait: '高等精灵魔法文明巅峰，拥有最多的古代知识', kind: 'race' },
    { name: '绿林议会', capital: '幽影堡', gov: '大德鲁伊议会', trait: '木精灵守护森林边界，排斥外来者', kind: 'race' },
    { name: '格瑞纳达', capital: '龙火城', gov: '龙裔皇帝', trait: '南方强权，以重型骑兵和火焰魔法闻名', kind: 'race' },
    { name: '幽暗地域', capital: '暗蛛城', gov: '蜘蛛女王', trait: '卓尔地底世界，奴隶贸易与暗杀之王', kind: 'race' },
    { name: '荒原部落', capital: '无固定', gov: '最强酋长', trait: '半兽人数百个游牧部落，每年劫掠边境', kind: 'race' }
  ];

  WD.ORGS = [
    { name: '法师公会', desc: '总部位于哥特王国高塔城，七位大法师组成枢密院，垄断高级法术传承。抄本借阅按环数计价，越级阅读要立契。' },
    { name: '圣光教会', desc: '总部位于晨曦王国曙光城，大主教为最高领袖，拥有审判所与圣骑士团。审判所的案卷公开，判决理由不公开。' },
    { name: '冒险者公会', desc: '遍布各个城市，认证冒险者等级（铁、铜、银、金、秘银、奥金），是获取任务与情报的核心枢纽。委托金先押在柜上，人回来才结算。' },
    { name: '秘银兄弟会', desc: '矮人主导的工匠组织，垄断附魔与锻造技术。学徒六年，出师要独立打一把不会崩口的剑。' },
    { name: '影之议会', desc: '由刺客兄弟会分裂出的组织，专注收集禁忌知识与神器。成员彼此以编号相称，档案里没有真名。' },
    { name: '自然之环', desc: '德鲁伊组织，守护古老林地与圣兽。边界以界石与兽径划定，越界伐木按株数索赔。' },
    { name: '深渊守望者', desc: '秘密结社，专门研究并封印恶魔与邪神。哨所建在封印之上，换防时只报人数，不报姓名。' }
  ];

  WD.SOURCES = [
    { name: '奥术', attr: '智力／魅力', how: '学习加冥想，法术书写进法术书，每日重新记忆', jobs: '法师、术士、吟游诗人' },
    { name: '神术', attr: '感知／魅力', how: '信仰加祈祷，神力按日发放，违誓即收回', jobs: '牧师、圣骑士、德鲁伊' },
    { name: '战职', attr: '力量／敏捷', how: '训练加实战，招式靠肌肉记住，断骨也算学费', jobs: '战士、游侠、野蛮人' },
    { name: '诡术', attr: '敏捷／智力', how: '天赋加技巧，靠手法、毒药与情报换命', jobs: '游荡者、刺客、幻术师' },
    { name: '自然', attr: '感知', how: '共鸣加契约，向林地与兽群交换使用权', jobs: '德鲁伊、游侠（部分）' }
  ];

  WD.LEVELS = [
    { name: '见习', range: [1, 3], stand: '刚入门', status: '学徒、新兵', life: '无' },
    { name: '初级', range: [4, 6], stand: '独当一面', status: '正式公会成员', life: '无' },
    { name: '中级', range: [7, 9], stand: '熟练者', status: '小有名气', life: '轻微延寿，十到二十年' },
    { name: '高级', range: [10, 12], stand: '精锐', status: '精英、副队长', life: '中等延寿，三十到五十年' },
    { name: '专家', range: [13, 15], stand: '一方强者', status: '公会高管、城主', life: '大幅延寿，约一百年' },
    { name: '大师', range: [16, 18], stand: '传奇门槛', status: '大法师、骑士团长', life: '可停止衰老' },
    { name: '传奇', range: [19, 20], stand: '活着的传说', status: '整个大陆知晓姓名', life: '寿命基本脱离凡俗；再往上为史诗（21+）与神话（25+），已不计入凡俗等级' }
  ];

  WD.STATUSES = [
    { name: '震慑', effect: '无法行动，自动失防' },
    { name: '昏迷', effect: '失去意识，直至受伤或唤醒' },
    { name: '束缚', effect: '移动为0，攻击有劣势' },
    { name: '麻痹', effect: '全豁免劣势，所有攻击自动暴击' },
    { name: '中毒', effect: '每回合受持续伤害，所有判定有劣势' },
    { name: '恐慌', effect: '必须远离恐惧源，无法主动靠近' },
    { name: '魅惑', effect: '无法攻击施法者，对施法者友善' },
    { name: '力竭', effect: '一至六级递减：检定减1、移速减半、生命上限减一成、攻击劣势、豁免劣势、六级昏迷' }
  ];

  WD.ALIGNMENTS = [
    { id: 'LG', name: '守序善良', core: '遵循法律，行善为准则', who: '圣骑士、宫廷法官' },
    { id: 'NG', name: '中立善良', core: '行善为主，不纠结法律', who: '平民英雄、治疗者' },
    { id: 'CG', name: '混乱善良', core: '以自由和良知为准', who: '反叛贵族、流浪英雄' },
    { id: 'LN', name: '守序中立', core: '遵循秩序，不问善恶', who: '矮人王、军团将领' },
    { id: 'TN', name: '绝对中立', core: '平衡是第一要义', who: '德鲁伊、命运先知' },
    { id: 'CN', name: '混乱中立', core: '纯个人自由', who: '独行侠、部分游荡者' },
    { id: 'LE', name: '守序邪恶', core: '以秩序达成邪恶目的', who: '暴君、魔鬼契约者' },
    { id: 'NE', name: '中立邪恶', core: '纯粹的自私自利', who: '刺客头目、奴隶贩子' },
    { id: 'CE', name: '混乱邪恶', core: '毁灭与混乱本身', who: '恶魔、狂信徒' }
  ];

  WD.REP_LEVELS = ['敌对', '冷淡', '中立', '友好', '尊敬', '崇拜'];

  WD.LANGS = [
    { name: '通用语', users: '全人类及跨种族贸易', script: '通用字母（源自古代帝国）', trait: '大陆最常用，不同王国口音差异极大，白港城的商人和烈日城的驼夫互相听得懂但都嫌对方难听' },
    { name: '精灵语（高等）', users: '高等精灵、贵族', script: '精灵花体符文', trait: '优雅多义，一首诗可有七种解读，法庭上靠断句定契约' },
    { name: '木精灵语', users: '木精灵、德鲁伊', script: '树皮刻痕符号', trait: '与鸟兽鸣叫相通，非精灵极难模仿，环内人用它报兽群方位' },
    { name: '矮人语', users: '矮人、秘银兄弟会', script: '棱角符文（刻于石上）', trait: '粗犷有力，每个词都有凿刻感，报价与骂人用的是同一套词根' },
    { name: '龙语', users: '龙族、龙裔、高阶法师', script: '龙爪印痕（灼刻体）', trait: '每个字都含微弱魔力，误读可引发爆炸，法师抄写时按音节收费' },
    { name: '兽人语', users: '半兽人、荒原部落', script: '骨刻符号', trait: '简单直接，约四百个词汇，多数与战斗、牲畜和天气相关' },
    { name: '地底通用语', users: '卓尔、地精、黑暗生物', script: '触感符号（盲文式）', trait: '在完全黑暗中通过触摸读取，暗蛛城的契约都刻在扶手内侧' },
    { name: '深渊语', users: '恶魔、邪教徒', script: '扭曲熔岩体', trait: '正常生物念出会口腔溃烂，需通过意志豁免，守望者用死人喉咙朗读' }
  ];

  WD.DEAD_LANGS = [
    { name: '创世符文', desc: '众星之母创世时留下的原始文字，每个符文都是一个独立概念，如火、生、死。现存仅十二枚可辨识，多数铭刻在神器上，是根源力量的载体。' },
    { name: '帝国古语', desc: '帝国纪元泛大陆时代的官方语言，现代通用语由其简化而来。古代遗迹的铭文与法术书多以此书写，是法师必修科目，考不过不许借阅三环以上抄本。' },
    { name: '巨人语', desc: '巨人种族留下的符文系统，无人能完全解读。据信记载着元素位面的坐标，现存样本多为刻在十五尺以上岩壁的整段文字，需搭脚手架拓印。' }
  ];

  WD.DIALECTS = [
    { name: '晨曦王国口音', desc: '元音拉长，语速缓慢，被认为最标准。宫廷与教会的公文以此为准，外省人学说会被听出籍贯。' },
    { name: '北境口音', desc: '辅音生硬，短促有力，词汇中夹杂矮人语借词。谈价钱时一句话里能塞进三个凿刻词根。' },
    { name: '南方联合王国口音', desc: '尾音上扬，大量来自沙漠种族的外来词，称重与议价用的词比通用语细一倍。' },
    { name: '冒险者俚语', desc: '行话混着各地脏字。啃龙骨意为做高风险低回报的事；点蜡意为替人挡刀；结账叫清灰。' }
  ];

  WD.CRAFTS = [
    { name: '炼金术', attr: '智力', cost: '药剂材料、实验室', out: '药水、毒药、油', tiers: ['止血膏与驱虫油', '治疗微伤药水', '腐蚀毒与爆裂符文石', '治疗重伤药水、隐形药水', '飞行药水与贤者之石的仿制品'] },
    { name: '附魔', attr: '智力', cost: '魔法材料、符文', out: '魔法武器、护甲', tiers: ['磨亮符文刻线', '+1 武器', '+1 护甲与炽焰附魔', '+2 武器、抗火胸甲', '屠龙者一级的专属附魔'] },
    { name: '锻造', attr: '力量／敏捷', cost: '矿石、铁砧', out: '武器、护甲', tiers: ['修补农具与马蹄铁', '简单剑、长弓配件', '链甲与战斧', '板甲与矮人重锤', '山丘之王亲铸的仪仗武器'] },
    { name: '铭文', attr: '智力／敏捷', cost: '羊皮纸、魔法墨水', out: '卷轴、符文石', tiers: ['抄录戏法符纸', '1环法术卷轴', '3环法术卷轴', '5环法术卷轴', '帝国古语原典的完整摹本'] },
    { name: '草药学', attr: '感知', cost: '时间、田野考察', out: '药材识别与采集', tiers: ['认得十种常见草药', '配止血与退热的方子', '解毒剂与麻醉草', '在废土上找水与药', '培育只在赤月开花的品种'] },
    { name: '驯兽', attr: '魅力', cost: '时间、兽栏', out: '魔兽伙伴', tiers: ['驯服驮马与猎犬', '猎鹰与战犬', '狮鹫雏鸟（DC 18）', '双足飞龙的麻醉驯养', '与风元素领主立约'] },
    { name: '魔法烹饪', attr: '智力／感知', cost: '罕见食材', out: '增益食物', tiers: ['热汤与行军干粮', '抗寒炖菜', '熊胆汤与狮鹫蛋饼', '赤月菇烩肉，夜视八小时', '龙血酒，一杯换一天力气'] },
    { name: '宝石加工', attr: '敏捷', cost: '矿石、工具', out: '法术聚焦宝石', tiers: ['切割普通水晶', '打磨聚焦宝石', '镶嵌护符底座', '处理龙晶矿脉原石', '为神器重新校准十二枚创世符文'] }
  ];

  WD.CRAFT_TIERS = ['未入门', '初窥门径', '小有所成', '融会贯通', '登峰造极'];

  WD.MONEY = { cp: 1, sp: 100, gp: 1000, pp: 10000 };

  WD.PRICES = [
    { name: '简单剑／长弓', price: 25, unit: 'GP／件' },
    { name: '板甲（全身）', price: 1500, unit: 'GP／套' },
    { name: '旅店住宿（一夜）', price: 0.5, unit: 'GP 起／夜，上房可到 5 GP' },
    { name: '常见药水（治疗微伤）', price: 50, unit: 'GP／瓶' },
    { name: '1环法术卷轴', price: 40, unit: 'GP／卷，区间 25 至 50' },
    { name: '3环法术卷轴', price: 270, unit: 'GP／卷，区间 150 至 300' },
    { name: '5环法术卷轴', price: 750, unit: 'GP／卷，区间 500 至 1000' },
    { name: '普通坐骑（马）', price: 75, unit: 'GP／匹' },
    { name: '战马', price: 400, unit: 'GP／匹' },
    { name: '法师塔（最低层）', price: 5000, unit: 'GP 起／座，不含地契与结界' }
  ];

  WD.QUALITY = [
    { name: '凡品', desc: '普通物品，铁匠铺与杂货摊上随处可买', range: [1, 99] },
    { name: '精良', desc: '材质优秀的普通物品，出自有名字的匠人之手', range: [100, 500] },
    { name: '罕见', desc: '轻微附魔，能用，也会被认出来', range: [500, 2500] },
    { name: '稀有', desc: '强力附魔或古老物品，多数在私人手里流转', range: [2500, 10000] },
    { name: '史诗', desc: '传说级物品，一件可以买下半座城，也能引来整支佣兵团', range: [10000, 100000] },
    { name: '神器', desc: '神造物或世界级宝物，市面无价，只能以任务与代价换取', range: [100000, 999999999] }
  ];

  WD.SKILLS = ['运动', '体操', '巧手', '隐匿', '奥秘', '历史', '洞悉', '威吓', '调查', '医药', '自然', '觉察', '表演', '说服', '宗教', '生存', '驯兽', '游说'];

  WD.SPELL_LV = ['戏法', '1环', '2环', '3环', '4环', '5环', '6环', '7环', '8环', '9环', '传奇'];

  WD.BACKGROUNDS = [
    { id: 'bg-noble', name: '贵族', skills: ['历史', '说服'], item: '家徽戒指、精致服装' },
    { id: 'bg-soldier', name: '士兵', skills: ['运动', '威吓'], item: '军牌、旧武器' },
    { id: 'bg-scholar', name: '学者', skills: ['奥秘', '历史'], item: '笔记、旧地图' },
    { id: 'bg-urchin', name: '流浪儿', skills: ['隐匿', '巧手'], item: '破旧斗篷、藏匿点钥匙' },
    { id: 'bg-merchant', name: '商人', skills: ['洞悉', '说服'], item: '天秤、账簿' },
    { id: 'bg-hunter', name: '猎人', skills: ['生存', '隐匿'], item: '捕兽夹、动物毛皮' },
    { id: 'bg-acolyte', name: '侍僧', skills: ['宗教', '洞悉'], item: '圣徽、祈祷书' },
    { id: 'bg-artisan', name: '工匠', skills: ['调查'], item: '工具套装（铁匠、木工或宝石匠各一套）' },
    { id: 'bg-sailor', name: '水手', skills: ['运动', '觉察'], item: '旧罗盘、绳索' },
    { id: 'bg-hero', name: '民间英雄', skills: ['运动', '生存'], item: '纪念物、村民感谢信' }
  ];

  WD.IDENTITIES = [
    { id: 'id-ruined-noble', name: '破落贵族', desc: '家道中落，姓氏仍在，债务也在。典当行认得你的戒指，也认得你欠的数目。', skills: ['历史', '说服'], gold: 30 },
    { id: 'id-apprentice', name: '公会学徒', desc: '冒险者公会或法师公会的在册学徒，抄过三年书目，出过两次城。', skills: ['奥秘', '调查'], gold: 25 },
    { id: 'id-border-hunter', name: '边境猎人', desc: '靠山吃山，熟悉地形与野兽。知道哪种爪印要绕路，哪种血迹可以跟。', skills: ['生存', '觉察'], gold: 12 },
    { id: 'id-street-orphan', name: '街头孤儿', desc: '城邦底层长大，认得每条暗巷、每个不收钱的屋顶和每个收钱的守卫。', skills: ['隐匿', '巧手'], gold: 5 },
    { id: 'id-acolyte', name: '教会侍僧', desc: '圣光教会底层执事，信仰尚未被检验，先学会了记账与点灯。', skills: ['宗教', '医药'], gold: 15 },
    { id: 'id-caravan-guard', name: '商队护卫', desc: '跟着货车走遍大陆，见过各地物价，也见过货车翻在河谷里。', skills: ['运动', '洞悉'], gold: 40 },
    { id: 'id-sailor', name: '远洋水手', desc: '维兰之海与无尽之海的老手，会看云、会缝帆，也会在甲板上打架。', skills: ['运动', '觉察'], gold: 35 },
    { id: 'id-scholar', name: '学院学者', desc: '抄本、注疏、论文与通宵的灯。懂帝国古语，也懂欠导师多少人情。', skills: ['奥秘', '历史'], gold: 45 },
    { id: 'id-artisan', name: '匠人学徒', desc: '铁锤与炉火出身，手上有茧。师傅给的出师考题还差最后一道工序。', skills: ['调查', '运动'], gold: 20 },
    { id: 'id-mercenary', name: '佣兵游勇', desc: '打过败仗，活着，且不想再提。队伍散了，甲还在，账没结清。', skills: ['威吓', '运动'], gold: 18 }
  ];

  WD.TEMPLATES = [
    { name: '落难骑士', race: '人类', job: '战士', origin: '破落贵族', gold: 20, traits: ['家传佩剑', '一封旧信'] },
    { name: '法师学徒', race: '高等精灵', job: '法师', origin: '法师公会弟子', gold: 50, traits: ['导师推荐信', '一本空白法术书'] },
    { name: '荒原猎手', race: '半兽人', job: '游侠', origin: '边境部落', gold: 10, traits: ['祖传长弓', '一枚狼牙护符'] },
    { name: '阴影孤儿', race: '人类', job: '游荡者', origin: '自由城邦街头', gold: 5, traits: ['一把暗锁', '一张秘密地图'] },
    { name: '神眷者', race: '人类', job: '圣骑士', origin: '教会孤儿院', gold: 15, traits: ['圣徽', '一本手抄教典'] }
  ];

  WD.REGIONS = [
    { id: 'north-icefield', name: '北境冰原', terrain: '冰原', nation: '北境共和国', kind: 'wild', threat: [3, 10], desc: '雪线以北的冻土，一年有八个月走不了车队。积雪盖住沟壑，踩错一步就是十几尺深的裂缝。', landmarks: ['永冻线界碑', '冰原狼群巢穴', '冻湖上的商队遗骸'] },
    { id: 'dragonbone-mts', name: '龙骨山脉', terrain: '山脉', nation: '无主', kind: 'wild', threat: [9, 15], desc: '被圣光之矛钉入地心的恶龙骸骨露出地面的部分，肋条就是山脊。矿脉丰厚，进山的队伍约三分之一能带东西回来。', landmarks: ['肋骨隘口', '龙晶矿脉', '第七号废弃矿道'] },
    { id: 'silverpeak-mts', name: '银峰山脉', terrain: '山脉', nation: '银冠王庭', kind: 'wild', threat: [5, 12], desc: '银色花岗岩的峰线，高等精灵的白色城邦建在半山台地上。雪崩与落石杀的人比野兽多。', landmarks: ['雪崩槽', '巨鹰巢穴', '观星台废墟'] },
    { id: 'vilan-sea', name: '维兰之海', terrain: '海域', nation: '无主', kind: 'sea', threat: [3, 10], desc: '大陆西侧的内海，秋冬风浪封航三个月。商船按潮汐排班，海盗按商船排班。', landmarks: ['断桅礁', '白港灯塔', '走私船坞'] },
    { id: 'midland-plains', name: '中部平原', terrain: '平原', nation: '晨曦王国', kind: 'wild', threat: [1, 5], desc: '大陆的粮仓，麦田与官道连成一片，每隔三十里有一处驿站。盗匪多的年份，谷子长得最好。', landmarks: ['帝国旧道石桥', '九座风磨', '曙光城北关'] },
    { id: 'aesloren-forest', name: '艾索洛伦森林', terrain: '森林', nation: '绿林议会', kind: 'wild', threat: [3, 8], desc: '高等精灵语原意为永恒之绿。林线由木精灵巡逻队看守，越界伐木的记号会被逐株记下来。', landmarks: ['界石圈', '树城幽影堡', '狼群尾随的旧猎道'] },
    { id: 'hammer-mts', name: '铁锤山脉', terrain: '山脉', nation: '群山王国', kind: 'wild', threat: [4, 10], desc: '矮人的矿脉山，山腹被掏成要塞群与熔炉层。地表只剩矿渣堆、通风井与升降机井口。', landmarks: ['一号升降机', '熔渣河', '废弃锻炉区'] },
    { id: 'brass-desert', name: '黄铜沙漠', terrain: '沙漠', nation: '无主', kind: 'wild', threat: [6, 12], desc: '沙色发黄，正午的地表能把靴底烤软，入夜又降到冰点。商队靠星位与三处咸水井撑着走。', landmarks: ['三处咸水井', '风蚀石柱群', '沙下的城墙残段'] },
    { id: 'south-wastes', name: '南境荒原', terrain: '荒原', nation: '荒原部落', kind: 'wild', threat: [4, 10], desc: '干裂的红土与矮灌木，半兽人游牧部落按季节迁徙。他们不种地，按牲畜头数与水源算贫富。', landmarks: ['枯河床', '牲畜围栏遗骸', '边境哨塔残基'] },
    { id: 'endless-sea', name: '无尽之海', terrain: '海域', nation: '无主', kind: 'sea', threat: [6, 14], desc: '大陆以南的深水洋，海图到第三块图幅就只剩空白和手写批注。远洋船队一年只走一趟。', landmarks: ['最后一座补给岛', '鲸骨标记', '沉船带'] },
    { id: 'greyfog-plains', name: '灰雾平原', terrain: '平原', nation: '无主', kind: 'wild', threat: [7, 12], desc: '亡者灵魂汇聚之地，雾气常年不散，十步外看不清人。亡者之夜的雾会漫过界碑，把现实一起盖住。', landmarks: ['雾中石阵', '安息烛台', '无碑乱葬岗'] },
    { id: 'underdark', name: '幽暗地域', terrain: '地下', nation: '幽暗地域', kind: 'under', threat: [8, 14], desc: '地底数百里的洞厅与竖井，卓尔的城市靠荧光苔和岩浆沟照明。地表人进去，多半死在认路上。', landmarks: ['蛛丝吊桥', '奴隶市场洞厅', '荧光苔河'] },
    { id: 'dawncity', name: '曙光城', terrain: '平原', nation: '晨曦王国', kind: 'city', threat: [1, 3], desc: '大陆最富庶的都城，城墙外包白灰，圣光教会总部设在城中心。帝国古语里它叫黄金之门，进城要交人头税。', landmarks: ['金色圆盘大教堂', '喷泉广场', '旧城墙与护城河'] },
    { id: 'ironthrone', name: '铁王座堡', terrain: '平原', nation: '雄鹿王国', kind: 'city', threat: [1, 3], desc: '军事强国的都城，城墙按军团编制分段驻守，比武场常年开放。街道修得窄，是为巷战留的。', landmarks: ['铁王座大厅', '骑士比武场', '军械街'] },
    { id: 'hightower', name: '高塔城', terrain: '平原', nation: '哥特王国', kind: 'city', threat: [1, 4], desc: '选举君主制的都城，七位大选帝侯的宅邸围着法师公会的尖塔排开。塔顶亮灯表示枢密院在议事，那几条街当晚要安静。', landmarks: ['法师公会尖塔', '七侯宅邸', '选帝侯广场'] },
    { id: 'whiteharbor', name: '白港城', terrain: '冰原', nation: '北境共和国', kind: 'city', threat: [1, 3], desc: '北境的不冻港，十二个大商人家族联合统治，码头的话比议会的话管用。冬天街上结冰，拉货改用雪橇。', landmarks: ['十二家族会馆', '冻港栈桥', '鲸油灯市'] },
    { id: 'sunspear', name: '烈日城', terrain: '荒原', nation: '南方联合王国', kind: 'city', threat: [1, 4], desc: '分封制下的南方都城，一条街上能同时听到通用语、兽人语和沙漠口音。水按陶罐计价比酒贵。', landmarks: ['水渠门', '多族集市', '南方总督府'] },
    { id: 'rosekeep', name: '玫瑰堡', terrain: '森林', nation: '洛林公国', kind: 'city', threat: [1, 3], desc: '紧邻精灵森林的公国都城，城墙外种满蔷薇，诗人与魔法学徒在酒馆里抢座位。进森林的通行凭证一证难求。', landmarks: ['蔷薇城墙', '诗人行会', '森林通行关口'] },
    { id: 'sentrykeep', name: '哨兵堡', terrain: '荒原', nation: '边境领', kind: 'city', threat: [3, 5], desc: '抵抗兽人和北方野人的第一道防线，军事总督说了算。每年秋末征一次边军，粮仓按军粮标准封存。', landmarks: ['烽火台链', '边军营地', '荒原栅墙'] },
    { id: 'anvils-hall', name: '铁砧大厅', terrain: '地下', nation: '群山王国', kind: 'city', threat: [2, 4], desc: '矮人语原意为锻造之核。整座城是一串连通的洞厅，熔炉层的热气往上走，把上层烘得干燥。', landmarks: ['山丘之王熔炉', '深井升降机', '秘银兄弟会工坊街'] },
    { id: 'starhollow', name: '星辉城', terrain: '森林', nation: '银冠王庭', kind: 'city', threat: [2, 5], desc: '高等精灵的白色城邦，桥与塔都用整块白石砌成。永恒女王三百年未公开露面，王座厅的灯一直亮着。', landmarks: ['白石王座厅', '古代知识书库', '星象露天台'] },
    { id: 'shadehold', name: '幽影堡', terrain: '森林', nation: '绿林议会', kind: 'city', threat: [2, 5], desc: '木精灵的树城，树干之间架着绳桥，地面不留路。大德鲁伊议会在树冠层开会，外人在下面等。', landmarks: ['议会树冠厅', '绳桥网', '绿枝信物关口'] },
    { id: 'dragonfire', name: '龙火城', terrain: '沙漠', nation: '格瑞纳达', kind: 'city', threat: [2, 5], desc: '龙裔帝国的都城，以重型骑兵和火焰魔法闻名。城墙用烧过的黑石砌成，锻炉一年到头不熄。', landmarks: ['龙裔皇帝阅兵场', '火焰锻炉区', '重骑营'] },
    { id: 'websdeep', name: '暗蛛城', terrain: '地下', nation: '幽暗地域', kind: 'city', threat: [8, 14], desc: '蜘蛛女王之城，奴隶贸易与暗杀在这里算日常行政。契约刻在扶手内侧，靠摸不靠看。', landmarks: ['蛛后神殿', '奴隶市场', '毒药巷'] },
    { id: 'wasteland-clans', name: '荒原部落', terrain: '荒原', nation: '荒原部落', kind: 'wild', threat: [4, 10], desc: '半兽人数百个游牧部落的营地群，没有固定都城，最强酋长的帐篷就是议事处。每年秋收后南下劫掠边境。', landmarks: ['酋长帐', '牲畜栏与骨堆', '劫掠出发的浅滩'] },
    { id: 'frostridge-village', name: '霜脊村', terrain: '冰原', nation: '北境共和国', kind: 'town', threat: [2, 4], desc: '北境共和国的边境村庄，二十几户人家，靠猎鹿与烧炭过冬。一月大雪一封路，就得自己撑到开春。', landmarks: ['村中火塘', '烧炭窑', '通往冰川的旧猎道'] },
    { id: 'fountain-square', name: '喷泉广场', terrain: '平原', nation: '晨曦王国', kind: 'town', threat: [1, 3], desc: '曙光城贵族区边缘的广场，三喷石泉从帝国纪元用到现在。告示板、马车与扒手都聚在这里。', landmarks: ['三喷石泉', '告示板', '贵族区铁栅门'] },
    { id: 'greenwhisper-gate', name: '林语门', terrain: '森林', nation: '绿林议会', kind: 'town', threat: [3, 6], desc: '洛林公国与艾索洛伦森林交界处的精灵哨站，树门由两株活树绞成。凭证不对，门就不开。', landmarks: ['活树哨门', '绿枝信物验查处', '人类伐木营地'] },
    { id: 'ashenruin-town', name: '烬墟镇', terrain: '沙漠', nation: '南方联合王国', kind: 'town', threat: [3, 6], desc: '靠近黄铜沙漠边缘的边境小镇，靠给探险队补给赚钱。沙暴过后，街上总会多出几张陌生面孔。', landmarks: ['镇口咸水井', '探险者酒馆', '驼队栈房'] },
    { id: 'elemental-chaos', name: '元素混沌', terrain: '荒原', nation: '无主', kind: 'wild', threat: [14, 20], desc: '火水风土四位面的交汇处，地面一半结冰一半冒火，风向半个时辰换一次。进去的人按脚程算，不按里算。', landmarks: ['四色地裂', '凝固的熔岩浪', '风墙缺口'] },
    { id: 'time-rift', name: '时空裂隙', terrain: '废墟', nation: '无主', kind: 'wild', threat: [15, 20], desc: '位面薄弱处，可跨界穿梭，也是年份出错的地方。从里面出来的人要先重新核对星母历。', landmarks: ['悬空的旧城门', '两支不同年代的箭', '冻住的一瞬火光'] },
    { id: 'luminous-court', name: '圣光之庭', terrain: '平原', nation: '无主', kind: 'wild', threat: [10, 18], desc: '善良神祇的居所，光明与秩序的源头。凡人看得见的只有一片没有影子的白地，和远处不落的日轮。', landmarks: ['无影白地', '日轮阶', '宣判台'] },
    { id: 'abyssal-pit', name: '深渊之渊', terrain: '地下', nation: '无主', kind: 'wild', threat: [16, 20], desc: '恶魔的巢穴，越往下空气越烫，岩壁上刻满三叉舌。赤月之年封印变薄，这里的动静会传到地表。', landmarks: ['三叉舌祭坛', '锁链桥', '第九层封印柱'] },
    { id: 'everwood', name: '永恒森林', terrain: '森林', nation: '无主', kind: 'wild', threat: [5, 11], desc: '精灵的中环位面，树龄以千年计，没有冬天。凡人在里面待久了，回主位面会发现自己的年纪对不上。', landmarks: ['母树根系', '不落叶的林间空地', '精灵旧居'] },
    { id: 'ancestor-hall', name: '先祖大厅', terrain: '地下', nation: '无主', kind: 'wild', threat: [4, 10], desc: '矮人的中环位面，列祖石像按氏族排列，炉火由死者守着。活人进去要报三代以内的名字。', landmarks: ['列祖石像廊', '不灭炉', '氏族名册壁'] },
    { id: 'dragonash-ruins', name: '龙烬遗迹', terrain: '沙漠', nation: '无主', kind: 'ruin', threat: [8, 12], desc: '沙暴后露出的古代龙裔城市废墟，不见于任何记载。三重锁门至今没被打开，门外的竞争者比沙子多。', landmarks: ['三重锁门', '半埋的龙形柱', '皇家考古队营地'] },
    { id: 'echowell', name: '回音井', terrain: '地下', nation: '晨曦王国', kind: 'under', threat: [2, 4], desc: '曙光城地下的古井，井壁把声音还回来要晚一息。圣光教会封过三次，又开过三次。', landmarks: ['生锈铁盖', '刻满名字的井壁', '七层螺旋梯'] },
    { id: 'mirrorlake', name: '倒影湖', terrain: '森林', nation: '绿林议会', kind: 'wild', threat: [3, 7], desc: '艾索洛伦森林深处的水面，无风也平，倒影总比人慢半拍。木精灵不在湖边过夜，也不说原因。', landmarks: ['无风水面', '湖心石台', '半沉的旧船桅'] },
    { id: 'worlds-throat', name: '世界之喉', terrain: '冰原', nation: '无主', kind: 'wild', threat: [6, 11], desc: '北境冰川上的一道裂缝，深三百尺，底部的蓝冰里冻着旧营地与兽骨。风从缝里往上吹，缝口终年不积雪。', landmarks: ['三百尺冰缝', '冻在冰中的营地', '冰下暗河'] },
    { id: 'golden-city', name: '黄金城', terrain: '沙漠', nation: '无主', kind: 'ruin', threat: [10, 16], desc: '黄铜沙漠深处的裂隙之城，实为元素位面缺口。金子是真的，带出来的人多半活不过第二年。', landmarks: ['金砖街', '位面裂隙口', '干涸的喷泉与骸骨'] },
    { id: 'oldgraveyard', name: '旧坟场', terrain: '废墟', nation: '晨曦王国', kind: 'ruin', threat: [3, 6], desc: '城郊的旧坟场，墓碑多半没有名字，地下墓穴彼此连通。匿名信函约定的见面地点就在坍塌的礼拜堂后面。', landmarks: ['无名墓碑区', '坍塌的礼拜堂', '墓穴下层入口'] },
    { id: 'old-empire-road', name: '帝国旧道', terrain: '平原', nation: '无主', kind: 'wild', threat: [1, 3], desc: '帝国纪元铺设的石砌官道，如今大半被草与碎石埋掉。运货的车队还走这条路，因为别的路更烂。', landmarks: ['第九里程石', '断桥', '路边废驿站'] },
    { id: 'boneford', name: '白骨渡口', terrain: '沼泽', nation: '无主', kind: 'wild', threat: [4, 8], desc: '维兰之海南岸的浅滩渡口，退潮时露出成排的骨骸，没人说得清是哪一场仗留下的。摆渡人只收现钱。', landmarks: ['潮间骨骸带', '木桩栈桥', '摆渡人窝棚'] },
    { id: 'mistfen', name: '迷雾沼泽', terrain: '沼泽', nation: '无主', kind: 'wild', threat: [3, 7], desc: '灰雾平原东缘的沼泽，沼气点得着，走夜路要举火。僵尸与染病的野兽在这一带最多。', landmarks: ['沼气坑', '猎人木栈道', '沉没的村基'] },
    { id: 'eagle-crag', name: '巨鹰崖', terrain: '山脉', nation: '无主', kind: 'wild', threat: [4, 7], desc: '银峰山脉南段的悬崖，巨鹰在岩台上筑巢。偷蛋的人要先想好怎么下来。', landmarks: ['鹰巢岩台', '风化绳梯', '崖底的骸骨堆'] },
    { id: 'restcandle-yard', name: '安息烛墓园', terrain: '废墟', nation: '晨曦王国', kind: 'ruin', threat: [3, 7], desc: '曙光城外专葬无名义士的墓园，亡者之夜全城的人来这里点安息烛。烛灭的地方，第二天要重新数一遍坟。', landmarks: ['安息烛台阵', '死亡教团登记棚', '界墙缺口'] }
  ];

  WD.RACES = [
    { id: 'human', name: '人类', sub: 'Human（无亚种）', height: '5.5-6.5 英尺', life: '60-90 年（无魔法延寿）', traits: '适应性极强、繁衍力高、野心勃勃。寿命短，任何职业都出得来，但难以成为顶尖法师。', bonus: { any: 1 }, society: '王国、城邦、游牧部落多元并存，人口占大陆六成半', homeland: '大陆各地，以中部平原与南方为主', speed: 30, size: '中型' },
    { id: 'high-elf', name: '高等精灵', sub: 'Elf · High', height: '6-7 英尺', life: '800-1200 年', traits: '天生拥有冥想能力，可短时入定代替睡眠。擅长奥术、诗歌与剑术，对外高傲疏离。', bonus: { int: 2, dex: 1 }, society: '君主制与魔法贵族，白色城邦，等级由血统与学识共同决定', homeland: '银峰山脉与星辉城', speed: 30, size: '中型' },
    { id: 'wood-elf', name: '木精灵', sub: 'Elf · Wood', height: '5.5-6.5 英尺', life: '500-800 年', traits: '可入定代替睡眠。擅长弓箭、自然魔法与潜行，敌视侵入者，林地边界按株计数。', bonus: { dex: 2, wis: 1 }, society: '部落议会，由大德鲁伊裁决林地事务', homeland: '艾索洛伦森林', speed: 35, size: '中型' },
    { id: 'drow', name: '暗夜精灵（卓尔）', sub: 'Elf · Drow', height: '5.5-6 英尺', life: '700-1000 年', traits: '可入定代替睡眠。擅长暗杀、毒药与阴谋魔法，对外掠夺与奴役，家族排名每年重算。', bonus: { dex: 2, cha: 1 }, society: '母系社会与蜘蛛教派，贵族家族彼此清算', homeland: '幽暗地域与暗蛛城', speed: 30, size: '中型' },
    { id: 'mountain-dwarf', name: '山地矮人', sub: 'Dwarf · Shield（盾矮人）', height: '4-4.5 英尺', life: '250-400 年', traits: '对毒素和魔法有极强抗性，黑暗中拥有 60 英尺红外视觉。极壮，骨骼密度高，擅长锻造、战斧与重甲；信仰大地之父与锻造之主。', bonus: { con: 2, str: 1 }, society: '氏族军事社会，成年男子按氏族编入矿卫', homeland: '北方山脉地下城与铁砧大厅', speed: 25, size: '中型' },
    { id: 'hill-dwarf', name: '山丘矮人', sub: 'Dwarf · Gold（金矮人）', height: '4.5-5 英尺', life: '250-350 年', traits: '对毒素和魔法抗性极强，暗中拥有 60 英尺红外视觉。壮实而稍修长，擅长贸易、酿酒与轻型锻造；信仰大地之父与锻造之主。', bonus: { con: 2, wis: 1 }, society: '贸易与农耕氏族，商号与氏族共用一本账', homeland: '南方丘陵与地表城镇', speed: 25, size: '中型' },
    { id: 'dragonborn', name: '龙裔', sub: 'Dragonborn', height: '6.5-7.5 英尺', life: '180-250 年', traits: '龙族与人族交配后的稀薄血脉后裔，身覆龙鳞，具吐息能力，奉龙族荣耀观：欠债必偿，受辱必还。', bonus: { str: 2, cha: 1 }, society: '帝国制，皇帝之下设军团长与龙鳞贵族', homeland: '南方格瑞纳达与龙火城', speed: 30, size: '中型' },
    { id: 'metallic-dragon', name: '金属龙', sub: 'Dragon · Metallic（善）', height: '体长 60-200 英尺（成年）', life: '2000-5000 年', traits: '金龙、银龙、青铜龙一类。吐息为火、冰、电、酸、毒因种类而异；智慧与寿命同长。现世罕见，多数已沉睡或离开主位面。', bonus: { int: 1, cha: 1 }, society: '隐居，偶尔干预世事，多以人形现身谈条件', homeland: '不明，龙骨山脉与银峰山脉曾有目击记载', speed: 40, size: '巨型' },
    { id: 'chromatic-dragon', name: '彩色龙', sub: 'Dragon · Chromatic（恶）', height: '体长 60-200 英尺（成年）', life: '1500-4000 年', traits: '红龙、黑龙、绿龙一类。吐息同为元素属性；狡猾但冲动。背离守护职责、堕入贪婪与毁灭的一支。', bonus: { str: 1, con: 1 }, society: '独居，奴役弱小种族，领地按飞行半径划定', homeland: '龙骨山脉深处、黄铜沙漠与无人区', speed: 40, size: '巨型' },
    { id: 'gem-dragon', name: '宝石龙', sub: 'Dragon · Gem（中立）', height: '体长 50-180 英尺（成年）', life: '3000-6000 年', traits: '水晶龙、翡翠龙、蓝宝石龙一类。吐息为能量、光束与心灵冲击；完全不问世事，靠近者会被无视或被抹掉。', bonus: { int: 1, wis: 1 }, society: '不结社不结盟，只守自己的巢与矿脉', homeland: '不明，多见于地脉交汇处', speed: 40, size: '巨型' },
    { id: 'halfling', name: '半身人', sub: 'Halfling（哈比族）', height: '3-3.5 英尺', life: '150 年', traits: '极擅投掷与潜行，天生幸运。不擅长负重，饭量按体型算却比人类大。', bonus: { dex: 2, cha: 1 }, society: '家族聚居的村社，长者管事，账目公开', homeland: '中部平原与南方丘陵的村落', speed: 25, size: '小型' },
    { id: 'half-orc', name: '半兽人', sub: 'Half-Orc', height: '6-7 英尺', life: '60-80 年', traits: '力量惊人，但智力稍低，常被歧视。兽人语约四百词，多数与战斗、牲畜和天气相关。', bonus: { str: 2, con: 1 }, society: '荒原部落游牧结社，或边境领的佣兵队', homeland: '南境荒原与边境领', speed: 30, size: '中型' },
    { id: 'leonin', name: '狮人', sub: 'Leonin（拉库尼）', height: '6.5-8 英尺', life: '150 年', traits: '草原战士，荣誉与族裔至上。鬃毛随年龄变白，部落按战功排位。', bonus: { str: 2, dex: 1 }, society: '部落战士结社，族裔长老与战团首领分权', homeland: '南境荒原与南方联合王国边境', speed: 35, size: '中型' },
    { id: 'goblin', name: '哥布林', sub: 'Goblin（地精）', height: '2.5-3.5 英尺', life: '40-60 年', traits: '狡猾、胆小但数量庞大。体质偏弱，靠陷阱、毒与人数弥补，地底通用语说得比通用语流利。', bonus: { dex: 2, con: -1 }, society: '部族式，强者为王，弱者负责踩陷阱', homeland: '幽暗地域上层与各处废墟', speed: 30, size: '小型' },
    { id: 'ogre', name: '食人魔', sub: 'Ogre', height: '8-10 英尺', life: '80-100 年', traits: '蠢笨但力大无穷，常被兽人驱使，也常被荒原部落当牲口一样押着走。', bonus: { str: 2, con: 1, int: -2 }, society: '无稳定社会，依附更强的部族换取食物', homeland: '南境荒原、龙骨山脉山脚', speed: 30, size: '大型' },
    { id: 'naga', name: '娜迦', sub: 'Naga（人首蛇身）', height: '人首蛇身，全长 12-20 英尺', life: '300 年', traits: '深海与沼泽的统治者，擅长水系魔法。水陆两栖，淡水中可长时间不呼吸。', bonus: { wis: 2, int: 1 }, society: '沼泽深处的神殿城邦，由祭司阶层统治', homeland: '白骨渡口、迷雾沼泽与维兰之海深处', speed: 30, size: '大型' },
    { id: 'giant', name: '巨人', sub: 'Giant', height: '15-25 英尺', life: '400-600 年', traits: '古老残存的种族，智商参差不齐。巨人语已失传，据信记载着元素位面的坐标。', bonus: { str: 2, con: 2, dex: -2 }, society: '按族裔分等的山岭聚落，多以物易物', homeland: '龙骨山脉与银峰山脉的高处', speed: 40, size: '巨型' },
    { id: 'half-elf', name: '半精灵', sub: 'Half-Elf', height: '5.5-6.5 英尺', life: '120-180 年', traits: '两族之间的边缘人，两边都不完全接纳。可入定代替睡眠（继承自精灵血脉），属性加成为任意两项 +1，亦可改为魅力 +2。', bonus: { any: 1 }, society: '多在人类城邦或精灵边境独居，靠手艺与语言吃饭', homeland: '洛林公国、玫瑰堡与森林边缘', speed: 30, size: '中型' }
  ];

  WD.CLASSES = [
    { id: 'wizard', name: '法师', source: '奥术', core: '智力 · 法术书 · 准备施法', subs: ['防护', '咒法', '预言', '附魔', '塑能', '幻术', '死灵', '变化'], pros: '法术选择最广，八大学派通吃，遗迹与古代文字只有他们读得完整', cons: '体质薄弱，近战完全无能，法术书丢了就等于废人', hpDie: 'd6', kits: [{ name: '装备包 · 甲', items: ['法杖', '法术书（含 6 个 1 环法术）', '普通长袍', '材料包'] }], caster: true },
    { id: 'sorcerer', name: '术士', source: '奥术', core: '魅力 · 血脉施法 · 无需准备', subs: ['龙脉', '精灵血脉', '恶魔契约', '混沌之力'], pros: '法术数量少但强度高，可以超魔增效，随时出手不用提前记忆', cons: '法术选择极少，稳定性差，血脉觉醒时不受自己控制', hpDie: 'd6', kits: [{ name: '装备包 · 甲', items: ['法杖', '普通长袍', '龙鳞护符（或血脉信物）', '材料包'] }], caster: true },
    { id: 'fighter', name: '战士', source: '战职', core: '力量／敏捷 · 所有武器与护甲', subs: ['武器大师', '盾卫者', '勇士'], pros: '战斗续航能力极强，可穿戴任何护甲，兵器坏了随手换一把', cons: '没有超凡手段，面对魔法时脆弱', hpDie: 'd10', kits: [{ name: '装备包 · 甲', items: ['链甲', '长剑', '盾牌', '普通弓', '20 支箭'] }, { name: '装备包 · 乙', items: ['皮甲', '巨剑', '两把手斧'] }], caster: false },
    { id: 'ranger', name: '游侠', source: '战职', core: '敏捷／感知 · 双武器／弓箭', subs: ['猎人', '驯兽师', '守望者'], pros: '地形适应，与自然生物交流，追踪与远程压制都靠得住', cons: '输出不如纯战士和法师，两头都要练，两头都不精', hpDie: 'd8', kits: [{ name: '装备包 · 甲', items: ['皮甲', '长弓', '20 支箭', '两把短剑'] }, { name: '装备包 · 乙', items: ['链甲衫', '战斧'] }], caster: true },
    { id: 'rogue', name: '游荡者', source: '诡术', core: '敏捷 · 潜行、暗杀、开锁', subs: ['刺客', '盗贼', '诡术师'], pros: '爆发力极强，躲藏能力顶尖，锁与陷阱在他们手里只是工序', cons: '正面战斗能力弱，一旦被围就只剩跑', hpDie: 'd8', kits: [{ name: '装备包 · 甲', items: ['皮甲', '两把匕首', '盗贼工具', '短剑'] }, { name: '装备包 · 乙', items: ['轻弩', '20 支矢'] }], caster: false },
    { id: 'cleric', name: '牧师', source: '神术', core: '感知 · 信仰施法', subs: ['生命', '战争', '知识', '诡术', '自然', '光', '暗'], pros: '治疗与伤害兼备，可穿戴中甲，队伍里活得最久的通常是他们', cons: '缺乏位移和控场法术，跑不掉也拦不住', hpDie: 'd8', kits: [{ name: '装备包 · 甲', items: ['链甲', '钉头锤', '圣徽', '木盾'] }, { name: '装备包 · 乙', items: ['皮甲', '战锤'] }], caster: true },
    { id: 'paladin', name: '圣骑士', source: '神术', core: '魅力／力量 · 誓言施法', subs: ['奉献', '古贤', '复仇', '征服'], pros: '重甲、治疗与光环三样齐全，对抗邪恶时有绝对优势', cons: '誓言约束严格，违背会失去力量，而且不会提前警告', hpDie: 'd10', kits: [{ name: '装备包 · 甲', items: ['链甲', '长剑', '盾牌', '圣徽'] }, { name: '装备包 · 乙', items: ['板甲（仅限起始金币足够）'] }], caster: true },
    { id: 'barbarian', name: '野蛮人', source: '战职', core: '力量／体质 · 狂怒', subs: ['狂战士', '图腾战士'], pros: '血量最厚，输出恐怖，狂怒期间免疫部分伤害', cons: '战斗后极度虚弱，不能穿重甲', hpDie: 'd12', kits: [{ name: '装备包 · 甲', items: ['皮甲', '巨斧', '两把手斧'] }, { name: '装备包 · 乙', items: ['长矛', '盾牌'] }], caster: false },
    { id: 'druid', name: '德鲁伊', source: '自然', core: '感知 · 自然施法', subs: ['大地结社', '月之结社', '梦境结社'], pros: '变形能力、自然法术、治疗与控场兼备，野外不会迷路也不会饿死', cons: '金属禁忌，城市中受限制，穿金属甲会失去施法能力', hpDie: 'd8', kits: [{ name: '装备包 · 甲', items: ['木盾', '木杖', '草药包', '德鲁伊法器'] }], caster: true },
    { id: 'bard', name: '吟游诗人', source: '奥术', core: '魅力 · 音乐施法', subs: ['勇气', '学识', '剑舞', '魅惑'], pros: '全能型选手，擅长社交与信息收集，酒馆里半首歌能换一条情报', cons: '输出能力有限，什么都会一点，什么都压不住场', hpDie: 'd8', kits: [{ name: '装备包 · 甲', items: ['皮甲', '长剑', '乐器', '匕首'] }, { name: '装备包 · 乙', items: ['轻弩', '20 支矢'] }], caster: true }
  ];

  WD.MONSTERS = [
    { id: 'grey-wolf', name: '灰林狼', cls: '普通野兽', habitat: ['森林', '丘陵'], threat: [1, 2], drop: ['狼皮', '狼牙'], trait: '群居，夜行，惧火', weak: '火把与火光能逼退整群，单独一只时胆怯', hp: 18, ac: 13, atk: 4, dmg: '1d8+2', xp: 50 },
    { id: 'cave-bear', name: '洞穴巨熊', cls: '普通野兽', habitat: ['山脉', '森林'], threat: [3, 4], drop: ['熊皮', '熊胆（炼金材料）'], trait: '独居，领地意识极强，冬眠时可用', weak: '冬眠期反应迟缓，先手突袭可省一半力气', hp: 45, ac: 14, atk: 6, dmg: '2d6+4', xp: 200 },
    { id: 'griffon', name: '狮鹫', cls: '普通野兽', habitat: ['山脉'], threat: [4, 5], drop: ['狮鹫羽毛（附魔材料）', '利爪'], trait: '可驯化（DC 18），空中骑兵坐骑', weak: '俯冲后需要重新爬升，落地那两轮是唯一的破绽', hp: 52, ac: 15, atk: 7, dmg: '2d6+4', xp: 350 },
    { id: 'bristleback-boar', name: '棘背野猪', cls: '普通野兽', habitat: ['平原', '森林'], threat: [2, 3], drop: ['獠牙', '厚皮（制甲）'], trait: '冲锋时造成双倍伤害，脾气暴烈', weak: '转向笨拙，被引到树丛或石堆间就失去冲锋距离', hp: 26, ac: 13, atk: 4, dmg: '1d10+3', xp: 90 },
    { id: 'basilisk', name: '石化蜥蜴', cls: '魔法生物', habitat: ['地下', '废墟'], threat: [6, 8], drop: ['蜥蜴眼（石化药水原料）', '鳞片'], trait: '目光凝视，体质豁免 DC 14，失败即缓慢石化', weak: '闭眼近战可避开凝视；镜面反光能把它自己定住', hp: 75, ac: 16, atk: 8, dmg: '2d8+4', xp: 900 },
    { id: 'manticore', name: '蝎尾狮', cls: '魔法生物', habitat: ['沙漠', '荒原'], threat: [8, 10], drop: ['蝎尾毒刺', '狮皮'], trait: '尾刺带剧毒（每轮 3d6 毒素伤害），可低空飞行', weak: '毒刺一轮只能射一次，贴近到翼展以内它就没法起飞', hp: 95, ac: 17, atk: 9, dmg: '2d10+5', xp: 1600 },
    { id: 'chimera', name: '奇美拉', cls: '魔法生物', habitat: ['山脉', '荒原'], threat: [10, 12], drop: ['三种头颅的牙齿（各有用处）', '龙血（稀释）'], trait: '羊头吐火、龙头吐酸、狮头撕咬，三头各自独立行动', weak: '三头争食时会互相撕咬，先杀掉龙头可让剩下两头失去指挥', hp: 140, ac: 17, atk: 11, dmg: '3d6+6', xp: 3000 },
    { id: 'wyvern', name: '双足飞龙', cls: '魔法生物', habitat: ['沼泽', '森林'], threat: [9, 11], drop: ['飞龙毒腺', '骨翼'], trait: '俯冲擒抱加注入麻痹毒素，中毒后每轮体质豁免', weak: '翼膜怕火，烧穿一侧就无法保持高度', hp: 110, ac: 17, atk: 10, dmg: '2d8+6', xp: 2000 },
    { id: 'skeleton', name: '骷髅兵', cls: '不死生物', habitat: ['废墟', '地下'], threat: [2, 3], drop: ['锈蚀短剑', '破碎骨片'], trait: '无智，执行简单指令，不知疲倦也不知恐惧', weak: '钝击伤害翻倍', hp: 22, ac: 14, atk: 4, dmg: '1d6+2', xp: 80 },
    { id: 'zombie', name: '僵尸', cls: '不死生物', habitat: ['沼泽', '废墟'], threat: [3, 4], drop: ['腐烂衣物', '疫病组织（需火焚）'], trait: '感染抓伤，体质豁免失败则患病；行动迟缓但不知痛', weak: '火焰伤害翻倍', hp: 38, ac: 12, atk: 5, dmg: '1d8+3', xp: 150 },
    { id: 'ghost', name: '幽魂', cls: '不死生物', habitat: ['废墟'], threat: [7, 9], drop: ['凝结的雾珠', '死者遗物'], trait: '穿墙，衰老之触每次命中减 1 点体质', weak: '圣光、银质武器', hp: 70, ac: 15, atk: 8, dmg: '3d6+2', xp: 1100 },
    { id: 'wight', name: '尸妖', cls: '不死生物', habitat: ['地下', '平原'], threat: [10, 12], drop: ['陪葬金饰', '食尸鬼疫病样本'], trait: '食尸鬼疫病，被它杀死的人二十四小时后转化为僵尸', weak: '圣水与阳光，日光直射下无法恢复生命', hp: 105, ac: 16, atk: 10, dmg: '2d6+5', xp: 2200 },
    { id: 'lich', name: '巫妖', cls: '不死生物', habitat: ['废墟', '地下'], threat: [18, 22], drop: ['命匣碎片', '传奇施法者的法术书'], trait: '传奇施法者死后转化，免疫物理伤害', weak: '命匣（唯一弱点），毁掉命匣才能真正杀死它', hp: 250, ac: 22, atk: 16, dmg: '4d8+8', xp: 15000 },
    { id: 'balor', name: '炎魔', cls: '异界生物', habitat: ['废墟', '地下'], threat: [16, 18], drop: ['炎魔之心', '斩首巨剑（灼热）'], trait: '巴洛魔，深渊之渊的高阶恶魔；火焰光环使周围 10 尺每轮受 2d6 伤害，持斩首巨剑', weak: '寒冰与圣光属性伤害；真名被念出时会被短暂束缚', hp: 210, ac: 21, atk: 15, dmg: '3d10+8', xp: 9000 },
    { id: 'chain-devil', name: '链魔', cls: '异界生物', habitat: ['地下', '废墟'], threat: [10, 12], drop: ['灼热锁链', '九狱契约残页'], trait: '锁链攻击，痛苦结界；被锁住的人无法施法', weak: '斩断锁链会让它失去一半攻击手段', hp: 120, ac: 18, atk: 11, dmg: '2d8+6', xp: 2600 },
    { id: 'wind-elemental-lord', name: '风元素领主', cls: '异界生物', habitat: ['山脉', '荒原'], threat: [14, 16], drop: ['风之位面核心', '压缩气流瓶'], trait: '免疫物理攻击，可化身为风暴，卷起的沙石按轮结算伤害', weak: '封闭空间内无法成形，厚重石门能挡住它的推进', hp: 160, ac: 20, atk: 13, dmg: '3d8+7', xp: 6000 },
    { id: 'astral-hound', name: '星界猎犬', cls: '异界生物', habitat: ['平原', '废墟'], threat: [8, 10], drop: ['灵光腺体', '星界皮毛'], trait: '追踪灵光，无法被伪装欺骗', weak: '隔水与厚重铅板能暂时切断灵光气味', hp: 85, ac: 16, atk: 9, dmg: '2d8+5', xp: 1400 }
  ];

  WD.ITEMS = {
    consumable: [
      { id: 'pot-heal-minor', name: '治疗微伤药水', quality: '凡品', price: 50, effect: '恢复 2d4+2 生命值', kind: '药水' },
      { id: 'pot-heal-major', name: '治疗重伤药水', quality: '罕见', price: 500, effect: '恢复 4d6+6 生命值', kind: '药水' },
      { id: 'pot-invisible', name: '隐形药水', quality: '罕见', price: 400, effect: '隐形 1 小时，攻击后解除', kind: '药水' },
      { id: 'pot-fly', name: '飞行药水', quality: '稀有', price: 800, effect: '飞行速度 60 尺，持续 10 分钟', kind: '药水' },
      { id: 'scroll-1', name: '1 环法术卷轴', quality: '凡品', price: 40, effect: '储存一个 1 环法术，一次性释放，抄录需通过智力检定', kind: '卷轴' },
      { id: 'scroll-3', name: '3 环法术卷轴', quality: '罕见', price: 270, effect: '储存一个 3 环法术，一次性释放，羊皮纸受潮即废', kind: '卷轴' },
      { id: 'scroll-5', name: '5 环法术卷轴', quality: '稀有', price: 750, effect: '储存一个 5 环法术，一次性释放，读过的人会被原持有人感知', kind: '卷轴' },
      { id: 'rune-blast', name: '爆裂符文石', quality: '罕见', price: 200, effect: '投掷后造成 6d6 火焰伤害，DC 15 敏捷豁免减半', kind: '符文' }
    ],
    weapon: [
      { id: 'w-simple-sword', name: '简单剑', quality: '凡品', price: 25, dmg: '1d6', dmgType: '挥砍', props: '轻型，农民与民兵的标配', hands: 1 },
      { id: 'w-longsword', name: '长剑', quality: '凡品', price: 25, dmg: '1d8', dmgType: '挥砍', props: '军用，骑士与佣兵的主手', hands: 1 },
      { id: 'w-shortsword', name: '短剑', quality: '凡品', price: 15, dmg: '1d6', dmgType: '穿刺', props: '轻型，可双持', hands: 1 },
      { id: 'w-dagger', name: '匕首', quality: '凡品', price: 5, dmg: '1d4', dmgType: '穿刺', props: '轻型，可投掷，藏在靴筒里', hands: 1 },
      { id: 'w-greatsword', name: '巨剑', quality: '精良', price: 55, dmg: '2d6', dmgType: '挥砍', props: '重型，双手，需要力量 13', hands: 2 },
      { id: 'w-handaxe', name: '手斧', quality: '凡品', price: 8, dmg: '1d6', dmgType: '挥砍', props: '轻型，可投掷，矮人矿卫的副手', hands: 1 },
      { id: 'w-battleaxe', name: '战斧', quality: '精良', price: 25, dmg: '1d8', dmgType: '挥砍', props: '军用，可双持', hands: 1 },
      { id: 'w-greataxe', name: '巨斧', quality: '精良', price: 45, dmg: '1d12', dmgType: '挥砍', props: '重型，双手，野蛮人的常用起手', hands: 2 },
      { id: 'w-spear', name: '长矛', quality: '凡品', price: 10, dmg: '1d6', dmgType: '穿刺', props: '触及，可投掷，配盾时可单手用', hands: 1 },
      { id: 'w-mace', name: '钉头锤', quality: '凡品', price: 18, dmg: '1d6', dmgType: '钝击', props: '对骷髅一类不死生物有效', hands: 1 },
      { id: 'w-warhammer', name: '战锤', quality: '精良', price: 20, dmg: '1d8', dmgType: '钝击', props: '军用，矮人锻造的标准件', hands: 1 },
      { id: 'w-longbow', name: '长弓', quality: '凡品', price: 25, dmg: '1d8', dmgType: '穿刺', props: '双手，射程 150 尺，需要力量 11', hands: 2 },
      { id: 'w-shortbow', name: '短弓', quality: '凡品', price: 15, dmg: '1d6', dmgType: '穿刺', props: '双手，射程 80 尺，可骑射', hands: 2 },
      { id: 'w-lightcrossbow', name: '轻弩', quality: '精良', price: 30, dmg: '1d8', dmgType: '穿刺', props: '双手，装填需一个附赠动作', hands: 2 },
      { id: 'w-arrows20', name: '箭矢（20 支）', quality: '凡品', price: 1, dmg: '1d4', dmgType: '穿刺', props: '配合弓使用，伤害按弓计算；单独持握按临时武器 1d4 结算，断了不能回收', hands: 1 },
      { id: 'w-bolts20', name: '弩矢（20 支）', quality: '凡品', price: 1, dmg: '1d4', dmgType: '穿刺', props: '配合弩使用，伤害按弩计算；矢杆比箭短一半，单独持握按临时武器 1d4 结算', hands: 1 },
      { id: 'w-staff', name: '法杖', quality: '凡品', price: 5, dmg: '1d6', dmgType: '钝击', props: '施法聚焦，法师与术士的初始装备', hands: 2 },
      { id: 'w-woodstaff', name: '木杖', quality: '凡品', price: 2, dmg: '1d6', dmgType: '钝击', props: '德鲁伊法器，不带金属箍', hands: 2 },
      { id: 'w-plus1', name: '+1 武器', quality: '罕见', price: 1000, dmg: '1d8+1', dmgType: '挥砍', props: '攻击检定与伤害 +1，可附于任意非魔法武器', hands: 1 },
      { id: 'w-plus2', name: '+2 武器', quality: '稀有', price: 4000, dmg: '1d8+2', dmgType: '挥砍', props: '攻击检定与伤害 +2，符文刻线密到发亮', hands: 1 },
      { id: 'w-flaming-longsword', name: '炽焰长剑', quality: '稀有', price: 4000, dmg: '1d8+1 加 1d6 火焰', dmgType: '挥砍／火焰', props: '+1 武器，剑身常年温热，碰到油与干草会点着', hands: 1 },
      { id: 'w-frost-battleaxe', name: '寒冰战斧', quality: '稀有', price: 4500, dmg: '1d8+1 加 1d6 冰冻', dmgType: '挥砍／冰冻', props: '+1 武器，命中后目标移动减 10 尺一轮', hands: 1 },
      { id: 'w-dragonslayer', name: '屠龙者（专属）', quality: '史诗', price: 15000, dmg: '1d8+3 加 3d6 对龙类', dmgType: '挥砍', props: '+3，对龙类额外 3d6 伤害，剑格上刻着一句龙语', hands: 1 }
    ],
    armor: [
      { id: 'a-leather', name: '皮甲', quality: '凡品', price: 10, ac: 11, kind: '轻甲', props: '不限制敏捷加值，游荡者与游侠的常备' },
      { id: 'a-studded', name: '镶钉皮甲', quality: '凡品', price: 45, ac: 12, kind: '轻甲', props: '皮面钉铁，比皮甲重两磅，耐磨' },
      { id: 'a-chainshirt', name: '链甲衫', quality: '精良', price: 50, ac: 13, kind: '轻甲', props: '铁环藏在两层布之间，可穿在外衣里面' },
      { id: 'a-scale', name: '鳞甲', quality: '精良', price: 150, ac: 14, kind: '中甲', props: '铁片叠压，潜行时响声大，有劣势' },
      { id: 'a-chainmail', name: '链甲', quality: '精良', price: 300, ac: 16, kind: '中甲', props: '牧师与战士的初始装备，需力量 13' },
      { id: 'a-plate', name: '板甲（全身）', quality: '精良', price: 1500, ac: 18, kind: '重甲', props: '需力量 15，潜行必有劣势；一件可以传给下一代' },
      { id: 'a-woodshield', name: '木盾', quality: '凡品', price: 5, ac: 2, kind: '盾牌', props: '持用时 AC +2，德鲁伊可用，烧起来也快' },
      { id: 'a-shield', name: '盾牌', quality: '凡品', price: 15, ac: 2, kind: '盾牌', props: '持用时 AC +2，铁包木，边缘可打磨' },
      { id: 'a-plus1', name: '+1 护甲', quality: '罕见', price: 1500, ac: 1, kind: '附魔', props: '在原有护甲 AC 上 +1，可附于任意非魔法护甲' },
      { id: 'a-plus2', name: '+2 护甲', quality: '稀有', price: 7500, ac: 2, kind: '附魔', props: '在原有护甲 AC 上 +2，内侧刻满防护符文' },
      { id: 'a-fireresist', name: '抗火胸甲', quality: '稀有', price: 6000, ac: 17, kind: '中甲', props: '火焰伤害抵抗，落入火场不会立刻被烤熟' },
      { id: 'a-elfchain', name: '精灵链甲', quality: '罕见', price: 1500, ac: 15, kind: '轻甲', props: '无需敏捷限制，重量只有同规格人类链甲的一半' }
    ],
    gear: [
      { id: 'g-ring-protection', name: '防护戒指', quality: '罕见', price: 2000, effect: 'AC +1，与其他防护效果叠加', slot: '戒指' },
      { id: 'g-ring-jumping', name: '跳跃戒指', quality: '罕见', price: 500, effect: '跳跃距离三倍，落地仍需通过体操检定', slot: '戒指' },
      { id: 'g-ring-mindshield', name: '心灵护盾戒指', quality: '稀有', price: 4000, effect: '免疫魅惑和恐惧', slot: '戒指' },
      { id: 'g-bag-holding', name: '次元袋', quality: '稀有', price: 3000, effect: '内部容量约 500 磅，外尺寸不变；两侧对穿会炸', slot: '杂项' },
      { id: 'g-broom-flying', name: '飞行扫帚', quality: '稀有', price: 5000, effect: '飞行速度 50 尺，可载两人', slot: '杂项' },
      { id: 'g-dragonscale-amulet', name: '龙鳞护符', quality: '罕见', price: 600, effect: '术士血脉信物，施法时法术豁免 DC +1', slot: '颈部' },
      { id: 'g-wolffang-charm', name: '狼牙护符', quality: '凡品', price: 20, effect: '荒原部落的成年礼信物，对野兽的威吓检定 +1', slot: '颈部' },
      { id: 'g-family-signet', name: '家徽戒指', quality: '精良', price: 150, effect: '证明姓氏与债务，对贵族与官员的说服检定 +1', slot: '戒指' },
      { id: 'g-holy-symbol', name: '圣徽', quality: '凡品', price: 5, effect: '圣光教会的记号，公开佩戴可向教会求助一次', slot: '颈部' },
      { id: 'g-thief-tools', name: '盗贼工具', quality: '精良', price: 25, effect: '开锁与拆解陷阱用，缺此工具的相关检定有劣势', slot: '工具' },
      { id: 'g-material-pouch', name: '材料包', quality: '凡品', price: 25, effect: '施法材料与墨水，抄录卷轴的基础消耗', slot: '工具' },
      { id: 'g-herbal-kit', name: '草药包', quality: '凡品', price: 15, effect: '德鲁伊法器配件，采集与急救检定 +1', slot: '工具' },
      { id: 'g-rest-candle', name: '安息烛', quality: '凡品', price: 1, effect: '亡者之夜点燃，可让幽魂在十尺外停步', slot: '杂项' },
      { id: 'g-old-compass', name: '旧罗盘', quality: '精良', price: 30, effect: '维兰之海与无尽之海航行用，海上迷航检定有优势', slot: '工具' },
      { id: 'g-bear-trap', name: '捕兽夹', quality: '凡品', price: 5, effect: '对中型以下野兽的首次攻击自动命中并束缚一轮', slot: '工具' }
    ]
  };

  WD.ARTIFACTS = [
    { name: '永恒之剑', type: '单手剑', power: '对邪恶生物造成三倍伤害，永不磨损', cost: '必须誓言为正义而战，否则剑身自噬持剑者' },
    { name: '龙火之冠', type: '头冠', power: '操控火焰，召集群龙', cost: '佩戴者会被龙族感知，且逐渐龙化' },
    { name: '贤者之石', type: '宝石', power: '点铅成金、延寿、施法增幅', cost: '每次使用削减使用者的寿命' },
    { name: '命运之书', type: '书籍', power: '看到未来的片段', cost: '窥视命运者会被命运扭曲，看到的那一页必然发生' },
    { name: '月影斗篷', type: '披风', power: '短距离传送，气息隐藏', cost: '只能夜间使用，满月之夜失效' }
  ];

  WD.SPELLS = [
    { lv: 0, name: '光亮术', school: '塑能', effect: '让一件物品发出相当于火把的光，持续一小时，湿透的木头点不着', forbidden: null },
    { lv: 0, name: '法师之手', school: '咒法', effect: '隔空移动十磅以内的物件，开门、取钥匙、拨开陷阱绳', forbidden: null },
    { lv: 0, name: '霜噬', school: '塑能', effect: '远程凝出一层白霜，造成 1d8 冰冻伤害并让目标移速减 10 尺', forbidden: null },
    { lv: 0, name: '修复术', school: '变化', effect: '接合一处断裂的非魔法物件，断口对不齐就修不回原样', forbidden: null },
    { lv: 0, name: '侦测魔法', school: '预言', effect: '看到三十尺内魔法灵光的强弱与学派，被铅板挡住', forbidden: null },
    { lv: 1, name: '魔法飞弹', school: '塑能', effect: '三枚力场飞弹自动命中，各造成 1d4+1 伤害，从不失手', forbidden: null },
    { lv: 1, name: '护盾术', school: '防护', effect: '反应施放，一轮内 AC +5，免疫魔法飞弹', forbidden: null },
    { lv: 1, name: '燃烧之手', school: '塑能', effect: '掌心喷出十五尺锥形火焰，3d6 火焰伤害，敏捷豁免减半', forbidden: null },
    { lv: 1, name: '治疗微伤', school: '咒法', effect: '触碰治疗 2d4+2 生命值，对不死生物无效', forbidden: null },
    { lv: 1, name: '魅惑人类', school: '附魔', effect: '让一个人形目标把你当作熟人，魅力豁免抵抗，做出伤害其同伴的事即解除', forbidden: null },
    { lv: 1, name: '睡眠术', school: '附魔', effect: '在二十尺内放倒合计 5d8 生命的弱小目标，先倒最弱的', forbidden: null },
    { lv: 2, name: '灼热射线', school: '塑能', effect: '三道火焰射线，每道 2d6 火焰伤害，可分开指定目标', forbidden: null },
    { lv: 2, name: '镜影术', school: '幻术', effect: '造出三个与本人同步的影像，被击中一次少一个', forbidden: null },
    { lv: 2, name: '人类定身术', school: '附魔', effect: '定住一个人形目标，感知豁免抵抗，每轮可重掷', forbidden: null },
    { lv: 2, name: '熊之耐力', school: '变化', effect: '触碰目标，生命上限加 2d6 并等量回血，持续一小时', forbidden: null },
    { lv: 2, name: '沉默术', school: '幻术', effect: '二十尺半径内无声，含语言成分的法术一律施不出', forbidden: null },
    { lv: 3, name: '火球术', school: '塑能', effect: '二十尺半径爆开，8d6 火焰伤害，敏捷豁免减半，引燃可燃物', forbidden: null },
    { lv: 3, name: '闪电束', school: '塑能', effect: '一百尺直线，8d6 闪电伤害，金属护甲的目标豁免有劣势', forbidden: null },
    { lv: 3, name: '防护法阵', school: '防护', effect: '十尺半径法阵，指定一类生物无法进入或魅惑阵内目标', forbidden: null },
    { lv: 3, name: '治疗重伤', school: '咒法', effect: '触碰治疗 4d6+6 生命值，可同时解除一项疾病', forbidden: null },
    { lv: 3, name: '死者交谈', school: '死灵', effect: '让一具尸体回答五个问题，答案取决于它生前知道什么，尸体不会说谎也不会全说', forbidden: '死灵' },
    { lv: 4, name: '冰风暴', school: '塑能', effect: '二十尺半径冰雹与冻雨，2d8 钝击加 4d6 冰冻，地面结冰一轮', forbidden: null },
    { lv: 4, name: '变形术', school: '变化', effect: '把目标变成一头野兽，保留心智者极少，受伤过量会变回原形', forbidden: null },
    { lv: 4, name: '放逐术', school: '防护', effect: '把一名异界生物送回本位面，魅力豁免抵抗，材料需按其来源准备', forbidden: null },
    { lv: 4, name: '操纵死尸', school: '死灵', effect: '把一具尸体拉起来当仆役，它记得生前的动作，也记得生前的仇人', forbidden: '死灵' },
    { lv: 5, name: '石墙术', school: '塑能', effect: '召出三十尺长、十尺高的石墙，可封路也可当掩体，被砸中受 2d6', forbidden: null },
    { lv: 5, name: '群体治疗重伤', school: '咒法', effect: '三十尺内至多六人各回复 4d6+6 生命值', forbidden: null },
    { lv: 5, name: '支配人类', school: '附魔', effect: '完全控制一个人形目标的行动，感知豁免抵抗，命令违背其本性时它可重掷', forbidden: '惑控' },
    { lv: 5, name: '探知', school: '预言', effect: '以一件属于目标的物件为引，看到它周围三十尺的景象，目标可感知被窥视', forbidden: null },
    { lv: 6, name: '死亡法阵', school: '死灵', effect: '六十尺半径内活物枯萎，8d6 死灵伤害，施法者回复其中一半', forbidden: '死灵' },
    { lv: 6, name: '真知术', school: '预言', effect: '一百二十尺内看破幻术、变形与隐形，持续一小时，眼睛会发烫', forbidden: null },
    { lv: 6, name: '链状闪电', school: '塑能', effect: '一道闪电在目标之间跳跃，最多四个目标，各 10d6 闪电伤害', forbidden: null },
    { lv: 7, name: '传送术', school: '咒法', effect: '带人瞬间移动到大路上熟悉的地点，不熟悉的地方会偏出几里', forbidden: null },
    { lv: 7, name: '位面穿梭', school: '咒法', effect: '开启通往元素位面或中环位面的门，坐标多来自巨人语残卷', forbidden: null },
    { lv: 7, name: '力场牢笼', school: '塑能', effect: '十尺见方的不可破坏力场，关得住炎魔，关不住会传送的东西', forbidden: null },
    { lv: 8, name: '太阳射线', school: '塑能', effect: '一道白光，12d6 光耀伤害，对不死生物与恶魔再加 6d6', forbidden: null },
    { lv: 8, name: '克隆术', school: '死灵', effect: '培育一具备用的身体，原体死亡后灵魂迁入，新身体醒来时带着旧伤的记忆', forbidden: '死灵' },
    { lv: 8, name: '心灵屏障', school: '防护', effect: '一天内免疫心灵读取、魅惑与恐惧，也读不进别人的心', forbidden: null },
    { lv: 9, name: '流星爆', school: '塑能', effect: '四颗流星落地，各四十尺半径 20d6 火焰加 20d6 钝击，地形随之改变', forbidden: null },
    { lv: 9, name: '祈愿术', school: '变化', effect: '改写一件已发生的小事，代价按改动的大小从施法者身上扣，没人能事先算清', forbidden: null },
    { lv: 9, name: '真言术 · 死', school: '死灵', effect: '说出一个词，百尺内生命低于一百的目标当场死亡，尸体不会留下伤口', forbidden: '死灵' },
    { lv: 9, name: '时间停滞', school: '变化', effect: '在自身周围冻结时间两到五轮，只有施法者能行动；用过的人会老上几年', forbidden: '时间' },
    { lv: 9, name: '召唤炎魔', school: '咒法', effect: '从深渊之渊拉出一头巴洛魔，它不会区分敌我，也不一定回去', forbidden: '恶魔' }
  ];

  WD.TALENTS = {
    SSS: [
      { id: 'sss-fate-thread', name: '命运之线', grade: 'SSS', desc: '众星之母的梦境里有一根线系在你身上。每场战斗的第一次判定可以重掷一次，重掷的结果必须接受。', effect: { special: 'reroll_first' } },
      { id: 'sss-death-door', name: '死者之门', grade: 'SSS', desc: '你死过一次，门没有开。生命归零时以 1 点生命站住，每七天只能触发一次。', effect: { special: 'death_door' } },
      { id: 'sss-blood-contract', name: '血契', grade: 'SSS', desc: '你签过的契约以血脉担保。与组织立约时对方一开始就把你当自己人，违约则血脉反噬，属性长期下降。', effect: { rep: { '冒险者公会': 2, '秘银兄弟会': 2 }, special: 'contract_bond' } },
      { id: 'sss-third-hour', name: '第三刻', grade: 'SSS', desc: '每一天你多出两个时辰，用来抄录、磨刀或补觉。这段时间别人看不见，也插不进手。', effect: { special: 'extra_hours' } },
      { id: 'sss-grave-calm', name: '墓中静默', grade: 'SSS', desc: '你在旧坟场的地穴里睡过一夜，醒来后天亮得比平时早。恐惧与魅惑对你无效。', effect: { special: 'immune_fear_charm' } },
      { id: 'sss-star-written', name: '星命所书', grade: 'SSS', desc: '命运先知会替你写过一行字，只有日期，没有死因。升级所需经验减少两成。', effect: { special: 'xp_discount' } },
      { id: 'sss-wound-ledger', name: '伤簿', grade: 'SSS', desc: '死亡教团替你记着一本伤簿。战斗中受到的一半伤害记账，战斗结束后统一结算；若你在结算前脱离战斗，只需付一半。', effect: { special: 'delay_damage' } },
      { id: 'sss-nameless', name: '无名者', grade: 'SSS', desc: '影之议会的档案里没有你的条目，预言法术也照不到你。针对你的追踪与探知检定有劣势。', effect: { rep: { '影之议会': -1 }, special: 'untrackable' } },
      { id: 'sss-dragonblood', name: '龙血苏醒', grade: 'SSS', desc: '隔了三代的龙裔血脉在你身上返祖。每日一次吐息，锥形范围内造成 4d6 伤害，属性随你体内的血统而定。', effect: { special: 'breath_weapon' } },
      { id: 'sss-hollow-crown', name: '空冠', grade: 'SSS', desc: '王座空着的时候，站在前面的人说话最响。对掌权者的威吓与游说检定 +3，对无权者无效。', effect: { checks: 3, rep: { '圣光教会': 1 }, special: 'power_speech' } },
      { id: 'sss-debt-collector', name: '讨债人', grade: 'SSS', desc: '你替命运收账。每次击杀后回复 10 点生命；若目标生前欠你人情，回复翻倍。', effect: { hp: 10, special: 'kill_heal' } },
      { id: 'sss-cold-reading', name: '因果读数', grade: 'SSS', desc: '战斗开始时你能看清接下来六秒的走向。首轮 AC +2，敌人对你的第一次攻击失手。', effect: { ac: 2, special: 'foresee_round' } },
      { id: 'sss-oath-iron', name: '铁誓', grade: 'SSS', desc: '你当众立下的誓言会改写身体。誓言兑现时魅力 +2、感知 +1；誓言破了，这两项一起收回。', effect: { attrs: { cha: 2, wis: 1 }, special: 'oath_boon' } },
      { id: 'sss-last-candle', name: '最后一烛', grade: 'SSS', desc: '亡者之夜的安息烛在你手里烧得比别人久。队友倒下时你攻击 +3、伤害 +3，直到这场战斗结束。', effect: { atk: 3, dmg: 3, special: 'last_stand' } }
    ],
    A: [
      { id: 'a-veteran-eye', name: '老兵之眼', grade: 'A', desc: '看过太多阵型崩溃的场面，出手前先看对方的脚下。攻击检定 +1。', effect: { atk: 1 } },
      { id: 'a-mountain-constitution', name: '山民体魄', grade: 'A', desc: '在雪线以上长大，肺比常人大一圈。生命上限 +12，体质 +1。', effect: { hp: 12, attrs: { con: 1 } } },
      { id: 'a-forge-hand', name: '炉前的手', grade: 'A', desc: '十二年锤打留下的手感，知道哪一处护甲最薄。AC +1。', effect: { ac: 1 } },
      { id: 'a-hunter-sense', name: '猎人手感', grade: 'A', desc: '脚印、折断的枝条、风向，你比同行早半个时辰发现猎物。相关检定 +2。', effect: { checks: 2 } },
      { id: 'a-shadow-raised', name: '阴影里长大', grade: 'A', desc: '在城邦底层学会了怎么让眼睛滑过去。敏捷 +1，相关检定 +1。', effect: { attrs: { dex: 1 }, checks: 1 } },
      { id: 'a-between-pages', name: '书页之间', grade: 'A', desc: '抄本、注疏与批注都在你的脑子里排好了序。智力 +1，相关检定 +1。', effect: { attrs: { int: 1 }, checks: 1 } },
      { id: 'a-caravan-miles', name: '商队里程', grade: 'A', desc: '跟着货车走过七条商路，知道哪一段收过路费。起始资金 +120 GP。', effect: { gold: 120 } },
      { id: 'a-church-deacon', name: '教会执事', grade: 'A', desc: '点过灯、记过账、抬过棺。教会对你有一份人情，生命上限 +6。', effect: { rep: { '圣光教会': 2 }, hp: 6 } }
    ],
    B: [
      { id: 'b-nightwalker', name: '走夜路的人', grade: 'B', desc: '夜里赶路是常事，火光晃不花你的眼。相关检定 +1。', effect: { checks: 1 } },
      { id: 'b-barracks-routine', name: '兵营作息', grade: 'B', desc: '什么时候吃饭、什么时候换岗，你比号手还准。生命上限 +8。', effect: { hp: 8 } },
      { id: 'b-haggler', name: '讨价还价', grade: 'B', desc: '摊主报价你先砍三成，成交价通常落在中间。起始资金 +80 GP。', effect: { gold: 80 } },
      { id: 'b-tavern-regular', name: '酒馆熟人', grade: 'B', desc: '三个城的酒馆老板都记得你赊过账也还过账。冒险者公会声望 +1。', effect: { rep: { '冒险者公会': 1 } } },
      { id: 'b-broad-shoulder', name: '结实的肩', grade: 'B', desc: '扛得动别人两个人抬的箱子。力量 +1。', effect: { attrs: { str: 1 } } },
      { id: 'b-steady-hand', name: '稳的手', grade: 'B', desc: '开锁、缝合、写字，手都不抖。敏捷 +1。', effect: { attrs: { dex: 1 } } },
      { id: 'b-market-tongue', name: '市集上的舌头', grade: 'B', desc: '两句寒暄能把话题引到价钱上，起始资金 +60 GP，相关检定 +1。', effect: { gold: 60, checks: 1 } },
      { id: 'b-watch-contact', name: '治安队的旧关系', grade: 'B', desc: '巡逻队里有人欠你一次放行。圣光教会声望 +1。', effect: { rep: { '圣光教会': 1 } } }
    ],
    C: [
      { id: 'c-full-meal', name: '一顿饱饭', grade: 'C', desc: '出发前吃了一顿有肉的饭。生命上限 +5。', effect: { hp: 5 } },
      { id: 'c-whetted-edge', name: '磨快的刃', grade: 'C', desc: '刀口刚在磨石上走过一遍。攻击检定 +1。', effect: { atk: 1 } },
      { id: 'c-patched-leather', name: '缝好的皮甲', grade: 'C', desc: '肩头与肋下都加了一层皮。AC +1。', effect: { ac: 1 } },
      { id: 'c-saved-coppers', name: '攒下的铜板', grade: 'C', desc: '布袋子里的零钱，够住几晚通铺。起始资金 +35 GP。', effect: { gold: 35 } },
      { id: 'c-word-of-mouth', name: '熟人的口信', grade: 'C', desc: '有人替你在公会柜台上说过一句话。冒险者公会声望 +1。', effect: { rep: { '冒险者公会': 1 } } },
      { id: 'c-sharp-eyes', name: '眼力', grade: 'C', desc: '隔一条街能认出告示板上的悬赏金额。相关检定 +1。', effect: { checks: 1 } },
      { id: 'c-hardy', name: '皮实', grade: 'C', desc: '冻过、饿过、被打过，还站得住。体质 +1。', effect: { attrs: { con: 1 } } },
      { id: 'c-two-songs', name: '会唱两句', grade: 'C', desc: '会唱半首北境民谣与一首南方小调。魅力 +1。', effect: { attrs: { cha: 1 } } }
    ],
    D: [
      { id: 'd-quick-cut', name: '顺手的一刀', grade: 'D', desc: '刀握得比一般人顺。伤害 +1。', effect: { dmg: 1 } },
      { id: 'd-cloth-purse', name: '布口袋', grade: 'D', desc: '袋底还剩些钱，够买干粮和箭。起始资金 +20 GP。', effect: { gold: 20 } },
      { id: 'd-good-boots', name: '好鞋', grade: 'D', desc: '鞋底厚，走碎石路不磨脚。相关检定 +1。', effect: { checks: 1 } },
      { id: 'd-three-days-rations', name: '三天干粮', grade: 'D', desc: '硬饼与咸肉，嚼得动就撑得住。生命上限 +4。', effect: { hp: 4 } },
      { id: 'd-stripped-bracer', name: '拆下的护腕', grade: 'D', desc: '从旧甲上拆下来的铁片，绑在左臂。AC +1。', effect: { ac: 1 } },
      { id: 'd-whetstone', name: '磨刀石', grade: 'D', desc: '巴掌大的一块，闲着就磨两下。伤害 +1。', effect: { dmg: 1 } },
      { id: 'd-old-blanket', name: '旧毯子', grade: 'D', desc: '羊毛的，扎人但保暖。生命上限 +3。', effect: { hp: 3 } },
      { id: 'd-knows-the-road', name: '记得路', grade: 'D', desc: '走过一次的路你就记得岔口在哪。相关检定 +1。', effect: { checks: 1 } }
    ]
  };

  WD.TIMELINE = {
    eras: [
      { name: '创世纪元', dur: '未知', event: '众星之母创造世界与诸族，巨龙受命守护，精灵见证美，人类承载可能' },
      { name: '巨龙纪元', dur: '约 10000 年', event: '巨龙统治世界，精灵与矮人崛起；部分巨龙背离守护职责，堕为彩色龙' },
      { name: '帝国纪元', dur: '约 3000 年', event: '人类建立首个泛大陆帝国，魔法繁盛，帝国古语通行全境' },
      { name: '帝国崩塌', dur: '约 200 年', event: '恶魔战争爆发，帝国分裂为七王国，灰雾平原以南打成焦土' },
      { name: '当代纪元', dur: '约 800 年至今', event: '七王国并立，精灵与矮人式微，冒险者时代来临' }
    ],
    events: [
      { year: 724, name: '灰渡停战', desc: '晨曦王国与雄鹿王国在灰渡签订十年停战，两国把兵力转向边境，哨兵堡的边军扩编一倍。停战续了三次，两边的账都还记着。' },
      { year: 741, name: '铁砧易主', desc: '群山王国在铁砧大厅按氏族选票选出新一任山丘之王。同一天，秘银兄弟会在工坊街定下附魔最低价，从此没有工匠敢私下压价。' },
      { year: 756, name: '禁奴令', desc: '白港城十二个商人家族在鲸油灯市闭门三日，通过禁奴令。幽暗地域的奴隶船改挂南方旗号，暗蛛城的报价当年涨了两成。' },
      { year: 773, name: '星母之泪', desc: '十七年一次的流星雨落在北半球，命运先知会在灰雾平原边缘发布三行预言，第一行提到染血的天空。蜡封原件存在先知会地窖，抄本卖到两百金币一份。' },
      { year: 790, name: '银月换座', desc: '希尔瓦娜·月影接任法师公会枢密院首席，同一年星辉城的王座厅开始常年亮灯。永恒女王依旧没有露面，宫廷照旧按她的名义签发文书。' },
      { year: 807, name: '黄金城封锁', desc: '深渊守望者在黄铜沙漠深处封住一处位面裂隙，把入口记为黄金城。第一批进去的两队人只回来三个，回来后都拒绝描述里面有什么。' },
      { year: 817, name: '赤月之年', desc: '血月当空，深渊之渊封印削弱，恶魔活动频率激增。守望者半年内丢掉三处哨所，影之议会最高层第一次以无面者的名号被人记录在案。' },
      { year: 824, name: '血色的天空', desc: '深秋，灰雾平原的雾向北漫过界碑，安息烛在无风的夜里成片熄灭。命运先知会重开 773 年封存的蜡封，第三次恶魔战争的阴影从这一年起被计入日程。' }
    ],
    omens: [
      '当天空染上血色，深渊之喉将再度开启。',
      '双日凌空之时，新王诞生，帝国重归。',
      '星母落泪之年，命运先知开口，凡人闭嘴。'
    ],
    current: { year: 824, era: '当代纪元', season: '深秋' }
  };

  WD.HEROES = [
    { name: '阿尔德里克·晨光', race: '人类', job: '圣骑士', title: '黎明之刃', area: '晨曦王国', bio: '圣光教会审判所总长，疑似传奇等级，曾独自在灰雾平原南缘斩杀一头深渊领主，尸首烧了三天。审判所的案卷公开，判决理由不公开。', level: 19, cr: 19 },
    { name: '希尔瓦娜·月影', race: '高等精灵', job: '大法师', title: '银月先知', area: '星辉城', bio: '法师公会枢密院首席，精通预言与时空法术，已活 1100 年。她签发的越级借阅许可比国王的通行证更值钱。', level: 20, cr: 21 },
    { name: '铁砧·石心', race: '山地矮人', job: '战士', title: '山丘之王', area: '群山王国', bio: '矮人现任国王，持有神器大地之锤，锻造技艺登峰造极。他每年在锻造节上亲手打一件东西，打完就送人。', level: 18, cr: 18 },
    { name: '黑牙', race: '半兽人', job: '野蛮人', title: '荒原屠夫', area: '边境领与南境荒原', bio: '前荒原部落酋长，现为佣兵头目，背叛了自己的族群。他接单有三个条件：不劫商队、不杀孩童、不问雇主姓名。', level: 14, cr: 14 },
    { name: '无面者', race: '人类', job: '游荡者（？）', title: '影中鬼', area: '全大陆', bio: '影之议会最高层，身份未知，可能并非单人而是一个代号。至少四座城的档案里记着同一副面具与不同的身高。', level: 17, cr: 18 }
  ];

  WD.LEGEND_HEROES = [
    { name: '瓦伦·奥雷利安', era: '帝国崩塌', deed: '泛大陆帝国的最后一位皇帝。恶魔战争打到第三年，他把帝国王冠熔成七块分给七个军团统帅，各自守一段防线，帝国从此分裂为七王国。', legacy: '七王国的法统都声称继承他；龙骨山脉有一座他的空棺，棺盖内侧刻着七个名字。' },
    { name: '塔尔萨兰', era: '巨龙纪元', deed: '金属龙中唯一拒绝随彩色龙背离守护职责的一头。它用身体堵住北境的一处时空裂隙约三百年，直到裂隙自己合拢。', legacy: '银峰山脉的观星台仍记着它的飞行路线；此后金属龙现世罕见，多数沉睡或离开主位面。' },
    { name: '莫尔丁·石心', era: '帝国纪元', deed: '群山王国第一任山丘之王，在铁锤山脉打通第一条深井升降机，把塌方里困住的八十个氏族分批带出地面，自己最后一个上来。', legacy: '秘银兄弟会出师考试仍以他的名字起誓；每一任山丘之王当选后，要在他的石像前站一夜。' }
  ];

  WD.CALENDAR = {
    months: [
      { n: 1, name: '冰封之月', season: '深冬', trait: '最寒冷的月份，北境积雪深达数米' },
      { n: 2, name: '复苏之月', season: '初春', trait: '冰雪消融，河流泛滥，农事开始' },
      { n: 3, name: '萌芽之月', season: '仲春', trait: '万物复苏，精灵举行绿醒节' },
      { n: 4, name: '花语之月', season: '暮春', trait: '百花盛开，最佳旅行季节' },
      { n: 5, name: '艳阳之月', season: '初夏', trait: '南方开始炎热，北境气候宜人' },
      { n: 6, name: '丰收之月', season: '仲夏', trait: '第一批谷物收割，举办丰收祭' },
      { n: 7, name: '烈阳之月', season: '盛夏', trait: '全年最热，沙漠地区昼间无法行军' },
      { n: 8, name: '余烬之月', season: '初秋', trait: '暑气渐退，战事多发之月' },
      { n: 9, name: '金叶之月', season: '仲秋', trait: '树叶转金，矮人举行锻造节' },
      { n: 10, name: '暮色之月', season: '深秋', trait: '白昼缩短，亡者气息渐浓' },
      { n: 11, name: '霜降之月', season: '初冬', trait: '第一场雪降临，商队开始歇冬' },
      { n: 12, name: '长夜之月', season: '隆冬', trait: '白昼最短，新年庆典前夕' }
    ],
    weekdays: [
      { n: 1, name: '日曜日', meaning: '圣光之主庇佑之日' },
      { n: 2, name: '月曜日', meaning: '月之女士赐福魔法之日' },
      { n: 3, name: '火曜日', meaning: '战争与勇气之日' },
      { n: 4, name: '土曜日', meaning: '大地与劳作之日' },
      { n: 5, name: '风曜日', meaning: '旅行与贸易之日' },
      { n: 6, name: '影曜日', meaning: '秘密与安息之日' },
      { n: 7, name: '星曜日', meaning: '众星之母的圣日，宗教礼拜日' }
    ],
    festivals: [
      { month: 1, day: 1, name: '星母诞辰', desc: '全大陆最盛大的新年庆典，持续 5 天，用年末的节庆日结算' },
      { month: 3, day: 21, name: '绿醒节', desc: '精灵与德鲁伊的自然祭祀，百鸟归林' },
      { month: 6, day: 15, name: '丰收祭', desc: '七王国共同庆祝的农业节日，竞武大会常在此日举行' },
      { month: 8, day: 7, name: '锻造节', desc: '矮人展示年度最佳作品的盛会，武器价格当日折扣' },
      { month: 10, day: 31, name: '亡者之夜', desc: '灰雾平原与现实重叠的夜晚，亡灵出没，需点燃安息烛' },
      { month: 12, day: 20, name: '长夜守望', desc: '一年中最长的夜晚，人们守夜迎接新年曙光' }
    ],
    omens: [
      { name: '星母之泪', cycle: '每 17 年一次', desc: '流星雨，被视为重大变故的预兆，命运先知会在此时发布预言' },
      { name: '赤月', cycle: '每 7 年一次', desc: '血月现象，深渊之喉的封印削弱，恶魔活动频率激增' },
      { name: '双日凌空', cycle: '百年一遇', desc: '被视为新王诞生或帝国重归的标志，上次出现于星母历 714 年' }
    ]
  };

  WD.LEGENDS = [
    { region: '中部平原', rows: [
      { n1: 1, n2: 1, text: '九座风磨里有三座是空的，磨盘底下压着帝国纪元的粮账。翻过账册的人后来都替那笔账做了主。' },
      { n1: 2, n2: 2, text: '无风的正午站在帝国旧道的石桥上，能听见车辙声从桥下过去。老车夫说那是帝国纪元的运粮队还在赶路，别应声。' },
      { n1: 3, n2: 3, text: '麦收时若在田里捡到刻着金色圆盘的小铁片，交给教会按枚数换口粮，一枚换三天，附带一次小赦免。' },
      { n1: 4, n2: 4, text: '曙光城北关的守夜人换岗前往墙根洒一把盐，说是给冻死在官道上的行商留个记号，好让收尸的人认得地方。' }
    ] },
    { region: '北境冰原', rows: [
      { n1: 1, n2: 1, text: '霜脊村的火塘一夜不熄。添柴的人不能回头看门，回头的人第二天会在雪地上找不到自己的脚印。' },
      { n1: 2, n2: 2, text: '一月的暴风雪里，狗先朝西叫，再朝东叫。中间那段时间不要出门，猎户把这叫风换气。' },
      { n1: 3, n2: 3, text: '冰川上有一种蓝冰，敲下来含在嘴里能顶半天干渴，代价是之后三天尝不出咸味，盐放多少都白放。' },
      { n1: 4, n2: 4, text: '世界之喉底下的旧营地属于三百年前一支北境探险队，绳梯还挂在缝壁上，长度够不到底，绳子却还没烂。' }
    ] },
    { region: '艾索洛伦森林', rows: [
      { n1: 1, n2: 1, text: '林语门的树门入夜会自己合上。守门的精灵不点灯，靠脚步重量分人，背货的与空手的走的是两条路。' },
      { n1: 2, n2: 2, text: '倒影湖的鱼不能吃。捞上来的鱼腹里有写字的树皮，精灵语写的是别人家的事，读完要交还林语门。' },
      { n1: 3, n2: 3, text: '伐木营地每年往林线里推进两株树的距离。精灵按株记账，账本记到第八本，就该有人来收了。' },
      { n1: 4, n2: 4, text: '绿醒节的第一声鸟叫若是乌鸦，大德鲁伊议会当年不接待外人，连绿枝信物也不认。' }
    ] },
    { region: '黄铜沙漠及南境', rows: [
      { n1: 1, n2: 1, text: '三处咸水井的井绳都换过，最早那根绳上打着七种结，每种结代表一支没回来的商队。' },
      { n1: 2, n2: 2, text: '沙暴过后在废墟里捡到金砖，就把它埋回原处。带出沙漠的金子会在第二年把主人带回沙漠。' },
      { n1: 3, n2: 3, text: '烬墟镇的探险者酒馆有个规矩：谁把三重锁门的拓片摊在桌上，谁就得请全屋喝一轮。' },
      { n1: 4, n2: 4, text: '荒原部落南下的年份，枯河床会先涨一次水。边境哨塔看见水就往城里收粮，一袋都不留。' }
    ] }
  ];

  WD.RUMORS = [
    { n: 1, text: '"龙骨山脉深处发现了未被开采的龙晶矿脉！"', truth: '真' },
    { n: 2, text: '"晨曦国王其实是被恶魔附身的傀儡。"', truth: '假' },
    { n: 3, text: '"银冠王庭的永恒女王已有三百年未公开露面，可能已去世。"', truth: '真' },
    { n: 4, text: '"黄铜沙漠深处有一座黄金城，进入者无不暴富。"', truth: '半真半假' },
    { n: 5, text: '"北境共和国正在秘密建造一支飞空舰队。"', truth: '真' },
    { n: 6, text: '"深渊守望者组织上个月全军覆没，封印已无人看守。"', truth: '假' },
    { n: 7, text: '"高塔城的法师公会又在收学徒了，考题是把一根蜡烛点着，不许用火。"', truth: '真' },
    { n: 8, text: '"铁王座堡的比武签是抽过的，冠军队去年就内定了。"', truth: '假' },
    { n: 9, text: '"铁砧大厅的深井升降机断过一次钢缆，死了十一个矿工，账上记的是病故。"', truth: '半真半假' },
    { n: 10, text: '"白港城要废掉禁奴令，南边的奴隶船已经在冻港外下锚。"', truth: '半真半假' },
    { n: 11, text: '"幽影堡的大德鲁伊议会里有人收人类伐木者的钱，账记在绿枝信物的编号上。"', truth: '真' },
    { n: 12, text: '"哨兵堡的军粮里掺了木屑，边军去年冬天啃了三个月的黑面包。"', truth: '半真半假' },
    { n: 13, text: '"曙光城审判所的地窖里关着一个不肯报名字的高等精灵，关了四十年。"', truth: '真' },
    { n: 14, text: '"暗蛛城的毒药巷里，让人睡三天的药和让人永远睡下去的药摆在同一张桌上。"', truth: '真' },
    { n: 15, text: '"法师公会枢密院空了一个座位，第七位大法师半年前进了时空裂隙，没回来。"', truth: '半真半假' },
    { n: 16, text: '"山丘之王在锻造节上打的那把锤子，其实是秘银兄弟会代工的。"', truth: '假' },
    { n: 17, text: '"灰雾平原的雾今年漫过了界碑，安息烛在无风的夜里自己灭。"', truth: '真' },
    { n: 18, text: '"南方联合王国的总督跟沼泽里的娜迦做过交易，用一条水渠换了一整支驼队。"', truth: '半真半假' },
    { n: 19, text: '"影之议会在龙烬遗迹外设了三道卡，进去的队伍要先交一份地图。"', truth: '假' },
    { n: 20, text: '"第三次恶魔战争已经开始了，只是还没轮到中部平原。"', truth: '半真半假' }
  ];

  WD.ETYMOLOGY = [
    { name: '艾尔德兰', origin: '创世符文 El-Dor-Lan', meaning: '众星之母的怀抱' },
    { name: '曙光城', origin: '帝国古语 Aurum-port', meaning: '黄金之门' },
    { name: '龙骨山脉', origin: '通用语直译', meaning: '被钉入地心的恶龙骸骨露出地面形成' },
    { name: '艾索洛伦森林', origin: '高等精灵语 Aes-Lor-En', meaning: '永恒之绿' },
    { name: '铁砧大厅', origin: '矮人语 Khaz-Mordin', meaning: '锻造之核' },
    { name: '灰雾平原', origin: '通用语直译', meaning: '亡者灵魂汇聚之地，常年笼罩雾气' }
  ];

  WD.PRICING = [
    { kind: '消耗品（药水／卷轴）', formula: '法术环数平方 × 30 GP：1 环 = 30，3 环 = 270，5 环 = 750' },
    { kind: '永久武器／护甲', formula: '加值平方 × 1000 GP：+1 = 1000，+2 = 4000，+3 = 9000；额外特效再加五成到两倍' },
    { kind: '奇物（功能型）', formula: '按效果类比法术环数 × 500 GP，再加稀有度溢价' },
    { kind: '通用下限', formula: '定价不可低于材料成本的一半，否则视为黑市赃物或赝品' }
  ];

  WD.OPENINGS = [
    {
      id: 'op-north', name: '灰烬下的狼嚎', place: '霜脊村', region: '北境冰原', terrain: '冰原', nation: '北境共和国', month: 1, day: 4,
      hook: '深冬一月，暴风雪封住所有通往外界的道路，积雪埋过院墙。村中连续三夜有孩童失踪，雪地上只留下巨大的爪印。村民认定是冰原狼人作祟，年迈的猎人私下告诉你，那爪印更接近龙裔的足迹。',
      initial: '你是误入此地的旅者，或是本地猎手。村长恳求你调查，暴风雪中你只有三天的补给，出门就得算着口粮走。',
      task: '追踪爪印前往冰川裂缝，查明失踪真相。极可能遭遇一支被流放的北方龙裔小队，他们正在寻找某件冰封的古代遗物。',
      tone: '生存、寒冷、道德困境。龙裔并非全然邪恶，村里人的说法也不全对。',
      npc: { name: '卡尔', role: '霜脊村老猎人' }
    },
    {
      id: 'op-dawn', name: '玫瑰下的毒刺', place: '喷泉广场', region: '中部平原', terrain: '平原', nation: '晨曦王国', month: 6, day: 14,
      hook: '星母历 824 年，丰收祭前夕。晨曦国王宣布要在节日期间颁布一项重要法令，传闻将大幅削弱贵族特权。翌日，国王最宠信的财政大臣被发现死在书房，胸口插着一朵黑玫瑰。城中流言指认是雄鹿王国派来的刺客。',
      initial: '你是一名刚抵达都城的新人，或本地的小贵族、商人。你在广场上目睹一名女子被卫兵追捕，她把一枚染血的印章塞进你手里，低声说："别让真相死在玫瑰之下。"',
      task: '查明印章来源，它指向某座贵族府邸；同时避开卫兵与暗处杀手的追踪。你会被卷进宫廷派系斗争，真正的凶手可能就站在国王身边。',
      tone: '阴谋、政治、谍战。每一步都要付代价，说错一句话就有人替你记上。',
      npc: { name: '伊莎·索恩', role: '塞给你染血印章的女子' }
    },
    {
      id: 'op-forest', name: '绿血的誓言', place: '林语门', region: '艾索洛伦森林', terrain: '森林', nation: '绿林议会', month: 10, day: 9,
      hook: '暮色之月，森林深处的古树开始枯萎，树皮裂口里流出绿色粘稠的液体。木精灵大德鲁伊议会派信使向外界求援，称森林之心被盗，最可疑的嫌犯是近年活跃于边境的影之议会特工。',
      initial: '你受自然之环委托前来，或与精灵有旧缘。你拿到一枚绿枝信物，可穿行部分林区；同时你也看清了人类伐木者与精灵的矛盾正在激化，两边都在集结。',
      task: '深入森林深处，找回被盗的森林之心，那是一颗翡翠色晶石。途中会遇到被腐化的野兽、影之议会设下的陷阱，以及敌视外人的精灵激进派。',
      tone: '自然、种族伤痕与随时可能开战的边境。',
      npc: { name: '莱瑟兰', role: '林语门精灵信使' }
    },
    {
      id: 'op-desert', name: '龙烬遗迹', place: '烬墟镇', region: '黄铜沙漠', terrain: '沙漠', nation: '南方联合王国', month: 7, day: 12,
      hook: '烈阳之月，一场沙暴过后，沙漠里露出一座从未记载的古代龙裔城市废墟。消息传开，各方势力云集：法师公会想攫取知识，格瑞纳达龙裔帝国派出皇家考古队，圣光教会则认定此处封印着古代恶魔。',
      initial: '你在镇上的酒馆里，被一名濒死的探险者塞了一张破损的羊皮纸，上面画着一扇三重锁的门。沙漠白昼气温超过 50 度，夜间降到冰点，饮水按陶罐计价。',
      task: '进入龙烬遗迹，找到三重锁门背后的密室。竞争者包括龙裔帝国精锐、法师公会代理人与暗中活动的影之议会，密室里的东西足以改变大陆格局。',
      tone: '探险、竞争、古代秘密与高温求生。',
      npc: { name: '哈桑·铁砂', role: '烬墟镇酒馆里濒死的探险者' }
    }
  ];

  WD.NAMES = {
    byRace: {
      human: {
        male: ['阿尔德里克', '瓦伦', '塞德里克', '罗兰', '加尔文', '埃德蒙', '托马什', '奥托', '布兰登', '赫尔曼', '卡西乌斯', '雷诺'],
        female: ['艾琳', '玛尔塔', '塞西莉亚', '伊莎', '罗莎琳', '薇拉', '卡蒂亚', '尤莉亚', '布丽安娜', '海伦娜', '诺拉', '阿黛尔'],
        family: ['晨光', '索恩', '铁砂', '灰渡', '洛克哈特', '瓦伦丁', '马尔博', '石桥', '白垩', '温德尔', '卡斯特', '霍尔本']
      },
      'high-elf': {
        male: ['艾尔达里安', '塞拉芬', '卢米埃尔', '塔尔文', '伊瑟兰', '凯勒布林', '奥瑞恩', '维萨里', '芬德林', '阿斯特', '洛里安', '塞兰'],
        female: ['希尔瓦娜', '艾拉瑞尔', '莉安德拉', '伊露娜', '米瑞尔', '塞拉菲娜', '奥菲莉亚', '娜伊拉', '缇兰', '薇瑟拉', '露米娜', '卡莉丝'],
        family: ['月影', '星语', '银枝', '晨露', '白塔', '长歌', '镜湖', '霜羽', '曜石', '银弦', '云阶', '秘典']
      },
      'wood-elf': {
        male: ['凯尔丹', '瑟兰', '塔尔隆', '芬恩', '布兰温', '奥兹里', '里安', '德尔文', '卡尔哈', '埃罗', '提尔', '费拉'],
        female: ['莉安', '苔雅', '塞琳娜', '薇尔', '诺拉', '伊芙', '卡珊', '达拉', '梅芙', '茜尔', '若兰', '恩雅'],
        family: ['绿枝', '林语', '苔径', '鹿角', '树心', '藤桥', '松针', '溪石', '叶影', '猎弓', '月泉', '熊穴']
      },
      drow: {
        male: ['扎克利斯', '杜瑞尔', '瓦尔贡', '伊斯特', '索兰', '卡兹', '米兹里', '纳罗斯', '维兹', '格罗姆', '塞兹', '扎拉'],
        female: ['薇莎', '娜塔莉', '莎莉丝', '卓雅', '卡莉丝', '梅兹', '伊莎拉', '瓦兰', '祖娜', '索菲', '莉兹', '那薇'],
        family: ['蛛后', '暗丝', '毒牙', '黑纱', '银丝', '影刃', '血茧', '荆棘', '暗河', '黑烛', '尸纱', '蛛网']
      },
      'mountain-dwarf': {
        male: ['铁砧', '莫尔丁', '杜林', '布罗克', '加姆', '索林', '卡兹里克', '石锤', '诺格', '巴尔丁', '格罗因', '图林'],
        female: ['达格娜', '布伦希尔德', '格丽姆', '娜莉', '图拉', '卡兹拉', '希尔达', '薇尔卡', '索拉', '石花', '莫尔加', '杜娜'],
        family: ['石心', '铁拳', '铜须', '深井', '熔渣', '黑砧', '灰岩', '断镐', '硬核', '三锤', '长须', '钢脊']
      },
      'hill-dwarf': {
        male: ['巴林', '多利', '芬金', '格罗尔', '希尔迪', '卡兹', '洛姆', '诺里', '奥丁', '佩林', '索里', '托林'],
        female: ['阿黛拉', '布丽娜', '达丽', '艾尔达', '芙蕾雅', '古德伦', '海蒂', '英加', '卡琳', '莉芙', '娜娜', '西格丽德'],
        family: ['金秤', '麦穗', '酒桶', '铜环', '沙漏', '铁账', '山丘', '石桥', '银匙', '麦酒', '车轮', '蜂箱']
      },
      dragonborn: {
        male: ['瓦拉里安', '巴尔泽克', '卡瑞斯', '德拉克', '埃兹拉', '格里姆', '哈兹', '伊格尼斯', '卡洛克', '梅德里克', '拉兹', '索尔'],
        female: ['阿卡莎', '贝拉', '卡莉娜', '德拉瓦', '埃丝', '哈娜', '伊兹拉', '卡莉丝', '玛拉克', '娜莎', '拉萨', '索拉'],
        family: ['龙火', '黑石', '灰鳞', '烈焰', '铁翼', '熄炉', '沙脊', '双角', '熔金', '岩喉', '赤砂', '龙骨']
      },
      'metallic-dragon': {
        male: ['塔尔萨兰', '金耀', '银翼', '青铜喉', '索兰', '阿鲁姆', '电光', '白铜', '长歌', '星铁', '银霜', '熔银'],
        female: ['金露', '银弦', '电羽', '白霜', '索拉', '光鳞', '铜心', '银月', '塔莉', '星砂', '熔白', '长吟'],
        family: ['金龙氏', '银龙氏', '青铜氏', '黄铜氏', '赤铜氏', '电鳞氏', '光翼氏', '霜喉氏', '云巢氏', '铁齿氏', '圣焰氏', '星落氏']
      },
      'chromatic-dragon': {
        male: ['卡尔扎斯', '赤焰', '黑沼', '绿毒', '蓝霆', '白霜牙', '索格斯', '焚风', '酸喉', '铁鳞', '灰烬', '血口'],
        female: ['卡莉萨', '赤纱', '黑纱', '绿瞳', '蓝璃', '白喉', '索拉娜', '焚羽', '酸雨', '铁爪', '灰烟', '血牙'],
        family: ['赤焰氏', '黑沼氏', '绿毒氏', '蓝霆氏', '白霜氏', '酸喉氏', '焚风氏', '灰烬氏', '血口氏', '铁鳞氏', '毒牙氏', '焦土氏']
      },
      'gem-dragon': {
        male: ['晶瞳', '翡翠喉', '蓝宝', '石英', '紫晶', '琥珀', '玛瑙', '猫眼', '月长石', '黑曜', '尖晶', '电气石'],
        female: ['晶纱', '翡翠心', '蓝宝弦', '石英露', '紫晶羽', '琥珀光', '玛瑙纹', '猫眼瞳', '月长歌', '黑曜霜', '尖晶羽', '电气羽'],
        family: ['晶脉氏', '翡翠氏', '蓝宝氏', '石英氏', '紫晶氏', '琥珀氏', '玛瑙氏', '猫眼氏', '长石氏', '黑曜氏', '尖晶氏', '电气氏']
      },
      halfling: {
        male: ['佩里', '莫罗', '塔尔', '芬恩', '邦戈', '米尔', '多多', '罗兰', '韦伯', '山姆', '皮普', '哈维'],
        female: ['罗茜', '玛丽', '蒂娜', '贝拉', '佩妮', '洛拉', '米莉', '莎拉', '艾薇', '诺拉', '汉娜', '黛西'],
        family: ['麦穗', '面包师', '石桥', '铜壶', '短腿', '果酱', '蜂箱', '三指', '暖炉', '草垛', '好客', '黄油']
      },
      'half-orc': {
        male: ['黑牙', '格鲁姆', '沙克', '铁颚', '断耳', '卡尔格', '莫格', '石拳', '血斧', '托克', '灰皮', '祖格'],
        female: ['卡拉', '莎拉', '格莎', '莫拉', '图莎', '娜格', '铁花', '灰眼', '祖娜', '石肩', '血牙', '沙娜'],
        family: ['荒原', '碎骨', '断齿', '灰烬', '沙喉', '石拳', '血斧', '长疤', '铁颚', '枯河', '猎狼', '骨堆']
      },
      leonin: {
        male: ['铁鬃', '沙牙', '战吼', '赤眼', '长爪', '卡兹', '石脊', '金鬃', '断牙', '灰背', '沙暴', '猎角'],
        female: ['金鬃', '沙雅', '铁心', '玛拉', '长尾', '灰眼', '卡莉', '石花', '赤鬃', '猎歌', '沙娜', '白牙'],
        family: ['沙脊氏', '铁鬃氏', '血爪氏', '长鬃氏', '荒原氏', '石喉氏', '猎角氏', '灰背氏', '白牙氏', '战歌氏', '赤眼氏', '断牙氏']
      },
      goblin: {
        male: ['格里兹', '斯尼普', '纳格', '破耳', '尖牙', '莫格', '卡兹', '格里姆', '斯克', '臭鼬', '铁钉', '瘸腿'],
        female: ['格莎', '妮普', '娜格', '莎克', '破耳', '灰皮', '卡莎', '铁花', '斯娜', '短尾', '尖嗓', '泥爪'],
        family: ['碎牙部', '烂痂部', '尖耳部', '泥爪部', '短尾部', '毒菇部', '铁钉部', '灰皮部', '瘸腿部', '臭鼬部', '尖嗓部', '破锅部']
      },
      ogre: {
        male: ['格罗', '布拉格', '姆格', '石肚', '大头', '铁棍', '臭口', '断指', '卡格', '图格', '灰皮', '山包'],
        female: ['格莎', '布莎', '姆莎', '大脚', '铁勺', '臭花', '断齿', '卡莎', '图莎', '灰背', '山花', '石肩'],
        family: ['石肚部', '大头部', '铁棍部', '断指部', '灰皮部', '山包部', '臭口部', '骨棒部', '泥潭部', '双头部', '碎石部', '长臂部']
      },
      naga: {
        male: ['塞斯', '瓦沙', '纳吉', '鳞喉', '潮生', '深喉', '沙迦', '青鳞', '白喉', '图沙', '泽生', '澜牙'],
        female: ['塞莎', '瓦莎', '娜姬', '鳞纱', '潮汐', '深纱', '沙姬', '青纱', '白澜', '图莎', '泽纱', '澜纱'],
        family: ['潮汐殿', '深喉殿', '青鳞殿', '白澜殿', '沼泽殿', '沉船殿', '珊瑚殿', '咸水殿', '泥底殿', '万鳞殿', '潮下殿', '长眠殿']
      },
      giant: {
        male: ['石垒', '霜父', '云踏', '铁肩', '山喉', '大足', '卡格', '索格', '断崖', '灰背', '火须', '长臂'],
        female: ['石花', '霜母', '云纱', '铁心', '山歌', '大脚', '卡莎', '索莎', '灰眼', '火须', '岩乳', '长吟'],
        family: ['石垒氏', '霜父氏', '云踏氏', '铁肩氏', '山喉氏', '断崖氏', '灰背氏', '火须氏', '长臂氏', '双峰氏', '深谷氏', '雪脊氏']
      },
      'half-elf': {
        male: ['塞兰', '伊恩', '罗兰', '卡尔文', '埃罗', '米凯', '诺亚', '塔尔', '阿尔文', '芬恩', '德里克', '卢卡'],
        female: ['艾琳', '莉安', '塞拉', '米拉', '诺拉', '伊薇', '卡珊', '薇拉', '达拉', '瑟琳', '若兰', '海伦'],
        family: ['半枝', '双色', '灰渡', '桥下', '两界', '短歌', '长路', '叶石', '银麦', '双栖', '边缘', '无名']
      }
    },
    place: ['曙光城', '铁王座堡', '高塔城', '白港城', '烈日城', '玫瑰堡', '哨兵堡', '铁砧大厅', '星辉城', '幽影堡', '龙火城', '暗蛛城', '霜脊村', '喷泉广场', '林语门', '烬墟镇', '回音井', '倒影湖', '世界之喉', '黄金城', '旧坟场', '龙骨山脉', '银峰山脉', '铁锤山脉', '维兰之海', '中部平原', '艾索洛伦森林', '黄铜沙漠', '南境荒原', '无尽之海', '灰雾平原', '幽暗地域', '龙烬遗迹', '元素混沌', '时空裂隙', '圣光之庭', '深渊之渊', '永恒森林', '先祖大厅', '帝国旧道', '白骨渡口', '迷雾沼泽', '巨鹰崖', '安息烛墓园', '灰渡', '落星原', '黑砧镇', '铜壶驿', '断桅港', '三锤村'],
    org: ['法师公会', '圣光教会', '冒险者公会', '秘银兄弟会', '影之议会', '自然之环', '深渊守望者', '刺客兄弟会', '死亡教团', '命运先知会', '德鲁伊结社', '被唾弃者', '审判所', '圣骑士团', '法师公会枢密院', '白港十二家族', '七位大选帝侯', '龙裔皇家考古队', '各大骑士团', '蜘蛛教派', '大地之父神殿', '冒险者公会柜台', '秘银兄弟会工坊街', '商队行会', '摆渡人帮', '边境猎户盟']
  };

  global.WD = WD;
})(window);
