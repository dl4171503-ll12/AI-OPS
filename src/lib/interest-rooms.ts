import type { InterestProfile } from './types';

/** 兴趣探索室配置 */
export type InterestRoomId = 'classics' | 'art' | 'music' | 'coding' | 'sports';

export type InterestRoom = {
  id: InterestRoomId;
  name: string;
  emoji: string;
  blurb: string;
  /** 兴趣统计键；closed 房间可不 bump */
  key: keyof InterestProfile;
  /** 是否在列表中显示入口 */
  visible: boolean;
  /** 是否可进入；false 时显示「未开放」 */
  enabled: boolean;
  closedHint?: string;
};

/**
 * 当前策略：
 * - 开放：名著赏析、绘画楼、音乐楼
 * - Scratch 显示为未开放
 * - 体育兴趣已下线
 */
export const INTEREST_ROOMS: InterestRoom[] = [
  {
    id: 'classics',
    name: '名著赏析',
    emoji: '📚',
    blurb: '中国名著与世界名著，听老师讲怎么欣赏',
    key: 'literature',
    visible: true,
    enabled: true,
  },
  {
    id: 'art',
    name: '绘画楼',
    emoji: '🎨',
    blurb: '画布涂鸦 + 名画小课堂',
    key: 'art',
    visible: true,
    enabled: true,
  },
  {
    id: 'music',
    name: '音乐楼',
    emoji: '🎵',
    blurb: '中西各国乐器·宫调/埃及调等可弹',
    key: 'music',
    visible: true,
    enabled: true,
  },
  {
    id: 'coding',
    name: 'Scratch 编程',
    emoji: '💻',
    blurb: 'Scratch 趣味挑战（建设中）',
    key: 'coding',
    visible: true,
    enabled: false,
    closedHint: '未开放',
  },
];

export type ClassicWork = {
  id: string;
  region: 'china' | 'world';
  title: string;
  author: string;
  emoji: string;
  ageHint: string;
  blurb: string;
  /** 老师「怎么欣赏」要点（适龄） */
  howToAppreciate: string;
  /** 带给学生的正文节选（长篇只取一段） */
  excerpt: string;
  /** 节选出处说明 */
  excerptNote?: string;
};

