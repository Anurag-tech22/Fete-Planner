# API reference

Base path: `/api`. All bodies are JSON. Unknown fields are rejected. Errors look like `{ "error": "message" }` and never include stack traces.

| Method | Path             | Purpose                                                                                     | Success                     | Errors                     |
| ------ | ---------------- | ------------------------------------------------------------------------------------------- | --------------------------- | -------------------------- |
| GET    | `/api/health`    | Liveness and active AI provider (`vertex`, `gemini`, `offline`)                             | `200 {ok, ai}`              | `429`                      |
| GET    | `/api/health/ai` | Deep check: asks the model a tiny question; `working` says whether it answers (cached 60 s) | `200 {ok, ai, working, ms}` | `429`                      |
| POST   | `/api/plan`      | Create a plan from event details                                                            | `200 Plan`                  | `400`, `413`, `429`, `500` |
| POST   | `/api/refine`    | Re-budget and re-style an existing plan from a request                                      | `200 Plan`                  | `400`, `413`, `429`, `500` |

## `POST /api/plan`

| Field                   | Type    | Rules                                           |
| ----------------------- | ------- | ----------------------------------------------- |
| `type`                  | string  | `wedding`, `birthday` or `community`            |
| `name`                  | string  | 1–60 characters                                 |
| `date`                  | string  | real calendar date `YYYY-MM-DD`, today or later |
| `guests`                | integer | 1–5000                                          |
| `budget`                | integer | whole rupees, 5,000 – 100,000,000               |
| `city`, `vibe`, `notes` | string  | optional, up to 40 / 80 / 160 characters        |

```bash
curl -s localhost:8787/api/plan -H 'content-type: application/json' \
  -d '{"type":"wedding","name":"Asha & Ravi","date":"2099-03-01","guests":100,"budget":500000,"city":"Pune"}'
```

The response `Plan` contains `meta`, `cats` (category amounts that always add up to the budget), `tl` (timeline), `vendors`, `ideas` and `note`.

## `POST /api/refine`

Body: `{ "plan": Plan, "instruction": "cut the budget by 20%" }` (instruction 1–200 characters). The plan is re-validated: category amounts must equal the budget and unknown keys are rejected. If the AI is unavailable the plan is returned unchanged with an explanatory `note`.

## Limits and headers

- 30 requests per minute per client on `/api` (`429` beyond that), 20 kB request bodies (`413`).
- Every response carries `X-Request-Id`; API responses are `Cache-Control: no-store`.
