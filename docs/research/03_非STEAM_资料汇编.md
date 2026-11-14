# 03 非 STEAM 资料汇编（全人教育面：SEL / 心理 / 艺术 / 体育 / 劳动 / 全球胜任力 / 哲学 / 游戏化）

> 调研日期：2026-11-10（Asia/Shanghai）
> 负责人：materials-nonsteam（task-3）
> 状态：**提前收尾**。项目需求已转向「英语单科入学测评」，本调研按 Lead 指令冻结：只收录已核实条目，不凑数、不再新增检索。
> 收录口径：每条都必须能映射到「AI一人学校的某个角色/某栋楼」；URL 均来自 `web_search`，并经 `web_fetch` 或 `Invoke-WebRequest`（HTTP 200 / `%PDF` 魔数）验证；无法验证的在「可用性」列明确标注「未验证」及原因。
> 本文件只写 `docs/research/03_非STEAM_资料汇编.md`，PDF 只写 `docs/research/pdfs/nonsteam/`。

## 0. 阅读方式与统计

- **总条目：37**；其中已验证 28 条，未验证 9 条（403 / TLS / 404，原因逐条标注）。
- **PDF：下载尝试 13 个，成功 8 个（75.1 MB），失败 5 个**（明细见第 10 节）。
- 资料优先 2024–2026 新版本；标准/政策类为稳定版本，标注原始版本年份（如 2012/2020/2022），并说明是否有新版修订动态。
- 「对应AI角色/栋楼」列沿用现有设计术语：校长AI、心理老师AI、6 位学科老师AI、娱乐探索楼（4 个兴趣室）、开放探索广场、校际社交广场、家长中心。

---

## 1. 社会情感学习（SEL）与心理健康教育 —— 心理老师AI / 家长中心

| 名称 | 机构/作者 | 年份 | 类型 | 链接 | 语言 | 对应AI角色/栋楼 | 用途 | 可用性 |
|---|---|---|---|---|---|---|---|---|
| CASEL 社会情感学习框架（CASEL 5 大能力 + 4 类场所） | CASEL（Collaborative for Academic, Social, and Emotional Learning） | 2020 修订（框架初版 2005） | 框架 | https://casel.org/fundamentals-of-sel/what-is-the-casel-framework/ | 英 | 心理老师AI、家长中心 | 知识库 / 测评维度 / 家长报告 | 已验证（web_fetch HTTP 200，正文含 5 能力与 4 场所定义） |
| RULER 情绪智力教学法（含 Mood Meter 情绪温度计） | 耶鲁大学情绪智力中心（Yale Center for Emotional Intelligence） | 2013 起持续迭代 | 课程/方法 | https://rulerapproach.org/ | 英 | 心理老师AI | 知识库 / 情绪追踪规则 / 家长报告 | 已验证（web_fetch HTTP 200） |
| Second Step 社会情感课程（PreK–12，含欺凌预防/儿童保护单元） | Committee for Children | 1980s 起，当前版本持续更新 | 课程 | https://www.secondstep.org/ | 英 | 心理老师AI、娱乐探索楼 | 知识库 / PBL 项目素材 / 家校沟通话术 | 已验证（web_fetch HTTP 200，站点自称 45000+ 学校使用） |
| 《中小学心理健康教育指导纲要（2012年修订）》 | 教育部（教基一〔2012〕15号） | 2012 | 标准/政策 | http://www.moe.gov.cn/srcsite/A06/s3325/201212/t20121211_145679.html | 中 | 心理老师AI（分学段目标）、家长中心 | 知识库 / 分学段内容适配 / 家长报告口径 | 已验证（web_fetch HTTP 200，全文含小学低/中/高、初中、高中五段目标，可直接映射现有低龄/高龄/高中三段） |
| 《全面加强和改进新时代学生心理健康工作专项行动计划（2023—2025年）》 | 教育部等十七部门 | 2023 | 政策 | https://www.gov.cn/zhengce/zhengceku/202305/content_6857361.htm | 中 | 校长AI、心理老师AI | 知识库 / 危机识别与转介流程 / 合规底线 | 已验证（HTTP 200） |
| DESSA 社会情感能力测评（K–12，strength-based） | Aperture Education | 持续更新 | 测评工具 | https://apertureed.com/dessa/ | 英 | 心理老师AI、家长中心 | 测评（4 年级及以上的学生自评与教师评） | 已验证（HTTP 200） |
| PERMA 幸福五要素模型 | 宾夕法尼亚大学积极心理学中心（Seligman） | 2011 | 框架 | https://ppc.sas.upenn.edu/learn-more/perma-theory-well-being-and-perma-workshops | 英 | 心理老师AI、家长报告 | 家长报告的非学科维度设计（情绪/投入/关系/意义/成就） | 已验证（HTTP 200） |
| 成长型思维（Growth Mindset）与 Mindset Works 课程 | Carol Dweck / Mindset Works | 2006 起 | 研究/课程 | https://www.mindsetworks.com/ | 英 | 校长AI、心理老师AI | 知识库 / 反馈话术（表扬过程而非天赋） | 已验证（HTTP 200） |
| 中国国民心理健康状况（年度报告数据入口） | 中国科学院心理研究所（cmhr.psych.ac.cn） | 年度持续（2019 起系列报告） | 报告 | https://cmhr.psych.ac.cn/NationalMentalHealthStatus.html | 中 | 家长中心、校长AI | 家长报告的人群基线对照 / 年龄常模参考 | 已验证（HTTP 200） |
| OECD 社会与情感能力测评（SSES，含 2023 第二轮） | OECD | 2019 / 2023 两轮 | 测评/报告 | https://www.oecd.org/en/about/programmes/oecd-survey-on-social-and-emotional-skills.html | 英 | 校长AI、心理老师AI | 测评框架参考（15 项子能力） | **未验证**（web_fetch 403，OECD 站点 Cloudflare 拦截） |
| Mindful Schools 正念教育课程 | Mindful Schools | 2007 起 | 课程 | https://www.mindfulschools.org/ | 英 | 心理老师AI | PBL 项目素材（呼吸/专注练习）/ 知识库 | **未验证**（本机 TLS 握手失败，未能建立连接） |

