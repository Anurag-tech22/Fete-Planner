// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { IntakeSchema, buildPlan } from "../shared/plan";
import { encodePlan } from "../shared/extras";

const plan = buildPlan(
  IntakeSchema.parse({ type: "birthday", name: "Aarav", date: "2099-01-01", guests: 40, budget: 80000 }),
);
const ok = (data: unknown) => vi.fn(async () => ({ ok: true, json: async () => data }));
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function generate() {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Event name"), { target: { value: "Aarav" } });
  fireEvent.change(screen.getByLabelText("Event date"), { target: { value: "2099-01-01" } });
  fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
  await screen.findByRole("heading", { name: /Aarav/ });
}
describe("App", () => {
  it("shows accessible validation errors and moves focus", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
    const name = screen.getByLabelText("Event name");
    expect(name).toHaveProperty("ariaInvalid", "true");
    expect(document.activeElement).toBe(name);
    expect(screen.getByText("Please name your event.")).toBeTruthy();
  });
  it("generates a plan and has no axe violations", async () => {
    vi.stubGlobal("fetch", ok(plan));
    await generate();
    const r = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });
  it("toggles checklist items and warns when over budget", async () => {
    vi.stubGlobal("fetch", ok(plan));
    await generate();
    const box = screen.getByLabelText("Venue / party space") as HTMLInputElement;
    fireEvent.click(box);
    expect(box.checked).toBe(true);
    fireEvent.change(screen.getAllByLabelText("Actual spend (₹)")[0]!, { target: { value: "999999" } });
    expect(screen.getAllByText(/Over budget by/).length).toBe(1);
  });
  it("refines via the API", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => plan })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...plan, note: "Refined!" }) });
    vi.stubGlobal("fetch", f);
    await generate();
    fireEvent.change(screen.getByLabelText("Ask for a change"), { target: { value: "cheaper" } });
    fireEvent.click(screen.getByRole("button", { name: "Refine plan" }));
    await waitFor(() => expect(screen.getByText("Refined!")).toBeTruthy());
  });
  it("shows server errors without crashing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({ error: "Too many requests — slow down." }) })),
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText("Event name"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Event date"), { target: { value: "2099-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
    await screen.findByText("Too many requests — slow down.");
  });
  it("exports calendar and JSON and shows an accessible chart", async () => {
    vi.stubGlobal("fetch", ok(plan));
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await generate();
    fireEvent.click(screen.getByRole("button", { name: /calendar/i }));
    fireEvent.click(screen.getByRole("button", { name: "Download JSON" }));
    expect(click).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("img", { name: /Budget split: Venue/ })).toBeTruthy();
    click.mockRestore();
  });
  it("restores a saved plan and clears it on start over", async () => {
    localStorage.setItem("fete.v1", JSON.stringify(plan));
    render(<App />);
    expect(screen.getByRole("heading", { name: /Aarav/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.queryByRole("heading", { name: /Aarav/ })).toBeNull();
    expect(localStorage.getItem("fete.v1")).toBeNull();
  });
  it("ignores a corrupted saved plan", () => {
    localStorage.setItem("fete.v1", "{oops");
    render(<App />);
    expect(screen.queryByRole("heading", { name: /2 ·/ })).toBeNull();
  });
  it("asks for text before refining", async () => {
    vi.stubGlobal("fetch", ok(plan));
    await generate();
    fireEvent.click(screen.getByRole("button", { name: "Refine plan" }));
    expect(screen.getByText("Type a change first.")).toBeTruthy();
  });
  it("refines on Enter and survives a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => plan })
        .mockRejectedValueOnce(new Error("offline")),
    );
    await generate();
    const box = screen.getByLabelText("Ask for a change");
    fireEvent.change(box, { target: { value: "x" } });
    fireEvent.keyDown(box, { key: "Enter" });
    await screen.findByText("offline");
  });
  it("shows the day-of run sheet", async () => {
    vi.stubGlobal("fetch", ok(plan));
    await generate();
    expect(screen.getByRole("table", { name: /Suggested schedule/ })).toBeTruthy();
  });
  it("tracks guests, RSVPs and dietary needs", async () => {
    vi.stubGlobal("fetch", ok(plan));
    await generate();
    fireEvent.click(screen.getByRole("button", { name: "Add guest" }));
    expect(screen.getByText("Enter a guest name.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Guest name"), { target: { value: "Meera" } });
    fireEvent.change(screen.getByLabelText("Diet"), { target: { value: "jain" } });
    fireEvent.click(screen.getByRole("button", { name: "Add guest" }));
    fireEvent.change(screen.getByLabelText("RSVP for Meera"), { target: { value: "yes" } });
    expect(screen.getByText("1 confirmed")).toBeTruthy();
    expect(screen.getByText(/1 jain/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove Meera" }));
    expect(screen.queryByText("Meera")).toBeNull();
  });
  it("copies a share link, falling back to the address bar", async () => {
    vi.stubGlobal("fetch", ok(plan));
    await generate();
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn(async () => undefined) } });
    fireEvent.click(screen.getByRole("button", { name: "Copy share link" }));
    await screen.findByText("Share link copied.");
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn(async () => {
          throw new Error("denied");
        }),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Copy share link" }));
    await screen.findByText(/address bar/);
  });
  it("opens a shared plan from the URL and ignores tampered ones", () => {
    location.hash = "#plan=" + encodePlan(plan);
    render(<App />);
    expect(screen.getByRole("heading", { name: /Aarav/ })).toBeTruthy();
    cleanup();
    localStorage.clear();
    location.hash = "#plan=garbage";
    render(<App />);
    expect(screen.queryByRole("heading", { name: /2 ·/ })).toBeNull();
    location.hash = "";
  });
});

