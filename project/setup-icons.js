// This script copies the generated app icon into public/icons/
// Run: node setup-icons.js
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'public', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

const src = '/home/ranveergautam/.gemini/antigravity/brain/ce7c9d4c-3710-4e38-9435-994c4f404aeb/aangan_icon_1778228800299.png';

if (fs.existsSync(src)) {
  fs.copyFileSync(src, path.join(iconsDir, 'icon-512.png'));
  fs.copyFileSync(src, path.join(iconsDir, 'icon-192.png'));
  console.log('✅ Icons created:', fs.readdirSync(iconsDir));
} else {
  console.log('Source icon not found at:', src);
  console.log('Creating placeholder SVG icons...');
  
  // Create simple SVG icon as fallback
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#fff7ed"/>
  <g transform="translate(256,240)" fill="#f97316">
    <rect x="-8" y="40" width="16" height="80" rx="4"/>
    <circle r="60" cy="-20" fill="none" stroke="#f97316" stroke-width="16"/>
    <circle r="30" cx="-40" cy="20" fill="none" stroke="#f97316" stroke-width="12"/>
    <circle r="30" cx="40" cy="20" fill="none" stroke="#f97316" stroke-width="12"/>
    <circle r="20" cx="0" cy="-50" fill="#f97316"/>
  </g>
  <text x="256" y="420" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="60" fill="#f97316">Aangan</text>
</svg>`;

  fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), svg);
  fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), svg);
  console.log('⚠️ Created SVG placeholders. For proper PWA, replace with PNG icons.');
}
