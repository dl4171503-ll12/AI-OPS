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
 await navigate('http://127.0.0.1:919/onboarding');await store();
 await evaluate(`localStorage.clear();localStorage.setItem('ai-school-auth-email','admission-qa@example.test');qaStore.getState().createSchool({name:'测评验证账号',avatar:'/avatars/avatar-tpl-01.png',gradeYear:3});qaStore.getState().setParentPassword('parent-qa-123');`);
 await navigate('http://127.0.0.1:919/principal?intake=1');await store();
 check(await evaluate(`location.pathname==='/assessment'&&document.body.innerText.includes('开始任务测评')`),'旧面谈地址自动进入测评间');
 check(!(await evaluate('document.body.innerText')).includes('入学面谈·认识你'),'旧1/5闲聊流程已下线');
 check(!(await evaluate('document.body.innerText')).includes('文化对照 · 选做'),'默认不显示文化模块入口');
 await click('开始任务测评');
 check(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='保存依据，继续下一项').disabled`),'不能只有结论而没有推理依据');
 await fill('[aria-label="任务答案"]','7');await fill('[aria-label="任务推理依据"]','先用四乘六求总数，再减去已有的十七张纸');
 await navigate('http://127.0.0.1:919/assessment');await store();
 check(await evaluate(`document.querySelector('[aria-label="任务答案"]').value==='7'&&document.querySelector('[aria-label="任务推理依据"]').value.includes('四乘六')`),'刷新恢复未提交答案与推理草稿');
 await screenshot('D:/Desktop/app-cjxeruyihxxd/ai-school/docs/admission-task.png');
 await click('保存依据，继续下一项');
 const tasks=await evaluate(`import('/src/lib/admission.ts').then(m=>m.admissionTasks(3))`);
 for(let i=1;i<tasks.length;i++){
  const task=tasks[i];const answer=task.expected||task.options[0];
  if(task.options)await click(answer);else await fill('[aria-label="任务答案"]',answer);
  await fill('[aria-label="任务推理依据"]','我比较了材料中的条件，再检查每个选项的依据。');
  await click(i===tasks.length-1?'保存并生成报告':'保存依据，继续下一项');
 }
 check((await evaluate('document.body.innerText')).includes('你的学习起点报告'),'完成19项任务后生成证据报告');
 check(await evaluate('Object.keys(qaStore.getState().admission.answers).length===19'),'保存全部19项任务过程');
 check(await evaluate(`['math','chinese','english','science'].every(s=>qaStore.getState().plans[s]?.tasks.length===2)`),'报告实际下发四科学习计划');
 check(await evaluate(`qaStore.getState().student.points===20`),'测评不凭空发放XP');
 await screenshot('D:/Desktop/app-cjxeruyihxxd/ai-school/docs/admission-report.png');
 await navigate('http://127.0.0.1:919/parent');
 await fill('input[placeholder="家长密码"]','parent-qa-123');await click('进入家长中心').catch(async()=>{await evaluate(`[...document.querySelectorAll('button')].find(b=>/验证|进入/.test(b.textContent)&&!b.textContent.includes('设置')).click()`);await pause();});
 await evaluate(`[...document.querySelectorAll('input[type="checkbox"]')].find(x=>x.closest('label')?.textContent.includes('启用传统文化对照')).click()`);await pause();
 await navigate('http://127.0.0.1:919/assessment');await store();await evaluate(`window.qaCultureRequests=[];window.qaOriginalFetch=window.fetch;window.fetch=(...args)=>{window.qaCultureRequests.push(String(args[0]));return window.qaOriginalFetch(...args);};`);await click('文化对照 · 选做');
 await fill('select','male');await fill('[aria-label="出生日期"]','2005-12-23');await click('本地生成文化报告');
 check(await evaluate(`document.querySelector('[data-testid="culture-report"]').innerText.includes('不详')`),'未知时刻显示不详并保留不确定性');
 check(!(await evaluate(`Object.values(localStorage).join(' ')`)).includes('2005-12-23'),'未保存的生辰未落入明文缓存');
 await fill('[aria-label="出生时刻"]','08:37');await click('本地生成文化报告');
 check(await evaluate(`document.querySelector('[data-testid="culture-report"]').innerText.includes('乙酉')&&document.querySelector('[data-testid="culture-report"]').innerText.includes('壬辰')`),'页面四柱与已知样本一致');
 await fill('[aria-label="文化档案口令"]','culture-qa-secret-123');await click('加密保存');await new Promise(r=>setTimeout(r,900));
 check(await evaluate(`Object.keys(localStorage).some(k=>k.startsWith('ops-culture-encrypted-v1:'))`),'文化档案独立加密保存');
 check(!(await evaluate(`Object.values(localStorage).join(' ')`)).includes('2005-12-23'),'加密保存后仍无生辰明文');
 check(await evaluate('qaStore.getState().student.points===20&&qaStore.getState().ops.awards.length===0'),'文化内容不参与XP与学科账本');
 check(await evaluate('window.qaCultureRequests.length===0'),'文化录入、计算与加密未发送网络请求');
 await new Promise(r=>setTimeout(r,4500));await screenshot('D:/Desktop/app-cjxeruyihxxd/ai-school/docs/admission-culture.png');
 await navigate('http://127.0.0.1:919/assessment');await click('文化对照 · 选做');
 check(!(await evaluate('document.body.innerText')).includes('2005-12-23'),'刷新后文化结果默认锁定');
 await fill('[aria-label="文化档案口令"]','culture-qa-secret-123');await click('解锁已有报告');await new Promise(r=>setTimeout(r,600));
 check(await evaluate(`Boolean(document.querySelector('[data-testid="culture-report"]'))`),'独立口令可解锁已有报告');
 await navigate('http://127.0.0.1:919/parent');await fill('input[placeholder="家长密码"]','parent-qa-123');
 await evaluate(`[...document.querySelectorAll('button')].find(b=>/验证|进入/.test(b.textContent)&&!b.textContent.includes('设置')).click()`);await pause();
 await evaluate(`[...document.querySelectorAll('input[type="checkbox"]')].find(x=>x.closest('label')?.textContent.includes('启用传统文化对照')).click()`);
 await navigate('http://127.0.0.1:919/assessment');
 check(!(await evaluate('document.body.innerText')).includes('文化对照 · 选做')&&!(await evaluate('document.body.innerText')).includes('乙酉'),'家长关闭后入口与结果均隐藏');
 await navigate('http://127.0.0.1:919/iqe?from=intake');check(await evaluate(`location.pathname==='/assessment'`),'旧IQE链接兼容新测评间');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await screenshot('D:/Desktop/app-cjxeruyihxxd/ai-school/docs/admission-mobile.png');
 check(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'手机报告无横向溢出');
 check(errors.length===0,'浏览器无未捕获异常');
 await writeFile('docs/admission-browser-results.json',JSON.stringify({at:new Date().toISOString(),results,errors},null,2));
}finally{close();}
