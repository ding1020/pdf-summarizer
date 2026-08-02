import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import ReviewList from "@/components/reviews/ReviewList";
import ReviewForm from "@/components/reviews/ReviewForm";
import { submitReviewAction } from "./actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("reviews");
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export const revalidate = 300; // ISR - 5分钟刷新

async function getApprovedReviews(locale: string) {
  try {
    const reviews = await prisma.review.findMany({
      where: { status: "approved", locale },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        userName: true,
        rating: true,
        title: true,
        content: true,
        createdAt: true,
        adminReply: true,
      },
    });
    return reviews;
  } catch {
    return [];
  }
}

async function getFeaturedReviews() {
  try {
    return await prisma.review.findMany({
      where: { status: "approved", featured: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  } catch {
    return [];
  }
}

export default async function ReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("reviews");

  const [reviews, featured] = await Promise.all([
    getApprovedReviews(locale),
    getFeaturedReviews(),
  ]);

  // Serialize dates
  const serializedReviews = reviews.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  // JSON-LD structured data for SEO
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const reviewJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "PDF Summarizer AI",
    description: t("subtitle"),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: avgRating.toFixed(1),
      reviewCount: reviews.length,
      bestRating: "5",
      worstRating: "1",
    },
    review: serializedReviews.slice(0, 10).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.userName },
      datePublished: r.createdAt,
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: "5",
        worstRating: "1",
      },
      name: r.title || "User Review",
      reviewBody: r.content,
    })),
  };

  return (
    <main className="min-h-screen bg-gray-50 py-16" id="main-content">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewJsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t("title")}</h1>
          <p className="text-lg text-gray-600">{t("subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <ReviewList reviews={serializedReviews} locale={locale} />
          </div>
          <div>
            <ReviewForm onSubmit={async (data) => {
              "use server";
              await submitReviewAction(data, locale);
            }} />
          </div>
        </div>
      </div>
    </main>
  );
}
