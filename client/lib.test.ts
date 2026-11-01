// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodePlan } from "../shared/extras";
import { IntakeSchema, buildPlan } from "../shared/plan";
import { download, fmtDate, initialPlan, postPlan, savePlan } from "./lib";

const plan = buildPlan(
  IntakeSchema.parse({ type: "birthday", name: "Aarav", date: "2099-01-01", guests: 40, budget: 80000 }),
);
const reply = (ok: boolean, body: unknown) => vi.fn(async () => ({ ok, json: async () => body }));
const signal = new AbortController().signal;
beforeEach(() => {
  localStorage.clear();
  location.hash = "";
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("postPlan", () => {
  it("returns a validated plan", async () => {
    vi.stubGlobal("fetch", reply(true, plan));
    expect(await postPlan("/api/plan", {}, signal)).toEqual(plan);
  });
  it("surfaces the server's error message", async () => {
    vi.stubGlobal("fetch", reply(false, { error: "Nope." }));
    await expect(postPlan("/x", {}, signal)).rejects.toThrow("Nope.");
  });
  it("falls back to a generic message", async () => {
    vi.stubGlobal("fetch", reply(false, {}));
    await expect(postPlan("/x", {}, signal)).rejects.toThrow("Request failed");
  });
  it("rejects responses that are not valid plans", async () => {
    vi.stubGlobal("fetch", reply(true, { hi: 1 }));
    await expect(postPlan("/x", {}, signal)).rejects.toThrow("Unexpected response");
  });
});
describe("storage and sharing", () => {
  it("round-trips a saved plan and clears it", () => {
    savePlan(plan);
    expect(initialPlan()).toEqual(plan);
    savePlan(null);
    expect(initialPlan()).toBeNull();
  });
  it("never throws when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => savePlan(plan)).not.toThrow();
    expect(() => savePlan(null)).not.toThrow();
  });
  it("prefers a valid shared link, ignores a bad one and a corrupted save", () => {
    location.hash = "#plan=" + encodePlan(plan);
    expect(initialPlan()).toEqual(plan);
    location.hash = "#plan=garbage";
    expect(initialPlan()).toBeNull();
    localStorage.setItem("fete.v1", "{oops");
    expect(initialPlan()).toBeNull();
  });
});
describe("helpers", () => {
  it("formats dates without timezone drift", () => expect(fmtDate("2099-01-05")).toBe("5 Jan 2099"));
  it("downloads through a temporary link and releases the URL", () => {
    const create = vi.fn(() => "blob:x"),
      revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    download("a.txt", "text/plain", "hi");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith("blob:x");
  });
});
