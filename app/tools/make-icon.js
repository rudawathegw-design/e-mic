// make-icon.js — generate the E Mic app/installer icon from the website's
// "brandmark" (5-bar equaliser) logo. Outputs build/icon.png (512) and a
// multi-size build/icon.ico. Run: node tools/make-icon.js
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildDir = join(__dirname, "..", "build");
mkdirSync(buildDir, { recursive: true });

const PRIMARY = "#D97757";
const PRIMARY_STRONG = "#C2603E";
const CREAM = "#FAF9F5";

// 5 bars, heights mirror site.css .brandmark (7,16,11,20,8), bottom-aligned.
const S = 512;
const ratios = [0.35, 0.8, 0.55, 1.0, 0.4];
const barW = 46, gap = 30, maxH = 210, radius = 22, corner = 104;
const totalW = ratios.length * barW + (ratios.length - 1) * gap;
const startX = (S - totalW) / 2;
const baseline = S / 2 + maxH / 2; // vertical centre of the group

let bars = "";
ratios.forEach((r, i) => {
  const h = Math.round(maxH * r);
  const x = startX + i * (barW + gap);
  const y = baseline - h;
  bars += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="${radius}" ry="${radius}" fill="url(#g)"/>`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PRIMARY}"/>
      <stop offset="1" stop-color="${PRIMARY_STRONG}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${S}" height="${S}" rx="${corner}" ry="${corner}" fill="${CREAM}"/>
  ${bars}
</svg>`;

const pngBuf = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(join(buildDir, "icon.png"), pngBuf);

// Build a multi-size .ico that embeds PNG images (Vista+ format).
const sizes = [16, 24, 32, 48, 64, 128, 256];
const images = await Promise.all(
  sizes.map((sz) => sharp(Buffer.from(svg)).resize(sz, sz).png().toBuffer())
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);          // type: icon
header.writeUInt16LE(sizes.length, 4);

const dir = Buffer.alloc(16 * sizes.length);
let offset = 6 + 16 * sizes.length;
images.forEach((img, i) => {
  const sz = sizes[i];
  const b = dir.subarray(i * 16, i * 16 + 16);
  b.writeUInt8(sz >= 256 ? 0 : sz, 0); // width  (0 == 256)
  b.writeUInt8(sz >= 256 ? 0 : sz, 1); // height
  b.writeUInt8(0, 2);                  // palette
  b.writeUInt8(0, 3);                  // reserved
  b.writeUInt16LE(1, 4);               // colour planes
  b.writeUInt16LE(32, 6);              // bits per pixel
  b.writeUInt32LE(img.length, 8);      // image size
  b.writeUInt32LE(offset, 12);         // image offset
  offset += img.length;
});

writeFileSync(join(buildDir, "icon.ico"), Buffer.concat([header, dir, ...images]));
console.log("Wrote build/icon.png and build/icon.ico (" + sizes.join(",") + ")");
