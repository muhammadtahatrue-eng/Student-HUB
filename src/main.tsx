import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('StudyVault Application Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (window.caches) {
        caches.keys().then(names => {
          names.forEach(n => caches.delete(n));
        });
      }
    } catch {
      // Ignore storage errors
    }
    // Force clean page reload to origin path
    window.location.href = window.location.pathname;
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#05070a] text-white flex items-center justify-center p-4 selection:bg-cyan-400 selection:text-black">
          <div className="max-w-lg w-full bg-[#0d1117] border border-cyan-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xl font-bold">
              !
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Application Encountered an Issue
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {this.state.error?.message || 'An unexpected rendering error occurred. You can reload the app or reset stored local state.'}
            </p>

            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-cyan-400 text-black hover:bg-cyan-300 transition-colors shadow-lg shadow-cyan-400/20 cursor-pointer"
              >
                Reload App
              </button>
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer border border-white/15"
              >
                Clear Cache & Reload
              </button>
              <button
                onClick={this.toggleDetails}
                className="px-3 py-2.5 text-[11px] font-medium rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {this.state.showDetails ? 'Hide Error Details' : 'View Error Details'}
              </button>
            </div>

            {this.state.showDetails && (
              <div className="mt-4 p-3 bg-black/60 rounded-xl border border-white/10 text-left overflow-x-auto text-[11px] font-mono text-rose-300 max-h-48">
                <div className="font-bold text-white/90 mb-1">{this.state.error?.name}: {this.state.error?.message}</div>
                <pre className="whitespace-pre-wrap text-white/50">{this.state.error?.stack || this.state.errorInfo?.componentStack || 'No stack trace available.'}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById('root');
if (container) {
  const fallback = document.getElementById('app-loading-fallback');
  if (fallback) {
    fallback.remove();
  }
  const root = createRoot(container);
  root.render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
}
