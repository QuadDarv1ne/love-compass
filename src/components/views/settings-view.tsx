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
import { useAppStore } from '@/lib/store';

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

/* ═══════════════════════════════════════════════════════════════ */
export function SettingsView() {
  const { setTheme, theme } = useTheme();
  const {
    currentUser,
    logout,
    clearAllData,
    notificationEnabled,
    setNotificationEnabled,
    profileVisible,
    setProfileVisible,
    showOnlineStatus,
    setShowOnlineStatus,
    language,
    setLanguage,
  } = useAppStore();

  /* local notification sub‑toggles */
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [matchNotif, setMatchNotif] = useState(true);
  const [likeNotif, setLikeNotif] = useState(true);
  const [showDistance, setShowDistance] = useState(false);

  /* resolve hydration mismatch — standard next-themes pattern */
  const [mounted, setMounted] = useState(false);
   
  useEffect(() => { setMounted(true); }, []);

  /* helpers */
  const handleSaveToast = () => toast.success('Настройки сохранены');

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

              {/* preview indicator */}
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
                checked={notificationEnabled}
                onCheckedChange={(v) => {
                  setNotificationEnabled(v);
                  handleSaveToast();
                }}
              />

              <SettingRow
                icon={<Volume2 className="w-4 h-4" />}
                label="Звуки сообщений"
                description="Воспроизводить звук при новом сообщении"
                checked={soundEnabled}
                onCheckedChange={(v) => {
                  setSoundEnabled(v);
                  handleSaveToast();
                }}
              />

              <SettingRow
                icon={<HeartHandshake className="w-4 h-4" />}
                label="Уведомления о мэтчах"
                description="Узнавайте, когда произойдёт совпадение"
                checked={matchNotif}
                onCheckedChange={(v) => {
                  setMatchNotif(v);
                  handleSaveToast();
                }}
              />

              <SettingRow
                icon={<ThumbsUp className="w-4 h-4" />}
                label="Уведомления о лайках"
                description="Получайте уведомления о симпатиях"
                checked={likeNotif}
                onCheckedChange={(v) => {
                  setLikeNotif(v);
                  handleSaveToast();
                }}
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
                onCheckedChange={(v) => {
                  setProfileVisible(v);
                  handleSaveToast();
                }}
              />

              <SettingRow
                icon={<Wifi className="w-4 h-4" />}
                label="Показывать статус онлайн"
                description="Другие пользователи увидят, что вы сейчас в приложении"
                checked={showOnlineStatus}
                onCheckedChange={(v) => {
                  setShowOnlineStatus(v);
                  handleSaveToast();
                }}
              />

              <SettingRow
                icon={<MapPin className="w-4 h-4" />}
                label="Показывать расстояние"
                description="Отображать расстояние до вас в других профилях"
                checked={showDistance}
                onCheckedChange={(v) => {
                  setShowDistance(v);
                  handleSaveToast();
                }}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* ════════════ 4. ЯЗЫК ═══════════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
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

        {/* ════════════ 5. АККАУНТ ════════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
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
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Электронная почта</p>
                  <p className="text-sm font-medium truncate">
                    {currentUser?.email ?? '—'}
                  </p>
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
                  onClick={() => {
                    clearAllData();
                    // Clear all browser storage
                    try { localStorage.clear(); } catch { /* ignore */ }
                    try { sessionStorage.clear(); } catch { /* ignore */ }
                    // Clear cookies by setting them with past expiration
                    try {
                      document.cookie.split(';').forEach((c) => {
                        const name = c.split('=')[0].trim();
                        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                      });
                    } catch { /* ignore */ }
                    toast.success('Кэш очищен', {
                      description: 'Данные приложения успешно удалены. Перезагрузите страницу.',
                    });
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Очистить кэш
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 rounded-xl"
                  onClick={async () => {
                    if (!currentUser?.id) return;
                    const confirmed = window.confirm(
                      'Вы уверены? Все ваши данные, мэтчи и переписки будут удалены безвозвратно.'
                    );
                    if (!confirmed) return;

                    try {
                      const res = await fetch(`/api/account?id=${currentUser.id}`, {
                        method: 'DELETE',
                      });
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

                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 border-rose-200 dark:border-rose-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl"
                  onClick={logout}
                >
                  <LogOut className="w-4 h-4" />
                  Выйти
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ════════════ 6. О ПРИЛОЖЕНИИ ════════════════════════ */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={5}
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
                  версия 2.0.0
                </Badge>
                <p className="text-xs text-muted-foreground mt-2 max-w-[260px] mx-auto leading-relaxed">
                  Love Compass — ваш надёжный путеводитель в мире знакомств. Мы помогаем
                  находить людей, с которыми хочется общаться.
                </p>
              </div>

              {/* info cards */}
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

        {/* bottom spacing for safe-area / footer breathing room */}
        <div className="h-6" />
      </div>
    </div>
  );
}
