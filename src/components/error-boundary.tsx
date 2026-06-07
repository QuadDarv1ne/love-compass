'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { appLogger } from '@/lib/logger';
import { useAppStore } from '@/lib/store';
import { createTranslatorForLanguage } from '@/lib/i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    appLogger.error('ErrorBoundary', 'Uncaught error', { error: { message: error.message, stack: error.stack }, componentStack: errorInfo.componentStack });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const lang = useAppStore.getState().language || 'ru';
      const t = createTranslatorForLanguage(lang);

      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <h1 className="text-2xl font-bold text-destructive">{t('error.server')}</h1>
          <p className="text-muted-foreground text-center max-w-md">
            {t('common.someDataNotLoaded')}
          </p>
          <button
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            onClick={() => window.location.reload()}
          >
            {t('common.retry')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
