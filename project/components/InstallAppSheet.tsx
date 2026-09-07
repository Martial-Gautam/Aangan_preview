'use client';

import { Download } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { useAppInstall } from '@/hooks/useAppInstall';

interface InstallAppSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Passed in rather than called here so the page and this sheet share one
   * instance instead of detecting the platform twice.
   */
  appInstall: ReturnType<typeof useAppInstall>;
}

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-4 max-h-[80vh]">
        <SheetHeader className="sr-only">
          <SheetTitle>Download Familiar</SheetTitle>
        </SheetHeader>
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Get the Familiar app</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Download the Android app for a smoother, faster family and messaging experience.
          </p>

          {isAndroid && (
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              Once the download finishes, open the file to install. Android may ask you to allow
              installs from your browser the first time.
            </p>
          )}

          {/* An APK cannot be installed on iOS or desktop — say so rather than
              letting the download look broken. */}
          {isIOS && (
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              Heads up: this is an Android app file. It will download, but it can only be installed
              on an Android device.
            </p>
          )}

          {!isAndroid && !isIOS && (
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              This is the Android app file. Download it here, then move it to your Android device to
              install.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={handleDownload}
            className="w-full py-3.5 rounded-2xl bg-[#2A4365] hover:bg-[#2A4365]/90 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={16} />
            Download the App
          </button>
          <button onClick={handleDismiss} className="w-full py-3 text-sm text-gray-500 font-medium">
            Maybe later
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
