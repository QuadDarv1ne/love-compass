import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages = [
    { url: BASE_URL, priority: 1, changeFrequency: 'daily' as const },
    { url: `${BASE_URL}/login`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${BASE_URL}/register`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${BASE_URL}/forgot-password`, priority: 0.3, changeFrequency: 'monthly' as const },
    { url: `${BASE_URL}/reset-password`, priority: 0.3, changeFrequency: 'monthly' as const },
    { url: `${BASE_URL}/verify-email`, priority: 0.3, changeFrequency: 'monthly' as const },
    { url: `${BASE_URL}/verify-email-pending`, priority: 0.3, changeFrequency: 'monthly' as const },
    { url: `${BASE_URL}/2fa-verify`, priority: 0.3, changeFrequency: 'monthly' as const },
  ];

  return pages.map((page) => ({ ...page, lastModified: now }));
}
