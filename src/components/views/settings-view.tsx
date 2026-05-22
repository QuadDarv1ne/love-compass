'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  Volume2,
  HeartHandshake,
  ThumbsUp,
  Eye,
  Wifi,
  MapPin,
  Globe,
  Mail,
  CalendarDays,
  Trash2,
  LogOut,
  Shield,
  FileText,
  Headphones,
  Info,
  Sparkles,
  Smartphone,
  Key,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { QRCodeCanvas } from 'qrcode.react';
import { fetchWithCSRF, deleteWithCSRF } from '@/lib/api';

/* ─── shared animation ────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: 'easeOut' as const },
  }),
} as const;

/* ─── reusable toggle row ─────────────────────────────────────── */
function SettingRow({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
        <div className="min-w-0">
          <Label className="text-sm font-medium leading-snug">{label}</Label>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="shrink-0 data-[state=checked]:bg-rose-500"
      />
    </div>
  );
}

/* ─── 2FA Setup Dialog ────────────────────────────────────────── */
function TwoFASetupDialog({
  open,
  onOpenChange,
  onEnabled,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEnabled: () => void;
}) {
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const res = await fetchWithCSRF('/api/auth/2fa/setup', {});
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      setSecret(data.secret);
      setUri(data.uri);
      setBackupCodes(data.backupCodes);
      setStep('verify');
    } catch {
      toast.error('Ошибка сервера');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await fetchWithCSRF('/api/auth/2fa/enable', { token: code });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success('2FA включён!');
      onEnabled();
      onOpenChange(false);
      setStep('setup');
      setCode('');
    } catch {
      toast.error('Ошибка сервера');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'setup' ? 'Настройка 2FA' : 'Подтверждение 2FA'}
          </DialogTitle>
          <DialogDescription>
            {step === 'setup'
              ? 'Отсканируйте QR-код в приложении-аутентификаторе'
              : 'Введите 6-значный код из приложения'}
          </DialogDescription>
        </DialogHeader>

        {step === 'setup' ? (
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-xl">
              {uri && <QRCodeCanvas value={uri} size={200} />}
            </div>
            <div className="text-xs text-muted-foreground text-center">
              Или введите секрет вручную:
            </div>
            <code className="block text-center text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
              {secret}
            </code>
            <Button onClick={handleSetup} className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Далее'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Backup codes display */}
            <div>
              <Label className="text-sm font-medium">Резервные коды</Label>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {backupCodes.map((c) => (
                  <code key={c} className="text-xs bg-gray-100 dark:bg-gray-800 p-1.5 rounded text-center">
                    {c}
                  </code>
                ))}
              </div>
              <p className="text-xs text-rose-500 mt-1">Сохраните эти коды! Они показываются один раз.</p>
            </div>

            <Separator />

            <div>
              <Label htmlFor="totp-code">6-значный код</Label>
              <Input
                id="totp-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="mt-1 text-center text-2xl tracking-widest"
              />
            </div>

            <Button onClick={handleVerify} className="w-full" disabled={code.length !== 6 || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Включить 2FA'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export function SettingsView() {
  const { setTheme, theme } = useTheme();
  const {
    currentUser,
    logout,
    clearAllData,
    notificationsEnabled,
    setNotificationEnabled,
    profileVisible,
    setProfileVisible,
    showOnlineStatus,
    setShowOnlineStatus,
    language,
    setLanguage,
    loadSettings,
    showDistance,
    setShowDistance,
    soundEnabled,
    setSoundEnabled,
    matchNotifications: matchNotif,
    setMatchNotifications: setMatchNotif,
    likeNotifications: likeNotif,
    setLikeNotifications: setLikeNotif,
  } = useAppStore();

  /* 2FA & password state */
  const [twoFADialogOpen, setTwoFADialogOpen] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [disable2FACode, setDisable2FACode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  /* resolve hydration mismatch — standard next-themes pattern */
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /* helpers */
  const handleDisable2FA = async () => {
    if (disable2FACode.length !== 6) {
      toast.error('Введите 6-значный код');
      return;
    }
    setDisabling2FA(true);
    try {
      const res = await fetchWithCSRF('/api/auth/2fa/disable', { token: disable2FACode });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success('2FA отключён');
      setDisable2FACode('');
      // Refresh user state to update 2FA status without losing client data
      useAppStore.getState().checkAuth();
    } catch {
      toast.error('Ошибка сервера');
    } finally {
      setDisabling2FA(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetchWithCSRF('/api/auth/change-password', { currentPassword, newPassword });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error, { description: data.details?.join(', ') });
        return;
      }
      toast.success('Пароль изменён');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch {
      toast.error('Ошибка сервера');
    } finally {
      setChangingPassword(false);
    }
  };

  const formatCreatedDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const themeIcon =
    theme === 'dark' ? (
      <Moon className="w-4 h-4 text-rose-400" />
    ) : theme === 'light' ? (
      <Sun className="w-4 h-4 text-rose-400" />
    ) : (
      <Monitor className="w-4 h-4 text-rose-400" />
    );

  const themeLabel =
    theme === 'dark'
      ? 'Тёмная'
      : theme === 'light'
        ? 'Светлая'
        : 'Системная';

  /* ═══════════════════════════════════════════════════════════════ */
  if (!mounted) return null;

  return (
    <div className="flex-1 px-4 py-4 md:py-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-md mx-auto space-y-5">
        {/* ── Page header ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-xl font-bold text-rose-700 dark:text-rose-300">
            Настройки
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Управление вашим аккаунтом и приложением
          </p>
        </motion.div>

        {/* ════════════ 1. ВНЕШНИЙ ВИД ════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
          <Card className="border-rose-100 dark:border-rose-900/50 bg-card rounded-2xl shadow-md">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-4">
                <Sun className="w-4 h-4" />
                Внешний вид
              </h3>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {themeIcon}
                  <div>
                    <Label className="text-sm font-medium">Тема оформления</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Выберите удобную тему для интерфейса
                    </p>
                  </div>
                </div>
                <Select
                  value={theme ?? 'system'}
                  onValueChange={(v) => setTheme(v)}
                >
                  <SelectTrigger className="w-[130px] border-rose-200 dark:border-rose-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">☀️ Светлая</SelectItem>
                    <SelectItem value="dark">🌙 Тёмная</SelectItem>
                    <SelectItem value="system">💻 Системная</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Текущая тема:</span>
                <Badge
                  variant="secondary"
                  className="bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                >
                  {themeIcon}
                  {themeLabel}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ════════════ 2. УВЕДОМЛЕНИЯ ════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
          <Card className="border-rose-100 dark:border-rose-900/50 bg-card rounded-2xl shadow-md">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4" />
                Уведомления
              </h3>

              <Separator className="bg-rose-100 dark:bg-rose-900/50 mb-1" />

              <SettingRow
                icon={<Bell className="w-4 h-4" />}
                label="Push-уведомления"
                description="Получайте уведомления на устройстве"
                checked={notificationsEnabled}
                onCheckedChange={setNotificationEnabled}
              />

              <SettingRow
                icon={<Volume2 className="w-4 h-4" />}
                label="Звуки сообщений"
                description="Воспроизводить звук при новом сообщении"
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />

              <SettingRow
                icon={<HeartHandshake className="w-4 h-4" />}
                label="Уведомления о мэтчах"
                description="Узнавайте, когда произойдёт совпадение"
                checked={matchNotif}
                onCheckedChange={setMatchNotif}
              />

              <SettingRow
                icon={<ThumbsUp className="w-4 h-4" />}
                label="Уведомления о лайках"
                description="Получайте уведомления о симпатиях"
                checked={likeNotif}
                onCheckedChange={setLikeNotif}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* ════════════ 3. ПРИВАТНОСТЬ ════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
          <Card className="border-rose-100 dark:border-rose-900/50 bg-card rounded-2xl shadow-md">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4" />
                Приватность
              </h3>

              <Separator className="bg-rose-100 dark:bg-rose-900/50 mb-1" />

              <SettingRow
                icon={<Eye className="w-4 h-4" />}
                label="Показывать профиль"
                description="Ваш профиль будет виден другим пользователям в поиске"
                checked={profileVisible}
                onCheckedChange={setProfileVisible}
              />

              <SettingRow
                icon={<Wifi className="w-4 h-4" />}
                label="Показывать статус онлайн"
                description="Другие пользователи увидят, что вы сейчас в приложении"
                checked={showOnlineStatus}
                onCheckedChange={setShowOnlineStatus}
              />

              <SettingRow
                icon={<MapPin className="w-4 h-4" />}
                label="Показывать расстояние"
                description="Отображать расстояние до вас в других профилях"
                checked={showDistance}
                onCheckedChange={setShowDistance}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* ════════════ 4. БЕЗОПАСНОСТЬ ═══════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
          <Card className="border-rose-100 dark:border-rose-900/50 bg-card rounded-2xl shadow-md">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-2">
                <Key className="w-4 h-4" />
                Безопасность
              </h3>

              <Separator className="bg-rose-100 dark:bg-rose-900/50 mb-4" />

              {/* 2FA Status */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Двухфакторная аутентификация</p>
                    <p className="text-xs text-muted-foreground">Дополнительная защита аккаунта</p>
                  </div>
                </div>
                {currentUser?.totpEnabled ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" /> Включена
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTwoFADialogOpen(true)}
                    className="border-rose-200 text-rose-600 hover:bg-rose-50"
                  >
                    Включить
                  </Button>
                )}
              </div>

              {/* Disable 2FA */}
              {currentUser?.totpEnabled && (
                <div className="space-y-2 mb-4 p-3 bg-rose-50 dark:bg-rose-900/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Input
                      value={disable2FACode}
                      onChange={(e) => setDisable2FACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Код для отключения"
                      maxLength={6}
                      className="text-center tracking-widest"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDisable2FA}
                      disabled={disabling2FA}
                    >
                      {disabling2FA ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Отключить'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Change Password */}
              <Separator className="bg-rose-100 dark:bg-rose-900/50 mb-4" />
              <h4 className="text-sm font-medium mb-3">Сменить пароль</h4>
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="Текущий пароль"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Новый пароль"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Подтвердите новый пароль"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                  className="w-full"
                >
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сменить пароль'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ════════════ 5. ЯЗЫК ═══════════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
          <Card className="border-rose-100 dark:border-rose-900/50 bg-card rounded-2xl shadow-md">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4" />
                Язык
              </h3>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Язык интерфейса</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Выберите язык отображения
                    </p>
                  </div>
                </div>
                <Select value={language} onValueChange={(v) => setLanguage(v)}>
                  <SelectTrigger className="w-[140px] border-rose-200 dark:border-rose-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ru">🇷🇺 Русский</SelectItem>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                    <SelectItem value="es">🇪🇸 Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ════════════ 6. АККАУНТ ════════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}>
          <Card className="border-rose-100 dark:border-rose-900/50 bg-card rounded-2xl shadow-md">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4" />
                Аккаунт
              </h3>

              <Separator className="bg-rose-100 dark:bg-rose-900/50 mb-4" />

              {/* email */}
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Электронная почта</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {currentUser?.email ?? '—'}
                    </p>
                    {!currentUser?.emailVerified && (
                      <Badge variant="destructive" className="text-[10px]">Не подтверждён</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* member since */}
              <div className="flex items-center gap-3 mb-5">
                <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Дата регистрации</p>
                  <p className="text-sm font-medium">
                    {formatCreatedDate(currentUser?.createdAt)}
                  </p>
                </div>
              </div>

              <Separator className="bg-rose-100 dark:bg-rose-900/50 mb-4" />

              {/* action buttons */}
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl"
                  onClick={async () => {
                    try {
                      await logout();
                      toast.success('Вы вышли из аккаунта');
                    } catch {
                      toast.error('Ошибка при выходе');
                    }
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Выйти
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 rounded-xl"
                  onClick={async () => {
                    const confirmed = window.confirm(
                      'Вы уверены? Все ваши данные, мэтчи и переписки будут удалены безвозвратно.'
                    );
                    if (!confirmed) return;

                    try {
                      const res = await deleteWithCSRF('/api/account', {});
                      if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || 'Failed to delete account');
                      }
                      toast.success('Аккаунт удалён', {
                        description: 'Все ваши данные были удалены',
                      });
                      clearAllData();
                      try { localStorage.clear(); } catch { /* ignore */ }
                    } catch (error: unknown) {
                      const message = error instanceof Error ? error.message : 'Ошибка при удалении';
                      toast.error('Ошибка', { description: message });
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить аккаунт
                </Button>

                <p className="text-[11px] text-muted-foreground text-center">
                  При удалении аккаунта все данные, включая переписки и мэтчи, будут удалены
                  безвозвратно.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ════════════ 7. О ПРИЛОЖЕНИИ ════════════════════════ */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={6}
        >
          <Card className="border-rose-100 dark:border-rose-900/50 bg-card rounded-2xl shadow-md">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" />
                О приложении
              </h3>

              <Separator className="bg-rose-100 dark:bg-rose-900/50 mb-4" />

              <div className="text-center mb-5">
                <div className="inline-flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-rose-500" />
                  <span className="text-lg font-bold gradient-text">
                    Love Compass
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                >
                  версия 3.0.0
                </Badge>
                <p className="text-xs text-muted-foreground mt-2 max-w-[260px] mx-auto leading-relaxed">
                  Love Compass — ваш надёжный путеводитель в мире знакомств. Мы помогаем
                  находить людей, с которыми хочется общаться.
                </p>
              </div>

              <div className="grid gap-2">
                {[
                  {
                    icon: <FileText className="w-4 h-4 text-rose-400" />,
                    title: 'Условия использования',
                    desc: 'Правила и условия платформы',
                  },
                  {
                    icon: <Shield className="w-4 h-4 text-rose-400" />,
                    title: 'Политика конфиденциальности',
                    desc: 'Как мы защищаем ваши данные',
                  },
                  {
                    icon: <Headphones className="w-4 h-4 text-rose-400" />,
                    title: 'Поддержка',
                    desc: 'Свяжитесь с нашей командой',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center gap-3 p-3 rounded-xl bg-rose-50/60 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors cursor-default"
                  >
                    {item.icon}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="h-6" />
      </div>

      {/* 2FA Setup Dialog */}
      <TwoFASetupDialog
        open={twoFADialogOpen}
        onOpenChange={setTwoFADialogOpen}
        onEnabled={() => {
          // Refresh user state to update 2FA status without losing client data
          useAppStore.getState().checkAuth();
        }}
      />
    </div>
  );
}
