// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntakeSchema, buildPlan } from "../shared/plan";
import BudgetTracker from "./components/BudgetTracker";
import PlanForm from "./components/PlanForm";
import RefineBar from "./components/RefineBar";
import Guests from "./Guests";

const plan = buildPlan(
  IntakeSchema.parse({ type: "birthday", name: "Aarav", date: "2099-01-01", guests: 40, budget: 80000 }),
);
beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("BudgetTracker", () => {
  it("renders every budget state and clamps typed values", () => {
    const p = structuredClone(plan);
    p.cats[0]!.amt = 0;
    p.cats[1]!.actual = Math.floor(p.cats[1]!.amt * 0.95);
    p.cats[2]!.actual = p.cats[2]!.amt + 500;
    const onActual = vi.fn();
    render(<BudgetTracker plan={p} headingRef={{ current: null }} onActual={onActual} />);
    expect(screen.getByText("⚠ Over 90% used")).toBeTruthy();
    expect(screen.getByText(/Over budget by ₹500/)).toBeTruthy();
    expect(screen.getAllByText("On track").length).toBeGreaterThan(0);
    const boxes = screen.getAllByLabelText("Actual spend (₹)");
    fireEvent.change(boxes[0]!, { target: { value: "-5" } });
    fireEvent.change(boxes[0]!, { target: { value: "9e12" } });
    fireEvent.change(boxes[1]!, { target: { value: "" } });
    expect(onActual.mock.calls).toEqual([
      [0, 0],
      [0, 1e9],
      [1, 0],
    ]);
  });
});
describe("RefineBar", () => {
  it("handles keyboard, print and the action buttons", () => {
    const print = vi.fn();
    window.print = print;
    const [onRefine, onShare, onReset] = [vi.fn(), vi.fn(), vi.fn()];
    render(<RefineBar plan={plan} busy={false} onRefine={onRefine} onShare={onShare} onReset={onReset} />);
    const box = screen.getByLabelText("Ask for a change");
    fireEvent.change(box, { target: { value: "x" } });
    fireEvent.keyDown(box, { key: "Escape" });
    expect(onRefine).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onRefine).toHaveBeenCalledWith("x");
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy share link" }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(print).toHaveBeenCalled();
    expect(onShare).toHaveBeenCalled();
    expect(onReset).toHaveBeenCalled();
  });
});
describe("PlanForm", () => {
  it("reports invalid input, then submits the chosen event type", () => {
    const [onCreate, onInvalid] = [vi.fn(), vi.fn()];
    render(<PlanForm busy={false} onCreate={onCreate} onInvalid={onInvalid} />);
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
    expect(onInvalid).toHaveBeenCalled();
    expect(onCreate).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Event type"), { target: { value: "wedding" } });
    fireEvent.change(screen.getByLabelText("Event name"), { target: { value: "Aarav" } });
    fireEvent.change(screen.getByLabelText("Event date"), { target: { value: "2099-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ type: "wedding", name: "Aarav" }));
  });
});
describe("Guests storage", () => {
  it.each(['[{"name":1}]', "{}", "{bad"])("ignores invalid saved data %s", (raw) => {
    localStorage.setItem("fete.guests.v1", raw);
    render(<Guests expected={10} />);
    expect(screen.getByText("No confirmed guests yet.")).toBeTruthy();
  });
});
