import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy - PDF Summary AI",
  description: "Learn how PDF Summary AI uses cookies and similar technologies to improve your experience.",
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Cookie Policy</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">What Are Cookies?</h2>
          <p className="text-gray-600 mb-4">
            Cookies are small text files that are placed on your computer or mobile device when you visit our website. 
            They help us provide you with a better experience and allow certain features to work properly.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How We Use Cookies</h2>
          <div className="space-y-4 mb-6">
            <div>
              <h3 className="font-medium text-gray-900">Essential Cookies</h3>
              <p className="text-gray-600">
                Required for the website to function properly. These include authentication cookies, 
                security cookies, and cookies needed to remember your preferences.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">Analytics Cookies</h3>
              <p className="text-gray-600">
                Help us understand how visitors interact with our website by collecting anonymous information. 
                This helps us improve our service.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">Authentication Cookies</h3>
              <p className="text-gray-600">
                Used by Clerk (our authentication provider) to maintain your login session and 
                securely authenticate you.
              </p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Third-Party Cookies</h2>
          <p className="text-gray-600 mb-4">
            We use services from third parties that may also set cookies:
          </p>
          <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
            <li><strong>Clerk:</strong> Authentication and session management</li>
            <li><strong>Paddle:</strong> Payment processing</li>
            <li><strong>Vercel:</strong> Website hosting and analytics</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Managing Cookies</h2>
          <p className="text-gray-600 mb-4">
            Most web browsers allow you to control cookies through their settings. However, 
            disabling cookies may affect the functionality of our website.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Updates to This Policy</h2>
          <p className="text-gray-600 mb-4">
            We may update this Cookie Policy from time to time. Any changes will be posted on this page.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Contact Us</h2>
          <p className="text-gray-600 mb-8">
            If you have questions about our use of cookies, please contact us at{' '}
            <a href="mailto:privacy@pdfsum.com" className="text-blue-600 hover:underline">
              privacy@pdfsum.com
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
