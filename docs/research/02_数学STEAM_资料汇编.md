# 02 · 数学 + STEAM 学科资料汇编

> 项目：AI一人学校（AI 1人学校 OPS）
> 产出：teammate `materials-mathsteam`（task-2）
> 编制日期：**2026-11-10**
> 状态：**已按 Lead 指令冻结收尾**（产品优先级临时切到「英语单科入学测评」，数学+STEAM 资料工作暂停；本文只整理**已核实**条目，未为凑数继续检索）
> 合规原则：只收录官方/机构官网与公开可下载文件；**每条 URL 均经本机 HTTP 实测（HTTP 200 或文件下载成功）**；未验证的一律标注「未验证/站点反爬」；**无编造链接、无编造数据**。

---

## 〇、一句话结论

- **课标类是最扎实的一块**：中国 2022 版《数学/科学/信息科技》课标**PDF 本体已下载归档**（共 4 份，含《课程方案》），另有 Common Core、新加坡数学大纲、PISA 2022 数学框架、TIMSS 2023 全报告、NAEP 2024 数学报告、P-12 工程学习框架 6 份英文 PDF，**合计 10 份 PDF 成功落盘**。
- **教学法/工具平台多数是「官网可引用、内容需授权」**：PBLWorks、PLTW、LEGO Education、Scratch、Code.org、Tinkercad、micro:bit 等页面均实测可达，但课程包/教材本体属商业授权，**只能引用框架、不能搬运内容**。
- **NGSS、ISTE、CSTA 三家官方 PDF 直链全部拿不到**（NGSS 文件域连接被阻断、ISTE 需邮箱换下载、CSTA 直链 404）；**标准正文可引用官网页面**，PDF 未归档，已如实记入失败清单。
- **对产品的直接价值**：课标 PDF + PISA/TIMSS/NAEP = 「校长端测评」与「家长报告」的**评分维度与分档依据**；PBL 黄金标准 + NGSS 工程设计 + P-12 工程框架 = **STEAM 第 0 层通用模板的骨架**。

---

## 一、与已有文档的关系与增量（先读再看的理由）

已读并对照的两份前序文档：

1. `docs/教材资源清单_v1.md`（2026-10，教材数据源清单）
2. `docs/教材文件可获取性实测_v1.md`（2026-10-01，教材 PDF 可获取性实测）

| 维度 | 前序文档已覆盖 | 本文**增量** |
|---|---|---|
| 教材获取渠道 | 国家中小学智慧教育平台 / 人教社 / 省级平台 / 版权合规红线 | **不重复**；只在上文"教材"条目中沿用其结论（教材整册 PDF 免登录拿不到，仅在线阅读） |
| 课程标准 | 仅在 §4.4/§4.6/§4.14 提到「依 2022 版课标」，**无课标正文与 PDF** | ✅ **课标 PDF 本体下载归档**（数学/科学/信息科技/课程方案），可直接做知识图谱骨架 |
| 国际标准 | 无 | ✅ Common Core Math、NGSS(+Appendices)、CSTA、ISTE、英国 National Curriculum、新加坡 MOE 大纲 |
| 教学法/PBL | 无 | ✅ PBLWorks 黄金标准、PLTW、LEGO Education、d.school、P-12 工程学习框架 |
| 工具平台 | 无 | ✅ Scratch、Code.org、Tinkercad、Makey Makey、micro:bit、Arduino、littleBits、Mathigon/Polypad、Brilliant |
| 评估框架 | 无 | ✅ PISA 2022/2025、TIMSS 2023、NAEP 2024 |
| 文件归档 | 实测报告只存了 6 张教材页面 JPG 样本 | ✅ `docs/research/pdfs/mathsteam/` 下 10 份 PDF（课标/公开报告，版权风险低） |

> **关键差异**：前序文档回答"**教材文件能不能拿**"，本文回答"**教学依据（课标/框架/评估）从哪来、能不能公开引用**"。二者不重叠，可并存引用。

---

## 二、课程标准（中外）

> 说明：课程标准属"版本制"文件，年份即版本；2024–2026 优先原则在此类条目不适用，故**全部标注版本年份**。所有链接均为本机实测可达。

### 2.1 中国义务教育课程标准（2022 年版）

