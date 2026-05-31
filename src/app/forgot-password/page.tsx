'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { appLogger } from '@/lib/logger';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      appLogger.error('forgot-password.submit', 'Forgot password request failed', error);
      toast.error('Ошибка сервера. Попробуйте ещё раз');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Сброс пароля"
      subtitle="Введите email для получения ссылки"
    >
      {sent ? (
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Mail className="w-12 h-12 text-rose-500" />
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            Если аккаунт с email <strong>{email}</strong> существует,
            мы отправили ссылку для сброса пароля
          </p>
          <Link href="/login">
            <Button className="w-full">Вернуться ко входу</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
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
            {loading ? 'Отправка...' : 'Отправить ссылку'}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        Вспомнили пароль?{' '}
        <Link href="/login" className="text-rose-500 hover:text-rose-600">
          Войти
        </Link>
      </p>
    </AuthLayout>
  );
}
