import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire, Module } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
function load(file){const filename=path.resolve(file);const m=new Module(filename);m.paths=Module._nodeModulePaths(path.dirname(filename));m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}
const {calculateCulture,convertBirthDate,encryptCulture,decryptCulture}=load('src/lib/culture.ts');
const {admissionTasks,gradeAdmission}=load('src/lib/admission.ts');
let upstream=0;
for(const file of ['EightChar.test.js','Yun.test.js','JieQi.test.js']){
 const absolute=path.resolve('node_modules/lunar-javascript/__tests__',file);
 const test=(name,fn)=>{fn();upstream++;};
 vm.runInNewContext(fs.readFileSync(absolute,'utf8'),{require:createRequire(absolute),test,it:test,expect:actual=>({toBe:expected=>assert.equal(actual,expected),toEqual:expected=>assert.deepEqual(JSON.parse(JSON.stringify(actual)),JSON.parse(JSON.stringify(expected))),toStrictEqual:expected=>assert.deepEqual(JSON.parse(JSON.stringify(actual)),JSON.parse(JSON.stringify(expected)))})},{filename:absolute});
}
const base={displayName:'边界验证样本',gender:'male',calendar:'solar',date:'2005-12-23',leapMonth:false,time:'08:37',city:'',longitude:'',solarCorrection:false};
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;console.log('PASS',message);};
let p=calculateCulture(base);check(p.pillars.map(x=>x.values[0]).join(' ')==='乙酉 戊子 辛巳 壬辰','官方四柱样本');
p=calculateCulture({...base,date:'1988-02-15',time:'23:30'});check(p.pillars.map(x=>x.values[0]).join(' ')==='戊辰 甲寅 辛丑 戊子','晚子时归次日，与官方 sect=1 样本一致');
p=calculateCulture({...base,date:'1992-03-05',time:'15:00'});check(p.pillars.map(x=>x.values[0]).join(' ')==='壬申 壬寅 庚辰 甲申','节气交界当天官方反查样本');
p=calculateCulture({...base,date:'1988-02-03',time:'12:00'});check(p.pillars[0].values[0]==='丁卯'&&p.pillars[1].values[0]==='癸丑','立春前一天仍属上一干支年');
const before=calculateCulture({...base,date:'2012-09-07',time:'13:28'}),after=calculateCulture({...base,date:'2012-09-07',time:'13:30'});check(before.pillars[1].values[0]==='戊申'&&after.pillars[1].values[0]==='己酉','白露 13:29:01 两侧月柱切换');
p=calculateCulture({...base,time:''});check(p.hourUnknown&&p.pillars[3].values.length===0&&p.cycles.length===0&&!p.strength,'未知时刻不补时柱、结构强弱或起运年龄');
check(p.pillars[2].values.length===2,'未知时刻保留晚子时日柱不确定性');
check(Object.values(calculateCulture(base).counts).reduce((n,x)=>n+x.min,0)===8,'已知时刻八字计数总量为8');
check(convertBirthDate('2024-10-10','lunar').solarDate==='2024-11-10','农历转公历官方样本');
assert.throws(()=>convertBirthDate('2023-02-30','solar'));checks++;
assert.throws(()=>calculateCulture({...base,solarCorrection:true}));checks++;
const corrected=calculateCulture({...base,city:'验证城市',longitude:'90',solarCorrection:true});check(corrected.correctedTime.endsWith('06:37:00'),'经度校正 -120 分钟');
const encrypted=await encryptCulture(p,'culture-test-password','qa-id');check(!JSON.stringify(encrypted).includes('边界验证样本'),'密文不含明文身份');
check((await decryptCulture(encrypted,'culture-test-password','qa-id')).hourUnknown,'加密解密往返');
await assert.rejects(()=>decryptCulture(encrypted,'culture-test-password','other-account'));checks++;
await assert.rejects(()=>decryptCulture(encrypted,'incorrect-password','qa-id'));checks++;
const tasks=admissionTasks(3);check(tasks.length===40&&tasks.filter(t=>t.expected).length===37,'40项任务含37项可判定任务');
const skipped=Object.fromEntries(tasks.map(t=>[t.id,{value:'暂时不会',skipped:true}]));check(gradeAdmission(tasks,skipped).every(r=>r.attempted===0&&r.review.length===0&&r.unknown.length===4),'不会与缺证据不被判定为能力不足');
const answers=Object.fromEntries(tasks.map(t=>[t.id,{value:t.expected||'我的策略'}]));check(gradeAdmission(tasks,answers).every(r=>r.correct===4),'分科判定与预期一致');
console.log(JSON.stringify({upstreamTests:upstream,customChecks:checks}));