export const CLASSIC_WORKS: ClassicWork[] = [
  {
    id: 'journey-west',
    region: 'china',
    title: '西游记',
    author: '吴承恩',
    emoji: '🐒',
    ageHint: '小学起可听故事版',
    blurb: '唐僧师徒西天取经，路上有妖怪也有坚持。',
    howToAppreciate:
      '先抓住「师徒四人各有性格」：悟空勇敢机灵、八戒爱偷懒、沙僧忠厚。读/听故事时问自己：这一回里，谁做对了？谁想偷懒？坚持取经像不像你坚持完成一件难事？',
    excerptNote: '节选大意 · 石猴出世（适龄改写）',
    excerpt: `花果山上有一块仙石。一日石破，跳出一个石猴。
他睁开眼睛，先对四方拜了拜，又学会在山涧里喝水、树上摘果。
众猴找不到水源，石猴说：「我去找！」他跳入瀑布，发现水帘洞。
回来招呼大家：「里面有石桌石凳，还有干果！跟我来！」
众猴又惊又喜，推他做了美猴王。
美猴王开心极了，却又想：将来老了怎么办？他要去学长生的本事——这就埋下了西天取经前的伏笔。`,
  },
  {
    id: 'three-kingdoms',
    region: 'china',
    title: '三国演义',
    author: '罗贯中',
    emoji: '⚔️',
    ageHint: '高年级起读节选',
    blurb: '东汉末年群雄并起，智慧与勇气交织。',
    howToAppreciate:
      '别急着记所有人名。先记住几位「主线人物」（如刘备、诸葛亮、关羽），看他们如何做选择。欣赏点在「计谋」和「义气」：谁讲信用？谁只顾自己？',
    excerptNote: '节选大意 · 三顾茅庐（适龄改写）',
    excerpt: `刘备听说隆中有位卧龙先生诸葛亮，很有本事，便带着关羽、张飞去请他。
第一次，先生不在。第二次，又扑了空。张飞不耐烦：「何必亲自来？派人叫他便是。」
刘备摇头：「请贤人要用真心。」
第三次，天正下雪。刘备在草堂外静静等候。诸葛亮醒来，见他如此诚心，才答应收下他。
后来刘备说：「孤之有孔明，犹鱼之有水也。」——有了好帮手，就像鱼有了水。`,
  },
  {
    id: 'dream-red',
    region: 'china',
    title: '红楼梦（节选）',
    author: '曹雪芹',
    emoji: '🌸',
    ageHint: '高年级读浅易节选',
    blurb: '大观园里少年少女的欢喜与心事。',
    howToAppreciate:
      '先读适合年龄的节选或故事改写。欣赏「人物心情」和「生活细节」：一次宴会、一首诗、一句对话，都能看出人物性格。不必一次读完整本。',
    excerptNote: '节选大意 · 宝玉与黛玉初见（适龄改写）',
    excerpt: `林黛玉初进贾府，处处留心，生怕错了礼数。
见到贾宝玉时，宝玉穿着华贵，却笑得像个孩子。他看着黛玉，忽然说：「这个妹妹我见过的。」
大家讶异。宝玉认真道：「虽然没见过面，心里却像认识很久。」
黛玉听了，又羞又奇。后来两人常一起读书、说笑，也常为小事拌嘴——
大观园里的友情与心事，就这样一点点展开。`,
  },
  {
    id: 'water-margin',
    region: 'china',
    title: '水浒传（故事选）',
    author: '施耐庵',
    emoji: '🏞️',
    ageHint: '听故事版更合适',
    blurb: '梁山好汉的故事，讲义气也讲命运。',
    howToAppreciate:
      '用「英雄卡片」思维：每人有特长与弱点。思考「义气」和「冲动」的边界——勇敢很好，但伤害别人就不对。适合听老师讲选段。',
    excerptNote: '节选大意 · 武松打虎（适龄改写）',
    excerpt: `武松路过景阳冈，酒店的人劝他：「冈上有虎，天晚了别走。」
武松喝了酒，不信，偏要过冈。走着走着，真见一只吊睛白额大虫扑来！
他躲闪不及，被虎尾扫倒，却拼力按住虎头，抡起拳头连打。
老虎力气渐渐泄了。武松也累得手脚发软。
后来人们传说：景阳冈上，武松打虎。勇敢值得学，但「不听劝、逞能」也要小心——真正的勇，是又敢又聪明。`,
  },
  {
    id: 'aesop',
    region: 'world',
    title: '伊索寓言',
    author: '伊索',
    emoji: '🦊',
    ageHint: '全年龄',
    blurb: '短小故事，结尾常有道理。',
    howToAppreciate:
      '每则故事很短：先复述「发生了什么」，再说「你学到什么」。道理可以自己说，不一定背标准答案。可和朋友比一比谁讲得更有趣。',
    excerptNote: '节选 · 狐狸与葡萄',
    excerpt: `狐狸走过葡萄架，看见一串串紫葡萄，馋得直流口水。
它跳起来够，够不着；再跳，还是够不着。
试了好几回，狐狸只好走开。边走边说：「那些葡萄一定是酸的，才不要呢。」
其实葡萄未必酸——有时候，我们得不到一样东西，就会假装「它本来就不好」。
想一想：你有没有说过类似的话？`,
  },
  {
    id: 'alice',
    region: 'world',
    title: '爱丽丝漫游奇境',
    author: '刘易斯·卡罗尔',
    emoji: '🎩',
    ageHint: '小学中高年级',
    blurb: '掉进兔子洞后，世界变得又奇又好玩。',
    howToAppreciate:
      '注意「想象力」：不合理也可以很美。读时标出你最喜欢的奇怪画面。问：如果我掉进奇境，会遇见什么？这就是欣赏奇幻文学的开始。',
    excerptNote: '节选大意 · 掉进兔子洞（适龄改写）',
    excerpt: `爱丽丝靠在河岸边，有点无聊。忽然一只穿背心的白兔跑过，还掏出怀表说：「哎呀，晚了晚了！」
爱丽丝追上去，跟着兔子跳进一个大洞。她往下掉啊掉，路过书架、地图和橘子酱罐子。
落地后，她进了一条长走廊，门都太小，进不去。桌上有瓶写着「喝我」，她喝了一口——身子一下子变小了。
奇境的冒险，从「变小」开始。不合理吗？对，可这正是想象力的好玩之处。`,
  },
  {
    id: 'little-prince',
    region: 'world',
    title: '小王子',
    author: '圣埃克苏佩里',
    emoji: '👑',
    ageHint: '全年龄（含义随年龄变深）',
    blurb: '小王子从星球来到地球，寻找真正重要的事。',
    howToAppreciate:
      '表面是童话，里面藏着友情与责任。读完想一想：「驯服」是什么意思？你心里有没有一朵「自己的玫瑰」？可以边读边画画。',
    excerptNote: '节选大意 · 狐狸与驯服（适龄改写）',
    excerpt: `小王子在地球上遇见一只狐狸。狐狸说：「请你驯服我吧。」
小王子不懂。狐狸解释：驯服，就是建立联系。你对我而言会是世界上独一无二的；我对你也一样。
以后你只要看麦田的颜色，就会想起我的毛色——因为我们有了特别的关系。
小王子想起自己的玫瑰。原来，重要的东西，用眼睛不一定看得见，要用「心」。`,
  },
  {
    id: 'robinson',
    region: 'world',
    title: '鲁滨逊漂流记（节选）',
    author: '笛福',
    emoji: '🏝️',
    ageHint: '小学高年级起',
    blurb: '一个人流落荒岛，学习生存与希望。',
    howToAppreciate:
      '关注「解决问题」：缺食物、缺房子时他怎么做？欣赏点在坚持与动脑，而不是冒险刺激本身。可列出「荒岛生存清单」做小游戏。',
    excerptNote: '节选大意 · 荒岛安家（适龄改写）',
    excerpt: `船难之后，鲁滨逊独自漂到一座荒岛。他没有哭太久，就开始做事：
先从破船上搬下工具、种子和枪；再找有淡水、能避风雨的地方。
他挖洞、加固木栏，学着种麦、养羊，还做了一本日历，免得忘记岁月。
他说：与其抱怨，不如动手。荒岛上的日子艰难，却让他学会计划与耐心。
如果你流落荒岛，清单上会写哪三样东西？`,
  },
];

