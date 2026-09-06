'use client';

import { Download, Share, Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { useAppInstall } from '@/hooks/useAppInstall';

interface InstallAppSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Passed in rather than called here so the home page and this sheet share
   * one install state instead of tracking the PWA prompt twice.
   */
  appInstall: ReturnType<typeof useAppInstall>;
}

export default function InstallAppSheet({ open, onOpenChange, appInstall }: InstallAppSheetProps) {
  const { platform, isAndroid, isInstalled, canInstall, hint, install, rememberDismissal } = appInstall;

  const handleInstall = async () => {
    const shouldClose = await install();
    if (shouldClose) onOpenChange(false);
  };

  const handleDismiss = () => {
    rememberDismissal();
    onOpenChange(false);
  };

  const title = isAndroid ? 'Get Familiar for Android' : 'Install Familiar for the best experience';

  const body = isAndroid
    ? 'Download the Android app for a smoother, faster family and messaging experience.'
    : 'Familiar works better when installed. Add it to your home screen for a smoother, faster family and messaging experience.';

  const buttonLabel = isInstalled
    ? 'Installed'
    : isAndroid
      ? 'Download for Android'
      : canInstall
        ? 'Install Now'
        : 'Show Install Steps';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-4 max-h-[80vh]">
        <SheetHeader className="sr-only">
          <SheetTitle>Install Familiar</SheetTitle>
        </SheetHeader>
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">{body}</p>

          {isAndroid && !isInstalled && (
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              Once the download finishes, open the file to install. Android may ask you to allow
              installs from your browser the first time.
            </p>
          )}

          {/* iOS has no install prompt API, so the steps are always spelled out. */}
          {platform === 'ios' && !isInstalled && (
            <div className="mt-4 space-y-2 rounded-2xl bg-gray-50 border border-gray-100 p-3.5">
              <p className="flex items-center gap-2 text-xs text-gray-600">
                <Share size={13} className="text-[#2A4365] flex-shrink-0" />
                Tap the Share button in Safari
              </p>
              <p className="flex items-center gap-2 text-xs text-gray-600">
                <Plus size={13} className="text-[#2A4365] flex-shrink-0" />
                Choose &quot;Add to Home Screen&quot;
              </p>
            </div>
          )}

          {platform === 'desktop' && !canInstall && !isInstalled && (
            <p className="text-xs text-gray-400 mt-2">
              If the install prompt does not open, use your browser menu and choose
              &quot;Install app&quot;.
            </p>
          )}

          {hint && <p className="text-xs text-[#2A4365] mt-3 font-medium">{hint}</p>}
        </div>

        <div className="space-y-2">
          <button
            onClick={handleInstall}
            disabled={isInstalled}
            className="w-full py-3.5 rounded-2xl bg-[#2A4365] hover:bg-[#2A4365]/90 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={16} />
            {buttonLabel}
          </button>
          <button onClick={handleDismiss} className="w-full py-3 text-sm text-gray-500 font-medium">
            Maybe later
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
