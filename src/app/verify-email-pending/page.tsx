'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Mail, AlertCircle } from 'lucide-react';
import { getCSRFToken } from '@/lib/api';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';

function VerifyEmailPendingContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(true);

  const resolveEmail = useCallback(async () => {
    if (!token) {
      setResolving(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/resolve-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmail(data.email);
      }
    } catch (error) {
      logger.error('verify-email.resolve', 'Failed to resolve email', error);
    } finally {
      setResolving(false);
    }
  }, [token]);

  useEffect(() => {
    resolveEmail();
  }, [resolveEmail]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    setSending(true);
    try {
      const csrfToken = await getCSRFToken();
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      toast.success(t('verifyEmail.resent'));
      setCooldown(60);
    } catch (error) {
      logger.error('verify-email.resend', 'Email resend failed', error);
      toast.error(t('forgotPassword.error'));
    } finally {
      setSending(false);
    }
  };

  if (resolving) {
    return (
      <AuthLayout title={t('verifyEmail.title')} subtitle={t('verifyEmail.subtitle')}>
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('verifyEmail.title')}
      subtitle={t('verifyEmail.subtitle')}
    >
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-rose-500" />
          </div>
        </div>

        <div>
          <p className="text-foreground">
            {t('verifyEmail.sentTo', { email: email || '***' })}
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            {t('verifyEmail.checkInbox')}
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{t('verifyEmail.checkSpam')}</span>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleResend}
            disabled={cooldown > 0 || sending || !token}
            className="w-full"
            variant="outline"
          >
            {cooldown > 0
              ? t('verifyEmail.resendCooldown', { cooldown })
              : sending
              ? t('verifyEmail.sending')
              : t('verifyEmail.resend')}
          </Button>

          <Link href="/login">
            <Button variant="ghost" className="w-full">
              {t('verifyEmail.backToLogin')}
            </Button>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function VerifyEmailPendingPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">{t('common.loading')}</div>}>
      <VerifyEmailPendingContent />
    </Suspense>
  );
}
