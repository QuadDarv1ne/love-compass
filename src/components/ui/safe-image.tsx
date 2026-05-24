'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

type SafeImageProps = Omit<ImageProps, 'onError'> & {
  fallbackClassName?: string;
};

/**
 * Next.js Image wrapper that handles loading errors gracefully.
 * Falls back to Avatar fallback when image fails to load.
 */
export function SafeImage({
  fallbackClassName = 'bg-muted flex items-center justify-center',
  alt,
  className,
  ...imageProps
}: SafeImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`w-full h-full ${fallbackClassName}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="w-8 h-8 mx-auto text-muted-foreground/50"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
    );
  }

  return (
    <Image
      alt={alt}
      className={className}
      onError={() => setError(true)}
      {...imageProps}
    />
  );
}
