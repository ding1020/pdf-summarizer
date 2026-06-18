"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@/navigation";

interface ApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiDocsPage() {
  const { isSignedIn } = useAuth();
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/v1/keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) fetchKeys();
    else setLoading(false);
  }, [isSignedIn]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        setNewKeyName("");
        fetchKeys();
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      await fetch(`/api/v1/keys/${keyId}`, { method: "DELETE" });
      fetchKeys();
    } catch {
      // silent
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">API Documentation</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Integrate PDF summarization into your own applications.
      </p>

      {/* Endpoint */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Summarize Endpoint</h2>

        <div className="flex items-center gap-3 mb-4">
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-sm font-mono font-bold">
            POST
          </span>
          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded text-gray-700 dark:text-gray-300">
            https://www.pdfsum.com/api/v1/summarize
          </code>
        </div>

        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Headers</h3>
        <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto mb-4 text-gray-700 dark:text-gray-300">
{`Authorization: Bearer YOUR_API_KEY
Content-Type: application/json`}</pre>

        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Request Body</h3>
        <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto mb-4 text-gray-700 dark:text-gray-300">
{`{
  "content": "Text to summarize...",
  "language": "en",        // optional: en, zh, multilingual (default)
  "provider": "deepseek"   // optional: deepseek, groq, siliconflow
}`}</pre>

        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Response</h3>
        <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto text-gray-700 dark:text-gray-300">
{`{
  "success": true,
  "summary": "This is the AI-generated summary...",
  "usage": {
    "provider": "deepseek",
    "model": "deepseek-chat",
    "inputTokens": 1500,
    "outputTokens": 300,
    "totalTokens": 1800
  }
}`}</pre>

        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Rate Limits</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          30 requests/minute per API key. Content limited to 15,000 characters per request.
        </p>
      </div>

      {/* cURL Example */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">cURL Example</h2>
        <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto text-gray-700 dark:text-gray-300">
{`curl -X POST https://www.pdfsum.com/api/v1/summarize \\
  -H "Authorization: Bearer pdfsum_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Your document text here", "language": "en"}'`}</pre>
      </div>

      {/* API Key Management */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Your API Keys</h2>

        {!isSignedIn ? (
          <p className="text-gray-600 dark:text-gray-400">
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
              Sign in
            </Link>{" "}
            to manage API keys.
          </p>
        ) : newKey ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
              Your new API key (shown only once):
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white dark:bg-gray-800 px-3 py-2 rounded text-sm break-all border dark:border-gray-700 text-gray-700 dark:text-gray-300">
                {newKey}
              </code>
              <button
                onClick={() => copyToClipboard(newKey)}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                {copySuccess ? "Copied!" : "Copy"}
              </button>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Key name (optional)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 px-3 py-2 border dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Key"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        ) : keys.length === 0 && !newKey ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No API keys yet. Create one above to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{key.name}</span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-mono">{key.keyPrefix}...</span>
                  {key.lastUsedAt && (
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                      Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRevoke(key.id)}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
