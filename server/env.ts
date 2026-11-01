import { z } from "zod";

const Env = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  GEMINI_API_KEY: z.string().min(10, "GEMINI_API_KEY looks too short").optional(),
  GOOGLE_CLOUD_PROJECT: z.string().min(1).optional(),
  GOOGLE_CLOUD_LOCATION: z.string().default("us-central1"),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().min(1).max(100000).default(30),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  CLIENT_ORIGIN: z.string().url().optional(),
  TRUST_PROXY: z.enum(["0", "1"]).default("0"),
});
/** Validates configuration at boot; empty strings count as unset so a blank `.env` entry is safe. */
export const loadEnv = (src: NodeJS.ProcessEnv = process.env) =>
  Env.parse(Object.fromEntries(Object.entries(src).filter(([, v]) => v !== undefined && v !== "")));
