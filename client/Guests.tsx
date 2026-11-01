import { useEffect, useState, type FormEvent } from "react";
import {
  GuestSchema,
  GuestsSchema,
  MAX_GUESTS,
  catererNote,
  summarizeGuests,
  type Guest,
} from "../shared/extras";

const KEY = "fete.guests.v1";
function load(): Guest[] {
  try {
    const r = GuestsSchema.safeParse(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    return r.success ? r.data : [];
  } catch {
    return [];
  }
}

export default function Guests({ expected }: { expected: number }) {
  const [list, setList] = useState<Guest[]>(load);
  const [name, setName] = useState("");
  const [diet, setDiet] = useState<Guest["diet"]>("none");
  const [err, setErr] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* storage unavailable */
    }
  }, [list]);
  const s = summarizeGuests(list, expected);

  function add(e: FormEvent) {
    e.preventDefault();
    const r = GuestSchema.safeParse({ name, diet, rsvp: "pending" });
    if (list.length >= MAX_GUESTS) return setErr(`You can track up to ${MAX_GUESTS} guests.`);
    if (!r.success) return setErr(r.error.issues[0].message);
    setErr("");
    setList([...list, r.data]);
    setName("");
  }
  const patch = (i: number, g: Partial<Guest>) => setList(list.map((x, j) => (j === i ? { ...x, ...g } : x)));

  return (
    <section className="card noprint" aria-labelledby="h-g">
      <h2 id="h-g">Guest list &amp; dietary summary</h2>
      <form onSubmit={add} noValidate className="row">
        <div>
          <label htmlFor="gname">Guest name</label>
          <input
            id="gname"
            value={name}
            maxLength={60}
            aria-describedby="e-g"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="gdiet">Diet</label>
          <select id="gdiet" value={diet} onChange={(e) => setDiet(e.target.value as Guest["diet"])}>
            <option value="none">No preference</option>
            <option value="veg">Vegetarian</option>
            <option value="non-veg">Non-veg</option>
            <option value="vegan">Vegan</option>
            <option value="jain">Jain</option>
          </select>
        </div>
        <button type="submit" style={{ alignSelf: "end" }}>
          Add guest
        </button>
      </form>
      <p className="err" id="e-g" role="alert">
        {err}
      </p>
      <p>
        <strong>{s.confirmed} confirmed</strong> · {s.pending} pending · {s.declined} declined ·{" "}
        {s.capacityLeft >= 0 ? `${s.capacityLeft} seats left` : `⚠ ${-s.capacityLeft} over capacity`}
      </p>
      <p className="sm">{catererNote(s)}</p>
      <ul>
        {list.map((g, i) => (
          <li className="g" key={`${g.name}-${i}`}>
            <span style={{ flex: 1 }}>
              {g.name} <span className="sm">({g.diet === "none" ? "no preference" : g.diet})</span>
            </span>
            <select
              aria-label={`RSVP for ${g.name}`}
              value={g.rsvp}
              onChange={(e) => patch(i, { rsvp: e.target.value as Guest["rsvp"] })}
            >
              <option value="pending">Pending</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            <button
              type="button"
              className="ghost"
              aria-label={`Remove ${g.name}`}
              onClick={() => setList(list.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
