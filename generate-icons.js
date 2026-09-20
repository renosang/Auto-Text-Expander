const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Modern SVG icon: rounded squircle with vibrant purple-indigo gradient, glowing expansion symbol (A -> expanded waves or text expansion lightning)
const getSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1" />
      <stop offset="50%" stop-color="#4F46E5" />
      <stop offset="100%" stop-color="#2563EB" />
    </linearGradient>
    <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="${size * 0.03}" stdDeviation="${size * 0.04}" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Base Squircle -->
  <rect x="${size * 0.05}" y="${size * 0.05}" width="${size * 0.9}" height="${size * 0.9}" rx="${size * 0.22}" fill="url(#bgGrad)" filter="url(#shadow)" />
  
  <!-- Inner subtle border -->
  <rect x="${size * 0.06}" y="${size * 0.06}" width="${size * 0.88}" height="${size * 0.88}" rx="${size * 0.21}" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="${Math.max(1, size * 0.02)}" />

  <!-- Text "T" or Expansion symbol -->
  <g fill="#FFFFFF" transform="translate(${size * 0.2}, ${size * 0.22})">
    <!-- Capital T -->
    <path d="
      M 0,0 
      L ${size * 0.35},0 
      L ${size * 0.35},${size * 0.1} 
      L ${size * 0.22},${size * 0.1} 
      L ${size * 0.22},${size * 0.52} 
      L ${size * 0.13},${size * 0.52} 
      L ${size * 0.13},${size * 0.1} 
      L 0,${size * 0.1} 
      Z" 
      fill="#FFFFFF" />
  </g>

  <!-- Speed / Expansion Arrow / Flash -->
  <path d="
    M ${size * 0.55} ${size * 0.30}
    L ${size * 0.72} ${size * 0.44}
    L ${size * 0.60} ${size * 0.47}
    L ${size * 0.78} ${size * 0.68}
    L ${size * 0.56} ${size * 0.55}
    L ${size * 0.65} ${size * 0.51}
    Z"
    fill="url(#boltGrad)" />
</svg>
`;

async function generate() {
  const sizes = [16, 32, 48, 128];
  for (const size of sizes) {
    const svg = Buffer.from(getSvg(size));
    const dest = path.join(iconsDir, `icon${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(dest);
    console.log(`Generated ${dest} (${size}x${size})`);
  }
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
