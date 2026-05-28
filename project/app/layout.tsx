import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import { QueryProvider } from '@/lib/query-provider';

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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F9FA' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0F19' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  ),
  title: 'Familiar — Your Family Tree',
  description: 'Connect with your family. Build your tree. Cherish your roots.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Familiar',
  },
  openGraph: {
    title: 'Familiar — Your Family Tree',
    description: 'Connect with your family. Build your tree. Cherish your roots.',
    siteName: 'Familiar',
    images: [
      {
        url: '/brand/familiar-logo.png',
        width: 1200,
        height: 630,
        alt: 'Familiar Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Familiar — Your Family Tree',
    description: 'Connect with your family. Build your tree. Cherish your roots.',
    images: ['/brand/familiar-logo.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/familiar-icon-192.webp" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} ${plusJakarta.variable}`}>
        <QueryProvider>
          <AuthProvider>
            <ServiceWorkerRegister />
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
