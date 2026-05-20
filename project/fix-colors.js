const fs = require('fs');
const path = require('path');

// Color mappings: old -> new
const replacements = [
  // Primary green
  ['#355E3B', '#1B4332'],
  // Secondary green  
  ['#6E8B74', '#1B4332'],
  // Gold accent
  ['#C9A66B', '#1B4332'],
  // Earth backgrounds
  ['#FAF7F2', '#ffffff'],
  ['#EFE6D5', '#f3f4f6'],
  // Brown/terracotta
  ['#8B5E3C', '#1B4332'],
  ['#B76E5D', '#ef4444'],
  ['#6B2E2E', '#dc2626'],
  // Old neutrals -> clean grays
  ['#5E5E5E', '#6b7280'],
  ['#2B2B2B', '#111827'],
];

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.next') continue;
      results = results.concat(walkDir(filePath));
    } else if (file.endsWith('.tsx')) {
      results.push(filePath);
    }
  }
  return results;
}

const dirs = [
  '/home/ranveergautam/Aangan/aangan_bolt/project/app',
  '/home/ranveergautam/Aangan/aangan_bolt/project/components',
];

let totalChanges = 0;
for (const dir of dirs) {
  const files = walkDir(dir);
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const [old, newColor] of replacements) {
      const regex = new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const before = content;
      content = content.replace(regex, newColor);
      if (content !== before) changed = true;
    }
    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      totalChanges++;
      console.log('Updated:', file.replace('/home/ranveergautam/Aangan/aangan_bolt/project/', ''));
    }
  }
}
console.log(`\nTotal files updated: ${totalChanges}`);
