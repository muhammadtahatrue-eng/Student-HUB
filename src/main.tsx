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
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('StudyVault Application Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore storage errors
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#05070a] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0d1117] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xl font-bold">
              !
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Application Encountered an Issue</h1>
            <p className="text-sm text-slate-400">
              {this.state.error?.message || 'An unexpected rendering error occurred. You can reload or reset stored application data.'}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 transition-colors"
              >
                Reload App
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
              >
                Clear Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);

