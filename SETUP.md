# AI 一人学校 · 部署与自带密钥（BYO）说明

本仓库**不包含任何模型 API 密钥**，也不包含教材 PDF。克隆后需要自己配置密钥与本地材料。

## 1. 安装

```bash
npm install
cp .env.example .env   # Windows: copy .env.example .env
```

编辑 `.env`，至少填写：

| 用途 | 变量 |
|---|---|
| AI 老师 / 监督 Agent / 教案 | `PLAN_API_KEY` + `PLAN_API_BASE`（或 `DEEPSEEK_API_KEY`） |
| 老师朗读 | 默认 `TTS_PROVIDER=edge`（免费，不需要 key） |
| 学生语音识别 | 本地 Vosk（见第 3 节） |

> 不填任何大模型 key 也能启动：老师会回退到模板话术，监督走规则判定；TTS 用 Edge，ASR 用本地。

## 2. 启动

```bash
npm run dev          # 918 接口服务（AI 老师、监督、TTS/ASR 代理）
node site917/server.mjs   # 917 学习站点
```

- 917：http://127.0.0.1:917/
- 918：http://127.0.0.1:918/

## 3. 本地语音识别（可选，推荐）

```bash
pip install vosk
# 下载 vosk-model-small-en-us-0.15 并解压到任意目录，然后在 .env 填 VOSK_MODEL_DIR
python scripts/local_asr.py   # 或由 918 自动守护启动
```

## 4. 教材材料（不在仓库中）

教材 PDF 受版权保护且体积大，不随仓库分发。请自行购买正版后放在本机，例如：

```
materials/
  OD2e L1 student's book.pdf
  OD2e_L1_Grammar_and_Vocab_WS_Unit_1.pdf
  ...
```

这些路径已在 `.gitignore` 中忽略，不会被提交。

## 5. 安全

- 不要把 `.env` 提交或发给别人
- 不要把自己的 API key 写进代码/文档
- 仓库中只有 `.env.example`（空值示例）
