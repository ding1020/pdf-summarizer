import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";

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
    <main className="min-h-screen bg-gray-50 py-16" id="main-content">
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
              <li><strong>Creem:</strong> {t("s5Paddle")}</li>
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



          {/* GDPR Compliance Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Legal Basis for Processing (GDPR Article 6)</h2>
            <p className="mb-3">We process your personal data under the following lawful bases as required by the General Data Protection Regulation (GDPR):</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Contractual Necessity (Art. 6(1)(b)):</strong> Processing necessary to provide the PDF summarization service you requested.</li>
              <li><strong>Consent (Art. 6(1)(a)):</strong> For analytics, marketing, and non-essential cookies — you can withdraw consent at any time via the cookie banner.</li>
              <li><strong>Legitimate Interests (Art. 6(1)(f)):</strong> For fraud prevention, security, and service improvement, balanced against your privacy rights.</li>
              <li><strong>Legal Obligation (Art. 6(1)(c)):</strong> For tax reporting and compliance with applicable laws.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Processors & Third Parties</h2>
            <p className="mb-3">We engage the following data processors to deliver our services. All processors are contractually bound to process data only on our instructions and in compliance with GDPR:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 pr-4">Processor</th>
                    <th className="text-left py-2 pr-4">Purpose</th>
                    <th className="text-left py-2 pr-4">Location</th>
                    <th className="text-left py-2">Data Transferred</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100"><td className="py-2 pr-4">DeepSeek</td><td className="py-2 pr-4">AI summarization</td><td className="py-2 pr-4">China</td><td className="py-2">PDF text content</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2 pr-4">Groq</td><td className="py-2 pr-4">AI summarization (fallback)</td><td className="py-2 pr-4">USA</td><td className="py-2">PDF text content</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2 pr-4">SiliconFlow</td><td className="py-2 pr-4">AI summarization (fallback)</td><td className="py-2 pr-4">China</td><td className="py-2">PDF text content</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2 pr-4">Creem</td><td className="py-2 pr-4">Payment processing</td><td className="py-2 pr-4">USA</td><td className="py-2">Email, payment metadata</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2 pr-4">Resend</td><td className="py-2 pr-4">Email delivery</td><td className="py-2 pr-4">USA</td><td className="py-2">Email address</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2 pr-4">Supabase</td><td className="py-2 pr-4">Database hosting</td><td className="py-2 pr-4">USA / EU</td><td className="py-2">All user data</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2 pr-4">Upstash</td><td className="py-2 pr-4">Caching (Redis)</td><td className="py-2 pr-4">USA / EU</td><td className="py-2">Cached summaries</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2 pr-4">Sentry</td><td className="py-2 pr-4">Error monitoring</td><td className="py-2 pr-4">USA</td><td className="py-2">Error logs, device info</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2 pr-4">Vercel</td><td className="py-2 pr-4">Hosting & CDN</td><td className="py-2 pr-4">USA / EU</td><td className="py-2">All traffic data</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Retention Periods</h2>
            <p className="mb-3">We retain your data only for as long as necessary for the purposes outlined above:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>PDF documents & content:</strong> Automatically deleted <strong>24 hours</strong> after upload.</li>
              <li><strong>Summaries:</strong> Retained while your account is active. Deleted upon account deletion.</li>
              <li><strong>Account data:</strong> Retained for <strong>1 year</strong> after account deletion for legal compliance, then permanently erased.</li>
              <li><strong>Payment records:</strong> Retained for <strong>7 years</strong> as required by tax law.</li>
              <li><strong>Usage logs:</strong> Retained for <strong>90 days</strong> for analytics and fraud prevention.</li>
              <li><strong>Audit logs:</strong> Retained for <strong>1 year</strong> for security and compliance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">International Data Transfers</h2>
            <p className="mb-3">Your data may be transferred outside your country of residence, including to the United States and China. We ensure adequate protection through:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Standard Contractual Clauses (SCCs):</strong> We have executed SCCs with all data processors located outside the EEA/UK, as approved by the European Commission under Commission Implementing Decision (EU) 2021/914.</li>
              <li><strong>Supplementary Measures:</strong> For transfers to jurisdictions without adequacy decisions, we implement encryption in transit (TLS 1.3) and at rest (AES-256).</li>
              <li><strong>Transfer Impact Assessment (TIA):</strong> Available upon request to <a href={`mailto:${PRIVACY_EMAIL}`} className="text-blue-600 hover:underline">{PRIVACY_EMAIL}</a>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Processing Agreement (DPA)</h2>
            <p className="mb-3">If you are a business customer and require a signed Data Processing Agreement under Article 28 GDPR, please contact us at <a href={`mailto:${PRIVACY_EMAIL}`} className="text-blue-600 hover:underline">{PRIVACY_EMAIL}</a>. Our DPA incorporates the EU Standard Contractual Clauses and is available for immediate execution.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Rights Under GDPR & CCPA</h2>
            <p className="mb-3">Depending on your jurisdiction, you have the following rights:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Right to Access:</strong> Request a copy of all personal data we hold about you.</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data.</li>
              <li><strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> Request deletion of your data.</li>
              <li><strong>Right to Restrict Processing:</strong> Limit how we use your data.</li>
              <li><strong>Right to Data Portability:</strong> Receive your data in a machine-readable format.</li>
              <li><strong>Right to Object:</strong> Object to processing based on legitimate interests or direct marketing.</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw cookie/analytics consent at any time via the cookie banner or by emailing us.</li>
              <li><strong>Right to Non-Discrimination (CCPA):</strong> We will not discriminate against you for exercising your privacy rights.</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, please email <a href={`mailto:${PRIVACY_EMAIL}`} className="text-blue-600 hover:underline">{PRIVACY_EMAIL}</a>. We will respond within <strong>30 days</strong> as required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Cookies & Tracking Technologies</h2>
            <p className="mb-3">We use cookies and similar technologies to enhance your experience. For detailed information about the cookies we use, their purposes, and how to manage them, please see our <Link href="/cookies" className="text-blue-600 hover:underline">Cookie Policy</Link>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Children&apos;s Privacy (COPPA)</h2>
            <p>Our services are not directed at children under 13 years of age. We do not knowingly collect personal data from children under 13. If you believe we have inadvertently collected such data, please contact us immediately at <a href={`mailto:${PRIVACY_EMAIL}`} className="text-blue-600 hover:underline">{PRIVACY_EMAIL}</a> and we will promptly delete it.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Complaints</h2>
            <p className="mb-3">If you believe we have not handled your personal data in accordance with applicable law, you have the right to lodge a complaint with your local data protection authority:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>EU/EEA residents:</strong> Contact your national Data Protection Authority (DPA). A list is available at <a href="https://edpb.europa.eu/about-edpb/board/members_en" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">edpb.europa.eu</a>.</li>
              <li><strong>UK residents:</strong> Information Commissioner&apos;s Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ico.org.uk</a>.</li>
              <li><strong>California residents:</strong> California Attorney General at <a href="https://oag.ca.gov/privacy/privacy-laws" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">oag.ca.gov</a>.</li>
            </ul>
          </section>
          <p className="text-sm text-gray-500 pt-4 border-t">{t("updated")}: July 29, 2026</p>
        </div>
      </div>
    </main>
  );
}
