'use client';

import { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import {
  Users, Activity, Heart, MessageSquare,
  Search as SearchIcon, ChevronLeft, ChevronRight, Shield, Eye, EyeOff,
  Trash2, UserCog, TrendingUp, BadgeCheck,
} from 'lucide-react';
import { AVATAR_BASE_URL } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore, type PlatformStats, type AdminUser } from '@/lib/store';
import { useTranslation } from '@/hooks/useTranslation';
import { useConfirm } from '@/components/ui/confirm-dialog';

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.02 }}>
      <Card className="border-rose-100 dark:border-rose-900/50 shadow-md rounded-2xl bg-card overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold gradient-text">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function GenderChart({ stats }: { stats: PlatformStats }) {
  const { t } = useTranslation();
  const total = stats.maleCount + stats.femaleCount + stats.otherCount || 1;
  const malePct = (stats.maleCount / total) * 100;
  const femalePct = (stats.femaleCount / total) * 100;
  const otherPct = (stats.otherCount / total) * 100;

  return (
    <Card className="border-rose-100 dark:border-rose-900/50 shadow-md rounded-2xl bg-card">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> {t('admin.genderDistribution')}
        </h3>
        <div className="h-4 rounded-full bg-rose-100 dark:bg-rose-900/30 flex overflow-hidden">
          {malePct > 0 && (
            <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${malePct}%` }} title={`${t('admin.male')}: ${stats.maleCount}`} />
          )}
          {femalePct > 0 && (
            <div className="h-full bg-rose-400 transition-all duration-500" style={{ width: `${femalePct}%` }} title={`${t('admin.female')}: ${stats.femaleCount}`} />
          )}
          {otherPct > 0 && (
            <div className="h-full bg-purple-400 transition-all duration-500" style={{ width: `${otherPct}%` }} title={`${t('admin.other')}: ${stats.otherCount}`} />
          )}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> {t('admin.male')}: {stats.maleCount}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> {t('admin.female')}: {stats.femaleCount}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> {t('admin.other')}: {stats.otherCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityBars({ stats }: { stats: PlatformStats }) {
  const { t } = useTranslation();
  const maxVal = Math.max(stats.newUsersToday, stats.newUsersThisWeek, stats.activeUsers, stats.totalMatches, stats.totalMessages, 1);
  const items = [
    { label: t('admin.newToday'), value: stats.newUsersToday, color: 'bg-emerald-400' },
    { label: t('admin.newWeek'), value: stats.newUsersThisWeek, color: 'bg-teal-400' },
    { label: t('admin.active'), value: stats.activeUsers, color: 'bg-blue-400' },
    { label: t('admin.matches'), value: stats.totalMatches, color: 'bg-rose-400' },
    { label: t('admin.messages'), value: stats.totalMessages, color: 'bg-violet-400' },
  ];

  return (
    <Card className="border-rose-100 dark:border-rose-900/50 shadow-md rounded-2xl bg-card">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> {t('admin.activityOverview')}
        </h3>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{item.label}</span>
              <div className="flex-1 h-3 rounded-full bg-rose-100 dark:bg-rose-900/30 overflow-hidden">
                <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${(item.value / maxVal) * 100}%` }} />
              </div>
              <span className="text-xs font-semibold w-12 text-right text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminView() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const {
    adminUsers, adminStats, adminLoading, adminTotal, adminPage, adminLimit,
    adminFilterGender, adminSearchQuery,
    setAdminSearchQuery, setAdminFilterGender, setAdminPage,
    fetchAdminData, deleteUser, toggleUserRole, toggleUserProfileVisible,
  } = useAppStore(
    useShallow((s) => ({
      adminUsers: s.adminUsers,
      adminStats: s.adminStats,
      adminLoading: s.adminLoading,
      adminTotal: s.adminTotal,
      adminPage: s.adminPage,
      adminLimit: s.adminLimit,
      adminFilterGender: s.adminFilterGender,
      adminSearchQuery: s.adminSearchQuery,
      setAdminSearchQuery: s.setAdminSearchQuery,
      setAdminFilterGender: s.setAdminFilterGender,
      setAdminPage: s.setAdminPage,
      fetchAdminData: s.fetchAdminData,
      deleteUser: s.deleteUser,
      toggleUserRole: s.toggleUserRole,
      toggleUserProfileVisible: s.toggleUserProfileVisible,
    }))
  );

  const totalPages = Math.max(1, Math.ceil(adminTotal / adminLimit));

  const handleSearchChange = useCallback((value: string) => {
    setAdminSearchQuery(value);
  }, [setAdminSearchQuery]);

  const handleGenderChange = useCallback((value: string) => {
    setAdminFilterGender(value as 'all' | 'male' | 'female' | 'other');
  }, [setAdminFilterGender]);

  useEffect(() => {
    fetchAdminData();
  }, [adminPage, adminFilterGender, adminSearchQuery, fetchAdminData]);

  return (
    <div className="flex-1 px-4 py-4 md:py-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-6">
        <h2 className="text-xl font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <Shield className="w-5 h-5" /> {t('admin.title')}
        </h2>

        {/* Stats section */}
        {adminStats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Users} label={t('admin.totalUsers')} value={adminStats.totalUsers} color="bg-blue-500" />
              <StatCard icon={Activity} label={t('admin.activeToday')} value={adminStats.activeUsers} color="bg-emerald-500" />
              <StatCard icon={Heart} label={t('admin.totalMatches')} value={adminStats.totalMatches} color="bg-rose-500" />
              <StatCard icon={MessageSquare} label={t('admin.totalMessages')} value={adminStats.totalMessages} color="bg-violet-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <GenderChart stats={adminStats} />
              <ActivityBars stats={adminStats} />
            </div>
          </>
        )}

        {adminLoading && !adminStats && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin" />
          </div>
        )}

        {/* User management section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={adminSearchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t('admin.search')}
                className="pl-9 border-rose-200 dark:border-rose-800 focus:border-rose-400"
              />
            </div>
            <Select value={adminFilterGender} onValueChange={handleGenderChange}>
              <SelectTrigger className="w-full sm:w-40 border-rose-200 dark:border-rose-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.allGenders')}</SelectItem>
                <SelectItem value="male">{t('auth.male')}</SelectItem>
                <SelectItem value="female">{t('auth.female')}</SelectItem>
                <SelectItem value="other">{t('register.genderOther')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {adminLoading && (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin" />
            </div>
          )}

          {!adminLoading && adminUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-rose-200 dark:text-rose-800 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{t('admin.noUsersFound')}</p>
            </div>
          )}

          {!adminLoading && adminUsers.length > 0 && (
            <>
              <div className="space-y-2">
                {adminUsers.map((user: AdminUser) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-rose-100 dark:border-rose-900/50 bg-card hover:shadow-md transition-shadow"
                  >
                    <Avatar className="h-10 w-10 border-2 border-rose-200 dark:border-rose-800 flex-shrink-0">
                      <AvatarImage src={user.avatar || `${AVATAR_BASE_URL}?seed=Default`} alt={user.name} />
                      <AvatarFallback className="bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-300 text-xs">{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground truncate">{user.name}</span>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className={`text-[10px] px-1.5 py-0 ${user.role === 'admin' ? 'bg-rose-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                          {user.role}
                        </Badge>
                        {user.emailVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{user.email} &middot; {user.age} &middot; {user.city || '—'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleUserRole(user.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        title={user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                        aria-label={user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                      >
                        <UserCog className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleUserProfileVisible(user.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                        title={user.profileVisible ? 'Hide profile' : 'Show profile'}
                        aria-label={user.profileVisible ? 'Hide profile' : 'Show profile'}
                      >
                        {user.profileVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: t('admin.deleteUser'),
                            message: t('admin.deleteUserConfirm'),
                            confirmLabel: t('common.confirm'),
                            cancelLabel: t('common.cancel'),
                            variant: 'destructive',
                          });
                          if (confirmed) deleteUser(user.id);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title={t('admin.deleteUser')}
                        aria-label={t('admin.deleteUser')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAdminPage(Math.max(1, adminPage - 1))}
                    disabled={adminPage <= 1}
                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                    aria-label={t('common.previousPage')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {adminPage} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAdminPage(Math.min(totalPages, adminPage + 1))}
                    disabled={adminPage >= totalPages}
                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                    aria-label={t('common.nextPage')}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
