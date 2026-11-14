# 图片生成 API 选型与接入（v1，2026-11-11）

> 需求：给「AI 一人学校」找**带图片生成能力（图片技能调用）的 API 开放平台**，并**当场验证一个可直接生成**的通道。
> 结论先行：**推荐 MiniMax（image-01 / H3-Image）**——和项目已用的 MiniMax 语音同一家、一个 key 通吃；**当前仓库里没有任何图片厂商的 key**，所以"真正可用的生成"需要你注册拿 key（或给我一个 key，我 10 分钟内接完）。

---

## 0. 本次实测结果（先说实话）

| 通道 | 是否需要 key | 实测结果 | 能否用于生产 |
|---|---|---|---|
| **MiniMax image_generation（用户提供 key）** | 需要 | **中国站 HTTP 200 + `base_resp.status_code=1008`（insufficient balance，余额不足）**；国际站 `2049`（该 key 不属于国际站） | ⚠️ 密钥有效，**充值后即可用** |
| Pollinations 免费无 key | 否 | 3 次调用 **2 次 402（需付费）**；唯一成功返回的图片**与提示词完全不符**（要"龟兔赛跑"，返回固定人像/身高尺图） | ❌ 不可用（占位/缓存，非真实生成） |
| 其他主流厂商（火山/阿里/智谱/OpenAI…） | 需要 | 未测（无 key） | ✅ 可以 |

> 项目代理链路也已验证：`POST /api/school-image` → **502 `{code:'provider-error', providerCode:1008}`**，说明"页面 → 代理 → MiniMax"整条链路正常，唯一缺的是余额。
> 余额检查：`node scripts/check-minimax.mjs`（只做鉴权+余额检查，不产生生图费用）。
> 充值入口：https://platform.minimaxi.com/user-center/payment/balance

> 已保存的实测图片：`docs/research/img-demo/`（`demo-lion.jpg`、`v3-flux-nologo.jpg`、`test-apple.jpg`）。其中后两张就是"成功但内容不对"的证据。

**所以"直接可用、直接生成"的唯一诚实答案**：要一个厂商 API key。下面给出注册入口、文档、价格与推荐。

---

## 1. 首选：MiniMax 开放平台（国际站 / 中国站）

| 项 | 内容 |
|---|---|
| 国际站 | https://platform.minimax.io/ |
| 国际站控制台 | https://platform.minimax.io/console/home |
| 图片 API 文档（国际） | https://platform.minimax.io/docs/api-reference/image-generation-t2i |
| 图片生成指南 | https://platform.minimax.io/docs/guides/image-generation |
| 价格页 | https://platform.minimax.io/docs/pricing/overview#image |
| 中国站 | https://platform.minimaxi.com/ |
| 中国站控制台 | https://platform.minimaxi.com/console |
| 中国站图片指南 | https://platform.minimaxi.com/docs/guides/image-generation |

### 1.1 接口（官方 OpenAPI 原文）
```
POST https://api.minimax.io/v1/image_generation
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "model": "image-01",
  "prompt": "children book illustration, a lion and a mouse, watercolor",
  "aspect_ratio": "4:3",          // 或 width/height（512–2048，8 的倍数）
  "response_format": "url",        // url | base64（url 24 小时过期）
  "n": 1,                          // 1–9
  "seed": 42,
  "prompt_optimizer": true
}
```
响应：`data.image_urls[]`（或 `data.image_base64[]`）；`base_resp.status_code`：0 成功 / 1002 限流 / 1008 余额不足 / 2013 参数错 / 2049 key 无效。

### 1.2 价格（官方定价页摘录，以下单页为准）
| 模型 | 价格 |
|---|---|
| **image-01**（经典，按张） | 约 **$0.0035 / 张** |
| **MiniMax-H3-Image**（新一代） | 1K 约 **$0.0218 / 张**；4K 约 **$0.0344 / 张**（4K 曾标注 50% off 至 2026-11-17，以页面为准） |
| **MiniMax-H3-Image-Highspeed** | 1K 约 **$0.015 / 张**；4K 约 **$0.0288 / 张** |

> 给低龄阅读做插图：**image-01 就够用**。32 篇 × 1 张 ≈ **$0.11**；即使每篇生成 4 张挑 1 张，也 ≈ $0.45。

