'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { validatePasswordStrength } from '@/lib/auth/password';
import { appLogger } from '@/lib/logger';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

function ResetPasswordContent() {
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
    setPasswordErrors(strength.errors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Отсутствует токен');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      toast.success('Пароль изменён! Войдите с новым паролем');
      router.push('/login');
    } catch (error) {
      appLogger.error('reset-password.submit', 'Reset password request failed', error);
      toast.error('Ошибка сервера. Попробуйте ещё раз');
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
      title="Новый пароль"
      subtitle="Установите новый пароль"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password">Новый пароль</Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Минимум 8 символов"
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
          <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
          <div className="relative mt-1">
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
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
            <div className="mt-1 text-xs text-rose-500">Пароли не совпадают</div>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={!isValid || loading}>
          {loading ? 'Сохранение...' : 'Сохранить пароль'}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
