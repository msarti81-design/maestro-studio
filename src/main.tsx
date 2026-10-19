import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error suppression for harmless browser ResizeObserver loop notices
if (typeof window !== 'undefined') {
  const isResizeObserverError = (msg?: string) => {
    return (
      msg &&
      (msg.includes('ResizeObserver loop') ||
       msg.includes('undelivered notifications'))
    );
  };

  window.addEventListener('error', (e: ErrorEvent) => {
    if (isResizeObserverError(e.message)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const reasonMsg = e.reason?.message || (typeof e.reason === 'string' ? e.reason : '');
    if (isResizeObserverError(reasonMsg)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in Maestro Studio App:', error, errorInfo);
  }

  private handleReset = () => {
    localStorage.removeItem('maestro_last_view');
    window.location.hash = '';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mb-4 text-amber-400 font-bold text-2xl">
              🎹
            </div>
            <h1 className="text-xl font-black text-white mb-2">KeyCraft Studio</h1>
            <p className="text-xs text-slate-400 mb-6">
              An unexpected application error occurred. Click the button below to restart KeyCraft Studio.
            </p>

            {this.state.error && (
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl w-full mb-6 text-left overflow-auto max-h-32 text-[11px] font-mono text-red-400">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-extrabold rounded-xl text-sm transition-all shadow-lg"
            >
              Restart KeyCraft Studio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

