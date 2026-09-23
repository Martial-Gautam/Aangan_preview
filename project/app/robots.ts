import type { MetadataRoute } from 'next';

// Only the public pages are worth indexing. Everything under the app needs a
// session and would just be crawled as an empty shell.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/privacy', '/terms', '/delete-account', '/screenshots/', '/og.png'],
      disallow: ['/api/', '/home', '/feed', '/messages', '/memories', '/profile', '/stats', '/onboarding', '/notifications', '/add-member', '/edit-member/', '/import-contacts', '/download', '/j/'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://apney.vercel.app'}/sitemap.xml`,
  };
}
