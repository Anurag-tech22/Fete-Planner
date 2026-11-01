// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { offlineAi } from "../server/ai";
import { createApp } from "../server/app";
import App from "./App";

/** Full-stack contract tests: the real React app talks to the real Express app (only Gemini is stubbed). */
function wire(app: ReturnType<typeof createApp>) {
  vi.stubGlobal("fetch", async (path: string, init: RequestInit) => {
    const r = await request(app)
      .post(path)
      .set("Content-Type", "application/json")
      .send(JSON.parse(String(init.body)));
    return { ok: r.status < 400, json: async () => r.body };
  });
}
async function submit(name = "Meera") {
  fireEvent.change(screen.getByLabelText("Event name"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Event date"), { target: { value: "2099-01-01" } });
  fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
}
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("client ↔ server", () => {
  it("creates and refines a plan end to end", async () => {
    wire(createApp(offlineAi));
    render(<App />);
    await submit();
    await screen.findByRole("heading", { name: /Meera/ });
    expect(screen.getAllByRole("progressbar").length).toBeGreaterThan(3);
    fireEvent.change(screen.getByLabelText("Ask for a change"), { target: { value: "cheaper" } });
    fireEvent.click(screen.getByRole("button", { name: "Refine plan" }));
    await screen.findByText("AI unavailable — plan unchanged.");
  });
  it("shows the server's rate-limit message", async () => {
    wire(createApp(offlineAi, { limit: 1 }));
    render(<App />);
    await submit();
    await screen.findByRole("heading", { name: /Meera/ });
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
    await screen.findByText("Too many requests — slow down.");
  });
  it("rejects a malformed server response", async () => {
    vi.stubGlobal("fetch", async () => ({ ok: true, json: async () => ({ hello: "world" }) }));
    render(<App />);
    await submit();
    await screen.findByText("Unexpected response from the server.");
  });
});
