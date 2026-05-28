const fs = require('fs');
const path = './components/welcome/DeferredLandingSections.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove the injected useInView logic completely from the entire file!
content = content.replace(/const cardRef = useRef<HTMLDivElement>\(null\);\s*const isInView = import_framer_useInView\(cardRef, \{ margin: "-20%" \}\);\s*import_react_useEffect\(\(\) => \{\s*if \(\!isInView && hoveredIndex === index\) \{\s*setHovered\(-1\);\s*\}\s*\}, \[isInView, hoveredIndex, index, setHovered\]\);/g, '');

content = content.replace(/ref=\{cardRef\} /g, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Removed useInView effects.');
