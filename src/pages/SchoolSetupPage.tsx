import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useSchoolStore} from '@/store/school';
import {AvatarPicker} from '@/components/AvatarPicker';
import {PrimaryButton} from '@/components/ui';
import {GuardianLinkCard} from '@/components/GuardianConnection';
import {versionsForSubject} from '@/lib/textbook-map';
export default function SchoolSetupPage(){
 const s=useSchoolStore(),navigate=useNavigate();const [avatar,setAvatar]=useState(s.student!.avatar),[math,setMath]=useState(s.editionPrefs.math),[english,setEnglish]=useState(s.editionPrefs.english);
 return <main className="min-h-screen bg-slate-100 text-slate-800 px-4 py-8"><div className="max-w-3xl mx-auto space-y-5"><p className="text-xs text-slate-500">入学流程 · 测评已完成 / 03 学校配置 / 04 校园学习</p><header className="bg-teal-900 text-white rounded-3xl p-7"><h1 className="text-3xl font-bold">现在，配置你的学校。</h1><p className="text-sm mt-3 text-teal-100">40项测评已保存。完成头像和教材配置后，再正式进入校园。</p></header><section className="bg-white rounded-3xl p-6"><h2 className="font-bold text-lg">我的头像</h2><div className="mt-4"><AvatarPicker value={avatar} onChange={setAvatar}/></div></section><section className="bg-white rounded-3xl p-6"><h2 className="font-bold text-lg">教材版本</h2><p className="text-sm mt-3">语文 · 统编版</p>{[['math','数学',math,setMath],['english','英语',english,setEnglish]].map(([id,label,value,setter])=><label key={String(id)} className="block text-sm mt-4">{String(label)}<select className="block mt-2 w-full border rounded-xl p-3" value={String(value)} onChange={e=>(setter as (v:string)=>void)(e.target.value)}>{versionsForSubject(id as 'math'|'english',s.student!.gradeYear).map(o=><option key={o.version+'-'+o.stage} value={o.version}>{o.versionName}</option>)}</select></label>)}</section><GuardianLinkCard/><PrimaryButton className="w-full py-4" onClick={()=>{s.updateAvatar(avatar);s.setEditionPrefs({chinese:'TongBian',math,english});s.completeSchoolSetup();navigate('/',{replace:true});}}>保存配置，进入校园</PrimaryButton></div></main>;
}
