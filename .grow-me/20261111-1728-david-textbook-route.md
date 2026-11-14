# David 教材路线（ABC）+ 定级依据 | 状态：已完成（已定纸质教材） | 更新时间：2026-11-11 18:00
工作根：D:\Desktop\app-cjxeruyihxxd\ai-school
产物：site917/public/data/textbooks.json；site917/public/index.html（教材路线 + 纸质教材进度卡）；docs/OPS_教材体系说明与选材建议_v1.md；docs/OPS_David学习方案_ABC落地_v1.md；docs/OPS_未来内容通道规划_v1.md

## 1 目标与验收
- 回答"现有内容是哪套教材"：诚实说明为自编题库 + 标准对标，非出版社教材
- 按测评报告定级（不用人教版年级）→ 自动选择 ABC 路线与教材
- 给 David 的落地方案（12 周 + 试运行与调整规则）
- 去掉猫头鹰图案；812 释放（属于用户 UCL LH 项目）
验收：[x] 文档说明；[x] 网站按 Lx 自动选路线并可手动切换；[x] 猫头鹰移除；[x] 812 释放；[x] 测试通过

## 2 已定决策
- **教材形式（2026-11-11 定）：David 现用纸质正版教材 + OPS 系统；未来 OPS 体系化后再开数字内容通道**
- 定级只认测评报告 Lx/雅思四维；年级仅参考
- 大体系 ABC 不变；先试 2 周再调
- 教材只做大纲（单元主题/词汇/语法），不复制课文/音频
- 主页新增"纸质教材进度"手动勾 Unit（1 Unit ↔ 1 章 × 5 节）

## 3 事实（路径:行号→结论）
- textbooks.json：A=Oxford Discover+ORT；B=Kid's Box/Power Up/Prepare；C=Think/Great Writing/21st Century
- index.html：按 plan.lexLevel.id 或 lex 推导 Lx → selection 映射 route，可 localStorage 覆盖（ops917-route）
- 自编内容来源：public/items（AI 编写）、阅读改编自公有领域/Simple English Wikipedia（CC BY-SA）
- 猫头鹰：index/learn 品牌与 assessment 学习反馈中的 🦉 已移除
- 812 已停止我们的服务（用户项目端口）

## 4 验证（命令→结果）
- node scripts/test-site917.mjs → 全绿，含"按测评自动选教材路线 :: Oxford Discover 2"、"纸质教材进度可跟踪"、"页面已去掉猫头鹰图案"
- node scripts/build-assessment.mjs → 209.3KB；site917 sync → 210.9KB
- 812 listening=false（已释放）；917 listening=true
- 未来通道文档：docs/OPS_未来内容通道规划_v1.md（A 官方授权 / B 大纲合作 / C 自研 / D OER / E 机构）

## 5 DAG
[x] A 教材体系诚实说明文档
[x] B ABC 路线数据与网站自动选择
[x] C David 12 周方案 + 试运行调整规则
[x] D 去猫头鹰、释放 812
[x] E 测试与同步

## 6 下一步
等家长购书后提供 OD2 实际 Unit 目录/词汇表，映射进 917 章节；同时按 2 周试运行数据决定是否换路线或调级别。

## 7 交接
读本记录 + docs/OPS_David学习方案_ABC落地_v1.md + docs/OPS_未来内容通道规划_v1.md；812 不要占用（用户 UCL LH 项目，路径待提供）。
