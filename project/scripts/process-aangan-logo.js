const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const source = '/home/ranveergautam/Downloads/logo - aangan.png';
const outDir = path.join(__dirname, '..', 'public', 'brand');
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

(async () => {
  if (!fs.existsSync(source)) {
    throw new Error(`Source logo not found: ${source}`);
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(iconsDir, { recursive: true });

  fs.copyFileSync(source, path.join(outDir, 'aangan-logo-source.png'));

  const base = sharp(source).ensureAlpha();
  const { data, info } = await base.raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const y = Math.floor(pixelIndex / info.width);
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Keep only warm red/orange strokes, drop all neutral background shades.
    const keepStroke = r > 80 && r >= g + 10 && r >= b + 10;
    const inBottomNoiseBand = y > info.height * 0.82;
    if (!keepStroke || inBottomNoiseBand) {
      data[i + 3] = 0;
    }
  }

  const transparent = sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  });

  const trimmedBuffer = await transparent
    .trim({ threshold: 8 })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const cleanLogoPath = path.join(outDir, 'aangan-logo.png');
  await sharp(trimmedBuffer)
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(cleanLogoPath);

  // PWA icons
  await sharp(cleanLogoPath)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'icon-512.png'));

  await sharp(cleanLogoPath)
    .resize(192, 192, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'icon-192.png'));

  console.log('✅ Logo assets generated');
})();