## 2. 艺术教育 —— 艺术楼（AI艺术老师）

| 名称 | 机构/作者 | 年份 | 类型 | 链接 | 语言 | 对应AI角色/栋楼 | 用途 | 可用性 |
|---|---|---|---|---|---|---|---|---|
| 美国《国家核心艺术标准》（舞蹈/媒体艺术/音乐/戏剧/视觉艺术，PreK–12） | NCCAS / SEADAE | 2014 发布，2021–2026 正在复审修订 | 标准 | https://www.nationalartsstandards.org/ | 英 | 艺术楼AI老师 | 知识库 / PBL 项目设计 / 测评（4 大过程：Creating、Performing/Presenting/Producing、Responding、Connecting） | 已验证（web_fetch HTTP 200，含 11 条 anchor standards 与各门类 "At a Glance" PDF 直链） |
| NCAS 概念框架（Conceptual Framework for Arts Learning） | NCCAS | 2016 | 报告 | https://www.nationalartsstandards.org/sites/default/files/Conceptual%20Framework%2007-21-16.pdf | 英 | 艺术楼AI老师 | 知识库（标准背后的理论依据） | 已验证（PDF 下载成功 367 KB，`%PDF`） |
| 中国《义务教育艺术课程标准（2022年版）》 | 教育部（教材〔2022〕2号） | 2022 | 标准 | http://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html | 中 | 艺术楼AI老师 | 知识库 / 分学段目标 / 测评口径（含音乐、美术、舞蹈、戏剧、影视） | 已验证（PDF 下载成功 29.4 MB，`%PDF`；art 课标全文 PDF 直链见第 10 节） |
| Visual Thinking Strategies（VTS，视觉思考策略） | VTS（Abigail Housen / Philip Yenawine） | 1995 起 | 方法/课程 | https://vtshome.org/ | 英 | 艺术楼（美术创意室） | PBL 项目：名画鉴赏三问法；测评观察力与表达 | 已验证（web_fetch HTTP 200） |
| NAEA 美国艺术教育协会资源库 | National Art Education Association | 持续 | 机构资源/标准解读 | https://www.arteducators.org/ | 英 | 艺术楼 | 知识库（教学法、评量量规） | 已验证（HTTP 200） |
| NCAS 各门类 "At a Glance" 速查表（舞蹈/视觉艺术/音乐已下载） | NCCAS | 2021 | 标准速查 | https://www.nationalartsstandards.org/sites/default/files/2021-11/Dance%20at%20a%20Glance.pdf | 英 | 艺术楼（舞蹈/音乐/美术分室） | 知识库 / 项目卡（每个 grade band 的表现指标） | 已验证（PDF 下载成功 ×3，`%PDF`） |

