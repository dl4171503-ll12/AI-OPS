import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Props = { children: ReactNode; fallbackTitle?: string };
type State = { error: Error | null };

/** 捕获学科楼等子树崩溃，避免整页只剩蓝底 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen campus-bg flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-3xl bg-white shadow-soft border border-white p-6 space-y-3">
            <h2 className="font-display text-2xl text-campus-ink">
              {this.props.fallbackTitle || '页面开小差了'}
            </h2>
            <p className="text-sm text-campus-ink/70 break-words">
              {this.state.error.message || '未知错误'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-2xl px-4 py-2 font-bold text-white bg-campus-mint"
                onClick={() => this.setState({ error: null })}
              >
                重试
              </button>
              <Link
                to="/"
                className="rounded-2xl px-4 py-2 font-bold border border-campus-ink/15 bg-white"
                onClick={() => this.setState({ error: null })}
              >
                返回校园
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
