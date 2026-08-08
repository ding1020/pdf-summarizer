import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";

// ISR — legal pages rarely change, revalidate every 24 hours
export const revalidate = 86400;

const PRIVACY_EMAIL =
  process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "privacy@pdfsum.com";

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
    <main className="min-h-screen bg-gray-50 py-16" id="main-content">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t("title")}</h1>

        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6 text-gray-700">
          {/* Legal notice for non-English locales */}
          {locale !== "en" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">{t("legalNotice")}</p>
            </div>
          )}

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t("s1Title")}
            </h2>
            <p className="mb-3">{t("s1Intro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>{t("s1AccountLabel")}:</strong> {t("s1Account")}
              </li>
              <li>
                <strong>{t("s1UploadLabel")}:</strong> {t("s1Upload")}
              </li>
              <li>
                <strong>{t("s1UsageLabel")}:</strong> {t("s1Usage")}
              </li>
              <li>
                <strong>{t("s1PaymentLabel")}:</strong> {t("s1Payment")}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t("s2Title")}
            </h2>
            <p className="mb-3">{t("s2Intro")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("s2a")}</li>
              <li>{t("s2b")}</li>
              <li>{t("s2c")}</li>
              <li>{t("s2d")}</li>
              <li>{t("s2e")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t("s3Title")}
            </h2>
            <p>{t("s3Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t("s4Title")}
            </h2>
            <p className="mb-3">{t("s4Intro")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("s4a")}</li>
              <li>{t("s4b")}</li>
              <li>{t("s4c")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t("s5Title")}
            </h2>
            <p className="mb-3">{t("s5Intro")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Native Auth:</strong> {t("s5Auth")}
              </li>
              <li>
                <strong>Creem:</strong> {t("s5Creem")}
              </li>
              <li>
                <strong>DeepSeek / Groq / SiliconFlow:</strong> {t("s5AI")}
              </li>
            </ul>
            <p className="mt-3 text-sm text-gray-600">{t("s5Note")}</p>
          </section>

          {/* GDPR Compliance Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Legal Basis for Processing (GDPR Article 6)
            </h2>
            <p className="mb-3">
              We process your personal data under the following lawful bases as
              required by the General Data Protection Regulation (GDPR):
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Contractual Necessity (Art. 6(1)(b)):</strong> Processing
                necessary to provide the PDF summarization service you
                requested.
              </li>
              <li>
                <strong>Consent (Art. 6(1)(a)):</strong> For analytics,
                marketing, and non-essential cookies — you can withdraw consent
                at any time via the cookie banner.
              </li>
              <li>
                <strong>Legitimate Interests (Art. 6(1)(f)):</strong> For fraud
                prevention, security, and service improvement, balanced against
                your privacy rights.
              </li>
              <li>
                <strong>Legal Obligation (Art. 6(1)(c)):</strong> For tax
                reporting and compliance with applicable laws.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t("s6Title")}
            </h2>
            <p>{t("s6Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t("s7Title")}
            </h2>
            <p className="mb-3">{t("s7Intro")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("s7a")}</li>
              <li>{t("s7b")}</li>
              <li>{t("s7c")}</li>
              <li>{t("s7d")}</li>
              <li>{t("s7e")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t("s8Title")}
            </h2>
            <p>{t("s8Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t("s9Title")}
            </h2>
            <p>{t("s9Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t("s10Title")}
            </h2>
            <p>
              {t("s10Body1")}{" "}
              <a
                href={`mailto:${PRIVACY_EMAIL}`}
                className="text-blue-600 hover:underline"
              >
                {PRIVACY_EMAIL}
              </a>
              .
            </p>
          </section>

          <p className="text-sm text-gray-500 pt-4 border-t">
            {t("updated")}: August 8, 2026
          </p>
        </div>
      </div>
    </main>
  );
}