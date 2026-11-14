import type { GradeKey, SubjectId } from './types';
import { getStudentTitle } from './types';
import { prepareSpeechText, speechHasSpeakableContent, toEdgePlainWithBreaks } from './speech-text';
import { toast } from 'sonner';
import { edgeVoiceForInterviewer, edgeVoiceForSpeak } from './edge-voices';
import { readTeacherToneFromStorage, voiceProfileForSpeak } from './speech-emotion';
import { getTeacherSampleBase64, TEACHER_VOICE_SAMPLE_SRC } from './clone-voice-sample';
import { supabase } from './supabase';
import { INTERVIEWER_VOICE } from './teachers';

/** general：全站通用文本；arts-text：文科楼文本/文章 */
export type ReadAloudKind = 'general' | 'arts-text';

export type PlaybackRate = 0.5 | 1 | 1.5;

export const PLAYBACK_RATES: PlaybackRate[] = [0.5, 1, 1.5];

/**
 * 朗读策略（已开放）：有年级即可朗读；kind 仅作标记保留。
 */
export function canReadAloud(grade: GradeKey | undefined | null, _kind: ReadAloudKind = 'general'): boolean {
  return Boolean(grade);
}

export function isArtsSubject(subject: SubjectId | string | undefined): boolean {
  return subject === 'chinese' || subject === 'english';
}

export function subjectReadAloudKind(subject: SubjectId | string | undefined): ReadAloudKind {
  return isArtsSubject(subject) ? 'arts-text' : 'general';
}

export function applyGradeTitle(text: string, grade: GradeKey | undefined): string {
  const title = getStudentTitle(grade);
  return text.replace(/小朋友/g, title).replace(/同学/g, title);
}

/** 去掉简单 markdown，供 TTS 合成（绝不用 SpeechSynthesis） */
export function plainForSpeak(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** MiniMax 超真人；保留常量名避免旧引用报错 */
export const TEACHER_TTS_VOICE = 'minimax-hd';
export { TEACHER_VOICE_SAMPLE_SRC };

export type SpeakStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended';

export type SpeakState = {
  status: SpeakStatus;
  speaking: boolean;
  paused: boolean;
  rate: PlaybackRate;
  /** 当前会话是否有可重播的音频 */
  hasSession: boolean;
};

let currentAudio: HTMLAudioElement | null = null;
let cachedUrl: string | null = null;
let cachedKey = '';
let status: SpeakStatus = 'idle';
let playbackRate: PlaybackRate = 1;
let seq = 0;
let playResolve: (() => void) | null = null;

const speakListeners = new Set<(s: SpeakState) => void>();

function snap(): SpeakState {
  return {
    status,
    speaking: status === 'loading' || status === 'playing',
    paused: status === 'paused',
    rate: playbackRate,
    hasSession: Boolean(cachedUrl),
  };
}

function emitSpeak() {
  const s = snap();
  speakListeners.forEach((cb) => {
    try {
      cb(s);
    } catch {
      /* ignore */
    }
  });
}

export function subscribeSpeakState(cb: (s: SpeakState) => void): () => void {
  speakListeners.add(cb);
  cb(snap());
  return () => {
    speakListeners.delete(cb);
  };
}

export function getSpeakState(): SpeakState {
  return snap();
}

function clearPlayWait() {
  if (playResolve) {
    const r = playResolve;
    playResolve = null;
    r();
  }
}

function detachAudio() {
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.onplay = null;
    currentAudio.onpause = null;
    currentAudio.pause();
    currentAudio.removeAttribute('src');
    currentAudio.load();
    currentAudio = null;
  }
}

function revokeCache() {
  if (cachedUrl) {
    URL.revokeObjectURL(cachedUrl);
    cachedUrl = null;
  }
  cachedKey = '';
}

/** 完全停止并清空当前会话（不可再重播） */
export function stopReadAloud() {
  seq += 1;
  clearPlayWait();
  detachAudio();
  revokeCache();
  status = 'idle';
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
  emitSpeak();
}

