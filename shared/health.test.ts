import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { assessPlan } from "./health";
import { IntakeSchema, buildPlan } from "./plan";

const mk = () =>
  buildPlan(
    IntakeSchema.parse({ type: "birthday", name: "A", date: "2099-01-01", guests: 40, budget: 100000 }),
  );
const titles = (p = mk(), now?: Date) => assessPlan(p, now).risks.map((r) => r.title);

describe("assessPlan", () => {
  it("is healthy for a fresh plan far from the event", () => {
    const h = assessPlan(mk());
    expect(h.score).toBe(100);
    expect(h.risks).toEqual([]);
    expect(h.next).toMatch(/^Lock date/);
  });
  it("flags overdue milestones and tells you what to do first", () => {
    const p = mk();
    p.tl = [{ date: "2020-01-01", task: "Book venue", done: false }];
    const h = assessPlan(p);
    expect(h.risks[0]).toMatchObject({ severity: "high", title: "1 milestone overdue" });
    expect(h.next).toBe("Do this first: Book venue.");
    expect(h.score).toBe(75);
  });
  it("pluralises overdue milestones and ignores completed ones", () => {
    const p = mk();
    p.tl = [
      { date: "2020-01-01", task: "A", done: false },
      { date: "2020-01-02", task: "B", done: false },
      { date: "2020-01-03", task: "C", done: true },
    ];
    expect(titles(p)).toEqual(["2 milestones overdue"]);
  });
  it("warns about unbooked vendors close to the date", () => {
    const now = new Date(Date.parse("2099-01-01T00:00:00Z") - 5 * 864e5);
    expect(titles(mk(), now).join("|")).toMatch(/Only 0 of 7 vendors confirmed with 5 days left/);
    expect(titles(mk(), new Date(Date.parse("2099-01-01T00:00:00Z") - 20 * 864e5)).join("|")).toMatch(
      /No vendors confirmed yet/,
    );
  });
  it("is quiet about vendors once most are confirmed", () => {
    const p = mk();
    p.vendors.forEach((v) => (v.done = true));
    expect(titles(p, new Date(Date.parse("2099-01-01T00:00:00Z") - 5 * 864e5)).join("|")).not.toMatch(
      /vendors/,
    );
  });
  it("flags over-budget and nearly-spent categories", () => {
    const p = mk();
    p.cats[0]!.actual = p.cats[0]!.amt + 1;
    p.cats[1]!.actual = Math.floor(p.cats[1]!.amt * 0.95);
    const t = titles(p);
    expect(t).toContain("Venue is over budget");
    expect(t.some((x) => /Catering has used 95%/.test(x))).toBe(true);
  });
  it("flags a thin overall buffer and total overspend", () => {
    const p = mk();
    p.cats.forEach((c) => (c.actual = Math.floor(c.amt * 0.97)));
    expect(titles(p)).toContain("Less than 5% of the budget is left");
    p.cats.forEach((c) => (c.actual = c.amt + 10));
    expect(titles(p)).toContain("Total spending is over budget");
  });
  it("handles an event that has already happened", () => {
    const h = assessPlan(mk(), new Date("2100-01-01T00:00:00Z"));
    expect(h.daysLeft).toBeLessThan(0);
    expect(h.risks[0]?.title).toMatch(/already happened/);
  });
  it("celebrates when every milestone is done", () => {
    const p = mk();
    p.tl.forEach((t) => (t.done = true));
    expect(assessPlan(p).next).toMatch(/on track/);
  });
  it("always returns an integer score in 0–100 with risks sorted by severity (property)", () =>
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5_000_000 }), { minLength: 7, maxLength: 7 }),
        fc.integer({ min: 0, max: 400 }),
        (actuals, daysBefore) => {
          const p = mk();
          p.cats.forEach((c, i) => (c.actual = actuals[i] ?? 0));
          const h = assessPlan(p, new Date(Date.parse("2099-01-01T00:00:00Z") - daysBefore * 864e5));
          const rank = { high: 0, medium: 1, low: 2 };
          return (
            Number.isInteger(h.score) &&
            h.score >= 0 &&
            h.score <= 100 &&
            h.risks.every((r, i, a) => i === 0 || rank[a[i - 1]!.severity] <= rank[r.severity])
          );
        },
      ),
    ));
});
