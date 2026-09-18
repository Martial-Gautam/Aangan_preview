'use client';

import { Check } from 'lucide-react';

// Small phone-screen illustrations, one per step, in the site's own palette so
// they match the postcards rather than looking pasted in from a help site.
const C = { ink: '#0E1B2B', coral: '#FF4D6D', teal: '#1FA79A', mist: '#8FA3B8', paper: '#F1EFEB' };

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 84" className="w-full h-full" aria-hidden="true">
      <rect width="120" height="84" rx="10" fill={C.ink} />
      {children}
    </svg>
  );
}

const ART: Record<string, React.ReactNode> = {
  // 1. A download notification with the apk name
  open: (
    <Screen>
      <rect x="10" y="8" width="100" height="4" rx="2" fill="#ffffff" opacity="0.15" />
      <rect x="10" y="20" width="100" height="30" rx="7" fill="#ffffff" opacity="0.1" />
      <circle cx="24" cy="35" r="7" fill={C.coral} />
      <path d="M24 31 v6 m-3 -3 l3 3 l3 -3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="37" y="28" width="46" height="4" rx="2" fill="#ffffff" opacity="0.85" />
      <rect x="37" y="37" width="30" height="3" rx="1.5" fill={C.mist} opacity="0.7" />
      <rect x="10" y="58" width="100" height="18" rx="6" fill="#ffffff" opacity="0.05" />
    </Screen>
  ),
  // 2. The "unknown apps" gate, pointing at Settings
  allow: (
    <Screen>
      <rect x="14" y="14" width="92" height="56" rx="8" fill={C.paper} />
      <rect x="22" y="22" width="60" height="4" rx="2" fill={C.ink} opacity="0.8" />
      <rect x="22" y="30" width="76" height="3" rx="1.5" fill={C.mist} />
      <rect x="22" y="36" width="52" height="3" rx="1.5" fill={C.mist} />
      <rect x="50" y="50" width="20" height="10" rx="5" fill="none" stroke={C.mist} strokeWidth="1" />
      <rect x="74" y="49" width="26" height="12" rx="6" fill={C.coral} />
      <rect x="80" y="54" width="14" height="2.5" rx="1.25" fill="#fff" />
    </Screen>
  ),
  // 3. The toggle, switched on
  toggle: (
    <Screen>
      <rect x="10" y="14" width="100" height="4" rx="2" fill="#ffffff" opacity="0.5" />
      <rect x="10" y="24" width="64" height="3" rx="1.5" fill={C.mist} opacity="0.6" />
      <rect x="10" y="40" width="100" height="30" rx="7" fill="#ffffff" opacity="0.08" />
      <rect x="18" y="50" width="44" height="4" rx="2" fill="#ffffff" opacity="0.85" />
      <rect x="18" y="58" width="30" height="3" rx="1.5" fill={C.mist} opacity="0.6" />
      <rect x="80" y="48" width="22" height="12" rx="6" fill={C.teal} />
      <circle cx="96" cy="54" r="4.5" fill="#fff" />
    </Screen>
  ),
  // 4. The Install button
  install: (
    <Screen>
      <rect x="44" y="12" width="32" height="32" rx="9" fill="#ffffff" opacity="0.1" />
      <circle cx="60" cy="28" r="9" fill={C.coral} />
      <rect x="30" y="50" width="60" height="4" rx="2" fill="#ffffff" opacity="0.6" />
      <rect x="20" y="62" width="34" height="12" rx="6" fill="none" stroke={C.mist} strokeWidth="1" />
      <rect x="62" y="62" width="38" height="12" rx="6" fill={C.coral} />
      <rect x="72" y="67" width="18" height="2.5" rx="1.25" fill="#fff" />
    </Screen>
  ),
  // 5. Play Protect's shield, and the quieter "install anyway"
  protect: (
    <Screen>
      <rect x="14" y="10" width="92" height="64" rx="8" fill={C.paper} />
      <path d="M60 18 l10 4 v8 c0 6 -4 10 -10 12 c-6 -2 -10 -6 -10 -12 v-8 z" fill={C.teal} />
      <path d="M56 30 l3 3 l6 -6" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="30" y="46" width="60" height="3.5" rx="1.75" fill={C.ink} opacity="0.75" />
      <rect x="22" y="60" width="34" height="9" rx="4.5" fill="none" stroke={C.ink} strokeOpacity="0.3" strokeWidth="1" />
      <rect x="64" y="60" width="34" height="9" rx="4.5" fill={C.coral} />
    </Screen>
  ),
  // 6. Done
  done: (
    <Screen>
      <rect x="40" y="16" width="40" height="40" rx="12" fill={C.coral} />
      <path d="M52 36 l6 6 l12 -12" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="44" y="64" width="32" height="4" rx="2" fill="#ffffff" opacity="0.7" />
    </Screen>
  ),
};

const STEPS = [
  {
    art: 'open',
    title: 'Open the downloaded file',
    body: 'Pull down your notifications and tap the Apney file (it ends in .apk). If it is not there, open the Files app and look in Downloads.',
  },
  {
    art: 'allow',
    title: 'Android will stop you the first time',
    body: 'You will see "your phone is not allowed to install unknown apps from this source". This is normal. Tap Settings.',
  },
  {
    art: 'toggle',
    title: 'Switch on "Allow from this source"',
    body: 'Turn the switch on, then tap Back. This only lets your browser install apps; it does not change anything else.',
  },
  {
    art: 'install',
    title: 'Tap Install',
    body: 'Give it a few seconds.',
  },
  {
    art: 'protect',
    title: 'If Play Protect asks, tap "Install anyway"',
    body: 'Play Protect flags every app that is not on the Play Store yet. Tap More details, then Install anyway.',
    optional: true,
  },
  {
    art: 'done',
    title: 'Tap Open',
    body: 'You are in. Add your first relative.',
  },
];

interface InstallStepsProps {
  onDone: () => void;
  onDownloadAgain: () => void;
}

export default function InstallSteps({ onDone, onDownloadAgain }: InstallStepsProps) {
  return (
    <div>
      <p className="text-white/55 text-[13px] leading-relaxed">
        Your download has started. Here is what happens next on your phone.
      </p>

      <ol className="mt-5 space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.art} className="flex gap-3.5">
            <div className="flex-shrink-0 w-[92px] rounded-[10px] overflow-hidden border border-white/10">
              {ART[step.art]}
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-white font-semibold text-[14px] leading-snug">
                <span className="text-[#FF4D6D] tabular-nums mr-1.5">{i + 1}.</span>
                {step.title}
                {step.optional && <span className="ml-1.5 text-[11px] font-medium text-white/40">(only sometimes)</span>}
              </p>
              <p className="text-white/60 text-[12.5px] leading-relaxed mt-1">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <button
        onClick={onDone}
        className="w-full mt-6 py-3.5 rounded-2xl bg-white text-[#0c1e33] text-[15px] font-bold flex items-center justify-center gap-2 shadow-xl shadow-black/25 hover:bg-[#fff6df] active:scale-[0.98] transition-all"
      >
        <Check size={17} /> Got it
      </button>
      <button
        onClick={onDownloadAgain}
        className="w-full mt-2 py-2 text-[13px] font-medium text-white/45 hover:text-white/75 transition-colors"
      >
        Download did not start? Try again
      </button>
    </div>
  );
}