/** 暂停（可继续） */
export function pauseReadAloud() {
  if (!currentAudio || status !== 'playing') return;
  currentAudio.pause();
  status = 'paused';
  emitSpeak();
}

/** 从暂停处继续 */
export function resumeReadAloud() {
  if (!currentAudio || status !== 'paused') return;
  currentAudio.playbackRate = playbackRate;
  void currentAudio.play().then(() => {
    status = 'playing';
    emitSpeak();
  }).catch(() => undefined);
}

/** 从头重播当前会话音频 */
export function replayReadAloud(): Promise<void> {
  if (!cachedUrl) return Promise.resolve();
  return playCachedUrl(cachedUrl, ++seq);
}

export function setPlaybackRate(rate: PlaybackRate) {
  playbackRate = rate;
  if (currentAudio) currentAudio.playbackRate = rate;
  emitSpeak();
}

export function isReadAloudActive() {
  return status === 'playing';
}

async function postSchoolTts(body: Record<string, unknown>): Promise<Blob> {
  const res = await fetch('/api/school-tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = '';
    try {
      const j = (await res.json()) as { error?: string };
      msg = j.error || '';
    } catch {
      msg = await res.text().catch(() => '');
    }
    throw new Error(msg.slice(0, 220) || `朗读失败 (${res.status})`);
  }
  const blob = await res.blob();
  if (!blob.size) throw new Error('音频为空');
  if (blob.type.includes('json')) throw new Error('朗读接口返回异常，未得到音频');
  return blob;
}

async function extractInvokeError(
  error: { message?: string; context?: Response } | null,
  data: unknown,
): Promise<string> {
  if (data && typeof data === 'object' && data !== null && 'error' in data) {
    const msg = String((data as { error?: unknown }).error || '');
    if (msg) return msg;
  }
  if (error?.context) {
    try {
      const body = (await error.context.clone().json()) as { error?: string };
      if (body?.error) return String(body.error);
    } catch {
      /* ignore */
    }
  }
  return error?.message || '朗读失败';
}

/** 云端 MiniMax（秒哒已部署的 tts-minimax）→ 取 mp3 Blob */
async function fetchMinimaxViaSupabase(body: Record<string, unknown>): Promise<Blob> {
  const { data, error } = await supabase.functions.invoke('tts-minimax', { body });
  if (error || !data?.audioUrl) {
    throw new Error(await extractInvokeError(error, data));
  }
  const audioUrl = String(data.audioUrl);
  const res = await fetch(audioUrl);
  if (!res.ok) throw new Error(`音频下载失败 ${res.status}`);
  const blob = await res.blob();
  if (!blob.size) throw new Error('音频为空');
  return blob;
}

