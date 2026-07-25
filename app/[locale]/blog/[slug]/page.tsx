import type { Metadata } from "next";
import { Link } from "@/navigation";

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  content: string;
}

const posts: Record<string, BlogPost> = {
  "ai-pdf-summary-guide": {
    slug: "ai-pdf-summary-guide",
    title: "How AI PDF Summarization Works: A Complete Guide",
    date: "2026-07-15",
    content: `PDF summarization has been revolutionized by large language models (LLMs). What used to require hours of manual reading now takes seconds with AI. Here's how the technology works under the hood.

## The Pipeline

### 1. Text Extraction

The first step is extracting text from the PDF. This involves:
- **Native text PDFs**: Direct text extraction using libraries like pdf-parse
- **Scanned documents**: OCR (Optical Character Recognition) converts images to text
- **Complex layouts**: Column detection and table extraction for structured data

### 2. Content Preparation

Raw PDF text is often messy. The system:
- Removes headers, footers, and page numbers
- Normalizes whitespace and line breaks
- Truncates extremely long documents to fit model context windows

### 3. AI Summarization

The prepared text is sent to an LLM with a carefully crafted prompt:
- The model receives the full document text
- A system prompt instructs it to extract key points
- The output is formatted in Markdown for readability

### 4. Provider Fallback

Modern summarizers use multiple AI providers:
- **Primary**: DeepSeek (best Chinese support)
- **Fallback 1**: Groq (free tier, fast)
- **Fallback 2**: SiliconFlow (free credits)

If one provider fails, the next one takes over automatically.

## Why AI Beats Traditional Methods

Traditional extractive summarization simply picks important sentences. AI can:
- Understand context and relationships
- Generate original, coherent prose
- Adapt tone and style to the content
- Work across multiple languages

## Try It Yourself

Upload a PDF and see AI summarization in action on the [dashboard](/dashboard).
`,
  },
  "best-pdf-summarizer-tools": {
    slug: "best-pdf-summarizer-tools",
    title: "5 Best Free PDF Summarizer Tools Compared (2026)",
    date: "2026-07-10",
    content: `The market for AI PDF summarizers has exploded. Here's our honest comparison of the top 5 free tools available in 2026.

## The Contenders

| Tool | Free Tier | AI Quality | Languages | Max File Size |
|------|-----------|------------|-----------|---------------|
| PDFSum | 5/day | ⭐⭐⭐⭐⭐ | 8 | 20MB |
| ChatPDF | 2/day | ⭐⭐⭐⭐ | 2 | 10MB |
| SmallPDF | None (trial) | ⭐⭐⭐ | 10+ | 25MB |
| UPDF | 3/day | ⭐⭐⭐ | 5 | 15MB |
| PDF.ai | 1/day | ⭐⭐⭐⭐ | 3 | 5MB |

## Our Verdict

**Best Overall: PDFSum**

PDFSum offers the most generous free tier (5 summaries/day) with the best AI quality using DeepSeek. Multi-language support (English, Chinese, Japanese, Korean, Spanish, French, German) makes it the best choice for international users.

**Best for Simple Q&A: ChatPDF**

If you need to ask questions about a specific PDF rather than get a summary, ChatPDF's chat interface is more suitable.

**Best for Occasional Use: SmallPDF**

Their paid plans include many tools beyond summarization, but the free tier only offers a trial.

## Key Features to Look For

1. **AI Model Quality**: The underlying model determines summary accuracy
2. **Language Support**: Essential if you work with non-English documents
3. **File Size Limits**: Research papers and reports can be large
4. **Privacy**: Make sure the service deletes your data after processing
5. **Export Options**: Can you download summaries as PDF, Word, or Markdown?

Try PDFSum for free at the [dashboard](/dashboard) — no credit card required.
`,
  },
  "academic-reading-faster": {
    slug: "academic-reading-faster",
    title: "Speed Up Academic Reading: AI Summaries for Research Papers",
    date: "2026-07-05",
    content: `Researchers and students spend an average of 4-6 hours reading a single research paper thoroughly. AI summarization can reduce this to under 1 minute. Here's how to integrate AI into your research workflow.

## The Problem

Academic papers are deliberately dense:
- Average paper length: 25-40 pages
- Specialized terminology requiring context
- Complex methodology sections
- Extensive literature reviews

## The AI Solution

### Step 1: Get the Overview
Upload the paper to an AI summarizer. In 30 seconds, you'll get:
- Executive summary (2-3 sentences)
- 3-5 key findings
- Methodology highlights
- Conclusions and implications

### Step 2: Deep Dive Selectively
Only read the sections relevant to your research:
- Does the methodology matter? Read that section.
- Similar approach to yours? Study the results.
- Just need the contribution? Skip to the conclusion.

### Step 3: Literature Review at Scale
Process 20-30 papers in an afternoon:
1. Upload each paper
2. Save summaries to your reference manager
3. Identify patterns across papers
4. Focus deep reading on the most relevant 5-6 papers

## Best Practices

- **Use high-quality AI models** for academic content (DeepSeek models excel here)
- **Verify key claims** — AI can miss nuance
- **Combine with traditional reading** for your most important sources
- **Export summaries** as Markdown for easy note-taking

Start processing your reading list at the [dashboard](/dashboard) today.
`,
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = posts[slug];
  if (!post) return { title: "Not Found | PDFSum Blog" };

  return {
    title: `${post.title} | PDFSum Blog`,
    description: post.content.split("\n")[0].replace(/^#+\s*/, "").slice(0, 160),
    openGraph: {
      type: "article",
      title: post.title,
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = posts[slug];

  if (!post) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <Link href="/blog" className="text-blue-600 hover:underline">Back to Blog</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white" id="main-content">
      <article className="max-w-3xl mx-auto px-4 py-16">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-8 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          All Posts
        </Link>

        <header className="mb-8">
          <time className="text-sm text-gray-400">{post.date}</time>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4 leading-tight">
            {post.title}
          </h1>
        </header>

        <div className="prose prose-blue prose-lg max-w-none">
          {post.content.split("\n").map((line, i) => {
            if (line.startsWith("## ")) {
              return (
                <h2 key={i} className="text-2xl font-bold text-gray-900 mt-10 mb-4">
                  {line.replace("## ", "")}
                </h2>
              );
            }
            if (line.startsWith("### ")) {
              return (
                <h3 key={i} className="text-xl font-semibold text-gray-800 mt-8 mb-3">
                  {line.replace("### ", "")}
                </h3>
              );
            }
            if (line.startsWith("- **")) {
              const match = line.match(/- \*\*(.+?)\*\*: (.+)/);
              if (match) {
                return (
                  <p key={i} className="ml-4">
                    <strong>{match[1]}</strong>: {match[2]}
                  </p>
                );
              }
            }
            if (line.startsWith("- ")) {
              return (
                <p key={i} className="ml-4">• {line.replace("- ", "")}</p>
              );
            }
            if (line.startsWith("|")) {
              return <p key={i} className="font-mono text-sm text-gray-700 bg-gray-50 p-2 rounded">{line}</p>;
            }
            if (line.trim() === "") {
              return <br key={i} />;
            }
            return <p key={i} className="text-gray-700 leading-relaxed">{line}</p>;
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 p-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to try AI summarization?</h2>
          <p className="text-blue-100 mb-6">Upload your first PDF and get a summary in seconds — free.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition"
          >
            Start Free
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </article>
    </main>
  );
}
