/**
 * DeepSeek + Kimi 同时考证正宗宫商角徵羽音律，并检索可参考的完整调式音频。
 */
import { extractJson, schoolChat } from './llm';
import { searchSchoolWeb } from './school-web-search';
import {
  SANFEN_RATIOS,
  buildChromaticFromWuyinCents,
  ratiosToCents,
  setWuyinTuning,
  type WuyinAudioRef,
  type WuyinCents,
  type WuyinRatios,
  type WuyinTuningState,
} from './wuyin-tuning';
import { applyWuyinChromaticTables } from './music-scales';

type ModelPack = {
  engine: 'deepseek' | 'kimi';
  cents?: WuyinCents;
  ratios?: WuyinRatios;
  method?: string;
  audioRefs: WuyinAudioRef[];
  note: string;
  raw?: string;
};

const RESEARCH_SYSTEM = `你是中国传统乐律研究员。任务：考证「真正的」宫、商、角、徵、羽五声调式音律，明确区别于西方十二平均律。
优先依据：三分损益法、五度相生、黄钟律管/弦长比；可参考检索到的音频与文献摘要。
必须只输出一个 JSON（不要 markdown 围栏外的废话）：
{
  "method": "所用律制名称",
  "cents_from_gong": { "gong": 0, "shang": 203.91, "jue": 407.82, "zhi": 701.96, "yu": 905.87 },
  "ratios": { "gong": 1, "shang": 1.125, "jue": 1.265625, "zhi": 1.5, "yu": 1.6875 },
  "audio_refs": [{ "title": "曲名或调式示范", "url": "检索结果中的真实URL", "note": "听哪一段" }],
  "why_not_equal_temperament": "一两句说明为何不是西方平均律"
}
硬性要求：
1) 商/角/徵/羽相对宫的音分不得写成 200/400/700/900 这种平均律整数（允许接近三分损益的 204/408/702/906）。
2) audio_refs 的 url 必须来自用户提供的检索结果，禁止编造。
3) 若检索不足，仍给出三分损益标准比值，audio_refs 可为空数组。`;

function normalizeCents(c?: Partial<WuyinCents> | null): WuyinCents | null {
  if (!c) return null;
  const gong = Number(c.gong);
  const shang = Number(c.shang);
  const jue = Number(c.jue);
  const zhi = Number(c.zhi);
  const yu = Number(c.yu);
  if (![gong, shang, jue, zhi, yu].every((n) => Number.isFinite(n))) return null;
  // 拒绝纯平均律
  const etLike =
    Math.abs(shang - 200) < 2 &&
    Math.abs(jue - 400) < 2 &&
    Math.abs(zhi - 700) < 2 &&
    Math.abs(yu - 900) < 2;
  if (etLike) {
    return ratiosToCents(SANFEN_RATIOS);
  }
  return { gong, shang, jue, zhi, yu };
}

function normalizeRatios(r?: Partial<WuyinRatios> | null): WuyinRatios | null {
  if (!r) return null;
  const gong = Number(r.gong) || 1;
  const shang = Number(r.shang);
  const jue = Number(r.jue);
  const zhi = Number(r.zhi);
  const yu = Number(r.yu);
  if (![shang, jue, zhi, yu].every((n) => Number.isFinite(n) && n > 0)) return null;
  return { gong, shang, jue, zhi, yu };
}

function centsToRatios(c: WuyinCents): WuyinRatios {
  const r = (cents: number) => 2 ** (cents / 1200);
  return {
    gong: 1,
    shang: r(c.shang - c.gong),
    jue: r(c.jue - c.gong),
    zhi: r(c.zhi - c.gong),
    yu: r(c.yu - c.gong),
  };
}

