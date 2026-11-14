# 课程体系搭建（剑桥/牛津体系对标）+ 教学进度 + 实时评估闭环 | 状态：已完成 | 更新时间：2026-11-11 17:02
工作根：D:\Desktop\app-cjxeruyihxxd\ai-school
产物：docs/OPS_课程体系_剑桥牛津对标与教学进度_v1.md；vite-plugins/school-progress.ts；public/english-assessment.html；site917/public/assessment.html；scripts/test-progress.mjs
相关文件：docs/OPS_课程体系_蓝思与雅思融合_v1.md；docs/research/05_英语测评竞品报告_v1.md；docs/research/06_全球英语测评_效果最好_v1.md

## 1 目标与验收
三步交付：
1) 课程体系：对标剑桥（YLE→KET→PET→IELTS）与牛津/NGL 主流少儿教材，结合学生测评数据（蓝思 L1–L5 + 雅思四项目标）给出分级课程
2) 教学进度：给出可执行的周计划（12 周/学期，每周 3 课）+ 节点测评
3) 实时评估与微调：每课表现回传主 Agent → 评估匹配度 → 动态调整教案/难度/内容，形成闭环
验收：
- [ ] 文档含 6+ 套主流体系的对比表与官方链接（可核实）
- [ ] L1–L5 每级给出主教材/补充/阅读书单 + 单元模板
- [ ] 12 周进度表（每周目标/内容/测评）
- [ ] 闭环：接口 + 前端回传 + 调整规则 + 可见反馈
- [ ] 测试：接口与页面验证

## 2 已定决策
- (可逆) 主教材以剑桥/牛津/NGL 少儿线为主轴，Think/Prepare 用于高年级（L4–L5），21st Century Communication 作为高阶补充
- (可逆) 课程级别沿用 L1–L5 与蓝思/雅思目标（已落盘）
- (可逆) 闭环数据只回传学习行为与正确率，不采集无关隐私

## 3 事实（路径:行号→结论）
- 现有 L1–L5 与蓝思/雅思目标：docs/OPS_课程体系_蓝思与雅思融合_v1.md
- 已有 /api/school-plan（模板/定稿/调整）与 Learn 课末结算
- 917 站点首页已有蓝思定级/教案/历史

## 4 验证（命令→结果）
- Cambridge 官方少儿页已核实：Pre A1 Starters / A1 Movers / A2 Flyers；A2 Key→B1 Preliminary→B2 First→C1
- node scripts/test-progress.mjs → 18/18 全过（918 直连 + 917 代理，三档难度均返回 fit/advice/adjust）
- node scripts/test-plan.mjs → failures=0（含教案卡显示"老师评估"）
- 构建 209.3KB，site917 同步 209.9KB

## 5 DAG
[x] A 查证主流少儿英语体系（Cambridge 官方页）
[x] B 课程体系文档（L1–L5 × 教材 × 单元模板）
[x] C 教学进度文档（12 周 + 测评节点）
[x] D 闭环接口 /api/school-progress（LLM 评估 + 规则兜底）
[x] E 前端课末回传 + 完成页/教案卡展示老师评估
[x] F 测试与 917 同步

## 6 下一步
在 917 建独立学习主页：今日任务（教案下一课）、周进度（12 周表）、评估历史（plan.lastEvaluation 列表）。

## 7 交接
课程/进度/闭环文档见 docs/OPS_课程体系_剑桥牛津对标与教学进度_v1.md；接口需 918 运行（917 代理）。教材销量无公开排名，边界已在文档写明；LLM 评估存在非确定性，规则兜底逻辑在 school-progress.ts。
