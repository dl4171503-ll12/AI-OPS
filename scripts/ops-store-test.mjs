import assert from 'node:assert/strict';
import { evaluate, close } from './ops-cdp.mjs';
try {
 const results=await evaluate(`(async()=>{
  const url=performance.getEntriesByType('resource').map(e=>e.name).filter(n=>new URL(n).pathname==='/src/store/school.ts').sort((a,b)=>Number(new URL(b).searchParams.get('t')||0)-Number(new URL(a).searchParams.get('t')||0))[0];
  const s=(await import(url||'/src/store/school.ts')).useSchoolStore; const saved=s.getState();const out=[];
  const day=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  try{
    s.setState({ops:{...saved.ops,streak:8,lastActive:day(-2),freezes:2,brokenStreak:undefined}});s.getState().bumpStudyDay();out.push(['断一天自动冻结',s.getState().ops.streak===8&&s.getState().ops.freezes===1]);
    s.setState({ops:{...saved.ops,streak:8,lastActive:day(-2),freezes:0,brokenStreak:undefined}});s.getState().bumpStudyDay();out.push(['无冻结时建立可恢复记录',s.getState().ops.streak===1&&s.getState().ops.brokenStreak.value===8]);
    out.push(['每月一次免费恢复',s.getState().repairStreak()&&s.getState().ops.streak===9&&s.getState().ops.repairs===0]);out.push(['恢复不可重复领取',!s.getState().repairStreak()]);
    s.setState({ops:{...saved.ops,awards:[],xpTotal:20},student:{...saved.student,points:20}});s.getState().awardXp('threshold','math',100,'test');out.push(['单科周档位自动发放',s.getState().ops.xpTotal===170]);s.getState().awardXp('after-threshold','math',1,'test');out.push(['周奖励只发一次',s.getState().ops.xpTotal===171]);
    const total=s.getState().ops.xpTotal;out.push(['保护消费只减少余额',s.getState().buyStreakFreeze()&&s.getState().ops.xpTotal===total&&s.getState().student.points===21]);
    return out;
  }finally{s.setState(saved);}
 })()`);
 for(const [label,passed] of results){assert.ok(passed,label);console.log('PASS',label);}
}finally{close();}
