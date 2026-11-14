# 监督 Agent + 反作弊 + 自适应闭环 | 状态：已完成 | 更新时间：2026-11-13 10:05
工作根：D:\Desktop\app-cjxeruyihxxd\ai-school
产物：site917/public/tutor.html（人机验证、反作弊、自适应、导出）；vite-plugins/school-tutor.ts（监督指令注入）；scripts/test-supervisor.mjs；docs/OPS_AI老师课堂设计_v1.md §15

## 1 目标与验收
- 撤回后老师不再朗读被撤回内容
- 监督 Agent：人机验证、反作弊、学习进度监督（退步降难度/进步升难度）、反馈本地存档
验收：[x] 撤回停止语音并作废在途回复；[x] 课前浏览器式验证；[x] 长粘贴拦截/整段插入/秒答记录；[x] 不限制输入法；[x] 退步/进步指令与存档；[x] 导出 JSON；[x] 测试全绿

## 2 已定决策
- (可逆) 人机验证用仿浏览器卡片（无第三方 key）；后续可换 Turnstile
- (可逆) 反作弊只做页面层：粘贴/整段插入/秒答；不监控外部 AI 软件（需桌面 Agent）
- (可逆) 退步>10%→lower；进步>10%→raise；指令注入老师 prompt
- (可逆) 记录全存本地 localStorage，手动导出，不自动上传
- **学生不能结束课程**：无结束按钮；必须全部任务完成 + 最短 15 分钟；不足自动追加复习题
- **导出仅限学完后**：按钮默认禁用，完成状态持久化 ops917-lesson-completed:v1
- **监督 Agent 用 DeepSeek**：/api/school-supervise，PLAN_API_KEY，规则护栏（未完成/未到时长强制 continue）

## 3 事实（路径:行号→结论）
- tutor.html：undo 增加 audioEpoch++/暂停 currentAudio/speechSynthesis.cancel
- tutor.html：gateThenStart（#humanGate）、supervisorEvent（ops917-supervisor:v1）、paste/bulk-insert/fast-correct 监听
- tutor.html：finish 对比 prevPct → ADAPT_KEY/FEEDBACK_KEY，提示"监督：退步/进步"
- tutor.html：exportSupervision 下载 supervisor+adaptation+feedback+mastery JSON
- school-tutor.ts：Supervisor note（lower/raise）与 suspicious 指令注入 start/reply prompt

## 4 验证（命令→结果）
- node scripts/test-supervisor.mjs → 全绿（人机验证、长粘贴拦截、整段插入、学完前不可导出、无结束按钮、学完可导出、退步敲打 lower、反馈存档、监督接口：没学完→continue / 学完且到时长→end、无异常）
- test-tutor.mjs → 全绿（含撤回停止语音、无结束按钮、未学完不可导出）
- test-tutor-od1 / test-nextq / test-resume → 全绿
- 监督接口实测：早期状态 "仅完成1/11题且用时不足15分钟，需继续"；完成状态 "全部题目完成且已达最短时长，允许结束"
- 917/918/本地 ASR 均在运行

## 5 DAG
[x] A 撤回语音作废
[x] B 课前人机验证
[x] C 反作弊检测与日志
[x] D 自适应敲打与反馈存档
[x] E 导出与测试

## 6 下一步
- 接入服务端上传监督 JSON（训练数据管道）
- 桌面 Agent 监测外部 AI 软件
- 可换真 Turnstile/reCAPTCHA

## 7 交接
读本记录 + docs/OPS_AI老师课堂设计_v1.md §15；课堂页 tutor.html；测试 test-supervisor.mjs。
