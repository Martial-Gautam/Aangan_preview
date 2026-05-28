const fs = require('fs');
const path = './components/welcome/DeferredLandingSections.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix duplicate onClick
content = content.replace(/onClick=\{\(\) => setHovered\(isHovered \? -1 : index\)\}\n\s*onClick=\{\(\) => setHovered\(isHovered \? -1 : index\)\}/g, 'onClick={() => setHovered(isHovered ? -1 : index)}');

// Fix implicitly any types
content = content.replace(/activeProblem\.from\.map\(\(label, index\)/g, 'activeProblem.from.map((label: string, index: number)');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed TS errors');
