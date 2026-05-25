"use client";

import { useState, useEffect } from "react";
import { Link } from "@/navigation";

interface PaddleStatus {
  configured: boolean;
  hasSecretKey: boolean;
  hasPriceId: boolean;
  hasWebhookSecret: boolean;
  environment: string;
  isSandbox: boolean;
  message: string;
  nextSteps: string[];
  urls: {
    sandbox: string;
    production: string;
    docs: string;
  };
}

export default function PaddleSetupPage() {
  const [status, setStatus] = useState<PaddleStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/paddle-status")
      .then(res => res.json())
      .then((data: PaddleStatus) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Unable to check configuration</p>
      </div>
    );
  }

  const { configured, environment, isSandbox, urls } = status;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
            configured ? "bg-green-100" : "bg-yellow-100"
          }`}>
            {configured ? (
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {configured ? "Paddle Configured!" : "Setup Paddle Payment"}
          </h1>
          
          <p className="text-xl text-gray-600 mb-4">{status.message}</p>
          
          {/* Environment Badge */}
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
            isSandbox ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
          }`}>
            {isSandbox ? "🧪 Sandbox Mode" : "🚀 Production Mode"}
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4">
            <h2 className="text-xl font-semibold text-white">Quick Start Guide</h2>
            <p className="text-blue-100 text-sm mt-1">Follow these steps to configure Paddle</p>
          </div>

          <div className="p-8 space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {isSandbox ? "Go to Sandbox Dashboard" : "Go to Production Dashboard"}
                </h3>
                <div className="flex gap-2">
                  <a 
                    href={isSandbox ? urls.sandbox : urls.production}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    Open Paddle Dashboard
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Get Your API Key</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Navigate to:</p>
                  <code className="text-xs bg-gray-200 px-2 py-1 rounded">Dashboard → Developer Tools → Authentication</code>
                  <p className="text-sm text-gray-500 mt-2">
                    Copy the <strong>Auth Token</strong> (starts with <code className="bg-gray-200 px-1 rounded">{isSandbox ? "paddle_test_" : "paddle_live_"}</code>)
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Create Product & Get Price ID</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Navigate to:</p>
                  <code className="text-xs bg-gray-200 px-2 py-1 rounded">Catalog → Products → New Product</code>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">Name:</span>
                      <span className="font-medium">PDF Summary Pro</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">Type:</span>
                      <span className="font-medium">Recurring (Subscription)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">Price:</span>
                      <span className="font-medium">$9.00 / month</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Configure Webhook</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Navigate to:</p>
                  <code className="text-xs bg-gray-200 px-2 py-1 rounded">Notifications → Webhooks → New Webhook</code>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">URL:</span>
                      <code className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">http://localhost:3000/api/webhooks/paddle</code>
                    </div>
                    <div className="text-sm text-gray-500">
                      Events: subscription.*, transaction.*
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                5
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Update .env.local</h3>
                <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-green-400">{`PADDLE_ENVIRONMENT=${environment}
PADDLE_SECRET_KEY=paddle_${environment === "sandbox" ? "test" : "live"}_YOUR_KEY
PADDLE_PRICE_ID=pri_YOUR_PRICE_ID
PADDLE_WEBHOOK_SECRET=paddle_${environment === "sandbox" ? "test" : "live"}_YOUR_WEBHOOK`}</pre>
                </div>
              </div>
            </div>

            {/* Test Card */}
            {isSandbox && configured && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">🧪 Test Card Numbers</h4>
                <div className="space-y-1 text-sm text-green-700">
                  <p><strong>Success:</strong> 4242 4242 4242 4242</p>
                  <p><strong>Decline:</strong> 4100 0000 0000 0019</p>
                  <p><strong>Any future date + any 3-digit CVC</strong></p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-6 border-t flex items-center justify-between">
            <Link 
              href="/dashboard"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <div className="flex gap-4">
              <a
                href={urls.docs}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Documentation
              </a>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Status
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
