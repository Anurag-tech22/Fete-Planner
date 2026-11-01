import type { Plan } from "./plan";

const at = <T>(list: T[], index: number, change: (item: T) => T) =>
  list.map((item, i) => (i === index ? change(item) : item));

/** Immutable plan updates, kept pure so the UI never mutates shared state and the rules are unit-tested. */
export const setActual = (p: Plan, index: number, actual: number): Plan => ({
  ...p,
  cats: at(p.cats, index, (c) => ({ ...c, actual })),
});
export const setTimelineDone = (p: Plan, index: number, done: boolean): Plan => ({
  ...p,
  tl: at(p.tl, index, (t) => ({ ...t, done })),
});
export const setVendorDone = (p: Plan, index: number, done: boolean): Plan => ({
  ...p,
  vendors: at(p.vendors, index, (v) => ({ ...v, done })),
});
