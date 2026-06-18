"use client";

import { useTranslations } from "next-intl";

const PRIVACY_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "privacy@pdfsum.com";

export default function CookiesPage() {
  const t = useTranslations("legal.cookies");

  return (
    <main className="min-h-screen bg-white" id="main-content">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t("title")}</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">{t("updated")}: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">{t("whatAre")}</h2>
          <p className="text-gray-600 mb-4">{t("whatAreDesc")}</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">{t("howWeUse")}</h2>
          <div className="space-y-4 mb-6">
            <div>
              <h3 className="font-medium text-gray-900">{t("essential")}</h3>
              <p className="text-gray-600">{t("essentialDesc")}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">{t("analytics")}</h3>
              <p className="text-gray-600">{t("analyticsDesc")}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">{t("auth")}</h3>
              <p className="text-gray-600">{t("authDesc")}</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">{t("thirdParty")}</h2>
          <p className="text-gray-600 mb-4">{t("thirdPartyDesc")}</p>
          <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
            <li><strong>Clerk:</strong> {t("clerk")}</li>
            <li><strong>Creem:</strong> {t("paddle")}</li>
            <li><strong>Vercel:</strong> {t("vercel")}</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">{t("managing")}</h2>
          <p className="text-gray-600 mb-4">{t("managingDesc")}</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">{t("updates")}</h2>
          <p className="text-gray-600 mb-4">{t("updatesDesc")}</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">{t("contact")}</h2>
          <p className="text-gray-600 mb-8">
            {t("contactDesc")}{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`} className="text-blue-600 hover:underline">
              {PRIVACY_EMAIL}
            </a>.
          </p>
        </div>
      </div>
    </main>
  );
}
