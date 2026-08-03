import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import { blogPostsMeta } from "@/lib/blog-posts";

// ISR — blog listing updates when new posts are added, revalidate every 1 hour
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Blog | PDF Summary AI",
    description: "Tips, guides, and tutorials about AI document summarization. Learn how to summarize PDFs, research papers, legal documents, and more.",
    keywords: ["PDF summarizer blog", "AI summary tips", "document analysis guide", "how to summarize pdf", "pdf summary tool"],
  };
}

export default async function BlogPage() {
  const t = await getTranslations();

  return (
    <main className="min-h-screen bg-gray-50" id="main-content">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">PDFSum Blog</h1>
          <p className="text-lg text-gray-600">
            Tips, guides, and updates about AI document summarization.
          </p>
        </div>

        {blogPostsMeta.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">No posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {blogPostsMeta.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}` as any}
                className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  {post.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                      {tag}
                    </span>
                  ))}
                  <time className="text-xs text-gray-500 ml-auto">{post.date}</time>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed">{post.excerpt}</p>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
