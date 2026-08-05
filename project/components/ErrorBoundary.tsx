'use client';

import React from 'react';
import BrandLogo from '@/components/BrandLogo';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'linear-gradient(180deg, #F8F9FA 0%, #EDF2F7 100%)' }}>
          <div className="glass-card rounded-3xl p-8 flex flex-col items-center text-center max-w-sm w-full shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-5">
              <BrandLogo size={28} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              The app encountered an unexpected error. This has been logged automatically.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="text-xs text-red-600 bg-red-50 rounded-xl p-3 mb-4 max-w-full overflow-auto text-left w-full">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-[#2A4365] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#2A4365]/90 transition-all active:scale-95"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