export const CLASSICS_GUIDE = {
  name: '小阅老师',
  emoji: '📖',
  persona:
    '温和的名著赏析老师。固定四步：①先给正文节选；②给思考支架引导学生想；③追问为什么这样想；④最后给欣赏观点与带读建议。紧扣节选，不空谈书单；不剧透大结局除非孩子要求。',
  avatar: '/characters/teacher-chinese.png',
  greeting:
    '欢迎来到名著赏析！选一本故事后：先听节选 → 带着支架思考 → 说说为什么 → 我再讲答案和带读建议。',
};

/** 通用欣赏方法（老师讲解） */
export const HOW_TO_APPRECIATE_GENERAL = `怎样欣赏名著？（小朋友版）

1. 先当「故事听众」：弄清谁、在哪、发生了什么。
2. 再当「观察员」：人物性格像不像身边的人？谁勇敢、谁犹豫？
3. 找「金句子」：一句让你心动或好笑的话，记下来。
4. 连到自己：如果是我，会怎么选？学到了什么？
5. 可以画画、表演、讲给家人听——这也是欣赏。

中国名著常有章回与神话色彩；世界名著有童话、寓言、冒险等不同味道。慢慢读，比一次读完更重要。`;

/** 绘画楼活动卡片 */
export type ArtActivity = {
  id: string;
  emoji: string;
  title: string;
  blurb: string;
  tip: string;
  /** 名画/画面材料（先给学生看） */
  material: string;
  /** 思考题（带支架） */
  thinkPrompt: string;
};

export const ART_ACTIVITIES: ArtActivity[] = [
  {
    id: 'starry-night',
    emoji: '🌌',
    title: '星夜观察',
    blurb: '看梵高《星夜》的旋涡与村庄。',
    tip: '先找最大的运动感，再找最安静的地方。',
    material: `【名画材料·《星夜》观察描述】
夜空里有巨大的旋转笔触，像风在搅动星星；月亮又黄又亮。
山下有深色的柏树向上伸，像火焰。远处是安静的小村庄，窗户透出暖光。
请先「看」这幅画的描述：哪里最热闹？哪里最安静？`,
    thinkPrompt:
      '思考支架：①先找「动」的部分（旋涡/星星）；②再找「静」的部分（村庄）。你觉得画家最想让你先看到什么？用一句话说。',
  },
  {
    id: 'color-feel',
    emoji: '🌈',
    title: '颜色心情板',
    blurb: '用颜色表达今天的心情。',
    tip: '暖色热闹，冷色安静——先选感觉再选颜色。',
    material: `【画面材料·三色心情卡】
卡片 A：大面积橙红，夹一点黄（像日落）。
卡片 B：蓝与青绿为主，只有一点白（像湖面）。
卡片 C：灰紫与深褐，角落有一抹亮粉。
请先看这三张「心情卡」的描述。`,
    thinkPrompt:
      '思考支架：如果今天你的心情最像其中一张，选 A/B/C，并说一个词（如：热闹/安静/有点闷但有希望）。',
  },
  {
    id: 'still-life',
    emoji: '🍎',
    title: '桌上的小静物',
    blurb: '观察苹果与光影。',
    tip: '先看大轮廓，再看哪边更亮。',
    material: `【画面材料·桌上的红苹果】
一只红苹果放在白盘子里。窗户在左边，所以苹果左侧更亮，右侧有一道柔和的影子。
苹果顶上有一点点高光，像小星星。
请先看这个静物描述。`,
    thinkPrompt:
      '思考支架：光从哪边来？如果让你只画两笔，你会先画「圆形」还是先画「影子」？为什么？',
  },
  {
    id: 'master-look',
    emoji: '🖼️',
    title: '睡莲小观察',
    blurb: '莫奈睡莲：光与倒影。',
    tip: '别急着找「像不像」，先找颜色在说话。',
    material: `【名画材料·睡莲池（印象派描述）】
水面不是单纯的蓝：有绿、有紫、有天空的倒影。睡莲像小船停在光斑上。
远处树影模糊，近处花瓣更清楚——画家在画「光」多于画「清楚的叶子」。
请先看这段名画描述。`,
    thinkPrompt:
      '思考支架：如果你站在池边，最先注意到的是「花」还是「水里的光」？选一个，并指出材料里哪一句话支持你。',
  },
];

