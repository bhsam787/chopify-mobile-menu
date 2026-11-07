// Bundles the storefront loader and the full menu (packages/menu-renderer) into
// the theme app extension's assets. Run by `npm run dev`, `build` and `deploy`.
import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

const outdir = "extensions/chopi-menu/assets";
const entryPoints = {
  "chopi-menu": "packages/menu-renderer/src/storefront.ts",
  "chopi-menu-app": "packages/menu-renderer/src/menu-app.ts",
};

await build({
  entryPoints,
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020", "safari14"],
  legalComments: "none",
  outdir,
  logLevel: "info",
});

for (const name of Object.keys(entryPoints)) {
  const size = gzipSync(readFileSync(`${outdir}/${name}.js`)).length;
  console.log(`${name}.js: ${(size / 1024).toFixed(1)} KB gzipped`);
}
