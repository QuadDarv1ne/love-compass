'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { validatePasswordStrength } from '@/lib/auth/password-strength';
import { getCSRFToken } from '@/lib/api';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

function ResetPasswordContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const strength = validatePasswordStrength(value);
    setPasswordErrors(strength.errors.map((e) => t(e)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error(t('resetPassword.tokenMissing'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('resetPassword.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      const csrfToken = await getCSRFToken();
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          toast.error(data.error, { description: data.details.join(', ') });
        } else {
          toast.error(data.error);
        }
        return;
      }

      toast.success(t('resetPassword.success'));
      router.push('/login');
    } catch (error) {
      logger.error('reset-password.submit', 'Reset password request failed', error);
      toast.error(t('resetPassword.error'));
    } finally {
      setLoading(false);
    }
  };

  const isValid =
    token &&
    password &&
    confirmPassword &&
    password === confirmPassword &&
    passwordErrors.length === 0;

  return (
    <AuthLayout
      title={t('resetPassword.title')}
      subtitle={t('resetPassword.subtitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password">{t('resetPassword.newPasswordLabel')}</Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder={t('resetPassword.passwordPlaceholder')}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {passwordErrors.length > 0 && (
            <div className="mt-1 text-xs text-rose-500">
              {passwordErrors.join(', ')}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword">{t('resetPassword.confirmLabel')}</Label>
          <div className="relative mt-1">
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('resetPassword.confirmPlaceholder')}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <div className="mt-1 text-xs text-rose-500">{t('resetPassword.passwordMismatch')}</div>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={!isValid || loading}>
          {loading ? t('resetPassword.saving') : t('resetPassword.saved')}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">{t('resetPassword.loading')}</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