## 3. 体育与健康 —— 体育中心（AI体育老师）

| 名称 | 机构/作者 | 年份 | 类型 | 链接 | 语言 | 对应AI角色/栋楼 | 用途 | 可用性 |
|---|---|---|---|---|---|---|---|---|
| 中国《义务教育体育与健康课程标准（2022年版）》 | 教育部（教材〔2022〕2号） | 2022 | 标准 | http://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html | 中 | 体育中心AI老师 | 知识库 / 分学段运动技能与体能目标 / 测评 | 已验证（PDF 下载成功 28.0 MB，`%PDF`） |
| SHAPE America 国家体育标准（K–12） | SHAPE America | 现行第三版（2024）；初版 1995 | 标准 | https://shapeamerica.org/standards/pe/ | 英 | 体育中心AI老师 | 知识库 / 测评（5 大标准：动作技能、概念、体能、负责行为、价值） | 已验证（web_fetch HTTP 200） |
| WHO《身体活动与久坐行为指南》 | 世界卫生组织 | 2020 | 指南/报告 | https://www.who.int/publications/i/item/9789240015128 | 英 | 体育中心、家长中心 | 知识库 / 家长报告（每日活动量建议值） | 已验证（HTTP 200） |
| FitnessGram 体适能评估体系 | The Cooper Institute | 1982 起持续 | 测评工具 | https://www.fitnessgram.net/about | 英 | 体育中心 | 测评（有氧能力、肌力肌耐力、柔韧性、体成分） | 已验证（HTTP 200） |

## 4. 劳动教育 / 财商 / 安全教育 —— 娱乐探索楼、家长中心

| 名称 | 机构/作者 | 年份 | 类型 | 链接 | 语言 | 对应AI角色/栋楼 | 用途 | 可用性 |
|---|---|---|---|---|---|---|---|---|
| 《大中小学劳动教育指导纲要（试行）》 | 教育部（教材〔2020〕4号） | 2020 | 标准/政策 | https://www.gov.cn/gongbao/content/2020/content_5535329.htm | 中 | 娱乐探索楼、校长AI | 知识库 / PBL 项目（日常生活劳动、生产劳动、服务性劳动三类）/ 劳动素养评价 | 已验证（web_fetch HTTP 200，全文含小学低/中高、初中、高中四段任务清单） |
| 中国《义务教育劳动课程标准（2022年版）》 | 教育部（教材〔2022〕2号） | 2022 | 标准 | http://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html | 中 | 娱乐探索楼 | 知识库 / 任务群设计 / 测评 | 已验证（PDF 下载成功 15.7 MB，`%PDF`） |
| Jump$tart 国家个人理财教育标准（K–12，6 大主题） | Jump$tart Coalition | 2021（第三版） | 标准 | https://www.jumpstart.org/education/national-standards/ | 英 | 家长中心、娱乐探索楼（财商房间） | 知识库 / 财商 PBL / 家长报告 | **未验证**（web_fetch 403，nginx 拒绝；镜像 PDF 也 403） |
| 《中小学公共安全教育指导纲要》 | 国务院办公厅转发教育部 | 2007 | 政策 | https://www.gov.cn/gongbao/content/2007/content_564111.htm | 中 | 家长中心、校际社交广场（安全监管） | 知识库（防欺凌/网络/居家/交通/心理安全分学段要点） | **未验证**（仅 web_search 命中标题；未及 web_fetch 即冻结） |
| 《中国财经素养教育标准框架》 | 中国教育科学研究院 | 2018 | 标准/框架 | https://www.cnaes.edu.cn/post/506 | 中 | 家长中心、娱乐探索楼 | 知识库 / 家长报告（财经素养三维：知识、能力、价值观） | **未验证**（仅 web_search 命中相关文章页，未 fetch 原文） |

