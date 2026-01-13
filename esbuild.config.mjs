import esbuild from "esbuild";
import process from "process";

const prod = !process.argv.includes("--watch");
const analyze = process.argv.includes("--analyze");

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "node-pty"],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: prod,
  platform: "node",
  metafile: analyze,
});

if (prod) {
  const result = await context.rebuild();

  if (analyze && result.metafile) {
    const text = await esbuild.analyzeMetafile(result.metafile, { verbose: true });
    console.log("\n📊 Bundle Analysis:\n");
    console.log(text);
  }

  process.exit(0);
} else {
  await context.watch();
}
