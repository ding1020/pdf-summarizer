# PDF Summarizer - 上线检查清单

## 一、自动化已完成 ✅

| 项目 | 状态 | 说明 |
|------|------|------|
| ✅ 前端界面 | 完成 | 首页、定价、登录、Dashboard |
| ✅ AI摘要功能 | 完成 | 流式输出 |
| ✅ 多语言支持 | 完成 | 7种语言 |
| ✅ 法律文档 | 完成 | Terms/Privacy/Refund |
| ✅ Vercel配置 | 完成 | vercel.json已优化 |
| ✅ 数据库模型 | 完成 | User + Document |
| ✅ 支付API | 完成 | Paddle集成 |

---

## 二、需要手动配置 ⚠️

### 1. Clerk 认证 (30分钟)

1. 访问 https://dashboard.clerk.com
2. 创建生产应用 (Create Application)
3. 复制 Publishable Key 和 Secret Key
4. 更新 `.env.local`:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
```

### 2. Paddle 支付 (1天审核)

1. 访问 https://vendors.paddle.com
2. 注册商家账户 (Business Account)
3. 完成商户审核
4. 创建 Product:
   - Product Name: Pro Subscription
   - Type: Recurring
   - Billing: Monthly ($9/月) + Yearly ($79/年)
5. 获取 Price ID
6. 配置 Webhook:
   - URL: `https://yourdomain.com/api/webhooks/paddle`
   - Events: subscription.created, subscription.updated, subscription.canceled
7. 获取 Webhook Secret
8. 更新 `.env.local`:
```bash
PADDLE_ENVIRONMENT=production
PADDLE_SECRET_KEY=pdl_live_xxxxx
PADDLE_PRICE_ID=pri_xxxxx (Monthly)
PADDLE_PRICE_ID_YEARLY=pri_xxxxx (Yearly)
PADDLE_WEBHOOK_SECRET=paddle_live_xxxxx
```

### 3. DeepSeek API ✅ 已配置

当前配置的Key有效，可以继续使用。

### 4. 域名配置 (1小时)

1. 域名已注册
2. 配置 DNS:
   - A记录: @ → Vercel IP
   - CNAME: www → cname.vercel-dns.com
3. Vercel 添加域名:
   - Settings → Domains → Add
4. 等待 SSL 证书自动生成

---

## 三、部署步骤

### 1. 本地测试

```bash
cd pdf-summarizer
npm install
npm run db:push
npm run dev
```

访问 http://localhost:3000 测试所有功能

### 2. 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

或在 Vercel Dashboard:
1. Import Project
2. Select GitHub repo
3. Configure Environment Variables
4. Deploy

### 3. 环境变量 (Vercel)

在 Vercel Dashboard → Settings → Environment Variables 添加:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Paddle
PADDLE_ENVIRONMENT=production
PADDLE_SECRET_KEY=pdl_live_xxxxx
PADDLE_PRICE_ID=pri_xxxxx
PADDLE_PRICE_ID_YEARLY=pri_xxxxx
PADDLE_WEBHOOK_SECRET=paddle_live_xxxxx

# AI
DEEPSEEK_API_KEY=sk-xxxxx

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com

# Database
DATABASE_URL=file:./prod.db
```

---

## 四、支付测试 (Test Mode)

在 Paddle Sandbox 测试:

1. https://sandbox.paddle.com
2. 创建测试产品
3. 使用测试卡:
   - Card: 4242 4242 4242 4242
   - Expiry: Any future date
   - CVV: Any 3 digits

---

## 五、上线前检查

- [ ] 所有页面可访问
- [ ] 注册/登录流程正常
- [ ] PDF上传和摘要生成正常
- [ ] 支付流程完整 (Test Mode)
- [ ] 法律页面内容正确
- [ ] 联系邮箱可用
- [ ] SSL证书生效
- [ ] 错误监控已配置 (Sentry)

---

## 六、关键文件

| 文件 | 说明 |
|------|------|
| `.env.local` | 本地环境变量 (不提交) |
| `vercel.json` | Vercel部署配置 |
| `prisma/schema.prisma` | 数据库模型 |
| `middleware.ts` | 路由中间件 |
| `i18n.ts` | 多语言配置 |

---

## 七、常见问题

### Q: 支付后用户状态未更新
A: 检查 Paddle Webhook URL 是否可访问，Webhook Secret 是否正确

### Q: Clerk 登录失败
A: 检查 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY 是否正确

### Q: AI 摘要不工作
A: 检查 DEEPSEEK_API_KEY 是否有效

---

## 八、联系支持

- 邮箱: support@yourdomain.com
- 文档: 项目内 `/help` 页面
