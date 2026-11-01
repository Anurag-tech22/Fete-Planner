// Performance budget: fails the build if the gzipped JavaScript exceeds the limit.
import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const LIMIT_KB = 100;
const dir = new URL("../dist/assets/", import.meta.url);
const bytes = readdirSync(dir)
  .filter((f) => f.endsWith(".js"))
  .reduce((sum, f) => sum + gzipSync(readFileSync(new URL(f, dir))).length, 0);
const kb = bytes / 1024;
console.log(`JS bundle (gzip): ${kb.toFixed(1)} kB (budget ${LIMIT_KB} kB)`);
if (kb > LIMIT_KB) {
  console.error("Performance budget exceeded.");
  process.exit(1);
}