| 名称 | 机构/作者 | 年份 | 类型 | 链接 | 语言 | 对AI老师的用途 | 可用性 |
|---|---|---|---|---|---|---|---|
| 义务教育**数学**课程标准（2022年版） | 中华人民共和国教育部 | 2022 | 标准 | [PDF（已下载）](http://www.djk.gov.cn/bmfw/ztfw/jyuly/ywjy/bzgf/202507/P020250723368468992800.pdf)；[教育部发布通知](http://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html) | 中文 | **知识库**（数与代数/图形与几何/统计与概率/综合与实践四大领域 → 数学楼知识图谱骨架）；**测评**（核心素养：数感/量感/符号意识/运算能力/几何直观/空间观念/推理意识/数据意识/模型意识/应用意识/创新意识 11 项） | 可公开引用（官方文件，引用框架合规） |
| 义务教育**科学**课程标准（2022年版） | 中华人民共和国教育部 | 2022 | 标准 | [PDF（已下载）](http://www.djk.gov.cn/bmfw/ztfw/jyuly/ywjy/bzgf/202507/P020250723368495809300.pdf) | 中文 | **知识库**（物质科学/生命科学/地球与宇宙/技术与工程 4 领域 → 科学楼知识图谱）；**PBL项目**（13 个学科核心概念 + 4 个跨学科概念）；**测评**（科学观念/科学思维/探究实践/态度责任） | 可公开引用 |
| 义务教育**信息科技**课程标准（2022年版） | 中华人民共和国教育部 | 2022 | 标准 | [PDF（已下载）](http://www.djk.gov.cn/bmfw/ztfw/jyuly/ywjy/bzgf/202507/P020250723368518462028.pdf) | 中文 | **知识库**（数据/算法/网络/信息处理/信息安全/人工智能 6 条逻辑主线）；**PBL项目**（编程与物联项目）；**测评**（信息意识/计算思维/数字化学习与创新/信息社会责任） | 可公开引用 |
| 义务教育**课程方案**（2022年版） | 中华人民共和国教育部 | 2022 | 标准 | [PDF（已下载）](http://www.djk.gov.cn/bmfw/ztfw/jyuly/ywjy/bzgf/202507/P020250723368453179258.pdf) | 中文 | **校长AI 教学链路**（课时比例、跨学科主题学习≥10% 课时 → 决定 STEAM 项目在总课时中的排期与占比） | 可公开引用 |
| 教育部等十八部门《关于加强新时代中小学科学教育工作的意见》 | 教育部等 18 部门 | 2023 | 政策 | [moe.gov.cn](http://www.moe.gov.cn/srcsite/A29/202305/t20230529_1061838.html) | 中文 | **STEAM 定位依据**（"科学教育加法"、校内外资源整合、探究实践导向 → 科学楼/探索楼的产品叙事与家长沟通口径） | 可公开引用 |

> 归档文件：`docs/research/pdfs/mathsteam/CN_义务教育数学课程标准_2022.pdf`（38.27 MB）、`CN_义务教育科学课程标准_2022.pdf`（36.06 MB）、`CN_义务教育信息科技课程标准_2022.pdf`（15.06 MB）、`CN_义务教育课程方案_2022.pdf`（3.79 MB）。
> 说明：上述 PDF 取自十堰丹江口市政府门户（gov.cn）转载的教育部附件（页面 2026-07 更新），与教育部 `教材〔2022〕2号` 通知附件一致；**正文以教育部发布版本为准**。

### 2.2 美国

| 名称 | 机构/作者 | 年份 | 类型 | 链接 | 语言 | 对AI老师的用途 | 可用性 |
|---|---|---|---|---|---|---|---|
| Common Core State Standards for Mathematics（CCSSM） | CCSSO / NGA Center | 2010 | 标准 | [PDF（已下载）](https://www.thecorestandards.org/wp-content/uploads/Math_Standards1.pdf) | 英文 | **知识库**（K-8 分年级标准 + 8 条 Mathematical Practices → 数学楼「过程能力」维度可直接映射为 AI 老师的提问策略）；**测评**（分档描述语参考） | 可公开引用（CCSS 有公开使用政策） |
| Next Generation Science Standards（NGSS） | Achieve / 26 州 | 2013（现行） | 标准 | [nextgenscience.org](https://www.nextgenscience.org/) | 英文 | **知识库 + PBL项目**：三维学习（学科核心概念 DCI / 科学与工程实践 SEP / 跨学科概念 CCC），**是"项目式科学课"最可直接套用的结构** | 可公开引用 |
| NGSS Appendices A–M（含 **Appendix I 工程设计**、Appendix F 实践进阶、Appendix E DCI 进阶） | Achieve | 2013 | 标准附录 | [Appendices 目录页](https://www.nextgenscience.org/resources/ngss-appendices) | 英文 | **PBL项目**：Appendix I = 工程设计流程（定义问题→设计方案→优化）的官方描述，可直接做 STEAM 项目的"过程性评价量表" | 可公开引用（PDF 直链本机被阻断，见失败清单） |
| CSTA K–12 Computer Science Standards | Computer Science Teachers Association | 2017（修订版） | 标准 | [csteachers.org/pk12standards](https://csteachers.org/pk12standards/) | 英文 | **知识库**：K-12 计算思维五概念（计算系统/网络与互联网/数据与分析/算法与编程/影响）+ 7 实践，适配信息科技楼 | 可公开引用 |
| ISTE Standards for Students | ISTE（现 ISTE+ASCD） | 2016 发布，**2024 起滚动更新（页面为现行版）** | 标准 | [iste.org/standards/students](https://iste.org/standards/students) | 英文 | **测评 + 家长报告**：7 条学生标准（赋能学习者/数字公民/知识建构者/创新设计者/计算思维者/创意沟通者/全球合作者），可做"数字素养"雷达图 | 可公开引用（PDF 需邮箱换取，见失败清单） |

### 2.3 英国 / 新加坡

| 名称 | 机构/作者 | 年份 | 类型 | 链接 | 语言 | 对AI老师的用途 | 可用性 |
|---|---|---|---|---|---|---|---|
| National Curriculum in England：**mathematics** programmes of study | UK Department for Education | 2013（现行） | 标准 | [gov.uk](https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study) | 英文 | **知识库对照**：KS1–KS4 分学段"目的 + 目标 + 内容"三段式，是"目标先行"写法范本（对应学生端"只给目标不给进度"） | 可公开引用（Open Government Licence） |
| National Curriculum in England：**science** programmes of study | UK DfE | 2015（现行） | 标准 | [gov.uk](https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study) | 英文 | **知识库**：KS1–KS4 科学"working scientifically"（提问/观察/测量/记录/结论）——可直接做科学楼 AI 老师的过程性追问清单 | 可公开引用 |
| National Curriculum in England：**computing** programmes of study | UK DfE | 2013（现行） | 标准 | [gov.uk](https://www.gov.uk/government/publications/national-curriculum-in-england-computing-programmes-of-study) | 英文 | **知识库**：计算（computer science）/信息技术/数字素养三分，比国内信息科技课标更早强调"计算思维" | 可公开引用 |
| National curriculum in England：framework for key stages 1 to 4 | UK DfE | 2014（现行） | 标准 | [gov.uk](https://www.gov.uk/government/publications/national-curriculum-in-england-framework-for-key-stages-1-to-4/the-national-curriculum-in-england-framework-for-key-stages-1-to-4) | 英文 | **校长AI**：全学科课时与学段结构参照（含 KS1–KS4 全科清单） | 可公开引用 |
| Singapore MOE **Mathematics Syllabus Primary One to Six** | Ministry of Education, Singapore | 2021 | 标准 | [PDF（已下载）](https://www.moe.gov.sg/media/files/primary/2021-primary-mathematics-syllabus-p1-to-p6.pdf) | 英文 | **知识库 + 教学法**：新加坡"五边形"框架（概念/技能/过程/元认知/态度）+ 螺旋式进阶，是 CPA 建模法的**官方上位依据** | 可公开引用 |

---

## 三、教材与教学法

> 边界提醒：教材本体受著作权保护。**下表教材类条目仅作"知识结构参照"，禁止整册原文入库/商用再分发**（合规依据见 `docs/教材资源清单_v1.md` 第七节）。

| 名称 | 机构/作者 | 年份 | 类型 | 链接 | 语言 | 对AI老师的用途 | 可用性 |
|---|---|---|---|---|---|---|---|
| 人教版义务教育数学电子教材 | 人民教育出版社 | 现行（2024 秋起替换为 2022 版课标教材） | 教材 | [jc.pep.com.cn](https://jc.pep.com.cn/) | 中文 | **知识库参照**：章节顺序/例题梯度做"知识点粒度"校准（不可整册搬运） | **需授权**（仅在线阅读；商用须人教社授权，见前序实测报告 §2/§7） |
| 北师大版 / 苏教版数学数字教材 | 北京师范大学出版社 / 江苏凤凰 | 现行 | 教材 | 北师大数字教材 App `bsszjc.com`（前序文档实测 200，仅 App 内阅读） | 中文 | 同上，作**多版本差异对照**（同一知识点不同引入方式 → AI 老师可切换讲法） | **需授权**（无公开 PDF 导出，前序文档 §4 结论） |
| Singapore Math **Primary Mathematics**（CPA 建模法） | Singapore Math Inc.（美国出版方，源于新加坡课程） | 现行 | 教材/方法 | [singaporemath.com](https://www.singaporemath.com/) | 英文 | **PBL项目 + 知识库**：CPA（Concrete 具体→Pictorial 图示→Abstract 抽象）三步建模，**是数学楼"讲题"流程的最佳模板**（先给实物/条形图，再给算式） | 仅参考（课程/教材需购买授权） |
| **Math in Focus**（Singapore Math 美版） | Houghton Mifflin Harcourt (HMH) | 现行（2020 版） | 教材 | [hmhco.com/programs/math-in-focus](https://www.hmhco.com/programs/math-in-focus) | 英文 | 参考其**"Bar Modeling 条形模型"任务设计**与可视化习题编排 | 仅参考（商业授权） |
| **PBLWorks Gold Standard PBL**（项目设计 7 要素 + 教学实践 7 要素） | PBLWorks（原 Buck Institute for Education, BIE） | 现行 | 框架 | [pblworks.org](https://www.pblworks.org/what-is-pbl/gold-standard-project-design) | 英文 | **PBL项目**：7 要素（挑战性问题/持续探究/真实性/学生发言权与选择权/反思/批评与修订/公开成果）→ **直接作为 STEAM 第 0 层模板的验收清单** | 可公开引用（框架可引用，课程与培训需授权） |
| **Project Lead The Way（PLTW）** | PLTW | 现行 | 课程框架 | [pltw.org](https://www.pltw.org/) | 英文 | **PBL项目**：K-5 Launch / 6-8 Gateway / 9-12 三段的工程与生物医学项目链路，参考其"活动-项目-问题"三级递进 | 仅参考（课程授权制，价格不公开） |
| **LEGO Education**（SPIKE / 头脑风暴） | LEGO Education | 现行 | 教具/课程 | [education.lego.com](https://education.lego.com/) | 多语言（含中文站） | **PBL项目**：硬件项目式任务 + 可编程积木；**STEAM 第 0 层**"动手搭建 + 编程 + 记录"三件套的来源 | 仅参考（教具与课程包需采购） |
| **Design Thinking Bootleg**（设计思维流程卡） | Stanford d.school | 2018（Bootleg 版本） | 框架 | [dschool.stanford.edu/tools/design-thinking-bootleg](https://dschool.stanford.edu/tools/design-thinking-bootleg) | 英文 | **PBL项目**：同理心→定义→构思→原型→测试 5 阶段 + 具体方法卡，做"探索楼"项目的标准流程 | 可公开引用（CC 授权，需按页面说明署名） |
| **Framework for P-12 Engineering Learning** | ASEE（美国工程教育学会）/ EDC | 2020 | 框架 | [PDF（已下载）](https://stelar.edc.org/sites/default/files/2024-05/Framework-for-P-12-Engineering-Learning-1.pdf) | 英文 | **STEAM 第 0 层核心骨架**：工程素养的 3 个维度（工程知识/工程实践/工程思维习惯）+ 学习进阶，比 NGSS 更适合做"能力分级" | 可公开引用（PDF 公开下载） |

---

## 四、工具平台（编程 / 造物 / 硬件）

> 用途定位：这些是**项目执行环境**，不是知识库内容。AI 老师负责"派任务 + 看产出"，平台负责"让学生真的做出来"。

| 名称 | 机构/作者 | 年份 | 类型 | 链接 | 语言 | 对AI老师的用途 | 可用性 |
|---|---|---|---|---|---|---|---|
| **Scratch** | MIT Media Lab | 现行 | 工具平台 | [scratch.mit.edu](https://scratch.mit.edu/) | 多语言（含中文） | **PBL项目**：图形化编程主环境；作品可导出/分享 → 学生端"公开成果"载体 | 可公开引用（免费；作品 CC BY-SA） |
| **Code.org CS Fundamentals** | Code.org | 现行 | 课程/平台 | [code.org/curriculum/csf](https://code.org/curriculum/csf) | 多语言（含中文） | **PBL项目 + 测评**：K-5 计算思维课程 + 进度追踪，可直接做信息科技楼的分级任务链 | 可公开引用（课程 CC BY-NC-SA，商用需注意 NC 限制） |
| **Tinkercad** | Autodesk | 现行 | 工具平台 | [tinkercad.com](https://www.tinkercad.com/) | 多语言 | **PBL项目**：3D 建模 + 电路仿真（免硬件即可做"电路/结构"项目）→ 降低 STEAM 家庭端硬件门槛 | 可公开引用（免费，需账号） |
| **Makey Makey** | Makey Makey（JoyLabz） | 现行 | 硬件 | [makeymakey.com](https://makeymakey.com/) | 英文 | **PBL项目**：把水果/黏土变成键盘 → 低龄段"物理+编程"跨学科项目首选 | 仅参考（硬件需购买） |
| **micro:bit** | Micro:bit Educational Foundation | 现行 | 硬件/课程 | [microbit.org](https://microbit.org/) | 多语言（含中文） | **PBL项目**：传感器 + 无线，适合"数据采集类"科学项目（如温度/光线记录 → 回传家长报告图表） | 可公开引用（教学资源免费；硬件采购） |
| **Arduino Education** | Arduino | 现行 | 硬件/课程 | [arduino.cc/education](https://www.arduino.cc/education) | 英文 | **PBL项目**：6-12 年级电子/机器人项目；梯度比 micro:bit 更陡 | 仅参考（套件授权制） |
| **littleBits** | littleBits（Sphero 旗下） | 现行 | 硬件 | [littlebits.com](https://littlebits.com/) | 英文 | **PBL项目**：磁吸电子模块，低门槛电路启蒙（可作为 Tinkercad 仿真的实物延伸） | 仅参考（硬件需购买） |

---

## 五、数学思维 / 竞赛 / 拓展

| 名称 | 机构/作者 | 年份 | 类型 | 链接 | 语言 | 对AI老师的用途 | 可用性 |
|---|---|---|---|---|---|---|---|
| **Math Kangaroo**（袋鼠数学） | Math Kangaroo USA | 现行 | 竞赛 | [mathkangaroo.org](https://mathkangaroo.org/) | 英文 | **测评**：1-12 年级分级的"趣味应用题"题型库 → 给"拔高档"学生出拓展题（不可整卷搬运） | 仅参考（题目版权归主办方） |
| **AMC 8 / MAA** | Mathematical Association of America | 现行 | 竞赛 | [maa.org/student-programs/amc/](https://maa.org/student-programs/amc/) | 英文 | **测评**：8 年级及以下竞赛定位，参考其"25 题/40 分钟"难度梯度 | 仅参考（本机实测 **403 反爬**，内容未验证） |
| **Mathigon / Polypad** | Mathigon（现属 Amplify） | 现行 | 工具平台 | [mathigon.org](https://mathigon.org/) / [polypad.amplify.com](https://polypad.amplify.com/) | 英文 | **知识库 + 教学**：可交互的数学"教科书"与虚拟教具（分数墙/数轴/几何拼图）→ 数学楼讲"图形与几何"时的可视化画布参考 | 可公开引用（Polypad 免费；内容 CC 授权需核对） |
| **Brilliant** | Brilliant.org | 现行 | 平台 | [brilliant.org](https://brilliant.org/) | 英文 | 参考其"**短交互 + 即时反馈**"的练习设计（不是看视频，而是每一步都动手）→ 学生端任务卡形态参考 | 仅参考（订阅制，内容不可复制） |

---

## 六、评估框架与权威报告

> 这是「校长端测评 → 定计划」与「家长端报告」的**外部效标来源**：我们的分档不能拍脑袋，要能对上国际测评的维度。

| 名称 | 机构/作者 | 年份 | 类型 | 链接 | 语言 | 对AI老师的用途 | 可用性 |
|---|---|---|---|---|---|---|---|
| **PISA 2022 Mathematics Framework** | OECD | 2022（框架 2019 草案版 PDF） | 框架 | [pisa2022-maths.oecd.org](https://pisa2022-maths.oecd.org/)；[PDF（已下载，草案版）](https://pisa2022-maths.oecd.org/files/PISA%202022%20Mathematics%20Framework%20Draft.pdf) | 英文 | **测评**：数学素养三过程（**表述情境 / 运用概念·事实·程序 / 解释与评价**）+ 4 类情境内容 → 校长端测评的"能力分档"直接可借 | 可公开引用（OECD 允许非商用引用；商用需核对其条款） |
| **PISA 2025 Science Framework** | OECD | 2025 | 框架 | [pisa-framework.oecd.org/science-2025](https://pisa-framework.oecd.org/science-2025/) | 英文 | **测评**：科学素养三能力（**解释现象 / 评估与设计探究 / 解读数据与证据**）→ 科学楼过程性评价维度 | 可公开引用（同上） |
| **TIMSS 2023 International Results in Mathematics and Science** | IEA（国际教育成就评价协会） | 2024 结果 / 2026-06 修订 PDF | 报告 | [timss2023.org](https://timss2023.org/)；[全报告 PDF（已下载，17.0 MB）](https://timss2023.org/wp-content/uploads/2026/06/T23_InternationalResults_FullReport.pdf) | 英文 | **测评 + 家长报告**：4/8 年级数学与科学**内容域 × 认知域**（知道/应用/推理）双维矩阵 → 家长报告"学科对比"的维度来源 | 可公开引用 |
| **NAEP 2024 Mathematics: Grades 4 & 8** | 美国 NCES（国家教育统计中心） | 评估年 2024（报告 2024–25） | 报告 | [nationsreportcard.gov](https://nces.ed.gov/nationsreportcard/)；[ERIC 全文 PDF（已下载，5.47 MB）](https://files.eric.ed.gov/fulltext/ED675354.pdf) | 英文 | **测评**：NAEP 成就水平（Basic/Proficient/Advanced）分档描述语 → 家长报告"等级措辞"参考 | 可公开引用（美国政府公开出版物） |

---

## 七、PDF 下载清单（成功 10 / 失败 8）

> 目录：`docs/research/pdfs/mathsteam/`　校验方式：文件大小 + `%PDF` 魔数 + 实际落盘，**不存在 0 字节空文件**（已逐一复核）。

### 7.1 ✅ 成功（10 份，合计约 129 MB）

| # | 文件名 | 大小 | 来源 | 版权状态 |
|---|---|---|---|---|
| 1 | `CN_义务教育数学课程标准_2022.pdf` | 38.27 MB | djk.gov.cn（教育部附件转载） | 官方文件，可引用 |
| 2 | `CN_义务教育科学课程标准_2022.pdf` | 36.06 MB | 同上 | 官方文件，可引用 |
| 3 | `CN_义务教育信息科技课程标准_2022.pdf` | 15.06 MB | 同上 | 官方文件，可引用 |
| 4 | `CN_义务教育课程方案_2022.pdf` | 3.79 MB | 同上 | 官方文件，可引用 |
| 5 | `US_CommonCore_Math_Standards.pdf` | 1.18 MB | thecorestandards.org | 公开标准 |
| 6 | `SG_MOE_PrimaryMathematics_Syllabus_P1-P6_2021.pdf` | 0.77 MB | moe.gov.sg | 公开标准 |
| 7 | `OECD_PISA2022_Mathematics_Framework.pdf` | 6.98 MB | pisa2022-maths.oecd.org（草案版） | OECD 公开 |
| 8 | `IEA_TIMSS2023_InternationalResults_FullReport.pdf` | 17.04 MB | timss2023.org | IEA 公开报告 |
| 9 | `US_Framework_for_P-12_Engineering_Learning.pdf` | 5.43 MB | stelar.edc.org（ASEE 框架） | 公开框架 |
| 10 | `US_NAEP2024_Mathematics_G4G8.pdf` | 5.47 MB | files.eric.ed.gov（ERIC ED675354） | 美国政府公开 |

### 7.2 ❌ 下载失败（8 项，含原因）

| # | 目标 | 失败原因（实测） | 后续处理 |
|---|---|---|---|
| 1 | NGSS Appendix I / Appendix F（工程设计、实践进阶） | `nextgenscience.org/sites/default/files/...` **连接被意外关闭**（HEAD/GET 均被阻断，疑似文件域反爬或地域限制） | 正文内容改用 Appendices **网页版**（已实测 200）引用；如需 PDF，建议由可访问网络的成员用浏览器手动另存 |
| 2 | ISTE Standards for Students 官方 PDF（one-sheet） | 猜测直链 **404**（`cdn.iste.org/.../iste-standards_one-sheets_students-*_v2.pdf`）；官网实际走**邮箱提交后下载**，无公开直链 | 以网页版（1.1–1.7 指标全文，已实测 200）为引用依据 |
| 3 | CSTA K–12 CS Standards 官方 PDF | `csteachers.org/.../CSTA_K-12_Computer_Science_Standards.pdf` **404**（站点路径已改版） | 引用 `csteachers.org/pk12standards` 网页版 |
| 4 | Stanford d.school Design Thinking Bootleg PDF | `dschool.stanford.edu/sites/default/files/2023-09/design-thinking-bootleg-2023.pdf` **404**；工具页可达但 PDF 实际存放路径未定位 | 引用工具页；PDF 需在页面内按提示下载 |
| 5 | Harvard "Creative Computing Curriculum Guide"（Scratch 教学指南） | `scratched.gse.harvard.edu` **TLS 证书信任失败**（本机 SSL 校验不通过） | 未归档；如需可换 `imschools.org` 镜像（第三方转载，未验证），不推荐 |
| 6 | PISA 2025 Science Framework PDF | `pisa2025-science.oecd.org/files/...` 连接失败（域名/路径不匹配） | 改用 `pisa-framework.oecd.org/science-2025` 网页版（已实测 200） |
| 7 | PISA 2022 Results Volume I 全报告 PDF | OECD 内容分发域 **请求超时**（大文件 + 分发域限流） | 已有 PISA 2022 **数学框架** PDF 替代，满足"测评维度"用途 |
| 8 | AMC 8 / MAA 竞赛页 | `maa.org/student-programs/amc/` 返回 **403 禁止访问** | 条目保留但标「未验证」；不引用其具体内容 |

---

## 八、对 AI 一人学校的落地建议（精简版，6 条）

> 按 Lead 要求只保留最可执行的结论，不展开长篇。

1. **数学楼：用「课标四领域 + CPA 三步」定讲课骨架。** 知识图谱直接以《义务教育数学课程标准（2022年版）》四领域为一级节点（数与代数/图形与几何/统计与概率/综合与实践），讲授时强制走"具体物→图示（条形模型）→算式"三步（新加坡 CPA），避免 AI 直接甩公式。11 项核心素养作为学生画像的隐藏维度，**不对学生展示进度、只展示目标**。

2. **科学楼：用「NGSS 三维 + 英国 working scientifically」定过程评价。** 每个项目同时挂三个标签：学科核心概念（DCI）、实践（SEP）、跨学科概念（CCC）；过程性追问清单直接取英国课标"提问/观察/测量/记录/结论"五步，正好喂给 AI 老师的提问循环（loop engineering）。

3. **STEAM 第 0 层通用模板该装什么（最小集）：** ①PBLWorks 黄金标准 7 要素作为**项目卡模板字段**；②NGSS Appendix I 工程设计流程（定义问题→设计方案→优化迭代）作为**项目阶段机**；③P-12 工程学习框架的"工程实践 + 思维习惯"作为**能力分级表**；④固定产出物：Scratch/Tinkercad 作品链接 + 一页"设计说明"；⑤固定复核点：上级 AI（校长/科学楼长）确认后才能开教。**不含**任何出版社教材原文。

4. **校长端测评：分档依据直接借用 PISA 2022 + TIMSS 2023 双矩阵。** PISA 三过程（表述情境/运用/解释评价）负责"会不会用"，TIMSS 的"知道/应用/推理"认知域负责"想到多深"；两轴交叉即得 3×3 的能力格子，比自造分档更有外部信度。

5. **家长报告：维度与措辞从 NAEP + TIMSS 借。** 图表口径用 TIMSS 的"内容域 × 认知域"，等级措辞参考 NAEP 的 Basic/Proficient/Advanced 三级（中文改写为"达标/熟练/拓展"），保证"一周升降、学科对比、综合分"三项都有出处，而非拍脑袋。

6. **数据与合规：课标/公开报告类 PDF 可放心入本地知识库；教材与商业课程包一律不进库。** 本次归档的 10 份 PDF 全部是标准/政策/公开报告，版权风险低；人教版/北师大版/苏教版、Math in Focus、PLTW、LEGO 课程包只做"结构参照"，商用前需授权（依据前序 `教材资源清单_v1.md` 第七节）。

---

## 九、遗留缺口与未验证项

| # | 缺口 | 影响 | 建议 |
|---|---|---|---|
| 1 | NGSS/ISTE/CSTA 三家 **PDF 未归档** | 引用需联网看网页版，离线知识库缺原文 | 由能访问外网的成员浏览器手动另存，或改用官方网页抓取正文 |
| 2 | 中国**科学/信息科技**课标只取到教育部转载站（gov.cn 市级门户） | 与教育部原件应为同一文件，但无官方直链留痕 | 上线前用 `moe.gov.cn` 原通知附件再核一次哈希 |
| 3 | 未覆盖**初中物理/化学/生物**课标 | 科学楼若扩展到初中段，缺上位依据 | 同一附件包内已有（附件 11–13），可直接补下，本次因冻结未做 |
| 4 | 中国 PBL/STEAM 教育**本土实证研究**未检索 | 「PBL 在中国课堂的效果」缺中文证据链 | 需 CNKI/万方等授权库，公开渠道拿不到全文；建议走机构订阅 |
| 5 | 未检索 **2024–2026 新课标修订/补充文件**（如科学教育加法配套、AI 通识教育指南） | 可能错过最新政策朝向 | 冻结解除后优先补：教育部 2024–2026 科学教育/AI 教育类文件 |
| 6 | AMC/MAA 站点 403，Math Kangaroo 题目版权未核 | 拓展题源不能直接入库 | 只做"题型参考"，题目自命制 |
| 7 | 未做「数学楼/科学楼」与现有 `docs/specs/02_学科AI老师.md` 的对齐 | 资料与产品 spec 可能错位 | 解冻后由 Lead 统一对齐（本文档只提供资料侧） |

---

## 十、链接总表（便于逐条复核）

**中国**
- 教育部 2022 课标发布通知：http://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html
- 课标 PDF 附件页（十堰丹江口市 gov.cn 转载）：http://www.djk.gov.cn/bmfw/ztfw/jyuly/ywjy/bzgf/202507/t20250723_4783885.shtml
- 教育部等十八部门科学教育意见（2023）：http://www.moe.gov.cn/srcsite/A29/202305/t20230529_1061838.html
- 人教社电子教材：https://jc.pep.com.cn/

**美国 / 国际标准**
- Common Core Math PDF：https://www.thecorestandards.org/wp-content/uploads/Math_Standards1.pdf
- NGSS：https://www.nextgenscience.org/ ｜ Appendices：https://www.nextgenscience.org/resources/ngss-appendices
- CSTA：https://csteachers.org/pk12standards/
- ISTE Students：https://iste.org/standards/students
- P-12 Engineering Learning PDF：https://stelar.edc.org/sites/default/files/2024-05/Framework-for-P-12-Engineering-Learning-1.pdf
- PBLWorks Gold Standard PBL：https://www.pblworks.org/what-is-pbl/gold-standard-project-design

**英国 / 新加坡**
- UK maths / science / computing programmes of study：见 §2.3 各 gov.uk 链接
- Singapore MOE 小学数学大纲 PDF：https://www.moe.gov.sg/media/files/primary/2021-primary-mathematics-syllabus-p1-to-p6.pdf

**评估**
- PISA 2022 数学框架：https://pisa2022-maths.oecd.org/
- PISA 2025 科学框架：https://pisa-framework.oecd.org/science-2025/
- TIMSS 2023：https://timss2023.org/
- NAEP：https://nces.ed.gov/nationsreportcard/

**工具平台**
- Scratch：https://scratch.mit.edu/ ｜ Code.org CSF：https://code.org/curriculum/csf
- Tinkercad：https://www.tinkercad.com/ ｜ Mathigon：https://mathigon.org/ ｜ Polypad：https://polypad.amplify.com/
- Makey Makey：https://makeymakey.com/ ｜ micro:bit：https://microbit.org/ ｜ Arduino Education：https://www.arduino.cc/education ｜ littleBits：https://littlebits.com/
- 教材/方法：https://www.singaporemath.com/ ｜ https://www.hmhco.com/programs/math-in-focus
- PBL/硬件课程：https://www.pltw.org/ ｜ https://education.lego.com/
- 拓展：https://mathkangaroo.org/ ｜ https://brilliant.org/

---

*本文档为「资料侧」冻结收尾版（2026-11-10）。所有链接经本机实测；标「未验证」「失败」处请勿直接作为执行依据。等数学+STEAM 解冻后，按 §9 缺口清单补齐即可升级为 v2。*
