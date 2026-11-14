/**
 * DeepSeek + Kimi 同时检索各调式完整示范音频，并做「纯净」双审：
 * 无人声、无杂音、音调清楚；不通过则丢弃。
 */
import { extractJson, schoolChat } from './llm';
import { searchSchoolWeb, type SchoolSearchItem } from './school-web-search';
import { getScaleDef, type ScaleId } from './music-scales';
import {
  isDirectAudioUrl,
  probeAudioPlayable,
  setAuditedAudios,
  type AuditedScaleAudio,
} from './scale-audio-library';
import { researchWuyinTuningDual } from './wuyin-research';

const SCALE_SEARCH_QUERY: Record<ScaleId, string> = {
  gong: '三分损益 宫调 五声音阶 纯器乐 示范 无伴唱 mp3 wav 完整音阶',
  shang: '商调 五声音阶 古琴 纯器乐 示范 无歌声 mp3 完整',
  jue: '角调 五声音阶 纯器乐 示范 无杂音 mp3 完整音阶',
  zhi: '徵调 五声音阶 纯器乐 示范 mp3 wav 无演唱',
  yu: '羽调 五声音阶 纯器乐 示范 无歌词 mp3 完整',
  egyptian: 'Egyptian maqam hijaz scale pure instrumental reference audio mp3 no vocals no talking',
  arabic: 'Arabic maqam scale pure instrumental tuning demo mp3 wav no singing clean',
  kaiser: 'equal temperament chromatic scale pure sine or piano reference mp3 no vocals',
  us_rock: 'blues rock pentatonic scale pure instrumental reference mp3 no vocals clean',
  vietnam: 'Vietnamese pentatonic scale đàn tranh instrumental demo mp3 no vocals clean',
  japan: 'Japanese in scale intervals pure instrumental tone reference mp3 no vocals clean pitch',
};

type CandidateAudit = {
  url: string;
  title: string;
  pass: boolean;
  noNoise: boolean;
  noVocals: boolean;
  clearPitch: boolean;
  playableHint: boolean;
  reason: string;
};

function formatSearch(items: SchoolSearchItem[], query: string): string {
  if (!items.length) return `【检索】${query}\n（暂无结果）`;
  return [
    `【检索】${query}`,
    ...items.slice(0, 12).map((it, i) => `${i + 1}. ${it.title}\n   ${it.url}\n   ${it.snippet || ''}`),
  ].join('\n');
}

