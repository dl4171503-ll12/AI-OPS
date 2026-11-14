import type { SubjectId } from './types';
export type Dimension = 'language'|'logic'|'space'|'kinesthetic'|'music'|'interpersonal'|'intrapersonal'|'nature';
export type Stroke = { color:string; width:number; points:number[][]; at:string; erase?:boolean };
export type AnswerStep = { seq:number; type:string; content:string; at:string };
export type PlanAdjustment = { seq:number; questionId:string; at:string; reason:string; from:string; to:string; progress:number; accuracy:number|null; durationMs:number };
export type AdmissionAnswer = { enteredAt?:string; firstAnsweredAt?:string; steps?:AnswerStep[]; strokes?:Stroke[]; value: string; reasoning: string; confidence: 'sure' | 'unsure' | 'new'; durationMs: number; revisions: Array<{ value: string; at: string }>; savedAt: string; skipped?: boolean };
export type AdmissionState = { version: 2; bankVersion?:3; examId?:string; adjustments?:PlanAdjustment[]; gradeYear: number; answers: Record<string, AdmissionAnswer>; completedAt?: string };
export type AdmissionTask = { id: string; dimension?:Dimension; baselineSeconds?:number; subject: 'math' | 'chinese' | 'english' | 'science' | 'reflection'; skill: string; material: string; question: string; options?: string[]; expected?: string; followup: string; nextStep: string; difficulty: string };
export const ADMISSION_SUBJECTS = [{ id: 'math', label: '数学与推理' }, { id: 'chinese', label: '阅读与表达' }, { id: 'english', label: '英语理解' }, { id: 'science', label: '科学探究' }, { id: 'reflection', label: '学习策略与合作' }] as const;
export function admissionTasks(year: number): AdmissionTask[] {
  const low = year <= 2, middle = year >= 7, upper = year >= 5;
  const tasks: AdmissionTask[] = [];
  const add = (subject: AdmissionTask['subject'], skill: string, material: string, question: string, expected: string | undefined, followup: string, nextStep: string, options?: string[], difficulty = '应用') => tasks.push({ id: `admission-v2-${year}-${subject}-${tasks.filter(t => t.subject === subject).length + 1}`, subject, skill, material, question, expected, followup, nextStep, options, difficulty });
  add('math', '数量关系', low ? '有 8 张卡片，又做了 7 张。' : middle ? '制作卡片的成本为 12 元固定费用，加每张 3 元。总预算 48 元。' : '制作 4 套卡片，每套需要 6 张纸，已经准备了 17 张纸。', low ? '现在共有多少张？只填数字。' : middle ? '最多能制作多少张卡片？只填数字。' : '还需要多少张纸？只填数字。', low ? '15' : middle ? '12' : '7', '先算什么，再算什么？每个数对应哪一部分？', '画出已知量和目标量，再练 3 道两步应用题。', undefined, '基础');
  add('math', '规律与反例', '观察数列：2，5，11，23，…', '如果继续按同一个规则，下一个数是什么？', '47', '你的规则能同时解释前面三次变化吗？用其中两次检查。', '用相邻项验证规律，而不是只猜下一个数。', ['35', '46', '47', '49'], '挑战');
  add('math', '分数与公平', low ? '12 块积木平均分给 3 人。' : upper ? '甲完成任务的 3/4，乙完成同样任务的 5/8。' : '两张同样大的纸，甲用了 1/2，乙用了 1/4。', low ? '每人几块？' : '谁完成或使用的部分更多？', low ? '4' : '甲', '请用画图、分组或相同单位解释，不只写结论。', low ? '用实物分组检查平均分。' : '画同样大小的长方形，把分数换成相同分母比较。', low ? ['3', '4', '6'] : ['甲', '乙', '一样多', '无法比较']);
  add('math', '数据判断', '三次观察用时分别是 4、6、8 分钟。', low ? '最长的一次比最短的一次多几分钟？' : '小林说：“下一次一定是 6 分钟，因为平均是 6。”这个判断怎样？', low ? '4' : '平均数不能保证下一次的值', '把已经观察到的事实和你猜测的事情分开写。', '记录一组真实数据，区分平均值与单次结果。', low ? ['2', '4', '6'] : ['一定正确', '平均数不能保证下一次的值', '下一次一定是8分钟']);
  const passage = '小禾把两盆同样的豆苗放在窗边，每天给它们同样多的水。一周后，她发现靠里面的一盆长得慢。她没有马上多浇水，而是每天记录两盆受到阳光照射的时间。';
  add('chinese', '信息定位', passage, '发现豆苗生长不同后，小禾接着做了什么？', '记录日照时间', '引用原文里的几个字支持你的选择。', '阅读短文时圈出动作词，再按先后顺序复述。', ['立刻多浇水', '记录日照时间', '扔掉豆苗', '搬去不同房间'], '基础');
  add('chinese', '证据与推断', passage, '只根据这段文字，哪句话可以确定？', '两盆豆苗每天浇水量相同', '另外一句为什么还不能确定？指出缺少的证据。', '用两种颜色标记原文事实与个人猜测。', ['阳光少一定是唯一原因', '两盆豆苗每天浇水量相同', '里面的豆苗已经生病', '多浇水一定能解决问题']);
  add('chinese', '概括要点', passage, '哪一个标题最能概括这段文字？', '小禾观察豆苗的差异', '标题需要保留哪些主要信息？哪个细节可以省略？', '练习用“谁—做什么—为什么”概括一段文字。', ['一扇美丽的窗', '小禾观察豆苗的差异', '浇水越多长得越快', '豆苗的所有种类']);
  add('chinese', '因果与表达', '同学的作品没有完成，他说：“我就是不行。”', '哪一句更能把问题说具体、方便下一步解决？', '我卡在连接两块纸板，需要试一种固定方法', '把你最近遇到的一个困难也改写成可以行动的一句话。', '把笼统评价改写为具体困难和下一步行动。', ['你就是不努力', '没什么可做的', '我卡在连接两块纸板，需要试一种固定方法', '别人都做完了']);
  add('english', '提取信息', low ? 'I have a red bag.' : 'Mia has two books. She gives one book to Ben. They read after lunch.', low ? 'What colour is the bag?' : 'When do they read?', low ? 'Red' : 'After lunch', '哪几个英文词帮助你判断？把它们写下来。', '先找时间、人物或颜色关键词，再回答阅读问题。', low ? ['Red', 'Blue', 'Green'] : ['Before lunch', 'After lunch', 'At night'], '基础');
  add('english', '语境语法', middle ? 'We have lived here ___ 2020.' : 'These ___ my books.', '选择能放进空格的词。', middle ? 'since' : 'are', '哪一部分告诉你该选这个词？', middle ? '对比 since 与 for 的时间表达。' : '对比单数和复数主语的动词形式。', middle ? ['since', 'for', 'at'] : ['am', 'is', 'are']);
  add('english', '指令理解', 'Draw a circle under the square.', '应该画成什么位置关系？', '圆在正方形下方', 'under 表示什么？如果改成 above，图会怎样变化？', '画图执行 3 条包含方位词的英语指令。', ['圆在正方形上方', '圆在正方形下方', '圆在正方形里面']);
  add('english', '表达意图', '你没有听清老师说的话，希望对方再说一遍。', '哪一句最合适？', 'Could you say that again, please?', '请写出其中表达请求的词，或用自己的话说明意思。', '和同伴练习请求重复、求助与确认信息。', ['I am a book.', 'Could you say that again, please?', 'Good night.']);
  add('science', '公平实验', '想比较光照对豆苗的影响。', '哪一种实验设计能更好地比较？', '只改变光照，其他条件尽量相同', '至少说出两个要保持相同的条件。', '设计一张只改变一个条件的实验记录表。', ['光照、水量、土壤都不同', '只改变光照，其他条件尽量相同', '只看一盆一天'], '基础');
  add('science', '测量与重复', '同一张桌子测量三次，得到 80、81、80 厘米。', '下一步更合理的做法是？', '检查测量起点并重复测量', '为什么不直接删掉 81？怎样减少测量差异？', '用同一工具重复测量，记录全部结果。', ['删掉不喜欢的结果', '检查测量起点并重复测量', '宣布尺子一定坏了']);
  add('science', '相关与因果', '小组发现：带水杯的同学这次任务完成得更快。', '能直接认定“带水杯让任务变快”吗？', '不能，还可能有其他差异', '提出一种其他解释，以及一个可以进一步观察的问题。', '练习为观察结果提出至少两种解释。', ['能，一次观察足够', '不能，还可能有其他差异', '说明没有水杯就学不会']);
  add('science', '改进方案', '纸桥第一次承重失败。', '哪一步最能帮助改进？', '记录塌在哪里，每次只改一个结构', '你会先改哪一点？怎样知道改动是否有效？', '做两版纸桥，记录变化位置与承重结果。', ['换掉所有材料且不记录', '记录塌在哪里，每次只改一个结构', '不再尝试']);
  add('reflection', '遇到困难时', '你连续尝试两次仍没有解决问题。', '你通常会怎么做？', undefined, '举一个真实例子：哪一步需要别人支持？', '和家长约定一个具体的求助信号。', ['拆成更小一步', '先暂停再回来', '请别人指出起点', '容易放下，不知怎么继续'], '情境');
  add('reflection', '合作与分工', '同伴提出了与你不同的方案，时间只够先试一个。', '你会怎样推进？', undefined, '说说你会怎样听取对方理由，并决定验证方法。', '在一个项目中轮流陈述理由，再用小实验选择方案。', ['各说一个理由后做小实验', '请第三个人帮助比较', '先试对方的再改进', '我还不确定怎样讨论'], '情境');
  add('reflection', '学习偏好', '明天有 20 分钟可以自由学习。', '你最想怎样用？', undefined, '写一个你真正想完成的小成果，不只写科目名字。', '把这个小成果加入本周计划，与家长一起复盘。', ['读一段材料并提问', '做一个小实验', '写代码或做作品', '和别人讲清一个发现'], '情境');
  const extra: [Dimension,string,string,string,string,string[]][] = [
 ['kinesthetic','动作顺序','折纸步骤：对齐两边 → 压住边缘 → 压出折痕。','想折得整齐，第一步是什么？','对齐两边',['用力压折痕','对齐两边','随意折一下']],
 ['kinesthetic','双手协作','剪曲线时，一只手控制剪刀。','另一只手怎样配合？','慢慢转动纸张',['慢慢转动纸张','拉扯纸张','放在剪刀口前']],
 ['kinesthetic','动作反馈','投纸球两次都落在目标前方。','怎样有依据地调整？','站位不变，稍增力度',['同时换站位和目标','站位不变，稍增力度','闭眼随便投']],
 ['kinesthetic','节奏协调','一个循环是：拍手、拍腿、停一拍。','连续两个循环，最后一个动作是什么？','停一拍',['拍手','拍腿','停一拍']],
 ['kinesthetic','动手规划','把四根等长木条围成方框。','连接之前怎样检查？','先摆出四个直角',['随便粘好再看','先摆出四个直角','把木条堆在一起']],
 ['music','节拍分组','每组四拍：强、弱、次强、弱。两组连续进行。','第 5 拍是什么？','强',['强','弱','次强']],
 ['music','时值组合','● 表示一拍音，━ 表示两拍音。','哪组总共四拍？','● ● ━',['● ━','● ● ━','━ ━ ●']],
 ['music','旋律走向','音高从低到高为 do、re、mi、fa、sol。','mi → re → do 的走向是？','逐渐降低',['逐渐升高','逐渐降低','保持不变']],
 ['music','休止与节奏','第 1、2、4 拍发声，第 3 拍休止。','哪种记录正确？','响 响 停 响',['响 停 响 响','响 响 停 响','响 响 响 停']],
 ['music','速度与时长','同样八拍，从每秒一拍改为每秒两拍。','总时长如何变化？','变为一半',['变为两倍','不变','变为一半']],
 ['space','方向追踪','向东走两格，再向北走一格。','终点在起点哪个方向？','东北',['东北','西北','东南']],
 ['space','旋转观察','箭头 ↑ 顺时针旋转四分之一圈。','它会指向哪里？','→',['←','→','↓']],
 ['space','对称图形','正方形纸沿中间的竖线对折。','展开后左右两边有什么关系？','沿折痕互为镜像',['大小不同','沿折痕互为镜像','没有对应关系']],
 ['space','立体视角','两块相同积木上下叠放，完全对齐。','从正上方能看到几个顶面？','1',['1','2','4']],
 ['interpersonal','倾听核对','同伴说不是不愿合作，而是不清楚任务。','哪句话能核实需要？','你想先弄清具体要做什么吗？',['你总拖后腿','你想先弄清具体要做什么吗？','不用说了']],
 ['interpersonal','公平分工','合作海报，一人善画图，一人善查资料。','怎样开始分工？','先确认意愿再分工并互相检查',['让一个人全部完成','先确认意愿再分工并互相检查','谁声音大谁决定']],
 ['interpersonal','化解冲突','同学对同一个数据的解释不同。','怎样比较？','各说依据，再共同检查记录',['按人气投票','各说依据，再共同检查记录','删掉数据']],
 ['interpersonal','具体反馈','同伴请你评价作品。','哪条反馈便于改进？','标题清楚，第二段可补一个例子',['很差','标题清楚，第二段可补一个例子','没有意思']],
 ['intrapersonal','情绪识别','开始着急，越看越读不清条件。','怎样处理便于继续？','缓一缓，再圈出条件',['一直责备自己','缓一缓，再圈出条件','随便填答案']],
 ['intrapersonal','目标拆解','一周读完剩余 70 页。','哪个计划便于检查？','每天读 10 页并记录一个问题',['有空再读','每天读 10 页并记录一个问题','只想象读完']],
 ['intrapersonal','复盘策略','同一种计算错误出现三次。','怎样找到原因？','对比步骤并标出出错位置',['只抄正确答案','对比步骤并标出出错位置','认为永远学不会']],
 ];
 extra.forEach(([dimension,skill,material,question,expected,options])=>{
 add('reflection',skill,material,question,expected,'请说明依据；可以画图或写出一个具体步骤。','用一次真实活动验证这里的策略。',options,'专项');tasks[tasks.length-1].dimension=dimension;
 });
 tasks.forEach(t=>{t.dimension ||= t.subject==='math'?'logic':t.subject==='science'?'nature':t.subject==='reflection'?(t.skill==='合作与分工'?'interpersonal':'intrapersonal'):t.skill==='指令理解'?'space':'language';t.baselineSeconds=t.difficulty==='挑战'?180:t.difficulty==='基础'?90:120;});
 return [...tasks.filter(t=>t.subject==='reflection'),...tasks.filter(t=>t.subject!=='reflection')];
}
export function gradeAdmission(tasks: AdmissionTask[], answers: Record<string, AdmissionAnswer>) {
  return ADMISSION_SUBJECTS.filter(s => s.id !== 'reflection').map(s => {
    const items = tasks.filter(t => t.subject === s.id);
    const judged = items.filter(t => answers[t.id] && !answers[t.id].skipped);
    const correct = judged.filter(t => answers[t.id].value.trim().toLowerCase() === t.expected?.toLowerCase());
    const review = judged.filter(t => !correct.includes(t));
    return { subject: s.id as SubjectId, label: s.label, total: items.length, attempted: judged.length, correct: correct.length, score: judged.length ? Math.round(correct.length / judged.length * 100) : 0, strengths: correct.map(t => t.skill), review: review.map(t => t.skill), unknown: items.filter(t => !judged.includes(t)).map(t => t.skill), next: (review[0] || items.find(t => !judged.includes(t)) || items.at(-1))!.nextStep };
  });
}

