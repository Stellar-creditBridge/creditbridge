import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
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
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div id="error-boundary-fallback" className="w-full min-h-[360px] flex flex-col items-center justify-center p-8 text-center border border-black/10 bg-[#fbf9f5] my-6">
          <div className="p-3 bg-red-100 text-red-800 rounded-none mb-4">
            <AlertTriangle className="w-6 h-6 text-red-700" />
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-red-600 font-bold mb-1">
            Component Exception Caught
          </span>
          <h2 className="text-2xl font-display font-bold italic text-black mb-2">
            {this.props.fallbackTitle || "An unexpected error occurred"}
          </h2>
          <p className="text-zinc-600 text-xs max-w-md mb-5 font-sans leading-relaxed">
            The application encountered a render issue with this module. You can attempt to restore the state or refresh the ledger view.
          </p>
          {this.state.error?.message && (
            <div className="bg-white p-3.5 rounded-none text-left w-full max-w-lg overflow-auto border border-black/10 mb-6 shadow-2xs">
              <code className="text-[11px] text-zinc-800 font-mono whitespace-pre-wrap block break-words">
                {this.state.error.message}
              </code>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              id="error-boundary-retry-btn"
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white text-[10px] font-mono uppercase tracking-wider font-bold hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Component</span>
            </button>
            <button
              id="error-boundary-reload-btn"
              onClick={() => {
                try {
                  window.location.reload();
                } catch {
                  this.handleReset();
                }
              }}
              className="flex items-center gap-2 px-4 py-2 border border-black/10 bg-white text-black text-[10px] font-mono uppercase tracking-wider font-bold hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children ?? null;
  }
}

