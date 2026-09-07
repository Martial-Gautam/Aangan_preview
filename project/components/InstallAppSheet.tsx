'use client';

import { Download, Network, Images, MessageCircle, ShieldCheck } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { useAppInstall } from '@/hooks/useAppInstall';

interface InstallAppSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Passed in rather than called here so the page and this dialog share one
   * instance instead of detecting the platform twice.
   */
  appInstall: ReturnType<typeof useAppInstall>;
}

const HIGHLIGHTS = [
  { icon: Network, label: 'Family Graph' },
  { icon: Images, label: 'Memories' },
  { icon: MessageCircle, label: 'Messages' },
];

export default function InstallAppSheet({ open, onOpenChange, appInstall }: InstallAppSheetProps) {
  const { isAndroid, isIOS, download, rememberDismissal } = appInstall;

  const handleDownload = () => {
    download();
    onOpenChange(false);
  };

  const handleDismiss = () => {
    rememberDismissal();
    onOpenChange(false);
  };

  const footnote = isAndroid
    ? 'Open the file once it downloads. Android may ask you to allow installs from your browser.'
    : isIOS
      ? 'This is an Android app file — it will download, but installs only on Android.'
      : 'This is the Android app file. Download it, then move it to your Android device.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-[380px] p-0 gap-0 border border-white/10 rounded-[28px] overflow-hidden shadow-[0_32px_80px_-12px_rgba(0,0,0,0.6)] [&>button]:text-white/50 [&>button]:hover:text-white [&>button]:top-5 [&>button]:right-5 [&>button]:opacity-100"
        style={{
          background:
            'radial-gradient(120% 100% at 50% 0%, #16324f 0%, #0c1e33 42%, #07121e 100%)',
        }}
      >
        {/* Warm accent wash, echoing the landing hero */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70"
          style={{
            background:
              'radial-gradient(60% 100% at 50% 0%, rgba(255,217,143,0.18) 0%, rgba(255,217,143,0) 70%)',
          }}
        />

        <div className="relative px-7 pt-9 pb-7">
          {/* App icon */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div
                className="absolute -inset-3 rounded-[26px] blur-xl opacity-50"
                style={{ background: 'radial-gradient(circle, rgba(255,217,143,0.45), transparent 70%)' }}
              />
              <div className="relative w-[68px] h-[68px] rounded-[20px] bg-white/[0.07] border border-white/15 backdrop-blur-md flex items-center justify-center shadow-lg shadow-black/40">
                <BrandLogo size={40} />
              </div>
            </div>
          </div>

          <DialogHeader className="space-y-0 text-center">
            <DialogTitle className="brand-wordmark text-[26px] leading-tight text-white font-normal tracking-normal">
              Get Familiar
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-relaxed text-white/60 mt-2 px-1">
              Your family graph, memories and messages — faster and smoother in the app.
            </DialogDescription>
          </DialogHeader>

          {/* Highlight chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-5">
            {HIGHLIGHTS.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-semibold text-white/75"
              >
                <item.icon size={12} className="text-[#ffd98f]" />
                {item.label}
              </span>
            ))}
          </div>

          {/* Primary CTA */}
          <button
            onClick={handleDownload}
            className="group w-full mt-6 py-4 rounded-2xl bg-white text-[#0c1e33] text-[15px] font-bold flex items-center justify-center gap-2 shadow-xl shadow-black/25 hover:bg-[#fff6df] active:scale-[0.98] transition-all"
          >
            <Download size={17} className="transition-transform group-hover:translate-y-0.5" />
            Download the App
          </button>

          {/* File meta */}
          <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
            Android · APK · 103 MB
          </p>

          <button
            onClick={handleDismiss}
            className="w-full mt-4 py-2 text-[13px] font-medium text-white/45 hover:text-white/75 transition-colors"
          >
            Maybe later
          </button>

          {/* Footnote */}
          <div className="mt-5 pt-4 border-t border-white/8 flex items-start gap-2">
            <ShieldCheck size={13} className="text-white/30 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] leading-relaxed text-white/40">{footnote}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
