import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { evaluate, navigate, call, screenshot, close, errors } from './ops-cdp.mjs';
const results=[];
const check=(condition,message)=>{assert.ok(condition,message);results.push(message);console.log('PASS',message);};
const pause=()=>new Promise(r=>setTimeout(r,150));
async function click(text){await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw Error('button unavailable: '+${JSON.stringify(text)});b.click();})()`);await pause();}
async function fill(selector,value){await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('missing input');const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);await pause();}
try {
 await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
 await navigate('http://127.0.0.1:919/onboarding');
 await evaluate(`(async()=>{localStorage.clear(); localStorage.setItem('ai-school-auth-email','ops-qa@example.test'); const {useSchoolStore:s}=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>new URL(n).pathname==='/src/store/school.ts').sort((a,b)=>Number(new URL(b).searchParams.get('t')||0)-Number(new URL(a).searchParams.get('t')||0))[0] || '/src/store/school.ts'); window.qaStore=s; s.getState().createSchool({name:'OPS 验证账号',avatar:'/avatars/avatar-tpl-01.png',gradeYear:3});s.getState().completePrincipalIntake();s.getState().setParentPassword('qa-parent-123');})()`);
 await navigate('http://127.0.0.1:919/ops');
 await evaluate(`(async()=>{window.qaStore=(await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>new URL(n).pathname==='/src/store/school.ts').sort((a,b)=>Number(new URL(b).searchParams.get('t')||0)-Number(new URL(a).searchParams.get('t')||0))[0] || '/src/store/school.ts')).useSchoolStore;})()`);
 check((await evaluate('document.body.innerText')).includes('我的单元路径'),'OPS 页面正常渲染');
 check(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('乘法与等量分组')).disabled`),'前置单元未掌握时锁定');
 await fill('[aria-label="我的答案"]','15');await fill('[aria-label="我是这样想的"]','把原来和新做的两组相加');
 await navigate('http://127.0.0.1:919/ops');
 check(await evaluate(`document.querySelector('[aria-label="我的答案"]').value==='15'`),'刷新后恢复练习草稿');
 await evaluate(`(async()=>{window.qaStore=(await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>new URL(n).pathname==='/src/store/school.ts').sort((a,b)=>Number(new URL(b).searchParams.get('t')||0)-Number(new URL(a).searchParams.get('t')||0))[0] || '/src/store/school.ts')).useSchoolStore;})()`);
 for(let i=0;i<5;i++){await fill('[aria-label="我的答案"]',String(15+i*2));await fill('[aria-label="我是这样想的"]','先确定原来数量，再加新增数量');await click('完成这一题'); if(i<4)await click('继续练习');}
 check((await evaluate('document.body.innerText')).includes('这一小关完成了'),'5 题触发关卡结算');
 check(!(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('乘法与等量分组')).disabled`)),'掌握度 100% 解锁下一单元');
 let data=await evaluate('({xp:qaStore.getState().ops.xpTotal,balance:qaStore.getState().student.points,records:qaStore.getState().practices,badges:qaStore.getState().student.badges})');
 check(data.xp===45&&data.balance===45&&data.records.length===5,'学习奖励与余额、分科记录一致');
 check(data.records.every(r=>r.reasoning&&r.durationMs>=0&&r.revisions.length&&r.masteryAfter!=null),'每题保存思路、用时、轨迹和掌握度');
 check(data.badges.length>=4,'第一轮获得三个学习成就');
 await evaluate(`qaStore.getState().awardXp('qa-idempotent','math',5,'测试');qaStore.getState().awardXp('qa-idempotent','math',5,'测试');qaStore.getState().unlockDecoration('qa-tree')`);
 check(await evaluate('qaStore.getState().ops.xpTotal===50&&qaStore.getState().student.points===20'),'同事件不重复奖励，消费只扣余额');
 await click('继续下一小关');
 for(let i=0;i<5;i++){await fill('[aria-label="我的答案"]','999');await fill('[aria-label="我是这样想的"]','还不确定，先试一个数');await click('完成这一题');if(i<4)await click('继续练习');}
 check(!(await evaluate('document.body.innerText')).includes('你答错了'),'连续答错五题保持温和文案');
 check(await evaluate('qaStore.getState().student.points===25&&qaStore.getState().wrongBook.length===5'),'答错不扣分且保留待验证错因');
 await click('实战素养');
 await evaluate(`qaStore.getState().updateOps(o=>({...o,projects:o.projects.map((p,i)=>i? p:{...p,answers:['同学','手抄，慢','一张学习卡','一次用户访谈','固定10元，可变2元','验证是否容易使用'],nextStep:'请一位用户体验'})}))`);await pause();
 await click('保存本次项目会');
 check(await evaluate(`qaStore.getState().ops.events[0].answers.length===6`),'六问项目会保留一页纸快照');
 await click('归档我的预算作品');
 check(await evaluate(`qaStore.getState().student.badges.includes('第一份预算表')`),'预算证据触发独立能力徽章');
 await new Promise(r=>setTimeout(r,4500));
 await screenshot('D:/Desktop/app-cjxeruyihxxd/ai-school/docs/ops-projects.png');
 await click('家长与归档');await fill('[aria-label="家长密码"]','qa-parent-123');await click('解锁');
 await fill('input[autocomplete="new-password"]','ops-qa-archive-passphrase');await click('启用并立即归档');
 for(let i=0;i<30;i++){if(await evaluate('Boolean(qaStore.getState().ops.archivedAt)'))break;await new Promise(r=>setTimeout(r,200));}
 check(await evaluate('Boolean(qaStore.getState().ops.archivedAt)'),'加密归档成功写入 D 盘');
 const id=await evaluate('qaStore.getState().student.id');const date=await evaluate(`import('/src/lib/ops.ts').then(m=>m.localDate())`);
 const envelope=JSON.parse(await readFile(`.ops-data/${id}/${date}/daily.ops.enc.json`,'utf8'));
 const material=await webcrypto.subtle.importKey('raw',new TextEncoder().encode('ops-qa-archive-passphrase'),'PBKDF2',false,['deriveKey']);
 const key=await webcrypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:Buffer.from(envelope.salt,'base64'),iterations:envelope.iterations},material,{name:'AES-GCM',length:256},false,['decrypt']);
 const payload=JSON.parse(new TextDecoder().decode(await webcrypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(envelope.iv,'base64')},key,Buffer.from(envelope.ciphertext,'base64'))));
 check(payload.files['learning.json'].practices.length===10&&payload.files['report.md'].includes('项目侧'),'密文可解密为结构化数据与可读报告');
 const denied=await fetch(`http://127.0.0.1:919/.ops-data/${id}/${date}/daily.ops.enc.json`);
 check(denied.status===403,'私密档案不可从静态 URL 下载');
 const crossOrigin=await fetch('http://127.0.0.1:919/api/ops-archive',{method:'POST',headers:{Origin:'https://example.invalid','X-OPS-Archive':'1'},body:'{}'});
 check(crossOrigin.status===403,'归档拒绝跨源请求');
 await click('我的学习');await new Promise(r=>setTimeout(r,4500));await screenshot('D:/Desktop/app-cjxeruyihxxd/ai-school/docs/ops-learning.png');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await screenshot('D:/Desktop/app-cjxeruyihxxd/ai-school/docs/ops-mobile.png');
 check(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'390px 移动端无横向溢出');
 check(errors.length===0,'浏览器无未捕获 JavaScript 异常');
 await writeFile('docs/ops-browser-results.json',JSON.stringify({at:new Date().toISOString(),results,errors},null,2));
}finally{close();}
