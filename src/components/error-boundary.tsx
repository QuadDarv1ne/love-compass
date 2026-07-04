'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useAppStore } from '@/lib/store';
import { createTranslatorForLanguage } from '@/lib/i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  language: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    language: 'ru',
  };

  public static getDerivedStateFromError(_error: Error): State {
    return { hasError: true, error: null, language: 'ru' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary', 'Uncaught error', { error: { message: error.message, stack: error.stack }, componentStack: errorInfo.componentStack });
    const lang = useAppStore.getState().language || 'ru';
    this.setState({ language: lang, error });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const t = createTranslatorForLanguage(this.state.language);

      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 gradient-bg">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div className="text-center space-y-2 max-w-md">
            <h1 className="text-xl font-bold text-foreground">{t('error.server')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('common.someDataNotLoaded')}
            </p>
            {this.state.error && process.env.NODE_ENV === 'development' && (
              <details className="text-left mt-4">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  {t('common.technicalDetails')}
                </summary>
                <pre className="mt-2 text-xs text-destructive bg-card p-3 rounded-lg overflow-auto max-h-40">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4" />
            {t('common.retry')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
