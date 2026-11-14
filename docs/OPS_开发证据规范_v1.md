# OPS 开发证据规范 v1

每个任务记录：编号、需求来源、背景、备选方案、选定方案、理由、改动、验证命令、结果、实际限制、日期。

- 任务以 T-OPS-编号 标识本次集成工作，原 T-01～T-39 保持原义。
- 在提交版本控制时，提交信息带任务号；仅在明确需要提交时执行，不自动替用户提交未完成的工作。
- 测试使用隔离浏览器与合成账号，不把测试数据混入学生的日常账号。
- 截图和测试结果可作为工程证据；四周教学效果、真实路演和家长指导必须来自实际记录。
- 每个波次完成且验收后才打 tag、做版本快照；不能仅依据某个页面已存在就宣布波次完成。
- 私密档案和浏览器配置目录加入忽略规则，不进入仓库。

本次任务记录见 OPS_实施与验收记录.md；浏览器结果见 ops-browser-results.json；截图见 ops-learning.png、ops-projects.png、ops-mobile.png。

复测：先运行 npm run dev；启动隔离 Chrome（--headless=new --remote-debugging-port=9333 --user-data-dir=当前工作区/.ops-browser），再运行 node scripts/ops-engine-test.mjs、node scripts/ops-browser-test.mjs、node scripts/ops-store-test.mjs。浏览器测试会清空这个隔离配置中的 919 站点数据，不能连接日常用户浏览器。
