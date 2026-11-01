import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createHash, randomUUID } from "node:crypto";
import { ZodError, z } from "zod";
import { IntakeSchema, PlanSchema, buildPlan, normalize, type Intake } from "../shared/plan";
import type { Ai } from "./ai";
import { log } from "./log";

const RefineBody = z.object({ plan: PlanSchema, instruction: z.string().trim().min(1).max(200) });
const TTL = 10 * 60_000;
const PROBE: Intake = {
  type: "birthday",
  name: "Health probe",
  date: "2099-01-01",
  guests: 10,
  budget: 50000,
  city: "",
  vibe: "",
  notes: "",
};

export function createApp(
  ai: Ai,
  opts: { limit?: number; origin?: string; trustProxy?: boolean; provider?: string } = {},
) {
  const app = express();
  if (opts.trustProxy) app.set("trust proxy", 1);
  const cache = new Map<string, { at: number; ideas: string[] | null }>();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use((_req, res, next) => {
    res.locals.id = randomUUID();
    res.setHeader("X-Request-Id", res.locals.id as string);
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  app.use(cors({ origin: opts.origin ?? false }));
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: opts.limit ?? 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests — slow down." },
    }),
  );
  app.use(express.json({ limit: "20kb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true, ai: opts.provider ?? "offline" }));

  /** Deep check: proves the model actually answers (not just that it is configured). Cached for 60 s to cap cost. */
  let probe: { at: number; body: object } | undefined;
  app.get("/api/health/ai", async (_req, res) => {
    if (!probe || Date.now() - probe.at > 60_000) {
      const started = Date.now();
      const ideas = await ai.ideas(PROBE);
      probe = {
        at: Date.now(),
        body: { ok: true, ai: opts.provider ?? "offline", working: ideas !== null, ms: Date.now() - started },
      };
    }
    res.json(probe.body);
  });

  app.post("/api/plan", async (req, res) => {
    const intake = IntakeSchema.parse(req.body);
    const key = createHash("sha256").update(JSON.stringify(intake)).digest("hex");
    let hit = cache.get(key);
    if (!hit || Date.now() - hit.at > TTL) {
      hit = { at: Date.now(), ideas: await ai.ideas(intake) };
      cache.set(key, hit);
      if (cache.size > 200) cache.delete(cache.keys().next().value as string);
    }
    res.json(buildPlan(intake, hit.ideas));
  });

  app.post("/api/refine", async (req, res) => {
    const { plan, instruction } = RefineBody.parse(req.body);
    const next = structuredClone(plan);
    const r = await ai.refine(next, instruction);
    if (r) {
      if (r.pct) normalize(next.cats, next.meta.budget, r.pct);
      if (r.ideas) next.ideas = r.ideas;
      next.note = r.note ?? "";
    } else next.note = "AI unavailable — plan unchanged.";
    res.json(next);
  });

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));
  // Express identifies error handlers by their 4-argument signature.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) return res.status(400).json({ error: err.issues[0].message });
    const status = (err as { status?: number }).status;
    log(
      (status ?? 500) >= 500 ? "ERROR" : "WARNING",
      "request failed",
      { requestId: res.locals.id, status: status ?? 500, err: String(err).slice(0, 200) },
      req.header("x-cloud-trace-context"),
    );
    if (status && status < 500) return res.status(status).json({ error: "Bad request." });
    res.status(500).json({ error: "Something went wrong." });
  });
  return app;
}
