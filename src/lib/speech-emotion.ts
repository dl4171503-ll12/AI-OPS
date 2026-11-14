import type { SubjectId, TeacherTone } from './types';

export type SpeechEmotion = 'happy' | 'calm' | 'surprised' | 'fluent';

export type VoiceModify = {
  pitch: number;
  intensity: number;
  timbre: number;
};

export type TeacherVoiceProfile = {
  /** MiniMax 系统音色（超真人 HD） */
  voice_id: string;
  emotion: SpeechEmotion;
  voice_modify: VoiceModify;
  label: string;
  /** 是否优先用 audio-1 克隆（仅老师可选；校长不用，避免怪异音色） */
  preferClone?: boolean;
  model?: 'speech-02-hd' | 'speech-02-turbo';
  /** 语速，校长略慢更稳重 */
  speed?: number;
};

/**
 * 老师朗读音色（MiniMax 超真人）：
 * - 可爱：female-shaonv + happy
 * - 正式：female-yujie + calm
 * - 自然：female-shaonv + happy
 * - 科学/体育男老师：male-qn-qingse
 * - 英语：Ethan
 * - 校长：沉稳智慧女声（约 45 岁女校长），不克隆 audio-1
 */
export function voiceProfileForTeacherTone(tone?: TeacherTone | null): TeacherVoiceProfile {
  if (tone === 'formal') {
    return {
      voice_id: 'female-yujie',
      emotion: 'calm',
      voice_modify: { pitch: 2, intensity: -10, timbre: 8 },
      label: '正式稳重 · 御姐温柔',
      model: 'speech-02-hd',
    };
  }
  if (tone === 'cute') {
    return {
      voice_id: 'female-shaonv',
      emotion: 'happy',
      voice_modify: { pitch: 12, intensity: -20, timbre: 28 },
      label: '可可爱爱 · 少女温柔',
      model: 'speech-02-hd',
    };
  }
  return {
    voice_id: 'female-shaonv',
    emotion: 'happy',
    voice_modify: { pitch: 6, intensity: -16, timbre: 18 },
    label: '自然亲切 · 温柔女声',
    model: 'speech-02-hd',
  };
}

export function voiceProfileForSpeak(opts: {
  role: 'teacher' | 'principal' | 'counselor' | 'guide';
  subject?: SubjectId | string;
  tone?: TeacherTone | null;
}): TeacherVoiceProfile {
  const tone = opts.tone ?? readTeacherToneFromStorage();
  const { role, subject } = opts;

  if (role === 'teacher' && subject === 'english') {
    if (tone === 'formal') {
      return {
        voice_id: 'Ethan',
        emotion: 'calm',
        voice_modify: { pitch: 0, intensity: -8, timbre: 6 },
        label: '外教男声 · 稳重',
        model: 'speech-02-hd',
      };
    }
    if (tone === 'cute') {
      return {
        voice_id: 'Ethan',
        emotion: 'happy',
        voice_modify: { pitch: 4, intensity: -12, timbre: 14 },
        label: '外教男声 · 活泼',
        model: 'speech-02-hd',
      };
    }
    return {
      voice_id: 'Ethan',
      emotion: 'happy',
      voice_modify: { pitch: 2, intensity: -10, timbre: 10 },
      label: '外教男声 · 亲切',
      model: 'speech-02-hd',
    };
  }

  if (role === 'teacher' && (subject === 'science' || subject === 'pe')) {
    if (tone === 'formal') {
      return {
        voice_id: 'male-qn-jingying',
        emotion: 'calm',
        voice_modify: { pitch: -2, intensity: -8, timbre: 4 },
        label: '温和男声 · 稳重',
        model: 'speech-02-hd',
      };
    }
    if (tone === 'cute') {
      return {
        voice_id: 'male-qn-qingse',
        emotion: 'happy',
        voice_modify: { pitch: 4, intensity: -14, timbre: 16 },
        label: '温和男声 · 亲切',
        model: 'speech-02-hd',
      };
    }
    return {
      voice_id: 'male-qn-qingse',
      emotion: 'happy',
      voice_modify: { pitch: 0, intensity: -12, timbre: 10 },
      label: '温和男声 · 自然',
      model: 'speech-02-hd',
    };
  }

  if (role === 'principal') {
    // 女校长：御姐/沉稳女声 + 略降速，绝不用男声
    return {
      voice_id: 'female-yujie',
      emotion: 'calm',
      voice_modify: { pitch: -6, intensity: -18, timbre: 4 },
      label: '女校长 · 沉稳智慧',
      model: 'speech-02-hd',
      preferClone: false,
      speed: 0.9,
    };
  }

  if (role === 'counselor' || role === 'guide') {
    if (tone === 'formal') {
      return {
        voice_id: 'female-yujie',
        emotion: 'calm',
        voice_modify: { pitch: 0, intensity: -18, timbre: 10 },
        label: '心理/向导 · 稳重温柔',
        model: 'speech-02-hd',
      };
    }
    return {
      voice_id: 'female-shaonv',
      emotion: 'happy',
      voice_modify: { pitch: 4, intensity: -20, timbre: 20 },
      label: '心理/向导 · 温柔',
      model: 'speech-02-hd',
    };
  }

  return voiceProfileForTeacherTone(tone);
}

/** @deprecated 使用 voiceProfileForTeacherTone */
export function emotionForTeacherTone(tone?: TeacherTone | null) {
  const p = voiceProfileForTeacherTone(tone);
  return { emotion: p.emotion, voice_modify: p.voice_modify, voice_id: p.voice_id };
}

/** 从本地持久化读取家长语气 */
export function readTeacherToneFromStorage(): TeacherTone {
  try {
    const raw = localStorage.getItem('ai-one-person-school-v1');
    if (!raw) return 'balanced';
    const parsed = JSON.parse(raw) as { state?: { parent?: { teacherTone?: TeacherTone } } };
    return parsed?.state?.parent?.teacherTone || 'balanced';
  } catch {
    return 'balanced';
  }
}
