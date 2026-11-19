import React from 'react';
import { HiOutlineRefresh, HiOutlineExclamationCircle } from 'react-icons/hi';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    const errorMsg = error?.message || '';
    const isChunkError =
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('Importing a module script failed') ||
      errorMsg.includes('error loading dynamically imported module');

    return {
      hasError: true,
      error,
      isChunkError
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // If it's a chunk load error from a recent Vercel deployment, auto-reload once
    if (this.state.isChunkError) {
      const hasReloaded = window.sessionStorage.getItem('chunk_error_reloaded');
      if (!hasReloaded) {
        window.sessionStorage.setItem('chunk_error_reloaded', 'true');
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    window.sessionStorage.removeItem('chunk_error_reloaded');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 bg-cream">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <HiOutlineExclamationCircle className="w-6 h-6" />
            </div>
            
            <div className="space-y-1">
              <h2 className="font-serif text-xl font-bold text-neutral-900">
                {this.state.isChunkError ? 'New Store Version Available' : 'Something went wrong'}
              </h2>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {this.state.isChunkError
                  ? 'A new version of Friends Collections was just updated. Please refresh to load the latest collections.'
                  : 'We encountered a momentary glitch loading this section. Please reload to continue.'}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-light transition-all shadow-md cursor-pointer"
              >
                <HiOutlineRefresh className="w-4 h-4" />
                <span>Refresh & Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
