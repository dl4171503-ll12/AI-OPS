# 前端清理 + 掌握度跳过/数据留存 | 状态：已完成 | 更新时间：2026-11-13 11:05
工作根：D:\Desktop\app-cjxeruyihxxd\ai-school
产物：site917/public/tutor.html（隐藏监督文字、掌握度过滤、自动跳课）；scripts/test-mastery.mjs；docs/OPS_AI老师课堂设计_v1.md §16

## 1 目标与验收
- 去掉前端不该出现的监督/测试文字
- 数据留存 + 学过学会的不重复，直接跳到未学部分；没学会继续练
验收：[x] 页面无"监督：…"可见文字；[x] 单题掌握跳过；[x] 整节掌握自动跳下一节；[x] 未掌握正常重复；[x] 测试全绿

## 2 已定决策
- (可逆) 单题掌握 = 连对≥2 或 做过≥3 且正确率≥80%；答错重置
- (可逆) 整节掌握 = 完成≥2 次且 pct≥85% → 开始即跳下一节
- (可逆) 过滤后无题 → 自动跳 Lesson+1；最后一课回主页
- (可逆) 掌握数据全存本地（task-mastery/lesson-history 等），刷新不丢
- (可逆) 监督 chip 隐藏、老师消息去 Supervisor 前缀、导出按钮改"学习记录"

## 3 事实（路径:行号→结论）
- tutor.html：#supervisorChips display:none；renderSupervisorChip 保留但不显示
- tutor.html：taskSig/recordTask/taskMastered/lessonMastered/jumpToNextLesson；startOd1 开头判整节掌握、构建后过滤已掌握题
- tutor.html：send 中正常/重说都 recordTask；finish 中 markLessonDone(pct)
- tutor.html：导出按钮灰色禁用逻辑不变（学完且 idx>=total 才启用）
- test-mastery.mjs：全掌握→跳 lesson=2；历史两次 90+→跳；无掌握→留 lesson=1

## 4 验证（命令→结果）
- node scripts/test-mastery.mjs → 4/4（全掌握跳课、整节掌握跳课、未掌握不跳、课堂运行）
- test-tutor / test-supervisor / test-tutor-od1 / test-nextq / test-resume → 全绿
- 页面扫描：可见区域无"监督："字样（仅隐藏 chip 内部代码）

## 5 DAG
[x] A 前端文字清理
[x] B 单题掌握记录与过滤
[x] C 整节掌握与自动跳课
[x] D 数据留存键
[x] E 测试

## 6 下一步
- 掌握度同步服务端（账号跨设备）
- 家长端查看掌握度与跳过记录

## 7 交接
读本记录 + docs §16；课堂页 tutor.html；测试 test-mastery.mjs。
