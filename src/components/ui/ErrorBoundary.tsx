import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-8 text-center">
        <p className="font-display text-lg font-bold text-red-400">
          Panda Stock encontró un error inesperado
        </p>
        <pre className="max-h-[50vh] max-w-2xl overflow-auto whitespace-pre-wrap rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-left font-mono text-[12px] leading-relaxed text-red-100">
          {String(this.state.error.stack ?? this.state.error)}
        </pre>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="rounded-xl bg-emerald-500 px-6 py-2.5 font-display text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400"
        >
          Reintentar
        </button>
      </div>
    );
  }
}