import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans, Bricolage_Grotesque } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import OfflineBanner from '@/components/OfflineBanner';
import { QueryProvider } from '@/lib/query-provider';
import ErrorBoundary from '@/components/ErrorBoundary';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['700', '800'],
  display: 'swap',
  variable: '--font-brand',
});

// The headline face the app's store frames are set in, so the landing page
// and its screenshots read as one product.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
  variable: '--font-display',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F9FA' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0F19' },
  ],
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aangan-preview.vercel.app';
const TITLE = 'Apney — Your family tree, on one map';
const DESCRIPTION =
  'A private family app for Indian families. See everyone you are related to on one map, know exactly how — Bhatiji, Chachera bhai, Nani — and share posts, events and photos only your family can see. Free Android app, no ads.';

export const metadata: Metadata = {
  // A fixed base, not VERCEL_URL: that is the per-deployment hostname, which
  // would make every canonical and social-preview URL point at a throwaway domain.
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s — Apney' },
  description: DESCRIPTION,
  keywords: ['family tree app', 'Indian family app', 'family graph', 'kinship', 'private family network', 'family photos app', 'Apney', 'Aangan'],
  alternates: { canonical: '/' },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Apney' },
  robots: { index: true, follow: true },
  verification: { google: '1TyXN2wMdBSOt7HzzaCUoF5kXDmQj0bMMwui8fH_3Lk' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'Apney',
    url: '/',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Apney — everyone you are related to, on one map' }],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="apple-touch-icon" href="/icons/familiar-icon-192.webp" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} ${plusJakarta.variable} ${bricolage.variable}`}>
        <ErrorBoundary>
          <OfflineBanner />
          <QueryProvider>
            <AuthProvider>
              <ServiceWorkerRegister />
              {children}
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
