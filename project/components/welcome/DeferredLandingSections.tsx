'use client';

import { useState, useRef, useEffect as import_react_useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView as import_framer_useInView, useReducedMotion as import_framer_useReducedMotion } from 'motion/react';
import BrandLogo from '@/components/BrandLogo';
import Footer from '@/components/Footer';
import NextImage from 'next/image';
import {
  TreePine,
  Users,
  Shield,
  MapPin,
  Send,
  Image,
  Heart,
  Globe,
  MessageCircle,
  Sparkles,
  Download,
} from 'lucide-react';

interface DeferredLandingSectionsProps {
  /** Downloads the APK on Android, or opens the PWA install steps elsewhere. */
  onDownload: () => void;
}

// ---------- Postcard illustrations ----------
// One vocabulary for all six: people are discs, relations are lines, the family
// is a courtyard square. Each scene composes those differently. Palette is the
// app's own: ink ground, coral for "you", marigold and teal from the avatar discs.
const ART = { ink: '#0E1B2B', coral: '#FF4D6D', marigold: '#E8A33D', teal: '#1FA79A', mist: '#8FA3B8' };

function Disc({ x, y, r = 13, fill = ART.mist, ghost = false, op = 1 }: { x: number; y: number; r?: number; fill?: string; ghost?: boolean; op?: number }) {
  return ghost
    ? <circle cx={x} cy={y} r={r} fill="none" stroke={fill} strokeWidth="1.6" strokeDasharray="3 4" opacity={op} />
    : <circle cx={x} cy={y} r={r} fill={fill} opacity={op} />;
}

function Link({ a, b, color = ART.mist, ghost = false, op = 1, w = 2 }: { a: [number, number]; b: [number, number]; color?: string; ghost?: boolean; op?: number; w?: number }) {
  return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} strokeLinecap="round" strokeDasharray={ghost ? '3 5' : undefined} opacity={op} />;
}