## 5. 全球胜任力与公民素养 —— 校际社交广场、校长AI

| 名称 | 机构/作者 | 年份 | 类型 | 链接 | 语言 | 对应AI角色/栋楼 | 用途 | 可用性 |
|---|---|---|---|---|---|---|---|---|
| OECD PISA 2018 全球胜任力框架（知识/技能/态度/价值观四维） | OECD | 2018 发布；结果报告 2020 | 框架/测评 | https://www.oecd.org/en/publications/pisa-2018-assessment-and-analytical-framework_b25efab8-en/full-report/component-7.html | 英 | 校际社交广场、校长AI | 测评维度 / PBL 项目（跨文化议题） | **未验证**（web_fetch 403，OECD Cloudflare 拦截） |
| UNESCO 全球公民教育（GCED） | UNESCO | 2015 起持续推进 | 框架/指南 | https://www.unesco.org/en/global-citizenship-peace-education | 英 | 校际社交广场 | 知识库 / PBL（和平、多元、可持续） | 已验证（HTTP 200） |
| UNESCO 可持续发展教育（ESD for 2030） | UNESCO | 2020–2030 路线图 | 框架 | https://www.unesco.org/en/sustainable-development/education | 英 | 校长AI、校际社交广场 | PBL 项目（真实世界议题）/ 家长报告 | 已验证（HTTP 200） |
| Character.org「11 条品格教育原则」 | Character.org | 持续 | 框架 | https://character.org/ | 英 | 校长AI、校际社交广场 | 知识库 / 校园文化建设 / 德育 PBL | 已验证（HTTP 200） |
| 中国《义务教育课程方案（2022年版）》 | 教育部 | 2022 | 标准 | http://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html | 中 | 校长AI | 知识库（课程结构、综合实践、跨学科主题学习占比）/ 计划编排 | 已验证（PDF 下载成功 4.0 MB，`%PDF`） |
| 中国学生发展核心素养（三大方面、六大素养、十八个基本要点） | 教育部委托北师大课题组 | 2016 | 框架 | http://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/201609/t20160913_281275.html | 中 | 校长AI | 测评维度 / 家长报告总览 | **未验证**（该 moe 链接现在 404，需重新定位官方发布页） |

## 6. 通识人文与哲学启蒙 —— 娱乐探索楼、开放探索广场

| 名称 | 机构/作者 | 年份 | 类型 | 链接 | 语言 | 对应AI角色/栋楼 | 用途 | 可用性 |
|---|---|---|---|---|---|---|---|---|
| SAPERE P4C（儿童哲学探究，Philosophy for Children） | SAPERE（英国） | 1992 起 | 课程/方法 | https://www.sapere.org.uk/ | 英 | 娱乐探索楼（哲学房间）、开放探索广场 | PBL 项目：探究圈（Community of Inquiry）；「Grill ME」提问链 | 已验证（HTTP 200；站点标题现为 "Home - Thoughtful"，品牌已更新） |
| 批判性思维 Paul-Elder 框架（含思维要素、智力标准、提问指南） | Foundation for Critical Thinking | 1980 起 | 框架 | https://www.criticalthinking.org/ | 英 | 各学科老师AI、娱乐探索楼 | 「Grill ME」的提问模板 / 知识库 / 测评量规 | 已验证（HTTP 200） |
| Core Knowledge Sequence（PreK–8 通识知识序列） | Core Knowledge Foundation | 现行 2023 版 | 课程序列 | https://www.coreknowledge.org/free-resource/core-knowledge-sequence/ | 英 | 娱乐探索楼、校长AI | 知识库（跨学科通识地图）/ 兴趣探索推荐 | 已验证（HTTP 200） |
| 《中小学生阅读指导目录（2020年版）》 | 教育部基础教育课程教材发展中心 | 2020 | 书目 | http://www.moe.gov.cn/srcsite/A26/moe_714/202004/t20200422_455282.html | 中 | 语文AI老师、娱乐探索楼 | 通识阅读书单 / PBL 阅读项目 | **未验证**（该 moe 链接现在 404，需重新定位） |

