import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {evaluate,navigate as rawNavigate,call,screenshot,close,errors} from './ops-cdp.mjs';
async function navigate(url){await rawNavigate(url);for(let i=0;i<60;i++){if(await evaluate('document.body.innerText.trim().length>20'))return;await new Promise(r=>setTimeout(r,150));}throw Error('page did not render');}
const results=[];const check=(x,label)=>{assert.ok(x,label);results.push(label);console.log('PASS',label);};
const pause=()=>new Promise(r=>setTimeout(r,100));
const storeExpr=`import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>new URL(n).pathname==='/src/store/school.ts').sort((a,b)=>Number(new URL(b).searchParams.get('t')||0)-Number(new URL(a).searchParams.get('t')||0))[0]||'/src/store/school.ts')`;
async function store(){await evaluate(`(async()=>{window.qaStore=(await ${storeExpr}).useSchoolStore;})()`);}
async function click(text){await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw Error('button unavailable '+${JSON.stringify(text)});b.click();})()`);await pause();}
async function fill(selector,value){await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('missing '+${JSON.stringify(selector)});const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);await pause();}
try{
 await call('Emulation.setDeviceMetricsOverride',{width:1280,height:950,deviceScaleFactor:1,mobile:false});
 await navigate('http://127.0.0.1:919/assessment');await store();
 await evaluate(`qaStore.getState().setParent({cultureEnabled:false});localStorage.removeItem('ops-admission-current:'+qaStore.getState().student.id);qaStore.getState().setAdmission({version:2,gradeYear:3,answers:{}});`);await pause();await click('开始 40 项测评');
 await evaluate(`(()=>{const s=qaStore.getState(),key='ops-admission-draft-v3:'+s.student.id+':'+s.admission.examId+':admission-v2-3-reflection-1';const d=JSON.parse(localStorage.getItem(key));d.strokes=Array.from({length:520},(_,i)=>({color:'#2563eb',width:2,at:new Date().toISOString(),points:[[i%790,i%350],[(i+20)%790,(i+30)%350]]}));localStorage.setItem(key,JSON.stringify(d));})()`);
 await navigate('http://127.0.0.1:919/assessment');await store();
 check((await evaluate('document.body.innerText')).includes('520 笔'),'520笔画可正常重绘');
 await click('撤销');check((await evaluate('document.body.innerText')).includes('519 笔'),'撤销移除最后一笔');
 await click('重做');check((await evaluate('document.body.innerText')).includes('520 笔'),'重做恢复笔画');
 await click('清空');check((await evaluate('document.body.innerText')).includes('0 笔'),'清空白板');
 await fill('[aria-label="画笔颜色"]','#dc2626');await click('橡皮擦');check((await evaluate('document.body.innerText')).includes('切回画笔'),'橡皮擦模式可切换');await click('切回画笔');
 const status=await evaluate(`fetch('/api/assessment-record',{method:'POST',headers:{'Content-Type':'application/json','X-Assessment-Record':'1'},body:JSON.stringify({examId:'../bad',gradeYear:3,answers:{},adjustments:[]})}).then(r=>r.status)`);check(status===400,'服务拒绝非法档案路径');
 check(await evaluate(`fetch('/api/assessment-record',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.status)`)===403,'服务拒绝缺少同源自定义头的请求');
 await new Promise(r=>setTimeout(r,500));check((await evaluate('document.body.innerText')).includes('已保存到本机服务'),'服务端实际保存并返回独立时间戳');
 await call('Network.enable');await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 await click('拆成更小一步');await fill('[aria-label="任务推理依据"]','先找困难步骤，然后用小任务检查。');await click('提交本题，进入下一题');
 check((await evaluate('document.body.innerText')).includes('第 2/40 项'),'断网仍可本地提交并进入下一题');
 await call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await evaluate(`window.dispatchEvent(new Event('online'))`);await new Promise(r=>setTimeout(r,600));
 check((await evaluate('document.body.innerText')).includes('已保存到本机服务'),'恢复网络后自动补存');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});check(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'手机答题和白板无横向溢出');
 await screenshot('D:/Desktop/app-cjxeruyihxxd/ai-school/docs/admission-v3-mobile-task.png');
 check(errors.length===0,'白板与断网测试无未捕获异常');
 await writeFile('docs/admission-v3-whiteboard-results.json',JSON.stringify({checks:results,errors},null,2));console.log(JSON.stringify({checks:results.length,errors}));
}finally{await call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1}).catch(()=>{});close();}
