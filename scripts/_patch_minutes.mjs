import fs from 'fs';
const files = ['scripts/test-tutor.mjs','scripts/test-tutor-od1.mjs','scripts/test-nextq.mjs','scripts/test-resume.mjs','scripts/test-supervisor.mjs'];
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes("ops917-min-minutes")) { console.log('already', f); continue; }
  if (s.includes('await startClass();')) {
    s = s.replace('await startClass();', "await evalJs(\"localStorage.setItem('ops917-min-minutes','0');true\");\nawait startClass();");
  } else if (s.includes("await evalJs(`document.querySelector('#startBtn').click()`)")) {
    // supervisor test uses inline start flow; add before it
    s = s.replace("await evalJs(`document.querySelector('#startBtn').click()`);", "await evalJs(\"localStorage.setItem('ops917-min-minutes','0');true\");\nawait evalJs(`document.querySelector('#startBtn').click()`);");
  }
  fs.writeFileSync(f, s); console.log('patched', f);
}