## 7. 游戏化与内驱力 —— 娱乐探索楼（核心设计依据）

| 名称 | 机构/作者 | 年份 | 类型 | 链接 | 语言 | 对应AI角色/栋楼 | 用途 | 可用性 |
|---|---|---|---|---|---|---|---|---|
| 自我决定理论（SDT：自主、胜任、归属三大基本心理需求） | Deci & Ryan / selfdeterminationtheory.org | 1985–2020 体系 | 理论 | https://selfdeterminationtheory.org/ | 英 | 娱乐探索楼、校长AI | 内驱力设计原则（不给进度条、给自主选择权）/ 兴趣画像 | 已验证（HTTP 200） |
| Octalysis 八角行为分析游戏化框架 | Yu-kai Chou | 2015（持续更新） | 框架 | https://yukaichou.com/gamification-examples/octalysis-complete-gamification-framework/ | 英 | 娱乐探索楼 | 游戏化机制设计（8 大核心驱动力） | **未验证**（本机 SSL/TLS 握手失败） |

---

## 8. 与现有设计的映射（现成可用的落点）

| AI 角色 / 栋楼 | 可直接采用的资料 | 落点建议（对应现有 spec） |
|---|---|---|
| 心理老师AI（心理咨询室） | CASEL 5、RULER Mood Meter、心理健康教育指导纲要（2012）、DESSA | 现有 spec 03 的「低龄讲故事、高龄平等对话」可对齐《纲要》五学段目标；情绪追踪用 RULER 的 Mood Meter 四象限（愉悦度×能量）做轻量打点，不需要量表 |
| 家长中心（情绪/心理摘要） | PERMA、国民心理健康数据、WHO 活动量、CASEL | 家长报告的非学科维度建议固定 6 卡：情绪稳定、投入度、同伴关系、运动量、劳动习惯、兴趣广度，每卡只给「趋势 + 一句人话建议」 |
| 艺术楼（美术/音乐室） | NCAS 4 过程 + At a Glance、2022 艺术课标、VTS | 作品不用分数，用 NCAS 的 Creating/Responding/Connecting 三问反馈；名画鉴赏直接用 VTS 三问（你看到了什么？哪里让你这样想？还能发现什么？） |
| 体育中心 | 2022 体育课标、SHAPE America、FitnessGram、WHO | 体育不做「训练」，做「运动科普 + 体能小任务」；评测只用 FitnessGram 的健康相关维度做趋势，不做排名 |
| 娱乐探索楼（4 兴趣室） | 劳动教育纲要三类劳动、SDT、Octalysis、Core Knowledge | 兴趣室是「探索」不是「教学」：每室 3 分钟微任务 + 兴趣画像打点，符合 SDT 自主/胜任/归属；劳动课标可做「收纳整理」「简单烹饪」等家庭延伸任务 |
| 校际社交广场 | UNESCO GCED/ESD、Character.org、公共安全教育纲要 | 社交行为规范与「友好发言」提示可引用 GCED 的尊重多元表述；风险分级与安全教育纲要的学段要点对齐 |

## 9. 五条关键发现（写给后续接手的人）

