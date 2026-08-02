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
          <p className="text-gray-600 mb-6">{t("updated")}: July 29, 2026</p>
          
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


          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">CCPA / CPRA — Do Not Sell or Share My Personal Information</h2>
          <p className="text-gray-600 mb-4">
            If you are a California resident, you have the right to opt out of the sale or sharing of your personal information
            for cross-context behavioral advertising. We do not sell your personal information. We use analytics cookies
            (Google Analytics, Microsoft Clarity) and error tracking (Sentry) to improve our service. You can opt out of
            these non-essential tracking technologies by selecting &quot;Essential Only&quot; in the cookie consent banner, or by
            clicking the &quot;Cookie Preferences&quot; button at the bottom of any page.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Consent Log & Withdrawal</h2>
          <p className="text-gray-600 mb-4">
            When you provide consent via our cookie banner, we record your choice in your browser&apos;s localStorage with a
            timestamp. You can withdraw your consent at any time by clicking &quot;Cookie Preferences&quot; at the bottom of any page
            and selecting &quot;Essential Only&quot;. This will immediately disable all non-essential cookies and tracking, and clear
            any previously set analytics identifiers.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Cookie Categories</h2>
          <div className="space-y-4 mb-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Necessary (Always Active)</h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Cannot be disabled</span>
              </div>
              <p className="text-gray-600 text-sm mt-1">Required for the website to function. Includes session cookies, CSRF tokens, and authentication.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Analytics</h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Optional</span>
              </div>
              <p className="text-gray-600 text-sm mt-1">Google Analytics, Microsoft Clarity. Helps us understand how visitors use our site.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Error Monitoring</h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Optional</span>
              </div>
              <p className="text-gray-600 text-sm mt-1">Sentry. Helps us identify and fix bugs and errors.</p>
            </div>
          </div>

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
