const fs = require('fs');
const path = './components/welcome/DeferredLandingSections.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Extract FeatureSnapshot component
const snapshotStart = content.indexOf('<div className="rounded-[1.35rem] bg-[linear-gradient');
const snapshotEnd = content.indexOf('</motion.div>', snapshotStart);
let snapshotJSX = content.substring(snapshotStart, snapshotEnd).trim();
// Remove the trailing </div> of the snapshot div wrapper
snapshotJSX = snapshotJSX.replace(/<\/div>\s*$/, '');

const featureSnapshotComponent = `
function FeatureSnapshot({ activeFeature }: { activeFeature: any }) {
  return (
    ${snapshotJSX}
  );
}
`;

// Insert the component before DeferredLandingSections
content = content.replace('export default function DeferredLandingSections', featureSnapshotComponent + '\nexport default function DeferredLandingSections');

// 2. Replace the original snapshot location with the component (on desktop)
content = content.replace(snapshotJSX, '<FeatureSnapshot activeFeature={activeFeature} />');

// 3. Update FeatureScrollCard to use useInView and render accordion on mobile
const featureScrollCardTarget = `  const isHovered = hoveredIndex === index;

  return (`;

const featureScrollCardReplacement = `  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = import_framer.useInView(cardRef, { margin: "-20%" });
  
  import_react.useEffect(() => {
    if (!isInView && hoveredIndex === index) {
      setHovered(-1);
    }
  }, [isInView, hoveredIndex, index, setHovered]);

  const isHovered = hoveredIndex === index;

  return (`;

// We need to add imports if we use them
content = content.replace("import { useState, useRef } from 'react';", "import { useState, useRef, useEffect as import_react_useEffect } from 'react';");
content = content.replace("import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'motion/react';", "import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView as import_framer_useInView } from 'motion/react';");

content = content.replace(featureScrollCardTarget, `  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = import_framer_useInView(cardRef, { margin: "-20%" });
  
  import_react_useEffect(() => {
    if (!isInView && hoveredIndex === index) {
      setHovered(-1);
    }
  }, [isInView, hoveredIndex, index, setHovered]);

  const isHovered = hoveredIndex === index;

  return (`);

// Apply ref to FeatureScrollCard root
content = content.replace('<motion.div style={{ y: ySpring, opacity: opacityRaw }} className="relative">', '<motion.div ref={cardRef} style={{ y: ySpring, opacity: opacityRaw }} className="relative">');

// Add the accordion inside FeatureScrollCard
const accordionJSX = `
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
`;
content = content.replace('</motion.button>\n    </motion.div>', '</motion.button>\n' + accordionJSX + '    </motion.div>');

// Hide desktop snapshot on mobile
content = content.replace('className="rounded-[2rem] border border-gray-200 bg-[#07121e] p-4 shadow-2xl shadow-gray-900/16 max-w-3xl ml-auto"', 'className="hidden lg:block rounded-[2rem] border border-gray-200 bg-[#07121e] p-4 shadow-2xl shadow-gray-900/16 max-w-3xl ml-auto"');

// Fix watermark on mobile
const watermarkMobileTarget = `className="fixed bottom-0 left-0 right-0 z-[5] pointer-events-none md:hidden text-[#2A4365]/[0.08] dark:text-white/[0.06] flex items-center whitespace-nowrap overflow-hidden"`;
const watermarkMobileReplacement = `className="fixed bottom-4 left-0 right-0 z-[15] pointer-events-none md:hidden flex items-center whitespace-nowrap overflow-hidden" style={{ mixBlendMode: 'multiply' }}`;
content = content.replace(watermarkMobileTarget, watermarkMobileReplacement);

// Fix the activeFeature fallback so -1 doesn't crash desktop
content = content.replace('const activeFeature = featureItems[hoveredFeature] || featureItems[0];', 'const activeFeature = featureItems[hoveredFeature] || featureItems[0];'); // Wait, if hoveredFeature is -1, featureItems[-1] is undefined, so || featureItems[0] handles it!

fs.writeFileSync(path, content, 'utf8');
console.log('Refactor complete.');
