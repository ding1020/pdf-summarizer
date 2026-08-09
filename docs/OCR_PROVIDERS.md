# OCR Providers

This project supports multiple OCR (Optical Character Recognition) providers
for processing **scanned PDFs** — PDFs that contain images of text rather than
an embedded text layer. When `pdf-parse` extracts little or no text, the OCR
fallback renders each page to an image and sends it to the configured OCR
provider.

An abstraction layer (`lib/ocr-provider.ts`) decouples the PDF pipeline from
any single OCR vendor, so you can choose the best provider for your market and
infrastructure.

---

## How it works

```
PDF buffer
   │
   ▼
renderPdfToImages()   ── pdfjs-dist + @napi-rs/canvas ──►  PNG per page
   │
   ▼
getOcrProvider()      ── reads OCR_PROVIDER + credentials ──►  OcrProvider | null
   │
   ▼
provider.ocrImage(b64)  ── REST call to the selected vendor ──►  page text
   │
   ▼
concatenated text  ──►  AI summarizer
```

- **Interface** — every provider implements `OcrProvider`:
  ```ts
  export interface OcrProvider {
    readonly name: string;
    ocrImage(imageBase64: string): Promise<string>;
  }
  ```
- **Factory** — `getOcrProvider()` inspects the environment once, instantiates
  the matching provider, and caches it for the lifetime of the process.
- **No SDKs** — all providers use plain `fetch` + the Node `crypto` module, so
  the bundle stays small.
- **Graceful disable** — if the requested provider's credentials are missing,
  the factory returns `null` and `pdfOcrFallback()` throws a clear,
  actionable error. Only text-based PDFs can be summarized in that case.

---

## Choosing a provider

| Provider | OCR_PROVIDER | Best for | Env vars required |
| --- | --- | --- | --- |
| **Tencent Cloud** (default) | `tencent` or unset | Chinese-language documents, China deployments | `TENCENT_SECRET_ID`, `TENCENT_SECRET_KEY` |
| **Google Cloud Vision** | `google` | International / multilingual, global reach | `GOOGLE_VISION_API_KEY` |
| **AWS Textract** | `aws` | International, AWS-hosted workloads | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` |
| **Azure Computer Vision** | `azure` | International, Azure-hosted workloads | `AZURE_COMPUTER_VISION_KEY`, `AZURE_COMPUTER_VISION_ENDPOINT` |

### Market guidance

- **China-focused deployments** — keep `OCR_PROVIDER=tencent` (the default).
  Tencent Cloud's GeneralBasicOCR delivers the best accuracy for Simplified
  Chinese and is reachable from mainland China without a VPN.
- **International deployments** — use `google`, `aws`, or `azure`. These
  providers excel at Latin, Cyrillic, Arabic, and CJK scripts alike and are
  globally accessible. Tencent Cloud endpoints are often slow or unreachable
  outside China.
- **Already on a cloud platform** — pick the matching provider to keep
  traffic in-region and reuse existing credentials/billing (e.g. AWS
  workloads → Textract, Azure workloads → Computer Vision).

---

## Provider setup

### 1. Tencent Cloud OCR (default)

Best-in-class for Chinese scanned documents.

1. Go to <https://console.cloud.tencent.com/cam/capi> and create API
   credentials (SecretId / SecretKey).
2. Open the OCR console and activate **GeneralBasicOCR**.
3. Set environment variables:
   ```env
   OCR_PROVIDER=tencent
   TENCENT_SECRET_ID=your_secret_id
   TENCENT_SECRET_KEY=your_secret_key
   ```

Implementation: `lib/ocr-providers/tencent.ts` wraps `lib/tencent-ocr.ts`
(TC3-HMAC-SHA256 signed REST call to `ocr.tencentcloudapi.com`).

**Pricing** (GeneralBasicOCR):
- Free tier: **1,000 calls/month**.
- Paid: ~0.15 CNY per call after the free tier (see the official
  [Tencent OCR pricing page](https://cloud.tencent.com/document/product/866/17619)
  for current rates).

---

### 2. Google Cloud Vision

Excellent multilingual accuracy with a generous free tier.

1. Create / select a project in the
   [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Cloud Vision API** (APIs & Services → Library).
3. Go to **APIs & Services → Credentials** → **Create credentials → API key**.
4. (Recommended) Restrict the key to the Cloud Vision API and your domain.
5. Set environment variables:
   ```env
   OCR_PROVIDER=google
   GOOGLE_VISION_API_KEY=your_api_key
   ```

> Alternatively, set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account
> JSON path. However, the provider currently authenticates via API key, so
> `GOOGLE_VISION_API_KEY` is the recommended and simplest path.

Implementation: `lib/ocr-providers/google-vision.ts` calls the
`images:annotate` REST endpoint with the `TEXT_DETECTION` feature.

**Pricing** ([source](https://cloud.google.com/vision/pricing)):
- Free tier: **first 1,000 units/month free** (a unit = one image/page).
- 1,001 – 5,000,000 units/month: **$1.50 per 1,000 units**.
- 5,000,001+ units/month: **$0.60 per 1,000 units**.

---

### 3. AWS Textract

Strong for printed and handwritten English/Latin text; ideal if you already
run on AWS.

1. In the [AWS IAM console](https://console.aws.amazon.com/iam), create a
   user (programmatic access) and attach the
   `AmazonTextractFullAccess` policy.
2. Create an access key and note the **Access Key ID** and **Secret Access
   Key**.
3. Pick a region where Textract is available (e.g. `us-east-1`).
4. Set environment variables:
   ```env
   OCR_PROVIDER=aws
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1
   ```

Implementation: `lib/ocr-providers/aws-textract.ts` calls the
`DetectDocumentText` action on `https://textract.<region>.amazonaws.com`,
signing the request with **AWS Signature V4** computed manually via the
`crypto` module (no AWS SDK).

