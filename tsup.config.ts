import { defineConfig } from "tsup";

// Dual ESM + CJS build with type declarations for both. The CJS output uses
// `.cjs` / `.d.cts` so it resolves correctly under `exports.require`.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node20",
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
});
