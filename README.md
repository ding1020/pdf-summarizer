<div align="center">

# 📄 PDFSum

### Summarize any PDF in 30 seconds with AI

**7 languages · Streaming output · Free tier · No credit card**

[![Live Site](https://img.shields.io/badge/🌐_Live_Site-pdfsum.com-blue?style=for-the-badge)](https://www.pdfsum.com)
[![Blog](https://img.shields.io/badge/📖_Blog-20+_Articles-green?style=for-the-badge)](https://www.pdfsum.com/en/blog)
[![License](https://img.shields.io/badge/License-All_Rights_Reserved-lightgrey?style=for-the-badge)](#license)

</div>

---

> **TL;DR** — Upload a PDF, get a structured AI summary in seconds. Built for students, researchers, and professionals who read too much. **[Try it free →](https://www.pdfsum.com)**

---

## 🎯 What it does

| Feature | Description |
|---------|-------------|
| ⚡ **Instant AI Summary** | Upload any PDF → get an executive summary + key findings + action items in ~30 seconds |
| 🌍 **7 Languages** | English · 中文 · 日本語 · 한국어 · Español · Français · Deutsch |
| 🔄 **Multi-Provider Fallback** | DeepSeek → Groq → SiliconFlow automatic failover (no single point of failure) |
| 📡 **Streaming Output** | See the summary build in real time via SSE |
| 🔐 **GDPR Compliant** | Data minimization, cookie consent, right to deletion, files auto-purged |
| 🧑‍💻 **Guest Mode** | Try 3 summaries/day with no signup |
| 💳 **Pro Plan** | Unlimited summaries + priority AI via Creem subscription |
| 🔌 **Developer API** | REST API for programmatic PDF summarization |

---

## 🖼️ Screenshots

| Home | Summary Generation |
|:---:|:---:|
| ![Home](https://www.pdfsum.com/og-image.png) | _Upload a PDF to see streaming AI summary in action_ |

> **[Open the live app to see it in action →](https://www.pdfsum.com)**

---

## 🚀 Try it now

1. Go to **[pdfsum.com](https://www.pdfsum.com)**
2. Click **"Get Started Free"**
3. Upload any PDF (≤ 20 MB)
4. Watch the AI summary stream in real time

**No credit card. No installation. 3 free summaries/day as a guest, 5/day with a free account.**

---

## 📖 Read the Blog

20+ SEO-optimized articles on PDF summarization, AI tools, and productivity:

- [How to Summarize a PDF: Complete Guide (2026)](https://www.pdfsum.com/en/blog/how-to-summarize-a-pdf)
- [Summarize Research Papers with AI](https://www.pdfsum.com/en/blog/summarize-research-papers-ai)
- [Best Free AI Document Summarizer in 2026](https://www.pdfsum.com/en/blog/free-ai-document-summarizer)
- [PDF Summary API for Developers](https://www.pdfsum.com/en/blog/pdf-summary-api-developers)
- [Summarize Legal Documents with AI](https://www.pdfsum.com/en/blog/summarize-legal-documents-ai)

**[View all articles →](https://www.pdfsum.com/en/blog)**

---

## 💰 Pricing

| Plan | Price | Summaries/day | Features |
|------|-------|---------------|----------|
| **Guest** | Free | 3 | No signup, no credit card |
| **Free** | Free | 5 | Account required |
| **Pro Monthly** | $7/mo | Unlimited | Priority AI, Markdown export |
| **Pro Yearly** | $59/yr | Unlimited | ~2 months free, priority AI |

**[See full pricing →](https://www.pdfsum.com/en/pricing)**

---

## 🛠️ Tech Stack

<details>
<summary><b>Click to expand — for developers</b></summary>

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5.x |
| **Auth** | Self-built JWT (HMAC-SHA256) |
| **Database** | PostgreSQL (Supabase) + Prisma ORM |
| **AI** | DeepSeek · Groq · SiliconFlow (OpenAI-compatible) |
| **Payments** | Creem (subscriptions + webhooks + customer portal) |
| **i18n** | next-intl v4 |
| **Styling** | Tailwind CSS 3 |
| **Monitoring** | Sentry |
| **Email** | Resend (11 transactional templates) |
| **Deployment** | Vercel (US East) |
| **Testing** | Vitest + Playwright |

</details>

---

## 🔒 Security & Compliance

- **CSP Headers** — Strict Content Security Policy
- **HSTS** — Preloaded with 2-year max-age
- **HMAC Webhook Verification** — Timing-safe comparison for Creem
- **Rate Limiting** — Per-user/per-IP with LRU eviction
- **Zod Validation** — All API inputs validated
- **GDPR** — Data minimization, cookie consent, content truncation, right to erasure

---

## 💻 Self-Host / Develop

<details>
<summary><b>Local development setup</b></summary>

### Prerequisites
- Node.js ≥ 20.0.0
- PostgreSQL (or SQLite for local dev)

### 1. Clone & Install

```bash
git clone https://github.com/ding1020/pdf-summarizer.git
cd pdf-summarizer
npm install
```

### 2. Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL="file:./dev.db"
AUTH_SECRET=replace_with_64char_hex_secret
DEEPSEEK_API_KEY=sk-***
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

</details>

---

## 📁 Project Structure

```
├── app/
│   ├── [locale]/          # i18n pages (home, dashboard, pricing, blog, etc.)
│   ├── api/               # 41 API routes (summarize, upload, webhooks, etc.)
│   ├── robots.ts          # SEO robots.txt
│   └── sitemap.ts         # Multi-language sitemap (200+ URLs)
├── components/            # Shared React components
├── lib/                   # AI providers, db, auth, rate-limit, logger
│   └── blog-posts.ts     # 20 SEO articles data
├── messages/              # 7-language i18n files
├── prisma/                # Database schema (8 models)
├── tests/                 # Unit & E2E tests
├── middleware.ts          # JWT auth + i18n routing
└── next.config.mjs        # Next.js config (Sentry, CSP, i18n)
```

---

## 📊 Project Stats

- **123+** git commits
- **41** API routes
- **8** database models
- **20** SEO blog articles
- **7** supported languages
- **200+** sitemap URLs
- **11** transactional email templates
- **3** scheduled cron jobs

---

## 🗺️ Roadmap

- [ ] PDF Q&A chat (chat with your document)
- [ ] Batch PDF processing
- [ ] Chrome extension
- [ ] Export to PDF / Word / Markdown
- [ ] API key dashboard for developers
- [ ] Team accounts

---

## 🤝 Connect

- **Live Site:** [pdfsum.com](https://www.pdfsum.com)
- **Blog:** [pdfsum.com/en/blog](https://www.pdfsum.com/en/blog)
- **GitHub:** [github.com/ding1020/pdf-summarizer](https://github.com/ding1020/pdf-summarizer)
- **Issues:** [Report a bug](https://github.com/ding1020/pdf-summarizer/issues)

---

## 📄 License

All rights reserved. © 2024–2026 PDFSum. The source code is viewable for reference; the live product is a commercial SaaS.

---

<div align="center">

**[⭐ Star this repo](https://github.com/ding1020/pdf-summarizer)** if you find it useful!

**[🚀 Try PDFSum free →](https://www.pdfsum.com)**

</div>
