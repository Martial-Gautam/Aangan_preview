const fs = require('fs');
const path = './components/welcome/DeferredLandingSections.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Extract ProblemSnapshot
const problemSnapshotJSX = `
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
              </motion.div>`;

// Insert the component definition
content = content.replace('function FeatureSnapshot', `function ProblemSnapshot({ activeProblem }: { activeProblem: any }) {\n  return (\n${problemSnapshotJSX}\n  );\n}\n\nfunction FeatureSnapshot`);

// Replace the original with the component call
const originalSnapshotStart = content.indexOf('<AnimatePresence mode="wait">', content.indexOf('The Challenge'));
const originalSnapshotEnd = content.indexOf('</AnimatePresence>', originalSnapshotStart) + '</AnimatePresence>'.length;
const originalSnapshotBlock = content.substring(originalSnapshotStart, originalSnapshotEnd);

content = content.replace(originalSnapshotBlock, '<div className="hidden lg:block">\n              <AnimatePresence mode="wait">\n                <ProblemSnapshot activeProblem={activeProblem} />\n              </AnimatePresence>\n            </div>');

// 2. Fix ProblemScrollCard accordion logic and onViewportLeave
const problemCardOld = `      <AnimatePresence>
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
      </AnimatePresence>`;

const problemCardNew = `      <AnimatePresence>
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
      </AnimatePresence>`;
content = content.replace(problemCardOld, problemCardNew);

// Add onViewportLeave to ProblemScrollCard
content = content.replace('<motion.div style={{ y: ySpring, opacity: opacityRaw }} className={`relative ${isOddColumn ? \'mt-10\' : \'\'}`}>', '<motion.div style={{ y: ySpring, opacity: opacityRaw }} className={`relative ${isOddColumn ? \'mt-10\' : \'\'}`} onViewportLeave={() => { if (hoveredIndex === index) setHovered(-1); }}>');

// Add toggle onClick for ProblemScrollCard and FeatureScrollCard
content = content.replace('onFocus={() => setHovered(index)}', 'onFocus={() => setHovered(index)}\n        onClick={() => setHovered(isHovered ? -1 : index)}');
content = content.replace('onFocus={() => setHovered(index)}', 'onFocus={() => setHovered(index)}\n        onClick={() => setHovered(isHovered ? -1 : index)}');

// 3. Fix Familiar Watermark background and opacity
const watermarkTarget = `className="fixed bottom-4 left-0 right-0 z-[15] pointer-events-none md:hidden flex items-center whitespace-nowrap overflow-hidden" style={{ mixBlendMode: 'multiply' }}`;
const watermarkReplacement = `className="fixed bottom-0 left-0 right-0 z-[15] pointer-events-none md:hidden flex flex-col justify-end whitespace-nowrap overflow-hidden pt-12 pb-2 bg-gradient-to-t from-white via-white/80 to-transparent" style={{ mixBlendMode: 'multiply' }}`;
content = content.replace(watermarkTarget, watermarkReplacement);
// Make it a bit more visible
content = content.replace('text-[#2A4365]/[0.08] dark:text-white/[0.06]', 'text-[#2A4365]/[0.12] dark:text-white/[0.1]'); // For mobile? wait, in mobile it's text-[#2A4365]/[0.07]
content = content.replace('text-[#2A4365]/[0.07] dark:text-white/[0.05]', 'text-[#2A4365]/[0.15] dark:text-white/[0.12]'); // For mobile text

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed problems');
