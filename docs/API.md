# API Reference

## Authentication

All protected endpoints require an `__auth_token` cookie obtained via sign-in.

### Auth Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/auth/sign-up` | Register new account | No |
| POST | `/api/auth/sign-in` | Login and set auth cookie | No |
| POST | `/api/auth/sign-out` | Clear auth cookie | Yes |
| GET | `/api/auth/me` | Get current user profile | Yes |
| POST | `/api/auth/forgot-password` | Request password reset email | No |
| POST | `/api/auth/reset-password` | Reset password with token | No |
| POST | `/api/auth/resend-verification` | Resend email verification | No |
| GET | `/api/auth/verify-email` | Verify email with token | No |

### Document Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/upload` | Upload PDF/DOCX file | Yes |
| POST | `/api/summarize` | Summarize document (non-streaming) | Yes |
| POST | `/api/summarize/stream` | Summarize with SSE streaming | Yes |
| GET | `/api/documents` | List user documents | Yes |
| GET | `/api/documents/[id]` | Get document by ID | Yes |
| DELETE | `/api/documents/[id]` | Delete document | Yes |
| POST | `/api/documents/[id]/share` | Toggle document sharing | Yes |

### Usage & Billing

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/usage` | Get usage statistics | Yes |
| GET | `/api/subscription` | Get subscription details | Yes |
| POST | `/api/checkout/create` | Create checkout session | Yes |
| GET | `/api/customer-portal` | Get customer portal URL | Yes |
| POST | `/api/payment/submit` | Submit manual payment | Yes |

### Developer API (v1)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/summarize` | Summarize text via API key | API Key |
| GET | `/api/v1/keys` | List API keys | Cookie |
| POST | `/api/v1/keys` | Create API key | Cookie |
| DELETE | `/api/v1/keys/[keyId]` | Revoke API key | Cookie |

**API Key Authentication**: Send `Authorization: Bearer sk_xxxxx` header.

**Rate Limits**:
- Guest: 3 requests/day
- Free: 5 requests/day
- Pro: 100 requests/day
- API (v1): 60 requests/hour

### Admin Endpoints

| Method | Path | Description | Admin Required |
|--------|------|-------------|----------------|
| GET | `/api/admin/pending` | List pending payments | Yes |
| GET | `/api/admin/stats` | Get platform statistics | Yes |
| POST | `/api/admin/approve` | Approve payment | Yes |
| POST | `/api/admin/reject` | Reject payment | Yes |
| GET | `/api/admin/reviews` | List pending reviews | Yes |

### System Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/ping` | Simple ping |
| GET | `/api/version` | Version info |
| GET | `/api/config` | Public configuration |
| POST | `/api/web-vitals` | Report Web Vitals |
| POST | `/api/feedback` | Submit feedback |
| POST | `/api/webhooks/creem` | Creem payment webhook |

### Cron Jobs

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/cron/alerts` | Send usage alerts | CRON_SECRET |
| GET | `/api/cron/downgrade-expired` | Downgrade expired subscriptions | CRON_SECRET |
| GET | `/api/cron/send-activation-reminder` | Send activation reminders | CRON_SECRET |
| GET | `/api/cron/send-winback` | Send win-back emails | CRON_SECRET |

## Error Responses

All errors return JSON with consistent format:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common status codes: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 429 (rate limited), 500 (server error).

Rate limit responses include `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers.
