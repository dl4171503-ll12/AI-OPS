// WAV 语音识别端到端：TTS 生成语音 → 前端转 WAV 16k → ASR 识别
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT=9471;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let failures=0;const check=(n,ok,extra)=>{if(!ok)failures++;console.log(`${ok?'PASS':'FAIL'} · ${n}${extra?' :: '+extra:''}`)};

const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run','--remote-allow-origins=*',
  `--remote-debugging-port=${PORT}`,`--user-data-dir=${path.join(os.tmpdir(),'ops-asr-'+Date.now())}`,'about:blank'],{stdio:'ignore'});
for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break}catch{}await sleep(200)}
const tg=await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(tg.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let seq=0;const pend=new Map();
ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){const{r,j}=pend.get(d.id);pend.delete(d.id);d.error?j(new Error(JSON.stringify(d.error))):r(d.result)}};
const send=(method,params={})=>new Promise((r,j)=>{const id=++seq;pend.set(id,{r,j});ws.send(JSON.stringify({id,method,params}))});
for(const m of ['Page.enable','Runtime.enable'])await send(m);
const evalJs=async(e)=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value};

await send('Page.navigate',{url:'http://127.0.0.1:917/tutor.html'});await sleep(1200);
const res=await evalJs(`(async()=>{
  const r=await fetch('/api/school-tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:"Tom usually gets up at seven o'clock.",lang:'en',voice_id:'English_Graceful_Lady',model:'speech-02-hd',speed:0.95})});
  if(!r.ok) return {err:'tts '+r.status};
  const mp3=await r.blob();
  const wav=await window.__blobToWav16k(mp3);
  const bytes=new Uint8Array(wav);let bin='';const C=0x8000;
  for(let i=0;i<bytes.length;i+=C)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+C));
  const b64=btoa(bin);
  const r2=await fetch('/api/school-asr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audioBase64:b64,mime:'audio/wav',language:'en'})});
  return {status:r2.status, body:await r2.json(), wavBytes:wav.byteLength};
})()`);
check('前端转 WAV 成功', res && res.wavBytes > 16000, 'wavBytes=' + (res && res.wavBytes));
check('WAV 送识别接口 200', res && res.status === 200, 'status=' + (res && res.status));
check('识别出正确内容', res && res.body && res.body.ok && /seven|Tom|o.clock/i.test(res.body.text || ''), (res && res.body && res.body.text) || JSON.stringify(res && res.body));

chrome.kill();
console.log(`\n[result] failures=${failures}`);
process.exitCode=failures?1:0;
