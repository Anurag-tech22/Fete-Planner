import { memo } from "react";
import type { Plan } from "../../shared/plan";

const COLORS = [
  "#b4390f",
  "#7c2d8e",
  "#17653a",
  "#1d4ed8",
  "#a16207",
  "#be185d",
  "#0f766e",
  "#6b5348",
  "#4338ca",
  "#9a3412",
  "#15803d",
  "#7e22ce",
];

/** Budget donut; its accessible name lists every slice, so the chart never relies on colour. */
const Donut = memo(function Donut({ cats, total }: { cats: Plan["cats"]; total: number }) {
  let offset = 0;
  const label = cats.map((c) => `${c.cat} ${Math.round((c.amt / total) * 100)}%`).join(", ");
  return (
    <svg viewBox="0 0 42 42" width="160" height="160" role="img" aria-label={`Budget split: ${label}`}>
      {cats.map((c, i) => {
        const pct = (c.amt / total) * 100;
        const slice = (
          <circle
            key={c.cat}
            cx="21"
            cy="21"
            r="15.915"
            fill="none"
            stroke={COLORS[i % COLORS.length]}
            strokeWidth="6"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeDashoffset={25 - offset}
          />
        );
        offset += pct;
        return slice;
      })}
    </svg>
  );
});

export default function Insights({ plan, insights }: { plan: Plan; insights: string[] }) {
  return (
    <section className="card" aria-labelledby="h-ins">
      <h2 id="h-ins">Budget insights</h2>
      <div className="ins">
        <Donut cats={plan.cats} total={plan.meta.budget} />
        <ul>
          {insights.map((x) => (
            <li key={x}>💡 {x}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
