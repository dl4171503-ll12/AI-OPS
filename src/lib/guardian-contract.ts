import type { AdmissionState } from './admission';
import type { DailyPlan, DayScheduleRow, StudyTimePlan, SubjectId, TextbookEditionPrefs } from './types';
export type GuardianControl={cultureEnabled:boolean;enableTimeLimit:boolean;dailyLimitMinutes:number;enableWindow:boolean;allowedStart:string;allowedEnd:string;allowSocial:boolean;socialView:'full'|'summary';teacherTone:'formal'|'balanced'|'cute';encourageMsg:string;cloudHistory:boolean;sound:boolean;showStreak:boolean;editionPrefs?:TextbookEditionPrefs;daySchedule?:DayScheduleRow[];studyTimePlan?:StudyTimePlan};
export const DEFAULT_GUARDIAN_CONTROL:GuardianControl={cultureEnabled:false,enableTimeLimit:false,dailyLimitMinutes:120,enableWindow:false,allowedStart:'07:00',allowedEnd:'21:00',allowSocial:true,socialView:'summary',teacherTone:'balanced',encourageMsg:'',cloudHistory:false,sound:true,showStreak:true};
export type LearningSnapshot={studentId:string;name:string;gradeYear:number;admission:AdmissionState;plans:Partial<Record<SubjectId,DailyPlan>>;practices:{createdAt:string;subject:string;knowledge:string;correct:boolean}[];mastery:{label:string;score:number}[];badges:string[];studyDays:number;wrongBook:{subject:string;knowledge:string;question:string;userAnswer:string}[];initialControl?:Partial<GuardianControl>};
export type GuardianView={guardian:{username:string};binding:null|{id:string;studentPhone:string;relation:string;createdAt:string};snapshot?:LearningSnapshot;control?:GuardianControl;usage?:Record<string,number>;syncedAt?:string};
export function timePolicy(control:GuardianControl,seconds:number,date=new Date()){
 const hm=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
 const inWindow=control.allowedStart<=control.allowedEnd?hm>=control.allowedStart&&hm<control.allowedEnd:hm>=control.allowedStart||hm<control.allowedEnd;
 return control.enableTimeLimit&&seconds>=control.dailyLimitMinutes*60?'今天的学习时长已达到监护人设置的上限':control.enableWindow&&!inWindow?'当前不在监护人设置的可用时段内':'';
}
export function chinaDate(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
