/** 校长晨会：沉稳智慧女声（MiniMax / Edge），不使用 audio-1 克隆 */

import { speakPrincipalAloud, stopReadAloud } from './read-aloud';
import type { GradeKey } from './types';

export function stopMorningSpeak() {
  stopReadAloud();
}

/** 校长晨会：按时段寄语朗读 */
export async function speakMorningBrief(text: string, grade?: GradeKey): Promise<void> {
  await speakPrincipalAloud(text, grade);
}

export const PRINCIPAL_AGENT_SRC = '/characters/principal-agent.png';
