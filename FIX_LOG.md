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
