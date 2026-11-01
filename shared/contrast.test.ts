import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Automated WCAG 2.2 AA contrast check, read straight from the shipped stylesheet (light and dark themes). */
const css = readFileSync(new URL("../client/styles.css", import.meta.url), "utf8");
const vars = (s: string) =>
  Object.fromEntries([...s.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,6})\b/gi)].map((m) => [m[1], m[2]]));
const [lightCss = "", darkCss = ""] = css.split(/@media\s*\(prefers-color-scheme:\s*dark\)/);
const light = vars(lightCss);
const dark = { ...light, ...vars(darkCss.slice(0, 900)) };

const lum = (hex: string) => {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

const TEXT_PAIRS: [string, string][] = [
  ["ink", "bg"],
  ["ink", "card"],
  ["mut", "bg"],
  ["mut", "card"],
  ["on-acc", "acc"],
  ["bad", "card"],
  ["ok", "card"],
  ["acc", "bg"],
];
describe.each([
  ["light", light],
  ["dark", dark],
] as const)("%s theme contrast", (_n, t) => {
  it.each(TEXT_PAIRS)("%s on %s ≥ 4.5:1 (text)", (fg, bg) =>
    expect(ratio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5),
  );
  it("focus colour ≥ 3:1 against the page (non-text)", () =>
    expect(ratio(t["acc2"]!, t["bg"]!)).toBeGreaterThanOrEqual(3));
});
it("dark theme overrides the palette", () => expect(dark["bg"]).not.toBe(light["bg"]));