**Pricing** ([source](https://aws.amazon.com/textract/pricing/)):
- Free tier: **1,000 pages/month for the first 3 months** (new AWS
  accounts).
- Detect Document Text: **$1.50 per 1,000 pages** (first 1M pages/month),
  then **$0.60 per 1,000 pages** above 1M/month.

---

### 4. Azure Computer Vision

Good multilingual OCR; natural fit for Azure-hosted deployments.

1. In the [Azure Portal](https://portal.azure.com), create a **Computer
   Vision** resource.
2. Open the resource and copy a **KEY** and the **Endpoint** URL
   (region-specific, e.g. `https://myresource.cognitiveservices.azure.com`).
3. Set environment variables:
   ```env
   OCR_PROVIDER=azure
   AZURE_COMPUTER_VISION_KEY=your_key
   AZURE_COMPUTER_VISION_ENDPOINT=https://your-resource.cognitiveservices.azure.com
   ```

Implementation: `lib/ocr-providers/azure.ts` calls the synchronous OCR
(v3.2) endpoint, sending raw image bytes with the
`Ocp-Apim-Subscription-Key` header.

**Pricing** (see the
[Azure Computer Vision pricing page](https://azure.microsoft.com/pricing/details/cognitive-services/computer-vision/)
for current rates):
- Free tier (F0): **5,000 transactions/month** (first month), then
  **500 transactions/month**.
- Standard (S1): approximately **$1.00 per 1,000 transactions** for the
  Read/OCR feature.

---

## Environment variable reference

| Variable | Provider | Required | Description |
| --- | --- | --- | --- |
| `OCR_PROVIDER` | all | No (defaults to `tencent`) | One of `tencent`, `google`, `aws`, `azure` |
| `TENCENT_SECRET_ID` | tencent | Yes | Tencent Cloud API SecretId |
| `TENCENT_SECRET_KEY` | tencent | Yes | Tencent Cloud API SecretKey |
| `GOOGLE_VISION_API_KEY` | google | Yes | Google Cloud Vision API key |
| `GOOGLE_APPLICATION_CREDENTIALS` | google | Alt. | Path to a service-account JSON (selects google; API key still recommended) |
| `AWS_ACCESS_KEY_ID` | aws | Yes | AWS access key ID |
| `AWS_SECRET_ACCESS_KEY` | aws | Yes | AWS secret access key |
| `AWS_REGION` | aws | No (defaults to `us-east-1`) | AWS region for Textract |

---

## Architecture notes

- **No bundle bloat.** Every provider uses the built-in `fetch` and `crypto`
  modules — no vendor SDK is imported, keeping the serverless bundle small.
- **Lazy caching.** `getOcrProvider()` evaluates the environment exactly once
  and caches the result. Use `resetOcrProviderCache()` in tests when env vars
  change between cases.
- **Partial failure tolerance.** If OCR fails on a single page, that page is
  skipped and the remaining pages are still processed — partial OCR is better
  than nothing.
- **Backwards compatible.** The low-level `ocrImage` function from the
  original Tencent implementation is still re-exported, so any code that
  imported it directly continues to work.

### Adding a new provider

1. Create `lib/ocr-providers/<name>.ts` exporting a class that
   `implements OcrProvider`.
2. Register it in the `switch` inside `resolveProvider()` in
   `lib/ocr-provider.ts`, guarding it with a credential check.
3. Add the env vars and setup steps to `.env.example` and this document.
