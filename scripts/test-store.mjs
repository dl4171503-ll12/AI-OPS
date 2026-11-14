// 进度/连胜/单元完成逻辑测试（纯逻辑，无浏览器）
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync('site917/public/js/store.js', 'utf8');
const mem = new Map();
const localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
const ctx = { window: {}, localStorage, console };
ctx.window.localStorage = localStorage;
vm.createContext(ctx);
vm.runInContext(src, ctx);
const Store = ctx.window.Store;

let failures = 0;
const check = (n, ok, extra) => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'} · ${n}${extra ? ' :: ' + extra : ''}`); };

const completeUnit = (u) => { for (let c = 1; c <= 5; c++) for (let l = 1; l <= 5; l++) Store.completeLesson(u, c, l, 6, 6); };

completeUnit(1);
let s = Store.state();
check('完成 25 节后单元完成', Store.unitDone(s, 1) === true);
check('今日完成单元 = 1（满足硬性要求）', s.todayUnits === 1, 'todayUnits=' + s.todayUnits);
check('连胜 +1', s.streak === 1, 'streak=' + s.streak);
check('XP 累积', s.xp > 0, 'xp=' + s.xp);
check('累计学习小节 25', s.todayLessons === 25, 'lessons=' + s.todayLessons);

completeUnit(2);
s = Store.state();
check('完成第 2 单元：今日 2/3', s.todayUnits === 2, 'todayUnits=' + s.todayUnits);
check('连胜不重复加（同一天）', s.streak === 1, 'streak=' + s.streak);

completeUnit(3);
s = Store.state();
check('完成第 3 单元：达到建议目标 3', s.todayUnits === 3, 'todayUnits=' + s.todayUnits);

// 解锁规则
check('第 2 单元已解锁', Store.unitUnlocked(Store.state(), 2) === true);
check('第 4 单元未解锁（第 3 单元刚完成应解锁）', Store.unitUnlocked(Store.state(), 4) === true);
check('第 5 单元未解锁', Store.unitUnlocked(Store.state(), 5) === false);
check('第 2 章在第 1 章完成后解锁', Store.chapterUnlocked(Store.state(), 1, 2) === true);
check('未开始的第 4 单元第 2 章仍锁定', Store.chapterUnlocked(Store.state(), 4, 2) === false);

console.log(`\n[result] failures=${failures}`);
process.exitCode = failures ? 1 : 0;
