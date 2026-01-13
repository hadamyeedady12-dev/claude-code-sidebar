import esbuild from "esbuild";
import process from "process";

const prod = !process.argv.includes("--watch");

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron"],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: prod,
  platform: "node",
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
