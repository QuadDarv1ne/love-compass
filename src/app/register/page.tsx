'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AvatarPicker } from '@/components/views/shared';
import { validatePasswordStrength } from '@/lib/auth/password';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const AVATARS = Array.from({ length: 20 }, (_, i) =>
  `https://api.dicebear.com/9.x/adventurer/svg?seed=${i + 1}`
);

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    gender: '',
    city: '',
    bio: '',
    interests: '',
    lookingFor: 'all',
  });
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === 'password') {
      const strength = validatePasswordStrength(value);
      setPasswordErrors(strength.errors);
    }
  };

  const isFormValid =
    form.name &&
    form.email &&
    form.password &&
    form.confirmPassword &&
    form.age &&
    form.gender &&
    form.password === form.confirmPassword &&
    passwordErrors.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          age: parseInt(form.age),
          gender: form.gender,
          city: form.city,
          bio: form.bio,
          interests: form.interests,
          avatar,
          lookingFor: form.lookingFor,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          toast.error(data.error, { description: data.details.join(', ') });
        } else {
          toast.error(data.error || 'Ошибка регистрации');
        }
        return;
      }

      toast.success('Регистрация успешна! Проверьте вашу почту.');
      router.push(`/verify-email-pending?email=${encodeURIComponent(form.email)}`);
    } catch {
      toast.error('Ошибка сервера');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Регистрация"
      subtitle="Создайте аккаунт, чтобы начать"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar */}
        <div>
          <Label>Аватар</Label>
          <AvatarPicker selected={avatar} onSelect={setAvatar} />
        </div>

        {/* Name & Email */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="name">Имя *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ваше имя"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="your@email.com"
              required
              className="mt-1"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <Label htmlFor="password">Пароль *</Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
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

        {/* Confirm Password */}
        <div>
          <Label htmlFor="confirmPassword">Подтвердите пароль *</Label>
          <div className="relative mt-1">
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
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
          {form.confirmPassword && form.password !== form.confirmPassword && (
            <div className="mt-1 text-xs text-rose-500">Пароли не совпадают</div>
          )}
        </div>

        {/* Age & Gender */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="age">Возраст *</Label>
            <Input
              id="age"
              type="number"
              min={18}
              max={99}
              value={form.age}
              onChange={(e) => updateField('age', e.target.value)}
              placeholder="18+"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="gender">Пол *</Label>
            <Select onValueChange={(v) => updateField('gender', v)} value={form.gender}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Выберите" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Мужской</SelectItem>
                <SelectItem value="female">Женский</SelectItem>
                <SelectItem value="other">Другой</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* City & Looking For */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="city">Город</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="Москва"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="lookingFor">Ищу</Label>
            <Select onValueChange={(v) => updateField('lookingFor', v)} value={form.lookingFor}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всех</SelectItem>
                <SelectItem value="male">Мужчин</SelectItem>
                <SelectItem value="female">Женщин</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bio */}
        <div>
          <Label htmlFor="bio">О себе</Label>
          <Textarea
            id="bio"
            value={form.bio}
            onChange={(e) => updateField('bio', e.target.value)}
            placeholder="Расскажите о себе..."
            maxLength={500}
            className="mt-1"
          />
        </div>

        {/* Interests */}
        <div>
          <Label htmlFor="interests">Интересы</Label>
          <Input
            id="interests"
            value={form.interests}
            onChange={(e) => updateField('interests', e.target.value)}
            placeholder="Музыка, спорт, путешествия"
            className="mt-1"
          />
        </div>

        <Button type="submit" className="w-full" disabled={!isFormValid || loading}>
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        Уже есть аккаунт?{' '}
        <Link href="/login" className="text-rose-500 hover:text-rose-600">
          Войти
        </Link>
      </p>
    </AuthLayout>
  );
}