async function fetchHyperRealBlob(
  speechText: string,
  opts: {
    role: 'teacher' | 'principal' | 'counselor' | 'guide';
    subject?: SubjectId | string;
  },
): Promise<Blob> {
  const tone = readTeacherToneFromStorage();
  const profile = voiceProfileForSpeak({ role: opts.role, subject: opts.subject, tone });

  /**
   * MiniMax 优先；失败原因必须打出，不要静默。
   * 结论：本机常缺 MINIMAX_API_KEY / INTEGRATIONS_API_KEY，1)(2) 易失败，最终靠 Edge。
   * Edge 参数已按角色对齐（见 edge-voices.ts），听感以 Edge 为准调。
   */
  const minimaxBody: Record<string, unknown> = {
    text: speechText,
    speed: profile.speed ?? 1,
    feature: 'ai_school',
    lang: opts.subject === 'english' ? 'en' : 'zh',
  };

  let usedClone = false;
  if (profile.preferClone) {
    try {
      const sample = await getTeacherSampleBase64();
      minimaxBody.sample_base64 = sample;
      minimaxBody.emotion = profile.emotion;
      minimaxBody.voice_modify = profile.voice_modify;
      usedClone = true;
    } catch (e) {
      console.warn('[tts] clone sample unavailable → system voice', e);
    }
  }

  if (!usedClone) {
    minimaxBody.voice_id = profile.voice_id;
    minimaxBody.model = profile.model || 'speech-02-hd';
    minimaxBody.emotion = profile.emotion;
    minimaxBody.voice_modify = profile.voice_modify;
  }

  // 1) 本地 vite 插件（需 INTEGRATIONS_API_KEY）
  try {
    return await postSchoolTts(minimaxBody);
  } catch (e1) {
    console.warn('[tts] MiniMax local /api/school-tts failed:', e1);
  }

  // 2) 云端 tts-minimax
  try {
    return await fetchMinimaxViaSupabase(minimaxBody);
  } catch (e2) {
    console.warn('[tts] MiniMax supabase tts-minimax failed:', e2);
  }

  // 3) Edge（按学科/角色挂声线）
  const edge = edgeVoiceForSpeak({
    role: opts.role,
    subject: opts.subject,
    tone,
    sampleText: speechText,
  });
  console.info('[tts] fallback → Edge', edge.label, edge.voice, edge.rate, edge.pitch);
  try {
    return await postSchoolTts({
      text: toEdgePlainWithBreaks(speechText),
      voice: edge.voice,
      rate: edge.rate,
      pitch: edge.pitch,
      engine: 'edge',
    });
  } catch (e3) {
    console.error('[tts] Edge also failed:', e3);
    throw e3;
  }
}

function playCachedUrl(url: string, mySeq: number): Promise<void> {
  clearPlayWait();
  detachAudio();

  return new Promise((resolve, reject) => {
    if (mySeq !== seq) {
      resolve();
      return;
    }
    const audio = new Audio();
    currentAudio = audio;
    audio.preload = 'auto';
    audio.playbackRate = playbackRate;
    playResolve = resolve;

    const finishOk = () => {
      if (mySeq !== seq) return;
      status = 'ended';
      emitSpeak();
      clearPlayWait();
    };
    const finishErr = () => {
      if (mySeq !== seq) return;
      status = 'idle';
      emitSpeak();
      clearPlayWait();
      reject(new Error('音频播放失败'));
    };

    audio.onended = finishOk;
    audio.onerror = finishErr;
    audio.onplay = () => {
      if (mySeq !== seq) return;
      status = 'playing';
      emitSpeak();
    };
    audio.onpause = () => {
      if (mySeq !== seq) return;
      if (audio.ended) return;
      if (status === 'playing') {
        status = 'paused';
        emitSpeak();
      }
    };

    audio.src = url;
    audio.currentTime = 0;
    status = 'playing';
    emitSpeak();
    const p = audio.play();
    if (p && typeof p.then === 'function') {
      p.catch(finishErr);
    }
  });
}

async function speakPrepared(
  content: string,
  role: 'teacher' | 'principal' | 'counselor' | 'guide',
  subject?: SubjectId | string,
): Promise<void> {
  const tone = readTeacherToneFromStorage();
  const profile = voiceProfileForSpeak({ role, subject, tone });
  const key = `${role}::${subject || ''}::${profile.voice_id}::${profile.emotion}::${tone}::${content}`;
  if (cachedUrl && cachedKey === key) {
    seq += 1;
    await playCachedUrl(cachedUrl, seq);
    return;
  }

  seq += 1;
  const mySeq = seq;
  clearPlayWait();
  detachAudio();
  revokeCache();
  status = 'loading';
  emitSpeak();

  try {
    const blob = await fetchHyperRealBlob(content, { role, subject });
    if (mySeq !== seq) return;
    const url = URL.createObjectURL(blob);
    cachedUrl = url;
    cachedKey = key;
    await playCachedUrl(url, mySeq);
  } catch (e) {
    if (mySeq === seq) {
      status = 'idle';
      emitSpeak();
    }
    const msg = e instanceof Error ? e.message : '朗读失败';
    console.error('[tts] speakPrepared failed:', msg);
    toast.message(`朗读没出来：${msg.slice(0, 80)}`);
    throw e;
  }
}

