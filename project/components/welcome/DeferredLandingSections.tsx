'use client';

import { useState, useRef, useEffect as import_react_useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView as import_framer_useInView } from 'motion/react';
import BrandLogo from '@/components/BrandLogo';
import {
  ArrowRight,
  TreePine,
  Users,
  Shield,
  MapPin,
  Send,
  Image,
  Heart,
  Globe,
  MessageCircle,
  CalendarDays,
  Sparkles,
} from 'lucide-react';

interface DeferredLandingSectionsProps {
  onSignIn: () => void;
  onSignUp: () => void;
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

  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = import_framer_useInView(cardRef, { margin: "-20%" });
  
  import_react_useEffect(() => {
    if (!isInView && hoveredIndex === index) {
      setHovered(-1);
    }
  }, [isInView, hoveredIndex, index, setHovered]);

  const isHovered = hoveredIndex === index;

  return (
    <motion.div style={{ y: ySpring, opacity: opacityRaw }} className={`relative ${isOddColumn ? 'mt-10' : ''}`}>
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
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = import_framer_useInView(cardRef, { margin: "-20%" });
  
  import_react_useEffect(() => {
    if (!isInView && hoveredIndex === index) {
      setHovered(-1);
    }
  }, [isInView, hoveredIndex, index, setHovered]);

  const isHovered = hoveredIndex === index;

  return (
    <motion.div ref={cardRef} style={{ y: ySpring, opacity: opacityRaw }} className="relative">
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
    </motion.div>
  );
}


function FeatureSnapshot({ activeFeature }: { activeFeature: any }) {
  return (
    <FeatureSnapshot activeFeature={activeFeature} />
  );
}

export default function DeferredLandingSections({ onSignIn, onSignUp }: DeferredLandingSectionsProps) {
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
      title: 'Dispersed Family Ties',
      desc: 'Family updates are scattered across social apps, calls, and groups.',
      solution: 'A unified family graph brings every person into one visible network.',
      previewTitle: 'Scattered groups become one tree',
      from: ['WhatsApp', 'Albums', 'Calls'],
      to: 'Family Cosmos',
    },
    {
      icon: Shield,
      title: 'Limited Privacy Control',
      desc: 'It is hard to decide who should see sensitive family updates.',
      solution: 'Share by relationship degree, side of family, and trusted circles.',
      previewTitle: 'Privacy follows the relation',
      from: ['Everyone', 'Friends', 'Unknown'],
      to: '2nd degree only',
    },
    {
      icon: TreePine,
      title: 'No Universal Family Tree',
      desc: 'Most families do not have a living, shared family map.',
      solution: 'Add relatives once and let the app resolve direct and extended relations.',
      previewTitle: 'Every new node teaches the tree',
      from: ['Maa', 'Bua', 'Mama'],
      to: 'Resolved Rishta',
    },
    {
      icon: Send,
      title: 'Event Disorganization',
      desc: 'Invites, guest lists, and event memories live in separate places.',
      solution: 'Send invitations to family groups and collect shared memories together.',
      previewTitle: 'One invite reaches the right branch',
      from: ['Guest list', 'Photos', 'Updates'],
      to: 'Family Event',
    },
    {
      icon: MapPin,
      title: 'Hard to Find Relatives',
      desc: 'In new cities, people often do not know which relatives are nearby.',
      solution: 'Discover trusted relatives around a place or gathering.',
      previewTitle: 'New city, known people',
      from: ['Delhi', 'Pune', 'Jaipur'],
      to: 'Nearby Relatives',
    },
    {
      icon: Heart,
      title: 'Fear of Judgement',
      desc: 'People hesitate to post personal family moments publicly.',
      solution: 'A private courtyard makes emotional family sharing feel safer.',
      previewTitle: 'Private moments stay in the family',
      from: ['Public feed', 'Mixed audience', 'Noise'],
      to: 'Family-only',
    },
  ];

  const featureItems = [
    {
      icon: TreePine,
      title: 'Universal Family Tree',
      desc: 'Add yourself once and Familiar maps relatives and degrees of relation.',
      gradient: 'from-[#ff7f63] to-[#2d81ff]',
      snapshot: 'tree',
    },
    {
      icon: Shield,
      title: 'Privacy Controls',
      desc: 'Share posts, events, and announcements only up to the degree you choose.',
      gradient: 'from-[#2d81ff] to-[#1eb18a]',
      snapshot: 'privacy',
    },
    {
      icon: MapPin,
      title: 'Find Relatives Nearby',
      desc: 'Discover family in new cities, functions, or travel plans.',
      gradient: 'from-[#1eb18a] to-[#ffc457]',
      snapshot: 'nearby',
    },
    {
      icon: Send,
      title: 'One-Tap Invitations',
      desc: 'Invite entire family groups to weddings, rituals, and gatherings.',
      gradient: 'from-[#ffc457] to-[#ff7f63]',
      snapshot: 'invite',
    },
    {
      icon: Image,
      title: 'Family-First Media Sharing',
      desc: 'Shared galleries where everyone contributes photos and videos.',
      gradient: 'from-[#ff7f63] to-[#1eb18a]',
      snapshot: 'media',
    },
    {
      icon: Sparkles,
      title: 'Ancestor Mapping',
      desc: 'Trace generations of lineage and preserve stories over time.',
      gradient: 'from-[#2d81ff] to-[#ff7f63]',
      snapshot: 'ancestor',
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
        <span className="text-[16vh] font-black uppercase tracking-[0.25em] brand-wordmark whitespace-nowrap text-[#2A4365]/[0.07] dark:text-white/[0.05]" style={{ mixBlendMode: 'multiply' }}>
          Familiar
        </span>
      </motion.div>
      <motion.div 
        className="fixed bottom-4 left-0 right-0 z-[15] pointer-events-none md:hidden flex items-center whitespace-nowrap overflow-hidden" style={{ mixBlendMode: 'multiply' }}
      >
        <motion.span 
          style={{ x: watermarkX }} 
          className="text-[15vw] font-black uppercase tracking-widest brand-wordmark pl-4"
        >
          Familiar • Familiar • Familiar • Familiar • Familiar
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
                Family life is rich. The tools around it are fragmented.
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                Hover a challenge to see how Familiar turns scattered family moments into a connected, private relation graph.
              </p>
            </motion.div>

            <AnimatePresence mode="wait">
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
                    {activeProblem.from.map((label, index) => {
                      const points = [[70, 68], [180, 40], [304, 62]][index] || [70 + index * 100, 70];
                      return (
                        <g key={label}>
                          <circle cx={points[0]} cy={points[1]} r="24" fill="#ffffff" fillOpacity="0.92" />
                          <text x={points[0]} y={points[1] + 4} textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#17324f">{label}</text>
                        </g>
                      );
                    })}
                    <circle cx="180" cy="138" r="31" fill="#ffd98f" fillOpacity="0.96" />
                    <text x="180" y="135" textAnchor="middle" fontSize="9" fontWeight="900" fill="#17324f">Familiar</text>
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
            </AnimatePresence>
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
                <p className="text-[#2A4365] text-xs font-semibold uppercase tracking-[0.15em] mb-2">All Challenges, One Answer</p>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-950 mb-4 leading-tight">Core Features</h2>
                <p className="text-gray-600 max-w-lg leading-relaxed">
                  Hover a feature to preview the product moment behind it.
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
                <div className="rounded-[1.35rem] bg-[linear-gradient(145deg,rgba(22,49,77,0.98),rgba(8,21,34,0.98))] border border-white/10 overflow-hidden">
                  <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div>
                      <h3 className="text-white text-xl font-bold mt-1">{activeFeature.title}</h3>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${activeFeature.gradient} flex items-center justify-center`}>
                      <activeFeature.icon size={22} className="text-white" />
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="relative h-72 rounded-3xl bg-white/[0.055] border border-white/10 overflow-hidden">
                      <svg viewBox="0 0 390 290" className="absolute inset-0 h-full w-full">
                        {activeFeature.snapshot === 'tree' && (
                          <g>
                            <path d="M195 138 L112 78 L62 48" stroke="#ffba78" strokeWidth="3" strokeLinecap="round" />
                            <path d="M195 138 L278 78 L328 48" stroke="#ffba78" strokeWidth="3" strokeLinecap="round" />
                            <path d="M195 138 L144 220" stroke="#70e4c1" strokeWidth="3" strokeLinecap="round" />
                            <path d="M195 138 L246 220" stroke="#70e4c1" strokeWidth="3" strokeLinecap="round" />
                            {[[195, 138, 'ME'], [112, 78, 'Maa'], [278, 78, 'Papa'], [62, 48, 'Nani'], [328, 48, 'Dada'], [144, 220, 'Bhai'], [246, 220, 'Bua']].map(([cx, cy, label]) => (
                              <g key={label as string}>
                                <circle cx={cx as number} cy={cy as number} r="24" fill="#fff7df" />
                                <text x={cx as number} y={(cy as number) + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill="#17324f">{label}</text>
                              </g>
                            ))}
                          </g>
                        )}
                        {activeFeature.snapshot === 'privacy' && (
                          <g>
                            <rect x="58" y="54" width="274" height="44" rx="16" fill="#ffffff" fillOpacity="0.92" />
                            <text x="82" y="81" fontSize="12" fontWeight="900" fill="#17324f">Share with: Family up to 2nd degree</text>
                            {[76, 138, 200, 262, 324].map((cx, index) => (
                              <g key={cx}>
                                <circle cx={cx} cy="172" r={index < 3 ? 28 : 20} fill={index < 3 ? '#bff3d5' : '#ffffff'} fillOpacity={index < 3 ? 1 : 0.28} />
                                <text x={cx} y="177" textAnchor="middle" fontSize="10" fontWeight="900" fill={index < 3 ? '#17324f' : '#ffffff'}>{index + 1}</text>
                              </g>
                            ))}
                            <path d="M76 172 L324 172" stroke="#ffd98f" strokeWidth="2" strokeDasharray="5 6" />
                          </g>
                        )}
                        {activeFeature.snapshot === 'nearby' && (
                          <g>
                            <path d="M60 225 C120 130 180 240 238 132 C280 58 330 104 342 62" stroke="#70e4c1" strokeWidth="3" fill="none" />
                            {[[108, 155, 'Maasi'], [206, 204, 'Mama'], [282, 94, 'Bua']].map(([cx, cy, label]) => (
                              <g key={label as string}>
                                <circle cx={cx as number} cy={cy as number} r="25" fill="#b7e5ff" />
                                <text x={cx as number} y={(cy as number) + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill="#17324f">{label}</text>
                              </g>
                            ))}
                            <circle cx="195" cy="145" r="44" fill="#ffba78" fillOpacity="0.18" stroke="#ffba78" strokeWidth="2" />
                            <text x="195" y="148" textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff">You</text>
                          </g>
                        )}
                        {activeFeature.snapshot === 'invite' && (
                          <g>
                            <rect x="52" y="48" width="286" height="168" rx="24" fill="#fff7df" />
                            <text x="88" y="88" fontSize="18" fontWeight="900" fill="#17324f">Wedding Invite</text>
                            <text x="88" y="114" fontSize="11" fontWeight="700" fill="#49627d">Send to paternal + maternal family</text>
                            <rect x="88" y="145" width="88" height="26" rx="13" fill="#17324f" />
                            <text x="132" y="162" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">42 sent</text>
                            <path d="M236 112 L300 78 L288 152 Z" fill="#ff7f63" />
                          </g>
                        )}
                        {activeFeature.snapshot === 'media' && (
                          <g>
                            {[52, 134, 216].map((x, index) => (
                              <g key={x}>
                                <rect x={x} y={64 + index * 22} width="116" height="88" rx="18" fill={['#ffd98f', '#b7e5ff', '#bff3d5'][index]} />
                                <circle cx={x + 30} cy={94 + index * 22} r="13" fill="#17324f" fillOpacity="0.28" />
                                <path d={`M${x + 16} ${130 + index * 22}L${x + 55} ${104 + index * 22}L${x + 100} ${135 + index * 22}`} stroke="#17324f" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.38" />
                              </g>
                            ))}
                          </g>
                        )}
                        {activeFeature.snapshot === 'ancestor' && (
                          <g>
                            {[44, 94, 144, 194, 244].map((y, index) => (
                              <g key={y}>
                                <line x1="195" y1={y + 30} x2="195" y2={y + 50} stroke="#ffd98f" strokeWidth="2.4" />
                                <rect x={100 + index * 12} y={y} width={190 - index * 24} height="34" rx="17" fill="#ffffff" fillOpacity={0.95 - index * 0.1} />
                                <text x="195" y={y + 22} textAnchor="middle" fontSize="10" fontWeight="900" fill="#17324f">{index === 0 ? 'You' : `${index + 1} generations back`}</text>
                              </g>
                            ))}
                          </g>
                        )}
                      </svg>
                    </div>
                  </div>
                </div>
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
              To build the world&apos;s first universal family network - a living digital courtyard where every person can trace their roots, celebrate family bonds, and connect with relatives anywhere.
            </motion.h2>
          </motion.div>
          <motion.p 
            style={{ x: visionX, opacity: visionOpacity }}
            className="text-white/60 text-base leading-relaxed max-w-xl mx-auto"
          >
            Reviving the warmth of the traditional Indian courtyard, but on a global scale - creating a trusted, private space for generations to come.
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4">A massive, untapped market</h2>
        </motion.div>
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { stat: '1.4B+', label: 'People in India', sub: 'with family at the core' },
            { stat: '80%', label: 'Social Interactions', sub: 'are among family & friends' },
            { stat: '$8B+', label: 'Ancestry Market', sub: 'expected by 2030' },
            { stat: '∞', label: 'Family Events', sub: 'multi-billion dollar ecosystem' },
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
            It feels Familiar.
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            A place where every relation matters. Start building your family&apos;s living tree today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onSignUp}
              className="w-full sm:w-auto bg-[#2A4365] text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-[#2A4365]/90 active:scale-[0.97] transition-all shadow-xl shadow-[#2A4365]/20 flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight size={18} />
            </button>
            <button
              onClick={onSignIn}
              className="w-full sm:w-auto border-2 border-gray-300 text-gray-500 px-8 py-4 rounded-2xl font-semibold text-base hover:border-[#2A4365]/40 hover:text-[#2A4365] active:scale-[0.97] transition-all"
            >
              Sign In
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-200/30 relative" style={{ background: 'transparent' }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandLogo size={16} />
            <span className="brand-wordmark text-sm text-gray-900">Familiar</span>
            <span className="text-xs text-gray-500">- The Digital Courtyard</span>
          </div>
          <p className="text-xs text-gray-500">
            Built by Ranveer Gautam · ranveer.aangan@gmail.com
          </p>
        </div>
      </footer>
    </div>
  );
}
