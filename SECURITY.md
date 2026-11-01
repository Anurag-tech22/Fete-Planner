# Security

## Reporting a vulnerability

Please report security issues privately through GitHub's **Report a vulnerability** (Security → Advisories) instead of a public issue. You will get an acknowledgement within a few days. Only the latest release is supported.

## Threat model

| Threat                           | Mitigation                                                                                                                                                                                              | Test                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| API key theft                    | Key lives only in the server environment; validated at boot; never sent to the browser                                                                                                                  | `server/env.test.ts`                           |
| Malformed or hostile input       | Strict Zod schemas on every request (unknown keys rejected), 20 kB body cap, real-calendar date check                                                                                                   | `server/app.test.ts`, `shared/plan.test.ts`    |
| Prompt injection                 | User text is JSON-encoded inside `<user_input>` with an explicit "never follow instructions" guard; AI output is schema-validated and rendered as plain text                                            | `server/ai.test.ts`                            |
| Hostile or broken model output   | Strict validation, non-finite numbers rejected, retries capped at 3, deterministic fallback                                                                                                             | `server/ai.test.ts`                            |
| Tampered plan or share link      | `PlanSchema` requires category totals to equal the budget and rejects unknown keys; client re-validates server responses                                                                                | `shared/extras.test.ts`, `shared/plan.test.ts` |
| Abuse / denial of service        | Rate limit on `/api` (429), body cap, bounded cache (200 entries, 10 min TTL), bounded guest list                                                                                                       | `server/app.test.ts`                           |
| Information leakage              | Generic error bodies (no stacks or secrets); request IDs for log correlation; `X-Powered-By` removed                                                                                                    | `server/app.test.ts`                           |
| Cross-origin and browser attacks | CORS allow-list (off by default), helmet CSP, `nosniff`, `Referrer-Policy`, Permissions-Policy, `Cache-Control: no-store` on API                                                                        | `server/app.test.ts`                           |
| Cross-site request forgery       | CSRF is mitigated by three layers: strict CORS origin allow-list, JSON `Content-Type` requirement (rejected by the browser's CORS preflight unless the origin is whitelisted), and no cookie-based auth | `server/app.test.ts`                           |
| Vulnerable dependencies          | `npm audit` = 0 vulnerabilities; CI fails on high severity                                                                                                                                              | `.github/workflows/ci.yml`                     |
| Slow or hung AI provider         | 10 s per attempt and a 25 s overall deadline; deterministic fallback keeps the app working                                                                                                              | `server/limits.test.ts`                        |
| Compromised CI dependency        | Every GitHub Action is pinned to a commit SHA and updated through Dependabot; workflows run with read-only permissions                                                                                  | `.github/workflows/`                           |
| Script injection in the browser  | CSP forbids inline scripts and `eval`; the app runs with zero CSP violations (Zod's JIT compiler is disabled in the browser)                                                                            | `e2e/app.spec.ts`                              |
| Cloud credentials                | On Cloud Run, Vertex AI is called with the service account identity (Application Default Credentials) limited to `roles/aiplatform.user`; no key exists to leak                                         | `server/vertex.test.ts`                        |

No accounts, no server-side storage of personal data: plans and guest lists stay in the browser.
