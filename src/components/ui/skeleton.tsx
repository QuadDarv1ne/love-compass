import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-rose-100/70 dark:bg-rose-900/30',
        className
      )}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-rose-100 dark:border-rose-900/50 bg-card overflow-hidden shadow-sm">
      <Skeleton className="aspect-[3/4] rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };
  return (
    <div className={cn('rounded-full', sizeClasses[size])}>
      <Skeleton className={cn('rounded-full', sizeClasses[size])} />
    </div>
  );
}

export function SkeletonText({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: `${100 - i * 20}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonProfileCard() {
  return (
    <div className="w-full max-w-sm md:max-w-md relative">
      <div className="rounded-3xl border-0 overflow-hidden shadow-2xl bg-card">
        <Skeleton className="aspect-[3/4] rounded-3xl" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonMatchCard() {
  return (
    <div className="rounded-2xl border border-rose-100 dark:border-rose-900/50 bg-card overflow-hidden shadow-md">
      <Skeleton className="aspect-square rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonChatBubble({ isMine = false }: { isMine?: boolean }) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <Skeleton
        className={cn(
          'h-10 rounded-2xl',
          isMine ? 'w-2/3' : 'w-1/2'
        )}
      />
    </div>
  );
}

export default Skeleton;