async function auditWithEngine(
  engine: 'deepseek' | 'kimi',
  scaleId: ScaleId,
  searchContext: string,
): Promise<CandidateAudit[]> {
  const def = getScaleDef(scaleId);
  const raw = await schoolChat({
    prefer: engine,
    temperature: 0.15,
    max_tokens: 1400,
    system: `你是音频资料审核员。只审核「${def.name}」调式的完整/示范音频是否适合给儿童听纯净音高。
硬性通过条件（全部满足才 pass=true）：
1) 无人声、无歌词、无说话讲解盖住音高（允许极短旁白则仍判不通过）
2) 无明显杂音、电流声、爆音、环境嘈杂
3) 音调清楚可辨，能听出调式音级
4) url 必须来自检索列表，禁止编造
优先直链音档（mp3/wav/ogg/m4a）。页面链接若无法确认纯净，pass=false。
只输出 JSON：
{"candidates":[{"url":"","title":"","pass":true,"no_noise":true,"no_vocals":true,"clear_pitch":true,"playable_hint":true,"reason":"一句"}]}
最多 5 条；一条都不通过则 candidates 为空数组。`,
    user: `调式：${def.name}（${scaleId}）\n${searchContext}`,
  });

  const parsed = extractJson<{
    candidates?: Array<{
      url?: string;
      title?: string;
      pass?: boolean;
      no_noise?: boolean;
      no_vocals?: boolean;
      clear_pitch?: boolean;
      playable_hint?: boolean;
      reason?: string;
    }>;
  }>(raw);

  return (parsed?.candidates || [])
    .filter((c) => c?.url && /^https?:\/\//i.test(c.url))
    .map((c) => ({
      url: c.url!,
      title: c.title || def.name,
      pass: Boolean(c.pass && c.no_noise && c.no_vocals && c.clear_pitch),
      noNoise: Boolean(c.no_noise),
      noVocals: Boolean(c.no_vocals),
      clearPitch: Boolean(c.clear_pitch),
      playableHint: Boolean(c.playable_hint),
      reason: c.reason || '',
    }));
}

function mergeAudits(
  scaleId: ScaleId,
  a: CandidateAudit[],
  b: CandidateAudit[],
): AuditedScaleAudio[] {
  const map = new Map<string, AuditedScaleAudio>();

  const consider = (list: CandidateAudit[], engine: 'deepseek' | 'kimi') => {
    for (const c of list) {
      if (!c.pass) continue;
      const prev = map.get(c.url);
      if (!prev) {
        map.set(c.url, {
          id: `${scaleId}-${c.url.length}-${c.url.slice(-24).replace(/\W/g, '')}`,
          scaleId,
          title: c.title,
          url: c.url,
          playable: false,
          engines: [engine],
          auditNote: c.reason || '双审候选',
          quality: {
            noNoise: c.noNoise,
            noVocals: c.noVocals,
            clearPitch: c.clearPitch,
          },
        });
      } else if (!prev.engines.includes(engine)) {
        prev.engines.push(engine);
        prev.auditNote = `${prev.auditNote}；${engine}亦通过`;
      }
    }
  };

  consider(a, 'deepseek');
  consider(b, 'kimi');

  // 双模型都通过的优先；单模型通过也可保留，但标记
  return [...map.values()].sort((x, y) => y.engines.length - x.engines.length);
}

/**
 * 对任意调式：双模型检索 + 纯净双审 + 直链可播探测。
 * 五声调额外仍跑音分考证。
 */
export async function researchScaleAudioDual(scaleId: ScaleId): Promise<{
  audios: AuditedScaleAudio[];
  searchQuery: string;
  rejectedHint: string;
  wuyinUpdated: boolean;
}> {
  let wuyinUpdated = false;
  if (['gong', 'shang', 'jue', 'zhi', 'yu'].includes(scaleId)) {
    try {
      await researchWuyinTuningDual();
      wuyinUpdated = true;
    } catch {
      /* 音分考证失败不阻断音频流 */
    }
  }

  const query = SCALE_SEARCH_QUERY[scaleId] || `${getScaleDef(scaleId).name} pure instrumental scale mp3`;
  const searched = await searchSchoolWeb({
    query,
    subject: 'art',
    kinds: ['web', 'video', 'wiki'],
  });
  const context = formatSearch(searched.items || [], searched.query || query);

  const [deepseekList, kimiList] = await Promise.all([
    auditWithEngine('deepseek', scaleId, context).catch(() => [] as CandidateAudit[]),
    auditWithEngine('kimi', scaleId, context).catch(() => [] as CandidateAudit[]),
  ]);

  const merged = mergeAudits(scaleId, deepseekList, kimiList);

  // 双审：优先保留两引擎都通过的；若没有，则保留单引擎通过且为直链者
  const dualPass = merged.filter((m) => m.engines.length >= 2);
  const singleDirect = merged.filter((m) => m.engines.length === 1 && isDirectAudioUrl(m.url));
  const shortlist = (dualPass.length ? dualPass : singleDirect).slice(0, 6);

  const probed: AuditedScaleAudio[] = [];
  for (const item of shortlist) {
    const playable = await probeAudioPlayable(item.url);
    // 页面链：仅当双引擎通过时保留为「外链」（不可内嵌播）
    if (playable) {
      probed.push({ ...item, playable: true, auditNote: `${item.auditNote} · 直链可播` });
    } else if (item.engines.length >= 2 && !isDirectAudioUrl(item.url)) {
      probed.push({
        ...item,
        playable: false,
        auditNote: `${item.auditNote} · 已双审通过但非直链，请外开；校内将播合成纯净循环`,
      });
    }
  }

  const saved = setAuditedAudios(scaleId, probed);
  const rejectedHint =
    saved.length === 0
      ? '检索结果均未通过「无人声/无杂音/音调清晰」双审，或无可播直链；已改用校内合成完整循环（保证纯净）。'
      : saved.every((s) => !s.playable)
        ? '有通过审核的外链，但无直链音档可内嵌播放；点条目可外开，或听校内合成循环。'
        : '';

  return {
    audios: saved,
    searchQuery: searched.query || query,
    rejectedHint,
    wuyinUpdated,
  };
}