describe("Guests edge cases", () => {
  const seed = (n: number) =>
    localStorage.setItem(
      "fete.guests.v1",
      JSON.stringify(Array.from({ length: n }, (_, i) => ({ name: `G${i}`, diet: "none", rsvp: "pending" }))),
    );
  it("restores saved guests and enforces the 500-guest cap", async () => {
    seed(500);
    vi.stubGlobal("fetch", ok(plan));
    await generate();
    fireEvent.change(screen.getByLabelText("Guest name"), { target: { value: "Extra" } });
    fireEvent.click(screen.getByRole("button", { name: "Add guest" }));
    expect(screen.getByText("You can track up to 500 guests.")).toBeTruthy();
  });
  it("ignores corrupted saved guests", async () => {
    localStorage.setItem("fete.guests.v1", "{bad");
    vi.stubGlobal("fetch", ok(plan));
    await generate();
    expect(screen.getByText("No confirmed guests yet.")).toBeTruthy();
  });
  it("warns when confirmed guests exceed capacity", async () => {
    vi.stubGlobal("fetch", ok({ ...plan, meta: { ...plan.meta, guests: 1 } }));
    await generate();
    for (const n of ["A", "B"]) {
      fireEvent.change(screen.getByLabelText("Guest name"), { target: { value: n } });
      fireEvent.click(screen.getByRole("button", { name: "Add guest" }));
      fireEvent.change(screen.getByLabelText(`RSVP for ${n}`), { target: { value: "yes" } });
    }
    expect(screen.getByText(/1 over capacity/)).toBeTruthy();
  });
  it("shows plan health and reacts when spending goes over budget", async () => {
    vi.stubGlobal("fetch", ok(plan));
    await generate();
    expect(screen.getByRole("heading", { name: "Plan health: 100/100" })).toBeTruthy();
    expect(screen.getByText(/Next best action:/)).toBeTruthy();
    fireEvent.change(screen.getAllByLabelText("Actual spend (₹)")[0]!, { target: { value: "999999" } });
    expect(screen.getByRole("heading", { name: /Plan health: \d+\/100/ }).textContent).not.toContain(
      "100/100",
    );
    expect(screen.getByText("Venue is over budget")).toBeTruthy();
  });
  it("shows a friendly message when the network fails without detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("");
      }),
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText("Event name"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Event date"), { target: { value: "2099-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
    await screen.findByText("Network error — please try again.");
  });
  it("cancels an in-flight request when a newer one starts, without showing an error", async () => {
    vi.stubGlobal("fetch", ok(plan));
    await generate();
    const hang = vi.fn(
      (_p: string, init: RequestInit) =>
        new Promise((_res, rej) =>
          init.signal!.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError"))),
        ),
    );
    vi.stubGlobal("fetch", hang);
    const box = screen.getByLabelText("Ask for a change");
    fireEvent.change(box, { target: { value: "x" } });
    fireEvent.keyDown(box, { key: "Enter" });
    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(hang).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/aborted|Network error/)).toBeNull();
  });
  it("ticks off timeline milestones and moves the next best action forward", async () => {
    vi.stubGlobal("fetch", ok(plan));
    await generate();
    expect(screen.getByText(/^Lock date, budget and guest list \(by/)).toBeTruthy();
    const box = screen.getByLabelText(/Lock date, budget and guest list/) as HTMLInputElement;
    fireEvent.click(box);
    expect(box.checked).toBe(true);
    expect(screen.getByText(/^Book venue \(by/)).toBeTruthy();
  });
});
