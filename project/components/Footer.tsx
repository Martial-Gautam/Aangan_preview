'use client';

import BrandLogo from '@/components/BrandLogo';
import { TreePine, Newspaper, Images, MessageCircle, User, Heart, Mail, Github, Twitter, Instagram, Linkedin, ExternalLink } from 'lucide-react';

interface FooterProps {
  /** 'landing' uses the dark theme for the welcome page, 'app' uses the light glass theme for in-app pages */
  variant?: 'landing' | 'app';
}

const SITEMAP_LINKS = [
  { label: 'Family Tree', href: '/home', icon: TreePine },
  { label: 'Feed', href: '/feed', icon: Newspaper },
  { label: 'Messages', href: '/messages', icon: MessageCircle },
  { label: 'Memories', href: '/memories', icon: Images },
  { label: 'Profile', href: '/profile', icon: User },
];

// No Cookie Policy entry: the privacy policy states there are no ad networks,
// no third-party analytics and no cross-site tracking, so there is nothing for
// such a page to disclose. Linking to one would imply tracking that does not exist.
const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Use', href: '/terms' },
];

const SOCIAL_LINKS = [
  { label: 'Twitter / X', href: 'https://x.com', icon: Twitter },
  { label: 'Instagram', href: 'https://instagram.com', icon: Instagram },
  { label: 'LinkedIn', href: 'https://linkedin.com', icon: Linkedin },
  { label: 'GitHub', href: 'https://github.com', icon: Github },
];

export default function Footer({ variant = 'app' }: FooterProps) {
  const isLanding = variant === 'landing';

  const containerClass = isLanding
    ? 'bg-[#07121e] border-t border-white/8'
    : 'border-t border-gray-200/40';

  const headingClass = isLanding
    ? 'text-[10px] font-bold uppercase tracking-[0.16em] text-white/40 mb-3'
    : 'text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400 mb-3';

  const linkClass = isLanding
    ? 'text-sm text-white/60 hover:text-white transition-colors'
    : 'text-sm text-gray-500 hover:text-[#2A4365] transition-colors';

  const iconClass = isLanding
    ? 'text-white/40 group-hover:text-white/80 transition-colors'
    : 'text-gray-400 group-hover:text-[#2A4365] transition-colors';

  const mutedClass = isLanding ? 'text-white/30' : 'text-gray-300';
  const subtitleClass = isLanding ? 'text-white/50' : 'text-gray-400';

  return (
    <footer className={`relative z-20 ${containerClass}`} style={isLanding ? undefined : { background: 'transparent' }}>
      <div className="max-w-5xl mx-auto px-5 pt-10 pb-6">
        {/* Top Section: Brand + Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          {/* Brand Column */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <BrandLogo size={20} />
              <span className={`brand-wordmark text-lg ${isLanding ? 'text-white' : 'text-gray-900'}`}>
                Familiar
              </span>
            </div>
            <p className={`text-xs leading-relaxed mb-4 ${subtitleClass}`}>
              Building the Family Graph — a living network that maps every relationship across every generation.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-2.5">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className={`group w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    isLanding
                      ? 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/8'
                      : 'bg-gray-100 hover:bg-[#2A4365]/10 border border-gray-200/60'
                  }`}
                >
                  <s.icon size={14} className={iconClass} />
                </a>
              ))}
            </div>
          </div>

          {/* Sitemap Column */}
          <div>
            <h4 className={headingClass}>Sitemap</h4>
            <ul className="space-y-2">
              {SITEMAP_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className={`flex items-center gap-2 group ${linkClass}`}>
                    <link.icon size={13} className={iconClass} />
                    <span className="text-xs font-medium">{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className={headingClass}>Legal</h4>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className={`flex items-center gap-1.5 group ${linkClass}`}>
                    <span className="text-xs font-medium">{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* About / Contact Column */}
          <div>
            <h4 className={headingClass}>About</h4>
            <p className={`text-xs leading-relaxed mb-3 ${subtitleClass}`}>
              Familiar (formerly Aangan) is building the world&apos;s first Family Graph — connecting every person to their roots.
            </p>
            <a
              href="mailto:ranveer.aangan@gmail.com"
              className={`inline-flex items-center gap-1.5 group ${linkClass}`}
            >
              <Mail size={13} className={iconClass} />
              <span className="text-xs font-medium">Contact Us</span>
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className={`border-t mb-5 ${isLanding ? 'border-white/8' : 'border-gray-200/50'}`} />

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] ${mutedClass}`}>
              © {new Date().getFullYear()} Familiar · Built with
            </span>
            <Heart size={11} className="text-red-400 fill-red-400" />
            <span className={`text-[11px] ${mutedClass}`}>
              by Ranveer Gautam
            </span>
          </div>
          <div className={`flex items-center gap-4 text-[11px] ${mutedClass}`}>
            <a href="/privacy" className={`hover:${isLanding ? 'text-white/60' : 'text-gray-500'} transition-colors`}>Privacy</a>
            <span>·</span>
            <a href="/terms" className={`hover:${isLanding ? 'text-white/60' : 'text-gray-500'} transition-colors`}>Terms</a>
            <span>·</span>
            <a href="mailto:ranveer.aangan@gmail.com" className={`hover:${isLanding ? 'text-white/60' : 'text-gray-500'} transition-colors`}>Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
