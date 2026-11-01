import { memo, type RefObject } from "react";
import { INR, type Plan } from "../../shared/plan";
import { fmtDate } from "../lib";

interface Props {
  plan: Plan;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onActual: (index: number, value: number) => void;
}

/** Plan summary plus per-category budget bars and an actual-spend input with text+icon warnings. */
const BudgetTracker = memo(function BudgetTracker({ plan, headingRef, onActual }: Props) {
  const spent = plan.cats.reduce((a, c) => a + c.actual, 0);
  const { budget, guests } = plan.meta;
  return (
    <section className="card" aria-labelledby="h-plan">
      <h2 id="h-plan" tabIndex={-1} ref={headingRef}>
        2 · {plan.meta.name}
      </h2>
      <div className="sum">
        <div>
          <b>{INR(budget)}</b>
          <span className="sm">budget</span>
        </div>
        <div>
          <b>{INR(spent)}</b>
          <span className="sm">spent</span>
        </div>
        <div>
          <b>{guests}</b>
          <span className="sm">guests · {INR(budget / guests)} each</span>
        </div>
        <div>
          <b>{fmtDate(plan.meta.date)}</b>
          <span className="sm">{plan.meta.city}</span>
        </div>
      </div>
      <h3>Budget &amp; tracker</h3>
      {plan.cats.map((c, i) => {
        const r = c.amt ? (c.actual / c.amt) * 100 : 0;
        const warn = r >= 90;
        return (
          <div className="cat" key={c.cat}>
            <div>
              <strong>{c.cat}</strong>
              <div className="sm">
                {INR(c.amt)} · {((c.amt / budget) * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div
                className={`bar${warn ? " warn" : ""}`}
                role="progressbar"
                aria-label={`${c.cat} spent`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, Math.round(r))}
              >
                <i style={{ width: `${Math.min(100, r)}%` }} />
              </div>
              <div className={`sm badge${warn ? " warn" : ""}`}>
                {r > 100
                  ? `⚠ Over budget by ${INR(c.actual - c.amt)}`
                  : warn
                    ? "⚠ Over 90% used"
                    : "On track"}
              </div>
            </div>
            <div>
              <label className="sm" htmlFor={`a${i}`}>
                Actual spend (₹)
              </label>
              <input
                id={`a${i}`}
                type="number"
                min={0}
                value={c.actual || ""}
                onChange={(e) => onActual(i, Math.max(0, Math.min(1e9, Number(e.target.value) || 0)))}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
});
export default BudgetTracker;
