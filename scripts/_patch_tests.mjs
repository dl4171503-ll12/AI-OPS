import fs from 'fs';
const files = ['scripts/test-tutor.mjs', 'scripts/test-tutor-od1.mjs', 'scripts/test-nextq.mjs', 'scripts/test-resume.mjs'];
const click = "await evalJs(`document.querySelector('#startBtn').click()`);";
const helper = "const startClass = async () => { await evalJs(`document.querySelector('#startBtn').click()`); await sleep(300); await evalJs(`(()=>{const b=document.querySelector('#humanBox');if(b){b.checked=true;b.dispatchEvent(new Event('change'));}return true})()`); await sleep(1600); };\n";
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  if (!s.includes(click)) { console.log('NO CLICK', f); continue; }
  s = s.replace(click, helper + 'await startClass();');
  s = s.split(click).join('await startClass();');
  fs.writeFileSync(f, s);
  console.log('patched', f);
}
