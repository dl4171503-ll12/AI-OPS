export type ModerationResult = {
  risk: 'none' | 'low' | 'mid' | 'high';
  blocked: boolean;
  note: string;
  cleaned: string;
};

const PII =
  /(手机号|微信号|微信|QQ号|身份证|家庭住址|我家在|加我|电话[:：]?\s*\d{6,}|1[3-9]\d{9}|\b\d{11}\b)/i;
const ABUSE = /(傻逼|去死|滚|混蛋|白痴|智障|打死|欺凌|侮辱)/i;
const NSFW = /(色情|约炮|裸体|性爱|黄片)/i;

/** 本地规则审核（儿童社交防火墙） */
export function moderateSocialText(text: string, ageBand: 'low' | 'mid' | 'high'): ModerationResult {
  const cleaned = text.trim();
  if (!cleaned) return { risk: 'none', blocked: false, note: '', cleaned };

  if (NSFW.test(cleaned) || /自杀|自残|血腥暴力/.test(cleaned)) {
    return {
      risk: 'high',
      blocked: true,
      note: '重度风险：不当或危险内容，已拦截并应通知家长。',
      cleaned,
    };
  }
  if (PII.test(cleaned)) {
    return {
      risk: 'mid',
      blocked: true,
      note: '中度风险：疑似泄露个人信息，消息已拦截。',
      cleaned,
    };
  }
  if (ABUSE.test(cleaned)) {
    return {
      risk: ageBand === 'low' ? 'mid' : 'low',
      blocked: ageBand === 'low',
      note: ageBand === 'low' ? '中度风险：不友善用语已拦截。' : '轻度提醒：请用更友善的表达。',
      cleaned,
    };
  }
  return { risk: 'none', blocked: false, note: '', cleaned };
}
