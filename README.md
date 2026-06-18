# 📄 PDF Summarizer — AI-Powered PDF Summary Platform

AI-driven SaaS platform that automatically generates concise summaries from uploaded PDF documents. Supports 7 languages and multiple AI providers with automatic fallback.

**[🌐 Live Site](https://www.pdfsum.com)**

---

## ✨ Features

- **AI Summary Generation** — Upload any PDF and get an intelligent summary in seconds
- **Multi-Provider Fallback** — DeepSeek → Groq → SiliconFlow automatic failover
- **Streaming SSE** — Real-time summary streaming for fast UX
- **7-Language Support** — English, 中文, 日本語, 한국어, Español, Français, Deutsch
- **Guest Mode** — Try without signing up (3 summaries/day)
- **Pro Subscription** — Powered by Creem (unlimited summaries, priority AI)
- **GDPR Compliant** — Data minimization, cookie consent, right to deletion
- **Dark/Light Ready** — Tailwind CSS with CSS variables theming

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5.x |
| **Runtime** | Node.js ≥ 20.0.0 |
| **Auth** | Clerk |
| **Database** | PostgreSQL (NeonDB / Supabase) + Prisma ORM |
| **AI** | DeepSeek, Groq, SiliconFlow (OpenAI-compatible) |
| **Payments** | Creem (subscriptions + customer portal + webhooks) |
| **i18n** | next-intl v4 |
| **CSS** | Tailwind CSS 3 |
| **Monitoring** | Sentry |
| **Deployment** | Vercel (US East) |
| **Testing** | Vitest + Playwright |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 20.0.0
- PostgreSQL database (local: SQLite supported for dev)

### 1. Clone & Install

```bash
git clone <your-repo-url> pdf-summarizer
cd pdf-summarizer
npm install
```

### 2. Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in the required variables:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (SQLite for local dev)
DATABASE_URL="file:./dev.db"

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_***
CLERK_SECRET_KEY=sk_test_***

# AI (at least one provider required)
DEEPSEEK_API_KEY=sk-***
# GROQ_API_KEY=gsk_***
# SILICONFLOW_API_KEY=sk-***

# Creem Payments (for production)
NEXT_PUBLIC_CREEM_PRICE_MONTHLY=prod_***
NEXT_PUBLIC_CREEM_PRICE_YEARLY=prod_***
CREEM_SECRET_KEY=creem_***
CREEM_WEBHOOK_SECRET=whsec_***
```

### 3. Initialize Database

```bash
npx prisma db push
```

### 4. Start Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📦 Scripts

| Command | Description |
|---------|------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run check-config` | Validate environment config |

---

## 🌍 Internationalization

Translations live in `messages/`:
- `en.json` — English (base)
- `zh.json` — Chinese
- `ja.json` — Japanese
- `ko.json` — Korean
- `es.json` — Spanish
- `fr.json` — French
- `de.json` — German

To add a new language:
1. Copy `messages/en.json` → `messages/xx.json`
2. Translate all values
3. Add locale to `navigation.ts` routing config

---

## 🔒 Security

- **CSP Headers** — Strict Content Security Policy
- **HSTS** — Preloaded with 2-year max-age
- **HMAC Webhook Verification** — Timing-safe comparison for Creem
- **Rate Limiting** — Per-user/per-IP with LRU eviction
- **Zod Validation** — All API inputs validated
- **GDPR** — Data minimization, cookie consent, content truncation

---

## 📁 Project Structure

```
├── app/
│   ├── [locale]/          # i18n pages (dashboard, pricing, help, etc.)
│   ├── api/               # API routes (summarize, upload, webhooks, etc.)
│   ├── robots.ts          # SEO robots.txt
│   └── sitemap.ts         # Multi-language sitemap
├── components/            # Shared React components
├── lib/                   # Utilities (ai, db, logger, rate-limit, schemas)
├── messages/              # i18n translation files
├── prisma/                # Database schema
├── tests/                 # Unit & E2E tests
├── types/                 # TypeScript type declarations
├── middleware.ts           # Auth (Clerk) + i18n routing
├── next.config.mjs        # Next.js config (Sentry, CSP, i18n)
└── vercel.json            # Vercel deployment config
```

---

## 🚢 Deployment

This project is configured for **Vercel** with automatic deploys.

```bash
# 1. Push to GitHub
git push origin main

# 2. Import in Vercel
# - Framework: Next.js
# - Build Command: npm run vercel-build
# - Root Directory: ./

# 3. Set all environment variables in Vercel dashboard
```

For manual deployment scripts, see `deploy-production.sh` / `deploy-production.bat`.

---

## 📄 License

All rights reserved. © 2024 PDF Summarizer
