declare module 'lunar-javascript' {
  export interface SolarDate { getLunar(): LunarDate; toYmd(): string; toYmdHms(): string; getYear(): number; getMonth(): number; getDay(): number; }
  export interface LunarDate { getSolar(): SolarDate; getEightChar(): EightChar; getYear(): number; getMonth(): number; getDay(): number; toString(): string; getJieQiTable(): Record<string, SolarDate>; }
  export interface EightChar { setSect(sect: number): void; getYear(): string; getMonth(): string; getDay(): string; getTime(): string; getYun(gender: number, sect?: number): { getDaYun(count?: number): Array<{ getIndex(): number; getGanZhi(): string; getStartAge(): number }> }; }
  export const Solar: { fromYmdHms(y: number,m: number,d: number,h: number,min: number,s: number): SolarDate };
  export const Lunar: { fromYmdHms(y: number,m: number,d: number,h: number,min: number,s: number): LunarDate };
  export const LunarUtil: { ZHI_HIDE_GAN: Record<string,string[]>; SHI_SHEN: Record<string,string> };
}
