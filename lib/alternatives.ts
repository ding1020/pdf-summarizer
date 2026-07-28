/**
 * Competitor comparison data — used by /alternatives/[slug] pages.
 * Each page targets "[competitor] alternative" keywords (high purchase intent).
 */

export interface ComparisonFeature {
  feature: string;
  pdfsum: string;
  competitor: string;
  pdfsumWins: boolean;
}

export interface Alternative {
  slug: string;
  competitorName: string;
  competitorUrl: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  whySwitch: string[];
  comparison: ComparisonFeature[];
  verdict: string;
  faqs: { question: string; answer: string }[];
}

export const alternatives: Record<string, Alternative> = {
  "chatpdf": {
    slug: "chatpdf",
    competitorName: "ChatPDF",
    competitorUrl: "https://www.chatpdf.com",
    title: "Best ChatPDF Alternative in 2026",
    metaTitle: "Best ChatPDF Alternative in 2026 | PDFSum — Free, 7 Languages, No Credit Card",
    metaDescription: "Looking for a ChatPDF alternative? PDFSum offers 7-language support, more free summaries (5/day vs 2/day), and better AI quality. Try free — no credit card.",
    h1: "Best ChatPDF Alternative in 2026",
    intro: "ChatPDF is a popular tool for chatting with PDFs, but it has real limitations: only 2 languages, just 2 free summaries per day, and a 10MB file size cap. PDFSum fixes all of these while staying free to start.",
    whySwitch: [
      "5 free summaries per day (ChatPDF gives you only 2)",
      "7 languages including Chinese, Japanese, Korean (ChatPDF supports only English and one more)",
      "20MB file size limit (ChatPDF caps at 10MB)",
      "Streaming output — see results instantly instead of waiting",
      "Developer API available for programmatic access",
      "GDPR compliant with automatic file deletion",
    ],
    comparison: [
      { feature: "Free summaries/day", pdfsum: "5", competitor: "2", pdfsumWins: true },
      { feature: "Languages supported", pdfsum: "7", competitor: "2", pdfsumWins: true },
      { feature: "Max file size", pdfsum: "20MB", competitor: "10MB", pdfsumWins: true },
      { feature: "Streaming output", pdfsum: "Yes", competitor: "No", pdfsumWins: true },
      { feature: "Developer API", pdfsum: "Yes", competitor: "No", pdfsumWins: true },
      { feature: "GDPR compliant", pdfsum: "Yes", competitor: "Limited", pdfsumWins: true },
      { feature: "Summary + Chat", pdfsum: "Both", competitor: "Chat only", pdfsumWins: true },
      { feature: "Pro price/month", pdfsum: "$7", competitor: "$5", pdfsumWins: false },
      { feature: "Pro yearly", pdfsum: "$59", competitor: "$60", pdfsumWins: true },
      { feature: "AI model", pdfsum: "DeepSeek + fallbacks", competitor: "GPT-3.5", pdfsumWins: true },
    ],
    verdict: "If you need multi-language support, more free summaries, or a developer API, PDFSum is the clear ChatPDF alternative. ChatPDF is better if you specifically need a chat interface to ask questions about a single PDF. For everything else — summarization, international documents, and developer integration — PDFSum wins.",
    faqs: [
      { question: "Is PDFSum really free?", answer: "Yes. You get 5 free summaries per day with a free account, or 3 per day as a guest without any signup. No credit card required." },
      { question: "Can PDFSum chat with PDFs like ChatPDF?", answer: "Yes! PDFSum now includes Chat with PDF — ask questions about your document and get AI-powered answers with source context. Plus you get structured summaries on top, which ChatPDF doesn't offer." },
      { question: "Does PDFSum support Chinese PDFs?", answer: "Yes. PDFSum supports 7 languages including Chinese, Japanese, Korean, Spanish, French, German, and English. ChatPDF only supports 2 languages." },
      { question: "Can I use PDFSum's API?", answer: "Yes. PDFSum offers a developer API for programmatic PDF summarization. ChatPDF does not offer a public API." },
    ],
  },
  "notion-ai": {
    slug: "notion-ai",
    competitorName: "Notion AI",
    competitorUrl: "https://www.notion.so/product/ai",
    title: "Best Notion AI Alternative for PDF Summarization",
    metaTitle: "Notion AI Alternative for PDF Summarization | PDFSum — Free, No Subscription",
    metaDescription: "Notion AI charges $10/member/month just for AI. PDFSum summarizes PDFs for free (5/day) with better AI quality. Dedicated PDF summarizer — try free.",
    h1: "Best Notion AI Alternative for PDF Summarization",
    intro: "Notion AI is great for writing and organizing notes, but it charges $10 per member per month just for AI features — and it's not designed specifically for PDF summarization. PDFSum is a dedicated PDF summarizer that's free to start and purpose-built for the task.",
    whySwitch: [
      "Free tier: 5 summaries/day (Notion AI has no free tier — $10/member/month)",
      "Purpose-built for PDF summarization (Notion AI is a general writing assistant)",
      "Handles larger documents up to 20MB (Notion has content limits)",
      "7-language support for the AI output (Notion AI is English-focused)",
      "Streaming output optimized for long documents",
      "No subscription needed to try — guest mode with 3 free summaries",
    ],
    comparison: [
      { feature: "Price", pdfsum: "Free to start", competitor: "$10/member/month", pdfsumWins: true },
      { feature: "Free tier", pdfsum: "5 summaries/day", competitor: "None", pdfsumWins: true },
      { feature: "Dedicated PDF tool", pdfsum: "Yes", competitor: "No (general AI)", pdfsumWins: true },
      { feature: "Max file size", pdfsum: "20MB", competitor: "Limited", pdfsumWins: true },
      { feature: "Languages", pdfsum: "7", competitor: "English-focused", pdfsumWins: true },
      { feature: "Streaming output", pdfsum: "Yes", competitor: "No", pdfsumWins: true },
      { feature: "Developer API", pdfsum: "Yes", competitor: "No", pdfsumWins: true },
      { feature: "Note-taking", pdfsum: "No", competitor: "Yes", pdfsumWins: false },
      { feature: "AI model", pdfsum: "DeepSeek", competitor: "GPT-4", pdfsumWins: false },
    ],
    verdict: "If you just need to summarize PDFs, PDFSum is far more cost-effective than Notion AI. Notion AI makes sense if you also need note-taking, project management, and team collaboration. But for pure PDF summarization, PDFSum gives you better features for free.",
    faqs: [
      { question: "Is PDFSum cheaper than Notion AI?", answer: "Much cheaper. PDFSum is free to start (5 summaries/day). Notion AI costs $10 per member per month. PDFSum Pro is $7/month vs Notion AI's $10/member/month." },
      { question: "Does PDFSum integrate with Notion?", answer: "Not directly, but you can copy PDFSum's Markdown summaries into Notion easily. The summaries are formatted in clean Markdown." },
      { question: "Which has better AI for PDFs?", answer: "PDFSum uses DeepSeek which excels at document understanding and multi-language output. Notion AI uses GPT-4 which is strong but more expensive and English-focused." },
    ],
  },
  "pdf-ai": {
    slug: "pdf-ai",
    competitorName: "PDF.ai",
    competitorUrl: "https://pdf.ai",
    title: "Best PDF.ai Alternative in 2026",
    metaTitle: "Best PDF.ai Alternative | PDFSum — 5x More Free Summaries, 7 Languages",
    metaDescription: "PDF.ai gives only 1 free summary/day and supports 3 languages. PDFSum gives 5/day free, 7 languages, and a developer API. Switch free.",
    h1: "Best PDF.ai Alternative in 2026",
    intro: "PDF.ai is a decent PDF tool, but its free tier is extremely limited — just 1 summary per day, 3 languages, and a 5MB file size cap. PDFSum offers 5x more free summaries, 7 languages, and 4x larger file uploads.",
    whySwitch: [
      "5 free summaries/day (PDF.ai gives only 1)",
      "7 languages vs PDF.ai's 3",
      "20MB file size vs PDF.ai's 5MB — upload full research papers",
      "Developer API included (PDF.ai has none)",
      "Streaming output for instant results",
      "Competitive Pro pricing: $7/month vs PDF.ai's higher tiers",
    ],
    comparison: [
      { feature: "Free summaries/day", pdfsum: "5", competitor: "1", pdfsumWins: true },
      { feature: "Languages", pdfsum: "7", competitor: "3", pdfsumWins: true },
      { feature: "Max file size", pdfsum: "20MB", competitor: "5MB", pdfsumWins: true },
      { feature: "Developer API", pdfsum: "Yes", competitor: "No", pdfsumWins: true },
      { feature: "Streaming output", pdfsum: "Yes", competitor: "No", pdfsumWins: true },
      { feature: "Pro price/month", pdfsum: "$7", competitor: "$10+", pdfsumWins: true },
      { feature: "Pro yearly", pdfsum: "$59", competitor: "$100+", pdfsumWins: true },
      { feature: "Chat mode", pdfsum: "Roadmap", competitor: "Yes", pdfsumWins: false },
      { feature: "GDPR compliant", pdfsum: "Yes", competitor: "Limited", pdfsumWins: true },
    ],
    verdict: "PDF.ai's free tier is too restrictive for regular use. PDFSum gives you 5x more free summaries, better language support, larger file uploads, and a developer API — all for free. If you need a chat interface, PDF.ai has that feature today, but for summarization PDFSum is clearly better value.",
    faqs: [
      { question: "How is PDFSum free when PDF.ai charges so much?", answer: "PDFSum uses cost-efficient AI providers (DeepSeek, Groq, SiliconFlow) with automatic fallback. This keeps AI costs near zero. We monetize through Pro subscriptions, not by limiting free users aggressively." },
      { question: "Does PDFSum have a chat feature like PDF.ai?", answer: "A Q&A chat feature is on our roadmap. Currently PDFSum focuses on generating high-quality structured summaries, which many users prefer over chat." },
      { question: "Can I upload larger PDFs than 5MB?", answer: "Yes — PDFSum supports files up to 20MB, perfect for research papers, reports, and textbooks that PDF.ai's 5MB limit rejects." },
    ],
  },
  "updf": {
    slug: "updf",
    competitorName: "UPDF",
    competitorUrl: "https://updf.com",
    title: "Best UPDF Alternative for AI PDF Summarization",
    metaTitle: "UPDF Alternative for PDF Summarization | PDFSum — Free, 7 Languages, No Download",
    metaDescription: "UPDF requires a desktop download and gives only 3 free summaries/day. PDFSum works in your browser, gives 5/day free, supports 7 languages. Try free.",
    h1: "Best UPDF Alternative for AI PDF Summarization",
    intro: "UPDF is a desktop PDF editor that added AI summarization, but it requires downloading software, gives only 3 free summaries per day, and supports 5 languages. PDFSum works entirely in your browser with 5 free summaries/day and 7-language support.",
    whySwitch: [
      "No download needed — works in your browser (UPDF requires desktop installation)",
      "5 free summaries/day (UPDF gives 3)",
      "7 languages vs UPDF's 5",
      "20MB file size vs UPDF's 15MB",
      "Works on any device — Windows, Mac, Linux, mobile (UPDF is desktop-only)",
      "Developer API for programmatic access (UPDF has none)",
    ],
    comparison: [
      { feature: "Platform", pdfsum: "Web (any device)", competitor: "Desktop app", pdfsumWins: true },
      { feature: "Free summaries/day", pdfsum: "5", competitor: "3", pdfsumWins: true },
      { feature: "Languages", pdfsum: "7", competitor: "5", pdfsumWins: true },
      { feature: "Max file size", pdfsum: "20MB", competitor: "15MB", pdfsumWins: true },
      { feature: "Developer API", pdfsum: "Yes", competitor: "No", pdfsumWins: true },
      { feature: "PDF editing", pdfsum: "No", competitor: "Yes", pdfsumWins: false },
      { feature: "Pro price/month", pdfsum: "$7", competitor: "$6", pdfsumWins: false },
      { feature: "Installation required", pdfsum: "No", competitor: "Yes", pdfsumWins: true },
    ],
    verdict: "If you need a full PDF editor with annotation and editing tools, UPDF is the better choice. But if you just need AI summarization, PDFSum is more convenient (no download), gives more free summaries, and works on any device. For summarization specifically, PDFSum wins on every metric.",
    faqs: [
      { question: "Does PDFSum require installation?", answer: "No. PDFSum runs entirely in your web browser. Just go to pdfsum.com, upload a PDF, and get your summary. Works on Windows, Mac, Linux, iPhone, and Android." },
      { question: "Can PDFSum edit PDFs like UPDF?", answer: "No, PDFSum is focused on AI summarization, not PDF editing. If you need to edit, annotate, or convert PDFs, UPDF is better for that. But for summarization, PDFSum is superior." },
      { question: "Is PDFSum faster than UPDF?", answer: "PDFSum uses streaming output, so you see results immediately. UPDF's desktop AI may have similar speed, but requires launching the app first." },
    ],
  },
  "smallpdf": {
    slug: "smallpdf",
    competitorName: "Smallpdf",
    competitorUrl: "https://smallpdf.com",
    title: "Best Smallpdf Alternative for PDF Summarization",
    metaTitle: "Smallpdf Alternative for PDF Summarization | PDFSum — Free Summaries, No Trial Limit",
    metaDescription: "Smallpdf has no free AI summarization (trial only). PDFSum gives 5 free summaries/day with 7-language support. Switch to a real free tier.",
    h1: "Best Smallpdf Alternative for PDF Summarization",
    intro: "Smallpdf is a well-known PDF tool suite, but its AI summarization has no real free tier — only a limited trial. After that, you need a paid plan. PDFSum offers 5 genuinely free summaries per day with no trial expiration.",
    whySwitch: [
      "5 free summaries/day, forever (Smallpdf only offers a trial)",
      "No trial expiration — free tier is permanent",
      "7 languages vs Smallpdf's primarily English interface",
      "Streaming output optimized for AI summaries (Smallpdf is general-purpose)",
      "Developer API (Smallpdf has no AI API)",
      "Competitive pricing: $7/month Pro vs Smallpdf's $12/month",
    ],
    comparison: [
      { feature: "Free tier", pdfsum: "5 summaries/day forever", competitor: "Trial only", pdfsumWins: true },
      { feature: "Pro price/month", pdfsum: "$7", competitor: "$12", pdfsumWins: true },
      { feature: "Pro yearly", pdfsum: "$59", competitor: "$108", pdfsumWins: true },
      { feature: "Languages", pdfsum: "7", competitor: "10+ (UI only)", pdfsumWins: false },
      { feature: "Developer API", pdfsum: "Yes", competitor: "No (AI)", pdfsumWins: true },
      { feature: "PDF tools", pdfsum: "Summarization", competitor: "20+ tools", pdfsumWins: false },
      { feature: "Streaming output", pdfsum: "Yes", competitor: "No", pdfsumWins: true },
      { feature: "AI summarization focus", pdfsum: "Dedicated", competitor: "One of many", pdfsumWins: true },
    ],
    verdict: "Smallpdf is great if you need many PDF tools (merge, split, convert, compress). But for AI summarization specifically, PDFSum is the better choice: genuinely free (not a trial), 60% cheaper Pro plan, and purpose-built for AI summaries. If you only need summarization, don't pay Smallpdf's premium.",
    faqs: [
      { question: "Is PDFSum's free tier really permanent?", answer: "Yes. You get 5 free summaries per day, every day, forever. Smallpdf only offers a time-limited trial — after it expires, you must pay." },
      { question: "Does PDFSum have other PDF tools like Smallpdf?", answer: "No. PDFSum specializes in AI PDF summarization. If you need merge, split, compress, or convert, Smallpdf is better. But for AI summaries, PDFSum is superior and cheaper." },
      { question: "Why is PDFSum cheaper than Smallpdf?", answer: "PDFSum uses cost-efficient AI providers (DeepSeek) with near-zero per-summary costs. We pass those savings to users. Smallpdf charges a premium for its full tool suite." },
    ],
  },
};

export const alternativeSlugs = Object.keys(alternatives);
