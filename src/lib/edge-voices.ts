import type { SubjectId, TeacherTone } from './types';

/** Edge TTS 声线：偏亲切、人声感（柔和语速/音调，避免生硬播报感） */
export type EdgeVoiceProfile = {
  voice: string;
  rate: string;
  pitch: string;
  label: string;
};

/**
 * 按角色挂声线（男角色不许女声、女角色不许男声；互相能区分）。
 * pitch 红线：-3Hz ~ +3Hz；rate 红线：-14% ~ +4%。
 *
 * 说明：本环境常无 MINIMAX_API_KEY / INTEGRATIONS_API_KEY，学科朗读实际多走 Edge。
 * 因此 Edge 参数必须按角色对齐；不要指望 MiniMax 超真人掩盖参数问题。
 */
const SUBJECT_EDGE: Record<
  SubjectId,
  { voice: string; rate: string; pitch: string; label: string; enVoice?: string }
> = {
  math: {
    voice: 'zh-CN-XiaoyiNeural',
    rate: '-2%',
    pitch: '+0Hz',
    label: '小数老师 · 理性清晰女声',
  },
  chinese: {
    voice: 'zh-CN-XiaoxiaoNeural',
    rate: '-6%',
    pitch: '+1Hz',
    label: '小语老师 · 温润女声',
  },
  english: {
    voice: 'zh-CN-XiaoxiaoNeural',
    rate: '-2%',
    pitch: '+2Hz',
    label: '小英老师 · 明快女声',
    enVoice: 'en-US-JennyNeural',
  },
  art: {
    voice: 'zh-CN-XiaoxiaoNeural',
    rate: '-8%',
    pitch: '+0Hz',
    label: '小艺老师 · 柔和慢女声',
  },
  science: {
    voice: 'zh-CN-YunyangNeural',
    rate: '-4%',
    pitch: '-2Hz',
    label: '阿科老师 · 稳重男声',
  },
  pe: {
    voice: 'zh-CN-YunxiNeural',
    rate: '+4%',
    pitch: '-3Hz',
    label: '阿健老师 · 爽朗男声',
  },
  ai: {
    voice: 'zh-CN-XiaoxiaoNeural',
    rate: '+2%',
    pitch: '+3Hz',
    label: '小智老师 · 清亮女声',
  },
};

function mostlyEnglish(sample?: string): boolean {
  const t = String(sample || '');
  if (!t.trim()) return true;
  const en = (t.match(/[A-Za-z]/g) || []).length;
  const zh = (t.match(/[\u4e00-\u9fff]/g) || []).length;
  return en > zh;
}

/**
 * 自动匹配更适合当前角色的亲切声线。
 * opts.sampleText：英语老师中英切换时用于判断用 Jenny 还是晓晓。
 */
export function edgeVoiceForSpeak(opts: {
  role: 'teacher' | 'principal' | 'counselor' | 'guide' | 'interviewer';
  subject?: SubjectId | string;
  tone?: TeacherTone | null;
  sampleText?: string;
}): EdgeVoiceProfile {
  const role = opts.role;
  const subject = opts.subject as SubjectId | undefined;

  if (role === 'interviewer') {
    return edgeVoiceForInterviewer();
  }

  if (role === 'principal') {
    return {
      voice: 'zh-CN-XiaoyiNeural',
      rate: '-14%',
      pitch: '-3Hz',
      label: '校长 · 沉稳智慧女声',
    };
  }

  if (role === 'counselor' || role === 'guide') {
    return {
      voice: 'zh-CN-XiaoxiaoNeural',
      rate: '-4%',
      pitch: '+2Hz',
      label: '心理/向导 · 温柔女声',
    };
  }

  if (role === 'teacher' && subject && SUBJECT_EDGE[subject]) {
    const base = SUBJECT_EDGE[subject]!;
    if (subject === 'english' && mostlyEnglish(opts.sampleText) && base.enVoice) {
      return {
        voice: base.enVoice,
        rate: base.rate,
        pitch: base.pitch,
        label: '小英老师 · 外教女声',
      };
    }
    return {
      voice: base.voice,
      rate: base.rate,
      pitch: base.pitch,
      label: base.label,
    };
  }

  // 未知学科：女声兜底（不用男声）
  void opts.tone;
  return {
    voice: 'zh-CN-XiaoxiaoNeural',
    rate: '-3%',
    pitch: '+1Hz',
    label: '温柔女声 · 亲切',
  };
}

/** 入校面谈「阿初老师」：比别处老师更慢、更软（妈妈感），固定走 Edge 女声 */
export function edgeVoiceForInterviewer(): EdgeVoiceProfile {
  return {
    voice: 'zh-CN-XiaoxiaoNeural',
    rate: '-8%',
    pitch: '-1Hz',
    label: '阿初 · 入校面谈温柔女声',
  };
}
