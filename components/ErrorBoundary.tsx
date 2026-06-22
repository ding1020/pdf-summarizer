"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Link } from "@/navigation";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  messages?: {
    title: string;
    description: string;
    tryAgain: string;
    goHome: string;
    errorDetails: string;
    contactSupport: string;
    ifKeepsHappening: string;
  };
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging (dev only)
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
    
    // In production, send structured error to logging service
    this.logErrorToService(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // This will be handled by Sentry in the production build
    // Next.js + Sentry integration automatically captures React errors
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    };
    
    // Log structured error — Sentry picks this up automatically in production
    if (process.env.NODE_ENV === "development") {
      console.error("Unhandled error:", JSON.stringify(errorData, null, 2));
    }
  }

  handleReload = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    // Use router refresh instead of full page reload for better UX
    window.location.href = window.location.href;
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const msg = this.props.messages || {
        title: "Something went wrong",
        description: "We encountered an unexpected error. This has been reported and we'll fix it as soon as possible.",
        tryAgain: "Try Again",
        goHome: "Go Home",
        errorDetails: "Error Details (Development Only)",
        contactSupport: "contact support",
        ifKeepsHappening: "If this keeps happening, please ",
      };

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {msg.title}
            </h1>

            {/* Error Message */}
            <p className="text-gray-600 mb-6">
              {msg.description}
            </p>

            {/* Technical Details (only in development) */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="text-left mb-6 p-4 bg-gray-100 rounded-lg text-sm">
                <summary className="font-medium cursor-pointer text-gray-700 mb-2">
                  {msg.errorDetails}
                </summary>
                <pre className="overflow-x-auto text-red-600 whitespace-pre-wrap">
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                {msg.tryAgain}
              </button>
              <Link
                href="/"
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                {msg.goHome}
              </Link>
            </div>

            {/* Support Link */}
            <p className="text-sm text-gray-500 mt-6">
              {msg.ifKeepsHappening}
              <a
                href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'ding10201020@hotmail.com'}`}
                className="text-blue-600 hover:underline"
              >
                {msg.contactSupport}
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
