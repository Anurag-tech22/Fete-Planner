import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { PlanSchema, buildPlan, IntakeSchema } from "./plan";
import { personalize } from "./personalize";

const base = { type: "wedding", name: "X", date: "2099-01-01", guests: 80, budget: 400000 } as const;
const run = (o: object = {}) => personalize(IntakeSchema.parse({ ...base, ...o }));
const text = (o: object) => run(o).ideas.join(" | ");

describe("personalize", () => {
  it("uses the theme and city", () =>
    expect(text({ vibe: "Rustic garden", city: "Pune" })).toMatch(/“Rustic garden”.*Pune/));
  it("adapts the menu to Jain, vegan and vegetarian notes", () => {
    expect(text({ notes: "Jain guests" })).toMatch(/Jain menu/);
    expect(run({ notes: "Jain guests" }).vendors).toContain("Written Jain menu sign-off");
    expect(text({ notes: "vegan" })).toMatch(/vegan dishes/);
    expect(text({ notes: "vegetarian only" })).toMatch(/fully vegetarian/);
  });
  it("plans for accessibility and outdoor settings", () => {
    expect(text({ notes: "wheelchair access" })).toMatch(/step-free/);
    expect(run({ vibe: "beach party" }).vendors).toContain("Rain / weather backup plan");
    expect(text({ notes: "many kids" })).toMatch(/kids’ corner/);
  });
  it.each([
    [10, /intimate/],
    [60, /live food stations/],
    [300, /two serving lines/],
  ])("sizes service for %i guests", (guests, re) => expect(text({ guests })).toMatch(re));
  it.each([
    [100_000, /DIY décor/],
    [300_000, /standout feature/],
    [900_000, /invest in an experience/],
  ])("matches advice to budget per head (₹%i for 100 guests)", (budget, re) =>
    expect(text({ guests: 100, budget })).toMatch(re),
  );
  it("never exceeds schema limits for any input (property)", () =>
    fc.assert(
      fc.property(
        fc.string({ maxLength: 80 }),
        fc.string({ maxLength: 160 }),
        fc.integer({ min: 1, max: 5000 }),
        fc.integer({ min: 5000, max: 100_000_000 }),
        fc.constantFrom("wedding", "birthday", "community"),
        (vibe, notes, guests, budget, type) => {
          const p = buildPlan(IntakeSchema.parse({ ...base, type, vibe, notes, guests, budget }));
          return PlanSchema.safeParse(p).success && p.ideas.length >= 1;
        },
      ),
    ));
  it("makes plans differ when inputs differ", () =>
    expect(buildPlan(IntakeSchema.parse({ ...base, notes: "Jain" })).ideas).not.toEqual(
      buildPlan(IntakeSchema.parse(base)).ideas,
    ));
});
