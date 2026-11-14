/**
 * 朗读文本预处理：
 * - 去掉不应出声的符号
 * - 标点不朗读，转为停顿标记（内部 <#秒#>，提交 Edge 前再转换）
 */

/** 保护后的停顿标记 */
const PAUSE_RE = /<#\d+(?:\.\d+)?#>/g;

/**
 * 将内部停顿标记转为 Edge TTS 可感知的停顿（省略号 / 空白），避免念出标记本身。
 */
export function toEdgePlainWithBreaks(text: string): string {
  // 用轻量空白/顿号代替一串省略号，避免「…… ……」连发拖腔
  return String(text || '')
    .replace(PAUSE_RE, (m) => {
      const sec = Number(m.slice(2, -2)) || 0.1;
      if (sec >= 0.24) return '。 ';
      if (sec >= 0.14) return '，';
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 将标点转为语气停顿，绝不把标点本身交给 TTS 去「念」出来。
 */
export function prepareSpeechText(raw: string): string {
  let t = String(raw || '');

  // 去代码块 / markdown 链接图片
  t = t
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~|-]{2,}/g, ' ');

  // 去表情
  t = t
    .replace(/\p{Extended_Pictographic}/gu, ' ')
    .replace(/\p{Emoji_Presentation}/gu, ' ')
    .replace(/[\uFE0F\u200D]/g, '');

  // 标点 → 短停顿（单段 ≤0.32s）；连发省略号会拖得很怪
  t = t
    .replace(/[。！？!?]+/g, '<#0.28#>')
    .replace(/[；;]+/g, '<#0.18#>')
    .replace(/[，、,]+/g, '<#0.1#>')
    .replace(/[：:]+/g, '<#0.1#>')
    .replace(/[…‥]+/g, '<#0.2#>')
    .replace(/[—–-]{1,}/g, '<#0.08#>');

  // 保护停顿标记，清除其余标点/装饰符
  const pauses: string[] = [];
  t = t.replace(PAUSE_RE, (m) => {
    pauses.push(m);
    return `\u0001${pauses.length - 1}\u0001`;
  });

  t = t
    .replace(/["""'「」『』《》〈〉【】（）()\[\]{}]/g, ' ')
    .replace(/[~\\|/*^=<>@$%&_+`#]+/g, ' ')
    .replace(/[·•※★☆◆◇■□●○♪♫]/g, ' ')
    // 只保留中文、字母、数字、空白与停顿占位
    .replace(/[^\u4e00-\u9fffA-Za-z0-9\u0001.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  t = t.replace(/\u0001(\d+)\u0001/g, (_, i) => pauses[Number(i)] || ' ');

  // 相邻停顿合并成一个，最多 0.32 秒
  t = t.replace(/(<#\d+(?:\.\d+)?#>\s*){2,}/g, (m) => {
    const nums = [...m.matchAll(/<#(\d+(?:\.\d+)?)#>/g)].map((x) => Number(x[1]));
    const sum = Math.min(0.32, nums.reduce((a, b) => a + b, 0));
    return `<#${sum.toFixed(2)}#>`;
  });

  // 一句话里停顿别超过两处：保留前两处，其余去掉
  let pauseCount = 0;
  t = t.replace(/<#\d+(?:\.\d+)?#>/g, (m) => {
    pauseCount += 1;
    return pauseCount <= 2 ? m : ' ';
  });

  return t.slice(0, 2000).trim();
}

export function speechHasSpeakableContent(text: string): boolean {
  const core = text.replace(PAUSE_RE, '').replace(/\s+/g, '');
  return /[\u4e00-\u9fffA-Za-z0-9]/.test(core);
}
