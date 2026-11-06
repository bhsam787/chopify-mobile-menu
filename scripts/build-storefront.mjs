// Bundles the storefront loader and the full menu (packages/menu-renderer) into
// the theme app extension's assets. Run by `npm run dev` and `npm run build`.
import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

const outdir = "extensions/chopify-menu/assets";
const watch = process.argv.includes("--watch");

const options = {
  entryPoints: {
    "chopify-menu": "packages/menu-renderer/src/storefront.ts",
    "chopify-menu-app": "packages/menu-renderer/src/menu-app.ts",
  },
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020", "safari14"],
  legalComments: "none",
  outdir,
  logLevel: "info",
};

if (watch) {
  const { context } = await import("esbuild");
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
  for (const name of ["chopify-menu.js", "chopify-menu-app.js"]) {
    const size = gzipSync(readFileSync(`${outdir}/${name}`)).length;
    console.log(`${name}: ${(size / 1024).toFixed(1)} KB gzipped`);
  }
}
