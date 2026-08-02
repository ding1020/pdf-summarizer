# Fix Log — PDF Summary AI 生产化修复记录

> 每次修复后更新此文件，供后续优化参考。

---

## [2026-06-30] Round 1 — P0/P1 全面修复 (7项)

### ✅ Fix 1 (P0): 定价页免费按钮 disabled → 可交互
- **文件**: `app/[locale]/pricing/page.tsx`
- **修改**: 未登录→跳转注册页；已登录免费用户→显示"当前方案"

### ✅ Fix 2 (P0): JSON-LD 价格从 constants 读取，不再硬编码
- **文件**: `app/[locale]/layout.tsx`
- **修改**: Pro Monthly $9.99→$7.99, Pro Yearly $79.99→$69

### ✅ Fix 3 (P0): 移除定价页混淆的 Stripe 支付按钮
- **文件**: `app/[locale]/pricing/page.tsx`
- **修改**: 只保留 Creem PaymentModal

### ✅ Fix 4 (P1): 全站 CSRF 保护 (cookie-to-header)
- **新增**: `lib/csrf.ts`
- **修改**: `middleware.ts`, `app/api/auth/sign-in/route.ts`, `app/api/auth/sign-up/route.ts`, `app/api/auth/reset-password/route.ts`, `app/api/auth/forgot-password/route.ts`
- **前端**: `hooks/useAuth.tsx`, `app/[locale]/sign-in/page.tsx`, `app/[locale]/forgot-password/page.tsx`, `app/[locale]/reset-password/page.tsx`

### ✅ Fix 5 (P1): Dashboard"Manage Billing"按钮 → Creem 门户
- **修改**: `components/SubscriptionWidget.tsx` — 添加调用 `/api/customer-portal` 的按钮

### ✅ Fix 6 (P1): 密码重置对齐注册页复杂度校验
- **修改**: `app/api/auth/reset-password/route.ts` — 加大小写+数字校验
- **修改**: `app/[locale]/reset-password/page.tsx` — 客户端预校验

### ✅ Fix 7 (P1): 重发验证邮件端点
- **新增**: `app/api/auth/resend-verification/route.ts`
- **修改**: `app/[locale]/sign-in/page.tsx` — 验证失败提示增加重发链接

---

## [2026-07-28] Round 2 — P4 全面优化 (30项)

### 🔴 P4.1 安全漏洞修复 (5项)

#### ✅ Fix 8 (P4/Critical): IDOR 越权漏洞 — summarize 路由 streamSummary 分支
- **文件**: `app/api/summarize/route.ts`
- **问题**: streamSummary 分支直接更新数据库文档，无所有权检查，任意用户可修改他人文档
- **修改**: 添加 `prisma.document.findUnique` 验证 `doc.userId === userId`

#### ✅ Fix 9 (P4/Critical): streamSummary 绕过使用量限制
- **文件**: `app/api/summarize/route.ts`, `lib/schemas/index.ts`
- **问题**: streamSummary 分支跳过每日配额检查，且 schema 无长度限制
- **修改**: 配额检查移至 streamSummary 之前；schema 添加 `.max(50000)` 长度限制

#### ✅ Fix 10 (P4/Critical): 账户接管漏洞 — sign-up 路由密码重置
- **文件**: `app/api/auth/sign-up/route.ts`
- **问题**: 已验证用户可通过重新注册重置密码，导致账户接管
- **修改**: 移除密码重置逻辑，返回通用成功消息防止邮箱枚举

#### ✅ Fix 11 (P4/Critical): CSRF 保护缺失 — 5个路由
- **文件**: `app/api/account/delete/route.ts`, `app/api/checkout/create/route.ts`, `app/api/payment/submit/route.ts`, `app/api/admin/approve/route.ts`, `app/api/admin/reject/route.ts`
- **问题**: 破坏性操作（账户删除、支付、管理员审批）缺少 CSRF 验证
- **修改**: 所有 POST/DELETE 路由添加 `validateCsrf(req)` 调用

#### ✅ Fix 12 (P4/Critical): 认证令牌不校验数据库
- **文件**: `lib/get-auth.ts`, `app/api/account/delete/route.ts`
- **问题**: `getAuthUserId()` 仅验证 JWT 签名，不查数据库，已删除用户令牌仍有效
- **修改**: 添加 60 秒缓存的数据库用户存在性检查；账户删除后调用 `clearAuthCache()`

### 🟠 P4.2 核心功能修复 (6项)

#### ✅ Fix 13 (P4/High): TypeScript EVENT_HANDLERS 编译错误
- **文件**: `lib/creem-webhook.ts`, `app/api/webhooks/creem/route.ts`
- **问题**: 导出的 EVENT_HANDLERS 对象与 Next.js 路由类型约束冲突
- **修改**: 改为内部变量 + 导出 `getEventHandler()` 查找函数

#### ✅ Fix 14 (P4/High): Webhook 幂等性失败继续处理
- **文件**: `app/api/webhooks/creem/route.ts`
- **问题**: 幂等记录创建失败时记录警告但继续处理，可能导致重复处理
- **修改**: 失败时返回 500 拒绝处理，让 Creem 重试

#### ✅ Fix 15 (P4/High): Chat Prompt 注入 + history 未验证
- **文件**: `app/api/chat/route.ts`, `lib/chat-rag.ts`
- **问题**: 用户问题直接插入 LLM prompt，history 数组无验证
- **修改**: 添加 history 结构/长度验证（最多6条，每条4000字符）；question 清洗移除代码块

