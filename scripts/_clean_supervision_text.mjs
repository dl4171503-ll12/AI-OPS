import fs from 'fs';
const p = 'site917/public/tutor.html';
let s = fs.readFileSync(p, 'utf8');
const pairs = [
  ['<div class="chips" id="supervisorChips" style="margin-top:6px"></div>', '<div class="chips" id="supervisorChips" style="display:none"></div>'],
  ['id="exportSupBtn" disabled title="学完本节课后才能导出"', 'id="exportSupBtn" disabled title="学完本节课后才能导出学习记录"'],
  ['btn.title = \'导出本节课监督记录\'', 'btn.title = \'导出本节课学习记录\''],
  ['必须学完整节课、完成全部学习内容后才能导出监督记录（按钮在完课前是灰色的）。', '学完整节课、完成全部学习内容后才能导出学习记录。'],
  ['showStatus(\'监督记录已导出（含学习进度、敲打反馈、可疑行为）\')', 'showStatus(\'学习记录已导出\')'],
  ['showStatus(`监督：课程未结束（还差约 ${left} 分钟），继续练 2 题`)', 'showStatus(`还差约 ${left} 分钟，继续练习 2 题`)'],
  ['addMsg(\'teacher\', `Supervisor: we still have about ${left} minutes. Let\'s practise two more tasks: listen and write the word "${w}", then make a sentence with it.`)', 'addMsg(\'teacher\', `We still have about ${left} minutes. Let\'s practise two more tasks: listen and write the word "${w}", then make a sentence with it.`)'],
  ['if(action===\'lower\') supNote=\' · 监督：退步 → 已要求老师降难度/换说法\';', ''],
  ['if(action===\'raise\') supNote=\' · 监督：进步 → 已要求提高难度\';', ''],
  ['showMicHelp(\'检测到粘贴长文本：请自己口述或自己打字（已记录监督日志）。\')', 'showMicHelp(\'请自己口述或自己打字。\')'],
  ['showStatus(\'监督：检测到整段插入，请用自己的话回答\')', 'showStatus(\'请用自己的话回答\')'],
  ['showMicHelp(\'课程由老师与监督 Agent 根据学习内容与时长决定结束，学生不能提前结束。\')', 'showMicHelp(\'课程由老师根据学习内容与时长决定结束，学生不能提前结束。\')'],
  ['导出监督记录', '导出学习记录'],
];
for (const [a, b] of pairs) {
  if (!s.includes(a)) { console.log('MISS:', a.slice(0, 50)); continue; }
  s = s.split(a).join(b);
}
// 隐藏监督 chip
if (!s.includes('#supervisorChips{display:none!important}')) {
  s = s.replace('<style>', '<style>\n  #supervisorChips{display:none!important}');
}
fs.writeFileSync(p, s);
console.log('done');
