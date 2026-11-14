/**
 * 入学校长面谈：了解学情 → 生成各科学习方案 → 下发全体老师
 */
import { extractJson, schoolChat, withAgeBand } from './llm';
import { SUBJECT_TEACHER } from './teachers';
import {
  SUBJECTS,
  type AgeBand,
  type DailyPlan,
  type IntakeAnswers,
  type PrincipalIntakeReport,
  type SubjectId,
  type TeacherTone,
} from './types';
import { getStudentTitle } from './types';

export type { IntakeAnswers, PrincipalIntakeReport };

export type IntakePlanBundle = {
  report: PrincipalIntakeReport;
  plans: Partial<Record<SubjectId, DailyPlan>>;
};

const SUBJECT_IDS = SUBJECTS.map((s) => s.id) as SubjectId[];

export const INTAKE_STEPS: Array<{
  id: keyof IntakeAnswers;
  title: string;
  prompt: string;
  chips: string[];
}> = [
  {
    id: 'overview',
    title: '最近学习怎么样？',
    prompt: '用几句话告诉校长：你最近学习整体感觉如何？（轻松 / 一般 / 有点吃力都可以）',
    chips: ['整体还顺利', '有的科目轻松有的吃力', '最近有点跟不上', '刚换环境还在适应'],
  },
  {
    id: 'strengths',
    title: '你的长处与进步',
    prompt: '哪些方面你比较擅长，或最近明显进步了？可以说科目，也可以说习惯（如专注、提问）。',
    chips: ['数学计算比较稳', '语文阅读有进步', '英语口语敢开口', '喜欢动手做实验', '体育体能变好了'],
  },
  {
    id: 'weaknesses',
    title: '薄弱或有缺陷的地方',
    prompt: '哪些地方让你觉得难、容易错、或信心不足？如实说，校长会帮你安排老师。',
    chips: ['应用题读不懂', '作文不知从何写', '单词记不牢', '概念听懂做题不会', '容易分心拖延'],
  },
  {
    id: 'stagnant',
    title: '卡住或停滞的点',
    prompt: '有没有学了很久却几乎没进步、一直卡住的内容？',
    chips: ['分数运算总错', '古诗背了就忘', '时态分不清', '实验步骤记不熟', '暂时说不上来'],
  },
  {
    id: 'goals',
    title: '近期目标',
    prompt: '接下来一两周，你最想先改善什么？校长会据此给各科老师下任务。',
    chips: ['先把薄弱科补牢', '养成每日复习习惯', '提高作业正确率', '课堂敢提问', '均衡各科别偏科'],
  },
];

function teacherLine(id: SubjectId): string {
  const t = SUBJECT_TEACHER[id];
  const s = SUBJECTS.find((x) => x.id === id);
  return `${id}（${s?.name || id} / ${t?.name || '老师'}）`;
}

