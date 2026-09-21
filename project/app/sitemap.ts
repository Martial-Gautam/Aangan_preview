import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://apney.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date('2026-09-06'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date('2026-09-06'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/delete-account`, lastModified: new Date('2026-09-22'), changeFrequency: 'yearly', priority: 0.3 },
  ];
}
