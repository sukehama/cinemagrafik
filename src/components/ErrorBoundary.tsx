import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-zinc-900/90 border border-red-500/30 rounded-3xl text-center space-y-4 shadow-2xl backdrop-blur-xl">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              {this.props.fallbackTitle || 'Došlo je do greške u prikazu'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              {this.state.error?.message || 'Podaci su sačuvani, ali je došlo do privremenog problema pri renderovanju sadržaja.'}
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-zinc-955 text-xs font-black uppercase tracking-wider rounded-xl inline-flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
            >
              <RefreshCw size={14} /> Pokušaj ponovo
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Osvježi stranicu
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
