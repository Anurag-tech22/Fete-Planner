import { runSheet } from "../../shared/extras";
import type { Plan } from "../../shared/plan";

export function Ideas({ ideas, note }: { ideas: string[]; note: string }) {
  return (
    <section className="card" aria-labelledby="h-i">
      <h2 id="h-i">Personalised ideas</h2>
      <ul>
        {ideas.map((x, i) => (
          <li key={`${i}-${x}`}>✦ {x}</li>
        ))}
      </ul>
      {note && <p className="sm">{note}</p>}
    </section>
  );
}

export function RunSheet({ type }: { type: Plan["meta"]["type"] }) {
  return (
    <section className="card" aria-labelledby="h-rs">
      <h2 id="h-rs">Day-of run sheet</h2>
      <table>
        <caption className="sm">Suggested schedule — adjust the times to your venue</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">What happens</th>
          </tr>
        </thead>
        <tbody>
          {runSheet(type).map((r) => (
            <tr key={r.time}>
              <td>{r.time}</td>
              <td>{r.task}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
