# 部署配置指南

本文档详细说明如何在 Vercel 上配置本项目的所有环境变量和服务。

## 目录

1. [Vercel 项目配置](#1-vercel-项目配置)
2. [环境变量配置](#2-环境变量配置)
3. [Sentry 监控配置](#3-sentry-监控配置)
4. [Redis 配置](#4-redis-配置)
5. [日志服务配置](#5-日志服务配置)
6. [CI/CD 配置](#6-cicd-配置)

---

## 1. Vercel 项目配置

### 获取 Vercel 凭据

#### 1.1 获取 VERCEL_TOKEN

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击右上角头像 → **Settings**
3. 左侧菜单选择 **Tokens**
4. 点击 **Create Token**
5. 填写名称（如 `github-actions`）和过期时间
6. 点击 **Create** 并**保存 Token**（只显示一次）

#### 1.2 获取 VERCEL_ORG_ID

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 进入项目目录
cd d:\VS\pdf-summarizer

# 链接项目（如果没有链接的话）
vercel link

# 获取组织 ID
vercel teams list
```

或者在 Vercel Dashboard：
- Settings → **Teams** → 点击你的团队 → 复制 **Team ID**

#### 1.3 获取 VERCEL_PROJECT_ID

```bash
# 在项目目录中
vercel project list

# 或者在 Vercel Dashboard：
# 项目页面 → Settings → General → Project ID
```

### 在 GitHub 中配置 Secrets

1. 进入你的 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**，添加以下 secrets：

| Secret Name | Value |
|-------------|-------|
| `VERCEL_TOKEN` | 你刚创建的 Vercel Token |
| `VERCEL_ORG_ID` | 你的团队/组织 ID |
| `VERCEL_PROJECT_ID` | 项目 ID |

---

## 2. 环境变量配置

### 2.1 Vercel 环境变量

在 Vercel Dashboard → 你的项目 → **Settings** → **Environment Variables**：

#### 必需的环境变量

| Name | Value | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | Production |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Production |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | All |
| `CLERK_SECRET_KEY` | `sk_test_...` | Production |

#### 可选的环境变量

| Name | Value | 说明 |
|------|-------|------|
| `REDIS_ENABLED` | `true` | 启用 Redis 限流 |
| `REDIS_URL` | `redis://host:6379` | Redis 连接地址 |
| `NEXT_PUBLIC_SENTRY_DSN` | `https://...@sentry.io/...` | Sentry 监控 |
| `SENTRY_DSN` | `https://...@sentry.io/...` | Sentry 监控 |
| `NEXT_PUBLIC_LOGROCKET_ID` | `your-app-id` | LogRocket |
| `NEXT_PUBLIC_DATADOG_APP_ID` | `app-id` | Datadog |
| `NEXT_PUBLIC_DATADOG_CLIENT_TOKEN` | `token` | Datadog |
| `LOG_API_KEY` | `secure-random-key` | 日志 API |
| `AWS_S3_BUCKET` | `backup-bucket` | 备份存储 |
| `AWS_ACCESS_KEY_ID` | `key` | AWS 访问 |
| `AWS_SECRET_ACCESS_KEY` | `secret` | AWS 密钥 |

---

## 3. Sentry 监控配置

### 3.1 创建 Sentry 项目

1. 登录 [Sentry](https://sentry.io)
2. 点击 **Create Project**
3. 选择 **Next.js**
4. 填写项目名称
5. 复制 **DSN**

### 3.2 配置环境变量

```
NEXT_PUBLIC_SENTRY_DSN = https://xxxxx@sentry.io/xxxxx
SENTRY_DSN = https://xxxxx@sentry.io/xxxxx
```

### 3.3 本地开发配置

创建 `.env.local`：

```bash
# 从 .env.example 复制
copy .env.example .env.local

# 填入你的实际值
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

### 3.4 Vercel 集成 Sentry（推荐）

```bash
# 安装 Sentry Vercel 集成
npx sentry-wizard@latest -i vercel
```

---

## 4. Redis 配置

### 4.1 获取 Redis 实例

推荐使用以下服务之一：

#### 选项 A: Upstash（推荐 - Serverless 友好）

1. 注册 [Upstash](https://upstash.com)
2. 创建新数据库
3. 选择 **Global** 区域
4. 复制 REST URL 和 Token

#### 选项 B: Redis Cloud

1. 注册 [Redis Cloud](https://redis.com/cloud/)
2. 创建订阅
3. 创建数据库
4. 复制连接信息

#### 选项 C: Railway

1. 注册 [Railway](https://railway.app)
2. New Project → Add Redis
3. 复制连接 URL

### 4.2 配置环境变量

```bash
REDIS_ENABLED=true
REDIS_URL=redis://default:xxxxx@xxx.upstash.io:6379
```

---

## 5. 日志服务配置

### 5.1 LogRocket

1. 注册 [LogRocket](https://logrocket.com)
2. 创建新应用
3. 复制 App ID

```bash
NEXT_PUBLIC_LOGROCKET_ID=your-app-id
```

### 5.2 Datadog

1. 登录 [Datadog](https://datadoghq.com)
2. 进入 **UX Monitoring** → **RUM**
3. 点击 **New Application**
4. 填写应用名称，选择框架
5. 复制 **Application ID** 和 **Client Token**

```bash
NEXT_PUBLIC_DATADOG_APP_ID=your-app-id
NEXT_PUBLIC_DATADOG_CLIENT_TOKEN=your-client-token
```

---

## 6. CI/CD 配置

### 6.1 GitHub Actions 工作流

项目已配置以下工作流：

- `ci.yml` - 持续集成
- `backup.yml` - 数据库备份
- `security.yml` - 安全扫描

### 6.2 数据库备份到 S3

1. 创建 S3 Bucket
2. 创建 IAM 用户（仅需 S3 上传权限）

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

3. 添加 GitHub Secrets：
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

### 6.3 Vercel 部署验证

推送代码到 `main` 分支后：

```bash
# 查看部署状态
vercel ls
```

或在 GitHub Actions 中查看 workflow 运行状态。

---

## 快速配置清单

### 开发环境

```bash
# 1. 克隆并安装
git clone <repo>
npm install

# 2. 复制环境变量
copy .env.example .env.local

# 3. 配置 .env.local
# - DATABASE_URL (PostgreSQL)
# - CLERK keys
# - AI API keys

# 4. 初始化数据库
npx prisma generate
npx prisma db push

# 5. 启动开发服务器
npm run dev
```

### 生产环境

1. [ ] Vercel 项目创建和链接
2. [ ] GitHub Secrets 配置（VERCEL_*）
3. [ ] Vercel 环境变量配置
4. [ ] 数据库部署（Neon/Supabase/Railway）
5. [ ] Clerk 应用配置
6. [ ] AI API Keys 配置
7. [ ] (可选) Redis 配置
8. [ ] (可选) Sentry 配置
9. [ ] (可选) 日志服务配置
10. [ ] 首次部署测试

---

## 故障排除

### 部署失败

```bash
# 本地构建测试
npm run build

# 查看 Vercel 日志
vercel logs <deployment-url>
```

### 数据库连接问题

```bash
# 验证数据库 URL
npx prisma validate

# 推送 schema
npx prisma db push
```

### Redis 连接问题

```bash
# 测试 Redis 连接
redis-cli -u <REDIS_URL> ping
```

---

如有问题，请检查：
1. 环境变量是否正确设置
2. 所有必需的服务是否可用
3. GitHub Secrets 是否配置正确
