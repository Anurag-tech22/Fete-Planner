import { useState, type FormEvent } from "react";
import { IntakeSchema, type Intake } from "../../shared/plan";

const INIT = {
  type: "birthday",
  name: "",
  date: "",
  guests: "50",
  budget: "200000",
  city: "Pune",
  vibe: "",
  notes: "",
};
const FIELDS: [keyof typeof INIT, string, string][] = [
  ["name", "Event name", "text"],
  ["date", "Event date", "date"],
  ["guests", "Guests", "number"],
  ["budget", "Total budget (₹)", "number"],
  ["city", "City", "text"],
  ["vibe", "Theme / vibe", "text"],
  ["notes", "Must-haves, diet, accessibility", "text"],
];

interface Props {
  busy: boolean;
  onCreate: (intake: Intake) => void;
  onInvalid: () => void;
}

/** Intake form: validates with the shared schema, shows inline errors and moves focus to the first one. */
export default function PlanForm({ busy, onCreate, onInvalid }: Props) {
  const [f, setF] = useState(INIT);
  const [errs, setErrs] = useState<Record<string, string>>({});

  function submit(e: FormEvent) {
    e.preventDefault();
    const r = IntakeSchema.safeParse({ ...f, guests: Number(f.guests), budget: Number(f.budget) });
    if (r.success) {
      setErrs({});
      onCreate(r.data);
      return;
    }
    const m: Record<string, string> = {};
    r.error.issues.forEach((i) => {
      m[String(i.path[0])] ??= i.message;
    });
    setErrs(m);
    onInvalid();
    (document.getElementById(`f-${Object.keys(m)[0]}`) as HTMLElement).focus();
  }

  return (
    <section className="card noprint" aria-labelledby="h-in">
      <h2 id="h-in">1 · Event details</h2>
      <form onSubmit={submit} noValidate>
        <div className="grid">
          <div>
            <label htmlFor="f-type">Event type</label>
            <select id="f-type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              <option value="wedding">Wedding</option>
              <option value="birthday">Birthday</option>
              <option value="community">Community event</option>
            </select>
          </div>
          {FIELDS.map(([k, label, type]) => (
            <div key={k}>
              <label htmlFor={`f-${k}`}>{label}</label>
              <input
                id={`f-${k}`}
                type={type}
                value={f[k]}
                maxLength={type === "text" ? 160 : undefined}
                min={k === "date" ? new Date().toISOString().slice(0, 10) : undefined}
                aria-invalid={!!errs[k]}
                aria-describedby={`e-${k}`}
                onChange={(e) => setF({ ...f, [k]: e.target.value })}
              />
              <p className="err" id={`e-${k}`}>
                {errs[k] ?? ""}
              </p>
            </div>
          ))}
        </div>
        <div className="row">
          <button type="submit" disabled={busy}>
            Create my plan
          </button>
        </div>
      </form>
    </section>
  );
}
