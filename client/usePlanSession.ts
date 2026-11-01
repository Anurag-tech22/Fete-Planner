import { useEffect, useMemo, useRef, useState } from "react";
import { encodePlan } from "../shared/extras";
import { setActual, setTimelineDone, setVendorDone } from "../shared/edits";
import { assessPlan } from "../shared/health";
import type { Intake, Plan } from "../shared/plan";
import { budgetInsights } from "../shared/reports";
import { initialPlan, postPlan, savePlan } from "./lib";

/** All plan state and server interaction, so components stay purely presentational. */
export function usePlanSession() {
  const [plan, setPlan] = useState<Plan | null>(initialPlan);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const inflight = useRef<AbortController | null>(null);

  useEffect(() => savePlan(plan), [plan]);
  const health = useMemo(() => (plan ? assessPlan(plan) : null), [plan]);
  const insights = useMemo(() => (plan ? budgetInsights(plan) : []), [plan]);
  // Edits are only reachable while a plan is on screen, so the cast cannot see null.
  const update = (change: (p: Plan) => Plan) => setPlan((p) => change(p as Plan));

  /** Only the latest request may change the busy state; older ones are aborted. */
  async function call(path: string, body: unknown): Promise<Plan | null> {
    inflight.current?.abort();
    const controller = (inflight.current = new AbortController());
    setBusy(true);
    try {
      return await postPlan(path, body, controller.signal);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMsg((e as Error).message || "Network error — please try again.");
      }
      return null;
    } finally {
      if (inflight.current === controller) {
        setBusy(false);
      }
    }
  }
  async function create(intake: Intake) {
    setMsg("Fête is planning…");
    const next = await call("/api/plan", intake);
    if (next) {
      setPlan(next);
      setMsg("Plan ready.");
      setTimeout(() => headingRef.current?.focus(), 0);
    }
  }
  async function refine(instruction: string) {
    if (!instruction.trim()) {
      setMsg("Type a change first.");
      return;
    }
    setMsg("Refining…");
    const next = await call("/api/refine", { plan, instruction });
    if (next) {
      setPlan(next);
      setMsg("Plan updated.");
    }
  }
  async function share() {
    const hash = `#plan=${encodePlan(plan as Plan)}`;
    try {
      await navigator.clipboard.writeText(`${location.origin}${location.pathname}${hash}`);
      setMsg("Share link copied.");
    } catch {
      history.replaceState(null, "", hash);
      setMsg("The share link is now in your address bar — copy it from there.");
    }
  }
  function reset() {
    setPlan(null);
    setMsg("Cleared.");
  }

  return {
    plan,
    msg,
    busy,
    health,
    insights,
    headingRef,
    setMsg,
    create,
    refine,
    share,
    reset,
    setActual: (i: number, v: number) => update((p) => setActual(p, i, v)),
    toggleTimeline: (i: number, done: boolean) => update((p) => setTimelineDone(p, i, done)),
    toggleVendor: (i: number, done: boolean) => update((p) => setVendorDone(p, i, done)),
  };
}
