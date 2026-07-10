import { Heart } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';

export default function TwoFAVerifyLoading() {
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
        <div className="bg-card rounded-2xl shadow-xl p-6 border border-border space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="text-center">
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