async function askEngine(
  engine: 'deepseek' | 'kimi',
  searchContext: string,
): Promise<ModelPack> {
  try {
    const raw = await schoolChat({
      prefer: engine,
      temperature: 0.2,
      max_tokens: 1200,
      system: RESEARCH_SYSTEM,
      user: `请同时参考下列外网检索，考证正宗宫商角徵羽，并列出可听的完整/示范音频链接。\n${searchContext}`,
    });
    const parsed = extractJson<{
      method?: string;
      cents_from_gong?: Partial<WuyinCents>;
      ratios?: Partial<WuyinRatios>;
      audio_refs?: Array<{ title?: string; url?: string; note?: string }>;
      why_not_equal_temperament?: string;
    }>(raw);

    const cents = normalizeCents(parsed?.cents_from_gong || null);
    const ratios =
      normalizeRatios(parsed?.ratios || null) || (cents ? centsToRatios(cents) : null);
    const audioRefs: WuyinAudioRef[] = (parsed?.audio_refs || [])
      .filter((a) => a?.url && /^https?:\/\//i.test(a.url))
      .slice(0, 5)
      .map((a) => ({
        title: a.title || '调式示范',
        url: a.url!,
        note: a.note,
        engine,
      }));

    return {
      engine,
      cents: cents || undefined,
      ratios: ratios || undefined,
      method: parsed?.method,
      audioRefs,
      note: parsed?.why_not_equal_temperament || raw.slice(0, 180),
      raw,
    };
  } catch (e) {
    return {
      engine,
      audioRefs: [],
      note: e instanceof Error ? e.message : '模型考证失败',
    };
  }
}

function avgCents(a: WuyinCents, b: WuyinCents): WuyinCents {
  return {
    gong: 0,
    shang: Math.round(((a.shang + b.shang) / 2) * 100) / 100,
    jue: Math.round(((a.jue + b.jue) / 2) * 100) / 100,
    zhi: Math.round(((a.zhi + b.zhi) / 2) * 100) / 100,
    yu: Math.round(((a.yu + b.yu) / 2) * 100) / 100,
  };
}

/** DeepSeek 与 Kimi 并行考证，合并后写入调律并刷新五声十二律表 */
export async function researchWuyinTuningDual(): Promise<{
  tuning: WuyinTuningState;
  deepseek: ModelPack;
  kimi: ModelPack;
  searchQuery: string;
}> {
  const query =
    '三分损益法 五声音阶 宫商角徵羽 音分 频率比 黄钟 古琴 示范音频 完整调式';
  const searched = await searchSchoolWeb({
    query,
    subject: 'music',
    kinds: ['web', 'video', 'wiki'],
  });
  const lines = (searched.items || []).slice(0, 10).map((it, i) => {
    return `${i + 1}. ${it.title}\n   ${it.url}\n   ${it.snippet || ''}`;
  });
  const searchContext =
    lines.length > 0
      ? `【检索结果】\n${lines.join('\n')}`
      : '【检索结果】暂无；请仍按三分损益法给出正宗比值。';

  const [deepseek, kimi] = await Promise.all([
    askEngine('deepseek', searchContext),
    askEngine('kimi', searchContext),
  ]);

  const centsA = deepseek.cents;
  const centsB = kimi.cents;
  let cents: WuyinCents;
  let source: WuyinTuningState['source'] = 'sanfen-default';
  let method = '三分损益（五度相生）';

  if (centsA && centsB) {
    cents = avgCents(centsA, centsB);
    source = 'merged';
    method = `双模型合并：${deepseek.method || 'DeepSeek'} + ${kimi.method || 'Kimi'}`;
  } else if (centsA) {
    cents = centsA;
    source = 'dual-llm';
    method = deepseek.method || 'DeepSeek 考证';
  } else if (centsB) {
    cents = centsB;
    source = 'dual-llm';
    method = kimi.method || 'Kimi 考证';
  } else {
    cents = ratiosToCents(SANFEN_RATIOS);
    source = 'sanfen-default';
  }

  const ratios = centsToRatios(cents);
  const audioRefs = [...deepseek.audioRefs, ...kimi.audioRefs]
    .filter((a, i, arr) => arr.findIndex((x) => x.url === a.url) === i)
    .slice(0, 8);

  const tuning = setWuyinTuning({
    method,
    ratios,
    cents,
    audioRefs,
    source,
    deepseekNote: deepseek.note,
    kimiNote: kimi.note,
  });

  applyWuyinChromaticTables(buildChromaticFromWuyinCents(cents));

  return { tuning, deepseek, kimi, searchQuery: searched.query || query };
}
