import { describe, expect, it } from "vitest";
import { INR, IntakeSchema, WEIGHTS, buildPlan, buildTimeline, normalize, splitBudget } from "./plan";

const valid = { type: "birthday", name: "Aarav", date: "2099-01-01", guests: 40, budget: 80000 };
describe("budget", () => {
  it("splits exactly to the total", () => {
    for (const t of Object.values(WEIGHTS))
      expect(splitBudget(123457, t).reduce((a, c) => a + c.amt, 0)).toBe(123457);
  });
  it("normalizes by percentage and keeps the total", () => {
    const c = normalize(splitBudget(100000, WEIGHTS.birthday), 100000, { Venue: 50, Cake: 0 });
    expect(c.reduce((a, x) => a + x.amt, 0)).toBe(100000);
    expect(c.find((x) => x.cat === "Cake")?.amt).toBe(0);
  });
  it("ignores invalid percentages", () => {
    const c = splitBudget(1000, WEIGHTS.wedding);
    const before = c.map((x) => x.amt);
    normalize(c, 1000, { Venue: -5 });
    expect(c.map((x) => x.amt)).toEqual(before);
  });
});
describe("timeline & plan", () => {
  it("is ascending and ends on the event day", () => {
    const t = buildTimeline("2099-01-01");
    expect(t.map((x) => x.date)).toEqual([...t.map((x) => x.date)].sort());
    expect(t.at(-1)?.date).toBe("2099-01-01");
  });
  it("handles very short notice", () =>
    expect(buildTimeline(new Date().toISOString().slice(0, 10))).toHaveLength(7));
  it("builds a full plan with fallback ideas", () => {
    const p = buildPlan(IntakeSchema.parse(valid));
    expect(p.ideas.length).toBeGreaterThan(0);
    expect(p.vendors.length).toBeGreaterThan(0);
  });
});
describe("validation", () => {
  it("accepts valid input", () => expect(IntakeSchema.safeParse(valid).success).toBe(true));
  it.each([{ name: "" }, { date: "2000-01-01" }, { guests: 0 }, { budget: 10 }, { type: "party" }])(
    "rejects %o",
    (bad) => expect(IntakeSchema.safeParse({ ...valid, ...bad }).success).toBe(false),
  );
  it("formats rupees", () => expect(INR(100000)).toBe("₹1,00,000"));
});

import { budgetInsights, toICS } from "./reports";
describe("exports & insights", () => {
  const plan = () => buildPlan(IntakeSchema.parse({ ...valid, name: "A, B; C" }));
  it("builds a valid calendar with escaped text", () => {
    const ics = toICS(plan(), new Date("2030-01-01T00:00:00Z"));
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(7);
    expect(ics).toContain("A\\, B\\; C");
    expect(ics).toContain("DTSTAMP:20300101T000000Z");
  });
  it("gives a starting insight set", () =>
    expect(budgetInsights(plan()).join(" ")).toMatch(/per guest.*biggest line.*Log actual spend/));
  it("flags overspend", () => {
    const p = plan();
    p.cats[0]!.actual = p.cats[0]!.amt + 1;
    expect(budgetInsights(p).join(" ")).toMatch(/Over budget in Venue/);
  });
  it("reports what is left once spending starts", () => {
    const p = plan();
    p.cats[0]!.actual = 1000;
    expect(budgetInsights(p).join(" ")).toMatch(/₹79,000 left/);
  });
  it("rejects unknown fields", () =>
    expect(IntakeSchema.safeParse({ ...valid, admin: true }).success).toBe(false));
});

import { PlanSchema } from "./plan";
describe("edge cases found in audit", () => {
  it.each(["2099-02-31", "2099-13-01", "2099-00-10", "2099-04-31"])(
    "rejects impossible date %s instead of crashing",
    (d) => expect(IntakeSchema.safeParse({ ...valid, date: d }).success).toBe(false),
  );
  it("accepts a real leap day", () =>
    expect(IntakeSchema.safeParse({ ...valid, date: "2096-02-29" }).success).toBe(true));
  it("requires a whole-rupee budget", () =>
    expect(IntakeSchema.safeParse({ ...valid, budget: 50000.5 }).success).toBe(false));
  it("allows today (and one day of timezone grace) but not older dates", () => {
    const d = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
    expect(IntakeSchema.safeParse({ ...valid, date: d(0) }).success).toBe(true);
    expect(IntakeSchema.safeParse({ ...valid, date: d(-1) }).success).toBe(true);
    expect(IntakeSchema.safeParse({ ...valid, date: d(-3) }).success).toBe(false);
  });
  it("keeps an existing plan valid after its event date has passed", () => {
    const p = buildPlan(IntakeSchema.parse(valid));
    expect(PlanSchema.safeParse({ ...p, meta: { ...p.meta, date: "2000-01-01" } }).success).toBe(true);
  });
  it("rejects a plan whose categories do not add up to the budget", () => {
    const p = buildPlan(IntakeSchema.parse(valid));
    p.cats[0]!.amt += 1;
    expect(PlanSchema.safeParse(p).success).toBe(false);
  });
  it("rejects unknown keys anywhere in a plan", () => {
    const p = buildPlan(IntakeSchema.parse(valid));
    expect(PlanSchema.safeParse({ ...p, admin: true }).success).toBe(false);
    expect(PlanSchema.safeParse({ ...p, vendors: [{ n: "x", done: false, evil: 1 }] }).success).toBe(false);
  });
  it("normalize copes with all-zero percentages", () => {
    const c = normalize(
      splitBudget(10000, WEIGHTS.wedding),
      10000,
      Object.fromEntries(Object.keys(WEIGHTS.wedding).map((k) => [k, 0])),
    );
    expect(c.reduce((a, x) => a + x.amt, 0)).toBe(10000);
  });
});

describe("insights without categories", () => {
  it("still reports per-guest cost and a logging hint", () => {
    const p = buildPlan(IntakeSchema.parse(valid));
    p.cats = [];
    expect(budgetInsights(p)).toHaveLength(2);
  });
});
