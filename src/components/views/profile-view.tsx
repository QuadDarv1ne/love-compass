'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Heart, X, Star, LogOut, Edit3, MapPin, Zap, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';

export function ProfileView() {
  const { currentUser, setCurrentUser, logout, likedUserIds, dislikedUserIds, superLikedUserIds, matches } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [interests, setInterests] = useState('');
  const [lookingFor, setLookingFor] = useState('all');

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
    setEditing(false);
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/profile?id=${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio, city, interests, lookingFor }),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setCurrentUser(updatedUser);
        stopEditing();
        toast.success('Профиль сохранён!', {
          description: 'Изменения успешно применены',
        });
      }
    } catch { console.error('Failed to update profile'); }
    setSaving(false);
  };

  if (!currentUser) return null;

  return (
    <div className="flex-1 px-4 py-4 md:py-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-bold text-rose-700 dark:text-rose-300 mb-6 md:mb-8">Мой профиль</h2>
        <Card className="border-rose-100 dark:border-rose-900/50 shadow-lg overflow-hidden rounded-2xl mb-6 bg-card">
          <div className="relative h-48 md:h-56">
            <Image src={currentUser.avatar || 'https://api.dicebear.com/9.x/notionists/svg?seed=Default'} alt={currentUser.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <h3 className="text-2xl font-bold text-white">{currentUser.name}, {currentUser.age}</h3>
              {currentUser.city && (
                <div className="flex items-center gap-1 text-white/80 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{currentUser.city}</span>
                </div>
              )}
            </div>
            <Button onClick={() => editing ? stopEditing() : startEditing()} variant="ghost" size="icon" className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white rounded-full">
              <Edit3 className="w-5 h-5" />
            </Button>
          </div>
          {!editing ? (
            <CardContent className="p-5 space-y-4">
              {currentUser.bio && (
                <div>
                  <h4 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-1">О себе</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{currentUser.bio}</p>
                </div>
              )}
              {currentUser.interests && (
                <div>
                  <h4 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">Интересы</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentUser.interests.split(',').map((interest) => (
                      <Badge key={interest.trim()} variant="secondary" className="bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800">{interest.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <Separator className="bg-rose-100 dark:bg-rose-900/50" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{currentUser.gender === 'male' ? 'Мужчина' : 'Женщина'}</span>
                <span>Ищу: {currentUser.lookingFor === 'all' ? 'Всех' : currentUser.lookingFor === 'male' ? 'Мужчин' : 'Женщин'}</span>
              </div>
            </CardContent>
          ) : (
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-rose-600 dark:text-rose-400">Имя</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="border-rose-200 dark:border-rose-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-rose-600 dark:text-rose-400">Город</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Город" className="border-rose-200 dark:border-rose-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-rose-600 dark:text-rose-400">О себе</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="border-rose-200 dark:border-rose-800 min-h-[80px]" />
              </div>
              <div className="space-y-2">
                <Label className="text-rose-600 dark:text-rose-400">Интересы</Label>
                <Input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="через запятую" className="border-rose-200 dark:border-rose-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-rose-600 dark:text-rose-400">Ищу</Label>
                <Select value={lookingFor} onValueChange={setLookingFor}>
                  <SelectTrigger className="border-rose-200 dark:border-rose-800"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Всех</SelectItem>
                    <SelectItem value="male">Мужчин</SelectItem>
                    <SelectItem value="female">Женщин</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button onClick={stopEditing} variant="outline" className="flex-1 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300">Отмена</Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
        <Button onClick={logout} variant="outline" className="w-full border-rose-200 dark:border-rose-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 py-5 rounded-xl">
          <LogOut className="w-4 h-4 mr-2" />Выйти из аккаунта
        </Button>

        {/* Activity Statistics */}
        <Card className="border-rose-100 dark:border-rose-900/50 shadow-md rounded-2xl bg-card mt-6">
          <CardContent className="p-5">
            <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" />Статистика активности
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold gradient-text">{likedUserIds.length}</div>
                <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <Heart className="w-3 h-3 text-rose-400" />Лайков
                </div>
              </div>
              <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold gradient-text">{matches.length}</div>
                <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <MessageSquare className="w-3 h-3 text-rose-400" />Мэтчей
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-blue-500">{superLikedUserIds.length}</div>
                <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-blue-400" />Суперлайков
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-gray-500">{dislikedUserIds.length}</div>
                <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <X className="w-3 h-3 text-gray-400" />Просмотрено
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
