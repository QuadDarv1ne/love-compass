'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
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
import { TOTP } from '@/lib/constants';
import { fetchWithCSRF, deleteWithCSRF } from '@/lib/api';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { useTranslation } from '@/hooks/useTranslation';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatFullDate } from '@/lib/date-utils';
import { LOCALE_FLAGS, LOCALE_NAMES, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n';

const QRCode = dynamic(() => import('qrcode.react').then((m) => ({ default: m.QRCodeCanvas })), { ssr: false });

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
  const { t } = useTranslation();
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (open) {
      setStep('setup');
      setSecret('');
      setUri('');
      setBackupCodes([]);
      setCode('');
      setLoading(true);
      cancelledRef.current = false;
      (async () => {
        try {
          const res = await fetchWithCSRF('/api/auth/2fa/setup', {});
          if (cancelledRef.current) return;
          const data = await res.json();
          if (!res.ok) {
            toast.error(data.error);
            return;
          }
          if (cancelledRef.current) return;
          setSecret(data.secret);
          setUri(data.uri);
          setBackupCodes(data.backupCodes);
          setStep('verify');
        } catch {
          if (cancelledRef.current) return;
          toast.error(t('error.server'));
        } finally {
          if (!cancelledRef.current) setLoading(false);
        }
      })();
    }
    return () => {
      cancelledRef.current = true;
    };
  }, [open, t]);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await fetchWithCSRF('/api/auth/2fa/enable', { token: code });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(t('settings.2faEnabledToast'));
      onEnabled();
      onOpenChange(false);
      setStep('setup');
      setCode('');
    } catch {
      toast.error(t('error.server'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'setup' ? t('settings.2faSetupTitle') : t('settings.2faVerifyTitle')}
          </DialogTitle>
          <DialogDescription>
            {step === 'setup'
              ? t('settings.2faSetupDesc')
              : t('settings.2faVerifyDesc', { length: TOTP.TOKEN_LENGTH })}
          </DialogDescription>
        </DialogHeader>

        {step === 'setup' ? (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
              </div>
            ) : (
              <>
                <div className="flex justify-center p-4 bg-white rounded-xl">
                  {uri && <QRCode value={uri} size={200} />}
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  {t('settings.2faManualEntry')}
                </div>
                <code className="block text-center text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                  {secret}
                </code>
                <Button onClick={() => setStep('verify')} className="w-full" disabled={!uri}>
                  {t('settings.2faNext')}
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Backup codes display */}
            <div>
              <Label className="text-sm font-medium">{t('settings.2faBackupCodes')}</Label>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {backupCodes.map((c) => (
                  <code key={c} className="text-xs bg-gray-100 dark:bg-gray-800 p-1.5 rounded text-center">
                    {c}
                  </code>
                ))}
              </div>
              <p className="text-xs text-rose-500 mt-1">{t('settings.2faBackupWarning')}</p>
            </div>

            <Separator />

            <div>
              <Label htmlFor="totp-code">{t('settings.2faVerifyDesc', { length: TOTP.TOKEN_LENGTH })}</Label>
              <Input
                id="totp-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, TOTP.TOKEN_LENGTH))}
                placeholder={'0'.repeat(TOTP.TOKEN_LENGTH)}
                maxLength={TOTP.TOKEN_LENGTH}
                className="mt-1 text-center text-2xl tracking-widest"
              />
            </div>

            <Button onClick={handleVerify} className="w-full" disabled={code.length !== TOTP.TOKEN_LENGTH || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('settings.2faEnableButton')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export function SettingsView() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const confirm = useConfirm();
  const {
    currentUser,
    refreshUser,
    logout,
    clearAllData,
    notificationsEnabled,
    setNotificationsEnabled,
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
    emailNotifications: emailNotif,
    setEmailNotifications: setEmailNotif,
  } = useAppStore(
    useShallow((s) => ({
      currentUser: s.currentUser,
      refreshUser: s.refreshUser,
      logout: s.logout,
      clearAllData: s.clearAllData,
      notificationsEnabled: s.notificationsEnabled,
      setNotificationsEnabled: s.setNotificationsEnabled,
      profileVisible: s.profileVisible,
      setProfileVisible: s.setProfileVisible,
      showOnlineStatus: s.showOnlineStatus,
      setShowOnlineStatus: s.setShowOnlineStatus,
      language: s.language,
      setLanguage: s.setLanguage,
      loadSettings: s.loadSettings,
      showDistance: s.showDistance,
      setShowDistance: s.setShowDistance,
      soundEnabled: s.soundEnabled,
      setSoundEnabled: s.setSoundEnabled,
    matchNotifications: s.matchNotifications,
    setMatchNotifications: s.setMatchNotifications,
    likeNotifications: s.likeNotifications,
    setLikeNotifications: s.setLikeNotifications,
    emailNotifications: s.emailNotifications,
    setEmailNotifications: s.setEmailNotifications,
    }))
  );

  /* 2FA & password state */
  const [twoFADialogOpen, setTwoFADialogOpen] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [disable2FACode, setDisable2FACode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /* helpers */
  const handleDisable2FA = async () => {
    if (disable2FACode.length !== TOTP.TOKEN_LENGTH) {
      toast.error(t('settings.2faEnterCode', { length: TOTP.TOKEN_LENGTH }));
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
      toast.success(t('settings.2faDisabledToast'));
      setDisable2FACode('');
      // Refresh user state to update 2FA status without losing client data
      refreshUser();
    } catch {
      toast.error(t('error.server'));
    } finally {
      setDisabling2FA(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error(t('error.passwordMin'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error(t('error.passwordMismatch'));
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetchWithCSRF('/api/auth/change-password', { currentPassword, newPassword });
      const data = await res.json();
      if (!res.ok) {
        const description = Array.isArray(data.details) ? data.details.join(', ') : undefined;
        toast.error(data.error, { description });
        return;
      }
      toast.success(t('error.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch {
      toast.error(t('error.server'));
    } finally {
      setChangingPassword(false);
    }
  };

  const fmtCreatedDate = (dateStr?: string) => dateStr ? formatFullDate(dateStr, language) : '—';

  const currentTheme = theme ?? 'system';
  const actualTheme = resolvedTheme ?? 'light';

  const themeIcon =
    actualTheme === 'dark' ? (
      <Moon className="w-4 h-4 text-rose-400" />
    ) : actualTheme === 'light' ? (
      <Sun className="w-4 h-4 text-rose-400" />
    ) : (
      <Monitor className="w-4 h-4 text-rose-400" />
    );

  const themeLabel =
    currentTheme === 'dark'
      ? t('settings.themeDark')
      : currentTheme === 'light'
        ? t('settings.themeLight')
        : t('settings.themeSystem');

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
            {t('settings.title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('settings.subtitle')}
          </p>
        </motion.div>

        {/* ════════════ 1. ВНЕШНИЙ ВИД ════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
          <Card className="border-rose-100 dark:border-rose-900/50 bg-card rounded-2xl shadow-md">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-4">
                <Sun className="w-4 h-4" />
                {t('settings.appearance')}
              </h3>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {themeIcon}
                  <div>
                    <Label className="text-sm font-medium">{t('settings.theme')}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('settings.themeDesc')}
                    </p>
                  </div>
                </div>
                <Select
                  value={currentTheme}
                  onValueChange={(v) => setTheme(v)}
                >
                  <SelectTrigger className="w-[130px] border-rose-200 dark:border-rose-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">☀️ {t('settings.themeLight')}</SelectItem>
                    <SelectItem value="dark">🌙 {t('settings.themeDark')}</SelectItem>
                    <SelectItem value="system">💻 {t('settings.themeSystem')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t('settings.currentTheme')}</span>
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
                {t('settings.notifications')}
              </h3>

              <Separator className="bg-rose-100 dark:bg-rose-900/50 mb-1" />

              <SettingRow
                icon={<Bell className="w-4 h-4" />}
                label={t('settings.pushNotifications')}
                description={t('settings.pushNotificationsDesc')}
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />

              <SettingRow
                icon={<Volume2 className="w-4 h-4" />}
                label={t('settings.sound')}
                description={t('settings.soundDesc')}
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />

              <SettingRow
                icon={<HeartHandshake className="w-4 h-4" />}
                label={t('settings.matchNotif')}
                description={t('settings.matchNotifDesc')}
                checked={matchNotif}
                onCheckedChange={setMatchNotif}
              />

              <SettingRow
                icon={<ThumbsUp className="w-4 h-4" />}
                label={t('settings.likeNotif')}
                description={t('settings.likeNotifDesc')}
                checked={likeNotif}
                onCheckedChange={setLikeNotif}
              />

              <SettingRow
                icon={<Mail className="w-4 h-4" />}
                label={t('settings.emailNotif')}
                description={t('settings.emailNotifDesc')}
                checked={emailNotif}
                onCheckedChange={setEmailNotif}
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
                {t('settings.privacy')}
              </h3>

              <Separator className="bg-rose-100 dark:bg-rose-900/50 mb-1" />

              <SettingRow
                icon={<Eye className="w-4 h-4" />}
                label={t('settings.showProfile')}
                description={t('settings.showProfileDesc')}
                checked={profileVisible}
                onCheckedChange={setProfileVisible}
              />

              <SettingRow
                icon={<Wifi className="w-4 h-4" />}
                label={t('settings.showOnline')}
                description={t('settings.showOnlineDesc')}
                checked={showOnlineStatus}
                onCheckedChange={setShowOnlineStatus}
              />

              <SettingRow
                icon={<MapPin className="w-4 h-4" />}
                label={t('settings.showDistance')}
                description={t('settings.showDistanceDesc')}
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
                {t('settings.security')}
              </h3>

              <Separator className="bg-rose-100 dark:bg-rose-900/50 mb-4" />

              {/* 2FA Status */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{t('settings.twoFA')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.twoFADesc')}</p>
                  </div>
                </div>
                {currentUser?.totpEnabled ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" /> {t('settings.twoFAEnabled')}
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTwoFADialogOpen(true)}
                    className="border-rose-200 text-rose-600 hover:bg-rose-50"
                  >
                    {t('settings.enable2FA')}
                  </Button>
                )}
              </div>

              {/* Disable 2FA */}
              {currentUser?.totpEnabled && (
                <div className="space-y-2 mb-4 p-3 bg-rose-50 dark:bg-rose-900/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Input
                      value={disable2FACode}
                      onChange={(e) => setDisable2FACode(e.target.value.replace(/\D/g, '').slice(0, TOTP.TOKEN_LENGTH))}
                      placeholder={t('settings.disable2FACode')}
                      maxLength={TOTP.TOKEN_LENGTH}
                      className="text-center tracking-widest"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDisable2FA}
                      disabled={disabling2FA}
                    >
                      {disabling2FA ? <Loader2 className="w-4 h-4 animate-spin" /> : t('settings.disable2FA')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Change Password */}
              <Separator className="bg-rose-100 dark:bg-rose-900/50 mb-4" />
              <h4 className="text-sm font-medium mb-3">{t('settings.changePassword')}</h4>
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder={t('settings.currentPassword')}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder={t('settings.newPassword')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder={t('settings.confirmNewPassword')}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                  className="w-full"
                >
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : t('settings.changePassword')}
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
                {t('settings.language')}
              </h3>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">{t('settings.languageTitle')}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('settings.languageDesc')}
                    </p>
                  </div>
                </div>
                <Select value={language} onValueChange={(v) => setLanguage(v)}>
                  <SelectTrigger className="w-[140px] border-rose-200 dark:border-rose-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(SUPPORTED_LOCALES as Locale[]).map((locale) => (
                      <SelectItem key={locale} value={locale}>
                        {LOCALE_FLAGS[locale]} {LOCALE_NAMES[locale]}
                      </SelectItem>
                    ))}
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
                {t('settings.account')}
              </h3>

              <Separator className="bg-rose-100 dark:bg-rose-900/50 mb-4" />

              {/* Avatar Upload */}
              {currentUser && (
                <div className="mb-5">
                  <AvatarUpload
                    currentAvatar={currentUser.avatar}
                    userId={currentUser.id}
                    userName={currentUser.name}
                  />
                </div>
              )}

              {/* email */}
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{t('settings.email')}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {currentUser?.email ?? '—'}
                    </p>
                    {currentUser?.emailVerified ? (
                      <Badge variant="default" className="text-[10px] bg-green-500 hover:bg-green-600">{t('settings.verified')}</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">{t('settings.notVerified')}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* member since */}
              <div className="flex items-center gap-3 mb-5">
                <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('settings.memberSince')}</p>
                  <p className="text-sm font-medium">
                    {fmtCreatedDate(currentUser?.createdAt)}
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
                    const ok = await logout();
                    if (ok) toast.success(t('settings.loggedOut'));
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  {t('auth.logout')}
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl"
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: t('settings.clearCache'),
                      message: t('settings.clearConfirm'),
                      confirmLabel: t('common.confirm'),
                      cancelLabel: t('common.cancel'),
                      variant: 'destructive',
                    });
                    if (!confirmed) return;

                    clearAllData();
                    try { localStorage.clear(); } catch { /* ignore */ }
                    toast.success(t('settings.cleared'), {
                      description: t('settings.clearedDesc'),
                    });
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  {t('settings.clearCache')}
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 rounded-xl"
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: t('settings.deleteAccount'),
                      message: t('settings.deleteConfirm'),
                      confirmLabel: t('common.confirm'),
                      cancelLabel: t('common.cancel'),
                      variant: 'destructive',
                    });
                    if (!confirmed) return;

                    try {
                      const res = await deleteWithCSRF('/api/account', {});
                      if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || 'Failed to delete account');
                      }
                      toast.success(t('settings.accountDeleted'), {
                        description: t('settings.accountDeletedDesc'),
                      });
                      clearAllData();
                      try { localStorage.clear(); } catch { /* ignore */ }
                    } catch (error: unknown) {
                      const message = error instanceof Error ? error.message : t('settings.deleteError');
                      toast.error(t('error.server'), { description: message });
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  {t('settings.deleteAccount')}
                </Button>

                <p className="text-[11px] text-muted-foreground text-center">
                  {t('settings.deleteAccountWarn')}
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
                {t('settings.about')}
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
                  {t('app.version')}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2 max-w-[260px] mx-auto leading-relaxed">
                  {t('settings.aboutDesc')}
                </p>
              </div>

              <div className="grid gap-2">
                {[
                  {
                    icon: <FileText className="w-4 h-4 text-rose-400" />,
                    title: t('settings.terms'),
                    desc: t('settings.termsDesc'),
                  },
                  {
                    icon: <Shield className="w-4 h-4 text-rose-400" />,
                    title: t('settings.privacyPolicy'),
                    desc: t('settings.privacyPolicyDesc'),
                  },
                  {
                    icon: <Headphones className="w-4 h-4 text-rose-400" />,
                    title: t('settings.support'),
                    desc: t('settings.supportDesc'),
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
          refreshUser();
        }}
      />
    </div>
  );
}
