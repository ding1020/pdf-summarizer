import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@pdfsum.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.refund" });
  return {
    title: `${t("title")} - PDF Summary`,
    description: t("metaDescription"),
  };
}

export default async function RefundPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal.refund" });

  return (
    <main className="min-h-screen bg-gray-50 py-16" id="main-content">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t("title")}</h1>

        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s1Title")}</h2>
            <p>{t("s1Intro")}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>{t("s1TechLabel")}:</strong> {t("s1Tech")}</li>
              <li><strong>{t("s1DupLabel")}:</strong> {t("s1Dup")}</li>
              <li><strong>{t("s1UnauthLabel")}:</strong> {t("s1Unauth")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s2Title")}</h2>
            <p>
              {t("s2Body1")}{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:underline">
                {SUPPORT_EMAIL}
              </a>
              {t("s2Body2")}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>{t("s2a")}</li>
              <li>{t("s2b")}</li>
              <li>{t("s2c")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s3Title")}</h2>
            <p>{t("s3Intro")}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>{t("s3a")}</li>
              <li>{t("s3b")}</li>
              <li>{t("s3c")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s4Title")}</h2>
            <p>{t("s4Intro")}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>{t("s4a")}</li>
              <li>{t("s4b")}</li>
              <li>{t("s4c")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s5Title")}</h2>
            <p>{t("s5Intro")}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>{t("s5a")}</li>
              <li>{t("s5b")}</li>
              <li>{t("s5c")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s6Title")}</h2>
            <p>
              {t("s6Body1")}{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </p>
          </section>

          <p className="text-sm text-gray-500 pt-4 border-t">
            {t("updated")}: June 16, 2026
          </p>
        </div>
      </div>
    </main>
  );
}
