import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL;
if (!BASE_URL && process.env.NODE_ENV === 'production') {
  throw new Error('NEXT_PUBLIC_APP_URL is required in production');
}
const resolvedBaseUrl = BASE_URL || 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages = [
    { url: resolvedBaseUrl, priority: 1, changeFrequency: 'daily' as const },
    { url: `${resolvedBaseUrl}/login`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${resolvedBaseUrl}/register`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${resolvedBaseUrl}/forgot-password`, priority: 0.3, changeFrequency: 'monthly' as const },
    { url: `${resolvedBaseUrl}/reset-password`, priority: 0.3, changeFrequency: 'monthly' as const },
    { url: `${resolvedBaseUrl}/verify-email`, priority: 0.3, changeFrequency: 'monthly' as const },
    { url: `${resolvedBaseUrl}/verify-email-pending`, priority: 0.3, changeFrequency: 'monthly' as const },
    { url: `${resolvedBaseUrl}/2fa-verify`, priority: 0.3, changeFrequency: 'monthly' as const },
  ];

  return pages.map((page) => ({ ...page, lastModified: now }));
}
