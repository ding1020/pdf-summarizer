import { Metadata } from "next";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@pdfsum.com";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Refund Policy - PDF Summary",
    description: "Refund Policy for PDF Summary AI-powered PDF summarization tool",
  };
}

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Refund Policy</h1>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Refund Eligibility</h2>
            <p>We want you to be satisfied with PDF Summary. Due to the nature of digital products, we offer refunds under the following circumstances:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Technical Issues:</strong> If the Service is not functioning as described and we cannot resolve the issue</li>
              <li><strong>Duplicate Charges:</strong> If you were charged multiple times for the same subscription</li>
              <li><strong>Unauthorized Charges:</strong> If you did not authorize the payment</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How to Request a Refund</h2>
            <p>To request a refund, please contact us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:underline">{SUPPORT_EMAIL}</a> with:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Your account email address</li>
              <li>Order or subscription ID</li>
              <li>Reason for the refund request</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Refund Process</h2>
            <p>Once we receive your refund request:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>We will review your request within 3-5 business days</li>
              <li>If approved, refunds are processed through our payment provider (Paddle)</li>
              <li>Refunds typically appear within 5-10 business days, depending on your bank</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Cancellation</h2>
            <p>You may cancel your subscription at any time. After cancellation:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>You will retain access to premium features until the end of your current billing period</li>
              <li>No further charges will be made after cancellation</li>
              <li>Subscriptions do not automatically renew after cancellation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Exceptions</h2>
            <p>Refunds may not be available for:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Change of mind after using the Service</li>
              <li>Requests made more than 14 days after the original purchase</li>
              <li>Violation of our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Contact</h2>
            <p>For refund-related questions, please contact us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:underline">{SUPPORT_EMAIL}</a>.</p>
          </section>

          <p className="text-sm text-gray-500 pt-4 border-t">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
