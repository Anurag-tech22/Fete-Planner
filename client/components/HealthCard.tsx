import { memo } from "react";
import type { Health } from "../../shared/health";

const LABEL = { high: "⚠ High", medium: "▲ Medium", low: "● Low" } as const;

/** Readiness score, the next best action and the risks behind the score (never colour-only). */
const HealthCard = memo(function HealthCard({ health }: { health: Health }) {
  return (
    <section className="card" aria-labelledby="h-health">
      <h2 id="h-health">Plan health: {health.score}/100</h2>
      <div
        className="bar"
        role="progressbar"
        aria-label="Plan health"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={health.score}
      >
        <i style={{ width: `${health.score}%` }} />
      </div>
      <p>
        <strong>Next best action:</strong> {health.next}
      </p>
      {health.risks.length > 0 && (
        <ul>
          {health.risks.map((r) => (
            <li key={r.title}>
              <strong>{LABEL[r.severity]}:</strong> {r.title}
              <span className="sm"> — {r.action}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});
export default HealthCard;
