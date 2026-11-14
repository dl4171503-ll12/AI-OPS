/**
 * Generate interview-style bank_iqe_v1.json (40 items)
 * Run: node scripts/gen_iqe_interview_bank.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, '../src/data/ops/bank_iqe_v1.json');

function opts(texts, scores) {
  return texts.map((text, i) => ({
    key: String.fromCharCode(65 + i),
    text,
    score: scores[i],
  }));
}

/** score order always maps to options A,B,C,D */
function q(qid, section, dimension, type, stem, texts, scores, aside) {
  return {
    qid,
    section,
    dimension,
    type,
    stem,
    options: opts(texts, scores),
    reverse: false,
    aside,
  };
}

const bank = [
  // —— IE 12 ——
  q('IE-01', 'IE', 'I-A', 'scale', '小组讨论，你通常是哪一挂的？',
    ['想清楚了才开口', '边听边想，差不多就说', '想到啥说啥，越说越清', '看情况，有时憋有时抢'],
    [3, 1, 0, 2], '先在心里过一遍再说。'),
  q('IE-02', 'IE', 'I-A', 'scale', '午休自由活动，你更想去哪？',
    ['角落看书或做手工', '找两三个熟人待着', '往人多的地方凑', '先晃一圈再决定'],
    [3, 2, 0, 1], '你有自己的小天地。'),
  q('IE-03', 'IE', 'I-B', 'scale', '刚进新班级，门口好多人，你？',
    ['先站边上看规则气氛', '跟旁边同学轻轻打个招呼', '直接冲进去自我介绍', '等老师喊再动'],
    [3, 2, 0, 1], '你在摸清这片水。'),
  q('IE-04', 'IE', 'I-B', 'scale', '陌生同学热情跟你搭话，你？',
    ['心里暖，嘴上慢半拍', '马上热络地接上', '点头笑，话不多', '有点愣，过会儿才回'],
    [3, 0, 1, 2], '慢一点也没关系。'),
  q('IE-05', 'IE', 'I-C', 'scale', '联欢会结束好吵，你更想？',
    ['找安静处待一会儿', '继续跟大家聊', '帮忙收拾再走', '戴耳机走回去'],
    [3, 0, 1, 2], '热闹过后需要充电。'),
  q('IE-06', 'IE', 'I-C', 'scale', '你在书桌解难题，旁边有人说话，你？',
    ['请对方小声或换地方', '硬扛着继续算', '干脆停下来一起聊', '戴上耳机隔开'],
    [3, 1, 0, 2], '安静对你很重要。'),
  q('IE-07', 'IE', 'E-A', 'scale', '游园会人很多，你更像？',
    ['主动找人聊天认识', '跟熟人黏在一起', '默默看摊位', '等人先来找你'],
    [3, 1, 0, 2], '你挺会打开场子。'),
  q('IE-08', 'IE', 'E-A', 'scale', '脑子里冒出好玩点子，你？',
    ['马上找人分享讨论', '先记本子里再说', '自己琢磨完再讲', '发到班级群里'],
    [3, 1, 0, 2], '想法坐不住。'),
  q('IE-09', 'IE', 'E-B', 'scale', '班级要办小活动，你常是？',
    ['站出来张罗分工', '有人喊才帮忙', '负责一块具体事', '更想当观众'],
    [3, 1, 2, 0], '你身上有带动感。'),
  q('IE-10', 'IE', 'E-B', 'scale', '小组作业卡壳气氛沉，你？',
    ['说点话把气氛拉起来', '自己闷头先做出一段', '提议先休息五分钟', '等组长发话'],
    [3, 1, 2, 0], '你愿意把火挑起来。'),
  q('IE-11', 'IE', 'E-C', 'scale', '被问观点还没想全，你？',
    ['边说边理清楚', '说「让我想想」再答', '先甩半截话丢给别人', '干脆先不答'],
    [3, 1, 2, 0], '嘴在帮你想。'),
  q('IE-12', 'IE', 'E-C', 'scale', '数学题卡住了，你更想？',
    ['找人口头对一对思路', '自己在纸上反复推', '先放一放明天再看', '看例题再模仿'],
    [3, 1, 0, 2], '说出来会更顺。'),

  // —— IQ 16（每维留前 2 题编号）——
  q('IQ-01', 'IQ', 'LOGIC', 'choice', '数列 2、4、8、16，下一空你怎么填？',
    ['填 32，翻倍接着走', '填 24，加得越来越多', '填 18，差不多就行', '随便填一个试试'],
    [3, 2, 1, 0], '你在找里面的规矩。'),
  q('IQ-02', 'IQ', 'LOGIC', 'choice', '「所有苹果是水果，有水果是红的」能断定有红苹果吗？',
    ['不一定，信息不够', '一定能，都连上了', '一定不能', '跟颜色没关系'],
    [3, 0, 1, 2], '你把条件拆开看了。'),
  q('IQ-05', 'IQ', 'LANG', 'choice', '「春风又绿江南岸」，这「绿」更像在干嘛？',
    ['把岸吹绿了', '只是颜色名字', '在学风的声音', '在数有几片叶'],
    [3, 0, 1, 2], '你听出了用字的巧。'),
  q('IQ-06', 'IQ', 'LANG', 'choice', '下面哪组意思更靠近？',
    ['平静—安宁', '迅速—迟缓', '增加—减少', '明亮—昏暗'],
    [3, 0, 1, 2], '词语在你这儿站队了。'),
  q('IQ-09', 'IQ', 'SPACE', 'choice', '从上往下看正方体，轮廓更像？',
    ['正方形', '三角形', '五边形', '圆形'],
    [3, 0, 1, 2], '你在脑子里转动物体。'),
  q('IQ-10', 'IQ', 'SPACE', 'choice', '地图北在上，你面朝南，左手那边是？',
    ['东', '西', '南', '北'],
    [3, 1, 0, 2], '方向在你手里转过弯。'),
  q('IQ-13', 'IQ', 'MUSIC', 'scale', '广播里换了一首歌，你？',
    ['马上听出换了', '过一会儿才发觉', '有人提醒才知', '基本没注意'],
    [3, 2, 1, 0], '耳朵挺灵敏。'),
  q('IQ-14', 'IQ', 'MUSIC', 'scale', '同学哼两段相近节奏，你？',
    ['能听出哪儿不一样', '感觉差不多', '要拍子慢点才比', '完全分不清'],
    [3, 0, 2, 1], '节奏对你说话。'),
  q('IQ-17', 'IQ', 'KINESTHETIC', 'scale', '体育课新学跳绳花样，你？',
    ['上手很快，边做边会', '要看几遍再试', '更愿先听讲解', '宁愿做别的项目'],
    [3, 2, 1, 0], '身体记得住动作。'),
  q('IQ-18', 'IQ', 'KINESTHETIC', 'scale', '科学课讲结构，你更想？',
    ['动手拼搭或实验', '听老师讲清楚', '看图和视频', '记笔记为主'],
    [3, 1, 2, 0], '手一忙就懂了。'),
  q('IQ-21', 'IQ', 'INTERPERSONAL', 'scale', '同桌忽然不说话了，你？',
    ['察觉情绪，轻轻问一句', '当没看见继续写', '拉别人一起哄', '过后再私下说'],
    [3, 0, 1, 2], '你留意到人的天气。'),
  q('IQ-22', 'IQ', 'INTERPERSONAL', 'scale', '小组两人吵分工，你常？',
    ['提出双方都能接的办法', '站队支持一方', '躲开别掺和', '喊老师来裁'],
    [3, 1, 0, 2], '你在找中间那条路。'),
  q('IQ-25', 'IQ', 'INTRAPERSONAL', 'scale', '连续赶作业很累，你？',
    ['知道该歇或求助', '硬撑到做完', '刷短视频逃避', '随便糊弄交差'],
    [3, 1, 0, 2], '你听得见自己的信号。'),
  q('IQ-26', 'IQ', 'INTRAPERSONAL', 'scale', '要不要报名兴趣班，你？',
    ['对照自己目标再定', '看朋友报不报', '家长说了算', '跟风看看热闹'],
    [3, 1, 2, 0], '你会跟自己商量。'),
  q('IQ-29', 'IQ', 'NATURAL', 'scale', '放学路上，你更容易？',
    ['留意树叶鸟虫天气', '赶路想作业', '盯着店铺橱窗', '戴耳机沉浸'],
    [3, 1, 2, 0], '外面的世界在跟你打招呼。'),
  q('IQ-30', 'IQ', 'NATURAL', 'scale', '公园里几片落叶，你？',
    ['想分辨大概是哪种树', '随手踢开', '捡起来玩形状', '拍张照发群'],
    [3, 0, 2, 1], '你对自然有好奇心。'),

  // —— TENDENCY 12（每维留前 2）——
  // ALTRUISM: high = help more → score 3
  q('TD-01', 'TENDENCY', 'ALTRUISM', 'choice', '走廊里同学滑倒坐着，周围人少，你？',
    ['上前扶起并叫人', '先问要不要帮忙', '远远看一眼就走', '低头继续赶路'],
    [3, 2, 1, 0], '你停下来了。'),
  q('TD-02', 'TENDENCY', 'ALTRUISM', 'choice', '小组缺材料，你手头刚好有多余，你？',
    ['主动协调大家补齐', '分一点给缺的人', '提醒一句自己不管', '只顾自己那份'],
    [3, 2, 1, 0], '你把东西往外推了推。'),
  // FAIRNESS
  q('TD-04', 'TENDENCY', 'FAIRNESS', 'choice', '有人插到你队伍前面，你？',
    ['请他到队尾并说明', '礼貌提醒按顺序', '小声抱怨不说破', '随他去'],
    [3, 2, 1, 0], '顺序对你很要紧。'),
  q('TD-05', 'TENDENCY', 'FAIRNESS', 'choice', '批改时发现自己多算了分，你？',
    ['马上告诉老师更正', '找机会悄悄说明', '纠结但不行动', '假装不知道'],
    [3, 2, 1, 0], '你把尺又量了一遍。'),
  // HONESTY
  q('TD-07', 'TENDENCY', 'HONESTY', 'choice', '作业没写完被问「做完了吗」，你？',
    ['如实说进度和计划', '说还差一点', '含糊带过', '说做完了'],
    [3, 2, 1, 0], '你把真相放桌上了。'),
  q('TD-08', 'TENDENCY', 'HONESTY', 'choice', '捡到同学文具在空教室，你？',
    ['尽快找到失主归还', '放到失物处', '先留下再说', '放进自己书包'],
    [3, 2, 1, 0], '东西有主。'),
  // EMPATHY
  q('TD-10', 'TENDENCY', 'EMPATHY', 'choice', '好友比赛失利很失落，你？',
    ['认真听并一起想下一步', '陪他讲讲感受', '说「没什么大不了」', '赶紧换话题'],
    [3, 2, 1, 0], '你坐到他旁边了。'),
  q('TD-11', 'TENDENCY', 'EMPATHY', 'choice', '看见同学被嘲笑，你？',
    ['当场婉转制止并支持', '事后私下安慰', '心里不舒服但不行动', '当作没看见'],
    [3, 2, 1, 0], '你站到了他那边。'),
  // RESPONSIBILITY
  q('TD-13', 'TENDENCY', 'RESPONSIBILITY', 'choice', '值日那天你想多玩一会，你？',
    ['认真做完再检查', '尽快做完再玩', '拜托别人却不确认', '直接溜走'],
    [3, 2, 1, 0], '扫帚还在等你。'),
  q('TD-14', 'TENDENCY', 'RESPONSIBILITY', 'choice', '你负责的小组部分延期了，你？',
    ['加班补齐并说明', '提前告知并给补救方案', '找理由推脱', '不提等别人发现'],
    [3, 2, 1, 0], '你把锅扛起来了。'),
  // AGGRESSION: high = more aggressive → score 3
  q('TD-16', 'TENDENCY', 'AGGRESSION', 'choice', '有人无意撞到你，你？',
    ['立刻大声指责', '推回去理论', '提醒对方注意', '先确认没事再平和说'],
    [3, 2, 1, 0], '冲劲来得很快。'),
  q('TD-17', 'TENDENCY', 'AGGRESSION', 'choice', '争论时对方语气很冲，你？',
    ['用更冲的话压回去', '提高音量坚持己见', '摔门离开', '先降调把话说清'],
    [3, 2, 1, 0], '声音容易抬高。'),
];

// validate
if (bank.length !== 40) {
  console.error('expected 40, got', bank.length);
  process.exit(1);
}
for (const item of bank) {
  const scores = item.options.map((o) => o.score).sort();
  if (scores.join(',') !== '0,1,2,3') {
    console.error('bad scores', item.qid, scores);
    process.exit(1);
  }
  if (item.reverse !== false) process.exit(1);
  for (const o of item.options) {
    if ([...o.text].length > 15) console.warn('opt long', item.qid, o.text);
  }
  if ([...item.stem].length > 30) console.warn('stem long', item.qid, item.stem, [...item.stem].length);
  if ([...item.aside].length > 15) console.warn('aside long', item.qid, item.aside);
}

fs.writeFileSync(out, JSON.stringify(bank, null, 2), 'utf8');
console.log('wrote', out, 'n=', bank.length);
