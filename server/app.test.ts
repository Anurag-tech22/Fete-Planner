import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app";
import { offlineAi, type Ai } from "./ai";
import { buildPlan, IntakeSchema } from "../shared/plan";

const body = {
  type: "wedding",
  name: "Test",
  date: "2099-01-01",
  guests: 100,
  budget: 500000,
  city: "Pune",
  vibe: "",
  notes: "",
};
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {}); // keep expected error logs out of test output
});
afterEach(() => vi.restoreAllMocks());

const fake: Ai = {
  ideas: vi.fn(async () => ["Idea A"]),
  refine: vi.fn(async () => ({ pct: { Venue: 60 }, ideas: ["Idea B"], note: "Done" })),
};

describe("API", () => {
  it("creates a plan with AI ideas", async () => {
    const r = await request(createApp(fake)).post("/api/plan").send(body);
    expect(r.status).toBe(200);
    expect(r.body.ideas).toEqual(["Idea A"]);
    expect(r.body.cats.reduce((a: number, c: { amt: number }) => a + c.amt, 0)).toBe(500000);
  });
  it("falls back when AI is unavailable", async () => {
    const r = await request(createApp(offlineAi)).post("/api/plan").send(body);
    expect(r.status).toBe(200);
    expect(r.body.ideas.length).toBeGreaterThan(0);
  });
  it("caches identical requests", async () => {
    const ai: Ai = { ...fake, ideas: vi.fn(async () => ["x"]) };
    const app = createApp(ai);
    await request(app).post("/api/plan").send(body);
    await request(app).post("/api/plan").send(body);
    expect(ai.ideas).toHaveBeenCalledTimes(1);
  });
  it("rejects invalid input with a clean 400", async () => {
    const r = await request(createApp(fake))
      .post("/api/plan")
      .send({ ...body, budget: 1 });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).not.toMatch(/at .*\.ts|stack/);
  });
  it("rejects malformed JSON", async () => {
    const r = await request(createApp(fake))
      .post("/api/plan")
      .set("Content-Type", "application/json")
      .send("{bad");
    expect(r.status).toBe(400);
  });
  it("rejects oversized bodies", async () => {
    const r = await request(createApp(fake))
      .post("/api/plan")
      .send({ ...body, notes: "x".repeat(40000) });
    expect(r.status).toBe(413);
  });
  it("refines a plan and keeps totals", async () => {
    const plan = buildPlan(IntakeSchema.parse(body));
    const r = await request(createApp(fake)).post("/api/refine").send({ plan, instruction: "bigger venue" });
    expect(r.status).toBe(200);
    expect(r.body.note).toBe("Done");
    expect(r.body.cats.reduce((a: number, c: { amt: number }) => a + c.amt, 0)).toBe(500000);
  });
  it("leaves the plan unchanged if refine AI fails", async () => {
    const plan = buildPlan(IntakeSchema.parse(body));
    const r = await request(createApp(offlineAi)).post("/api/refine").send({ plan, instruction: "x" });
    expect(r.body.cats).toEqual(plan.cats);
    expect(r.body.note).toMatch(/unavailable/);
  });
  it("rejects refine without an instruction", async () => {
    const r = await request(createApp(fake))
      .post("/api/refine")
      .send({ plan: buildPlan(IntakeSchema.parse(body)), instruction: "" });
    expect(r.status).toBe(400);
  });
  it("returns 500 without leaking details", async () => {
    const bad: Ai = {
      ideas: async () => {
        throw new Error("secret");
      },
      refine: async () => null,
    };
    const r = await request(createApp(bad)).post("/api/plan").send(body);
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain("secret");
  });
  it("sets security headers and hides Express", async () => {
    const r = await request(createApp(fake)).get("/api/health");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["x-powered-by"]).toBeUndefined();
  });
  it("rate limits with 429", async () => {
    const app = createApp(fake, { limit: 2 });
    await request(app).get("/api/health");
    await request(app).get("/api/health");
    expect((await request(app).get("/api/health")).status).toBe(429);
  });
});

describe("hardening", () => {
  it("rejects unknown fields (mass assignment)", async () =>
    expect(
      (
        await request(createApp(fake))
          .post("/api/plan")
          .send({ ...body, isAdmin: true })
      ).status,
    ).toBe(400));
  it("sends a content-security-policy", async () =>
    expect((await request(createApp(fake)).get("/api/health")).headers["content-security-policy"]).toContain(
      "default-src 'self'",
    ));
  it("does not enable CORS for unknown origins", async () =>
    expect(
      (await request(createApp(fake)).get("/api/health").set("Origin", "https://evil.example")).headers[
        "access-control-allow-origin"
      ],
    ).toBeUndefined());
  it("allows the configured origin", async () =>
    expect(
      (
        await request(createApp(fake, { origin: "https://ok.example" }))
          .get("/api/health")
          .set("Origin", "https://ok.example")
      ).headers["access-control-allow-origin"],
    ).toBe("https://ok.example"));
  it("works behind a proxy", async () =>
    expect(
      (
        await request(createApp(fake, { trustProxy: true }))
          .get("/api/health")
          .set("X-Forwarded-For", "1.2.3.4")
      ).status,
    ).toBe(200));
  it("caps pct values to sane input (negative ignored)", async () => {
    const plan = buildPlan(IntakeSchema.parse(body));
    const ai: Ai = { ideas: async () => null, refine: async () => ({ pct: { Venue: -9 } }) };
    const r = await request(createApp(ai)).post("/api/refine").send({ plan, instruction: "x" });
    expect(r.body.cats).toEqual(plan.cats);
  });
});

