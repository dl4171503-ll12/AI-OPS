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
 await evaluate(`localStorage.clear();localStorage.setItem('ai-school-auth-email','admission-v3-qa@example.test');qaStore.getState().createSchool({name:'四十项验证账号',avatar:'/avatars/avatar-tpl-01.png',gradeYear:3});`);
 await navigate('http://127.0.0.1:919/assessment');await store();
 check((await evaluate('document.body.innerText')).includes('开始 40 项测评'),'新版40项入口');
 await click('开始 40 项测评');
 check(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='提交本题，进入下一题').disabled`),'空白题无法提交');
 check(!(await evaluate('document.body.innerText')).includes('上一项')&&!(await evaluate(`Boolean(document.querySelector('[aria-label="任务 10"]'))`)),'没有回退和编号跳题入口');
 const tasks=await evaluate(`import('/src/lib/admission.ts').then(m=>m.admissionTasks(3))`);
 check(tasks.length===40&&tasks.slice(0,24).every(t=>t.subject==='reflection'),'40项，能力情境在前，学科压轴');
 await click(tasks[0].options[0]);
 await fill('[aria-label="任务推理依据"]','我先拆分问题，再检查哪一步需要支持。');
 // 合成指针没有真实捕获时用 CDP 鼠标事件绘制。
 await evaluate(`document.querySelector('canvas').scrollIntoView({block:'center'})`);await pause();
 const rect=await evaluate(`(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.left+50,y:r.top+40};})()`);
 await call('Input.dispatchMouseEvent',{type:'mousePressed',x:rect.x,y:rect.y,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x+80,y:rect.y+40,button:'left'});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x+80,y:rect.y+40,button:'left',clickCount:1});
 await navigate('http://127.0.0.1:919/assessment');await store();
 check(await evaluate(`document.querySelector('[aria-label="任务推理依据"]').value.includes('拆分问题')`),'刷新恢复未提交依据');
 check((await evaluate('document.body.innerText')).includes('1 笔'),'刷新保留白板笔画');
 await click('提交本题，进入下一题');
 check(await evaluate(`Object.values(qaStore.getState().admission.answers)[0].enteredAt&&Object.values(qaStore.getState().admission.answers)[0].firstAnsweredAt`),'进入、首答与提交时间留存');
 await navigate('http://127.0.0.1:919/assessment');await store();
 check((await evaluate('document.body.innerText')).includes('第 2/40 项'),'刷新只能从下一道未完成题续答');
 await screenshot('D:/Desktop/app-cjxeruyihxxd/ai-school/docs/admission-v3-task.png');
 for(let i=1;i<tasks.length;i++){
  const t=tasks[i],answer=t.expected||t.options[0];if(t.options)await click(answer);else await fill('[aria-label="任务答案"]',answer);
  await fill('[aria-label="任务推理依据"]','我对比了材料条件，并用具体步骤验证这个答案。');
  await click(i===39?'保存并生成报告':'提交本题，进入下一题');
 }
 check((await evaluate('document.body.innerText')).includes('你的学习起点报告'),'40题完成后生成报告');
 check(await evaluate('Object.keys(qaStore.getState().admission.answers).length===40'),'40项答案全部保存');
 check(await evaluate('qaStore.getState().admission.adjustments.length===40'),'40次计划调整有据可查');
 check(await evaluate(`Boolean(document.querySelector('[aria-label="八维能力雷达图"]'))`),'八维雷达图呈现');
 check(await evaluate(`['math','chinese','english','science'].every(s=>qaStore.getState().plans[s]?.tasks.length===2)`),'四科学习计划实际写入');
 check(await evaluate(`qaStore.getState().student.points===20`),'测评没有额外发放XP');
 await screenshot('D:/Desktop/app-cjxeruyihxxd/ai-school/docs/admission-v3-report.png');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 check(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'手机报告无横向溢出');
 await screenshot('D:/Desktop/app-cjxeruyihxxd/ai-school/docs/admission-v3-mobile.png');
 await navigate('http://127.0.0.1:919/assessment');await store();check((await evaluate('document.body.innerText')).includes('已完成 40/40 项'),'刷新仍保留完整报告');
 await evaluate(`qaStore.getState().setAdmission({version:2,gradeYear:3,answers:{}});localStorage.removeItem('ops-admission-current:'+qaStore.getState().student.id);qaStore.getState().setParent({cultureEnabled:true});`);await pause();
 check(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='开始 40 项测评').disabled`),'文化开启时先完成文化环节');
 await fill('select','male');await fill('[aria-label="出生日期"]','2005-12-23');await click('本地生成文化报告');
 check(await evaluate(`![...document.querySelectorAll('button')].find(b=>b.textContent==='开始 40 项测评').disabled`),'文化报告生成后开放能力测评');
 check(!(await evaluate(`Object.values(localStorage).join(' ')`)).includes('2005-12-23'),'生辰信息不写入明文存储');
 await evaluate(`qaStore.getState().setParent({cultureEnabled:false});`);await pause();
 check(!(await evaluate('document.body.innerText')).includes('五行 →'),'关闭文化后入口和结果隐藏');
 check(errors.length===0,'无浏览器未捕获异常');
 await writeFile('docs/admission-v3-browser-results.json',JSON.stringify({checks:results,errors},null,2));
 console.log(JSON.stringify({checks:results.length,errors}));
}finally{close();}
