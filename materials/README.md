# 教材材料目录（不入库）

本目录用于存放**你本机购买的正版教材 PDF**，不会提交到 GitHub（`.gitignore` 已忽略 `materials/**/*.pdf`）。

原因：
1. 教材受版权保护，公开仓库分发属于侵权；
2. 单本 PDF 常超过 GitHub 100MB 限制；
3. 每位使用者应自行购买/获取自己的教材。

建议把 PDF 放在本目录下，例如：

```
materials/
  OD2e L1 student's book.pdf
  OD2e_L1_Grammar_and_Vocab_WS_Unit_1.pdf
  OD2e_L1_Phonics_WS_Unit_1.pdf
  OD2e_L1_Reading_Comprehension_WS_Unit_1.pdf
  Oxford-Discover-2nd-1-Grammar.pdf
  Oxford-Discover-2nd-1-Writing-and-Spelling.pdf
```

课程内容使用 `site917/public/data/od1-units.json` 等**大纲数据**，不依赖 PDF 文件在线可用。