export async function generateIntakePlanBundle(opts: {
  studentName: string;
  gradeLabel: string;
  gradeYear?: number;
  ageBand: AgeBand;
  teacherTone: TeacherTone;
  answers: IntakeAnswers;
}): Promise<IntakePlanBundle> {
  const title = getStudentTitle(undefined, opts.gradeYear);
  const subjectHint = SUBJECT_IDS.map(teacherLine).join('、');
  const voice = [
    `确认年级：${opts.gradeLabel}`,
    `近况：${opts.answers.overview}`,
    `长处/进步：${opts.answers.strengths}`,
    `薄弱：${opts.answers.weaknesses}`,
    `停滞：${opts.answers.stagnant}`,
    `目标：${opts.answers.goals}`,
    `提交资料：${opts.answers.materials || '（暂无纸质/电子报告）'}`,
    opts.answers.usedQuiz
      ? `摸底测：${opts.answers.quizDetail || `得分约 ${opts.answers.quizScore ?? '—'} 分`}`
      : '摸底测：未使用（已有资料说明）',
  ].join('\n');

  const raw = await schoolChat({
    prefer: 'auto',
    temperature: 0.45,
    max_tokens: 3200,
    system: withAgeBand(
      `你是AI一人学校女校长（约45岁）：庄重、有智慧、言简意赅。
任务：根据新生入学面谈材料，诊断优缺点与停滞点，生成「可执行」的分科学习方案，并写给全体科任老师的统领备忘。
必须只输出一个 JSON（不要 markdown 围栏外废话）：
{
  "summary": "给学生听的总评，2-4句",
  "strengths": ["优点1","优点2"],
  "weaknesses": ["薄弱1","薄弱2"],
  "stagnant": ["停滞点"],
  "progress": ["已有进步"],
  "teacherMemo": "给全体老师的备忘：如何协同、优先级、注意事项，3-6句",
  "plans": {
    "math": [{"id":"m1","title":"任务标题","kind":"讲解|例题|练习|测验|习惯"}],
    "chinese": [{"id":"c1","title":"...","kind":"..."}],
    "english": [],
    "science": [],
    "art": [],
    "pe": []
  }
}
硬性要求：
1) plans 必须包含全部科目键：math,chinese,english,science,art,pe；每科 2～4 个任务。
2) 任务要针对该生优点巩固、薄弱补救、停滞突破；若有试卷/视力等资料或摸底测分数，请写入对应科目任务；语文老师兼史地、科学老师兼物化生可在任务标题里点明。
3) kind 用中文短词；title 具体可执行，避免空话。
4) 称呼学生可用「${title}」。科目对照：${subjectHint}
5) 若摸底测分数偏低，主科任务偏补基础；分数较高则可加拓展。`,
      opts.ageBand,
      opts.teacherTone,
      { role: 'principal', gradeYear: opts.gradeYear },
    ),
    user: `新生：${opts.studentName}，年级：${opts.gradeLabel}。\n入学面谈材料：\n${voice}`,
  });

  const parsed = extractJson<{
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    stagnant?: string[];
    progress?: string[];
    teacherMemo?: string;
    plans?: Partial<Record<SubjectId, Array<{ id?: string; title?: string; kind?: string }>>>;
  }>(raw);

  const date = new Date().toISOString().slice(0, 10);
  const generatedAt = new Date().toISOString();
  const plans: Partial<Record<SubjectId, DailyPlan>> = {};

  for (const id of SUBJECT_IDS) {
    const tasksRaw = parsed?.plans?.[id];
    const tasks = Array.isArray(tasksRaw)
      ? tasksRaw
          .map((t, i) => ({
            id: String(t.id || `${id}-${i + 1}`),
            title: String(t.title || '巩固练习').slice(0, 80),
            kind: String(t.kind || '练习').slice(0, 20),
            done: false,
          }))
          .slice(0, 5)
      : fallbackTasks(id, opts.answers);
    if (!tasks.length) {
      plans[id] = {
        subject: id,
        date,
        tasks: fallbackTasks(id, opts.answers),
        generatedAt,
      };
    } else {
      plans[id] = { subject: id, date, tasks, generatedAt };
    }
  }

  const report: PrincipalIntakeReport = {
    generatedAt,
    summary:
      parsed?.summary?.trim() ||
      `${title}${opts.studentName}，校长已根据你的面谈材料整理优缺点，并给各科老师下达了针对性学习方案。`,
    strengths: asList(parsed?.strengths, opts.answers.strengths),
    weaknesses: asList(parsed?.weaknesses, opts.answers.weaknesses),
    stagnant: asList(parsed?.stagnant, opts.answers.stagnant),
    progress: asList(parsed?.progress, opts.answers.strengths),
    teacherMemo:
      parsed?.teacherMemo?.trim() ||
      `请各位老师优先补强薄弱项，巩固其长处；停滞知识点需拆小步讲解。语文兼顾史地，科学兼顾物化生实验。`,
    studentVoice: voice,
    answers: opts.answers,
    materialsSummary: opts.answers.materials || '暂无纸质/电子报告',
    quizSummary: opts.answers.usedQuiz
      ? opts.answers.quizDetail || `摸底约 ${opts.answers.quizScore ?? '—'} 分`
      : undefined,
  };

  return { report, plans };
}

function asList(arr: string[] | undefined, fallback: string): string[] {
  if (Array.isArray(arr) && arr.length) return arr.map((s) => String(s).slice(0, 60)).slice(0, 6);
  return fallback
    .split(/[，,、；;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function fallbackTasks(id: SubjectId, a: IntakeAnswers): DailyPlan['tasks'] {
  const weak = a.weaknesses.slice(0, 24) || '基础巩固';
  const base = [
    { id: `${id}-1`, title: `针对薄弱：${weak}`.slice(0, 60), kind: '讲解', done: false },
    { id: `${id}-2`, title: '完成一组巩固练习并订正', kind: '练习', done: false },
    { id: `${id}-3`, title: '向老师复述今天学会的一点', kind: '习惯', done: false },
  ];
  if (id === 'science') {
    base.push({ id: `${id}-4`, title: '在实验室完成 1 个相关小实验', kind: '练习', done: false });
  }
  if (id === 'chinese') {
    base[0] = {
      id: `${id}-1`,
      title: `语文/史地阅读：围绕「${weak}」精读一段材料`,
      kind: '讲解',
      done: false,
    };
  }
  return base;
}

/** 注入各科老师系统提示的入学方案摘要 */
export function intakeTeacherContext(report: PrincipalIntakeReport | null | undefined): string {
  if (!report) return '';
  return `【入学任务报告与学习计划】
总评：${report.summary}
优点：${report.strengths.join('、') || '—'}
薄弱：${report.weaknesses.join('、') || '—'}
停滞：${report.stagnant.join('、') || '—'}
进步：${report.progress.join('、') || '—'}
资料：${report.materialsSummary || report.answers.materials || '—'}
${report.quizSummary ? `摸底测：${report.quizSummary}` : ''}
老师备忘：${report.teacherMemo}
请按校长方案优先辅导，勿忽视其长处。`;
}
