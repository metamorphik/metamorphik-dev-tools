import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  format: ["esm", "cjs"],
  clean: true,
  minify: false,
  sourcemap: true,
  treeshake: true,
  target: "es2020",
  platform: "browser",
  splitting: false, // keep a single file per format for easy consumption
  // Externalize peer deps automatically
  external: ["react"]
});
