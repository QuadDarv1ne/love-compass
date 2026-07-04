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
import { validatePasswordStrength } from '@/lib/auth/password-strength';
import { getCSRFToken } from '@/lib/api';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { AVATAR_BASE_URL } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';

const AVATARS: readonly string[] = Array.from({ length: 20 }, (_, i) =>
  `${AVATAR_BASE_URL}?seed=${i + 1}`
);

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
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
  const [avatar, setAvatar] = useState(AVATARS[0]!);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === 'password') {
      const strength = validatePasswordStrength(value);
      setPasswordErrors(strength.errors.map((e) => t(e)));
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
      const csrfToken = await getCSRFToken();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
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
          toast.error(data.error || t('register.error'));
        }
        return;
      }

      toast.success(t('register.success'));
      router.push(`/verify-email-pending?email=${encodeURIComponent(form.email)}`);
    } catch (error) {
      logger.error('register.submit', 'Registration failed', error);
      toast.error(t('register.serverError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.register')}
      subtitle={t('register.subtitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar */}
        <div>
          <Label>{t('register.avatar')}</Label>
          <AvatarPicker selected={avatar} onSelect={setAvatar} />
        </div>

        {/* Name & Email */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="name">{t('auth.name')} *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder={t('auth.name')}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email">{t('auth.email')} *</Label>
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
          <Label htmlFor="password">{t('auth.password')} *</Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              placeholder={t('register.passwordPlaceholder')}
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
          <Label htmlFor="confirmPassword">{t('register.confirmPassword')} *</Label>
          <div className="relative mt-1">
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              placeholder={t('register.confirmPlaceholder')}
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
            <div className="mt-1 text-xs text-rose-500">{t('register.passwordMismatch')}</div>
          )}
        </div>

        {/* Age & Gender */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="age">{t('auth.age')} *</Label>
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
            <Label htmlFor="gender">{t('auth.gender')} *</Label>
            <Select onValueChange={(v) => updateField('gender', v)} value={form.gender}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('register.genderPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t('register.genderMale')}</SelectItem>
                <SelectItem value="female">{t('register.genderFemale')}</SelectItem>
                <SelectItem value="other">{t('register.genderOther')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* City & Looking For */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="city">{t('auth.city')}</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder={t('register.cityPlaceholder')}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="lookingFor">{t('auth.searchingFor')}</Label>
            <Select onValueChange={(v) => updateField('lookingFor', v)} value={form.lookingFor}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('auth.searchAll')}</SelectItem>
                <SelectItem value="male">{t('browse.lookingForMale')}</SelectItem>
                <SelectItem value="female">{t('browse.lookingForFemale')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bio */}
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="bio">{t('profile.bio')}</Label>
            <span className={`text-xs ${form.bio.length > 450 ? 'text-amber-500' : 'text-muted-foreground'}`}>
              {t('register.bioCount', { count: form.bio.length })}
            </span>
          </div>
          <Textarea
            id="bio"
            value={form.bio}
            onChange={(e) => updateField('bio', e.target.value)}
            placeholder={t('register.bioPlaceholder')}
            maxLength={500}
            className="mt-1"
          />
        </div>

        {/* Interests */}
        <div>
          <Label htmlFor="interests">{t('profile.interests')}</Label>
          <Input
            id="interests"
            value={form.interests}
            onChange={(e) => updateField('interests', e.target.value)}
              placeholder={t('register.interestsPlaceholder')}
            className="mt-1"
          />
        </div>

        <Button type="submit" className="w-full" disabled={!isFormValid || loading}>
          {loading ? t('register.loading') : t('auth.register')}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        {t('register.hasAccount')}{' '}
        <Link href="/login" className="text-rose-500 hover:text-rose-600">
          {t('register.login')}
        </Link>
      </p>
    </AuthLayout>
  );
}
