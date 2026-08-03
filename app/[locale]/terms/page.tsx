import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";

// ISR — legal pages rarely change, revalidate every 24 hours
export const revalidate = 86400;

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


          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Copyright & User Content</h2>
            <p className="mb-3">By uploading content to PDF Summary AI, you represent and warrant that:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>You own or have the necessary licenses, rights, consents, and permissions to use and authorize us to use all content you upload.</li>
              <li>Your content does not infringe upon the intellectual property rights, privacy rights, or any other rights of any third party.</li>
              <li>You will not upload content that is unlawful, defamatory, obscene, or otherwise objectionable.</li>
            </ul>
            <p className="mt-3">We respect the intellectual property rights of others and will respond to notices of alleged copyright infringement in accordance with the Digital Millennium Copyright Act (DMCA). To report copyright infringement, please see our <Link href="/dmca" className="text-blue-600 hover:underline">DMCA Policy</Link>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">DMCA Takedown Policy</h2>
            <p>
              If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement
              and is accessible via our service, please notify our designated copyright agent. For full details, please
              see our <Link href="/dmca" className="text-blue-600 hover:underline">DMCA / Copyright Policy</Link>.
            </p>
          </section>

          <p className="text-sm text-gray-500 pt-4 border-t">{t("updated")}: July 29, 2026</p>
        </div>
      </div>
    </main>
  );
}
