# 阶段小测 + 错题订正 + 按计划连续推进 | 状态：已完成 | 更新时间：2026-11-13 11:30
工作根：D:\Desktop\app-cjxeruyihxxd\ai-school
产物：site917/public/tutor.html（阶段小测/订正/自动跳课/通用单元教案）；vite-plugins/school-tutor.ts（explain 模式）；scripts/test-quiz.mjs；scripts/test-plan-progress.mjs；docs §17

## 1 目标与验收
- 每个教学内容结束做阶段小测
- 小测后讲解错题、总结、再练；掌握则继续往下讲，不重复
- 严格按教学计划（Unit1 4 课 → Unit2…）推进
验收：[x] 小测 3 题混合；[x] ≥80% 通过自动下一课；[x] <80% 老师讲解+订正；[x] 订正通过进入下一课；[x] Unit1 L4 → Unit2 L1；[x] Unit2 无教案自动生成；[x] 测试全绿

## 2 已定决策
- (可逆) 小测固定 3 题，类型优先 grammar/dictation/reading/speaking
- (可逆) 及格线 80%；订正按错题重做，订正 ≥80% 视为通过
- (可逆) 通过后 3.5 秒自动跳下一课；不通过留在本课复习
- (可逆) 没有手写教案的单元按词汇自动生成 4 课（后续替换正式教案）
- (可逆) 时间下限（15 分钟）仍在授课阶段补足，小测在内容之后

## 3 事实（路径:行号→结论）
- tutor.html：phase=teach/quiz/remediation；startStageQuiz/evaluateQuiz/startRemediation/finalizeLesson
- tutor.html：quizWrong、quizScore、teacher('explain')、订正后 quizScore 提升
- tutor.html：finish(quiet,passed)；通过自动跳转；失败显示复习入口
- tutor.html：buildGenericPlan + jumpToNextLesson（L4→Unit+1 L1）
- school-tutor.ts：mode 'explain' 逐条讲错题、不给新问题

## 4 验证（命令→结果）
- node scripts/test-quiz.mjs → 6/6：小测 3 题（grammar/dictation/speaking）、全对通过、自动跳 lesson=2、全错进入讲解+订正、订正通过、再跳 lesson=2
- node scripts/test-plan-progress.mjs → 4/4：Unit1 L4 通过 → Unit2 L1；Unit2 自动生成练习并可上课
- test-tutor/test-supervisor/test-resume/test-mastery/test-tutor-od1/test-nextq → 全绿
- 917/918/本地 ASR 运行

## 5 DAG
[x] A 阶段小测
[x] B 错题讲解与订正
[x] C 通过自动进入下一课
[x] D 单元连续推进/通用教案
[x] E 测试

## 6 下一步
- 手写 Unit 2–4 正式教案（替换通用生成）
- 按 12 周计划对齐每周 Unit/课次与阶段测
- 服务端同步掌握度/进度

## 7 交接
读本记录 + docs §17；课堂页 tutor.html；测试 test-quiz.mjs、test-plan-progress.mjs。
