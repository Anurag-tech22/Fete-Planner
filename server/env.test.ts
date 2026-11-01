import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("applies safe defaults", () =>
    expect(loadEnv({})).toMatchObject({
      PORT: 8787,
      RATE_LIMIT_PER_MIN: 30,
      TRUST_PROXY: "0",
      GEMINI_MODEL: "gemini-2.5-flash",
    }));
  it("treats blank values as unset", () =>
    expect(loadEnv({ GEMINI_API_KEY: "", PORT: "" }).GEMINI_API_KEY).toBeUndefined());
  it("coerces the port", () => expect(loadEnv({ PORT: "3000" }).PORT).toBe(3000));
  it.each([
    { PORT: "99999" },
    { RATE_LIMIT_PER_MIN: "0" },
    { PORT: "abc" },
    { GEMINI_API_KEY: "short" },
    { CLIENT_ORIGIN: "not a url" },
    { TRUST_PROXY: "yes" },
  ])("rejects %o", (e) => expect(() => loadEnv(e)).toThrow());
});

describe("GCP settings", () => {
  it("defaults the Vertex location and accepts a project", () => {
    expect(loadEnv({ GOOGLE_CLOUD_PROJECT: "p" })).toMatchObject({
      GOOGLE_CLOUD_PROJECT: "p",
      GOOGLE_CLOUD_LOCATION: "us-central1",
    });
  });
});
