# 📄 PDF Summarizer 可执行性专业报告（综合版）

> 针对个人开发者（无护照、仅身份证）  
> 发布日期：2026‑06‑15 | 目标：**3 周内达到可盈利状态**

---

## 一、执行摘要

| 项目 | 现状 | 目标（3 周后） | 提升 |
|------|------|----------------|------|
| 综合评分 | **58/100** | **75/100** | **+17** |
| 支付自动化 | ❌ 手动扫码 + 人工开通 | ✅ Creem 一键结账 + 自动授权 | 从 5 分 → 23 分 |
| 认证保护 | ❌ Clerk 中间件被注释，任何人可用 | ✅ 未登录用户重定向至登录页 | 从 0 → 10 分 |
| SEO 基础 | ❌ robots.txt 禁止抓取，无页面标题 | ✅ 搜索引擎可正常收录 | 从 0 → 8 分 |
| 用户账户安全 | ❌ 无密码重置 | ✅ 邮箱验证码重置 | 从 3 分 → 8 分 |
| 国际化定价 | ❌ 仅人民币 ¥59 | ✅ 多币种（USD/EUR/GBP/JPY）+ 动态切换 | 从 5 分 → 13 分 |

**核心结论**：你不需要重写整个产品，只需 **按本报告顺序执行 11 项任务**，其中 **9 项可由 CodeBuddy（AI）完成代码**，你本人仅需完成 **2 项手动操作**（注册 Creem + 配置环境变量，耗时 < 3 小时）。总投资成本几乎为零（Creem 无月费，仅 5% 交易费）。

## 二、问题优先级与修正

| 原报告 P0 项 | 调整后优先级 | 修正原因 |
|--------------|--------------|----------|
| ❌ Paddle 支付集成 | **改为 P0‑2 Creem 支付集成** | Paddle 需要护照，个人开发者无法通过 |
| ✅ 密码重置 | 保持 **P0‑3** | 用户账户安全基础 |
| ✅ 多币种定价 | 保持 **P0‑4** | 国际化必备，可复用 Creem 的多价格功能 |
| ❌ （缺失） | **新增 P0‑1 恢复 Clerk 认证** | 否则付费墙形同虚设 |
| ❌ （缺失） | **新增 P0‑0 修复 robots.txt + 页面标题** | 否则 SEO 零分 |

---

## 三、可执行任务清单（分阶段）

### 🔴 阶段一：生存修复（第 1‑2 天）—— 纯代码，AI 可 100% 完成

| 序号 | 任务 | 具体操作 | 验收标准 |
|------|------|----------|----------|
| **0** | 修复 `robots.txt` | 删除 `Disallow: /` 或改为 `Allow: /` | 访问 `https://www.pdfsum.com/robots.txt` 应显示 `Allow: /` |
| **1** | 为每个页面添加 `<title>` 和 `<meta name="description">` | 在 `app/[locale]/layout.tsx` 中设置 `metadata` 对象 | 浏览器标签页显示网站标题，搜索引擎抓取到描述 |
| **2** | 恢复 Clerk 认证中间件 | 取消 `middleware.ts` 中 `clerkMiddleware` 的注释，确保未登录用户访问 `/dashboard` 或 `/api/summarize` 时跳转登录 | 未登录状态下直接访问 `/dashboard` 会被重定向至 `/sign-in` |
| **3** | 修复 `/api/summarize/stream` 的 500 错误 | 检查 AI API 密钥、PDF 解析边界条件、异常处理 | 上传有效 PDF 后能正常返回流式摘要 |
| **4** | 添加密码重置功能 | 按用户报告 5.2 节实现：`/api/auth/forgot-password` + `/api/auth/reset-password` + 邮件发送（使用 Resend） | 用户可输入邮箱收到重置链接，成功设置新密码 |

> **注意**：任务 4 需要你先注册 Resend 并验证域名（见阶段二），但代码可提前写完，等环境变量到位后即可生效。

### 🟠 阶段二：支付自动化（第 3‑7 天）—— 你需手动注册 1 个平台

#### 步骤 2.1：注册 Creem（**你必须做，约 1‑2 小时**）

