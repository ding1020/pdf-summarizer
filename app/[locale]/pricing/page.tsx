"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const t = useTranslations("pricing");
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const plans = [
    {
      name: t("free.name"),
      price: t("free.price"),
      period: t("free.period"),
      description: t("free.description"),
      features: t.raw("free.features") as string[],
      limitations: t.raw("limitations") as string[] | undefined,
      buttonText: t("free.button"),
      buttonVariant: "outline",
      highlighted: false,
    },
    {
      name: t("pro.name"),
      price: t("pro.price"),
      period: t("pro.period"),
      description: t("pro.description"),
      features: t.raw("pro.features") as string[],
      buttonText: t("pro.button"),
      buttonVariant: "solid",
      highlighted: true,
    },
  ];

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
          body: JSON.stringify({ plan: "pro" }),
        });

        const data = await response.json();

        if (data.url) {
          window.location.href = data.url;
        } else {
          alert("Stripe integration coming soon! Please contact support.");
        }
      } catch (error) {
        console.error("Upgrade error:", error);
        alert("Something went wrong. Please try again.");
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

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`
                bg-white rounded-2xl shadow-lg overflow-hidden
                ${plan.highlighted ? "ring-2 ring-blue-500" : ""}
              `}
            >
              {plan.highlighted && (
                <div className="bg-blue-500 text-white text-center py-2 text-sm font-medium">
                  {t("mostPopular")}
                </div>
              )}
              
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

                <button
                  onClick={() => handleUpgrade(plan.name)}
                  disabled={loading !== null}
                  className={`
                    mt-8 w-full py-3 px-6 rounded-lg font-medium transition-colors
                    ${
                      plan.buttonVariant === "solid"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                    }
                    disabled:opacity-50
                  `}
                >
                  {loading === plan.name ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    plan.buttonText
                  )}
                </button>
              </div>
            </div>
          ))}
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
            Questions? <a href="mailto:support@pdfsummarizer.com" className="text-blue-600 hover:underline">Contact us</a>
          </p>
        </div>
      </div>
    </div>
  );
}
