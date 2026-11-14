// 把测评单页同步到 917 站点，并加上"返回主页"和 URL 快捷入口
// 用法：node site917/sync.mjs
import fs from 'node:fs';
import path from 'node:path';

const src = 'public/english-assessment.html';
const outDir = 'site917/public';
const out = path.join(outDir, 'assessment.html');
if (!fs.existsSync(src)) { console.error('先构建测评页：node scripts/build-assessment.mjs'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });

let html = fs.readFileSync(src, 'utf8');

const homeLink = `<a href="/" style="position:fixed;left:14px;top:12px;z-index:60;background:#fff;border:1px solid #e2e8f0;
  border-radius:999px;padding:7px 13px;font:600 12.5px system-ui;color:#0f766e;text-decoration:none;box-shadow:0 2px 10px rgba(15,23,42,.08)">← 返回主页</a>`;
if (!html.includes('返回主页')) html = html.replace('<div class="wrap">', homeLink + '\n<div class="wrap">');

const paramScript = `<script>
(function(){
  try{
    var p=new URLSearchParams(location.search);
    if(p.get('bench')==='1') setTimeout(function(){ var b=document.querySelector('#benchBtn'); if(b) b.click(); },400);
    if(p.get('learn')==='1') setTimeout(function(){ if(window.startLearnFromReport) window.startLearnFromReport(); },500);
  }catch(e){}
})();
</script>
<script>
(function(){
  // 测评完成后：强制进入 917 学习主页
  if(location.port!=='917') return;
  var went=false;
  function enterHome(){
    if(went) return; went=true;
    try{ localStorage.setItem('ops917-from-assessment','1'); }catch(e){}
    location.href='/';
  }
  function showHomeBtn(){
    if(document.getElementById('toHomeBtn')) return;
    var b=document.createElement('a');
    b.id='toHomeBtn'; b.href='/'; b.textContent='进入学习主页 →';
    b.style.cssText='position:fixed;right:16px;bottom:18px;z-index:80;background:#58cc02;color:#fff;padding:13px 20px;border-radius:14px;font:800 14px system-ui;text-decoration:none;box-shadow:0 4px 0 #46a302';
    document.body.appendChild(b);
  }
  function check(){
    var r=document.getElementById('screen-report');
    if(r && !r.classList.contains('hidden')){
      showHomeBtn();
      setTimeout(enterHome,6000);
    }
  }
  var obs=new MutationObserver(check);
  obs.observe(document.body,{attributes:true,subtree:true,attributeFilter:['class']});
  check();
})();
</script>`;
if (!html.includes('URLSearchParams')) html = html.replace('</body>', paramScript + '\n</body>');

fs.writeFileSync(out, html);
console.log(`✅ 已同步 ${out}（${(fs.statSync(out).size/1024).toFixed(1)} KB）`);
