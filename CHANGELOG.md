# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-08

### Added
- HMAC-SHA256 token-based authentication system (Node.js + Edge Runtime)
- CSRF double-submit cookie protection
- Content Security Policy (CSP) with per-request nonce
- Rate limiting with Redis backend + in-memory fallback
- AI provider fallback chain (DeepSeek → Groq → SiliconFlow)
- Content-hash based AI summary caching
- OCR provider abstraction layer (Tencent, Google, AWS, Azure)
- Email verification flow with Resend
- Password reset flow
- API key management for developer API (v1)
- Web Vitals monitoring
- Audit logging for security events
- 7-language internationalization (en, zh, ja, ko, es, fr, de)
- Blog with static generation
- Review/testimonial system
- Payment integration (Creem + manual approval)
- Usage-based billing (planTier, usageOverage)
- CI/CD pipeline with GitHub Actions (lint, type-check, test, build, deploy)
- Security scanning (npm audit, Snyk, Trivy)
- Database backup automation
- Comprehensive test suite (171 tests)

### Security
- bcrypt password hashing (12 rounds)
- SSRF protection in PDF processing
- IDOR protection on document ownership
- Webhook HMAC signature verification + idempotency
- API key stored as SHA-256 hash
- Atomic usage limit (bypass-proof, PgBouncer compatible)
- Zod environment variable validation
- Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

### Changed
- Migrated from Clerk to native authentication
- Upgraded to Next.js 16 with App Router
- Adopted Turbopack for development (webpack for production builds on Windows)
- Centralized AI model configuration
- Unified summarize service across web, stream, and API routes

## [0.1.0] - 2024

### Added
- Initial release with basic PDF summarization
- User authentication via Clerk
- Dashboard for document management
- Pricing page with Stripe integration
