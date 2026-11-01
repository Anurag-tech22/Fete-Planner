import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  GuestSchema,
  catererNote,
  decodePlan,
  encodePlan,
  runSheet,
  summarizeGuests,
  type Guest,
} from "./extras";
import { IntakeSchema, WEIGHTS, buildPlan, normalize, splitBudget } from "./plan";

const types = ["wedding", "birthday", "community"] as const;
const mk = (name = "Aarav") =>
  buildPlan(IntakeSchema.parse({ type: "birthday", name, date: "2099-01-01", guests: 40, budget: 80000 }));

describe("properties (fast-check)", () => {
  it("budget split sums exactly and is never negative", () =>
    fc.assert(
      fc.property(fc.integer({ min: 5000, max: 100_000_000 }), fc.constantFrom(...types), (total, t) => {
        const s = splitBudget(total, WEIGHTS[t]);
        return s.reduce((a, c) => a + c.amt, 0) === total && s.every((c) => c.amt >= 0);
      }),
    ));
  it("normalize keeps the total and non-negative amounts for any AI percentages", () =>
    fc.assert(
      fc.property(
        fc.integer({ min: 5000, max: 100_000_000 }),
        fc.constantFrom(...types),
        fc.dictionary(
          fc.constantFrom(...Object.keys(WEIGHTS.wedding), ...Object.keys(WEIGHTS.birthday)),
          fc.double({ min: -50, max: 1000, noNaN: true }),
        ),
        (total, t, pct) => {
          const c = normalize(splitBudget(total, WEIGHTS[t]), total, pct);
          return (
            c.reduce((a, x) => a + x.amt, 0) === total &&
            c.every((x) => x.amt >= 0 && Number.isInteger(x.amt))
          );
        },
      ),
    ));
  it("share links round-trip any event name", () =>
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        (n) => {
          const p = mk(n);
          return JSON.stringify(decodePlan(encodePlan(p))) === JSON.stringify(p);
        },
      ),
    ));
});
describe("share links", () => {
  it("round-trips emoji and accents", () => {
    const p = mk("Café 🎉 पार्टी");
    expect(decodePlan(encodePlan(p))).toEqual(p);
  });
  it.each(["", "!!!", "e30", "x".repeat(30000)])("rejects invalid token %#", (t) =>
    expect(decodePlan(t)).toBeNull(),
  );
  it("rejects a tampered plan", () => {
    const p = mk();
    const bad = encodePlan({ ...p, cats: [{ cat: "x", amt: -5, actual: 0 }] });
    expect(decodePlan(bad)).toBeNull();
  });
});
describe("guests & run sheet", () => {
  const gs: Guest[] = [
    { name: "A", diet: "veg", rsvp: "yes" },
    { name: "B", diet: "veg", rsvp: "yes" },
    { name: "C", diet: "none", rsvp: "pending" },
    { name: "D", diet: "jain", rsvp: "no" },
  ];
  it("summarizes RSVPs and diets", () => {
    const s = summarizeGuests(gs, 1);
    expect(s).toMatchObject({ confirmed: 2, pending: 1, declined: 1, capacityLeft: -1, diets: { veg: 2 } });
    expect(catererNote(s)).toContain("2 veg");
  });
  it("handles an empty list", () =>
    expect(catererNote(summarizeGuests([], 10))).toBe("No confirmed guests yet."));
  it("mentions no-preference guests", () =>
    expect(catererNote(summarizeGuests([{ name: "A", diet: "none", rsvp: "yes" }], 5))).toContain(
      "no preference",
    ));
  it("validates guests strictly", () => {
    expect(GuestSchema.safeParse({ name: "", diet: "veg" }).success).toBe(false);
    expect(GuestSchema.safeParse({ name: "A", role: "admin" }).success).toBe(false);
  });
  it("has a chronological run sheet for every event type", () =>
    types.forEach((t) => {
      const r = runSheet(t).map((x) => x.time);
      expect(r).toEqual([...r].sort());
    }));
});
