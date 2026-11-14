# 蓝思+雅思测评数据融入全等级英语课程 | 状态：已完成 | 更新时间：2026-11-11 16:32
工作根：D:\Desktop\app-cjxeruyihxxd\ai-school
产物：docs/OPS_课程体系_蓝思与雅思融合_v1.md；public/english-assessment.html；site917/public/index.html；vite.config.ts（watcher 修复）
相关文件：docs/research/05_英语测评竞品报告_v1.md、docs/research/06_全球英语测评_效果最好_v1.md、docs/OPS_蓝思定级与课程体系_v1.md、vite-plugins/school-plan.ts

## 1 目标与验收
目标：把蓝思定级（L1–L5）与雅思分项指标（听/说/读/写 band、CEFR）映射到课程体系；报告、教案、选材、学习课均使用这两套数据；教案优先使用研究资料中的标准数据。
验收：
- [x] 文档给出 L1–L5 × 蓝思区间 × CEFR × 雅思四项目标 × 语言规格 × 选材规则 × 升降级
- [x] 报告新增"本级课程目标"卡（目标/本次/差距 + 词汇/语法/听力/口语/写作规格 + 结课标准）
- [x] 教案带 lexLevel + curriculum，AI 提示词注入等级目标，规则版 note 含目标
- [x] 学习课阅读按蓝思区间选材（85% 概率）
- [x] 917 首页显示蓝思定级 + 本级课程目标
- [x] 测试全绿

## 2 已定决策
- "他们的数据资料文件" = docs/research 05/06 + 蓝思/雅思标准文档，不引入外部新数据
- L1–L5 为课程分层，对应 MetaMetrics 年级区间与雅思目标区间
- 不改 918 测评流程，只增强"数据→目标→选材→教案"贯通

## 3 事实（路径:行号→结论）
- CURRICULUM（assessment.template.html）：L1–L5 各含 cefr/ieltsRange/targets/words/grammar/listeningSpec/speakingSpec/writingSpec/exitRule
- lexLevel() 返回 curriculum；buildPlan 输出 lexLevel+curriculum；报告"本级课程目标"卡用 cur2/goals
- school-plan.ts personalize prompt 注入 curriculum 目标并要求对齐
- Learn.buildPlanQueue 阅读题从 rpool（band.min..band.max+50）抽取
- site917/index.html：LEX_LEVELS + CURRICULUM，首页渲染"本级目标：雅思…听3.5…CEFR A2"
- vite.config.ts watch.ignored 增加 '**/*~RF*.TMP'、'**/*.TMP'

## 4 验证（命令→关键结果）
- node scripts/build-assessment.mjs → 206.5KB 构建成功；site917/sync.mjs → 207.1KB
- node scripts/test-plan.mjs → failures=0（含"教案带本级课程目标 CEFR A2/3.5–4.5/听3.5"）
- node scripts/test-site917.mjs → failures=0（含"首页显示本级课程目标"）
- 918/917 端口均 200；/api/school-plan 直连与 917 代理均 200

## 5 DAG
[x] A 读取标准文档抽取蓝思/雅思/CEFR 数据
[x] B 全等级课程体系文档
[x] C CURRICULUM + 报告目标卡 + 教案目标注入
[x] D 学习课按等级选材
[x] E 917 首页显示等级目标
[x] F 测试与构建（含 dev server 崩溃修复）

## 6 下一步
做 917 独立学习主页：今日任务（按教案第 1 课）、周进度、蓝思升级检测入口；命令：node site917/server.mjs 已在跑，改 site917/public/ + 复用 /api。

## 7 交接
新 agent 读本记录 + docs/OPS_课程体系_蓝思与雅思融合_v1.md 即可继续；918 需保持运行（917 /api 代理依赖）。
