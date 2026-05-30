import { Metadata } from "next";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@pdfsum.com";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Terms of Service - PDF Summary",
    description: "Terms of Service for PDF Summary AI-powered PDF summarization tool",
  };
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing and using PDF Summary (&quot;the Service&quot;), you accept and agree to be bound by the terms and provisions of this agreement.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>PDF Summary provides AI-powered document summarization services. We extract text from PDF documents and generate concise summaries using artificial intelligence technology.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Accounts</h2>
            <p>To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Subscription and Payment</h2>
            <p>Paid subscriptions provide access to premium features. Subscriptions are billed according to the plan selected at checkout. All fees are non-refundable except as required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Use the Service for any illegal purposes</li>
              <li>Upload malicious files or content</li>
              <li>Attempt to gain unauthorized access</li>
              <li>Resell or redistribute the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Intellectual Property</h2>
            <p>The Service and its original content, features, and functionality are owned by PDF Summary and are protected by international copyright, trademark, and other intellectual property laws.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Limitation of Liability</h2>
            <p>PDF Summary shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. We will provide notice of significant changes via email or through the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Contact</h2>
            <p>If you have questions about these Terms, please contact us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:underline">{SUPPORT_EMAIL}</a>.</p>
          </section>

          <p className="text-sm text-gray-500 pt-4 border-t">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
