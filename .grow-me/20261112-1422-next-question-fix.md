# 老师卡住/重复提问修复（下一题传递） | 状态：已完成 | 更新时间：2026-11-12 14:22
工作根：D:\Desktop\app-cjxeruyihxxd\ai-school
产物：vite-plugins/school-tutor.ts（nextQuestion 注入）；site917/public/tutor.html（每轮发送 nextQuestion）；scripts/test-nextq.mjs（回归）

## 1 目标与验收
- 修复"后面老师不再讲新内容/不做语法，只重复 My___a woman / man"
验收：[x] 每轮把下一题传给老师；[x] 连续 3 轮 nextQuestion 依次变化；[x] 测试全绿

## 2 已定决策
- (可逆) 老师回复=反馈+下一题；前端显式传 nextQuestion（当前题不动，避免重复）
- (可逆) 重说(retry)轮同样带 nextQuestion；最后一题给"快结束了"提示

## 3 事实（路径:行号→结论）
- school-tutor.ts：读取 b.nextQuestion，在 reply/retry 提示中明确"ASK THE NEXT QUESTION"，并禁止重复当前题
- tutor.html：send() 计算 nextItem/nextQuestion 并随请求发送；teacher() 记录 window.__lastTutorBody 供测试
- test-nextq.mjs：连续答 3 题，检查 nextQuestion 非空、互不相同、依次为 woman→man→grandmother

## 4 验证（命令→结果）
- node scripts/test-nextq.mjs → 4/4：nextQ 列表 ["…woman…","…man…","…grandmother…"]，长度 55/53/71，无重复
- node scripts/test-tutor.mjs → 全绿
- node scripts/test-tutor-od1.mjs → 全绿

## 5 DAG
[x] A 定位根因（回复只带当前题）
[x] B 后端 nextQuestion 注入
[x] C 前端每轮传下一题
[x] D 回归测试

## 6 下一步
观察 David 连续上完整课；若仍有重复，检查 LLM 是否忽略 nextQuestion（可在前端兜底追加一条"Next: …"，但会破坏单段朗读，需改为替换）。

## 7 交接
读本记录；课堂页 tutor.html；测试 test-nextq.mjs。
