/* 917 学习站点：进度 / 连胜 / XP / 解锁 状态（localStorage） */
(function () {
  const KEY = 'ops917-progress:v1';
  const DAY = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const DEF = () => ({ xp: 0, streak: 0, lastDay: '', day: '', todayUnits: 0, todayLessons: 0, units: {}, planLevel: null });

  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
    if (!s || typeof s !== 'object') s = DEF();
    s = Object.assign(DEF(), s);
    if (s.day !== DAY()) { s.day = DAY(); s.todayUnits = 0; s.todayLessons = 0; }
    return s;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
  function state() { return load(); }

  function lessonDone(s, u, c, l) { return !!(s.units[u] && s.units[u].chapters && s.units[u].chapters[c] && s.units[u].chapters[c].lessons && s.units[u].chapters[c].lessons[l]); }
  function chapterDone(s, u, c) { const ch = s.units[u]?.chapters?.[c]; return !!(ch && ch.lessons && Object.keys(ch.lessons).length >= 5); }
  function unitDone(s, u) {
    const chs = s.units[u]?.chapters || {};
    for (let c = 1; c <= 5; c++) if (!chapterDone(s, u, c)) return false;
    return Object.keys(chs).length >= 5;
  }

  function completeLesson(u, c, l, correct, total) {
    const s = load();
    s.units[u] = s.units[u] || { chapters: {} };
    s.units[u].chapters[c] = s.units[u].chapters[c] || { lessons: {} };
    const wasDone = !!s.units[u].chapters[c].lessons[l];
    s.units[u].chapters[c].lessons[l] = true;
    if (!wasDone) s.todayLessons++;
    const xp = Math.max(10, (correct || 0) * 10 + (correct === total ? 20 : 0));
    s.xp += xp;
    const nowChapter = chapterDone(s, u, c);
    const nowUnit = unitDone(s, u);
    if (nowUnit && !s.units[u].unitDoneMark) { s.units[u].unitDoneMark = true; s.todayUnits++; }
    if (s.todayUnits >= 1 && s.lastDay !== DAY()) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yStr = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
      s.streak = s.lastDay === yStr ? s.streak + 1 : 1;
      s.lastDay = DAY();
    }
    save(s);
    return { xp, chapterDone: nowChapter, unitDone: nowUnit, state: s };
  }

  function planLevel() {
    try {
      const p = JSON.parse(localStorage.getItem('ops-en-plan:v1') || 'null');
      return p && p.levelId ? p.levelId : null;
    } catch { return null; }
  }
  function levelIdOfUnit(unit) { return ['beginner', 'intermediate', 'ielts-prep', 'advanced', 'advanced'][unit - 1] || 'advanced'; }

  function unitUnlocked(s, unit) {
    if (unit <= 1) return true;
    if (unitDone(s, unit - 1)) return true;
    const lv = planLevel();
    if (!lv) return false;
    const order = ['beginner', 'intermediate', 'ielts-prep', 'advanced', 'advanced'];
    const target = order.indexOf(lv) + 1;
    return unit <= Math.max(1, target);
  }
  function chapterUnlocked(s, unit, chapter) {
    if (chapter <= 1) return true;
    return chapterDone(s, unit, chapter - 1);
  }
  function lessonUnlocked(s, unit, chapter, lesson) {
    if (!unitUnlocked(s, unit)) return false;
    if (!chapterUnlocked(s, unit, chapter)) return false;
    if (lesson <= 1) return true;
    return lessonDone(s, unit, chapter, lesson - 1);
  }
  function firstIncomplete(curriculum) {
    const s = load();
    for (const u of curriculum.units) {
      if (!unitUnlocked(s, u.unit)) continue;
      for (const ch of u.chapters) {
        if (!chapterUnlocked(s, u.unit, ch.id)) continue;
        for (const l of ch.lessons) {
          if (!lessonDone(s, u.unit, ch.id, l.id) && lessonUnlocked(s, u.unit, ch.id, l.id)) {
            return { unit: u.unit, chapter: ch.id, lesson: l.id, title: u.name + ' · ' + ch.title + ' · ' + l.title };
          }
        }
      }
    }
    return null;
  }
  function chapterProgress(s, u, c) {
    const ch = s.units[u]?.chapters?.[c];
    return ch && ch.lessons ? Object.keys(ch.lessons).length : 0;
  }
  function unitProgress(s, u) {
    let n = 0;
    for (let c = 1; c <= 5; c++) n += chapterProgress(s, u, c);
    return n;
  }

  window.Store = { state, save, lessonDone, chapterDone, unitDone, completeLesson, unitUnlocked, chapterUnlocked, lessonUnlocked, firstIncomplete, chapterProgress, unitProgress, planLevel, levelIdOfUnit, DAY };
})();