function prepareSpeakContent(text: string, grade?: GradeKey): string | null {
  const titled = applyGradeTitle(text, grade);
  const content = prepareSpeechText(plainForSpeak(titled) || titled);
  if (!speechHasSpeakableContent(content)) return null;
  return content;
}

/** 兼容旧调用 → 老师超真人音 */
export async function speakAloud(text: string, grade?: GradeKey, subject?: SubjectId | string): Promise<void> {
  return speakTeacherAloud(text, grade, subject);
}

/**
 * 学科老师朗读：MiniMax 超真人（女声 / 男声 / 英语外教按学科匹配）
 */
export async function speakTeacherAloud(
  text: string,
  grade?: GradeKey,
  subject?: SubjectId | string,
): Promise<void> {
  const content = prepareSpeakContent(text, grade);
  if (!content) return;
  await speakPrepared(content, 'teacher', subject);
}

/**
 * 校长朗读：沉稳智慧女声（不克隆 audio-1）
 */
export async function speakPrincipalAloud(text: string, grade?: GradeKey): Promise<void> {
  const content = prepareSpeakContent(text, grade);
  if (!content) return;
  await speakPrepared(content, 'principal');
}

/** 心理老师朗读 */
export async function speakCounselorAloud(text: string, grade?: GradeKey): Promise<void> {
  const content = prepareSpeakContent(text, grade);
  if (!content) return;
  await speakPrepared(content, 'counselor');
}

/** 探索广场 / 兴趣向导朗读 */
export async function speakGuideAloud(text: string, grade?: GradeKey): Promise<void> {
  const content = prepareSpeakContent(text, grade);
  if (!content) return;
  await speakPrepared(content, 'guide');
}

/**
 * 入校面谈（阿初老师）：只走 Edge，不传 voice_id（避免被路由到无 key 的 MiniMax）。
 * 结论：本环境常无 MINIMAX_API_KEY / INTEGRATIONS_API_KEY，阿初必须直连 Edge。
 * 文本建议 ≤60 字；超出由调用方截断。
 */
export async function speakInterviewerAloud(text: string): Promise<void> {
  const content = prepareSpeakContent(text);
  if (!content) return;

  const edge = edgeVoiceForInterviewer();
  // 与 teachers.INTERVIEWER_VOICE 对齐，便于以后单一数据源
  const voice = INTERVIEWER_VOICE.edgeVoice || edge.voice;
  const rate = INTERVIEWER_VOICE.rate || edge.rate;
  const pitch = INTERVIEWER_VOICE.pitch || edge.pitch;
  const key = `interviewer::edge::${voice}::${rate}::${pitch}::${content}`;
  if (cachedUrl && cachedKey === key) {
    seq += 1;
    await playCachedUrl(cachedUrl, seq);
    return;
  }

  seq += 1;
  const mySeq = seq;
  clearPlayWait();
  detachAudio();
  revokeCache();
  status = 'loading';
  emitSpeak();

  try {
    console.info('[tts] interviewer → Edge only', INTERVIEWER_VOICE.label, voice, rate, pitch);
    const blob = await postSchoolTts({
      text: toEdgePlainWithBreaks(content),
      voice,
      rate,
      pitch,
      engine: 'edge',
    });
    if (mySeq !== seq) return;
    const url = URL.createObjectURL(blob);
    cachedUrl = url;
    cachedKey = key;
    await playCachedUrl(url, mySeq);
  } catch (e) {
    if (mySeq === seq) {
      status = 'idle';
      emitSpeak();
    }
    const msg = e instanceof Error ? e.message : '朗读失败';
    console.error('[tts] interviewer Edge failed:', msg);
    toast.message(`阿初没出声：${msg.slice(0, 80)}`);
    throw e;
  }
}
