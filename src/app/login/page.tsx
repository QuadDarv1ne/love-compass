'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { hydrateAppData, getCSRFToken } from '@/lib/api';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const login = useAppStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEmailValid = email === '' || EMAIL_REGEX.test(email);
  const canSubmit = email.length > 0 && password.length >= 8 && isEmailValid && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email)) {
      toast.error(t('error.emailInvalid'));
      return;
    }
    if (password.length < 8) {
      toast.error(t('error.passwordMin'));
      return;
    }
    setLoading(true);

    try {
      const csrfToken = await getCSRFToken();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.needsEmailVerification) {
        router.push(`/verify-email-pending?token=${encodeURIComponent(data.tempToken)}`);
        return;
      }

      if (data.needs2FA) {
        router.push(`/2fa-verify?tempToken=${encodeURIComponent(data.tempToken)}`);
        return;
      }

      if (!res.ok) {
        toast.error(data.error || t('login.error'));
        return;
      }

      login(data.user);
      try {
        await hydrateAppData();
      } catch (hydrateError) {
        logger.error('login.hydrate', 'Failed to hydrate app data after login', hydrateError);
        // Continue — user is logged in, data will load on next navigation
      }
      toast.success(t('login.welcome'));
      router.push('/');
    } catch (error) {
      logger.error('login.submit', 'Login failed', error);
      toast.error(t('login.serverError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.login')}
      subtitle={t('login.subtitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">{t('auth.email')}</Label>
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

        <div>
          <Label htmlFor="password">{t('auth.password')}</Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-rose-500 hover:text-rose-600"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={!canSubmit}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('login.loading')}
            </span>
          ) : t('auth.login')}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-4">
        {t('auth.noAccount')}{' '}
        <Link href="/register" className="text-rose-500 hover:text-rose-600">
          {t('auth.register')}
        </Link>
      </p>
    </AuthLayout>
  );
}
