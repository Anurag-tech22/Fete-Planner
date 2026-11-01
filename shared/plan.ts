import { z } from "zod";
import { personalize } from "./personalize";

/** 1-day grace so users in timezones behind UTC can still pick "today". */
const minDate = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);
/** Rejects impossible dates such as 2099-02-31 (which would otherwise crash timeline maths). */
const isRealDate = (d: string) => {
  const t = Date.parse(d + "T00:00:00Z");
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === d;
};
const BaseIntake = z
  .object({
    type: z.enum(["wedding", "birthday", "community"]),
    name: z.string().trim().min(1, "Please name your event.").max(60),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.")
      .refine(isRealDate, "Pick a real calendar date."),
    guests: z
      .number({ error: "Enter a number." })
      .int()
      .min(1, "Enter 1–5000 guests.")
      .max(5000, "Enter 1–5000 guests."),
    budget: z
      .number({ error: "Enter a number." })
      .int("Enter a whole-rupee amount.")
      .min(5000, "Enter a budget of ₹5,000 or more.")
      .max(1e8),
    city: z.string().trim().max(40).default(""),
    vibe: z.string().trim().max(80).default(""),
    notes: z.string().trim().max(160).default(""),
  })
  .strict();
/** Used for new events only: the "not in the past" rule must not invalidate an existing plan after its date passes. */
export const IntakeSchema = BaseIntake.refine((v) => v.date >= minDate(), {
  message: "Choose today or a future date.",
  path: ["date"],
});
export type Intake = z.infer<typeof BaseIntake>;
const Ideas = z.array(z.string().trim().min(1).max(180)).min(1).max(8);
export const IdeasSchema = z.object({ ideas: Ideas });
export const RefineSchema = z.object({
  pct: z.record(z.string(), z.number().finite().min(0)).optional(),
  ideas: Ideas.optional(),
  note: z.string().max(200).optional(),
});
export const PlanSchema = z
  .object({
    meta: BaseIntake,
    cats: z
      .array(
        z
          .object({
            cat: z.string().max(40),
            amt: z.number().int().min(0),
            actual: z.number().min(0).max(1e9),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    tl: z
      .array(
        z
          .object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            task: z.string().max(120),
            done: z.boolean(),
          })
          .strict(),
      )
      .max(20),
    vendors: z.array(z.object({ n: z.string().max(80), done: z.boolean() }).strict()).max(20),
    ideas: z.array(z.string().max(180)).max(8),
    note: z.string().max(200),
  })
  .strict()
  .refine((p) => p.cats.reduce((a, c) => a + c.amt, 0) === p.meta.budget, {
    message: "Category amounts must add up to the budget.",
    path: ["cats"],
  });
export type Plan = z.infer<typeof PlanSchema>;

export const WEIGHTS: Record<Intake["type"], Record<string, number>> = {
  wedding: {
    Venue: 0.25,
    Catering: 0.3,
    Décor: 0.12,
    Attire: 0.1,
    Photography: 0.1,
    Entertainment: 0.08,
    Misc: 0.05,
  },
  birthday: {
    Venue: 0.2,
    Catering: 0.35,
    Décor: 0.15,
    Cake: 0.08,
    Entertainment: 0.12,
    "Return gifts": 0.05,
    Misc: 0.05,
  },
  community: {
    Venue: 0.2,
    Catering: 0.3,
    Décor: 0.1,
    "Sound & AV": 0.15,
    Promotion: 0.1,
    Volunteers: 0.05,
    Misc: 0.1,
  },
};
const VENDORS: Record<Intake["type"], string[]> = {
  wedding: [
    "Venue / hall",
    "Caterer",
    "Decorator",
    "Photographer & videographer",
    "Makeup & attire",
    "DJ / band",
    "Priest / officiant",
    "Transport",
  ],
  birthday: [
    "Venue / party space",
    "Caterer or snacks",
    "Cake baker",
    "Decorator / balloons",
    "Entertainer / games",
    "Photographer",
    "Return gifts",
  ],
  community: [
    "Venue permission",
    "Caterer",
    "Sound & AV",
    "Printing & banners",
    "Volunteers roster",
    "First-aid & safety",
    "Photographer",
  ],
};
export const FALLBACK_IDEAS: Record<Intake["type"], string[]> = {
  wedding: [
    "Haldi brunch with marigold swings",
    "Live photo wall of guest wishes",
    "Regional thali with a live chaat counter",
    "Seed-paper thank-you favours",
  ],
  birthday: [
    "Treasure hunt with themed clues",
    "DIY cupcake decorating station",
    "Photo booth with props",
    "Seed-paper return gifts",
  ],
  community: [
    "Open-mic local talent showcase",
    "Zero-waste stalls with steel plates",
    "Kids’ art corner",
    "Neighbourhood potluck map",
  ],
};
const STEPS: [number, string][] = [
  [1, "Lock date, budget and guest list"],
  [0.75, "Book venue"],
  [0.5, "Book caterer and key vendors"],
  [0.38, "Send invitations"],
  [0.2, "Confirm menu, décor and schedule"],
  [0.07, "Final headcount and payments"],
  [0, "Event day 🎉"],
];

/** Formats a number as an Indian Rupee string (e.g. `₹1,50,000`). */
export const INR = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** Split a total across weighted categories; the last one absorbs rounding so the sum is exact. */
export function splitBudget(total: number, w: Record<string, number>) {
  const keys = Object.keys(w);
  let rest = total;
  return keys.map((cat, i) => {
    const amt = i === keys.length - 1 ? rest : Math.round(total * w[cat]);
    rest -= amt;
    return { cat, amt, actual: 0 };
  });
}
/** Re-weight categories by percentages (invalid entries keep their current share). Sum always equals total. */
export function normalize(cats: Plan["cats"], total: number, pct?: Record<string, number>) {
  let w = cats.map((c) => {
    const p = pct?.[c.cat];
    return typeof p === "number" && Number.isFinite(p) && p >= 0 ? p : (c.amt / total) * 100;
  });
  if (!w.some((x) => x > 0)) w = cats.map((c) => (c.amt / total) * 100); // all-zero input: keep current shares
  const s = w.reduce((a, b) => a + b, 0);
  const raw = w.map((x) => (total * x) / s),
    base = raw.map(Math.floor);
  let rest = total - base.reduce((a, b) => a + b, 0);
  // Largest-remainder method: amounts are never negative and always sum exactly to the total.
  raw
    .map((r, i) => [r - base[i], i] as const)
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => {
      if (rest > 0) {
        base[i] = base[i] + 1;
        rest--;
      }
    });
  cats.forEach((c, i) => {
    c.amt = base[i];
  });
  return cats;
}
/**
 * Generates date-stamped milestones by interpolating from now to the event day.
 * Each step is placed proportionally so near-term events get tighter intervals.
 */
export function buildTimeline(date: string, now = new Date()) {
  const DAY = 864e5,
    ev = Date.parse(date + "T00:00:00Z"),
    t0 = Date.parse(now.toISOString().slice(0, 10) + "T00:00:00Z");
  const days = Math.max(1, Math.round((ev - t0) / DAY));
  return STEPS.map(([f, task]) => ({
    date: new Date(ev - Math.round(f * days) * DAY).toISOString().slice(0, 10),
    task,
    done: false,
  }));
}
/** Assembles a complete plan from a validated intake, optional AI ideas, and deterministic personalisation. */
export function buildPlan(meta: Intake, ideas?: string[] | null): Plan {
  const extra = personalize(meta);
  return {
    meta,
    cats: splitBudget(meta.budget, WEIGHTS[meta.type]),
    tl: buildTimeline(meta.date),
    vendors: [...VENDORS[meta.type], ...extra.vendors].slice(0, 20).map((n) => ({ n, done: false })),
    ideas: ideas?.length ? ideas : [...extra.ideas, ...FALLBACK_IDEAS[meta.type]].slice(0, 8),
    note: "",
  };
}
