import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

const PRIVACY_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "privacy@pdfsum.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal.privacy");
  return {
    title: `${t("title")} - PDF Summary`,
    description: t("metaDescription"),
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal.privacy");

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t("title")}</h1>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s1Title")}</h2>
            <p className="mb-3">{t("s1Intro")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>{t("s1AccountLabel")}:</strong> {t("s1Account")}</li>
              <li><strong>{t("s1UploadLabel")}:</strong> {t("s1Upload")}</li>
              <li><strong>{t("s1UsageLabel")}:</strong> {t("s1Usage")}</li>
              <li><strong>{t("s1PaymentLabel")}:</strong> {t("s1Payment")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s2Title")}</h2>
            <p>{t("s2Intro")}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>{t("s2a")}</li>
              <li>{t("s2b")}</li>
              <li>{t("s2c")}</li>
              <li>{t("s2d")}</li>
              <li>{t("s2e")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s3Title")}</h2>
            <p>{t("s3Body")}</p>
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
              <li><strong>Clerk:</strong> {t("s5Clerk")}</li>
              <li><strong>Paddle:</strong> {t("s5Paddle")}</li>
              <li><strong>AI Providers:</strong> {t("s5AI")}</li>
            </ul>
            <p className="mt-2">{t("s5Note")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s6Title")}</h2>
            <p>{t("s6Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s7Title")}</h2>
            <p>{t("s7Intro")}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>{t("s7a")}</li>
              <li>{t("s7b")}</li>
              <li>{t("s7c")}</li>
              <li>{t("s7d")}</li>
              <li>{t("s7e")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s8Title")}</h2>
            <p>{t("s8Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s9Title")}</h2>
            <p>{t("s9Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s10Title")}</h2>
            <p>
              {t("s10Body1")}
              {" "}<a href={`mailto:${PRIVACY_EMAIL}`} className="text-blue-600 hover:underline">{PRIVACY_EMAIL}</a>.
            </p>
          </section>

          <p className="text-sm text-gray-500 pt-4 border-t">{t("updated")}: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
