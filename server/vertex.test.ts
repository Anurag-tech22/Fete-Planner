import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ gen: vi.fn(), opts: [] as unknown[] }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: h.gen };
    constructor(o: unknown) {
      h.opts.push(o);
    }
  },
}));
import { vertexAi } from "./ai";
import { buildPlan, IntakeSchema } from "../shared/plan";

const intake = IntakeSchema.parse({
  type: "birthday",
  name: "A",
  date: "2099-01-01",
  guests: 10,
  budget: 50000,
});
beforeEach(() => {
  h.gen.mockReset();
  h.opts.length = 0;
});

describe("vertexAi (Gemini on Vertex, no API key)", () => {
  it("authenticates through project + location, not a key", () => {
    vertexAi("my-proj", "us-central1");
    expect(h.opts[0]).toEqual({ vertexai: true, project: "my-proj", location: "us-central1" });
  });
  it("returns validated ideas and sends JSON mode", async () => {
    h.gen.mockResolvedValue({ text: '{"ideas":["One","Two"]}' });
    expect(await vertexAi("p", "l", "gemini-x").ideas(intake)).toEqual(["One", "Two"]);
    expect(h.gen.mock.calls[0]?.[0]).toMatchObject({
      model: "gemini-x",
      config: { responseMimeType: "application/json" },
    });
  });
  it("refines and falls back to null on empty or invalid output", async () => {
    h.gen.mockResolvedValueOnce({ text: '{"pct":{"Venue":40},"note":"ok"}' });
    expect((await vertexAi("p", "l").refine(buildPlan(intake), "x"))?.note).toBe("ok");
    h.gen.mockResolvedValue({ text: undefined });
    expect(await vertexAi("p", "l").ideas(intake)).toBeNull();
  });
});
