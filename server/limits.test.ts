import { describe, expect, it, vi } from "vitest";
import { IntakeSchema } from "../shared/plan";
import { modelAi } from "./ai";

const intake = IntakeSchema.parse({
  type: "birthday",
  name: "A",
  date: "2099-01-01",
  guests: 10,
  budget: 50000,
});

describe("model time limits", () => {
  it("gives up on a model call that never answers", async () => {
    const generate = vi.fn(() => new Promise<string>(() => {}));
    const started = Date.now();
    expect(await modelAi(generate, { attemptMs: 20, totalMs: 500 }).ideas(intake)).toBeNull();
    expect(generate).toHaveBeenCalledTimes(3);
    expect(Date.now() - started).toBeLessThan(1000);
  });
  it("stops retrying once the overall deadline has passed", async () => {
    const generate = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 40));
      return "not json";
    });
    expect(await modelAi(generate, { attemptMs: 1000, totalMs: 60 }).ideas(intake)).toBeNull();
    expect(generate).toHaveBeenCalledTimes(2);
  });
  it("returns promptly when the model answers", async () => {
    expect(await modelAi(async () => '{"ideas":["One"]}').ideas(intake)).toEqual(["One"]);
  });
});
