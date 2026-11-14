/**
 * 各调式「完整示范音频」库：仅保留通过纯净审核的条目，可本地试听。
 */
import type { ScaleId } from './music-scales';

export type AuditedScaleAudio = {
  id: string;
  scaleId: ScaleId;
  title: string;
  url: string;
  /** 是否可直接用 Audio 播放（直链音档） */
  playable: boolean;
  engines: Array<'deepseek' | 'kimi'>;
  /** 审核摘要 */
  auditNote: string;
  /** 无杂音 / 无人声 / 音调清晰 */
  quality: {
    noNoise: boolean;
    noVocals: boolean;
    clearPitch: boolean;
  };
};

type Library = Partial<Record<ScaleId, AuditedScaleAudio[]>>;

const STORAGE_KEY = 'ai-school-scale-audio-audited-v1';

let library: Library = load();

function load(): Library {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Library;
  } catch {
    return {};
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch {
    /* ignore */
  }
}

export function getAuditedAudios(scaleId: ScaleId): AuditedScaleAudio[] {
  return library[scaleId] || [];
}

export function setAuditedAudios(scaleId: ScaleId, items: AuditedScaleAudio[]) {
  library = { ...library, [scaleId]: items };
  save();
  return items;
}

export function isDirectAudioUrl(url: string): boolean {
  const u = url.split('?')[0]?.toLowerCase() || '';
  return /\.(mp3|wav|ogg|m4a|aac|flac|opus)(\s*)$/i.test(u) || /\/download\//i.test(url);
}

/** 探测直链是否能播放（无杂音审核由模型做；此处只验可播） */
export function probeAudioPlayable(url: string, timeoutMs = 8000): Promise<boolean> {
  if (!isDirectAudioUrl(url)) return Promise.resolve(false);
  return new Promise((resolve) => {
    const audio = new Audio();
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      audio.removeAttribute('src');
      audio.load();
      resolve(ok);
    };
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      window.clearTimeout(timer);
      finish(Number.isFinite(audio.duration) && audio.duration > 0.3);
    };
    audio.onerror = () => {
      window.clearTimeout(timer);
      finish(false);
    };
    audio.src = url;
  });
}

let sharedAudio: HTMLAudioElement | null = null;

export function stopScaleAudioPlayback() {
  if (sharedAudio) {
    sharedAudio.pause();
    sharedAudio.removeAttribute('src');
    sharedAudio.load();
    sharedAudio = null;
  }
}

/** 播放已审核直链；失败自动重试，仍失败返回 false */
export async function playAuditedScaleAudio(item: AuditedScaleAudio): Promise<boolean> {
  stopScaleAudioPlayback();
  if (!item.playable || !isDirectAudioUrl(item.url)) return false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const audio = new Audio();
      sharedAudio = audio;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        const ok = () => {
          cleanup();
          resolve();
        };
        const fail = () => {
          cleanup();
          reject(new Error('load fail'));
        };
        const cleanup = () => {
          audio.removeEventListener('canplaythrough', ok);
          audio.removeEventListener('error', fail);
        };
        audio.addEventListener('canplaythrough', ok, { once: true });
        audio.addEventListener('error', fail, { once: true });
        audio.src = item.url;
        audio.load();
        window.setTimeout(() => {
          if (audio.readyState >= 2) ok();
        }, 3000);
      });
      await audio.play();
      return true;
    } catch {
      stopScaleAudioPlayback();
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  return false;
}
