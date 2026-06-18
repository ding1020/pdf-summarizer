import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@pdfsum.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal.terms");
  return {
    title: `${t("title")} - PDF Summary`,
    description: t("metaDescription"),
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal.terms");

  return (
    <main className="min-h-screen bg-gray-50 py-16" id="main-content">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t("title")}</h1>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s1Title")}</h2>
            <p>{t("s1Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s2Title")}</h2>
            <p>{t("s2Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s3Title")}</h2>
            <p>{t("s3Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s4Title")}</h2>
            <p>{t("s4Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s5Title")}</h2>
            <p>{t("s5Intro")}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>{t("s5a")}</li>
              <li>{t("s5b")}</li>
              <li>{t("s5c")}</li>
              <li>{t("s5d")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s6Title")}</h2>
            <p>{t("s6Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s7Title")}</h2>
            <p>{t("s7Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s8Title")}</h2>
            <p>{t("s8Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s9Title")}</h2>
            <p>
              {t("s9Body1")}
              {" "}<a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:underline">{SUPPORT_EMAIL}</a>.
            </p>
          </section>

          <p className="text-sm text-gray-500 pt-4 border-t">{t("updated")}: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </main>
  );
}
