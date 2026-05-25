'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const _router = useRouter();
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

  return (
    <AuthLayout
      title={
        status === 'loading'
          ? 'Проверка...'
          : status === 'success'
          ? 'Email подтверждён!'
          : 'Ошибка подтверждения'
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
            <p className="text-gray-600 dark:text-gray-300">
              Ваш email <strong>{email}</strong> успешно подтверждён
            </p>
            <Link href="/login">
              <Button className="w-full">Войти</Button>
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center">
              <XCircle className="w-16 h-16 text-rose-500" />
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Ссылка неверная или истекла
            </p>
            <div className="space-y-2">
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Вернуться ко входу
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="ghost" className="w-full">
                  Зарегистрироваться заново
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
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