describe("observability & headers", () => {
  it("adds a unique request id", async () => {
    const a = await request(createApp(fake)).get("/api/health"),
      b = await request(createApp(fake)).get("/api/health");
    expect(a.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(a.headers["x-request-id"]).not.toBe(b.headers["x-request-id"]);
  });
  it("restricts browser features", async () =>
    expect((await request(createApp(fake)).get("/api/health")).headers["permissions-policy"]).toContain(
      "camera=()",
    ));
});

describe("routing & limits", () => {
  it("rate-limits only the API, not other paths", async () => {
    const app = createApp(fake, { limit: 2 });
    for (let i = 0; i < 5; i++) await request(app).get("/index.html");
    expect((await request(app).get("/api/health")).status).toBe(200);
  });
  it("returns JSON 404 for unknown API routes", async () => {
    const r = await request(createApp(fake)).get("/api/nope");
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ error: "Not found." });
  });
  it("rejects impossible dates with a 400 (no crash)", async () =>
    expect(
      (
        await request(createApp(fake))
          .post("/api/plan")
          .send({ ...body, date: "2099-02-31" })
      ).status,
    ).toBe(400));
  it("rejects a tampered plan whose totals do not add up", async () => {
    const plan = buildPlan(IntakeSchema.parse(body));
    plan.cats[0]!.amt += 5;
    expect((await request(createApp(fake)).post("/api/refine").send({ plan, instruction: "x" })).status).toBe(
      400,
    );
  });
  it("still refines a plan whose event date has passed", async () => {
    const plan = buildPlan(IntakeSchema.parse(body));
    plan.meta.date = "2000-01-01";
    expect((await request(createApp(fake)).post("/api/refine").send({ plan, instruction: "x" })).status).toBe(
      200,
    );
  });
});

describe("api caching", () => {
  it("never lets proxies cache API responses", async () =>
    expect((await request(createApp(fake)).get("/api/health")).headers["cache-control"]).toBe("no-store"));
});

describe("GCP runtime", () => {
  it("reports the AI provider on the health check", async () => {
    expect((await request(createApp(fake, { provider: "vertex" })).get("/api/health")).body).toEqual({
      ok: true,
      ai: "vertex",
    });
    expect((await request(createApp(fake)).get("/api/health")).body).toEqual({ ok: true, ai: "offline" });
  });
  it("logs failures as structured JSON linked to the Cloud Trace", async () => {
    process.env.GOOGLE_CLOUD_PROJECT = "demo";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const bad: Ai = {
      ideas: async () => {
        throw new Error("boom");
      },
      refine: async () => null,
    };
    await request(createApp(bad)).post("/api/plan").set("X-Cloud-Trace-Context", "t123/1;o=1").send(body);
    const entry = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(entry).toMatchObject({
      severity: "ERROR",
      message: "request failed",
      status: 500,
      "logging.googleapis.com/trace": "projects/demo/traces/t123",
    });
    spy.mockRestore();
    delete process.env.GOOGLE_CLOUD_PROJECT;
  });
});

describe("cache behaviour", () => {
  const withIdeas = () => ({ ...fake, ideas: vi.fn(async () => ["x"]) }) as Ai;
  it("refreshes cached ideas after the 10-minute TTL", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const ai = withIdeas(),
      app = createApp(ai, { limit: 100 });
    await request(app).post("/api/plan").send(body);
    vi.setSystemTime(Date.now() + 11 * 60_000);
    await request(app).post("/api/plan").send(body);
    vi.useRealTimers();
    expect(ai.ideas).toHaveBeenCalledTimes(2);
  });
  it("evicts the oldest entry once the cache holds 200 plans", async () => {
    const ai = withIdeas(),
      app = createApp(ai, { limit: 10_000 });
    for (let i = 0; i <= 200; i++)
      await request(app)
        .post("/api/plan")
        .send({ ...body, name: `Event ${i}` });
    await request(app)
      .post("/api/plan")
      .send({ ...body, name: "Event 0" });
    expect(ai.ideas).toHaveBeenCalledTimes(202);
  });
});
describe("partial AI refinements", () => {
  const run = async (r: object) => {
    const plan = buildPlan(IntakeSchema.parse(body));
    const ai: Ai = { ideas: async () => null, refine: async () => r };
    return {
      plan,
      res: (await request(createApp(ai)).post("/api/refine").send({ plan, instruction: "x" })).body,
    };
  };
  it("keeps everything when the AI returns nothing useful", async () => {
    const { plan, res } = await run({});
    expect(res.cats).toEqual(plan.cats);
    expect(res.ideas).toEqual(plan.ideas);
    expect(res.note).toBe("");
  });
  it("applies new ideas on their own", async () =>
    expect((await run({ ideas: ["Fresh"] })).res.ideas).toEqual(["Fresh"]));
});

describe("deep AI health check", () => {
  it("reports whether the model actually answers", async () => {
    const ok = await request(createApp(fake, { provider: "vertex" })).get("/api/health/ai");
    expect(ok.body).toMatchObject({ ok: true, ai: "vertex", working: true });
    expect((await request(createApp(offlineAi)).get("/api/health/ai")).body).toMatchObject({
      ai: "offline",
      working: false,
    });
  });
  it("caches the probe for a minute to cap cost", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const ai: Ai = { ...fake, ideas: vi.fn(async () => ["x"]) };
    const app = createApp(ai);
    await request(app).get("/api/health/ai");
    await request(app).get("/api/health/ai");
    expect(ai.ideas).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 61_000);
    await request(app).get("/api/health/ai");
    vi.useRealTimers();
    expect(ai.ideas).toHaveBeenCalledTimes(2);
  });
});
