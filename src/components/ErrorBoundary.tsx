import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center border border-red-200 bg-red-50/50 rounded-lg">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-display font-bold text-red-900 mb-2">Something went wrong</h2>
          <p className="text-red-700 text-sm max-w-md mb-6">
            An unexpected error occurred while rendering this component. Our engineers have been notified.
          </p>
          <div className="bg-white p-4 rounded text-left w-full max-w-2xl overflow-auto border border-red-100 mb-6">
            <code className="text-xs text-red-800 font-mono whitespace-pre-wrap">
              {this.state.error?.message}
            </code>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Reload Page
          </button>
        </div>
      );
    }

    return (this as any).props.children ?? null;
  }
}
