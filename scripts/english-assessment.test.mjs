// 英语单科入学测评引擎 · 自测
// 用法：npm run test:english   （等价 node scripts/english-assessment.test.mjs）
import {
  ENGLISH_ITEMS,
  IELTS_ITEMS,
  gradeEnglishExam,
  gradeItem,
  newSkillProgress,
  nextIeltsItem,
  nextItemForSkill,
  shouldAdministerIelts,
  startBandForGrade,
  SKILL_LABELS,
} from '../src/lib/english-assessment.ts';

const ORDER = ['listening', 'speaking', 'reading', 'writing'];

function freshProgress() {
  return Object.fromEntries(ORDER.map((s) => [s, newSkillProgress(s)]));
}

function makeAnswer(item, mode) {
  const isObjective = Boolean(item.options?.length);
  let value;
  if (isObjective) {
    value = mode === 'good' ? item.answer : 'zzz wrong';
  } else if (mode === 'good') {
    const targets = item.targets || [];
    const filler = Array.from({ length: Math.max(item.minWords || 20, 20) }, (_, i) =>
      i % 5 === 4 ? 'because' : 'word',
    ).join(' ');
    value = `${filler} ${targets.join(' ')}. I think this is right. It is good.`;
  } else {
    value = 'a b';
  }
  return {
    itemId: item.id,
    value,
    capture: isObjective ? undefined : 'typed',
    savedAt: new Date().toISOString(),
  };
}

function runFlow({ gradeYear, mode }) {
  const progress = freshProgress();
  const startBand = startBandForGrade(gradeYear);
  const trail = [];
  let guard = 0;
  while (guard++ < 30) {
    let item = null;
    for (const s of ORDER) {
      item = nextItemForSkill(progress[s], startBand);
      if (item) break;
    }
    if (!item && shouldAdministerIelts(progress, startBand)) item = nextIeltsItem(progress);
    if (!item) break;
    const ans = makeAnswer(item, mode);
    const score = gradeItem(item, ans);
    const p = progress[item.skill];
    p.bandTrail.push(item.band);
    p.answered[item.id] = ans;
    p.scores.push(score);
    trail.push({ id: item.id, band: item.band, score: score.score, passed: score.passed, ielts: Boolean(item.ieltsSkill) });
  }
  const report = gradeEnglishExam({ examId: 'test', gradeYear, progress });
  return { startBand, trail, report };
}

function assert(name, cond, extra) {
  console.log(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' :: ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}

// 1) 二年级全对：连过三档，应判到雅思预备，并触发雅思判定
{
  const { startBand, trail, report } = runFlow({ gradeYear: 2, mode: 'good' });
  assert('grade2 起点=初级', startBand === 'beginner', startBand);
  assert('grade2 连过三档 -> 雅思预备', report.overallBand === 'ielts-prep', `overall=${report.overallBand}, items=${trail.length}`);
  assert('grade2 连过三档会触发雅思判定', report.ielts.administered === true);
  assert('grade2 每题都通过', trail.every((t) => t.passed), JSON.stringify(trail.map((t) => t.score)));
}

// 2) 二年级全错：停在初级，且不测雅思
{
  const { trail, report } = runFlow({ gradeYear: 2, mode: 'bad' });
  assert('grade2 全错 -> 初级', report.overallBand === 'beginner', `overall=${report.overallBand}`);
  assert('grade2 全错不测雅思', report.ielts.administered === false);
  assert('grade2 全错有降档记录', trail.length > 0 && trail.every((t) => !t.passed), JSON.stringify(trail.map((t) => t.band)));
}

// 3) 初二全对：到高级，追加雅思四单项并判定可开始真题
{
  const { startBand, trail, report } = runFlow({ gradeYear: 8, mode: 'good' });
  assert('grade8 起点=雅思预备', startBand === 'ielts-prep', startBand);
  assert('grade8 全对 -> 高级', report.overallBand === 'advanced', `overall=${report.overallBand}`);
  const ieltsItems = trail.filter((t) => t.ielts);
  assert('grade8 触发雅思四单项', ieltsItems.length === 4, `count=${ieltsItems.length}`);
  assert('grade8 雅思判定 ready', report.ielts.ready === true, JSON.stringify(report.ielts));
  assert('grade8 估计区间有值', report.ielts.bandEstimate !== '未测', report.ielts.bandEstimate);
  // 高级档在该场景只有 1 题证据，应出现"单题证据"提示（诚实标注，避免过度宣称）
  assert('单题证据带复测提示', report.skills.listening.note.includes('1 题证据'), report.skills.listening.note);
}

// 4) 初二全错：不应被硬塞雅思
{
  const { trail, report } = runFlow({ gradeYear: 8, mode: 'bad' });
  const ieltsItems = trail.filter((t) => t.ielts);
  assert('grade8 全错不追加雅思题', ieltsItems.length === 0, `ieltsCount=${ieltsItems.length}`);
  assert('grade8 全错 -> 初级', report.overallBand === 'beginner', `overall=${report.overallBand}`);
  assert('grade8 全错雅思未测', report.ielts.administered === false);
}

// 5) 报告结构完整性
{
  const { report } = runFlow({ gradeYear: 5, mode: 'good' });
  assert('报告含四项技能', ORDER.every((s) => report.skills[s] && typeof report.skills[s].score === 'number'));
  assert('报告含三簇分数', ['speaking', 'listeningSpeaking', 'readingWriting'].every((k) => typeof report.clusters[k] === 'number'));
  assert('报告有下一步建议', report.nextSteps.length > 0, report.nextSteps.join(' | '));
  assert('四技能标签齐全', Object.keys(SKILL_LABELS).length === 4);
}

// 6) 一致性闸门：自适应题只在初级，但雅思四单项都高分 -> 不能宣称"具备真题水平"
{
  const progress = freshProgress();
  const push = (item, score, passed) => {
    const p = progress[item.skill];
    p.bandTrail.push(item.band);
    p.answered[item.id] = { itemId: item.id, value: 'x', savedAt: new Date().toISOString() };
    p.scores.push({ itemId: item.id, skill: item.skill, band: item.band, score, passed, detail: [] });
  };
  ENGLISH_ITEMS.filter((i) => i.band === 'beginner').forEach((i) => push(i, 30, false));
  // 雅思四单项：听读 90（通过，会把该技能档位抬起），写说 65（达 readiness 60 阈值但不到档位通过线 70）
  IELTS_ITEMS.forEach((i) => {
    const high = i.ieltsSkill === 'listening' || i.ieltsSkill === 'reading';
    push(i, high ? 90 : 65, high);
  });
  const report = gradeEnglishExam({ examId: 'gate', gradeYear: 8, progress });
  assert('闸门：连过规则挡住越级，综合停在初级', report.overallBand === 'beginner', report.overallBand);
  assert('闸门：不得判定具备真题水平', report.ielts.ready === false, JSON.stringify(report.ielts.subscores));
  assert('闸门：IELTS 区间被压上限', report.ielts.bandEstimate.includes('上限'), report.ielts.bandEstimate);
  assert('闸门：说明里点出综合档位', report.ielts.suggestion.includes('初级'), report.ielts.suggestion);
}

console.log('\n[done]');