export const ART_GUIDE = {
  name: '小绘老师',
  emoji: '🎨',
  persona:
    '温和有创意的绘画老师。固定流程：①先给名画/画面材料；②给思考支架让学生观察；③追问为什么这样想；④最后给欣赏观点与小建议。鼓励表达，不批评「画得像不像」。',
  avatar: '/characters/teacher-art.png',
  greeting:
    '欢迎来到绘画楼！先在画布上动手涂鸦，想听名画故事时再进「小课堂」。',
};

/** 音乐楼活动卡片 */
export type MusicActivity = {
  id: string;
  emoji: string;
  title: string;
  blurb: string;
  tip: string;
  material: string;
  thinkPrompt: string;
};

export const MUSIC_ACTIVITIES: MusicActivity[] = [
  {
    id: 'beat-clap',
    emoji: '👏',
    title: '拍拍节奏',
    blurb: '感受强拍与弱拍。',
    tip: '稳定比速度快更重要。',
    material: `【音乐材料·三拍子口诀】
请先听（或跟读）这个节奏型：
「强 — 弱 — 弱 | 强 — 弱 — 弱」
用手拍：第一下重一点，后两下轻一点。像荡秋千：一起，再轻轻落下两次。`,
    thinkPrompt:
      '思考支架：如果把「强」想成脚步落地，你会用「走路」还是「跳舞」来形容这种节奏？选一个并说理由。',
  },
  {
    id: 'instrument-zoo',
    emoji: '🎻',
    title: '乐器小百科',
    blurb: '辨认乐器「说话」的方式。',
    tip: '弦乐像线，打击像脚步，管乐像呼吸。',
    material: `【音乐材料·三种声音名片】
A 小提琴：细细的、可以拉得很长的声音，像唱歌的线。
B 大鼓：短促有力的「咚」，像远处的脚步。
C 笛子：清亮、带着气流，像风从竹管里穿过。
请先读这三张「声音名片」。`,
    thinkPrompt:
      '思考支架：如果要配「下雨」的画面，你选 A/B/C 哪一个当主音色？为什么？（可从细/重/空灵里选词）',
  },
  {
    id: 'mood-song',
    emoji: '🎧',
    title: '心情配音乐',
    blurb: '速度与情绪的关系。',
    tip: '快常兴奋，慢常放松——也有例外。',
    material: `【音乐材料·两段情境】
片段 X：较快，鼓点清楚，旋律向上跳。
片段 Y：较慢，长音较多，旋律像慢慢走路。
（我们用文字代替真实音频：请先想象这两种「听感」。）`,
    thinkPrompt:
      '思考支架：你现在如果需要「冷静下来」，更想听 X 还是 Y？说出一个身体感觉（心跳/呼吸）来支持你的选择。',
  },
  {
    id: 'hum-phrase',
    emoji: '🎤',
    title: '哼一句小旋律',
    blurb: '同一句，不同情绪。',
    tip: '旋律像说话的起伏。',
    material: `【音乐材料·同一句「啦啦啦」】
请先用中等速度哼：啦—啦—啦—（三声，平稳）。
再想象：如果改成「很开心」或「有点难过」，音高和速度可能怎么变？
（先不要急着哼对错，先想变化。）`,
    thinkPrompt:
      '思考支架：开心时你更可能「变快」还是「变高」？选一个为主，再说另一个会不会也变。',
  },
];

export const MUSIC_GUIDE = {
  name: '小音老师',
  emoji: '🎵',
  persona:
    '活泼温柔的音乐老师。固定流程：①先给节奏/音色/情境材料；②给思考支架；③追问为什么；④最后给音乐知识点与小练习建议。鼓励参与，不苛求音准。',
  avatar: '/characters/teacher-chinese.png',
  greeting:
    '欢迎来到音乐楼！先选乐器国家与调式（中方默认宫调），再点琴键弹奏。日本乐器本校不收录。',
};