1. 访问 [Creem.io](https://creem.io)，点击 **Sign Up**。
2. 选择 **个人开发者** 身份，使用邮箱注册。
3. 进入 **Settings → Payouts**，绑定你的 **支付宝账号**（用于提现）。
4. 进入 **Verification**，上传 **身份证正反面** + 人脸识别（按提示操作）。
5. 等待审核（通常 **几小时内通过**）。
6. 审核通过后，进入 **Products** → **Create Product**：
   - 名称：`Pro Monthly`
   - 价格：`USD 7.99`（月付），同时添加其他币种：`EUR 7.49`、`GBP 6.49`、`JPY 980`、`CNY 49`（可选）
   - 类型：`Recurring`
   - 记录每个价格的 **Price ID**。
   - 同理创建 `Pro Yearly`，年价 `USD 69`（折合月均 $5.75）。
7. 进入 **Developers → API Keys**，生成一个 **Secret Key**（保存好）。
8. 进入 **Webhooks**，添加端点：`https://www.pdfsum.com/api/webhooks/creem`，选择事件：`checkout.session.completed`、`subscription.updated`、`subscription.deleted`。复制 **Webhook Secret**。

#### 步骤 2.2：环境变量配置（**你必须做，5 分钟**）

在 Vercel 项目 Dashboard → **Settings → Environment Variables** 添加：

```bash
CREEM_SECRET_KEY=        # 从 Creem Dashboard 复制
CREEM_WEBHOOK_SECRET=    # 从 Webhook 设置复制
NEXT_PUBLIC_CREEM_CLIENT_ID=  # 如有（一般不需要）
# 以下为价格 ID（可选，用于前端预置）
NEXT_PUBLIC_PRICE_MONTHLY_USD=price_xxx
NEXT_PUBLIC_PRICE_YEARLY_USD=price_yyy
# 邮件服务（用于密码重置）
RESEND_API_KEY=re_xxx    # 从 resend.com 获取
EMAIL_FROM=noreply@pdfsum.com


---

## 第四段：阶段二 AI 实现（核心步骤 2.3）

```markdown
#### 步骤 2.3：AI 实现 Creem 集成（**AI 可完成 95%，你只需验收**）

提交以下需求给 CodeBuddy（按顺序）：

1. **数据库扩展**：在 `prisma/schema.prisma` 中添加 `Subscription` 和 `Payment` 模型，包含 `userId`、`status`、`planType`、`currentPeriodEnd`、`creemSubscriptionId` 等字段。运行 `npx prisma db push`。

2. **创建结账会话 API**：`/api/checkout/create/route.ts`，接收 `priceId` 和 `userId`，调用 Creem SDK 创建结账会话，返回 `checkoutUrl`。

3. **前端结账模态框**：修改 `PaymentModal.tsx`，移除手动二维码，改为按钮“升级到 Pro”，点击后请求上述 API，获得 URL 后跳转（或使用 Creem 的 Checkout 嵌入模式）。

4. **Webhook 处理器**：`/api/webhooks/creem/route.ts`，验证签名，处理 `checkout.session.completed` → 激活用户订阅；`subscription.updated` → 更新状态；`subscription.deleted` → 取消订阅。

5. **订阅状态同步**：在 `lib/auth.ts` 或中间件中，根据数据库 `subscription` 状态判断用户是否为 Pro，在 API 层和 UI 层分别限制免费用户功能（如每日次数、文件大小）。

6. **客户自助门户**：`/api/customer-portal/route.ts`，返回 Creem 提供的门户链接，用户可在前端点击管理订阅。

7. **测试**：在本地环境使用 Creem 测试模式（支持测试信用卡 `4242 4242 4242 4242`），完整走通“点击升级 → 跳转支付 → 返回 → 状态变为 Pro”的流程。

> **验收**：完成支付后，用户数据库中的 `subscriptionStatus` 应变为 `active`，前端自动显示 Pro 标识，且免费限制解除。

### 🟡 阶段三：国际化与基础增长（第 8‑14 天）

| 任务 | 说明 | AI 可实现 |
|------|------|------------|
| **多币种定价展示** | 前端根据 `navigator.language` 或 URL locale 自动匹配对应货币的价格（USD/EUR/GBP/JPY），并显示年付折扣。 | ✅ 100% |
| **多语言 sitemap 完善** | 确保 `sitemap.ts` 为每种语言生成独立 URL，并提交到 Google Search Console。 | ✅ 100% |
| **修复 robots.txt 后提交索引** | 使用 Google Search Console 的“网址检查”工具，请求重新抓取首页。 | ❌ 需你手动操作（10 分钟） |
| **添加简单分享功能（可选）** | 生成摘要后，用户可一键复制分享链接（公开只读页面）。这能带来自然流量。 | ✅ 100%（约 4‑6 工时） |

---

## 四、时间线与责任分配

| 时间段 | 任务 | 你（用户） | AI（CodeBuddy） |
|--------|------|------------|-----------------|
| **Day 1** | 阶段一：修复 robots.txt + 页面标题 + 恢复 Clerk 认证 | 无 | 生成代码，你复制部署 |
| **Day 2** | 阶段一：修复 API 500 错误 + 密码重置代码 | 注册 Resend，验证域名 | 生成密码重置全套代码 |
| **Day 3** | 阶段二：注册 Creem，获取 API 密钥 | **必须做（2 小时）** | 无 |
| **Day 4‑5** | 阶段二：AI 实现 Creem 集成 | 提供 API 密钥，测试支付流程 | 生成数据库模型、API 路由、Webhook、前端组件 |
| **Day 6‑7** | 阶段二：端到端测试 + 修复 Bug | 用测试卡走通完整流程 | 修复发现的问题 |
| **Day 8‑10** | 阶段三：多币种定价展示 + sitemap 完善 | 确认最终定价，在 Creem 创建价格 | 生成多币种前端逻辑 |
| **Day 11‑14** | 可选：分享功能 | 无 | 生成分享链接 + 公开页面 |

## 五、成本与收入预测

### 5.1 成本（月均）

| 项目 | 费用 | 说明 |
|------|------|------|
| Vercel Pro | $20 | 已付 |
| Upstash Redis | $0 | 免费层足够 |
| Sentry | $0 | 免费层 |
| Resend 邮件 | $0 | 100 封/天免费 |
| Creem 交易费 | **5% + $0.50/笔** | 仅成交时扣取 |
| **总计固定成本** | **$20/月** | 不变成本 |

### 5.2 收入预测（保守）

- 月访客 5000，转化率 1% → 50 付费用户 × $7.99 = **$399.5**
- 扣除手续费 → 实收约 **$355**
- 减去固定成本 $20 → **净利润 ~$335/月**（约 2400 元人民币）

**若转化率 2%** → 净利润约 **$700/月**（约 5000 元人民币）。

---

## 六、风险与应对

| 风险 | 概率 | 应对措施 |
|------|------|----------|
| Creem 审核被拒 | 低 | 备选 PayPal 个人收款 + 手动开通（临时） |
| 支付 Webhook 丢失 | 中 | 添加重试机制 + 定时任务对账 |
| 免费用户滥用 API | 中 | 实现 Redis 限流（已有 `rate-limit.ts`） |
| 无自然流量 | 高 | 写英文博客发布到 Medium/Dev.to，投放到 Reddit/Hacker News |
| AI 生成的代码有 Bug | 中 | 每个模块完成后手动测试，要求 AI 补充单元测试 |

---

## 七、成功标准（可衡量）

3 周后，必须满足：

1. ✅ 未登录用户访问 `/dashboard` 被重定向至 `/sign-in`。
2. ✅ 用户可通过邮箱重置密码。
3. ✅ 用户点击“升级 Pro”后，能完成支付并 **自动** 获得 Pro 权限（无需人工审核）。
4. ✅ 用户可在仪表板管理订阅（取消、查看历史）。
5. ✅ 搜索引擎可正常抓取网站（`robots.txt` 允许、有页面标题、sitemap 已提交）。
6. ✅ 至少 **1 个真实用户（非你本人）成功付费**（可以是朋友测试，但必须真实付款）。

---

## 八、最终建议

> **你不需要成为全栈专家，也不需要注册公司或拥有护照。你需要做的只是：**

1. **花 2‑3 小时完成 Creem 注册和环境变量配置**。
2. **将本报告中的技术任务逐条交给 CodeBuddy**，每次一个模块，测试通过后部署。
3. **在第三周末尾，写一篇英文博客介绍你的工具**，发布到 Product Hunt、Hacker News、Reddit 的 r/SaaS 和 r/Entrepreneur。

**本报告的所有代码开发工作量，AI 可以承担 90% 以上。** 你所需要投入的，仅仅是 **执行监督** 和 **支付平台注册**。

如果你按照本报告执行，3 周后你将会拥有一个 **自动收费、可规模化、基础 SEO 就绪** 的真正 SaaS 产品。届时可以继续迭代，也可以出售或融资。

**立即开始第一步：今天就在 CodeBuddy 中要求 AI 生成“修复 robots.txt 和添加页面标题”的代码。**

---
*报告结束*