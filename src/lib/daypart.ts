/** 按时段生成问候，避免晚上说「早上好」 */

export type Daypart = 'morning' | 'noon' | 'afternoon' | 'evening' | 'late';

export function getDaypart(now = new Date()): Daypart {
  const h = now.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 14) return 'noon';
  if (h >= 14 && h < 18) return 'afternoon';
  if (h >= 18 && h < 22) return 'evening';
  return 'late';
}

export function daypartGreeting(part: Daypart = getDaypart()): string {
  switch (part) {
    case 'morning':
      return '早上好';
    case 'noon':
      return '中午好';
    case 'afternoon':
      return '下午好';
    case 'evening':
      return '晚上好';
    case 'late':
      return '夜深了';
  }
}

export function daypartSessionName(part: Daypart = getDaypart()): string {
  switch (part) {
    case 'morning':
      return '校长晨会';
    case 'noon':
      return '校长午间寄语';
    case 'afternoon':
      return '校长午后寄语';
    case 'evening':
      return '校长晚间寄语';
    case 'late':
      return '校长夜间叮嘱';
  }
}

/** 给 LLM 的时段约束，禁止错用问候语 */
export function daypartPromptHint(part: Daypart = getDaypart()): string {
  const greet = daypartGreeting(part);
  const forbidden =
    part === 'morning'
      ? '不要说中午好、下午好、晚上好、夜深了。'
      : part === 'noon'
        ? '不要说早上好、下午好、晚上好、夜深了。'
        : part === 'afternoon'
          ? '不要说早上好、中午好、晚上好、夜深了。'
          : part === 'evening'
            ? '不要说早上好、中午好、下午好、夜深了。'
            : '不要说早上好、中午好、下午好；可用晚上好或夜深了。';
  return `当前时段：${daypartSessionName(part)}。开头必须用「${greet}」问候。${forbidden}不要出现与当前时间不符的问候。`;
}

export function fallbackBrief(name: string, part: Daypart = getDaypart(), formal = true): string {
  const greet = daypartGreeting(part);
  if (formal) {
    if (part === 'late') {
      return `${greet}，${name}同学。请注意休息，完成今日计划后早些入睡。`;
    }
    if (part === 'evening') {
      return `${greet}，${name}同学。请回顾今日所学，明日继续按计划推进。`;
    }
    return `${greet}，${name}同学。请认真完成今日学习任务，保持专注与自律。`;
  }
  if (part === 'late') {
    return `${greet}，${name}。学习也要注意休息，完成一件小事就很棒，早点睡哦。`;
  }
  if (part === 'evening') {
    return `${greet}，${name}！今天辛苦了，回顾一下收获，明天继续加油。`;
  }
  return `${greet}，${name}！今天也要勇敢走进教学楼，完成一件小事就很棒。`;
}