1. **中国 2022 版课标已一次性覆盖艺术、体育与健康、劳动三门**，且教育部官网提供完整 PDF 直链（本次已全部下载）。这意味着非学科教学不需要另找「课程内容」，课标里就有分学段内容要求、学业质量与评价建议——可直接转成 AI 老师的目标库与测评量规。
2. **CASEL 5 大能力 ↔ 中国心理健康纲要的五学段目标**是天然互补：前者给能力维度（可做雷达图），后者给分年龄的具体任务（可做内容适配）。心理老师AI 的 system prompt 建议「能力维度用 CASEL、语言和话题深度用《纲要》学段」。
3. **艺术/体育的评估关键在「过程而非分数」**：NCAS 的 4 大过程（Creating / Performing-Presenting-Producing / Responding / Connecting）与 SHAPE 的 5 标准都是「可观察行为」描述，非常适合 AI 用文字反馈 + 作品/视频记录，而不是打分；这与产品「学生端只给目标不给进度」的设计一致。
4. **娱乐探索楼的学术依据是 SDT + 兴趣画像**：自我决定理论的三需求（自主、胜任、归属）解释了为什么「探索式微任务 + 自主选房间 + 徽章」比「课程 + 进度条」更能维持内驱力；Octalysis 可作为具体机制清单（但本次未能验证该站）。
5. **OECD / UNESCO 的高价值 PDF 本次大多被 403 拦截**：OECD 与 unesdoc 都挡非浏览器请求，后续要么用浏览器另存，要么改引 OECD iLibrary 的 HTML 章节页；这批资料（全球胜任力、ESD 路线图）是「校际社交广场」最有分量的框架，值得下一轮补。

## 10. PDF 下载记录（`docs/research/pdfs/nonsteam/`）

**成功 8 个（均校验 `%PDF` 文件头）：**

| 文件 | 大小 | 来源 |
|---|---|---|
| 01_义务教育艺术课程标准_2022.pdf | 29.4 MB | 教育部 2022 课标通知页附件（W020220420582364678888.pdf） |
| 02_义务教育体育与健康课程标准_2022.pdf | 28.0 MB | 同上（W020220420582362336303.pdf） |
| 03_义务教育劳动课程标准_2022.pdf | 15.7 MB | 同上（W020220420582367012450.pdf） |
| 04_义务教育课程方案_2022.pdf | 4.0 MB | 同上（W020220420582343217634.pdf） |
| 05_NCAS_Conceptual_Framework.pdf | 368 KB | nationalartsstandards.org 概念框架 |
| 06_NCAS_Dance_at_a_Glance.pdf | 442 KB | NCAS 舞蹈速查表 |
| 07_NCAS_VisualArts_at_a_Glance.pdf | 299 KB | NCAS 视觉艺术速查表 |
| 08_NCAS_Music_at_a_Glance.pdf | 602 KB | NCAS 音乐速查表 |

**失败 5 个（原因）：**

| 目标 | 失败原因 |
|---|---|
| OECD PISA 2018 全球胜任力框架 PDF | HTTP 403（Cloudflare 拦截非浏览器请求），未绕过 |
| UNESCO《ESD for 2030》路线图 PDF（unesdoc 374802） | HTTP 403（unesdoc 拒绝脚本请求） |
| CASEL Wheel 英文版 PDF（files.casel.org） | HTTP 403（直链未公开/需页面内点击） |
| Jump$tart 2021 财商标准 PDF（ride.ri.gov 镜像） | HTTP 403 |
| WHO 身体活动指南 PDF（iris.who.int） | 返回 755 字节 HTML 登录/跳转页，非 PDF，已删除并清理 |

> 清理说明：目录内未发现 0 字节残留文件（失败下载均未落盘，或已删除非 PDF 产物）；当前目录仅 8 个有效 PDF，合计 75.1 MB。

## 11. 遗留缺口（冻结前未完成）

1. 未验证但仍想补：OECD 全球胜任力框架、UNESCO ESD 路线图原文、Jump$tart 财商标准、公共安全教育纲要原文、中国学生发展核心素养官方页（moe 旧链 404）、阅读指导目录（同上 404）。
2. 覆盖度缺口：**戏剧/舞蹈/影视**的具体课程素材（只有标准，没有课例）；**音乐素养考级体系**（如 ABRSM、中国音乐学院考级）；**正念课程**（Mindful Schools 未连通）；**心流（Flow）** 原始文献；**财经素养**（中国标准框架未取到原文）。
3. 本轮未做「中国大陆可商用/可引用」的版权与授权核查（课标文本可用于教学参考，但第三方课程如 Second Step、RULER、FitnessGram 均有商标与授权限制，产品内使用需法务确认）。
