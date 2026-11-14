# 自动留存/恢复 + 自适应 + 语音额度兜底 | 状态：已完成 | 更新时间：2026-11-12 14:55
工作根：D:\Desktop\app-cjxeruyihxxd\ai-school
产物：site917/public/tutor.html（session/mastery/兜底）；scripts/test-resume.mjs；docs/OPS_AI老师课堂设计_v1.md §12

## 1 目标与验收
- 自动留存学习记录、可继续未完成课程、一键恢复交流记录
- 按每课反馈调整内容/进度：错词专项+降难度；表现好加速
- 修复"老师不能说话/麦克风识别失败"（MiniMax 402 余额不足）
验收：[x] 刷新后出现继续并恢复对话/进度；[x] 薄弱词记录与复习入口；[x] <50% 降练习量 / ≥90% 加速；[x] 402 时浏览器语音/识别兜底；[x] 测试全绿

## 2 已定决策
- (可逆) 记录存 localStorage（917 origin）：ops917-session:v1、ops917-mastery:v1
- (可逆) 语音兜底优先浏览器 speechSynthesis / SpeechRecognition；额度恢复后自动回 MiniMax
- (可逆) 自适应只调"练习量/复习入口/加速"，不改教材级别

## 3 事实（路径:行号→结论）
- saveSession/resumeSaved：保存题目、idx、correct、history、lessonMeta、wrongs；恢复时重建聊天
- finish：写 mastery（words/lessons）、pct<50→pace less、pct≥90→pace more；weak 显示"复习薄弱词"
- startReview：用薄弱词生成听写+造句+写作小课
- playTTS 失败→speakBrowser（__ttsFallbackTried）；ASR 402→browserASR 兜底
- friendlyVoiceError：402/balance→中文提示，不再显示原始 JSON

## 4 验证（命令→结果）
- node scripts/test-resume.mjs → 全绿：记录保存(idx=1,q=11)、刷新出现继续、一键恢复对话与进度、恢复后最多只朗读一条老师消息（tts 1→1，msgs=3）、mastery 记录 {"mother":1}、复习入口、pace=less、402 友好提示、浏览器语音兜底、无 JS 异常
- 917/918 运行

## 5 DAG
[x] A 会话自动保存
[x] B 一键恢复
[x] C 薄弱词/自适应
[x] D 语音额度兜底
[x] E 测试

## 6 下一步
MiniMax 账户充值（余额不足 402，需要家长操作）；充值后验证原语音恢复。记录目前浏览器本地，后续可同步到服务器/账号。

## 7 交接
读本记录 + docs/OPS_AI老师课堂设计_v1.md；课堂页 tutor.html；测试 test-resume.mjs。
