'use client';

import { useState, useCallback, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MessageSquare, Mail, Copy, Check, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Types ───────────────────────────────────────────────────

interface ShareInviteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personName?: string;
  shareMessage?: string;
}

// ─── Constants ───────────────────────────────────────────────

const APP_URL = 'https://aangan-preview.vercel.app/';

function getShareText(personName?: string): string {
  if (personName) {
    return `Hey! I've added you as family on Familiar. Join the app to connect with our family tree! 🌳\n\n${APP_URL}`;
  }
  return `Join me on Familiar — the app that connects families! 🌳\n\n${APP_URL}`;
}

// ─── Inline SVG Icons ────────────────────────────────────────

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.96 6.504-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

// ─── Share Option Config ─────────────────────────────────────

interface ShareOption {
  id: string;
  label: string;
  bgColor: string;
  icon: React.ReactNode;
  action: (shareText: string) => void | Promise<void>;
}

// ─── Component ───────────────────────────────────────────────

export function ShareInviteSheet({
  open,
  onOpenChange,
  personName,
  shareMessage,
}: ShareInviteSheetProps) {
  const [copied, setCopied] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);

  const shareText = useMemo(() => {
    if (shareMessage) return `${shareMessage}\n\n${APP_URL}`;
    return getShareText(personName);
  }, [personName, shareMessage]);

  const title = personName ? `Invite ${personName}` : 'Invite to Familiar';

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = APP_URL;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const handleCopyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setMessageCopied(true);
      setTimeout(() => setMessageCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setMessageCopied(true);
      setTimeout(() => setMessageCopied(false), 2000);
    }
  }, [shareText]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join Familiar',
          text: shareText,
          url: APP_URL,
        });
      } catch {
        // User cancelled or share failed — no action needed
      }
    }
  }, [shareText]);

  const shareOptions: ShareOption[] = useMemo(() => {
    const encoded = encodeURIComponent(shareText);
    return [
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        bgColor: 'bg-[#25D366]',
        icon: <WhatsAppIcon className="w-5 h-5 text-white" />,
        action: () => window.open(`https://wa.me/?text=${encoded}`, '_blank'),
      },
      {
        id: 'messages',
        label: 'Messages',
        bgColor: 'bg-[#3B82F6]',
        icon: <MessageSquare size={20} className="text-white" />,
        action: () => window.open(`sms:?body=${encoded}`, '_self'),
      },
      {
        id: 'telegram',
        label: 'Telegram',
        bgColor: 'bg-[#26A5E4]',
        icon: <TelegramIcon className="w-5 h-5 text-white" />,
        action: () => {
          const textOnly = shareText.replace(`\n\n${APP_URL}`, '');
          window.open(
            `https://t.me/share/url?url=${encodeURIComponent(APP_URL)}&text=${encodeURIComponent(textOnly)}`,
            '_blank'
          );
        },
      },
      {
        id: 'email',
        label: 'Email',
        bgColor: 'bg-[#EA4335]',
        icon: <Mail size={20} className="text-white" />,
        action: () =>
          window.open(
            `mailto:?subject=${encodeURIComponent('Join Familiar')}&body=${encoded}`,
            '_self'
          ),
      },
      {
        id: 'copy',
        label: copied ? 'Copied!' : 'Copy Link',
        bgColor: copied ? 'bg-emerald-500' : 'bg-gray-500',
        icon: copied ? (
          <Check size={20} className="text-white" />
        ) : (
          <Copy size={20} className="text-white" />
        ),
        action: () => handleCopyLink(),
      },
      {
        id: 'more',
        label: 'More...',
        bgColor: 'bg-[#4F46E5]',
        icon: <Share2 size={20} className="text-white" />,
        action: () => handleNativeShare(),
      },
    ];
  }, [shareText, copied, handleCopyLink, handleNativeShare]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-4 max-h-[80vh] overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        {/* Drag handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#2A4365] to-[#2A4365]/80 flex items-center justify-center shadow-lg shadow-[#2A4365]/20">
              <Share2 size={24} className="text-white" />
            </div>
          </motion.div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Share the app so they can join your family tree
          </p>
        </div>

        {/* Share options grid */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {shareOptions.map((option, index) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.25, ease: 'easeOut' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => option.action(shareText)}
              className="flex flex-col items-center gap-1.5 py-2"
            >
              <div
                className={`w-12 h-12 rounded-full ${option.bgColor} flex items-center justify-center shadow-md transition-shadow hover:shadow-lg`}
              >
                {option.icon}
              </div>
              <span className="text-[11px] font-medium text-gray-700">
                {option.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200/60 mb-5" />

        {/* Copy invite message section */}
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-3">
            Invite Message
          </h3>

          <div className="relative bg-gray-50/80 backdrop-blur-sm border border-gray-200/40 rounded-2xl p-4">
            <p className="text-sm text-gray-700 leading-relaxed pr-10 whitespace-pre-line">
              {shareText}
            </p>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleCopyMessage}
              className={`absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                messageCopied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[#2A4365]/10 text-[#2A4365] hover:bg-[#2A4365]/20'
              }`}
            >
              <AnimatePresence mode="wait">
                {messageCopied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check size={14} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Copy size={14} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Copied toast */}
          <AnimatePresence>
            {messageCopied && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-emerald-600 font-medium text-center mt-2"
              >
                Message copied to clipboard ✓
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
