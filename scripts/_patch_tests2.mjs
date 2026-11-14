import fs from 'fs';
const files = ['scripts/test-tutor.mjs', 'scripts/test-tutor-od1.mjs', 'scripts/test-nextq.mjs', 'scripts/test-resume.mjs'];
const bad = "const startClass = async () => { await startClass();";
const good = "const startClass = async () => { await evalJs(`document.querySelector('#startBtn').click()`);";
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes(bad)) { s = s.replace(bad, good); fs.writeFileSync(f, s); console.log('fixed', f); }
  else console.log('ok', f);
}
