import { schoolChat } from './llm';
import { nextSearchEngine } from './school-web-search';
import { LOCAL_EYE_CARE_IMAGES } from './eye-care-images';

export const EYE_CARE_DEFAULT_MINUTES = 40;
export const EYE_CARE_REST_MS = 10 * 60 * 1000;
export const EYE_CARE_PHASE1_MS = 5 * 60 * 1000;
/** 休息结束后至少冷却这么久，才重新累计（防止刚结束又弹） */
export const EYE_CARE_COOLDOWN_MS = 90 * 1000;

const ACTIVE_KEY = 'ai-school-eye-active-ms';
const LAST_REST_KEY = 'ai-school-eye-last-rest';
const RESTING_KEY = 'ai-school-eye-resting';

export function getActiveMs(): number {
  try {
    return Number(sessionStorage.getItem(ACTIVE_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

export function setActiveMs(ms: number) {
  try {
    sessionStorage.setItem(ACTIVE_KEY, String(Math.max(0, Math.floor(ms))));
  } catch {
    /* ignore */
  }
}

export function getLastRestAt(): number {
  try {
    return Number(sessionStorage.getItem(LAST_REST_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

/** 是否仍在休息后冷却期 */
export function isEyeCareCooldown(): boolean {
  const last = getLastRestAt();
  if (!last) return false;
  return Date.now() - last < EYE_CARE_COOLDOWN_MS;
}

export function markRestDone() {
  try {
    sessionStorage.setItem(LAST_REST_KEY, String(Date.now()));
    sessionStorage.setItem(ACTIVE_KEY, '0');
    sessionStorage.removeItem(RESTING_KEY);
  } catch {
    /* ignore */
  }
}

/** 开始休息：立刻清零累计，并打上「休息中」标记（防刷新后秒弹） */
export function beginEyeCareSession() {
  try {
    sessionStorage.setItem(ACTIVE_KEY, '0');
    sessionStorage.setItem(RESTING_KEY, '1');
  } catch {
    /* ignore */
  }
}

/**
 * 页面加载时自愈：
 * - 若上次休息中途刷新，视为已结束并进入冷却，避免一进站又弹
 * - 若累计被预览拉到离谱大数，清零
 */
export function recoverEyeCareAfterReload() {
  try {
    if (sessionStorage.getItem(RESTING_KEY) === '1') {
      markRestDone();
      return;
    }
    const active = getActiveMs();
    // 超过 3 小时的累计视为脏数据（例如预览拉满后未走完休息）
    if (active > 3 * 60 * 60 * 1000) {
      setActiveMs(0);
    }
  } catch {
    /* ignore */
  }
}

/** 家长中心预览：拉到「刚好达到阈值」，并清掉冷却，约一个 tick 后弹出 */
export function forceEyeCareSoon(minutes?: number) {
  try {
    sessionStorage.removeItem(RESTING_KEY);
    sessionStorage.removeItem(LAST_REST_KEY);
    sessionStorage.setItem(ACTIVE_KEY, String(thresholdMs(minutes)));
  } catch {
    /* ignore */
  }
}

export function thresholdMs(minutes?: number): number {
  const m = Number(minutes);
  const safe = Number.isFinite(m) && m >= 10 ? Math.min(120, m) : EYE_CARE_DEFAULT_MINUTES;
  return safe * 60 * 1000;
}

export function todayYmd(d = new Date()): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** 家长是否已设定「今天」要放映的音乐主题 / 小视频 / 插画 */
export function hasTodayEyeCareMedia(eyeCare?: {
  musicUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  musicTheme?: string;
  todayDate?: string;
} | null): boolean {
  if (!eyeCare) return false;
  if (eyeCare.todayDate && eyeCare.todayDate !== todayYmd()) return false;
  return Boolean(
    eyeCare.musicUrl?.trim() ||
      eyeCare.videoUrl?.trim() ||
      eyeCare.imageUrl?.trim() ||
      eyeCare.musicTheme?.trim(),
  );
}

export type EyeCarePlayableVideo = {
  title: string;
  pageUrl: string;
  playUrl: string;
  playType: 'iframe' | 'video';
  source: string;
};

export type EyeCareGalleryImage = {
  title: string;
  url: string;
  source: string;
};

export type EyeCarePack = {
  engine: 'deepseek' | 'kimi';
  /** 每次随机：示例图 or 眼保健操视频（二选一） */
  kind: 'gallery' | 'video';
  summary: string;
  coachLine?: string;
  video: EyeCarePlayableVideo | null;
  gallery: EyeCareGalleryImage[];
  galleryFocus: EyeCareGalleryImage | null;
};

export type KugouTrack = {
  name: string;
  artist: string;
  hash: string;
  playUrl: string;
};

/**
 * 护眼老师（DeepSeek/Kimi）：搜寻原视频或示例图，并整理成可直接放映的内容。
 * 不做「建议链接」，只返回前端可播素材。
 */
export async function fetchEyeCareMaterials(): Promise<EyeCarePack> {
  const engine = nextSearchEngine();
  const res = await fetch('/api/school-eye-care', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'prepare', engine }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<EyeCarePack> & {
    ok?: boolean;
    error?: string;
    candidates?: EyeCarePlayableVideo[];
  };
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `护眼搜寻失败 (${res.status})`);
  }

  const kind: 'gallery' | 'video' = data.kind === 'video' ? 'video' : 'gallery';
  let video = (data.video as EyeCarePlayableVideo | null) || null;
  let gallery = Array.isArray(data.gallery) ? data.gallery : [];
  let galleryFocus = (data.galleryFocus as EyeCareGalleryImage | null) || gallery[0] || null;
  let summary =
    data.summary ||
    (kind === 'video' ? '护眼老师已准备好眼保健操视频。' : '护眼老师已准备好眼球训练图。');

  // 用 DeepSeek/Kimi「训练过的护眼老师」口吻：从候选里确认放映项 + 短指导语（禁止给建议链接清单）
  try {
    if (kind === 'video' && (data.candidates?.length || video)) {
      const list = (data.candidates?.length ? data.candidates : video ? [video] : []).slice(0, 6);
      const lines = list
        .map((v, i) => `${i + 1}. ${v.title} | playType=${v.playType} | ${v.playUrl}`)
        .join('\n');
      const raw = await schoolChat({
        prefer: engine,
        temperature: 0.35,
        max_tokens: 400,
        system: `你是「护眼老师」，专责搜寻并放映眼保健操原视频。
硬性规则：
1) 禁止给建议、禁止列一堆链接让学生自己点
2) 只能从给定候选里选 1 个已经可放映的条目
3) 只输出 JSON：{"index":数字,"coach":"不超过40字的跟做指导"}`,
        user: `候选：\n${lines}`,
      });
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]) as { index?: number; coach?: string };
        const idx = Math.max(0, Math.min(list.length - 1, Number(parsed.index) || 0));
        video = list[idx];
        if (parsed.coach?.trim()) {
          summary = `${engine === 'kimi' ? 'Kimi' : 'DeepSeek'} 护眼老师正在放映：${video.title}。${parsed.coach.trim()}`;
        }
      }
    } else if (kind === 'gallery' && gallery.length) {
      const raw = await schoolChat({
        prefer: engine,
        temperature: 0.4,
        max_tokens: 220,
        system: `你是「护眼老师」。本次放映眼球训练示意图（不是视频、不是视力表、不是风景图）。
只输出一句不超过 40 字的中文指导：按图示活动眼球（左右/上下/绕圈/远近/眨眼等）。禁止给链接或建议清单。`,
        user: `训练图：${galleryFocus?.title || gallery[0]?.title || '眼球训练'}`,
      });
      const coach = raw.replace(/\s+/g, ' ').trim().slice(0, 80);
      if (coach) summary = `${engine === 'kimi' ? 'Kimi' : 'DeepSeek'} 护眼老师：${coach}`;
    }
  } catch {
    /* 口吻增强失败不影响放映 */
  }

  if (kind === 'video' && !video?.playUrl) {
    // 再兜底示例图
    return {
      engine,
      kind: 'gallery',
      summary: '暂时没有可内嵌视频，改放眼球训练图护眼。',
      video: null,
      gallery: gallery.length
        ? gallery
        : LOCAL_EYE_CARE_IMAGES.map((x) => ({ title: x.title, url: x.url, source: x.source })),
      galleryFocus: galleryFocus || {
        title: LOCAL_EYE_CARE_IMAGES[0]!.title,
        url: LOCAL_EYE_CARE_IMAGES[0]!.url,
        source: LOCAL_EYE_CARE_IMAGES[0]!.source,
      },
    };
  }

  return {
    engine,
    kind,
    summary,
    video: kind === 'video' ? video : null,
    gallery: kind === 'gallery' ? gallery : [],
    galleryFocus: kind === 'gallery' ? galleryFocus : null,
  };
}

/** 酷狗安静清静背景音乐（多首轮播） */
export async function fetchQuietKugouTracks(limit = 4): Promise<KugouTrack[]> {
  const res = await fetch('/api/school-eye-care', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'kugou', limit }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    tracks?: KugouTrack[];
    error?: string;
  };
  if (!res.ok || !data.ok || !data.tracks?.length) {
    throw new Error(data.error || '酷狗配乐获取失败');
  }
  return data.tracks;
}

export function formatRemain(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
