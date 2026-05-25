'use client';

import { useState, useRef } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { fetchWithCSRF, deleteWithCSRF } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { UPLOAD } from '@/lib/constants';

interface AvatarUploadProps {
  currentAvatar: string;
  userId: string;
  userName: string;
}

export function AvatarUpload({ currentAvatar, userId: _userId, userName }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refreshUser } = useAppStore();

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Выберите изображение');
      return;
    }

    if (file.size > UPLOAD.MAX_FILE_SIZE) {
      toast.error(`Файл слишком большой (макс. ${UPLOAD.MAX_FILE_SIZE / (1024 * 1024)}MB)`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetchWithCSRF('/api/profile/avatar', formData);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      toast.success('Аватар обновлён');
      await refreshUser();
    } catch {
      toast.error('Ошибка при загрузке');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      const res = await deleteWithCSRF('/api/profile/avatar', {});
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
        return;
      }
      toast.success('Аватар удалён');
      await refreshUser();
    } catch {
      toast.error('Ошибка при удалении');
    } finally {
      setUploading(false);
    }
  };

  const avatarSrc = currentAvatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(userName)}&backgroundColor=ffd5dc`;
  const isCustomAvatar = currentAvatar && currentAvatar.startsWith('/uploads/');

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-rose-200 dark:border-rose-800 shadow-lg">
          <img
            src={avatarSrc}
            alt={userName}
            className="w-full h-full object-cover"
          />
        </div>

        {uploading ? (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        ) : (
          <button
            onClick={handleClick}
            className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            disabled={uploading}
          >
            <Camera className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={uploading}
          className="border-rose-200 text-rose-600 hover:bg-rose-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Изменить'}
        </Button>

        {isCustomAvatar && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
            className="border-destructive text-destructive hover:bg-destructive/10"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
