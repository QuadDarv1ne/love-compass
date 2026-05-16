'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Mail, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

function VerifyEmailPendingContent() {
  const searchParams = useSearchParams();
  const _router = useRouter();
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
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      toast.success('Письмо отправлено повторно');
      setCooldown(60);
    } catch {
      toast.error('Ошибка сервера');
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthLayout
      title="Подтвердите email"
      subtitle="Мы отправили письмо для подтверждения"
    >
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-rose-500" />
          </div>
        </div>

        <div>
          <p className="text-gray-600 dark:text-gray-300">
            Мы отправили письмо на <strong>{email}</strong>
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            Перейдите по ссылке в письме, чтобы подтвердить ваш email
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Проверьте папку &laquo;Спам&raquo;, если письмо не пришло</span>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleResend}
            disabled={cooldown > 0 || sending || !email}
            className="w-full"
            variant="outline"
          >
            {cooldown > 0
              ? `Отправить повторно (${cooldown}с)`
              : sending
              ? 'Отправка...'
              : 'Отправить повторно'}
          </Button>

          <Link href="/login">
            <Button variant="ghost" className="w-full">
              Вернуться ко входу
            </Button>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function VerifyEmailPendingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}>
      <VerifyEmailPendingContent />
    </Suspense>
  );
}
