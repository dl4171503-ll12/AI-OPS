import fs from 'node:fs';
const env=Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter(Boolean).map(m=>[m[1],m[2].trim().replace(/^['"]|['"]$/g,'')]));
const results=await Promise.allSettled([
 (async()=>{const r=await fetch('http://127.0.0.1:919/api/school-llm',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(25000),body:JSON.stringify({prefer:'deepseek',max_tokens:100,messages:[{role:'system',content:'你是学习导师，只给一个问题或提示，不直接给最终答案。禁止出现“答案是”。'},{role:'user',content:'测试情境：有2张卡片，又做3张。应该怎样思考？'}]})});const j=await r.json();return {service:'AI',status:r.status,hasContent:Boolean(j.content),noDirectAnswer:!/(答案是|答案为)/.test(j.content||'')};})(),
 (async()=>{if(!env.VITE_SUPABASE_URL||!env.VITE_SUPABASE_ANON_KEY)return {service:'Auth',configured:false}; const r=await fetch(env.VITE_SUPABASE_URL.replace(/\/$/,'')+'/auth/v1/health',{headers:{apikey:env.VITE_SUPABASE_ANON_KEY,Authorization:'Bearer '+env.VITE_SUPABASE_ANON_KEY},signal:AbortSignal.timeout(15000)});return {service:'Auth',status:r.status};})()
]);
console.log(JSON.stringify(results.map(r=>r.status==='fulfilled'?r.value:{error:r.reason?.name||'request failed'}),null,2));
