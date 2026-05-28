const fs = require('fs');
const path = './components/welcome/DeferredLandingSections.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove onViewportLeave
const target = `      onViewportLeave={() => {
        if (hoveredIndex === index) setHovered(-1);
      }}`;
content = content.replace(target, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Removed onViewportLeave');
