import { Heart } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';

export default function RegisterLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Heart className="w-8 h-8 text-rose-500" fill="currentColor" />
            <span className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
              Love Compass
            </span>
          </div>
          <Skeleton className="h-7 w-40 mx-auto mt-3" />
          <Skeleton className="h-4 w-56 mx-auto mt-2" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700 space-y-4">
          <div className="flex gap-2 justify-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-12 h-12 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Skeleton className="h-4 w-12" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-12" /><Skeleton className="h-10 w-full" /></div>
          </div>
          <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Skeleton className="h-4 w-8" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
