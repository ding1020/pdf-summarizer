import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - PDF Summary",
  description: "Privacy Policy for PDF Summary AI-powered PDF summarization tool",
};

const PRIVACY_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "privacy@pdfsum.com";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
            <p className="mb-3">We collect information you provide directly:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Account Information:</strong> Email address, name, and authentication credentials</li>
              <li><strong>Uploaded Files:</strong> PDF documents you upload for summarization</li>
              <li><strong>Usage Data:</strong> How you interact with our Service</li>
              <li><strong>Payment Information:</strong> Handled by our payment processor (Paddle)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide and maintain the Service</li>
              <li>Process your payments and manage subscriptions</li>
              <li>Improve and optimize our Service</li>
              <li>Send you service-related communications</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Data Storage and Security</h2>
            <p>Your PDF files are processed temporarily and deleted after summarization is complete. We implement appropriate security measures to protect your personal information. All data is encrypted in transit using TLS/SSL.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Cookies and Tracking</h2>
            <p>We use cookies and similar tracking technologies to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Keep you signed in</li>
              <li>Remember your preferences</li>
              <li>Understand how you use our Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Third-Party Services</h2>
            <p>We use third-party services:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Clerk:</strong> Authentication and user management</li>
              <li><strong>Paddle:</strong> Payment processing</li>
              <li><strong>AI Providers:</strong> DeepSeek, Groq, SiliconFlow for summarization</li>
            </ul>
            <p className="mt-2">These services have their own privacy policies governing their use of your information.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention</h2>
            <p>We retain your account information for as long as your account is active. You may request deletion of your account and associated data at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your data</li>
              <li>Export your data</li>
              <li>Object to processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Children&apos;s Privacy</h2>
            <p>Our Service is not intended for users under 16 years of age. We do not knowingly collect information from children.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact</h2>
            <p>For privacy-related questions, contact us at <a href={`mailto:${PRIVACY_EMAIL}`} className="text-blue-600 hover:underline">{PRIVACY_EMAIL}</a>.</p>
          </section>

          <p className="text-sm text-gray-500 pt-4 border-t">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