function ProblemArt({ scene }: { scene: string }) {
  return (
    <svg viewBox="0 0 320 200" className="absolute inset-0 w-full h-full" aria-hidden="true">
      <defs>
        <radialGradient id={`art-glow-${scene}`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#1c3350" />
          <stop offset="100%" stopColor={ART.ink} />
        </radialGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#art-glow-${scene})`} />

      {scene === 'invisible' && (
        <g>
          {/* The graphs the internet already has, lit and connected */}
          <Link a={[62, 70]} b={[110, 100]} color={ART.teal} />
          <Link a={[62, 130]} b={[110, 100]} color={ART.teal} />
          <Link a={[110, 100]} b={[160, 100]} color={ART.teal} />
          <Disc x={62} y={70} fill={ART.teal} />
          <Disc x={62} y={130} fill={ART.teal} />
          <Disc x={110} y={100} fill={ART.teal} />
          <Disc x={160} y={100} r={17} fill={ART.coral} />
          {/* The family, nobody has drawn it */}
          <Link a={[160, 100]} b={[212, 62]} ghost />
          <Link a={[160, 100]} b={[224, 110]} ghost />
          <Link a={[160, 100]} b={[206, 148]} ghost />
          <Link a={[212, 62]} b={[262, 48]} ghost op={0.6} />
          <Link a={[224, 110]} b={[272, 118]} ghost op={0.6} />
          <Disc x={212} y={62} ghost />
          <Disc x={224} y={110} ghost />
          <Disc x={206} y={148} ghost />
          <Disc x={262} y={48} ghost op={0.6} />
          <Disc x={272} y={118} ghost op={0.6} />
        </g>
      )}

      {scene === 'fragmented' && (
        <g>
          {/* Scraps drifting away from where the family should be */}
          <Disc x={160} y={100} r={13} fill={ART.coral} />
          {[
            [70, 52, -14, ART.teal], [236, 46, 11, ART.marigold], [58, 146, 9, ART.mist],
            [250, 150, -8, ART.teal], [160, 30, 5, ART.mist], [160, 172, -4, ART.marigold],
          ].map(([x, y, rot, c], i) => (
            <g key={i} transform={`rotate(${rot} ${x} ${y})`}>
              <rect x={(x as number) - 26} y={(y as number) - 17} width="52" height="34" rx="6" fill="#ffffff" opacity="0.92" />
              <rect x={(x as number) - 18} y={(y as number) - 8} width="22" height="4" rx="2" fill={c as string} />
              <rect x={(x as number) - 18} y={(y as number) + 1} width="32" height="3" rx="1.5" fill={ART.mist} opacity="0.5" />
              <Link a={[x as number, y as number]} b={[160, 100]} ghost op={0.35} w={1.5} />
            </g>
          ))}
        </g>
      )}

      {scene === 'nograph' && (
        <g>
          {/* Social and professional graphs exist; the third square is still empty */}
          {[[56, ART.teal], [160, ART.marigold]].map(([cx, c], i) => (
            <g key={i}>
              <rect x={(cx as number) - 38} y={58} width="76" height="84" rx="12" fill="#ffffff" opacity="0.08" stroke="#ffffff" strokeOpacity="0.18" />
              <Link a={[(cx as number) - 16, 84]} b={[(cx as number) + 12, 100]} color={c as string} />
              <Link a={[(cx as number) + 12, 100]} b={[(cx as number) - 8, 122]} color={c as string} />
              <Link a={[(cx as number) + 12, 100]} b={[(cx as number) + 22, 78]} color={c as string} />
              <Disc x={(cx as number) - 16} y={84} r={7} fill={c as string} />
              <Disc x={(cx as number) + 12} y={100} r={9} fill={c as string} />
              <Disc x={(cx as number) - 8} y={122} r={7} fill={c as string} />
              <Disc x={(cx as number) + 22} y={78} r={6} fill={c as string} />
            </g>
          ))}
          <rect x={226} y={58} width="76" height="84" rx="12" fill="none" stroke={ART.coral} strokeWidth="1.8" strokeDasharray="5 5" />
          <Disc x={264} y={100} r={6} fill={ART.coral} />
        </g>
      )}

      {scene === 'generations' && (
        <g>
          {/* A line of people, fading the further back you go */}
          {[292, 246, 200, 154, 108, 62].map((x, i) => {
            const op = [1, 0.85, 0.6, 0.4, 0.25, 0.15][i];
            const ghost = i >= 4;
            const fill = i === 0 ? ART.coral : i < 3 ? ART.marigold : ART.mist;
            return (
              <g key={x}>
                {i < 5 && <Link a={[x - 13, 100]} b={[x - 33, 100]} color={ART.mist} ghost={i >= 3} op={op} />}
                <Disc x={x} y={100} r={i === 0 ? 16 : 13} fill={fill} ghost={ghost} op={op} />
              </g>
            );
          })}
        </g>
      )}

      {scene === 'nearby' && (
        <g>
          {/* A new city: streets you know nothing about, relatives you don't know are there */}
          <g stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1">
            {[40, 100, 160, 220, 280].map((x) => <line key={`v${x}`} x1={x} y1="0" x2={x} y2="200" />)}
            {[40, 100, 160].map((y) => <line key={`h${y}`} x1="0" y1={y} x2="320" y2={y} />)}
          </g>
          <circle cx="160" cy="100" r="30" fill={ART.coral} opacity="0.12" />
          <circle cx="160" cy="100" r="18" fill={ART.coral} opacity="0.25" />
          <Disc x={160} y={100} r={9} fill={ART.coral} />
          {[[72, 58, ART.teal], [244, 66, ART.marigold], [86, 150, ART.marigold], [252, 144, ART.teal]].map(([x, y, c], i) => (
            <g key={i}>
              <circle cx={x as number} cy={y as number} r="16" fill="none" stroke={c as string} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.7" />
              <Disc x={x as number} y={y as number} r={7} fill={c as string} op={0.55} />
            </g>
          ))}
        </g>
      )}

      {scene === 'infrastructure' && (
        <g>
          {/* A home, and tools built for strangers that don't quite fit it */}
          <rect x="110" y="62" width="100" height="90" rx="10" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" />
          <path d="M104 72 L160 34 L216 72" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Disc x={160} y={112} r={12} fill={ART.coral} />
          {/* chat bubble */}
          <path d="M40 80 h46 a8 8 0 0 1 8 8 v22 a8 8 0 0 1 -8 8 h-26 l-10 9 v-9 h-10 a8 8 0 0 1 -8 -8 v-22 a8 8 0 0 1 8 -8z" fill={ART.mist} opacity="0.55" />
          {/* cloud */}
          <path d="M232 96 a14 14 0 0 1 26 -6 a11 11 0 0 1 20 8 a10 10 0 0 1 -4 19 h-46 a12 12 0 0 1 4 -21z" fill={ART.mist} opacity="0.55" />
          {/* feed lines */}
          <g fill={ART.mist} opacity="0.55">
            <rect x="130" y="166" width="60" height="5" rx="2.5" />
            <rect x="130" y="176" width="42" height="5" rx="2.5" />
          </g>
        </g>
      )}
    </svg>
  );
}

// ---------- Postcard ----------
const TILTS = [-1.6, 1.3, -0.9, 1.7, -1.3, 1.0];

function ProblemScrollCard({ item, index, hoveredIndex, setHovered, containerRef }: any) {
  const reduceMotion = import_framer_useReducedMotion();
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start end', 'end start'] });

  // Each card settles in slightly after the previous one, like being laid on a table.
  const entryStart = index * 0.03;
  const yRaw = useTransform(scrollYProgress, [entryStart, entryStart + 0.14, 1], [56, 0, 18 + index * 5]);
  const opacityRaw = useTransform(scrollYProgress, [entryStart, entryStart + 0.1], [0, 1]);
  const ySpring = useSpring(yRaw, { stiffness: 60, damping: 20, mass: 0.9 });

  const isHovered = hoveredIndex === index;
  const tilt = reduceMotion ? 0 : TILTS[index % TILTS.length];

  return (
    <motion.div
      style={reduceMotion ? undefined : { y: ySpring, opacity: opacityRaw }}
      className={`relative ${index % 2 === 1 ? 'sm:mt-10' : ''}`}
      onViewportLeave={() => { if (hoveredIndex === index) setHovered(-1); }}
    >
      <motion.button
        type="button"
        animate={{ rotate: isHovered ? 0 : tilt, y: isHovered ? -8 : 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onMouseEnter={() => setHovered(index)}
        onFocus={() => setHovered(index)}
        onClick={() => setHovered(isHovered ? -1 : index)}
        aria-expanded={isHovered}
        className={`w-full text-left rounded-[14px] bg-white p-3 pb-4 border border-black/[0.06] transition-shadow duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D6D] ${
          isHovered
            ? 'shadow-[0_24px_48px_-16px_rgba(14,27,43,0.35)]'
            : 'shadow-[0_10px_24px_-14px_rgba(14,27,43,0.25)]'
        }`}
      >
        <div className="relative aspect-[16/10] rounded-[10px] overflow-hidden bg-[#0E1B2B]">
          <ProblemArt scene={item.scene} />
        </div>

        {/* Stamp */}
        <div className="absolute top-5 right-5 p-[3px] rounded-[3px] bg-white border border-dashed border-[#0E1B2B]/30 shadow-md">
          <div className="w-8 h-9 rounded-[2px] bg-[#FF4D6D]/10 flex items-center justify-center">
            <item.icon size={15} className="text-[#FF4D6D]" />
          </div>
        </div>

        <h3 className="mt-3.5 font-bold text-[#0E1B2B] text-[15px] leading-snug">{item.title}</h3>
        <p className="text-gray-600 text-[12.5px] leading-relaxed mt-1">{item.desc}</p>
      </motion.button>

      {/* On small screens the answer unfolds beneath the card; on large it shows in the sticky preview */}
      <AnimatePresence initial={false}>
        {isHovered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden overflow-hidden"
          >
            <p className="mt-3 mx-1 pl-3 border-l-2 border-[#FF4D6D] text-[13px] text-[#0E1B2B]/80 leading-relaxed">
              {item.solution}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Desktop sticky preview: the same picture, larger, with the answer written on the back.
function ProblemSnapshot({ activeProblem }: { activeProblem: any }) {
  return (
    <motion.div
      key={activeProblem.title}
      initial={{ opacity: 0, y: 10, rotate: -0.6 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[18px] bg-white p-4 border border-black/[0.06] shadow-[0_28px_60px_-24px_rgba(14,27,43,0.35)]"
    >
      <div className="relative aspect-[16/10] rounded-[12px] overflow-hidden bg-[#0E1B2B]">
        <ProblemArt scene={activeProblem.scene} />
      </div>
      <div className="px-1 pt-4 pb-1">
        <p className="text-[#FF4D6D] text-[13px] font-bold mb-1.5">{activeProblem.previewTitle}</p>
        <p className="text-[14px] text-[#0E1B2B]/80 leading-relaxed">{activeProblem.solution}</p>
      </div>
    </motion.div>
  );
}

// ---------- Feature Card with scroll-linked hanging physics (original contrast) ----------
function FeatureScrollCard({ item, index, hoveredIndex, setHovered, containerRef }: any) {
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const reduceMotion = import_framer_useReducedMotion();
  const entryStart = index * 0.03;
  const yRaw = useTransform(scrollYProgress, [entryStart, entryStart + 0.14, 1], [40, 0, 12 + index * 3]);
  const opacityRaw = useTransform(scrollYProgress, [entryStart, entryStart + 0.1], [0, 1]);
  const ySpring = useSpring(yRaw, { stiffness: 60, damping: 20, mass: 0.9 });

  const isHovered = hoveredIndex === index;

  return (
    <motion.div
      style={reduceMotion ? undefined : { y: ySpring, opacity: opacityRaw }}
      className="relative"
      onViewportLeave={() => {
        if (hoveredIndex === index) setHovered(-1);
      }}
    >
      <motion.button
        type="button"
        animate={{ y: isHovered ? -6 : 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onMouseEnter={() => setHovered(index)}
        onFocus={() => setHovered(index)}
        className={`group w-full text-left rounded-2xl border p-4 sm:p-5 transition-colors duration-200 ${
          isHovered
            ? 'bg-[#0E1B2B] border-[#0E1B2B] shadow-2xl shadow-[#0E1B2B]/30 z-10'
            : 'bg-[#F1EFEB] border-black/[0.06] hover:bg-white z-0'
        }`}
      >
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 sm:mb-4 shadow-lg shadow-gray-900/10`}>
          <item.icon size={20} className="text-white" />
        </div>
        <h3 className={`font-bold text-sm sm:text-base mb-1.5 sm:mb-2 ${isHovered ? 'text-white' : 'text-gray-950'}`}>
          {item.title}
        </h3>
        <p className={`text-xs sm:text-sm leading-relaxed ${isHovered ? 'text-white/75' : 'text-gray-600'} line-clamp-3`}>
          {item.desc}
        </p>
      </motion.button>
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden w-full mt-4 rounded-[1.35rem]"
          >
            <FeatureSnapshot activeFeature={item} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


function FeatureSnapshot({ activeFeature }: { activeFeature: any }) {
  return (
    <div className="rounded-[1.35rem] bg-[linear-gradient(145deg,rgba(22,49,77,0.98),rgba(8,21,34,0.98))] border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-white/8">
        <div>
          <h3 className="text-white text-xl font-bold mt-1">{activeFeature.title}</h3>
        </div>
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${activeFeature.gradient} flex items-center justify-center`}>
          <activeFeature.icon size={22} className="text-white" />
        </div>
      </div>
      <div className="p-5 flex justify-center">
        <NextImage
          src={`/screenshots/${activeFeature.shot}.webp`}
          alt={activeFeature.title}
          width={720}
          height={1564}
          className="w-full max-w-[280px] h-auto rounded-[22px] border border-white/10 shadow-2xl shadow-black/40"
        />
      </div>
    </div>
  );
}

export default function DeferredLandingSections({ onDownload }: DeferredLandingSectionsProps) {
  const [hoveredProblem, setHoveredProblem] = useState(0);
  const [hoveredFeature, setHoveredFeature] = useState(0);

  const problemGridRef = useRef<HTMLDivElement>(null);
  const featureGridRef = useRef<HTMLDivElement>(null);
  const visionRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const watermarkY = useTransform(scrollY, [0, 5000], [0, 800]);
  const watermarkX = useTransform(scrollY, [0, 5000], [0, -800]);

  const { scrollYProgress: visionScrollY } = useScroll({
    target: visionRef,
    offset: ["start 90%", "center center"]
  });
  const visionX = useTransform(visionScrollY, [0, 1], [-200, 0]);
  const visionOpacity = useTransform(visionScrollY, [0, 0.8], [0, 1]);

  const problemItems = [
    {
      icon: Users,
      title: 'Invisible Relationships',
      scene: 'invisible',
      desc: 'The internet knows your friends, followers, and colleagues. But no platform knows your family.',
      solution: 'A living Family Graph brings every relative into one visible, connected network.',
      previewTitle: 'From invisible to visible',
    },
    {
      icon: Shield,
      title: 'Fragmented Information',
      scene: 'fragmented',
      desc: 'Family data is scattered across WhatsApp groups, wedding albums, memories, and government records.',
      solution: 'One unified graph connects all family information in a single living network.',
      previewTitle: 'Scattered data becomes one graph',
    },
    {
      icon: TreePine,
      title: 'No Family Graph Exists',
      scene: 'nograph',
      desc: 'Facebook built the Social Graph. LinkedIn built the Professional Graph. No one has built the Family Graph.',
      solution: 'Apney is building the world\'s first Family Graph — a living map of every relationship.',
      previewTitle: 'The missing graph',
    },
    {
      icon: Heart,
      title: 'Lost Across Generations',
      scene: 'generations',
      desc: 'With every generation, family connections become harder to trace and easier to lose.',
      solution: 'The Family Graph preserves relationships across generations, ensuring no connection is forgotten.',
      previewTitle: 'Generations stay connected',
    },
    {
      icon: MapPin,
      title: 'Unknown Relatives Nearby',
      scene: 'nearby',
      desc: 'People move to new cities without knowing which relatives live nearby.',
      solution: 'Discover trusted relatives around any place through the Family Graph.',
      previewTitle: 'New city, known people',
    },
    {
      icon: Send,
      title: 'No Dedicated Infrastructure',
      scene: 'infrastructure',
      desc: 'Families use tools built for strangers — messaging apps, social feeds, cloud storage — none designed for family relationships.',
      solution: 'Apney provides digital infrastructure designed specifically for family connections.',
      previewTitle: 'Built for families',
    },
  ];

  // `shot` names a file in public/screenshots — the real screen for each feature.
  const featureItems = [
    {
      icon: TreePine,
      title: 'Family World',
      desc: 'Everyone you are related to on one map, with you at the centre. Zoom out to the whole family, in to one branch.',
      gradient: 'from-[#0E1B2B] to-[#1c3350]',
      shot: 'main',
    },
    {
      icon: Users,
      title: 'Exactly how you are related',
      desc: 'Tap anyone and Apney names the relationship — Bhatiji, Chachera bhai, Nani — with the chain of people between you.',
      gradient: 'from-[#0E1B2B] to-[#1c3350]',
      shot: 'related',
    },
    {
      icon: MessageCircle,
      title: 'Posts',
      desc: 'No algorithm, no strangers. What your family posted, in the order they posted it, to the people you chose.',
      gradient: 'from-[#0E1B2B] to-[#1c3350]',
      shot: 'posts',
    },
    {
      icon: Send,
      title: 'Discuss',
      desc: 'One thread to settle where Diwali is this year — instead of four phone calls and forty unread replies.',
      gradient: 'from-[#0E1B2B] to-[#1c3350]',
      shot: 'discuss',
    },
    {
      icon: Sparkles,
      title: 'Events',
      desc: 'Invite the right branch of the family in one tap, see who is coming, and collect every photo after.',
      gradient: 'from-[#0E1B2B] to-[#1c3350]',
      shot: 'events',
    },
    {
      icon: Image,
      title: 'Kept',
      desc: 'Every wedding, festival and birthday kept together, in albums the whole family adds to.',
      gradient: 'from-[#0E1B2B] to-[#1c3350]',
      shot: 'kept',
    },
  ];

  const activeProblem = problemItems[hoveredProblem] || problemItems[0];
  const activeFeature = featureItems[hoveredFeature] || featureItems[0];

  return (
    <div className="relative">
      {/* Watermark restricted to Deferred Sections */}
      <motion.div 
        className="fixed top-0 right-2 md:right-6 z-[5] pointer-events-none hidden md:flex items-center justify-center h-screen"
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', y: watermarkY }}
      >
        <span className="text-[16vh] font-black uppercase tracking-[0.25em] brand-wordmark whitespace-nowrap text-[#2A4365]/[0.15] dark:text-white/[0.12]" style={{ mixBlendMode: 'multiply' }}>
          Apney
        </span>
      </motion.div>
      <motion.div 
        className="fixed bottom-0 left-0 right-0 z-[15] pointer-events-none md:hidden flex flex-col justify-end whitespace-nowrap overflow-hidden pt-12 pb-2 bg-gradient-to-t from-white via-white/80 to-transparent" style={{ mixBlendMode: 'multiply' }}
      >
        <motion.span 
          style={{ x: watermarkX }} 
          className="text-[15vw] font-black uppercase tracking-widest brand-wordmark pl-4"
        >
          Apney • Apney • Apney • Apney • Apney
        </motion.span>
      </motion.div>

      {/* The Challenge */}
      <section className="py-24 px-6 bg-[#F1EFEB] relative">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-14 items-stretch">
          <div className="lg:sticky lg:top-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <h2 className="text-3xl sm:text-[40px] font-bold text-[#0E1B2B] mb-4 leading-[1.08]">
                The internet digitized everything. Except families.
              </h2>
              <p className="text-[#0E1B2B]/65 leading-relaxed mb-8 max-w-md">
                Six things that go wrong when a family has no place of its own online. Pick one to see how Apney answers it.
              </p>
            </motion.div>

            <div className="hidden lg:block">
              <AnimatePresence mode="wait">
                <ProblemSnapshot activeProblem={activeProblem} />
              </AnimatePresence>
            </div>
          </div>

          <div ref={problemGridRef} className="grid sm:grid-cols-2 gap-x-5 gap-y-6 relative">
            {problemItems.map((item, index) => (
              <ProblemScrollCard
                key={item.title}
                item={item}
                index={index}
                hoveredIndex={hoveredProblem}
                setHovered={setHoveredProblem}
                containerRef={problemGridRef}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-24 px-6 bg-white relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-14 items-center mb-16">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <p className="text-[#FF4D6D] text-xs font-semibold tracking-wide mb-2">Inside the app</p>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-950 mb-4 leading-tight">Built for the way families actually work</h2>
                <p className="text-gray-600 max-w-lg leading-relaxed">
                  Every screen starts from who you are related to. Hover a feature to see the real screen.
                </p>
              </motion.div>
            </div>

            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature.title}
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -14, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="hidden lg:block rounded-[2rem] border border-gray-200 bg-[#07121e] p-4 shadow-2xl shadow-gray-900/16 max-w-3xl ml-auto"
                >
                  <FeatureSnapshot activeFeature={activeFeature} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Horizontal feature cards grid at the bottom */}
          <div ref={featureGridRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {featureItems.map((item, index) => (
              <FeatureScrollCard
                key={item.title}
                item={item}
                index={index}
                hoveredIndex={hoveredFeature}
                setHovered={setHoveredFeature}
                containerRef={featureGridRef}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Vision */}
      <section ref={visionRef} className="py-20 px-6 bg-gradient-to-br from-[#2A4365] via-[#1a3320] to-[#0d1f13] relative overflow-hidden z-20 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(201,166,107,0.1),transparent_50%)]" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <Globe size={40} className="text-white/30 mx-auto mb-6" />
            <p className="text-white/60 text-xs font-semibold uppercase tracking-[0.15em] mb-3">Our Vision</p>
            <motion.h2 
              style={{ x: visionX, opacity: visionOpacity }}
              className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-6"
            >
              Facebook mapped friendships. LinkedIn mapped professional relationships. Apney is building the Family Graph.
            </motion.h2>
          </motion.div>
          <motion.p 
            style={{ x: visionX, opacity: visionOpacity }}
            className="text-white/60 text-base leading-relaxed max-w-xl mx-auto"
          >
            Every Person. Every Relationship. Every Generation.
          </motion.p>
        </div>
      </section>

      {/* Opportunity / Stats */}
      <section className="py-20 px-6 relative z-10" style={{ background: 'transparent' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-4xl mx-auto text-center mb-12"
        >
          <p className="text-[#2A4365] text-xs font-semibold uppercase tracking-[0.15em] mb-2">The Opportunity</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">The most important graph hasn&apos;t been built</h2>
        </motion.div>
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { stat: '1.4B+', label: 'People in India', sub: 'every person belongs to a family' },
            { stat: '0', label: 'Family Networks', sub: 'no dominant one exists today' },
            { stat: '8B+', label: 'Global Population', sub: 'families everywhere, disconnected' },
            { stat: '100+', label: 'Relationships Mapped', sub: 'and growing every day' },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ y: -800, scale: 0.9, rotate: index % 2 === 0 ? 5 : -5 }}
              whileInView={{ y: [-800, 0, -100, 0, -20, 0], scale: 1, rotate: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{
                y: { 
                  duration: 1.2, 
                  times: [0, 0.4, 0.65, 0.85, 0.95, 1], 
                  ease: ["easeIn", "easeOut", "easeIn", "easeOut", "easeIn"],
                  delay: index * 0.15 
                },
                scale: { duration: 1.2, delay: index * 0.15 },
                rotate: { duration: 1.2, delay: index * 0.15 }
              }}
              whileHover={{ y: -8, scale: 1.05, transition: { type: 'spring', stiffness: 300 } }}
              className="bg-white border-2 border-gray-100 rounded-2xl p-5 text-center flex flex-col justify-center min-h-[140px] shadow-2xl shadow-gray-900/10"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.15 + 0.35 }}
              >
                <p className="text-3xl font-bold text-[#2A4365] mb-1">{item.stat}</p>
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6" style={{ background: 'transparent' }}>
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-lg mx-auto text-center"
        >
          <div className="w-16 h-16 rounded-3xl bg-[#FF4D6D]/10 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <BrandLogo size={38} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Apney means your own people.
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Everyone you are related to, in one place that is only theirs. Bring them in today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onDownload}
              className="w-full sm:w-auto bg-[#FF4D6D] text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-[#ff3d60] active:scale-[0.97] transition-all shadow-xl shadow-[#FF4D6D]/25 flex items-center justify-center gap-2"
            >
              <Download size={18} /> Download the App
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <Footer variant="landing" />
    </div>
  );
}
