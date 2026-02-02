import fs from "node:fs";
import sharp from "sharp";

const svgPath = "assets/brand/logo.svg";
const outDir = "assets/images";

fs.mkdirSync(outDir, { recursive: true });
const svg = fs.readFileSync(svgPath);

// scale = how big the logo is inside the square canvas
async function out(name, size, { bg = null, scale = 0.60, biasX = 0 } = {}) {
  const inner = Math.round(size * scale);
  const pad = Math.round((size - inner) / 2);

  let img = sharp(svg, { density: 300 })
    .resize(inner, inner, { fit: "contain" })
    .extend({
      top: pad,
      bottom: pad,
      left: pad - biasX,
      right: pad + biasX,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    });

  if (bg) img = img.flatten({ background: bg });

  await img.png().toFile(`${outDir}/${name}`);
}

// adaptive icons (optically centered)
await out("android-icon-foreground.png", 1024, {
  scale: 0.60,
  biasX: Math.round(1024 * 0.02),
});

await out("android-icon-monochrome.png", 1024, {
  scale: 0.60,
  biasX: Math.round(1024 * 0.02),
});

// splash
await out("splash-icon.png", 1024, { scale: 0.55 });

// misc
await out("favicon.png", 64, { bg: "#000000", scale: 0.70 });
await out("icon.png", 1024, { bg: "#000000", scale: 0.72 });

console.log("Exported logo PNGs");
