import { useState } from "react";
import type { Plan } from "../../shared/plan";
import { toICS } from "../../shared/reports";
import { download } from "../lib";

interface Props {
  plan: Plan;
  busy: boolean;
  onRefine: (instruction: string) => void;
  onShare: () => void;
  onReset: () => void;
}

/** AI refinement box plus share / print / export / reset actions. */
export default function RefineBar({ plan, busy, onRefine, onShare, onReset }: Props) {
  const [ask, setAsk] = useState("");
  return (
    <section className="card noprint" aria-labelledby="h-r">
      <h2 id="h-r">3 · Refine with AI</h2>
      <label htmlFor="ask">Ask for a change</label>
      <input
        id="ask"
        value={ask}
        maxLength={200}
        placeholder="Cut the budget by 20% / make it outdoors"
        onChange={(e) => setAsk(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onRefine(ask);
        }}
      />
      <div className="row">
        <button type="button" disabled={busy} onClick={() => onRefine(ask)}>
          Refine plan
        </button>
        <button type="button" className="ghost" onClick={onShare}>
          Copy share link
        </button>
        <button type="button" className="ghost" onClick={() => window.print()}>
          Print
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => download("fete-timeline.ics", "text/calendar", toICS(plan))}
        >
          Add timeline to calendar (.ics)
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => download("fete-plan.json", "application/json", JSON.stringify(plan, null, 2))}
        >
          Download JSON
        </button>
        <button type="button" className="ghost" onClick={onReset}>
          Start over
        </button>
      </div>
    </section>
  );
}
