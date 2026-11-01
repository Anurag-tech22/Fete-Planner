import { INR, type Plan } from "./plan";

/** Calendar export (RFC 5545): one all-day event per milestone. */
export function toICS(p: Plan, now = new Date()): string {
  const esc = (s: string) => s.replace(/[\\;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const stamp = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ymd = (d: string) => d.replace(/-/g, "");
  const events = p.tl.map((t, i) =>
    [
      "BEGIN:VEVENT",
      `UID:fete-${i}-${ymd(t.date)}@fete.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(t.date)}`,
      `DTEND;VALUE=DATE:${ymd(new Date(Date.parse(t.date + "T00:00:00Z") + 864e5).toISOString().slice(0, 10))}`,
      `SUMMARY:${esc(`${p.meta.name} — ${t.task}`)}`,
      "END:VEVENT",
    ].join("\r\n"),
  );
  return (
    ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fete//Planner//EN", ...events, "END:VCALENDAR"].join(
      "\r\n",
    ) + "\r\n"
  );
}
/** Plain-language budget insights shown next to the chart. */
export function budgetInsights(p: Plan): string[] {
  const out = [`About ${INR(p.meta.budget / p.meta.guests)} per guest.`];
  const top = [...p.cats].sort((a, b) => b.amt - a.amt)[0];
  if (top) {
    out.push(
      `${top.cat} is your biggest line at ${Math.round((top.amt / p.meta.budget) * 100)}% of the budget.`,
    );
  }
  const over = p.cats.filter((c) => c.actual > c.amt),
    spent = p.cats.reduce((a, c) => a + c.actual, 0);
  if (over.length) {
    out.push(
      `Over budget in ${over.map((c) => c.cat).join(", ")} — rebalance from Misc or trim the guest list.`,
    );
  } else if (spent > 0) {
    out.push(`${INR(p.meta.budget - spent)} left to spend — keep about 5% as a buffer.`);
  } else {
    out.push("Log actual spend as you book vendors to catch overruns early.");
  }
  return out;
}
