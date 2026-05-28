"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import FeedbackForm from "@/components/FeedbackForm";

export default function HelpPage() {
  const t = useTranslations("help");
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@pdfsum.com";

  const faqs = [
    {
      question: "What file formats are supported?",
      answer: "We currently support PDF files only. Make sure your PDF contains selectable text - scanned documents may not work properly.",
    },
    {
      question: "What's the maximum file size?",
      answer: "Free users can upload PDFs up to 20MB. Pro users have access to larger file support (up to 50MB) and longer documents (up to 200 pages).",
    },
    {
      question: "How does the daily limit work?",
      answer: "Free users get 5 PDF summaries per day. This limit resets at midnight (UTC). Pro users have unlimited access.",
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time through your billing portal. You'll continue to have access until the end of your billing period.",
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. All your documents are encrypted and processed securely. We never share your data with third parties. Uploaded files are automatically deleted after processing.",
    },
    {
      question: "What happens if my PDF upload fails?",
      answer: "If your upload fails, please check: 1) The file is in PDF format, 2) The file size is under 20MB, 3) Your internet connection is stable. If problems persist, contact support.",
    },
    {
      question: "Why is my summary incomplete?",
      answer: "For very long documents, we process up to 15,000 characters. For complete summaries of lengthy PDFs, please upgrade to Pro.",
    },
    {
      question: "Can I export my summaries?",
      answer: "Pro users can export summaries in multiple formats including PDF and Word. Free users can copy the summary text directly.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Help Center</h1>
          <p className="text-gray-600">Find answers to common questions and get support</p>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <a 
              href={`mailto:${supportEmail}`}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Email Support</p>
                <p className="text-sm text-gray-500">Get help via email</p>
              </div>
            </a>
            <Link
              href="/pricing"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Upgrade to Pro</p>
                <p className="text-sm text-gray-500">Unlock unlimited access</p>
              </div>
            </Link>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                <h3 className="font-medium text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback Form */}
        <div className="mb-8">
          <FeedbackForm />
        </div>

        {/* Related Links */}
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
          <span className="text-gray-400">|</span>
          <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
          <span className="text-gray-400">|</span>
          <Link href="/refund" className="text-blue-600 hover:underline">Refund Policy</Link>
        </div>
      </div>
    </div>
  );
}
