'use client';

import { useState, useEffect, useRef } from 'react';
import { SafeImage } from '@/components/ui/safe-image';
import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import {
  Heart, X, Star, LogOut, Edit3, MapPin, Zap, MessageSquare, Camera, Trash2, BadgeCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AVATAR_BASE_URL } from '@/lib/constants';
import { putWithCSRF, postWithCSRFFormData, deleteWithCSRFHeader } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { appLogger } from '@/lib/logger';
import { useTranslation } from '@/hooks/useTranslation';

export function ProfileView() {
  const { t } = useTranslation();
  const { currentUser, setCurrentUser, logout, likedUserIds, dislikedUserIds, superLikedUserIds, matches } = useAppStore(
    useShallow((s) => ({
      currentUser: s.currentUser,
      setCurrentUser: s.setCurrentUser,
      logout: s.logout,
      likedUserIds: s.likedUserIds,
      dislikedUserIds: s.dislikedUserIds,
      superLikedUserIds: s.superLikedUserIds,
      matches: s.matches,
    }))
  );
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [interests, setInterests] = useState('');
  const [lookingFor, setLookingFor] = useState('all');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form values with currentUser when editing
  useEffect(() => {
    if (currentUser && editing) {
      setName(currentUser.name);
      setBio(currentUser.bio);
      setCity(currentUser.city);
      setInterests(currentUser.interests);
      setLookingFor(currentUser.lookingFor);
    }
  }, [currentUser, editing]);

  const startEditing = () => {
    if (currentUser) {
      setName(currentUser.name);
      setBio(currentUser.bio);
      setCity(currentUser.city);
      setInterests(currentUser.interests);
      setLookingFor(currentUser.lookingFor);
    }
    setEditing(true);
  };

  const stopEditing = () => {
    if (currentUser) {
      setName(currentUser.name);
      setBio(currentUser.bio);
      setCity(currentUser.city);
      setInterests(currentUser.interests);
      setLookingFor(currentUser.lookingFor);
    }
    setEditing(false);
  };

  const handleSave = async () => {
    if (!currentUser) return;

    // Client-side validation
    if (!name.trim()) {
      toast.error(t('profile.nameRequired'));
      return;
    }
    if (name.trim().length > 100) {
      toast.error(t('profile.nameTooLong'));
      return;
    }
    if (bio.length > 500) {
      toast.error(t('profile.bioTooLong'));
      return;
    }
    if (city.length > 100) {
      toast.error(t('profile.cityTooLong'));
      return;
    }
    if (interests.length > 500) {
      toast.error(t('profile.interestsTooLong'));
      return;
    }

    setSaving(true);
    // Save form state for rollback
    const prevFormState = { name, bio, city, interests, lookingFor };

    try {
      const res = await putWithCSRF('/api/profile', { name, bio, city, interests, lookingFor });
      if (res.ok) {
        const updatedUser = await res.json();
        setCurrentUser(updatedUser);
        setEditing(false);
        toast.success(t('profile.saved'), {
          description: t('profile.savedDesc'),
        });
      } else {
        const data = await res.json();
        // Display server validation errors if available
        const description = data.details
          ? Array.isArray(data.details)
            ? data.details.map((d: { message: string }) => d.message).join(', ')
            : data.details
          : undefined;
        toast.error(data.error || t('profile.saveError'), { description });
        // Rollback form state to previous currentUser values
        if (currentUser) {
          setName(currentUser.name);
          setBio(currentUser.bio);
          setCity(currentUser.city);
          setInterests(currentUser.interests);
          setLookingFor(currentUser.lookingFor);
        }
      }
    } catch (error) {
      appLogger.error('profile-view.update', 'Failed to update profile', error);
      toast.error(t('profile.saveErrorGeneric'));
      // Rollback form state
      setName(prevFormState.name);
      setBio(prevFormState.bio);
      setCity(prevFormState.city);
      setInterests(prevFormState.interests);
      setLookingFor(prevFormState.lookingFor);
    }
    setSaving(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('profile.invalidFormat'), { description: t('profile.allowedFormats') });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.fileTooLarge'), { description: t('profile.maxFileSize') });
      return;
    }

    setUploading(true);
    // Save current avatar URL for rollback
    const prevAvatar = currentUser?.avatar ?? '';

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await postWithCSRFFormData('/api/profile/avatar', formData);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await res.json();
      if (currentUser) {
        setCurrentUser({ ...currentUser, avatar: data.avatar });
      }
      toast.success(t('profile.avatarUpdated'), { description: t('profile.avatarUpdatedDesc') });
    } catch (error) {
      appLogger.error('profile-view.avatar', 'Failed to upload avatar', error);
      toast.error(t('profile.avatarUploadError'), { description: t('common.retry') });
      // Rollback avatar
      if (currentUser) {
        setCurrentUser({ ...currentUser, avatar: prevAvatar });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
    setUploading(true);
    // Save current avatar URL for rollback
    const prevAvatar = currentUser?.avatar ?? '';

    try {
      const res = await deleteWithCSRFHeader('/api/profile/avatar');

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      if (currentUser) {
        setCurrentUser({ ...currentUser, avatar: '' });
      }
      toast.success(t('profile.avatarDeleted'), { description: t('profile.avatarDeletedDesc') });
    } catch (error) {
      appLogger.error('profile-view.avatar', 'Failed to delete avatar', error);
      toast.error(t('profile.avatarDeleteError'), { description: t('common.retry') });
      // Rollback avatar
      if (currentUser) {
        setCurrentUser({ ...currentUser, avatar: prevAvatar });
      }
    } finally {
      setUploading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="flex-1 px-4 py-4 md:py-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-bold text-rose-700 dark:text-rose-300 mb-6 md:mb-8">{t('profile.title')}</h2>
        <Card className="border-rose-100 dark:border-rose-900/50 shadow-lg overflow-hidden rounded-2xl mb-6 bg-card">
          <div className="relative h-48 md:h-56">
            <SafeImage src={currentUser.avatar || `${AVATAR_BASE_URL}?seed=Default`} alt={currentUser.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            {/* Avatar upload overlay */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={uploading}
            />
            <div className="absolute top-3 right-3 flex items-center gap-2">
              {currentUser.avatar && currentUser.avatar.startsWith('/uploads/avatars/') && (
                <Button
                  onClick={handleDeleteAvatar}
                  disabled={uploading}
                  variant="ghost"
                  size="icon"
                  className="bg-white/20 backdrop-blur-sm hover:bg-red-500/40 text-white rounded-full disabled:opacity-50"
                  title={t('profile.deleteAvatar')}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              )}
              <Button
                onClick={handleAvatarClick}
                disabled={uploading}
                variant="ghost"
                size="icon"
                className="bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white rounded-full disabled:opacity-50"
                title={t('profile.uploadPhoto')}
              >
                {uploading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <Edit3 className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </Button>
              <Button onClick={() => editing ? stopEditing() : startEditing()} variant="ghost" size="icon" className="bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white rounded-full">
                <Edit3 className="w-5 h-5" />
              </Button>
            </div>
            <div className="absolute bottom-4 left-4">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                {currentUser.name}, {currentUser.age}
                {currentUser.emailVerified && (
                  <BadgeCheck className="w-5 h-5 text-blue-400 drop-shadow" />
                )}
              </h3>
              {currentUser.city && (
                <div className="flex items-center gap-1 text-white/80 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{currentUser.city}</span>
                </div>
              )}
            </div>
          </div>
          {!editing ? (
            <CardContent className="p-5 space-y-4">
              {currentUser.bio && (
                <div>
                  <h4 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-1">{t('browse.detailBio')}</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{currentUser.bio}</p>
                </div>
              )}
              {currentUser.interests && (
                <div>
                  <h4 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">{t('browse.detailInterests')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentUser.interests.split(',').map((interest) => (
                      <Badge key={interest.trim()} variant="secondary" className="bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800">{interest.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <Separator className="bg-rose-100 dark:bg-rose-900/50" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{currentUser.gender === 'male' ? t('auth.male') : t('auth.female')}</span>
                <span>{t('browse.lookingFor')} {currentUser.lookingFor === 'all' ? t('browse.lookingForAll') : currentUser.lookingFor === 'male' ? t('browse.lookingForMale') : t('browse.lookingForFemale')}</span>
              </div>
            </CardContent>
          ) : (
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-rose-600 dark:text-rose-400">{t('auth.name')}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="border-rose-200 dark:border-rose-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-rose-600 dark:text-rose-400">{t('auth.city')}</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('auth.city')} className="border-rose-200 dark:border-rose-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-rose-600 dark:text-rose-400">{t('browse.detailBio')}</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="border-rose-200 dark:border-rose-800 min-h-[80px]" />
              </div>
              <div className="space-y-2">
                <Label className="text-rose-600 dark:text-rose-400">{t('browse.detailInterests')}</Label>
                <Input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder={t('profile.interestsPlaceholder')} className="border-rose-200 dark:border-rose-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-rose-600 dark:text-rose-400">{t('profile.lookingFor')}</Label>
                <Select value={lookingFor} onValueChange={setLookingFor}>
                  <SelectTrigger className="border-rose-200 dark:border-rose-800"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('browse.lookingForAll')}</SelectItem>
                    <SelectItem value="male">{t('browse.lookingForMale')}</SelectItem>
                    <SelectItem value="female">{t('browse.lookingForFemale')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button onClick={stopEditing} variant="outline" className="flex-1 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300">{t('profile.cancel')}</Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                  {saving ? t('profile.saving') : t('profile.save')}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
        <Button onClick={logout} variant="outline" className="w-full border-rose-200 dark:border-rose-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 py-5 rounded-xl">
          <LogOut className="w-4 h-4 mr-2" />{t('profile.logoutButton')}
        </Button>

        {/* Activity Statistics */}
        <Card className="border-rose-100 dark:border-rose-900/50 shadow-md rounded-2xl bg-card mt-6">
          <CardContent className="p-5">
            <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" />{t('profile.statsTitle')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold gradient-text">{likedUserIds.length}</div>
                <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <Heart className="w-3 h-3 text-rose-400" />{t('profile.statsLikes')}
                </div>
              </div>
              <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold gradient-text">{matches.length}</div>
                <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <MessageSquare className="w-3 h-3 text-rose-400" />{t('profile.statsMatches')}
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-blue-500">{superLikedUserIds.length}</div>
                <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-blue-400" />{t('profile.statsSuperLikes')}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-gray-500">{dislikedUserIds.length}</div>
                <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <X className="w-3 h-3 text-gray-400" />{t('profile.statsViewed')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
