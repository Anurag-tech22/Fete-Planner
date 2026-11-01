import { memo, type ReactNode } from "react";

export interface ChecklistItem {
  key: string;
  label: ReactNode;
  done: boolean;
}
interface Props {
  id: string;
  title: string;
  prefix: string;
  items: ChecklistItem[];
  onToggle: (index: number, done: boolean) => void;
}

/** Accessible checkbox list (a real label per box) used for the timeline and the vendor checklist. */
const Checklist = memo(function Checklist({ id, title, prefix, items, onToggle }: Props) {
  return (
    <section className="card" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <ul>
        {items.map((it, i) => (
          <li className="chk" key={it.key}>
            <input
              type="checkbox"
              id={`${prefix}${i}`}
              checked={it.done}
              onChange={(e) => onToggle(i, e.target.checked)}
            />
            <label htmlFor={`${prefix}${i}`} className={it.done ? "done" : ""} style={{ fontWeight: 400 }}>
              {it.label}
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
});
export default Checklist;