export const DIMENSIONS: {id:Dimension;label:string;note:string}[] = [
{id:'language',label:'语言',note:'材料理解与表达选择'},{id:'logic',label:'逻辑数学',note:'数量关系、规律与推理'},
{id:'space',label:'空间',note:'方位、旋转与结构判断'},{id:'kinesthetic',label:'身体动觉',note:'动作规划知识；实际协调待活动观察'},
{id:'music',label:'音乐',note:'节拍与音高符号理解；听辨待实测'},{id:'interpersonal',label:'人际',note:'合作情境判断；实际互动待观察'},
{id:'intrapersonal',label:'内省',note:'反思策略与自我调节情境'},{id:'nature',label:'自然观察',note:'观察、实验与证据判断'},
];
export function validAnswer(t:AdmissionTask,a?:AdmissionAnswer){return Boolean(a&&!a.skipped&&a.value.trim()&&a.reasoning.trim().length>=4&&(!t.options||t.options.includes(a.value)));}
export function nextTaskIndex(tasks:AdmissionTask[],answers:Record<string,AdmissionAnswer>){return tasks.findIndex(t=>!validAnswer(t,answers[t.id]));}
export function dimensionScores(tasks:AdmissionTask[],answers:Record<string,AdmissionAnswer>){return DIMENSIONS.map(d=>{const items=tasks.filter(t=>t.dimension===d.id&&t.expected);const attempted=items.filter(t=>validAnswer(t,answers[t.id]));const correct=attempted.filter(t=>answers[t.id].value.trim().toLowerCase()===t.expected!.toLowerCase()).length;const score=attempted.length?Math.round(correct/attempted.length*100):null;return {...d,total:items.length,attempted:attempted.length,score,level:score===null?'待评估（题目不足）':score>=70?'本组表现较充分':score>=40?'继续验证':'建议补充练习'};});}
export function adjustAdmissionPlan(tasks:AdmissionTask[],answers:Record<string,AdmissionAnswer>,task:AdmissionTask,previous:PlanAdjustment[]):PlanAdjustment{
 const items=tasks.filter(t=>t.subject===task.subject&&t.expected&&validAnswer(t,answers[t.id]));
 const accuracy=items.length?items.filter(t=>answers[t.id].value.trim().toLowerCase()===t.expected!.toLowerCase()).length/items.length:null;
 const a=answers[task.id], average=items.length?items.reduce((n,t)=>n+answers[t.id].durationMs/(t.baselineSeconds!*1000),0)/items.length:1;
 const progress=tasks.filter(t=>validAnswer(t,answers[t.id])).length;
 let to='继续当前任务，积累更多证据',reason='已提交 '+progress+'/'+tasks.length+' 项；样本仍在累积';
 if(accuracy!==null&&items.length>=2&&accuracy<.4){to=task.nextStep;reason='本组至少两项，正确率低于 40%，先补充基础练习';}
 else if(a.durationMs>task.baselineSeconds!*2000){to='复核“'+task.skill+'”的步骤，并询问是否暂停或遇到困难';reason='经过时间超过参考值两倍；耗时不直接代表能力';}
 else if(accuracy!==null&&items.length>=3&&accuracy>.8&&average<1){to='尝试更复杂的迁移任务，再检查解释依据';reason='本组至少三项、正确率超过 80%，平均用时低于参考值';}
 else if(progress%10===0){to='完成阶段检查，可休息后继续下一题';reason='已完成 '+progress+' 项，按进度安排休息';}
 return {seq:previous.length+1,questionId:task.id,at:a.savedAt,reason,from:previous.at(-1)?.to||'从基础任务开始，每 10 项检查节奏',to,progress,accuracy:accuracy===null?null:Math.round(accuracy*100),durationMs:a.durationMs};
}
