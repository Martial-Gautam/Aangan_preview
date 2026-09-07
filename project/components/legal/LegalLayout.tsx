import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import Footer from '@/components/Footer';

interface LegalLayoutProps {
  title: string;
  /** Human-readable date, e.g. "6 September 2026". */
  lastUpdated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared chrome and typography for the legal pages. Prose styles are applied
 * with descendant selectors so the page bodies stay readable semantic HTML
 * instead of carrying a class on every element.
 */
export default function LegalLayout({ title, lastUpdated, intro, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Header */}
      <header className="border-b border-gray-200/70 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <BrandLogo size={22} />
            <span className="brand-wordmark text-lg text-gray-900">Familiar</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-[#2A4365] transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>
      </header>

      {/* Title block */}
      <div className="max-w-3xl mx-auto px-5 pt-12 pb-8">
        <span className="inline-block text-[10px] font-bold uppercase tracking-[0.18em] text-[#2A4365] bg-[#2A4365]/8 rounded-full px-3 py-1.5 mb-4">
          Last updated {lastUpdated}
        </span>
        <h1 className="text-[34px] sm:text-[42px] font-bold text-gray-900 leading-[1.1] tracking-tight mb-4">
          {title}
        </h1>
        <div className="text-[15px] leading-relaxed text-gray-500 space-y-3">{intro}</div>
      </div>

      {/* Body */}
      <main className="max-w-3xl mx-auto px-5 pb-20">
        <div
          className="
            rounded-3xl bg-white border border-gray-200/70 shadow-sm px-6 sm:px-9 py-9
            text-[15px] leading-[1.75] text-gray-600
            [&_h2]:text-[21px] [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:tracking-tight
            [&_h2]:mt-11 [&_h2]:mb-4 [&_h2]:scroll-mt-20 [&_h2:first-child]:mt-0
            [&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:text-gray-800 [&_h3]:mt-7 [&_h3]:mb-2.5
            [&_p]:mb-4
            [&_strong]:font-semibold [&_strong]:text-gray-900
            [&_ul]:mb-5 [&_ul]:space-y-2.5 [&_ul]:pl-0 [&_ul]:list-none
            [&_li]:relative [&_li]:pl-6
            [&_li]:before:absolute [&_li]:before:left-1.5 [&_li]:before:top-[0.62em]
            [&_li]:before:w-1.5 [&_li]:before:h-1.5 [&_li]:before:rounded-full
            [&_li]:before:bg-[#2A4365]/25
            [&_a]:text-[#2A4365] [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2
            [&_a:hover]:text-[#2A4365]/75
            [&_hr]:my-10 [&_hr]:border-gray-200/80
          "
        >
          {children}
        </div>
      </main>

      <Footer variant="app" />
    </div>
  );
}
