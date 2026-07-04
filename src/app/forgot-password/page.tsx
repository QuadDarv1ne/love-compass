'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getCSRFToken } from '@/lib/api';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const csrfToken = await getCSRFToken();
      const res = await fetch('/api/auth/forgot-password', {
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

      // Always show success (timing-safe)
      setSent(true);
    } catch (error) {
      logger.error('forgot-password.submit', 'Forgot password request failed', error);
      toast.error(t('forgotPassword.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('forgotPassword.title')}
      subtitle={t('forgotPassword.subtitle')}
    >
      {sent ? (
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Mail className="w-12 h-12 text-rose-500" />
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            {t('forgotPassword.sentDesc', { email })}
          </p>
          <Link href="/login">
            <Button className="w-full">{t('forgotPassword.backToLogin')}</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">{t('forgotPassword.emailLabel')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="mt-1"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('forgotPassword.sending') : t('forgotPassword.sent')}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        {t('forgotPassword.rememberPassword')}{' '}
        <Link href="/login" className="text-rose-500 hover:text-rose-600">
          {t('forgotPassword.login')}
        </Link>
      </p>
    </AuthLayout>
  );
}
