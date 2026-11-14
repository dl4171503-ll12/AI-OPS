import {CultureReport} from './CultureReport';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useSchoolStore } from '@/store/school';
import { PrimaryButton } from './ui';
import { calculateCulture, cultureStorageKey, decryptCulture, encryptCulture, ELEMENTS, type BirthInput, type CultureProfile } from '@/lib/culture';
const field='mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm';
export function CulturePanel({onReady}:{onReady?:(ready:boolean)=>void}={}){
  const student=useSchoolStore(s=>s.student)!;
  const enabled=useSchoolStore(s=>Boolean(s.parent.cultureEnabled));
  const [input,setInput]=useState<BirthInput>({displayName:student.name,gender:'',calendar:'solar',date:'',leapMonth:false,time:'',city:'',longitude:'',solarCorrection:false});
  const [profile,setProfile]=useState<CultureProfile|null>(null);const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [hasSaved,setHasSaved]=useState(()=>Boolean(localStorage.getItem(cultureStorageKey(student.id))));
  if(!enabled)return null;
  const set=(patch:Partial<BirthInput>)=>{setInput(p=>({...p,...patch}));setProfile(null);setError('');onReady?.(false);};
  return <section className="space-y-5" aria-label="文化对照栏">
    <div className="rounded-3xl bg-amber-50 border border-amber-200 p-5"><h2 className="text-xl font-bold">文化对照 · 传统历法符号</h2><p className="mt-2 text-sm leading-6">这是文化体验和自我认识的一个角度，不用于预测。与学习证据分别展示，彼此不解释，也不合并评分。全部计算在本机完成。</p><p className="text-xs mt-2 text-slate-600">当前采用北京时间（UTC+8）。若出生记录使用其他时区，请先换算为北京时间；经度校正不代替时区换算。</p></div>
    <div className="grid lg:grid-cols-[1fr_1fr] gap-5"><section className="rounded-3xl bg-white p-5"><h3 className="font-bold text-lg">填写已知信息</h3><p className="text-xs text-slate-500 mt-2">不清楚的时刻、地点可留空。未加密保存的输入不会写入浏览器存储。</p>
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <label className="text-sm">报告称谓<input aria-label="报告称谓" className={field} value={input.displayName} onChange={e=>set({displayName:e.target.value})}/></label>
        <label className="text-sm">排表使用的性别<select className={field} value={input.gender} onChange={e=>set({gender:e.target.value as BirthInput['gender']})}><option value="">请选择</option><option value="male">男</option><option value="female">女</option></select><span className="text-xs text-slate-500">仅用于传统排列方向</span></label>
        <label className="text-sm">录入历法<select className={field} value={input.calendar} onChange={e=>set({calendar:e.target.value as BirthInput['calendar'],leapMonth:false})}><option value="solar">公历</option><option value="lunar">农历</option></select></label>
        <label className="text-sm">出生日期<input aria-label="出生日期" placeholder="YYYY-MM-DD" className={field} value={input.date} onChange={e=>set({date:e.target.value})}/>{input.calendar==='lunar'&&<span className="block mt-2"><input type="checkbox" checked={input.leapMonth} onChange={e=>set({leapMonth:e.target.checked})}/> 是闰月</span>}</label>
        <label className="text-sm">出生时刻（不知道就留空）<input aria-label="出生时刻" type="time" className={field} value={input.time} onChange={e=>set({time:e.target.value,solarCorrection:e.target.value?input.solarCorrection:false})}/></label>
        <label className="text-sm">出生城市（可不填）<input className={field} value={input.city} onChange={e=>set({city:e.target.value})}/></label>
      </div>
      <label className="block text-sm mt-4"><input type="checkbox" checked={input.solarCorrection} onChange={e=>set({solarCorrection:e.target.checked})}/> 开启太阳时简化校正（仅经度）</label>
      {input.solarCorrection&&<label className="block text-sm mt-3">经度（东经为正、西经为负）<input type="number" aria-label="出生地经度" min="-180" max="180" step="0.0001" className={field} value={input.longitude} onChange={e=>set({longitude:e.target.value})}/><span className="text-xs text-slate-500">请填已核实的经度；不会根据城市名称猜测。</span></label>}
      <PrimaryButton className="mt-5" onClick={()=>{try{setProfile(calculateCulture(input));setError('');onReady?.(true);}catch(e){setProfile(null);setError(e instanceof Error?e.message:'请核对输入');}}}>本地生成文化报告</PrimaryButton>
      {error&&<p role="alert" className="mt-3 text-sm text-amber-800">{error}</p>}
    </section>
    <section className="rounded-3xl bg-white p-5"><h3 className="font-bold text-lg">私密档案</h3><p className="text-sm text-slate-600 my-3">查看报告不必保存。需要保留时，设置至少 12 位独立口令；下次输入同一口令才能解锁。遗失口令无法恢复。</p><label className="text-sm">独立加密口令<input aria-label="文化档案口令" type="password" autoComplete="new-password" className={field} value={password} onChange={e=>setPassword(e.target.value)}/></label><div className="flex flex-wrap gap-3 mt-4"><PrimaryButton disabled={busy||!profile||password.length<12} onClick={async()=>{if(!profile)return;setBusy(true);try{const encrypted=await encryptCulture(profile,password,student.id);localStorage.setItem(cultureStorageKey(student.id),JSON.stringify(encrypted));setHasSaved(true);setPassword('');toast.success('已加密保存到本机');}catch{toast.error('保存失败，请检查存储空间');}finally{setBusy(false);}}}>加密保存</PrimaryButton>{hasSaved&&<button className="text-sm underline" onClick={()=>{const encrypted=localStorage.getItem(cultureStorageKey(student.id));if(!encrypted)return;const url=URL.createObjectURL(new Blob([encrypted],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='文化档案.ops.enc.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>导出加密档案供监护人查看</button>}{hasSaved&&<PrimaryButton disabled={busy||password.length<12} onClick={async()=>{setBusy(true);try{const p=await decryptCulture(JSON.parse(localStorage.getItem(cultureStorageKey(student.id))||''),password,student.id);setProfile(p);onReady?.(true);setInput(p.input);setPassword('');setError('');}catch{setError('无法解锁，请检查口令和档案是否完整。');}finally{setBusy(false);}}}>解锁已有报告</PrimaryButton>}</div><p className="text-xs text-slate-500 mt-3">{hasSaved?'本机已有一份密文档案。':'尚未保存文化档案。'} 口令不被存储，也不发送到服务器。</p><p className="mt-5 text-xs text-slate-500">此模块由监护人在独立家长端授权或关闭。</p></section></div>
    {profile&&<CultureReport profile={profile}/>}
  </section>;
}
