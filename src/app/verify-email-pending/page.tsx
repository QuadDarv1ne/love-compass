'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Mail, AlertCircle } from 'lucide-react';
import { getCSRFToken } from '@/lib/api';
import { appLogger } from '@/lib/logger';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';

function VerifyEmailPendingContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

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
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      toast.success(t('verifyEmail.resent'));
      setCooldown(60);
    } catch (error) {
      appLogger.error('verify-email.resend', 'Email resend failed', error);
      toast.error(t('forgotPassword.error'));
    } finally {
      setSending(false);
    }
  };

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
          <p className="text-gray-600 dark:text-gray-300">
            {t('verifyEmail.sentTo', { email })}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
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
            disabled={cooldown > 0 || sending || !email}
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