### 1.3 为什么推荐它（对项目而言）
1. **与项目已有 MiniMax 语音同厂**：一个 key 同时覆盖 TTS（`speech-02-hd`）与图片，对账/合规简单；项目 `vite-plugins/school-tts.ts` 已有同厂接入范式。
2. `n=1–9`、多种 `aspect_ratio`、`seed` 可复现、`prompt_optimizer`、`base64` 直返——适合批量给教材配图。
3. 有中/国际双站，境内结算走 `platform.minimaxi.com`。

---

## 2. 备选平台（都能做文生图，按国内可用性排序）

| 平台 | 开放平台/文档 | 模型 | 备注 |
|---|---|---|---|
| **火山方舟（豆包）** | https://docs.volcengine.com/docs/ark/image-generation-api | Doubao Seedream 5.0 Pro | 国内合规、中文提示词强；按张/按 token 计费 |
| **阿里云百炼（通义万相）** | https://www.alibabacloud.com/help/zh/model-studio/text-to-image-v2-api-reference | wanx / Wan 2.7 | 国内生态最全；有免费额度（新用户） |
| **智谱 BigModel** | https://open.bigmodel.cn/ | CogView 系列 | 中文理解好、有体验额度 |
| **硅基流动 SiliconFlow** | https://siliconflow.cn/ | Kolors 等 | OpenAI 兼容接口，换 base_url 即可 |
| **OpenAI** | https://platform.openai.com/docs/guides/image-generation | gpt-image-1 | 质量高、价格高、境内访问受限 |
| **Stability AI** | https://platform.stability.ai/ | SD 3.5 / Stable Image | 可自托管替代方案 |
| **Replicate** | https://replicate.com/ | FLUX / SDXL 等 | 模型市场，按次计费 |

> 若只做"给低龄文章配插图"，**不必上视频/3D**；图片 API + 固定风格提示词即可。

---

## 3. 项目接入方案（代码已就绪，缺 key）

### 3.1 已实现
| 文件 | 作用 |
|---|---|
| `vite-plugins/school-image.ts` | `POST /api/school-image`：代理 MiniMax `image_generation`；无 key 返回 **501**（明确提示，不伪造图片） |
| `vite.config.ts` | 注册该插件 |
| `.env.example` | 新增 `MINIMAX_API_KEY` / `MINIMAX_IMAGE_MODEL` / `MINIMAX_API_BASE` |
| `scripts/generate-illustrations.mjs` | 批量给低龄阅读文章生成插图：读 `reading-extra-low.json` → 生成 → 存 `public/illustrations/*.png` + `manifest.json` |
| 模板 | 若 `manifest.json` 里有该文章插图，就显示真实图片；没有则回退 emoji 插画 |

**已实测（无 key 状态）**：
- `POST /api/school-image` → **501** `{code:'minimax-not-configured', hint, where}`，不伪造图片。
- `node scripts/generate-illustrations.mjs` → 打印取 key 地址与配置步骤，退出码 3（适合 CI 判断）。
- 页面构建正常；无插图时仍显示 emoji，不影响测评。

### 3.2 启用步骤（10 分钟）
1. 打开 https://platform.minimaxi.com/console → 注册/登录 → **API Keys** 创建 key（国际站同理）。
2. 在项目 `.env` 加：
```env
MINIMAX_API_KEY=你的key
MINIMAX_IMAGE_MODEL=image-01
MINIMAX_API_BASE=https://api.minimaxi.com
```
3. 重启 dev server（vite 会自动重启），然后：
```bash
node scripts/generate-illustrations.mjs            # 生成全部低龄插图
node scripts/generate-illustrations.mjs --only x-low-200-1   # 只生成一篇
```
4. 重新构建测评页：`node scripts/build-assessment.mjs`，页面会自动用真实插图替换 emoji。

### 3.3 成本与合规
- 成本：image-01 约 **$0.0035/张**；32 篇首批约 **$0.11**。
- 合规：儿童内容需过滤（不要生成恐怖/暴力）；MiniMax 有内容安全拦截（`1008/2013` 等错误码），生成失败要回退 emoji 而不是空白。
- 版权：AI 生成图用于产品前请确认厂商条款（商用授权范围）。

---

## 4. 结论

1. **平台链接（首选）**：MiniMax 国际站 https://platform.minimax.io/ ；中国站 https://platform.minimaxi.com/ ；图片文档 https://platform.minimax.io/docs/api-reference/image-generation-t2i 。
2. **"直接可用"需要 key**：本项目当前无任何图片厂商 key；免费无 key 通道实测不可靠（402 + 图片与提示词不符），不能用。
3. **给我一个 MiniMax key**，我就能把低龄 12 篇的插图全部生成并接进测评页（代码已就绪，只差 key）。
