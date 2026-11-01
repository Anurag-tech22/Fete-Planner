import { describe, expect, it } from "vitest";
import { setActual, setTimelineDone, setVendorDone } from "./edits";
import { IntakeSchema, buildPlan } from "./plan";

const mk = () =>
  buildPlan(
    IntakeSchema.parse({ type: "birthday", name: "A", date: "2099-01-01", guests: 40, budget: 100000 }),
  );
const frozen = () => {
  const p = mk();
  p.cats.forEach(Object.freeze);
  p.tl.forEach(Object.freeze);
  p.vendors.forEach(Object.freeze);
  return Object.freeze(p);
};

describe("immutable plan edits", () => {
  it("changes only the targeted category and never mutates the input", () => {
    const p = frozen();
    const next = setActual(p, 1, 500);
    expect(next.cats[1]?.actual).toBe(500);
    expect(next.cats.filter((c) => c.actual !== 0)).toHaveLength(1);
    expect(p.cats[1]?.actual).toBe(0);
  });
  it("toggles one timeline milestone", () => {
    const p = frozen();
    const next = setTimelineDone(p, 2, true);
    expect(next.tl.map((t) => t.done)).toEqual(p.tl.map((_, i) => i === 2));
    expect(p.tl[2]?.done).toBe(false);
  });
  it("toggles one vendor", () => {
    const p = frozen();
    const next = setVendorDone(p, 0, true);
    expect(next.vendors[0]?.done).toBe(true);
    expect(next.vendors.slice(1).every((v) => !v.done)).toBe(true);
  });
  it("ignores an out-of-range index", () =>
    expect(setActual(mk(), 99, 5).cats.every((c) => c.actual === 0)).toBe(true));
});
