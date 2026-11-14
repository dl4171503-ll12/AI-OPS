import { Solar, Lunar, LunarUtil } from 'lunar-javascript';
export const CULTURE_LIBRARY = 'lunar-javascript@1.7.7';
export type BirthInput = { displayName: string; gender: '' | 'male' | 'female'; calendar: 'solar' | 'lunar'; date: string; leapMonth: boolean; time: string; city: string; longitude: string; solarCorrection: boolean };
export type CultureProfile = { version: 1; input: BirthInput; solarDate: string; lunarDate: string; correctedTime?: string; hourUnknown: boolean; pillars: { label: string; values: string[] }[]; counts: Record<string, { min: number; max: number }>; weighted?: Record<string, number>; strength?: string; tenGods: { position: string; char: string; god: string }[]; cycles: { startAge: number; pair: string }[]; paragraphs: string[]; createdAt: string; libraryVersion: string };
const STEM: Record<string,string> = Object.fromEntries([...['甲乙:木','丙丁:火','戊己:土','庚辛:金','壬癸:水']].flatMap(x=>[...x.split(':')[0]].map(c=>[c,x.split(':')[1]])));
const BRANCH: Record<string,string> = Object.fromEntries(['寅卯:木','巳午:火','辰戌丑未:土','申酉:金','亥子:水'].flatMap(x=>[...x.split(':')[0]].map(c=>[c,x.split(':')[1]])));
export const ELEMENTS = ['木','火','土','金','水'];
const emptyCounts = () => Object.fromEntries(ELEMENTS.map(e=>[e,0])) as Record<string,number>;
export function convertBirthDate(date: string, calendar: 'solar'|'lunar', leapMonth = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('请填写完整的年、月、日');
  const [year,month,day] = date.split('-').map(Number);
  if (year < 1901 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) throw new Error('支持 1901—2100 年，请核对日期');
  if (calendar === 'solar') {
    const check = new Date(Date.UTC(year,month-1,day));
    if (check.getUTCMonth() !== month-1 || check.getUTCDate() !== day) throw new Error('公历日期不存在');
  }
  const solar = calendar === 'solar' ? Solar.fromYmdHms(year,month,day,12,0,0) : Lunar.fromYmdHms(year,leapMonth ? -month : month,day,12,0,0).getSolar();
  const lunar = solar.getLunar();
  if (calendar === 'lunar' && (lunar.getYear() !== year || lunar.getMonth() !== (leapMonth ? -month : month) || lunar.getDay() !== day)) throw new Error('农历日期或闰月不存在');
  return { solarDate: solar.toYmd(), lunarDate: lunar.toString() };
}
export function calculateCulture(input: BirthInput): CultureProfile {
  if (!input.displayName.trim()) throw new Error('请填写报告称谓');
  if (!['male','female'].includes(input.gender)) throw new Error('请选择排表使用的性别');
  if (input.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('出生时刻格式不正确');
  if (input.solarCorrection && (!input.time || !input.city.trim() || !input.longitude.trim() || !Number.isFinite(Number(input.longitude)) || Number(input.longitude)<-180 || Number(input.longitude)>180)) throw new Error('经度校正需要已知时刻、城市与 -180 到 180 之间的经度');
  const converted = convertBirthDate(input.date,input.calendar,input.leapMonth);
  const base = converted.solarDate.split('-').map(Number);
  const delta = input.solarCorrection ? (Number(input.longitude)-120)*4 : 0;
  const make = (time: string) => {
    const [h,m] = time.split(':').map(Number);
    const d = new Date(Date.UTC(base[0],base[1]-1,base[2],h,m) + delta*60000);
    const solar = Solar.fromYmdHms(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds());
    const chart = solar.getLunar().getEightChar(); chart.setSect(1); return { chart, solar };
  };
  // 未知时刻遍历日内关键区间，不把辅助计算时刻当成真实出生时刻。
  const charts = (input.time ? [input.time] : ['00:00','12:00','22:59','23:59']).map(make);
  const all = charts.map(({chart}) => [chart.getYear(),chart.getMonth(),chart.getDay(),...(input.time ? [chart.getTime()] : [])]);
  const pillars = ['年柱','月柱','日柱','时柱'].map((label,i)=>({label, values: [...new Set(all.map(a=>a[i]).filter(Boolean))]}));
  const distributions = all.map(pairs => { const c=emptyCounts();for(const pair of pairs){c[STEM[pair[0]]]++;c[BRANCH[pair[1]]]++;}return c; });
  const counts = Object.fromEntries(ELEMENTS.map(e=>[e,{min:Math.min(...distributions.map(d=>d[e])),max:Math.max(...distributions.map(d=>d[e]))}]));
  const tenGods: CultureProfile['tenGods']=[]; let weighted: Record<string,number>|undefined; let strength: string|undefined;
  if (input.time) {
    const pairs=all[0], day=pairs[2][0], elem=STEM[day]; weighted=emptyCounts();
    let support=0,total=0;
    const supportive=(e:string)=>e===elem||ELEMENTS[(ELEMENTS.indexOf(e)+1)%5]===elem;
    pairs.forEach((pair,i)=>{
      weighted![STEM[pair[0]]]++;
      const hidden=LunarUtil.ZHI_HIDE_GAN[pair[1]];
      hidden.forEach((s,j)=>weighted![STEM[s]] += [1,.5,.3][j]);
      if(i!==2){tenGods.push({position:pillars[i].label+'天干',char:pair[0],god:LunarUtil.SHI_SHEN[day+pair[0]]});total++;if(supportive(STEM[pair[0]]))support++;}
      tenGods.push({position:pillars[i].label+'地支（本气）',char:pair[1],god:LunarUtil.SHI_SHEN[day+hidden[0]]});
      const weight=i===1?3:1;total+=weight;if(supportive(BRANCH[pair[1]]))support+=weight;
    });
    weighted=Object.fromEntries(Object.entries(weighted).map(([e,n])=>[e,Number(n.toFixed(1))]));
    strength=support/total<.4?'生助与同类元素占比偏少':support/total>.6?'生助与同类元素占比偏多':'生助与同类元素占比居中';
  }
  const cycles = input.time ? charts[0].chart.getYun(input.gender==='male'?1:0,2).getDaYun(5).filter(d=>d.getIndex()>0).slice(0,4).map(d=>({startAge:d.getStartAge(),pair:d.getGanZhi()})) : [];
  const structure = input.time ? `四柱符号为 ${all[0].join('、')}。这些是传统历法的符号记录。` : '出生时刻未提供，时柱不详。日界在 23:00；可能变化的柱并列显示，不选定其中一个。';
  const distribution = ELEMENTS.map(e=>`${e} ${counts[e].min===counts[e].max?counts[e].min:`${counts[e].min}—${counts[e].max}`}`).join('、');
  return { version:1,input:{...input,displayName:input.displayName.trim()},...converted,correctedTime:input.time?charts[0].solar.toYmdHms():undefined,hourUnknown:!input.time,pillars,counts,weighted,strength,tenGods,cycles,paragraphs:[structure,`基础统计：${distribution}。${input.time?'合计八个字符。':'每种可能情况只统计六个字符，不含时柱；区间不是额外字符。'}`,'木、火、土、金、水在传统表达中分别与生长、明亮、承载、收敛、流动联系。这只是一种文化视角的说法。','这些符号不用于评价能力，不决定课程、成绩或未来；学习计划只依据实际任务证据与兴趣。'],createdAt:new Date().toISOString(),libraryVersion:CULTURE_LIBRARY };
}
export type CultureEnvelope={version:1;salt:string;iv:string;ciphertext:string};
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const encode=(b:Uint8Array)=>{let s='';for(const x of b)s+=String.fromCharCode(x);return btoa(s);};
async function derive(password:string,salt:Uint8Array<ArrayBuffer>) {
  if(password.length<12)throw new Error('独立归档口令至少 12 位');
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encryptCulture(profile:CultureProfile,password:string,studentId:string):Promise<CultureEnvelope>{
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));const key=await derive(password,salt);
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(studentId)},key,new TextEncoder().encode(JSON.stringify(profile)));
  return {version:1,salt:encode(salt),iv:encode(iv),ciphertext:encode(new Uint8Array(ciphertext))};
}
export async function decryptCulture(envelope:CultureEnvelope,password:string,studentId:string):Promise<CultureProfile>{
  if(envelope.version!==1)throw new Error('不支持的档案版本');
  const key=await derive(password,bytes(envelope.salt));const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(envelope.iv),additionalData:new TextEncoder().encode(studentId)},key,bytes(envelope.ciphertext));
  const profile=JSON.parse(new TextDecoder().decode(data)) as CultureProfile;if(profile.version!==1||!Array.isArray(profile.pillars))throw new Error('档案格式不正确');return profile;
}
export const cultureStorageKey=(studentId:string)=>`ops-culture-encrypted-v1:${studentId}`;
