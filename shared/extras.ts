import { z } from "zod";
import { PlanSchema, type Intake, type Plan } from "./plan";

export const MAX_GUESTS = 500;
export const GuestSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a guest name.").max(60),
    diet: z.enum(["none", "veg", "vegan", "jain", "non-veg"]).default("none"),
    rsvp: z.enum(["pending", "yes", "no"]).default("pending"),
  })
  .strict();
export const GuestsSchema = z.array(GuestSchema).max(MAX_GUESTS);
export type Guest = z.infer<typeof GuestSchema>;

/** Counts confirmed, declined and pending RSVPs, and calculates remaining venue capacity. */
export function summarizeGuests(guests: Guest[], expected: number) {
  const yes = guests.filter((g) => g.rsvp === "yes");
  const diets: Record<string, number> = {};
  for (const g of yes) diets[g.diet] = (diets[g.diet] ?? 0) + 1;
  return {
    confirmed: yes.length,
    declined: guests.filter((g) => g.rsvp === "no").length,
    pending: guests.filter((g) => g.rsvp === "pending").length,
    diets,
    capacityLeft: expected - yes.length,
  };
}
/** Builds a plain-language note for the caterer with the dietary breakdown of confirmed guests. */
export function catererNote(s: ReturnType<typeof summarizeGuests>): string {
  const parts = Object.entries(s.diets).map(([d, n]) => `${n} ${d === "none" ? "no preference" : d}`);
  return parts.length
    ? `For your caterer: ${s.confirmed} confirmed — ${parts.join(", ")}.`
    : "No confirmed guests yet.";
}

const RUN: Record<Intake["type"], [string, string][]> = {
  wedding: [
    ["07:00", "Vendors arrive, venue setup"],
    ["10:00", "Décor and sound check"],
    ["13:00", "Family photos"],
    ["17:00", "Guests arrive, welcome drinks"],
    ["19:00", "Ceremony"],
    ["20:30", "Dinner"],
    ["22:30", "Send-off and vendor payments"],
  ],
  birthday: [
    ["13:00", "Venue and décor setup"],
    ["15:30", "Cake and snacks ready"],
    ["16:00", "Guests arrive, welcome games"],
    ["17:00", "Main activity"],
    ["18:00", "Cake cutting"],
    ["18:30", "Food"],
    ["19:30", "Return gifts and thank-yous"],
  ],
  community: [
    ["07:30", "Volunteer briefing"],
    ["08:30", "Set up stalls and sound"],
    ["10:00", "Doors open"],
    ["11:00", "Opening remarks"],
    ["13:00", "Lunch"],
    ["16:00", "Closing and cleanup"],
    ["17:30", "Debrief and thank volunteers"],
  ],
};
/** Returns time-of-day schedule items for the given event type. */
export const runSheet = (t: Intake["type"]) => RUN[t].map(([time, task]) => ({ time, task }));

/** URL-safe share token. Decoding re-validates with the same schema, so a tampered link can never inject data. */
export function encodePlan(p: Plan): string {
  let bin = "";
  new TextEncoder().encode(JSON.stringify(p)).forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decodePlan(token: string): Plan | null {
  try {
    if (token.length > 20_000) return null;
    const bytes = Uint8Array.from(atob(token.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const r = PlanSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}
