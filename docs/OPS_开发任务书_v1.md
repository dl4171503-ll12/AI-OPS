# OPS 开发任务书 v1

> 读者：执行 AI。本文件只描述功能与实现，不含项目背景、商业规划、排期与决策项。
> 结构：全文为一条任务链，每条任务含固定七字段（任务 ID｜名称 / 目标 / 输入 / 输出 / 实现步骤 / 验收标准 / 依赖）。
> 执行方式：按 ID 顺序执行；一条任务验收通过后再进入下一条；字段缺项按「全局固定约定」取值。所有产物只写代码、数据、schema、接口、脚本；不得引入本文件未出现的业务概念，不得自行新增决策点。

---

## 0. 全局固定约定（执行前先读，不再追问）

### 0.1 路径约定（只写 D 盘）

```
工程代码根：D:\OPS_工程\ops\
  ├─ apps\web\                 前端工程（Vite + React 18 + TS）
  ├─ apps\api\                 后端工程（Node 20 + NestJS + Prisma）
  ├─ packages\shared\          共享常量与类型
  ├─ data\                     运行时数据 / 种子 / 内容库
  └─ docs\                     schema、接口、规范
文档根：D:\OPS_文档\
教材数据根：D:\OPS_教材资料库\
  ├─ 20_页图\                  教材扫描页（仅内部校准）
  ├─ 30_PDF\                   教材 PDF（仅内部校准）
  └─ 40_成品包\                内容包成品（zip）
```

严禁写入 C 盘任何路径。本手册所有输出路径均以上述为前缀；教材原文（`20_页图` / `30_PDF`）只作内部校准，禁止进入任何对外产物。

### 0.2 技术栈固定值（不得改动，除非下游明确要求）

- 前端：React 18 + TypeScript + Vite；状态 Zustand；路由 React Router v6；图表 ECharts；公式 KaTeX；样式 TailwindCSS。
- 后端：Node.js 20 + NestJS；ORM Prisma；数据库 PostgreSQL 15（开发期可用 SQLite，字段类型等价）；实时通信 socket.io。
- 大模型：统一 `LLMService` + `LLMProvider` 适配器，默认 `doubao`（供应商与 Key 由环境变量 `LLM_PROVIDER` / `LLM_API_KEY` 注入）。
- 组件库：自建 `packages/shared/ui`，不引入重型 UI 框架。

### 0.3 命名与代码常量（写入 `packages/shared/src/constants.ts`）

```
学科代码：SX 数学 / YW 语文 / YY 英语 / KX 科学 / YS 艺术 / TY 体育
建筑 ID：BLD_SX 数学楼 / BLD_YW 语文楼 / BLD_YY 英语楼 / BLD_KX 科学楼 / BLD_YS 艺术楼 /
          BLD_AIHUB 第六教学楼（AI 中心）/ BLD_PRINCIPAL 校长办公楼 /
          BLD_PSY 心理咨询室 / BLD_FUN 娱乐探索楼 / BLD_SQUARE 开放式探索广场
年级：1-12（数字）；年龄段 stage：low=1-4，mid=5-9，high=10-12
难度：1-5 整数
掌握度 mastery：0-100 浮点
文件命名：仅中英文、数字、下划线 _、短横线 -；禁止空格与其它特殊字符
教材版本基线：语文=TongBian（统编版）/ 数学=RJ（人教版）/ 英语=PEP（人教版）
```

### 0.4 首发范围（已定值，不是开放输入）

- 载体：PC / 平板浏览器 Web 应用（响应式断点 1024 / 1920），不做小程序。
- 学段：小学 3-6 年级。科目：数学 / 语文 / 英语。
- 第六栋教学楼：AI 中心（`BLD_AIHUB`）。
- 教材版本基线：语文=TongBian（统编版）/ 数学=RJ（人教版）/ 英语=PEP（人教版）。
- 大模型：默认 `doubao`，Key 由环境变量注入。

以上为定值。执行中不得就以上任一项发起询问，不得输出「待确认 / 待决策 / 待补充」，也不得引入本文件未出现的业务概念。

---

## 任务链

任务按依赖串成一条直线链：T-01 → T-39。每条任务的「依赖」字段即其前置任务；无前置写「无」。

---

### T-01 工程脚手架与目录规范

