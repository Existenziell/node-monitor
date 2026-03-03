#!/usr/bin/env node
/**
 * Normalize all pool SVG icons to viewBox="0 0 32 32" and remove width/height
 * so they render at a consistent size when used with the same CSS dimensions.
 */
const fs = require('fs');
const path = require('path');

const POOLS_DIR = path.join(__dirname, '..', 'data', 'icons', 'pools');
const TARGET_SIZE = 32;

const files = fs.readdirSync(POOLS_DIR).filter((f) => f.endsWith('.svg'));

for (const file of files) {
  const filePath = path.join(POOLS_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const viewBoxMatch = content.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!viewBoxMatch) {
    console.warn(`Skip ${file}: no viewBox`);
    continue;
  }
  const vb = viewBoxMatch[1].trim();
  const parts = vb.split(/[\s,]+/).map(Number);
  const [minX = 0, minY = 0, w = 32, h = 32] = parts;
  if (!w || !h || !Number.isFinite(w) || !Number.isFinite(h)) {
    console.warn(`Skip ${file}: invalid viewBox`);
    continue;
  }
  if (vb === '0 0 32 32') {
    console.log(`Skip ${file}: already normalized`);
    continue;
  }

  const scale = TARGET_SIZE / Math.max(w, h);
  const cx = minX + w / 2;
  const cy = minY + h / 2;

  const innerMatch = content.match(/<svg[\s\S]*?>([\s\S]*?)<\/svg>\s*$/im);
  if (!innerMatch) {
    console.warn(`Skip ${file}: could not extract inner content`);
    continue;
  }
  const inner = innerMatch[1].trim();

  let newOpen = content.match(/<svg[\s\S]*?>/)[0]
    .replace(/\s*width\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*height\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*style\s*=\s*["'][^"']*["']/gi, '')
    .replace(/viewBox\s*=\s*["'][^"']*["']/i, 'viewBox="0 0 32 32"');
  if (!newOpen.includes('xmlns=')) {
    newOpen = newOpen.replace(/<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const transform = `translate(16, 16) scale(${scale}) translate(${-cx}, ${-cy})`;
  const wrapped = `<g transform="${transform}">\n${inner}\n</g>`;

  const newContent = newOpen + '\n' + wrapped + '\n</svg>\n';
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Normalized ${file} (viewBox was ${w}x${h})`);
}

console.log(`Done. Normalized ${files.length} SVGs.`);
