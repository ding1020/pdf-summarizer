import type { Metadata } from "next";
import { Link } from "@/navigation";
import { blogPosts } from "@/lib/blog-posts";

// Parse inline markdown: **bold**, [link](url), `code`
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/);
    // Link: [text](url)
    const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)/);
    // Inline code: `code`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`/);

    // Find the earliest match
    const matches = [
      boldMatch ? { type: "bold", match: boldMatch, pos: boldMatch[1].length } : null,
      linkMatch ? { type: "link", match: linkMatch, pos: linkMatch[1].length } : null,
      codeMatch ? { type: "code", match: codeMatch, pos: codeMatch[1].length } : null,
    ].filter(Boolean) as { type: string; match: RegExpMatchArray; pos: number }[];

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    matches.sort((a, b) => a.pos - b.pos);
    const earliest = matches[0];

    if (earliest.match[1]) {
      parts.push(earliest.match[1]);
    }

    if (earliest.type === "bold") {
      parts.push(<strong key={key++}>{earliest.match[2]}</strong>);
      remaining = remaining.slice(earliest.match[0].length);
    } else if (earliest.type === "link") {
      const url = earliest.match[3];
      const linkText = earliest.match[2];
      // Internal links use next-intl Link; external use regular <a>
      if (url.startsWith("/") || url.startsWith("#")) {
        parts.push(
          <Link key={key++} href={url as any} className="text-blue-600 hover:underline">
            {linkText}
          </Link>
        );
      } else {
        parts.push(
          <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {linkText}
          </a>
        );
      }
      remaining = remaining.slice(earliest.match[0].length);
    } else if (earliest.type === "code") {
      parts.push(
        <code key={key++} className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono">
          {earliest.match[2]}
        </code>
      );
      remaining = remaining.slice(earliest.match[0].length);
    }
  }

  return parts;
}

export async function generateStaticParams() {
  return Object.keys(blogPosts).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts[slug];
  if (!post) return { title: "Not Found | PDFSum Blog" };

  return {
    title: `${post.title} | PDFSum Blog`,
    description: post.excerpt,
    keywords: post.keywords,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts[slug];

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
          {(() => {
            // Split content into code-block and non-code segments
            const segments = post.content.split(/(```[\s\S]*?```)/g);
            return segments.map((segment, si) => {
              // Code block
              if (segment.startsWith("```")) {
                const code = segment.replace(/^```\w*\n?/, "").replace(/```$/, "");
                return (
                  <pre key={si} className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto my-6 text-sm">
                    <code>{code}</code>
                  </pre>
                );
              }
              // Regular content — parse line by line
              return segment.split("\n").map((line, i) => {
                const key = `${si}-${i}`;
                if (line.startsWith("## ")) {
                  return (
                    <h2 key={key} className="text-2xl font-bold text-gray-900 mt-10 mb-4">
                      {renderInline(line.replace("## ", ""))}
                    </h2>
                  );
                }
                if (line.startsWith("### ")) {
                  return (
                    <h3 key={key} className="text-xl font-semibold text-gray-800 mt-8 mb-3">
                      {renderInline(line.replace("### ", ""))}
                    </h3>
                  );
                }
                if (line.startsWith("- **")) {
                  const match = line.match(/- \*\*(.+?)\*\*: (.+)/);
                  if (match) {
                    return (
                      <p key={key} className="ml-4 mb-1">
                        <strong>{match[1]}</strong>: {renderInline(match[2])}
                      </p>
                    );
                  }
                }
                if (line.startsWith("- ")) {
                  return (
                    <p key={key} className="ml-4 mb-1 flex gap-2">
                      <span className="text-blue-500">•</span>
                      <span>{renderInline(line.replace("- ", ""))}</span>
                    </p>
                  );
                }
                if (/^\d+\.\s/.test(line)) {
                  const match = line.match(/^(\d+)\.\s(.+)/);
                  if (match) {
                    return (
                      <p key={key} className="ml-4 mb-1 flex gap-2">
                        <span className="text-blue-500 font-semibold">{match[1]}.</span>
                        <span>{renderInline(match[2])}</span>
                      </p>
                    );
                  }
                }
                if (line.startsWith("|")) {
                  return (
                    <p key={key} className="font-mono text-sm text-gray-700 bg-gray-50 p-2 rounded overflow-x-auto">
                      {line}
                    </p>
                  );
                }
                if (line.trim() === "") {
                  return <div key={key} className="h-4" />;
                }
                return (
                  <p key={key} className="text-gray-700 leading-relaxed mb-2">
                    {renderInline(line)}
                  </p>
                );
              });
            });
          })()}
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
