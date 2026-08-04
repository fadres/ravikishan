import { Component } from 'react';

// Top-level safety net: without this, any render error anywhere in the tree
// unmounts the whole app and leaves a blank white page. With it, the crash is
// contained, a friendly card explains what happened, and a full reload lets
// the user recover instead of staring at nothing.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-400/15 border border-rose-400/30 text-2xl mb-4">
          ⚠️
        </span>
        <h1 className="text-xl font-extrabold text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-400">
          The page hit an unexpected error. Your progress is safe — reload to try again.
        </p>
        <p className="mt-4 text-xs text-rose-300 bg-rose-400/10 border border-rose-400/20 rounded-xl px-4 py-2.5 font-mono break-words">
          {String(error?.message || error)}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2.5 rounded-xl font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
        >
          Reload page
        </button>
      </div>
    );
  }
}
