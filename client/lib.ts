import { decodePlan } from "../shared/extras";
import { PlanSchema, type Plan } from "../shared/plan";

const KEY = "fete.v1";

/** Formats a YYYY-MM-DD string for display (UTC, so the day never shifts with the viewer's timezone). */
export const fmtDate = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/** Triggers a browser download of generated text content. */
export function download(name: string, type: string, data: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([data], { type }));
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function loadPlan(): Plan | null {
  try {
    const r = PlanSchema.safeParse(JSON.parse(localStorage.getItem(KEY) ?? "null"));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}
/** A valid shared link wins; otherwise restore the last saved plan. Both are re-validated. */
export function initialPlan(): Plan | null {
  if (location.hash.startsWith("#plan=")) {
    const shared = decodePlan(location.hash.slice(6));
    if (shared) return shared;
  }
  return loadPlan();
}
/** Persists (or clears, when null) the plan; storage failures are non-fatal. */
export function savePlan(plan: Plan | null) {
  try {
    if (plan) localStorage.setItem(KEY, JSON.stringify(plan));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

/** POSTs JSON and returns a validated plan; throws a user-presentable Error otherwise. */
export async function postPlan(path: string, body: unknown, signal: AbortSignal): Promise<Plan> {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? "Request failed");
  const parsed = PlanSchema.safeParse(data);
  if (!parsed.success) throw new Error("Unexpected response from the server.");
  return parsed.data;
}
