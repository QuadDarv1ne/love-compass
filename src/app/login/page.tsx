'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { hydrateAppData } from '@/lib/api';
import { appLogger } from '@/lib/logger';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const login = useAppStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.needsEmailVerification) {
        router.push(`/verify-email-pending?email=${encodeURIComponent(data.email)}`);
        return;
      }

      if (data.needs2FA) {
        router.push(`/2fa-verify?tempToken=${encodeURIComponent(data.tempToken)}`);
        return;
      }

      if (!res.ok) {
        toast.error(data.error || 'Ошибка входа');
        return;
      }

      login(data.user);
      try {
        await hydrateAppData();
      } catch (hydrateError) {
        appLogger.error('login.hydrate', 'Failed to hydrate app data after login', hydrateError);
        // Continue — user is logged in, data will load on next navigation
      }
      toast.success('Добро пожаловать!');
      router.push('/');
    } catch (error) {
      appLogger.error('login.submit', 'Login failed', error);
      toast.error('Ошибка сервера. Попробуйте ещё раз');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Вход"
      subtitle="Рады вас видеть снова"
    >
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

        <div>
          <Label htmlFor="password">Пароль</Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
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
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-rose-500 hover:text-rose-600"
          >
            Забыли пароль?
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        Нет аккаунта?{' '}
        <Link href="/register" className="text-rose-500 hover:text-rose-600">
          Зарегистрироваться
        </Link>
      </p>
    </AuthLayout>
  );
}
