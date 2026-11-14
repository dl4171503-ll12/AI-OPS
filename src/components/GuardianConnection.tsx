import {admissionComplete} from '@/lib/admission-stage';
import {useEffect,useState} from 'react';
import {useSchoolStore} from '@/store/school';
import {applyGuardianControl,learningSnapshot,studentGuardianRequest} from '@/lib/guardian-client';
import {timePolicy,chinaDate,type GuardianControl} from '@/lib/guardian-contract';
import {getStoredPhone} from '@/lib/phone-auth';
import {Link} from 'react-router-dom';
export function GuardianLinkCard(){
 const [code,setCode]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 return <section className="rounded-3xl bg-white p-5 mb-4 border border-slate-200"><h3 className="font-bold">连接我的监护人</h3><p className="text-sm text-slate-600 mt-2">在监护人陪同下生成一次性绑定码，交给监护人在独立家长端填写。绑定码10分钟有效，使用一次即失效。</p><p className="text-xs text-slate-500 mt-2">需要已验证的学生手机号。邮箱账号可先在登录页验证手机号；不会把登录凭证交给监护人。</p><button className="mt-4 rounded-xl px-4 py-3 bg-teal-800 text-white text-sm disabled:opacity-50" disabled={busy} onClick={async()=>{setBusy(true);try{await studentGuardianRequest('sync',{snapshot:learningSnapshot(),active:false});const r=await studentGuardianRequest('code');setCode(r.code);setMessage('有效至 '+new Date(r.expiresAt).toLocaleTimeString());}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}>生成监护绑定码</button>{code&&<p className="mt-4 font-mono text-xl tracking-widest" aria-label="监护绑定码">{code}</p>}{message&&<p role="status" className="text-sm mt-3">{message}</p>}</section>;
}
export function GuardianCampusBoundary({children}:{children:React.ReactNode}){
 const studentId=useSchoolStore(s=>s.student?.id);
 const cacheKey='ops-guardian-policy:'+studentId;
 const [policy,setPolicy]=useState<{control:GuardianControl;seconds:number;date:string}|null>(()=>{try{return JSON.parse(localStorage.getItem(cacheKey)||'null');}catch{return null;}});
 const [status,setStatus]=useState(''),[now,setNow]=useState(Date.now());
 const blocked=policy?timePolicy(policy.control,policy.date===chinaDate()?policy.seconds:0,new Date(now)):'';
 useEffect(()=>{let live=true,busy=false;const sync=async()=>{if(busy)return;busy=true;try{const r=await studentGuardianRequest('sync',{snapshot:learningSnapshot(),active:document.visibilityState==='visible'&&!blocked});if(live){let cached;try{cached=JSON.parse(localStorage.getItem(cacheKey)||'null');}catch{}const p={control:r.control,seconds:Math.max(r.seconds,cached?.date===chinaDate()?cached.seconds:0),date:chinaDate()};setPolicy(p);localStorage.setItem(cacheKey,JSON.stringify(p));applyGuardianControl(r.control);setStatus('');}}catch{if(live&&getStoredPhone())setStatus('监护服务暂未连接，已保留上次生效的设置');}finally{busy=false;}};void sync();const timer=setInterval(()=>{setNow(Date.now());if(document.visibilityState==='visible'&&!blocked)setPolicy(p=>{if(!p)return p;const next={...p,date:chinaDate(),seconds:(p.date===chinaDate()?p.seconds:0)+15};localStorage.setItem(cacheKey,JSON.stringify(next));return next;});void sync();},15000);window.addEventListener('online',sync);document.addEventListener('visibilitychange',sync);return()=>{live=false;clearInterval(timer);window.removeEventListener('online',sync);document.removeEventListener('visibilitychange',sync);};},[studentId,blocked]);
 if(blocked)return <main className="min-h-screen bg-slate-100 p-8 flex items-center justify-center"><section className="max-w-lg rounded-3xl bg-white p-8"><h1 className="text-2xl font-bold">本次校园学习已暂停</h1><p className="mt-4">{blocked}。</p><p className="text-sm text-slate-500 mt-3">已有学习记录保留。请与监护人商量调整安排，页面会自动检查更新。</p><Link to="/assessment" className="block underline mt-5">查看已完成的入学报告</Link>{status&&<p className="text-xs mt-3">{status}</p>}</section></main>;
 return <>{status&&<p className="bg-amber-50 px-4 py-2 text-xs text-amber-900" role="status">{status}</p>}{children}</>;
}

export function GuardianPolicyRefresh(){
 const studentId=useSchoolStore(s=>s.student?.id),done=useSchoolStore(s=>admissionComplete(s.admission));
 useEffect(()=>{if(!studentId||!done)return;let active=true;const refresh=async()=>{try{const r=await studentGuardianRequest('status');if(active)applyGuardianControl(r.control);}catch{/* 未绑定或尚未同步时不打断测评 */}};void refresh();const timer=setInterval(refresh,15000);return()=>{active=false;clearInterval(timer);};},[studentId,done]);
 return null;
}