- **目标**：生成可 `pnpm dev` 直接启动的前后端分离工程；前端 `/` 可打开，后端 `GET /health` 返回 `{"status":"ok"}`。
- **输入**：无。
- **输出**：
  - `D:\OPS_工程\ops\` 目录结构（见 0.1）。
  - `D:\OPS_工程\ops\apps\web\src\router\index.ts`：路由表，至少含 `/onboarding`、`/school`、`/school/building/:buildingId`、`/assessment/report/:id`、`/parent`。
  - `D:\OPS_工程\ops\apps\api\src\main.ts`：启动于端口 3000，挂 `GET /health`。
  - `D:\OPS_工程\ops\packages\shared\src\constants.ts`：写入 0.3 全部常量。
  - `D:\OPS_工程\ops\docs\README.md`：仅写启动命令、端口、环境变量名，不写说明文字。
- **实现步骤**：
  1. `pnpm init` + workspace 配置，声明 `apps/*`、`packages/*`。
  2. 用 Vite 建 `apps/web`（React+TS 模板），接入 React Router、Zustand、Tailwind、ECharts、KaTeX。
  3. 用 NestJS CLI 建 `apps/api`，加 `/health` 控制器。
  4. 建 `packages/shared`，导出 constants 与 types。
  5. 根 `package.json` 加 `dev`（并行起 web/api）、`build` 脚本。
- **验收标准**：`pnpm dev` 后浏览器访问前端端口显示空白根路由无报错；`curl localhost:3000/health` 返回 status=ok；`constants.ts` 中被 import 无 TS 报错。
- **依赖**：无。

---

### T-02 数据库 Schema 与迁移

- **目标**：`prisma migrate dev` 成功执行，生成全部表；`prisma studio` 可看到所有表。
- **输入**：T-01。
- **输出**：`D:\OPS_工程\ops\apps\api\prisma\schema.prisma`，含以下表（字段为最小必填集，主键统一 `id String @id @default(cuid())`，时间统一 `createdAt DateTime @default(now())`）：

| 表 | 关键字段 |
|---|---|
| `Student` | nickname, avatarId, grade Int, stage String, birthDate?, birthTime?, birthPlace?, learningGoal?, learningStyle?, dailyMinutes Int, schoolId |
| `School` | studentId, schoolCode String @unique, name, themeStage String, decor Json |
| `Assessment` | studentId, type String, version String, status String, scoreJson Json?, startedAt, finishedAt? |
| `AssessmentItem` | assessmentId, dimension String, questionId String, answer Json, score Float |
| `KnowledgePoint` | subject, version, grade Int, volume String, unit, lesson, kpCode String @unique, name, coreLiteracyTags String[], prerequisiteCodes String[], orderIndex Int |
| `QuestionBank` | subject, version, grade Int, kpCode, type String, difficulty Int, stem String, options Json?, answer Json, explanation String, source String, dedupHash String @unique |
| `TeachingScript` | subject, kpCode, scriptType String, content String, version |
| `Mastery` | studentId, subject, kpCode, mastery Float, attempts Int, correct Int, updatedAt |
| `ErrorBook` | studentId, subject, kpCode, questionId, wrongAnswer Json, timesWrong Int, lastWrongAt, masteredFlag Boolean |
| `LearningPlan` | studentId, subject, planDate DateTime, tasksJson Json, status String |
| `PracticeSession` | studentId, subject, planId?, startedAt, finishedAt?, score Float? |
| `PracticeRecord` | sessionId, questionId, studentAnswer Json, isCorrect Boolean, timeSpentMs Int |
| `Report` | studentId, subject String?, period String, rangeStart, rangeEnd, contentJson Json |
| `ChatMessage` | sessionId, roleType String, contentEncrypted String, riskLevel Int, createdAt |
| `MoodLog` | studentId, valence Float, tags String[], source String |
| `Achievement` | studentId, achCode String, unlockedAt |
| `PointsLedger` | studentId, delta Int, reason String |
| `InterestProfile` | studentId, room String, minutes Int, actions Int, updatedAt |
| `SocialFriend` | schoolAId, schoolBId, status String |
| `SocialMessage` | fromSchoolId, toSchoolId, contentEncrypted String, riskLevel Int, auditedAt |
| `BaziProfile` | studentId, zodiacJson Json, wuxingJson Json, enabled Boolean |
| `ParentAccount` | nickname, contact |
| `ParentLink` | studentId, parentAccountId |
| `LlmCallLog` | provider, model, promptTokens, completionTokens, latencyMs, ok Boolean, errCode? |

- **实现步骤**：
  1. 写 schema.prisma（含上表；多对多关系显式建中间表）。
  2. `prisma migrate dev --name init`。
  3. 建 seed 脚本骨架 `apps/api/prisma/seed.ts`（本任务只留空壳）。
- **验收标准**：迁移无报错；`prisma studio` 中 25 张表全部存在；`KnowledgePoint.kpCode`、`School.schoolCode`、`QuestionBank.dedupHash` 有唯一约束。
- **依赖**：T-01。

---

### T-03 LLM 统一调用层

- **目标**：调用 `LLMService.chat()` 一次，返回中文文本，并在 `LlmCallLog` 落一条记录。
- **输入**：T-02。
- **输出**：
  - `D:\OPS_工程\ops\apps\api\src\llm\llm.service.ts`
  - `D:\OPS_工程\ops\apps\api\src\llm\providers\doubao.provider.ts`、`qwen.provider.ts`
  - `D:\OPS_工程\ops\apps\api\src\llm\llm.module.ts`
  - `D:\OPS_工程\ops\apps\api\src\llm\prompts\`（本任务先放 `_base.md` 空模板）
  - 接口定义：`chat(input: {system: string; messages: {role:'user'|'assistant'; content:string}[]; jsonMode?: boolean; maxTokens?: number; temperature?: number}): Promise<{text: string; usage: {promptTokens:number; completionTokens:number}}>`
  - `LLMProvider` 接口：`{ name: string; complete(req): Promise<{text:string; usage}> }`
- **实现步骤**：
  1. 定义 `LLMProvider` 接口与 `LLMService`（按 `process.env.LLM_PROVIDER` 选适配器，默认 `doubao`）。
  2. 两个适配器实现 `complete`，读 `LLM_API_KEY`、`LLM_MODEL`。
  3. `LLMService.chat` 内做超时 30000ms、失败重试 2 次、指数退避 500ms→1500ms；`jsonMode=true` 时透传 response_format。
  4. 每次调用写 `LlmCallLog`（含 provider、model、token、latencyMs、ok）。
  5. `.env.example` 增加 `LLM_PROVIDER`、`LLM_API_KEY`、`LLM_MODEL`。
- **验收标准**：以 `system="你是测试"`、单条 user 消息调用返回非空字符串；`LlmCallLog` 新增 1 行且 `ok=true`；把 `LLM_PROVIDER` 切成另一适配器仍可跑通（Key 存在前提下）。
- **依赖**：T-02。

---

### T-04 账号 / 创建学校 / 年级选择

- **目标**：新用户完成「填名字 → 选头像 → 选年级 → 创建学校」，落库后跳转 `/school`。
- **输入**：T-01、T-02。
- **输出**：
  - 页面 `apps/web/src/pages/Onboarding.tsx`（路径 `/onboarding`）。
  - 接口：`POST /students`、`POST /schools`、`GET /students/:id`。
  - `School.schoolCode` 生成规则：6 位大写字母数字，去掉易混字符 I/O/0/1；重复则重试。
- **页面元素**：① 昵称输入框（必填，2-12 字）；② 头像选择器（12 个预设头像，单选）；③ 年级选择器（下拉 1-12）；④「创建我的学校」按钮；⑤ 点击后 2 秒建造动画再跳转。
- **实现步骤**：
  1. 年级 → stage 映射：1-4=low，5-9=mid，10-12=high，写入 `Student.stage`。
  2. 创建学校时初始化 `themeStage`=stage、`decor`={}、`schoolCode`。
  3. 前端把 `studentId` 存入 `studentStore` 与 localStorage。
- **验收标准**：填完表单创建成功，库中 `Student` 与 `School` 各 1 行且 `schoolCode` 唯一；刷新后 `/school` 仍能读到该学生；年级改动正确反映到 `stage`。
- **依赖**：T-01、T-02。

---

### T-05 主界面校园场景与六栋楼导航

- **目标**：`/school` 渲染校园场景，10 个热点可点击并跳转对应建筑。
- **输入**：T-04。
- **输出**：
  - 页面 `apps/web/src/pages/School.tsx`。
  - 校园底图资产：`apps/web/public/assets/campus/base.png`（风格对齐 `ops_school_campus.png`：俯视斜角、卡通、中央喷泉）。
  - 热点配置 `apps/web/src/config/campusHotspots.ts`，数组元素 schema：`{id: string; name: string; intro: string; x: number; y: number; w: number; h: number; route: string}`（x/y/w/h 为相对底图的百分比 0-100）。
  - 10 个热点：BLD_SX / BLD_YW / BLD_YY / BLD_KX / BLD_YS / BLD_AIHUB / BLD_PRINCIPAL / BLD_PSY / BLD_FUN / BLD_SQUARE。
- **页面元素**：校园底图；10 个热点热区；悬停显示 tooltip（名称 + 一句话简介）；点击进入 `route`；右下角音效开关。
- **实现步骤**：
  1. 生成/放置底图（中央广场居中、六栋楼环绕、其余建筑沿外圈），按底图实际位置标定 10 条热点坐标。
  2. 热点用绝对定位遮罩实现，`route=/school/building/{id}`。
  3. tooltip 用 hover 状态渲染。
- **验收标准**：1920 宽与 1024 宽下底图不变形、热点对位不偏；10 个热点点击均跳到对应 ID 的路由；悬停显示名称与简介。
- **依赖**：T-04。

---

### T-06 全局状态与角色导航栏

- **目标**：左上角显示学生身份信息，右上角显示设置与家长中心入口，数据来自 `studentStore`。
- **输入**：T-05。
- **输出**：
  - `apps/web/src/store/studentStore.ts`（当前学生、schoolCode、grade、stage、学习天数、已解锁徽章）。
  - 组件 `apps/web/src/components/TopBar.tsx`。
- **页面元素**：左上=头像 / 昵称 / 年级 / 学习天数 / 徽章图标组（超出显示 +N）；右上=设置按钮 / 家长中心按钮（跳 `/parent`）。
- **实现步骤**：
  1. 学习天数=该学生首个 `PracticeRecord` 到今日的自然日去重计数。
  2. 徽章取 `Achievement` 前 5 个。
  3. 家长中心按钮跳 `/parent`（T-25 前先放占位路由）。
- **验收标准**：TopBar 在 `/school` 及所有楼内页常驻；数值与库一致；家长中心按钮可跳转。
- **依赖**：T-05。

---

### T-07 楼内二级界面框架（通用教室模板）

- **目标**：进入任一建筑后展示统一教室布局，左侧菜单项可切换面板（初期为占位面板）。
- **输入**：T-06。
- **输出**：
  - 路由 `/school/building/:buildingId` 与可选 query `?panel=`。
  - 通用组件 `apps/web/src/components/ClassroomLayout.tsx`，props：`{title: string; teacher: {name:string; avatar:string; greeting:string}; menu: {key:string; label:string}[]; children}`。
  - 学科老师配置 `apps/web/src/config/subjectTeacher.ts`：`{subjectCode: {name, avatar, systemPromptRef}}`。
- **页面元素**：黑板区（顶部）；讲台 + AI 老师头像 + 对话气泡（左中）；左侧功能菜单（学情档案 / 今日任务 / 练习题 / 错题本 / 学习报告）；右侧内容区（渲染 `children`）。
- **实现步骤**：
  1. `<ClassroomLayout>` 接收 menu 数组渲染左栏，点击写 `?panel=`。
  2. 子内容按 panel key 条件渲染，本任务全部落占位组件。
  3. 非教学楼（BLD_PRINCIPAL 等）复用同组件，menu 由各自配置提供。
- **验收标准**：`/school/building/BLD_SX?panel=practice` 与 `?panel=errors` 正确切换右侧内容；布局在 1024 宽不塌陷；老师头像与问候正常显示。
- **依赖**：T-06。

---

### T-08 学生信息采集与档案字段

- **目标**：`/onboarding` 之后新增一屏「完善档案」，落库到 `Student` 扩展字段。
- **输入**：T-07。
- **输出**：页面 `apps/web/src/pages/ProfileSetup.tsx`；接口 `PATCH /students/:id`。
- **页面元素**：出生日期（年月日，选填）；出生时间（时辰 12 选项，选填）；出生地点（省市，选填）；当前年级（必填，默认取 onboarding 值）；学习目标（必填，下拉：巩固基础/超前学习/查漏补缺/兴趣拓展）；学习风格偏好（视觉/听觉/动觉，单选，选填）；每日可用学习时长（分钟，滑动 15-180，选填）。
- **实现步骤**：
  1. 表单校验：年级与学习目标必填，其余选填。
  2. 选填项为空时字段不写入（保持 null）。
  3. 出生时间只存时辰枚举值（子/丑/…/亥）。
- **验收标准**：只填必填项可提交成功；填全后 `Student` 相应字段均非空；出生时间存的是 12 时辰枚举而非自由文本。
- **依赖**：T-07。

---

### T-09 测评题库（I/E 六细分 + 八维智商 + 倾向性）

- **目标**：产出结构化测评题库文件，题量达标、维度齐全、每题含评分映射。
- **输入**：T-08。
- **输出**：`D:\OPS_工程\ops\data\assessment\bank_iqe_v1.json`。
- **数据结构**（JSON 数组，每题）：
  ```json
  {"qid":"IE-01","section":"IE|IQ|TENDENCY","dimension":"I-A|I-B|I-C|E-A|E-B|E-C|LOGIC|LANG|SPACE|MUSIC|KINESTHETIC|INTERPERSONAL|INTRAPERSONAL|NATURAL|ALTRUISM|FAIRNESS|HONESTY|EMPATHY|RESPONSIBILITY|AGGRESSION","type":"choice|scale|open","stem":"题干","options":[{"key":"A","text":"选项","score":3}],"reverse":false}
  ```
- **题量规则**：IE 段 12 题（6 子维度各 2 题）；IQ 段 8 维度各 4 题=32 题；TENDENCY 段 6 维度各 3 题=18 题；合计 62 题。
- **维度英文代码**：八维=LOGIC 逻辑数学 / LANG 语言 / SPACE 空间 / MUSIC 音乐 / KINESTHETIC 身体动觉 / INTERPERSONAL 人际 / INTRAPERSONAL 内省 / NATURAL 自然观察；倾向六维=ALTRUISM 利他 / FAIRNESS 公平 / HONESTY 诚实 / EMPATHY 共情 / RESPONSIBILITY 责任 / AGGRESSION 攻击性。
- **实现步骤**：
  1. 用 LLM 按 `prompts/_base.md` 派生模板逐维度生成题面草稿。
  2. 每题 `options` 的 `score` 为 0-3；`reverse=true` 表示反向计分题。
  3. 倾向段题面只描述情境（如「同学摔倒了你会」），选项不做「好/坏」措辞。
  4. 校验 JSON 可解析、qid 唯一、维度覆盖完整。
- **验收标准**：文件可被 `JSON.parse`；qid 全局唯一；62 题齐；八维与六倾向维度无缺失；无任何选项文本含「正确/错误/好孩子/坏」类评判词。
- **依赖**：T-08。

---

### T-10 测评引擎与计分算法

- **目标**：完成一次测评后产出 `Assessment.scoreJson`，含人格类型、八维分值、六维倾向档位。
- **输入**：T-09。
- **输出**：
  - 接口：`POST /assessment/start`、`POST /assessment/answer`、`POST /assessment/submit`。
  - `apps/api/src/assessment/scoring.ts`。
  - `Assessment.scoreJson` 结构：
    ```json
    {"personality":"I-C","personalityScores":{"I-A":0.2,"I-B":0.1,"I-C":0.5,"E-A":0.1,"E-B":0.05,"E-C":0.05},
     "iq":{"LOGIC":82,"LANG":65,"SPACE":91,"MUSIC":43,"KINESTHETIC":62,"INTERPERSONAL":74,"INTRAPERSONAL":85,"NATURAL":55},
     "iqPercentile":{"LOGIC":94,"LANG":68,"SPACE":98,"MUSIC":35,"KINESTHETIC":64,"INTERPERSONAL":80,"INTRAPERSONAL":93,"NATURAL":55},
     "tendency":{"ALTRUISM":"high","FAIRNESS":"mid","HONESTY":"high","EMPATHY":"mid","RESPONSIBILITY":"mid","AGGRESSION":"low"}}
    ```
- **算法规则与阈值**：
  1. 人格类型：各子维度得分 = Σ(该维度题得分) / (题数×3)，反向题用 `3-score`；取六者最大值对应子类型为 `personality`。
  2. 八维分值：`iq[dim] = round(Σ score / (题数×3) × 100)`，范围 0-100。
  3. 八维百分位：用常模 `μ=50, σ=20`，`percentile = round(Φ((iq-μ)/σ) × 100)`，clamp 1-99；`Φ` 用标准正态 CDF 近似（误差<0.5%）。
  4. 倾向档位：`t = Σ score/(n×3)×100`；`t<40 → low`，`40≤t<70 → mid`，`t≥70 → high`。只输出档位，不输出数值、不计总分、不做好坏结论。
- **实现步骤**：
  1. `start` 创建 `Assessment`（status=in_progress）并返回题目列表（乱序且不含 score）。
  2. `answer` 逐题写 `AssessmentItem`。
  3. `submit` 跑 scoring，写 `scoreJson`，status=finished。
- **验收标准**：提交一次完整测评后 `scoreJson` 六项齐全；人格类型为六子类型之一；八维分值均在 0-100；百分位均在 1-99；倾向仅出现 low/mid/high。
- **依赖**：T-09。

---

### T-11 测评报告生成与雷达图

- **目标**：`/assessment/report/:id` 展示多维雷达图 + 人格卡 + 倾向条 + AI 结论文字。
- **输入**：T-10。
- **输出**：
  - 页面 `apps/web/src/pages/AssessmentReport.tsx`。
  - 组件 `RadarChart8.tsx`、`PersonalityCard.tsx`、`TendencyBar.tsx`。
  - LLM 报告 prompt：`apps/api/src/llm/prompts/report_assessment.md`。
  - `Report` 表写入一条（period=`assessment`，contentJson 含生成的文字段）。
- **页面元素**：8 轴雷达图（0-100，点击某轴展开该维结论）；人格卡（显示类型 + 一句话特征）；倾向条（6 条，仅低/中/高）；结论文字区（3 段：优势、待提升、学习建议）。
- **实现步骤**：
  1. ECharts radar 渲染八维 `iq`。
  2. 结论文字由 LLM 生成，prompt 注入 `scoreJson` + `Student.stage`，要求用对应年龄段语言。
  3. 结果缓存到 `Report`，刷新不重复调 LLM。
- **验收标准**：雷达图八轴标签与数值正确；点击轴显示该维结论；倾向条只显示档位不显示数字；刷新页面不产生新的 LLM 调用（查 `LlmCallLog` 计数不变）。
- **依赖**：T-10。

---

### T-12 学科知识库 Schema（三层）

- **目标**：建立知识库三层（知识点层 / 题型层 / 讲解层）的数据结构与文件规范。
- **输入**：T-02。
- **输出**：
  - 复用表：`KnowledgePoint`、`QuestionBank`；新增 `TeachingScript`（已在 T-02）。
  - 文件规范 `apps/api/docs/kb_schema.md`，定义三层 JSON：
    - 知识点层文件 `data/kb/{SUBJECT}/{VERSION}/knowledge_points_G{n}.json`，元素：`{kpCode, unit, lesson, name, grade, volume, coreLiteracyTags: string[], prerequisiteCodes: string[], orderIndex}`。
    - 题型层文件 `data/kb/{SUBJECT}/{VERSION}/question_bank_G{n}.json`，元素同 `QuestionBank`。
    - 讲解层文件 `data/kb/{SUBJECT}/{VERSION}/teaching_scripts_G{n}.json`，元素：`{kpCode, scriptType:"explain"|"example"|"hint", content}`。
  - `kpCode` 规范：`{SUBJECT}-{VERSION}-G{n}-U{unit}-L{lesson}-{seq}`，例 `SX-RJ-G3-U1-L1-01`。
- **实现步骤**：
  1. 写 kb_schema.md，固定三层字段与 kpCode 规则。
  2. 写导入脚本 `apps/api/src/kb/import.ts`：读 JSON 落 `KnowledgePoint` / `QuestionBank` / `TeachingScript`，按唯一键 upsert。
  3. 讲解层只存 AI 自写稿，不存教材原文。
- **验收标准**：`import.ts` 用一份样例 JSON 跑通，三表各有 1+ 行；重复导入不产生重复行（唯一键生效）。
- **依赖**：T-02。

---

### T-13 数学知识点骨架建库（样本年级）

- **目标**：产出数学（人教版）小学 3-6 年级知识点骨架并入库。
- **输入**：T-12；教材版本基准（输入 #4 默认人教版）；内部校准资料 `D:\OPS_教材资料库\20_页图\` / `30_PDF\`。
- **输出**：`data/kb/SX/RJ/knowledge_points_G3.json` … `G6.json`（各年级一文件）。
- **实现步骤**：
  1. 以课程标准的「内容要求 / 学业要求」与教材章节目录结构为骨架来源（教材仅用于核对单元划分与顺序，不复制正文）。
  2. 逐单元拆「单元 → 课 → 知识点」，每条赋 `kpCode`、`coreLiteracyTags`（如「数感」「运算能力」「几何直观」「应用意识」）。
  3. 填 `prerequisiteCodes`（前置知识点）与 `orderIndex`（同年级内顺序）。
  4. 校验：每个知识点 `prerequisiteCodes` 全部存在于已产出的 kpCode 集合中。
  5. 跑 `import.ts` 入库。
- **验收标准**：G3-G6 四文件均存在且可解析；每条 kpCode 唯一且符合命名规范；无悬空 prerequisite；库中 `KnowledgePoint` 记录数与文件条数一致；抽查任一条不含教材原文连续语句（人工肉眼 3 条）。
- **依赖**：T-12。

---

### T-14 数学自建题库生成

- **目标**：为 T-13 每个知识点生成 ≥5 道自编题并入库，公式用 LaTeX。
- **输入**：T-13。
- **输出**：`data/kb/SX/RJ/question_bank_G3.json` … `G6.json`。
- **数据结构**：每条含 `{subject, version, grade, kpCode, type:"choice|fill|compute", difficulty, stem, options?, answer, explanation, source:"self", dedupHash}`。
- **实现步骤**：
  1. 对每个 kpCode 生成 ≥5 题，难度分布按 1:5 题 = 难度 {1,2,2,3,4}。
  2. `type=choice` 必带 4 个 `options`；`answer` 存选项 key；`fill|compute` 存标准答案字符串。
  3. 公式一律 `$...$`（行内）或 `$$...$$`（独立行）。
  4. `dedupHash = sha1(normalize(stem))`，`normalize` = 去空白 + 去标点 + 小写化；导入时去重。
  5. 禁止复制教材习题：`source` 固定 `self`，生成时 prompt 不得携带教材题目原文。
- **验收标准**：G3-G6 每题文件解析通过；每 kpCode ≥5 题；难度分布符合规则；无重复 dedupHash；随机抽 5 题题干均不与教材习题逐字相同。
- **依赖**：T-13。

---

### T-15 学情档案与掌握度模型

- **目标**：能根据练习记录更新 `Mastery.mastery`，并在学情档案页展示知识点掌握分布。
- **输入**：T-14、T-17 的 `PracticeRecord`（本任务先定义算法，接口可后置）。
- **输出**：
  - `apps/api/src/mastery/mastery.service.ts`。
  - 页面 `apps/web/src/panels/MasteryPanel.tsx`（`?panel=mastery`）。
- **算法规则与阈值**：
  1. 每题影响：`Δ = (correct ? +1 : -1) × w`，`w` 按难度：难度1→0.6，难度2/3→1.0，难度4/5→1.4。
  2. 更新：`mastery_new = clamp(mastery_old + α × Δ × 10, 0, 100)`，`α = 0.3`；首次该知识点按 `mastery_old = 50`。
  3. 掌握分层：`<60 未掌握`、`60-80 基本掌握`、`≥80 熟练`。
- **页面元素**：按单元分组的进度条列表；每个知识点显示 mastery 数值与色块（红/黄/绿对应三层）；顶部汇总（已掌握知识点数 / 总知识点数）。
- **实现步骤**：
  1. 写 `applyRecord(studentId, subject, kpCode, difficulty, correct)` 更新 `Mastery`。
  2. 面板读 `Mastery` join `KnowledgePoint` 渲染。
- **验收标准**：连续答对 3 题难度 3 后 mastery 上升且进入对应色层；答错后下降；数值始终在 0-100。
- **依赖**：T-14。

---

### T-16 个性化学习方案生成器

- **目标**：为指定学生 + 学科 + 日期生成当日 `LearningPlan.tasksJson`。
- **输入**：T-15。
- **输出**：
  - 接口 `POST /plan/generate`（body：`{studentId, subject, date}`）。
  - `apps/api/src/plan/plan.service.ts`。
  - `tasksJson` 结构：
    ```json
    {"date":"2026-10-02","subject":"SX","items":[
      {"kind":"review","kpCode":"SX-RJ-G3-U1-L1-02","questionIds":["q1","q2"],"estMin":5},
      {"kind":"new_learn","kpCode":"SX-RJ-G3-U1-L2-01","scriptRef":"explain","estMin":8},
      {"kind":"consolidate","kpCode":"SX-RJ-G3-U1-L2-01","questionIds":["q3","q4","q5"],"estMin":7}]}
    ```
- **规则与阈值**：
  1. 复习项选取：`mastery < 60` 或 `近7天 ErrorBook.timesWrong ≥ 2` 的知识点，取 orderIndex 最小者；每题 3 道同类题。
  2. 新学项选取：`Mastery` 中不存在的、orderIndex 最小的知识点；配 1 条 `explain` 讲解脚本。
  3. 巩固项：当日新学知识点配 3-5 题（低龄段 3 题、高龄段 5 题）。
  4. 总时长约束：`Σ estMin ≤ Student.dailyMinutes`（默认 30）；超出则按 review→consolidate→new_learn 顺序裁剪。
  5. 每天至多 1 个 new_learn 知识点。
- **实现步骤**：
  1. 写选取算法（上列规则）。
  2. 落 `LearningPlan`（status=`active`）。
  3. 同一学生同一天同一学科重复调用返回已存在计划，不重复生成。
- **验收标准**：生成结果的 items 仅含 review/new_learn/consolidate 三类；总时长不超 `dailyMinutes`；新学知识点 ≤1；重复调用不新增行。
- **依赖**：T-15。

---

### T-17 练习引擎与即时判分讲解

- **目标**：`?panel=practice` 可做题，提交后即时判分 + 讲解，并按规则调整后续难度。
- **输入**：T-16。
- **输出**：
  - 页面 `apps/web/src/panels/PracticePanel.tsx`。
  - 接口 `POST /practice/start`、`POST /practice/answer`、`POST /practice/submit`。
  - 判分服务 `apps/api/src/practice/grading.service.ts`。
- **页面元素**：题干区（KaTeX 渲染）；作答区（选择=选项按钮 / 填空=输入框 / 计算=输入框，支持 LaTeX 输入）；提交按钮；判分反馈（对/错）；讲解区（LLM 生成）；下一题按钮；当前难度指示器。
- **算法规则与阈值**：
  1. 判分：`choice` 比选项 key；`fill|compute` 先归一化（去空白、统一全半角、去单位空格）再等值比较；简答类走 LLM rubric 判定，返回 `{correct: boolean, reason:string}`。
  2. 自适应难度：连续答对 3 题 → 难度 +1；连续答错 2 题 → 难度 -1；难度 clamp 到 1-5。
  3. 讲解：prompt `apps/api/src/llm/prompts/explain.md` 注入 `stem/answer/studentAnswer/kpCode/stage`。
  4. 每次作答写 `PracticeRecord` 并调用 T-15 `applyRecord`。
- **验收标准**：三类题型均可作答并正确判分；答错后展示讲解；连续答对 3 题后难度指示器 +1；答错 2 题后 -1；每次作答后 `Mastery` 有变化。
- **依赖**：T-16、T-15。

---

### T-18 错题本与重练

- **目标**：`?panel=errors` 展示错题，支持按知识点重练，重练答对后移出。
- **输入**：T-17。
- **输出**：
  - 页面 `apps/web/src/panels/ErrorBookPanel.tsx`。
  - 接口 `GET /errors`、`POST /errors/:id/retry`、`POST /errors/:id/retry-submit`。
- **页面元素**：错题列表（题干 / 错误答案 / 所属知识点 / 错误次数 / 最近错误时间）；「重练」按钮；重练弹层（展示同类新题）。
- **算法规则与阈值**：
  1. 入册：作答错误时 upsert `ErrorBook`，`timesWrong +1`。
  2. 重练出题：优先取同 `kpCode`、`dedupHash` 不同、难度≤原题的题；同 kpCode 题库不足时由 LLM 生成同类题（写回 `QuestionBank`，`source="self"`）。
  3. 移出：重练答对且该 `kpCode` 的 `Mastery.mastery ≥ 80` → `masteredFlag=true`，从默认列表隐藏。
- **验收标准**：答错题目自动入册且 `timesWrong` 累加；重练返回同类不同题；满足条件后该题从默认列表消失（可切「已掌握」查看）。
- **依赖**：T-17。

---

### T-19 学习报告（日 / 周）

- **目标**：`?panel=report` 与家长端可查看日/周学习报告。
- **输入**：T-17、T-18。
- **输出**：
  - 页面 `apps/web/src/panels/ReportPanel.tsx`。
  - 接口 `POST /report/generate`（body：`{studentId, subject, period:"day"|"week", refDate}`）。
  - `Report.contentJson` 结构：
    ```json
    {"period":"day","range":{"start":"...","end":"..."},"metrics":{"studyMin":28,"kpLearned":2,"kpMastered":1,"accuracy":0.78,"errorCount":4},"sections":{"summary":"...","progress":"...","advice":"..."}}
    ```
- **实现步骤**：
  1. 聚合 `PracticeRecord` 与 `Mastery` 计算 metrics。
  2. `summary/progress/advice` 由 LLM 生成，prompt `prompts/report_learning.md` 注入 metrics + stage。
  3. 落 `Report`；同 period 同 range 已存在则直接返回，不重复生成。
- **验收标准**：日报告与周报告均可生成；metrics 数值与库一致；相同 range 重复调用不新增 LLM 调用；报告页与接口返回内容一致。
- **依赖**：T-18。

---

### T-20 学科老师模板抽象与语文 / 英语接入

- **目标**：把数学楼实现抽成通用 `SubjectTeacher`，接入语文、英语，三科闭环均可跑。
- **输入**：T-19。
- **输出**：
  - 通用容器 `apps/web/src/components/SubjectTeacher.tsx`。
  - 学科配置 `apps/web/src/config/subjects.ts`，schema：
    ```json
    {"code":"SX","name":"数学楼","teacher":{"name":"...","avatar":"...","systemPromptRef":"..."},
     "panels":["mastery","plan","practice","errors","report"],"kbVersion":"RJ"}
    ```
  - 语文知识库 `data/kb/YW/TongBian/*`、英语知识库 `data/kb/YY/PEP/*`（复用 T-13/T-14 流程）。
  - 语文 / 英语讲解 prompt：`prompts/explain_yw.md`、`prompts/explain_yy.md`（英语含中英双语讲解）。
- **实现步骤**：
  1. 把 T-15~T-19 的页面与接口参数化到 `subject` 维度（所有读写都带 `subject`）。
  2. 按 T-13/T-14 流程产出语文、英语知识点与题库（年级范围同 T-13）。
  3. 为三科各注册一条 `subjects.ts` 配置。
- **验收标准**：BLD_SX / BLD_YW / BLD_YY 三个楼均可完成 测评→方案→练习→判分→错题→报告 全流程；切换学科时数据不串（同学生不同 subject 的 `Mastery` 相互独立）。
- **依赖**：T-19。

---

### T-21 年龄段分层与界面适配

- **目标**：`Student.stage` 全局生效，界面主题与 AI 输出语言随 stage 改变。
- **输入**：T-20。
- **输出**：
  - 主题 token `apps/web/src/styles/theme.ts`，三套 `{fontScale, colorScheme, animationLevel, textDensity}`。
  - 全局读取 hook `useStage()`。
  - LLM 注入规则：所有 `chat` 调用在 system 前拼接 `stageInstruction(stage)`。
- **规则**：
  1. low（1-4）：fontScale 1.15，动画高，图多字少，讲解带拟声/比喻。
  2. mid（5-9）：fontScale 1.0，动画中，知识性增强。
  3. high（10-12）：fontScale 0.95，动画低，简洁高效，强调目标管理。
- **实现步骤**：
  1. `<body>` 挂 `data-stage`，CSS 变量切换。
  2. `LLMService.chat` 增加可选 `stage` 参数，统一注入。
  3. grade 变化时更新 stage（1-4/5-9/10-12）。
- **验收标准**：同一页面在 stage=low 与 stage=high 下字号、配色、动画明显不同；同一提问在 low 与 high 下 AI 回复措辞有明显难度差异。
- **依赖**：T-20。

---

### T-22 校长角色

- **目标**：BLD_PRINCIPAL 可进入，校长汇总全科数据并给出学习优先级建议，支持对话。
- **输入**：T-21。
- **输出**：
  - 页面 `apps/web/src/pages/Principal.tsx`。
  - 接口 `GET /principal/summary`、`POST /principal/chat`。
  - 校长 system prompt：`prompts/principal.md`。
- **页面元素**：全科学情汇总表（各科平均 mastery / 本周正确率 / 待复习知识点数）；优先级建议列表（按规则排序）；晨会卡（今日目标 + 昨日总结 + 一句鼓励）；对话框。
- **优先级排序规则**：`priority = 0.5×未掌握知识点数 + 0.3×(1-本周正确率)×100 + 0.2×近7天错误次数`，降序取前 3 科。
- **验收标准**：汇总数值与库一致；建议恰好 3 条且按优先级降序；晨会卡每天首次进入自动生成一次；（对话）校长回复体现全局视角。
- **依赖**：T-21。

---

### T-23 心理老师角色

- **目标**：BLD_PSY 可进入，心理老师按 stage 对话，情绪写入 `MoodLog`，家长端可见趋势摘要。
- **输入**：T-21。
- **输出**：
  - 页面 `apps/web/src/pages/Psychologist.tsx`。
  - 接口 `POST /psy/chat`、`GET /mood/trend`。
  - 心理老师 system prompt：`prompts/psy_low.md`、`prompts/psy_mid.md`、`prompts/psy_high.md`。
  - 对话写入 `ChatMessage`（`roleType="psy"`，内容加密），情绪写入 `MoodLog`。
- **页面元素**：温馨风格对话界面；情绪记录入口（简单表情选择）；家长端只读的「情绪趋势」摘要（近 14 天 valence 折线，不显示对话内容）。
- **实现步骤**：
  1. 按 stage 选 prompt：low 用故事/拟人化，high 用平等对话。
  2. 对话内容用 AES 加密后存 `contentEncrypted`。
  3. 每轮对话后 LLM 输出 `{valence: -1~1, tags: string[]}` 落 `MoodLog`。
- **验收标准**：三个 stage 回复风格不同；`ChatMessage` 存储为密文；家长端趋势接口只返回 valence 与 tags 不返回对话文本；连续 3 天 valence < -0.5 时家长端出现温和提醒标记。
- **依赖**：T-21。

---

### T-24 晋升仪式

- **目标**：达到某阶段毕业标准时触发晋升动画并切换全校视觉风格。
- **输入**：T-21。
- **输出**：
  - 组件 `apps/web/src/components/PromotionCeremony.tsx`。
  - 触发逻辑 `apps/api/src/stage/promotion.service.ts`。
  - `Achievement` 记录 `achCode="PROMOTE_{stage}"`。
- **触发条件（阈值）**：该 stage 覆盖年级的知识点中 `mastery ≥ 80` 的占比 ≥ 85%，且近 30 天练习正确率 ≥ 85%。
- **实现步骤**：
  1. 每次 `PracticeRecord` 后检查条件；满足则写 `Student.stage` 升级、`themeStage` 更新、写 `Achievement`。
  2. 前端收到升级标记时播放动画（全校老师集合 + 徽章 + 彩带），并把 `data-stage` 切到新值。
- **验收标准**：构造满足条件的数据可触发升级；升级后 `Student.stage` 与 `<body data-stage>` 同步变化；`Achievement` 新增对应记录；同一 stage 不重复触发。
- **依赖**：T-21。

---

### T-25 家长端入口与鉴权

- **目标**：`/parent` 独立入口，家长账号登录后只能看所关联学生的数据。
- **输入**：T-24。
- **输出**：
  - 页面 `apps/web/src/pages/ParentLogin.tsx`、`ParentHome.tsx`。
  - 接口 `POST /parent/login`、`POST /parent/link`。
  - 表 `ParentAccount`、`ParentLink`（已在 T-02）。
- **实现步骤**：
  1. 家长登录用「学生 schoolCode + 联系信息」绑定，生成会话 token。
  2. 所有家长端接口校验 token 与 `ParentLink`，只返回关联学生数据。
  3. 学生端「家长中心」按钮展示 schoolCode 供家长绑定。
- **验收标准**：未登录访问 `/parent` 被拦截；用 A 家长 token 请求 B 学生数据返回 403；登录后可看到关联学生信息。
- **依赖**：T-24。

---

### T-26 家长端六屏

- **目标**：家长端提供 6 个功能屏，数据来自学生端各模块。
- **输入**：T-25。
- **输出**：`apps/web/src/pages/ParentHome.tsx` 内含 6 个子面板 + 接口 `GET /parent/overview`、`GET /parent/errors`、`GET /parent/mood`、`GET /parent/social`、`GET /parent/milestones`、`POST /parent/encourage`。
- **六屏元素**：
  1. 学情总览：各科平均 mastery 雷达图 + 知识掌握进度。
  2. 错题本：按学科 / 知识点分类，只读。
  3. 心理状态摘要：近 14 天情绪趋势（不含对话内容）。
  4. 社交安全面板：风险事件列表 + 阀值设置（见 T-32）。
  5. 成长里程碑：晋升、徽章、连续学习天数时间线。
  6. 发鼓励消息：输入文字 → 学生端弹窗。
- **验收标准**：6 屏均可打开且数据与学生端一致；心理屏不含对话文本；鼓励消息发送后学生端能收到弹窗。
- **依赖**：T-25。

---

### T-27 成就与激励系统

- **目标**：解锁徽章、累计积分、兑换校园装饰。
- **输入**：T-24、T-26。
- **输出**：
  - 徽章定义表 `apps/api/src/achievement/rules.ts`，元素：`{achCode, name, condition, icon}`。
  - 接口 `GET /achievements`、`POST /points/redeem`。
  - `PointsLedger` 与 `School.decor`。
- **规则与阈值**：
  1. 学科徽章：单科 `mastery ≥ 80` 的知识点数达 5 / 15 / 30 → 铜/银/金。
  2. 连续学习天数：连续 3 / 7 / 30 天 → 对应徽章。
  3. 积分：答对 1 题 +1，答错不扣；每 100 分可兑换一个装饰。
  4. 装饰：种树 / 花坛 / 喷泉，写入 `School.decor`，在校园场景渲染。
- **验收标准**：构造数据可解锁对应徽章；积分流水与作答数一致；兑换后校园场景出现装饰且积分扣减。
- **依赖**：T-24。

---

### T-28 传统文化模块（八字 + 五行-学科关联）

- **目标**：可选开启的传统文化模块，支持八字排盘与五行-学科关联推荐，可一键关闭。
- **输入**：T-11、T-23。
- **输出**：
  - 页面 `apps/web/src/pages/TraditionPanel.tsx`。
  - 排盘服务 `apps/api/src/tradition/bazi.service.ts`（依赖 `lunar-javascript`）。
  - `BaziProfile` 记录（`zodiacJson`、`wuxingJson`、`enabled`）。
  - 五行-学科映射表 `apps/api/src/tradition/wuxing_map.ts`：木→语文/文学，火→数学/逻辑，土→历史/地理，金→英语/语言，水→艺术/音乐。
- **实现步骤**：
  1. 用 `Student.birthDate/birthTime/birthPlace` 排四柱、干支、五行分布、十神（简化）；出生时间缺失时用「时柱未知」占位，不阻断。
  2. 依日主喜用神从 `wuxing_map` 输出学科倾向提示。
  3. 全局开关 `enabled`；关闭时不渲染该模块入口，也不参与任何推荐。
- **验收标准**：填全出生信息可输出四柱与五行分布；缺出生时间不报错；关闭后入口消失、推荐不含传统文化项；模块结果与科学测评结果分区展示、不合并。
- **依赖**：T-11。

---

### T-29 娱乐探索楼与兴趣画像

- **目标**：BLD_FUN 可进入，含 4 个兴趣室，记录探索行为形成兴趣画像。
- **输入**：T-27。
- **输出**：
  - 页面 `apps/web/src/pages/FunBuilding.tsx` + 4 个房间子页。
  - 表 `InterestProfile`（`room, minutes, actions`）。
- **四个兴趣室**：体育兴趣室（知识/科普/名将故事）、美术创意室（AI 画画/名画欣赏）、音乐室（乐器/乐理/AI 作曲互动）、编程室（Scratch 入门/趣味挑战）。
- **实现步骤**：
  1. 每个房间进入即记录 duration，交互记录 actions。
  2. 汇总为兴趣画像：各 room 的 minutes 占比。
- **验收标准**：4 个房间均可进入并完成至少 1 个交互；`InterestProfile` 按 room 累加；画像页显示各室占比。
- **依赖**：T-27。

---

### T-30 开放式探索广场

- **目标**：BLD_SQUARE 支持自由问答与随机彩蛋。
- **输入**：T-29。
- **输出**：页面 `apps/web/src/pages/Square.tsx`；接口 `POST /square/ask`；彩蛋数据 `data/square/eggs.json`。
- **实现步骤**：
  1. 自由问答走 `LLMService.chat`，注入 stage 与 `InterestProfile` 作推荐依据。
  2. 每次进入随机从 `eggs.json` 抽 1 条小知识展示。
  3. 问答同样经 T-32 安全审核。
- **验收标准**：任意问题可返回回答；每次进入彩蛋不同（在一定范围内）；回答内容通过安全审核。
- **依赖**：T-29。

---

### T-31 校际社交

- **目标**：好友系统 + 公共广场串门 + 习题 PK + 互赠徽章。
- **输入**：T-30。
- **输出**：
  - 页面 `apps/web/src/pages/Social.tsx`。
  - 接口 `POST /social/friend/request`、`POST /social/friend/accept`、`GET /social/square`、`POST /social/pk`、`POST /social/gift`。
  - 表 `SocialFriend`、`SocialMessage`；实时走 socket.io。
- **实现步骤**：
  1. 通过 schoolCode 发起好友请求，双向确认成好友。
  2. 公共广场仅展示他校公开的成就与兴趣，可「串门」。
  3. 习题 PK：同一 kpCode 双方各答 5 题，比正确率。
  4. 互赠徽章/贴纸写入 `SocialMessage`。
- **验收标准**：加好友、串门、PK、互赠四流程均可跑通；所有消息经 T-32 审核；PK 结果正确比对。
- **依赖**：T-30。

---

### T-32 社交安全防火墙

- **目标**：所有聊天内容实时审核，风险三级处理，家长端可配置。
- **输入**：T-31。
- **输出**：
  - 审核服务 `apps/api/src/social/moderation.service.ts`。
  - 规则配置 `apps/api/src/social/rules.ts`。
- **规则与阈值**：
  1. 审核维度：个人信息泄露（姓名/学校/住址/手机号/微信等正则 + LLM 判定）、辱骂欺凌、不适龄内容。
  2. 风险分级：`riskLevel=1` 轻度 → 系统温和提醒；`riskLevel=2` 中度 → 拦截消息 + 通知家长；`riskLevel=3` 重度 → 禁言 + 强制通知家长。
  3. 家长可见性：low（1-4 年级）家长可见全部聊天；mid/high 家长仅见风险摘要。
  4. 聊天记录一律 AES 加密存储。
- **实现步骤**：
  1. 每条 `SocialMessage` 先过规则 + 过 LLM 判定，写 `riskLevel` 与 `auditedAt`。
  2. 按 riskLevel 执行提醒/拦截/禁言，并写家长端安全事件。
- **验收标准**：含手机号的测试消息被拦截（level≥2）；辱骂测试消息触发对应级别；低龄家长可见全文、高龄家长只见摘要；库中 `contentEncrypted` 为密文。
- **依赖**：T-31。

---

### T-33 教材版本地图落地

- **目标**：把教材版本数据落成可查询结构，供知识库与内容包按「科目×版本×学段」取用。
- **输入**：`D:\OPS_文档\一人学校OPS优化\教材资源清单_v1.md`（只取「学科 / 版本 / 学段 / 年级 / 官方入口」字段，其余内容不读）。
- **输出**：`D:\OPS_工程\ops\data\kb\_meta\textbook_map.json`，结构：
  ```json
  [{"subject":"SX","version":"RJ","versionName":"人教版","stage":"primary","grades":[1,2,3,4,5,6],
    "usageProvinces":["..."],"officialEntry":"https://...","verified":true,"note":""}]
  ```
- **实现步骤**：
  1. 从清单抽取「学科 × 版本 × 学段 × 省级选用 × 官方入口 × 是否已核实」。
  2. 统一版本代码（TongBian/RJ/PEP/BSD/SJ/QD/YL/WY/XJ/HJ/ZJ 等）。
  3. `verified=false` 的条目保留 `〖待核实〗` 语义（note 注明），不阻断建库。
- **验收标准**：JSON 可解析；覆盖语文（统编）、数学（≥5 版本）、英语（≥4 版本）；每条 `officialEntry` 非空或 note 注明待核实；版本代码不与常量表冲突。
- **依赖**：T-20。

---

### T-34 教材知识点骨架生成流水线（全学科模板）

- **目标**：将 T-13/T-14 的人工做法固化为可复跑流水线，批量产出任意「科目×版本×年级」的知识点与题库。
- **输入**：T-33、T-13、T-14。
- **输出**：
  - 脚本 `D:\OPS_工程\ops\scripts\kb_pipeline.ts`，参数 `--subject --version --grades`。
  - 产出落 `data/kb/{SUBJECT}/{VERSION}/knowledge_points_G{n}.json` 与 `question_bank_G{n}.json`。
  - 日志 `data/kb/_logs/kb_pipeline_{SUBJECT}_{VERSION}.log`。
- **实现步骤**：
  1. 读 `textbook_map.json` 校验版本存在。
  2. 知识点：按课标内容要求 + 章节结构生成骨架（教材仅校准，不复制正文）。
  3. 题库：逐 kpCode 生成 ≥5 题，难度分布 {1,2,2,3,4}，去重靠 `dedupHash`。
  4. 生成后跑 T-12 `import.ts` 入库，并输出校验报告（缺题 kpCode 列表、重复数、悬空前置数）。
- **验收标准**：对任一合法参数组合跑一次，产出文件齐、校验报告三项均为 0（或仅剩「待补充」清单且已列出）；重复跑同一组合结果幂等（库中无重复行）。
- **依赖**：T-33。

---

### T-35 内容包打包流水线

- **目标**：把原创内容按「科目×版本×学段」打成 zip 内容包，单包 ≤ 1GB。
- **输入**：T-34。
- **输出**：
  - 打包脚本 `D:\OPS_工程\ops\scripts\pack_content.ts`。
  - 源目录 `D:\OPS_教材资料库\40_成品包\OPS_{科目}_{版本}_{学段}_{年级}_{版本号}\`。
  - 成品 `D:\OPS_教材资料库\40_成品包\OPS_{科目}_{版本}_{学段}_{年级}_{版本号}.zip`。
  - `manifest.json` 字段：`{packName, subject, version, stage, grades, itemCount, totalBytes, generatedAt, checksum}`。
- **包内目录**：`知识点/`、`自编题目/`、`AI讲解脚本/`、`学习报告模板/`、`manifest.json`。
- **命名规范**：仅中英文、数字、`_`、`-`；结构 `OPS_{科目代码}_{版本代码}_{学段}_{年级或册次}_{版本号}`。
- **分卷规则**：单包硬上限 1GB、目标上限 0.9GB；超限按「年级 → 上册/下册 → 子模块」切分为多个各自独立的 zip（禁止多卷压缩）。
- **实现步骤**：
  1. 按包维度从 `data/kb/*` 组源目录。
  2. 写 `manifest.json`（含 byte 数、条目数、sha256）。
  3. 若总字节 > 0.9GB 触发分卷再打包。
  4. **打包前校验**：源目录内不得出现 `20_页图`、`30_PDF` 或任何教材原文/插图；出现即中止并报错。
- **验收标准**：对示例包生成 zip 且可解压；`manifest.json` 字段齐全；包内无教材原文（脚本自动校验通过）；超限组合被正确分卷为多个独立 zip。
- **依赖**：T-34。

---

### T-36 数据蒸馏与成长档案

- **目标**：汇总学生学习/错题/兴趣/情绪数据，形成可视图化成长档案。
- **输入**：T-20、T-23、T-29。
- **输出**：
  - 页面 `apps/web/src/pages/GrowthArchive.tsx`。
  - 接口 `GET /growth/:studentId`。
- **页面元素**：时间线（入学→现在的关键节点：测评、晋升、徽章、里程碑）；学习数据曲线（周正确率、周学习时长）；错题分布；兴趣占比；情绪趋势。
- **实现步骤**：
  1. 跨表聚合（`PracticeRecord`/`Mastery`/`ErrorBook`/`InterestProfile`/`MoodLog`/`Achievement`）。
  2. 时间线按 `Achievement.unlockedAt` 与晋升记录排序。
- **验收标准**：成长档案五块均渲染；数值与各来源表一致；时间线节点顺序正确。
- **依赖**：T-20。

---

### T-37 全校学习循环闭环

- **目标**：日循环打通——晨会 → 学科学习 → 报告 → 娱乐奖励解锁。
- **输入**：T-22、T-26、T-29、T-36。
- **输出**：
  - 晨会逻辑 `apps/api/src/loop/morning.service.ts`（每日首次进入 `/school` 触发）。
  - 奖励解锁逻辑 `apps/api/src/loop/reward.service.ts`。
  - 状态写入 `LearningPlan.status` 与 `Student` 当日进度。
- **规则与阈值**：
  1. 晨会触发：当日未生成晨会则生成（今日目标 + 昨日总结 + 鼓励），落 `Report`（period=`morning`）。
  2. 学科学习：按 T-16 生成的计划执行。
  3. 报告：当日练习结束后自动生成日报告（T-19）。
  4. 奖励解锁：当日 `LearningPlan.items` 完成率 ≥ 80% → 解锁 BLD_FUN 进入权限，否则进入时提示「先完成今日任务」。
- **验收标准**：一天内首进校门出现晨会且只出现一次；完成率≥80% 后娱乐楼可进入；未达标时娱乐楼被拦截并给出提示；日报告自动生成。
- **依赖**：T-36。

---

### T-38 全流程贯通与状态处理

- **目标**：注册→档案→测评→学习→报告全链路无断点；所有页面具备加载/空/错误三态。
- **输入**：T-37。
- **输出**：
  - 全局组件 `apps/web/src/components/StateViews.tsx`（`Loading`、`Empty`、`Error`）。
  - 全站请求封装 `apps/web/src/api/client.ts`（统一 loading/error/retry）。
- **实现步骤**：
  1. 所有接口调用走 `client.ts`，自动挂三态。
  2. 逐页检查：列表为空显示 Empty，请求中显示 Loading，失败显示 Error + 重试。
  3. 修复跳转断点（如无档案直接进 `/school` 应引导到 `/profile-setup`）。
- **验收标准**：断网时任意页显示 Error 且可重试；新学生无数据页显示 Empty；全链路从 `/onboarding` 可一路点到 `/report` 无白屏或死链。
- **依赖**：T-37。

---

### T-39 性能优化与 1.0 验收

- **目标**：达到发布性能指标，通过 1.0 验收清单。
- **输入**：T-38。
- **输出**：
  - 优化记录 `apps/api/docs/perf.md`（仅列优化项与前后数值）。
  - 验收结果 `apps/api/docs/acceptance_v1.md`（逐条勾选 + 实测值）。
- **实现步骤**：
  1. 首屏优化：路由懒加载、图片压缩为 webp、字体子集化。
  2. 接口优化：热点查询加索引（`Mastery(studentId,subject)`、`KnowledgePoint(subject,grade)`、`QuestionBank(kpCode,difficulty)`）、LLM 调用加结果缓存。
  3. 逐条跑 1.0 验收清单。
- **验收标准（全部满足）**：
  - 新用户 `/onboarding`→`/assessment/report`→`/school`→练习→`/report` 全流程无卡点。
  - 数学 / 语文 / 英语三科闭环均可用。
  - 校长、心理老师角色正常；家长端 6 屏可用。
  - 年龄段适配生效（low 与 high 界面与内容差异明显）。
  - 错题本、学习报告完整；娱乐楼 ≥2 兴趣室可用；社交 + 安全审核可用；晋升可触发。
  - 首屏 < 3s，AI 响应平均 < 10s（本地实测）。
- **依赖**：T-38。

---

*文件版本 v1 ｜ 读者：执行 AI ｜ 任务链：T-01 → T-39*
