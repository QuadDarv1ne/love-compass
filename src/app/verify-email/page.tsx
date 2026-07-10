'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

function VerifyEmailContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) return;

    const abortController = new AbortController();
    let cancelled = false;

    fetch(`/api/auth/verify-email?token=${token}`, { signal: abortController.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!cancelled) {
          if (res.ok) {
            setStatus('success');
            setEmail(data.email || '');
          } else {
            setStatus('error');
          }
        }
      })
      .catch((error) => {
        if ((error as Error).name !== 'AbortError' && !cancelled) {
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [token]);

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => router.push('/'), 2000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  return (
    <AuthLayout
      title={
        status === 'loading'
          ? t('verifyEmail.checking')
          : status === 'success'
          ? t('verifyEmail.confirmed')
          : t('verifyEmail.confirmError')
      }
    >
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
          </div>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <p className="text-foreground">
              {t('verifyEmail.emailConfirmed', { email })}
            </p>
            <Link href="/">
              <Button className="w-full">{t('verifyEmail.continue')}</Button>
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center">
              <XCircle className="w-16 h-16 text-rose-500" />
            </div>
            <p className="text-foreground">
              {t('verifyEmail.linkInvalid')}
            </p>
            <div className="space-y-2">
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  {t('verifyEmail.backToLogin')}
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="ghost" className="w-full">
                  {t('verifyEmail.registerAgain')}
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">{t('common.loading')}</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
