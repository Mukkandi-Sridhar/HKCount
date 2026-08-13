/**
 * generate-icons.mjs
 * Generates PWA icon PNGs using the Canvas API via node-canvas (if available)
 * or falls back to writing minimal placeholder PNGs using raw bytes.
 *
 * Run with: node scripts/generate-icons.mjs
 */

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

function drawLotus(ctx, cx, cy, size) {
  const r = size * 0.38;
  const petalCount = 8;
  const petalLen = r * 0.9;
  const petalW = r * 0.38;

  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, size, size);

  // Glow
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
  glow.addColorStop(0, 'rgba(245,166,35,0.18)');
  glow.addColorStop(1, 'rgba(245,166,35,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Petals
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const grad = ctx.createLinearGradient(0, 0, 0, -petalLen);
    grad.addColorStop(0, '#e8890c');
    grad.addColorStop(0.5, '#f5a623');
    grad.addColorStop(1, '#fcd34d');

    ctx.beginPath();
    ctx.ellipse(0, -petalLen * 0.55, petalW * 0.5, petalLen * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.restore();
  }

  // Inner petals (smaller, brighter)
  for (let i = 0; i < petalCount; i++) {
    const angle = ((i + 0.5) / petalCount) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const grad = ctx.createLinearGradient(0, 0, 0, -petalLen * 0.6);
    grad.addColorStop(0, '#f5a623');
    grad.addColorStop(1, '#fef3c7');

    ctx.beginPath();
    ctx.ellipse(0, -petalLen * 0.35, petalW * 0.35, petalLen * 0.38, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.restore();
  }

  // Center circle
  ctx.globalAlpha = 1;
  const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.1);
  cGrad.addColorStop(0, '#fef3c7');
  cGrad.addColorStop(0.5, '#f5a623');
  cGrad.addColorStop(1, '#e8890c');
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = cGrad;
  ctx.fill();
}

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  drawLotus(ctx, size / 2, size / 2, size);
  return canvas.toBuffer('image/png');
}

try {
  for (const size of [192, 512]) {
    const buf = generateIcon(size);
    writeFileSync(join(OUT, `pwa-${size}x${size}.png`), buf);
    console.log(`✓ Generated ${size}x${size} icon`);
  }
  console.log('Icons generated successfully!');
} catch (e) {
  console.error('canvas not available:', e.message);
  console.log('Falling back to placeholder icons...');
  // Write minimal 1x1 PNG placeholders so the build doesn't break
  // (replace with real icons before shipping)
  const PLACEHOLDER = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  for (const size of [192, 512]) {
    writeFileSync(join(OUT, `pwa-${size}x${size}.png`), PLACEHOLDER);
    console.log(`✓ Wrote placeholder for ${size}x${size}`);
  }
}
