import { afterEach, describe, expect, it, vi } from "vitest";
import { log } from "./log";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GOOGLE_CLOUD_PROJECT;
});
const line = (spy: { mock: { calls: unknown[][] } }) => JSON.parse(String(spy.mock.calls[0]?.[0]));

describe("structured Cloud Logging output", () => {
  it("emits severity and message as one JSON line", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log("INFO", "hello", { port: 1 });
    expect(line(spy)).toEqual({ severity: "INFO", message: "hello", port: 1 });
  });
  it("links entries to the Cloud Trace when the project is known", () => {
    process.env.GOOGLE_CLOUD_PROJECT = "demo";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    log("ERROR", "boom", {}, "abc123/456;o=1");
    expect(line(spy)["logging.googleapis.com/trace"]).toBe("projects/demo/traces/abc123");
  });
  it("omits the trace field without a project or header", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log("WARNING", "x", {}, "abc/1");
    expect(line(spy)["logging.googleapis.com/trace"]).toBeUndefined();
  });
});
