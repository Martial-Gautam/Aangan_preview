'use client';

import { useState, useRef, useEffect as import_react_useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView as import_framer_useInView } from 'motion/react';
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

// ---------- Problem Card with scroll-linked hanging physics ----------
function ProblemScrollCard({ item, index, hoveredIndex, setHovered, containerRef }: any) {
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  // Each card enters at a staggered point within the scroll progress
  const entryStart = 0.0 + index * 0.02;
  const entryEnd = entryStart + 0.1;
  const yRaw = useTransform(scrollYProgress, [entryStart, entryEnd, 1], [-80, 0, 30 + index * 8]);
  const opacityRaw = useTransform(scrollYProgress, [entryStart, entryStart + 0.08], [0, 1]);
  const ySpring = useSpring(yRaw, { stiffness: 80, damping: 18, mass: 1 + index * 0.12 });
  // Zig-zag: odd-column cards (index 1,3,5) get a top offset
  const isOddColumn = index % 2 === 1;

  

  const isHovered = hoveredIndex === index;

  return (
    <motion.div style={{ y: ySpring, opacity: opacityRaw }} className={`relative ${isOddColumn ? 'mt-10' : ''}`} onViewportLeave={() => { if (hoveredIndex === index) setHovered(-1); }}>
      <motion.button
        animate={{ 
          y: isHovered ? -12 : [0, -4 - (index % 3), 0],
          scale: isHovered ? 1.05 : 1
        }}
        transition={
          isHovered 
            ? { duration: 0.25, ease: 'easeOut' }
            : { duration: 5 + index * 0.4, repeat: Infinity, ease: 'easeInOut' }
        }
        onMouseEnter={() => setHovered(index)}
        onFocus={() => setHovered(index)}
        onClick={() => setHovered(isHovered ? -1 : index)}
        className={`w-full text-left rounded-2xl border p-5 transition-colors duration-200 ${
          isHovered
            ? 'bg-white border-[#2A4365]/25 shadow-2xl shadow-gray-900/12 z-10'
            : 'bg-white/74 border-gray-200 hover:bg-white z-0'
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
          isHovered ? 'bg-[#2A4365] text-white' : 'bg-[#2A4365]/8 text-[#2A4365]'
        }`}>
          <item.icon size={18} />
        </div>
        <h3 className="font-bold text-gray-950 text-sm mb-1">{item.title}</h3>
        <p className="text-gray-600 text-xs leading-relaxed">{item.desc}</p>
      </motion.button>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden w-full mt-4 rounded-[1.35rem] overflow-hidden"
          >
            <ProblemSnapshot activeProblem={item} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------- Feature Card with scroll-linked hanging physics (original contrast) ----------
function FeatureScrollCard({ item, index, hoveredIndex, setHovered, containerRef }: any) {
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const entryStart = 0.0 + index * 0.02;
  const entryEnd = entryStart + 0.1;
  const yRaw = useTransform(scrollYProgress, [entryStart, entryEnd, 1], [-80, 0, 30 + index * 8]);
  const opacityRaw = useTransform(scrollYProgress, [entryStart, entryStart + 0.08], [0, 1]);
  const ySpring = useSpring(yRaw, { stiffness: 80, damping: 18, mass: 1 + index * 0.12 });
  

  const isHovered = hoveredIndex === index;

  return (
    <motion.div 
      style={{ y: ySpring, opacity: opacityRaw }} 
      className="relative"
      onViewportLeave={() => {
        if (hoveredIndex === index) setHovered(-1);
      }}
    >
      <motion.button
        animate={{ 
          y: isHovered ? -12 : [0, -4 - (index % 3), 0],
          scale: isHovered ? 1.05 : 1
        }}
        transition={
          isHovered 
            ? { duration: 0.25, ease: 'easeOut' }
            : { duration: 5 + index * 0.4, repeat: Infinity, ease: 'easeInOut' }
        }
        onMouseEnter={() => setHovered(index)}
        onFocus={() => setHovered(index)}
        className={`group w-full text-left rounded-2xl border p-4 sm:p-5 transition-colors duration-200 ${
          isHovered
            ? 'bg-[#07121e] border-[#07121e] shadow-2xl shadow-[#07121e]/30 z-10'
            : 'bg-[#f7f9fb] border-gray-200 hover:bg-white z-0'
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


function ProblemSnapshot({ activeProblem }: { activeProblem: any }) {
  return (

              <motion.div
                key={activeProblem.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="rounded-3xl border border-gray-200 bg-white shadow-xl shadow-gray-900/6 overflow-hidden"
              >
                <div className="bg-[#07121e] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#ffd98f] font-bold">Problem to product</p>
                    <h3 className="text-white font-bold text-lg mt-1">{activeProblem.previewTitle}</h3>
                  </div>
                  <activeProblem.icon size={22} className="text-white/70" />
                </div>

                <div className="relative h-56 rounded-2xl bg-[linear-gradient(145deg,rgba(31,64,96,0.88),rgba(8,21,34,0.96))] border border-white/10 overflow-hidden">
                  <svg viewBox="0 0 360 230" className="absolute inset-0 h-full w-full">
                    <path d="M70 68 C128 94 156 116 180 138" stroke="#ffba78" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M180 138 C218 105 254 84 304 62" stroke="#70e4c1" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M180 138 L110 184" stroke="#8edbff" strokeWidth="2.4" strokeLinecap="round" fill="none" />
                    <path d="M180 138 L250 184" stroke="#ffd98f" strokeWidth="2.4" strokeLinecap="round" fill="none" />
                    {activeProblem.from.map((label: string, index: number) => {
                      const points = [[70, 68], [180, 40], [304, 62]][index] || [70 + index * 100, 70];
                      return (
                        <g key={label}>
                          <circle cx={points[0]} cy={points[1]} r="24" fill="#ffffff" fillOpacity="0.92" />
                          <text x={points[0]} y={points[1] + 4} textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#17324f">{label}</text>
                        </g>
                      );
                    })}
                    <circle cx="180" cy="138" r="31" fill="#ffd98f" fillOpacity="0.96" />
                    <text x="180" y="135" textAnchor="middle" fontSize="9" fontWeight="900" fill="#17324f">Aangan</text>
                    <text x="180" y="147" textAnchor="middle" fontSize="8" fontWeight="800" fill="#17324f">Core</text>
                    <circle cx="110" cy="184" r="20" fill="#b7e5ff" />
                    <circle cx="250" cy="184" r="20" fill="#bff3d5" />
                    <text x="110" y="188" textAnchor="middle" fontSize="8" fontWeight="800" fill="#17324f">Tree</text>
                    <text x="250" y="188" textAnchor="middle" fontSize="8" fontWeight="800" fill="#17324f">{activeProblem.to}</text>
                  </svg>
                </div>
              </div>
              <div className="p-5">
                  <p className="text-sm font-semibold text-gray-950 mb-1">{activeProblem.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{activeProblem.solution}</p>
                </div>
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
      desc: 'The internet knows your friends, followers, and colleagues. But no platform knows your family.',
      solution: 'A living Family Graph brings every relative into one visible, connected network.',
      previewTitle: 'From invisible to visible',
      from: ['Friends', 'Followers', 'Colleagues'],
      to: 'Family Graph',
    },
    {
      icon: Shield,
      title: 'Fragmented Information',
      desc: 'Family data is scattered across WhatsApp groups, wedding albums, memories, and government records.',
      solution: 'One unified graph connects all family information in a single living network.',
      previewTitle: 'Scattered data becomes one graph',
      from: ['WhatsApp', 'Albums', 'Records'],
      to: 'Family Graph',
    },
    {
      icon: TreePine,
      title: 'No Family Graph Exists',
      desc: 'Facebook built the Social Graph. LinkedIn built the Professional Graph. No one has built the Family Graph.',
      solution: 'Aangan is building the world\'s first Family Graph — a living map of every relationship.',
      previewTitle: 'The missing graph',
      from: ['Social', 'Professional', 'Family?'],
      to: 'Family Graph',
    },
    {
      icon: Heart,
      title: 'Lost Across Generations',
      desc: 'With every generation, family connections become harder to trace and easier to lose.',
      solution: 'The Family Graph preserves relationships across generations, ensuring no connection is forgotten.',
      previewTitle: 'Generations stay connected',
      from: ['Gen 1', 'Gen 2', 'Gen 3'],
      to: 'Preserved',
    },
    {
      icon: MapPin,
      title: 'Unknown Relatives Nearby',
      desc: 'People move to new cities without knowing which relatives live nearby.',
      solution: 'Discover trusted relatives around any place through the Family Graph.',
      previewTitle: 'New city, known people',
      from: ['Delhi', 'Pune', 'Jaipur'],
      to: 'Nearby Relatives',
    },
    {
      icon: Send,
      title: 'No Dedicated Infrastructure',
      desc: 'Families use tools built for strangers — messaging apps, social feeds, cloud storage — none designed for family relationships.',
      solution: 'Aangan provides digital infrastructure designed specifically for family connections.',
      previewTitle: 'Built for families',
      from: ['Chat apps', 'Social media', 'Cloud'],
      to: 'Family Network',
    },
  ];

  // `shot` names a file in public/screenshots — the real screen for each feature.
  const featureItems = [
    {
      icon: TreePine,
      title: 'Family World',
      desc: 'Everyone you are related to on one map, with you at the centre. Zoom out to the whole family, in to one branch.',
      gradient: 'from-[#ff7f63] to-[#2d81ff]',
      shot: 'main',
    },
    {
      icon: Users,
      title: 'Exactly how you are related',
      desc: 'Tap anyone and Aangan names the relationship — Bhatiji, Chachera bhai, Nani — with the chain of people between you.',
      gradient: 'from-[#2d81ff] to-[#1eb18a]',
      shot: 'related',
    },
    {
      icon: MessageCircle,
      title: 'Posts',
      desc: 'No algorithm, no strangers. What your family posted, in the order they posted it, to the people you chose.',
      gradient: 'from-[#1eb18a] to-[#ffc457]',
      shot: 'posts',
    },
    {
      icon: Send,
      title: 'Discuss',
      desc: 'One thread to settle where Diwali is this year — instead of four phone calls and forty unread replies.',
      gradient: 'from-[#ffc457] to-[#ff7f63]',
      shot: 'discuss',
    },
    {
      icon: Sparkles,
      title: 'Events',
      desc: 'Invite the right branch of the family in one tap, see who is coming, and collect every photo after.',
      gradient: 'from-[#ff7f63] to-[#1eb18a]',
      shot: 'events',
    },
    {
      icon: Image,
      title: 'Kept',
      desc: 'Every wedding, festival and birthday kept together, in albums the whole family adds to.',
      gradient: 'from-[#2d81ff] to-[#ff7f63]',
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
          Aangan
        </span>
      </motion.div>
      <motion.div 
        className="fixed bottom-0 left-0 right-0 z-[15] pointer-events-none md:hidden flex flex-col justify-end whitespace-nowrap overflow-hidden pt-12 pb-2 bg-gradient-to-t from-white via-white/80 to-transparent" style={{ mixBlendMode: 'multiply' }}
      >
        <motion.span 
          style={{ x: watermarkX }} 
          className="text-[15vw] font-black uppercase tracking-widest brand-wordmark pl-4"
        >
          Aangan • Aangan • Aangan • Aangan • Aangan
        </motion.span>
      </motion.div>

      {/* The Challenge */}
      <section className="py-24 px-6 bg-[#f7f9fb] relative">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-14 items-stretch">
          <div className="lg:sticky lg:top-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <p className="text-[#2A4365] text-xs font-semibold uppercase tracking-[0.15em] mb-2">The Problem</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-950 mb-4 leading-tight">
                The internet digitized everything. Except families.
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                Hover a challenge to see how Aangan turns invisible family connections into a living, connected graph.
              </p>
            </motion.div>

            <div className="hidden lg:block">
              <AnimatePresence mode="wait">
                <ProblemSnapshot activeProblem={activeProblem} />
              </AnimatePresence>
            </div>
          </div>

          <div ref={problemGridRef} className="grid sm:grid-cols-2 gap-x-4 gap-y-2 relative -mt-5">
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
                <p className="text-[#2A4365] text-xs font-semibold uppercase tracking-[0.15em] mb-2">Inside the app</p>
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
              Facebook mapped friendships. LinkedIn mapped professional relationships. Aangan is building the Family Graph.
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
          <div className="w-16 h-16 rounded-3xl bg-[#2A4365]/10 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <BrandLogo size={38} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Aangan means courtyard.
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            The place where the whole family gathers. Bring yours in today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onDownload}
              className="w-full sm:w-auto bg-[#2A4365] text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-[#2A4365]/90 active:scale-[0.97] transition-all shadow-xl shadow-[#2A4365]/20 flex items-center justify-center gap-2"
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
