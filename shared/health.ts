import { INR, type Plan } from "./plan";

export type Severity = "high" | "medium" | "low";
export interface Risk {
  severity: Severity;
  title: string;
  action: string;
}
export interface Health {
  score: number;
  risks: Risk[];
  next: string;
  daysLeft: number;
}
const ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
const PENALTY: Record<Severity, number> = { high: 25, medium: 10, low: 3 };
const DAY = 864e5;

const overdueRisks = (p: Plan, today: string): Risk[] => {
  const overdue = p.tl.filter((t) => !t.done && t.date < today);
  const [first] = overdue;
  return first
    ? [
        {
          severity: "high",
          title: `${overdue.length} milestone${overdue.length > 1 ? "s" : ""} overdue`,
          action: `Do this first: ${first.task}.`,
        },
      ]
    : [];
};

const vendorRisks = (p: Plan, daysLeft: number): Risk[] => {
  const booked = p.vendors.filter((v) => v.done).length;
  if (daysLeft <= 14 && booked / Math.max(1, p.vendors.length) < 0.5) {
    return [
      {
        severity: "high",
        title: `Only ${booked} of ${p.vendors.length} vendors confirmed with ${daysLeft} days left`,
        action: "Call your top three vendors today and lock the dates.",
      },
    ];
  }
  if (daysLeft <= 30 && booked === 0) {
    return [
      {
        severity: "medium",
        title: "No vendors confirmed yet",
        action: "Shortlist and book your venue first.",
      },
    ];
  }
  return [];
};

const categoryRisks = (p: Plan): Risk[] =>
  p.cats.flatMap((c): Risk[] => {
    if (c.actual > c.amt) {
      return [
        {
          severity: "high",
          title: `${c.cat} is over budget`,
          action: `Cover ${INR(c.actual - c.amt)} by trimming this category or moving funds from Misc.`,
        },
      ];
    }
    if (c.amt > 0 && c.actual / c.amt >= 0.9) {
      return [
        {
          severity: "medium",
          title: `${c.cat} has used ${Math.round((c.actual / c.amt) * 100)}% of its budget`,
          action: "Get a final quote before committing more.",
        },
      ];
    }
    return [];
  });

const bufferRisks = (p: Plan): Risk[] => {
  const spent = p.cats.reduce((a, c) => a + c.actual, 0);
  if (spent > p.meta.budget) {
    return [
      {
        severity: "high",
        title: "Total spending is over budget",
        action: "Pause new bookings and re-plan with the Refine box.",
      },
    ];
  }
  if (spent > 0 && p.meta.budget - spent < p.meta.budget * 0.05) {
    return [
      {
        severity: "medium",
        title: "Less than 5% of the budget is left",
        action: "Keep the remainder as a buffer for surprises.",
      },
    ];
  }
  return [];
};

const PAST: Risk = {
  severity: "low",
  title: "This event has already happened",
  action: "Start a new plan for your next celebration.",
};

/**
 * Plan health: a deterministic readiness score (0–100), the risks behind it, and the single
 * next best action. Pure and explainable — no model call — so it is instant, offline and testable.
 */
export function assessPlan(p: Plan, now = new Date()): Health {
  const today = now.toISOString().slice(0, 10);
  const daysLeft = Math.round(
    (Date.parse(p.meta.date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / DAY,
  );
  if (daysLeft < 0) {
    return { score: 100, daysLeft, risks: [PAST], next: PAST.action };
  }
  const risks = [
    ...overdueRisks(p, today),
    ...vendorRisks(p, daysLeft),
    ...categoryRisks(p),
    ...bufferRisks(p),
  ].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const score = Math.max(0, 100 - risks.reduce((a, r) => a + PENALTY[r.severity], 0));
  const upcoming = p.tl.find((t) => !t.done);
  const next =
    risks[0]?.action ??
    (upcoming ? `${upcoming.task} (by ${upcoming.date}).` : "You’re on track — enjoy the event!");
  return { score, risks, next, daysLeft };
}
