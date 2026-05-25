# PDF Summarizer 月底上线计划

> 当前日期：5月17日 | 目标上线日：5月31日 | 剩余：14天

---

## 一、代码健康度评估

| 维度 | 评分 | 状态 |
|------|------|------|
| 前端界面 | 90% | ✅ 首页、定价、仪表板、多语言均完成 |
| 后端 API | 85% | ✅ 已修复所有 demo mode 适配 |
| AI 集成 | 90% | ✅ 多提供商+流式输出+fallback |
| 认证系统 | 30% | ❌ Clerk 未配置，仅 demo 可用 |
| 支付系统 | 40% | ⚠️ Paddle 已集成，密钥未配置 |
| 数据库 | 60% | ⚠️ 开发用 SQLite，生产需迁移 |
| 测试覆盖 | 25% | ⚠️ 仅 6 个单元测试 |
| 错误监控 | 50% | ⚠️ Sentry 已集成但未启用 |
| 部署就绪 | 80% | ✅ Vercel 配置 + CI/CD 完整 |

---

## 二、倒排计划

### 第一周（5/18 - 5/23）：关键基础设施

#### Day 1-2（5/18-19）：AI 服务接通 🔴 P0

- [ ] **注册 DeepSeek API Key**（推荐，中文优化效果好）
  - 访问 https://platform.deepseek.com 注册
  - 充值 10 元即可开始
  - 修改 `.env` 中 `DEEPSEEK_API_KEY`
- [ ] **验证 AI 摘要功能**
  ```bash
  npm run dev
  # 打开 http://localhost:3000/sign-in
  # 用 demo 模式登录 → 上传 PDF → 检查摘要生成
  ```
- [ ] **备用：注册 Groq 免费额度**
  - https://console.groq.com 获取 Key

#### Day 3-4（5/20-21）：数据库迁移 🔴 P0

- [ ] **选择生产数据库方案**（二选一）
  - 方案A（推荐）：Vercel Postgres → 一键部署
  - 方案B：Supabase → 免费 500MB，支持更多并发
- [ ] **执行数据库迁移**
  ```bash
  # 更新 DATABASE_URL 到生产数据库
  # 推送到 Vercel 原生的 Prisma 自动迁移
  ```
- [ ] **验证数据持久化** - 上传文档后刷新留存

#### Day 5（5/22）：认证配置 🔴 P0

- [ ] **配置 Clerk 生产环境**
  - https://dashboard.clerk.com → Create App
  - 获取 `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` 和 `CLERK_SECRET_KEY`
  - 配置 Clerk Dashboard：
    - Sign-in URL: `/sign-in`
    - Sign-up URL: `/sign-up`
    - After Sign-in: `/dashboard`
- [ ] **启用 Clerk Middleware**（恢复生产级认证保护）
- [ ] **端到端测试** - 注册 → 登录 → 上传 PDF → 生成摘要 → 查看历史

#### Day 6（5/23）：错误监控 + 安全审计 🟡 P1

- [ ] **启用 Sentry 监控**（https://sentry.io 注册）
  - 获取 DSN → 填入 `NEXT_PUBLIC_SENTRY_DSN`
- [ ] **安全扫描**
  - 检查所有 API 路由是否正确鉴权
  - 验证 CSP 安全头配置
  - 确认 `vercel.json` headers 配置完整

---

### 第二周（5/24 - 5/31）：支付 + 法律 + 上线

#### Day 7-8（5/24-25）：Paddle 支付集成 🔴 P0

- [ ] **注册 Paddle 商家账户**
  - https://vendors.paddle.com → Business Account
  - 准备材料：企业营业执照（或个体户） + 银行账户
  - 审核周期：通常 1-3 个工作日
- [ ] **Sandbox 测试**
  - 创建 Sandbox 产品
  - 用测试卡 `4242 4242 4242 4242` 走通完整支付流程
  - 验证 Webhook 回调正确更新用户订阅状态
- [ ] **配置 Webhook**
  - `https://yourdomain.com/api/webhooks/paddle`
  - 事件：`subscription.created`、`subscription.updated`、`subscription.canceled`
  - 获取 Webhook签名密钥并配置环境变量

#### Day 9（5/26）：法律与合规 🟡 P1

- [ ] **完善法律文档**
  - Privacy Policy：确认数据处理和存储说明准确
  - Terms of Service：确认用户权责说明完整
  - Refund Policy：确认退款流程描述准确
- [ ] **Cookie 合规**（GDPR/CCPA）
  - 添加 cookie 提示横幅（如面向欧洲用户）