#### ✅ Fix 16 (P4/High): 流式超时在流开始前被清除
- **文件**: `lib/ai.ts`
- **问题**: `clearTimeout` 在 API 返回后立即执行，流式传输阶段无超时保护
- **修改**: 添加 120 秒流式阶段超时，在流结束/错误时清除

#### ✅ Fix 17 (P4/High): 腾讯 OCR HTTP 请求无超时
- **文件**: `lib/tencent-ocr.ts`
- **修改**: 添加 `AbortController` + 30 秒超时

#### ✅ Fix 18 (P4/High): Webhook 签名最小长度检查过低
- **文件**: `lib/creem-webhook.ts`
- **修改**: 最小长度从 8 改为 64（HMAC-SHA256 十六进制签名标准长度）

### 🟡 P4.3 基础设施修复 (7项)

#### ✅ Fix 19 (P4/High): Vercel Cron 认证头缺失
- **文件**: `app/api/cron/downgrade-expired/route.ts`, `app/api/cron/send-winback/route.ts`, `app/api/cron/send-activation-reminder/route.ts`, `vercel.json`
- **问题**: Cron 路由要求 CRON_SECRET 但 Vercel Cron 不发送认证头
- **修改**: 支持 `x-vercel-cron-id` 头作为替代认证；添加第三个 cron 任务配置

#### ✅ Fix 20 (P4/High): 缺失 favicon/图标文件
- **文件**: `app/icon.svg` (新增), `app/apple-icon.tsx` (新增)
- **问题**: layout.tsx 引用的 favicon/favicon.svg/apple-touch-icon.png 全部 404
- **修改**: 使用 Next.js 16 原生图标路由自动生成

#### ✅ Fix 21 (P4/Medium): 缺失根级 404 页面
- **文件**: `app/not-found.tsx` (新增)
- **修改**: 创建品牌化 404 页面，支持暗色模式

#### ✅ Fix 22 (P4/Medium): 首页 JSON-LD 缺少 nonce
- **文件**: `app/[locale]/page.tsx`
- **修改**: 从 cookie 获取 nonce 并添加到 JSON-LD script 标签

#### ✅ Fix 23 (P4/Medium): robots.txt 屏蔽不完整
- **文件**: `app/robots.ts`
- **修改**: 添加 `/admin`, `/share/`, `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/dashboard/subscription`

#### ✅ Fix 24 (P4/Medium): Sitemap 包含认证页面 + BUILD_DATE 非确定性
- **文件**: `app/sitemap.ts`
- **修改**: 移除 `/sign-in`, `/sign-up`；BUILD_DATE 改为环境变量或固定值

### 🟢 P4.4 SEO/性能/合规优化 (12项)

#### ✅ Fix 25 (P4/Medium): 分析脚本过多 + Baidu Push HTTP 协议
- **文件**: `app/[locale]/layout.tsx`
- **修改**: 移除冗余 GTM；Baidu Push 改为 HTTPS；Clarity/Baidu 改为 lazyOnload

#### ✅ Fix 26 (P4/Medium): API v1 CORS 过于宽松
- **文件**: `vercel.json`
- **修改**: `Access-Control-Allow-Origin` 从 `*` 改为 `https://www.pdfsum.com`

#### ✅ Fix 27 (P4/Medium): @vercel/og 已弃用
- **文件**: `app/og/route.tsx`
- **修改**: 迁移到 `next/og`

#### ✅ Fix 28 (P4/Medium): SSRF IP 编码绕过
- **文件**: `lib/file-processor.ts`
- **修改**: 添加十进制/十六进制 IP 编码解码

#### ✅ Fix 29 (P4/Medium): usage-log fire-and-forget
- **文件**: `lib/usage-log.ts` + 4个调用方
- **修改**: `saveUsageLog` 改为 async，调用方添加 await

#### ✅ Fix 30 (P4/Medium): v1 API 成本记录硬编码为 0
- **文件**: `app/api/v1/summarize/route.ts`
- **修改**: 使用 `result.usage.costUSD` 替代硬编码 0

#### ✅ Fix 31 (P4/Medium): FAQPage 结构化数据缺失
- **文件**: `app/[locale]/pricing/page.tsx`
- **修改**: 添加 FAQPage JSON-LD（3个FAQ）

#### ✅ Fix 32 (P4/Medium): viewport 导出缺失
- **文件**: `app/[locale]/layout.tsx`
- **修改**: 添加 `export const viewport`，移除手动 meta 标签

#### ✅ Fix 33 (P4/Medium): 令牌有效期过长 + 密码重置审计缺失
- **文件**: `lib/auth-token.ts`, `app/api/auth/reset-password/route.ts`
- **修改**: 令牌有效期从 7 天缩短为 1 天；添加密码重置审计日志

#### ✅ Fix 34 (P4/Medium): 中间件未保护部分敏感 API
- **文件**: `middleware.ts`
- **修改**: `WRITE_API_PATTERNS` 添加 `/api/checkout`, `/api/customer-portal`, `/api/subscription`, `/api/feedback`

#### ✅ Fix 35 (P4/Medium): past_due 处理器缺少审计日志
- **文件**: `lib/creem-webhook.ts`
- **修改**: 添加 `recordAudit` 调用

#### ✅ Fix 36 (P4/Medium): 测试更新
- **文件**: `tests/unit/webhook.test.ts`
- **修改**: 更新测试以匹配新的 `getEventHandler` API 和签名长度
