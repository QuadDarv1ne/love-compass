'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { hydrateAppData, fetchWithCSRF } from '@/lib/api';
import { appLogger } from '@/lib/logger';
import { toast } from 'sonner';
import { Shield, KeyRound, Loader2 } from 'lucide-react';

function TwoFAVerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const login = useAppStore((s) => s.login);
  const tempToken = searchParams.get('tempToken') || '';
  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tempToken) {
      toast.error('Отсутствует токен сессии');
      router.push('/login');
      return;
    }

    setLoading(true);

    try {
      const res = await fetchWithCSRF('/api/auth/2fa/verify', {
        tempToken,
        code: useBackup ? backupCode : code,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      login(data.user);
      try {
        await hydrateAppData();
      } catch (hydrateError) {
        appLogger.error('2fa-verify.hydrate', 'Failed to hydrate app data after 2FA', hydrateError);
      }
      toast.success('Добро пожаловать!');
      router.push('/');
    } catch (error) {
      appLogger.error('2fa-verify.submit', '2FA verification failed', error);
      toast.error('Ошибка сервера. Попробуйте ещё раз');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Двухфакторная аутентификация"
      subtitle="Введите код из приложения-аутентификатора"
    >
      <div className="text-center mb-4">
        <Shield className="w-12 h-12 text-rose-500 mx-auto" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!useBackup ? (
          <>
            <div>
              <Label htmlFor="code">6-значный код</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="mt-1 text-center text-2xl tracking-widest"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={code.length !== 6 || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Подтвердить'}
            </Button>

            <button
              type="button"
              onClick={() => setUseBackup(true)}
              className="w-full text-sm text-rose-500 hover:text-rose-600"
            >
              Использовать резервный код
            </button>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="backupCode">Резервный код</Label>
              <div className="flex items-center gap-2 mt-1">
                <KeyRound className="w-4 h-4 text-gray-400" />
                <Input
                  id="backupCode"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  className="text-center tracking-widest"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={backupCode.length !== 8 || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Подтвердить'}
            </Button>

            <button
              type="button"
              onClick={() => {
                setUseBackup(false);
                setBackupCode('');
              }}
              className="w-full text-sm text-rose-500 hover:text-rose-600"
            >
              Вернуться к коду из приложения
            </button>
          </>
        )}
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        <Link href="/login" className="text-rose-500 hover:text-rose-600">
          Вернуться ко входу
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function TwoFAVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}>
      <TwoFAVerifyContent />
    </Suspense>
  );
}