- [ ] **业务邮箱配置**
  - `support@yourdomain.com`
  - `privacy@yourdomain.com`

#### Day 10-11（5/27-28）：部署与压力测试 🟡 P1

- [ ] **Vercel 部署**
  ```bash
  # 推送到 GitHub
  git push origin master
  # 在 Vercel Dashboard 导入项目
  ```
- [ ] **配置所有环境变量**（Vercel Dashboard → Settings → Environment Variables）
- [ ] **域名绑定**
  - DNS 配置：A 记录/CNAME 指向 Vercel
  - 验证 SSL 证书自动生成
- [ ] **压力测试**
  - 模拟 10 用户并发上传 PDF
  - 验证 AI 摘要生成耗时 < 30 秒
  - 验证速率限制有效

#### Day 12-13（5/29-30）：最终测试与优化 🟡 P1

- [ ] **全流程验收测试**
  - 首次访问 → 注册 → 登录
  - 上传 PDF → AI 流式摘要
  - 查看文档历史 → 删除文档
  - 订阅 Pro → 支付 → 确认 Pro 状态
  - 取消订阅 → 退款
  - 切换语言（7 种语言逐一检查）
  - 法律页面可访问性
- [ ] **性能优化**
  - Lighthouse 评分 > 90
  - 图片和静态资源 CDN 加速
  - API 响应时间 P95 < 2 秒
- [ ] **Bug 修复**
  - 集中修复验收中发现的问题

#### Day 14（5/31）：正式上线 🚀

- [ ] **启动 checklist**
  - 所有环境变量确认
  - DNS 解析验证
  - SSL 证书验证
  - Paddle 切换到 production 环境
  - Clerk 切换到 production 环境
  - 数据库备份
  - Sentry 告警规则配置
  - 监控仪表板就绪
- [ ] **预热**
  - 发布社交媒体公告
  - 准备 launch 邮件
- [ ] **上线** `vercel --prod`

---

## 三、环境变量 checklist

上线前必须填入真实值：

```bash
# ===== Clerk 认证 =====
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx    # 从 Clerk Dashboard 获取
CLERK_SECRET_KEY=sk_live_xxxxx                       # 从 Clerk Dashboard 获取

# ===== AI 服务（最少一个）=====
DEEPSEEK_API_KEY=sk-xxxxx                            # platform.deepseek.com
# GROQ_API_KEY=                                       # 备用

# ===== 数据库 =====
DATABASE_URL=postgresql://...                        # Vercel Postgres 或 Supabase

# ===== Paddle 支付 =====
PADDLE_ENVIRONMENT=production
PADDLE_SECRET_KEY=pdl_live_xxxxx                     # 从 Paddle Dashboard 获取
PADDLE_PRICE_ID=pri_xxxxx
PADDLE_PRICE_ID_YEARLY=pri_xxxxx
PADDLE_WEBHOOK_SECRET=paddle_live_xxxxx

# ===== 应用配置 =====
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com
NODE_ENV=production

# ===== 错误监控 =====
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx # sentry.io
```

---

## 四、关键文件需要恢复生产配置

上线前必须将以下从 demo 模式切换回生产模式：

| 文件 | 需要更改 |
|------|----------|
| `middleware.ts` | 恢复 Clerk middleware 保护所有路由 |
| `app/[locale]/sign-in/page.tsx` | 恢复 Clerk SignIn 组件 |
| `app/[locale]/sign-up/page.tsx` | 恢复 Clerk SignUp 组件 |
| `app/[locale]/dashboard/page.tsx` | 恢复 `useUser` + UserButton |

---

## 五、建议的部署架构

```
CDN (Vercel Edge)
     │
     ▼
Next.js 15 (Vercel Serverless)
   ├─ Clerk (认证层)
   ├─ Prisma (ORM)
   │    └─ Vercel Postgres (数据库)
   ├─ Paddle (支付)
   └─ DeepSeek/Groq (AI)
          │
          ▼
    Sentry (错误监控)
```

---

## 六、风险和应对

| 风险 | 概率 | 应对 |
|------|------|------|
| Paddle 审核超期 | 中 | 提前提交，准备 Sandbox 绕过 |
| AI API 不稳定 | 中 | 已实现 3 层 fallback (D→G→S) |
| 支付 Webhook 回调失败 | 低 | Vercel Logs + Sentry 告警 |
| 高峰流量 | 低 | Vercel 自动扩容 + 速率限制已就绪 |
