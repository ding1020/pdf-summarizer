"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "@/navigation";

// Toast notification state
interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function PricingPage() {
  const t = useTranslations("pricing");
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "yearly">("monthly");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast helper functions
  const showToast = (message: string, type: Toast["type"] = "info") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const plans = [
    {
      name: t("free.name"),
      price: t("free.price"),
      period: t("free.period"),
      description: t("free.description"),
      features: t.raw("free.features") as string[],
      limitations: t.raw("free.limitations") as string[] | undefined,
      buttonText: t("free.button"),
      buttonVariant: "outline" as const,
      highlighted: false,
    },
  ];

  const proPlan = {
    name: t("pro.name"),
    monthlyPrice: t("pro.price"),
    yearlyPrice: t("pro.yearlyPrice"),
    period: selectedBilling === "yearly" ? t("pro.yearlyPeriod") : t("pro.period"),
    yearlyPeriod: t("pro.yearlyPeriod"),
    description: t("pro.description"),
    features: t.raw("pro.features") as string[],
    buttonText: t("pro.button"),
    buttonVariant: "solid" as const,
    highlighted: true,
  };

  const handleUpgrade = async (planName: string) => {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    if (planName.toLowerCase() === "pro") {
      setLoading(planName);
      try {
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            plan: "pro",
            billingCycle: selectedBilling 
          }),
        });

        const data = await response.json();

        if (data.url) {
          window.location.href = data.url;
        } else if (data.error) {
          // Handle specific error codes
          const errorMessages: Record<string, string> = {
            payment_failed: t("errors.paymentFailed"),
            card_declined: t("errors.cardDeclined"),
            insufficient_funds: t("errors.insufficientFunds"),
            configuration_error: t("errors.configError"),
          };
          showToast(errorMessages[data.code] || data.error, "error");
        } else {
          showToast(t("errors.notConfigured"), "info");
        }
      } catch {
        showToast(t("errors.generic"), "error");
      } finally {
        setLoading(null);
      }
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t("title")}
          </h1>
          <p className="text-xl text-gray-600">
            {t("subtitle")}
          </p>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-sm font-medium">{t("badges.secure")}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="text-sm font-medium">{t("badges.poweredBy")}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{t("badges.cancel")}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-sm font-medium">{t("badges.support")}</span>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-full p-1 inline-flex shadow-sm border">
            <button
              onClick={() => setSelectedBilling("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedBilling === "monthly"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("billing.monthly")}
            </button>
            <button
              onClick={() => setSelectedBilling("yearly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedBilling === "yearly"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("billing.yearly")}
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                {t("billing.savePercent")}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200"
            >
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
                <p className="text-gray-500 mt-1">{plan.description}</p>
                
                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-500 ml-1">{plan.period}</span>
                </div>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-6 w-6 text-green-500 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations?.map((limitation, index) => (
                    <li key={index} className="flex items-start opacity-50">
                      <svg
                        className="h-6 w-6 text-gray-400 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span className="text-gray-500">{limitation}</span>
                    </li>
                  ))}
                </ul>

                {isSignedIn ? (
                  <button
                    disabled
                    className="mt-8 w-full py-3 px-6 border-2 border-gray-300 text-gray-700 font-medium rounded-lg opacity-50 cursor-not-allowed"
                  >
                    {plan.buttonText}
                  </button>
                ) : (
                  <button
                    onClick={() => router.push("/sign-up")}
                    className="mt-8 w-full py-3 px-6 border-2 border-blue-500 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    {t("free.button")}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Pro Plan Card */}
          <div
            className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-blue-500 relative"
          >
            {selectedBilling === "yearly" && (
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-green-500 text-white text-sm font-medium rounded-full">
                  {t("bestValue")}
                </span>
              </div>
            )}
            
            <div className="bg-blue-500 text-white text-center py-2 text-sm font-medium">
              {t("mostPopular")}
            </div>
            
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900">{proPlan.name}</h2>
              <p className="text-gray-500 mt-1">{proPlan.description}</p>
              
              <div className="mt-6 flex items-baseline">
                <span className="text-4xl font-bold text-gray-900">
                  {selectedBilling === "yearly" ? proPlan.yearlyPrice : proPlan.monthlyPrice}
                </span>
                <span className="text-gray-500 ml-1">
                  {selectedBilling === "yearly" ? proPlan.yearlyPeriod : proPlan.period}
                </span>
              </div>
              {selectedBilling === "yearly" && (
                <p className="text-sm text-gray-500 mt-1">
                  {t("pro.pricePerMonth")}
                </p>
              )}

              <ul className="mt-8 space-y-4">
                {proPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="h-6 w-6 text-green-500 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(proPlan.name)}
                disabled={loading !== null}
                className="mt-8 w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading === proPlan.name ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t("processing")}
                  </span>
                ) : (
                  proPlan.buttonText
                )}
              </button>

              <p className="text-center text-xs text-gray-500 mt-4">
                {t("securePayment")}
              </p>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-gray-600 mb-2">{t("socialProof.line1")}</p>
          <p className="text-sm text-gray-500">{t("socialProof.line2")}</p>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">{t("faq.title")}</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900">{t("faq.cancel")}</h3>
              <p className="text-gray-600 mt-1">
                {t("faq.cancelAnswer")}
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900">{t("faq.payment")}</h3>
              <p className="text-gray-600 mt-1">
                {t("faq.paymentAnswer")}
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900">{t("faq.trial")}</h3>
              <p className="text-gray-600 mt-1">
                {t("faq.trialAnswer")}
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-12 text-center text-gray-500">
          <p>
            {t("questions")} <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@pdfsum.com'}`} className="text-blue-600 hover:underline">{t("contactUs")}</a>
          </p>
        </div>

        {/* Toast Container */}
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md
                animate-slide-in
                ${toast.type === "error" ? "bg-red-50 border border-red-200 text-red-800" : ""}
                ${toast.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : ""}
                ${toast.type === "info" ? "bg-blue-50 border border-blue-200 text-blue-800" : ""}
              `}
            >
              {toast.type === "error" && (
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.type === "success" && (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === "info" && (
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="flex-1 text-sm">{toast.message}</span>
              <button
                onClick={() => dismissToast(toast.id)}
                className="p-1 hover:bg-black/10 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
