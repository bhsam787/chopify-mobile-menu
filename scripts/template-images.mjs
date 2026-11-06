// Template sample images.
//   node scripts/template-images.mjs placeholders   → writes soft SVG placeholders for entries
//                                                     whose "file" is still an .svg
// Real images are WebP (max 800px) in public/templates/<group>/<name>.webp; set "file" in
// packages/menu-core/src/templates/images.json accordingly. Prompts are kept for regenerating.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const manifest = JSON.parse(readFileSync("packages/menu-core/src/templates/images.json", "utf8"));
const mode = process.argv[2];

if (mode === "placeholders") {
  for (const image of manifest.filter((entry) => entry.file.endsWith(".svg"))) {
    const file = `public/templates/${image.file}`;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(
      file,
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><defs><radialGradient id="g" cx="65%" cy="35%" r="80%"><stop offset="0" stop-color="#ffffff" stop-opacity=".75"/><stop offset="1" stop-color="${image.tint}"/></radialGradient></defs><rect width="800" height="800" fill="${image.tint}"/><rect width="800" height="800" fill="url(#g)"/><circle cx="400" cy="430" r="150" fill="#000" fill-opacity=".06"/></svg>`,
    );
  }
  console.log(`${manifest.length} placeholders written`);
} else {
  console.log("Usage: node scripts/template-images.mjs placeholders");
}
