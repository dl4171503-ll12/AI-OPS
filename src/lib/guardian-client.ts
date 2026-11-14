import {supabase} from './supabase';
import {useSchoolStore} from '@/store/school';
import {DEFAULT_GUARDIAN_CONTROL,type GuardianControl,type LearningSnapshot} from './guardian-contract';
export async function studentGuardianRequest(action:string,body:unknown={}){
 const {data}=await supabase.auth.getSession();if(!data.session?.access_token)throw Error('请使用已验证的手机号登录后连接监护人');
 const response=await fetch('/api/student-link/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-OPS-Guardian':'1',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'监护服务暂时不可用');return result;
}
export function learningSnapshot():LearningSnapshot{
 const s=useSchoolStore.getState(),student=s.student!;
 return {studentId:student.id,name:student.name,gradeYear:student.gradeYear||3,admission:s.admission!,plans:s.plans,practices:s.practices.map(p=>({createdAt:p.createdAt,subject:p.subject,knowledge:p.knowledge,correct:p.correct})),mastery:Object.values(s.assessments).filter(Boolean).map(a=>({label:a!.subject,score:a!.score||0})),badges:student.badges,studyDays:student.studyDays,wrongBook:s.wrongBook.map(w=>({subject:w.subject,knowledge:w.knowledge,question:w.question,userAnswer:w.userAnswer})),initialControl:{...DEFAULT_GUARDIAN_CONTROL,cultureEnabled:Boolean(s.parent.cultureEnabled),allowSocial:s.parent.allowSocial,socialView:s.parent.socialView,teacherTone:s.parent.teacherTone||'balanced',encourageMsg:s.parent.encourageMsg||'',cloudHistory:Boolean(s.ops.cloudHistory),sound:s.ops.sound,showStreak:s.ops.showStreak,editionPrefs:s.editionPrefs,daySchedule:s.daySchedule,studyTimePlan:s.studyTimePlan}};
}
// 学生端只缓存生效配置，不承载家长登录、密码或编辑页面。
export function applyGuardianControl(c:GuardianControl){const s=useSchoolStore.getState();s.setParent({cultureEnabled:c.cultureEnabled,allowSocial:c.allowSocial,socialView:c.socialView,teacherTone:c.teacherTone,encourageMsg:c.encourageMsg});if(c.editionPrefs)s.setEditionPrefs(c.editionPrefs);if(c.daySchedule)s.setDaySchedule(c.daySchedule);if(c.studyTimePlan)s.setStudyTimePlan(c.studyTimePlan);useSchoolStore.setState({ops:{...useSchoolStore.getState().ops,cloudHistory:c.cloudHistory,sound:c.sound,showStreak:c.showStreak}});}
