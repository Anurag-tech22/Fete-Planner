import { Suspense, lazy } from "react";
import BudgetTracker from "./components/BudgetTracker";
import Checklist from "./components/Checklist";
import HealthCard from "./components/HealthCard";
import Insights from "./components/Insights";
import PlanForm from "./components/PlanForm";
import { Ideas, RunSheet } from "./components/PlanInfo";
import RefineBar from "./components/RefineBar";
import { fmtDate } from "./lib";
import { usePlanSession } from "./usePlanSession";

const Guests = lazy(() => import("./Guests"));

/** Page layout only: state and server calls live in `usePlanSession`, every section is its own component. */
export default function App() {
  const s = usePlanSession();
  const { plan, health } = s;
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <main id="main">
        <header>
          <h1>
            Plan the party. <span>Keep the budget.</span>
          </h1>
          <p className="lead">
            Tell Fête about your wedding, birthday or community event and get a budget, timeline, vendor
            checklist and fresh ideas, then refine it by chatting.
          </p>
        </header>
        <PlanForm
          busy={s.busy}
          onCreate={(i) => void s.create(i)}
          onInvalid={() => s.setMsg("Please fix the highlighted fields.")}
        />
        <p role="status" aria-live="polite" className="sm">
          {s.msg}
        </p>
        {plan && health && (
          <>
            <BudgetTracker plan={plan} headingRef={s.headingRef} onActual={s.setActual} />
            <HealthCard health={health} />
            <Insights plan={plan} insights={s.insights} />
            <div className="two">
              <Checklist
                id="h-tl"
                title="Timeline"
                prefix="t"
                items={plan.tl.map((t, i) => ({
                  key: String(i),
                  done: t.done,
                  label: (
                    <>
                      <strong>{fmtDate(t.date)}</strong> — {t.task}
                    </>
                  ),
                }))}
                onToggle={s.toggleTimeline}
              />
              <Checklist
                id="h-v"
                title="Vendor checklist"
                prefix="v"
                items={plan.vendors.map((v) => ({ key: v.n, done: v.done, label: v.n }))}
                onToggle={s.toggleVendor}
              />
            </div>
            <Ideas ideas={plan.ideas} note={plan.note} />
            <RunSheet type={plan.meta.type} />
            <Suspense fallback={<p className="sm">Loading guest list…</p>}>
              <Guests expected={plan.meta.guests} />
            </Suspense>
            <RefineBar
              plan={plan}
              busy={s.busy}
              onRefine={(t) => void s.refine(t)}
              onShare={() => void s.share()}
              onReset={s.reset}
            />
          </>
        )}
      </main>
    </>
  );
}
