# Deploy on Google Cloud

Fête runs on **Cloud Run** and calls **Gemini on Vertex AI** with the service account's own identity, so there is no API key to create, store or leak.

## Prerequisites

| Need                                            | How                                     |
| ----------------------------------------------- | --------------------------------------- |
| A Google Cloud project with **billing enabled** | console.cloud.google.com → Billing      |
| You are **Owner** of that project               | Simplest way to avoid permission errors |
| Google Cloud CLI, signed in                     | `gcloud auth login`                     |

## Deploy

```bash
PROJECT_ID=your-project-id ./deploy/deploy.sh
```

The script is idempotent (safe to re-run). It enables the APIs, creates the runtime identity, builds the container with Cloud Build, deploys, and then **smoke-tests the live service**: health, plan creation, and whether Gemini on Vertex AI is really answering (`/api/health/ai` → `"working":true`).

| Variable        | Default       | Meaning                                                                  |
| --------------- | ------------- | ------------------------------------------------------------------------ |
| `REGION`        | `asia-south1` | Where Cloud Run runs. Mumbai gives the lowest latency for users in India |
| `AI_LOCATION`   | `us-central1` | Vertex AI location for Gemini (model availability differs by location)   |
| `MIN_INSTANCES` | `0`           | Set `1` while judges are testing to remove cold starts (small idle cost) |
| `MAX_INSTANCES` | `3`           | Upper bound on scale and cost                                            |

## What gets created

| Resource                        | Purpose                                                                   |
| ------------------------------- | ------------------------------------------------------------------------- |
| Cloud Run service `fete`        | Serves the React app and the API; scales to zero; startup CPU boost       |
| Service account `fete-run`      | Runtime identity with only `roles/aiplatform.user`                        |
| Vertex AI (Gemini 2.5 Flash)    | Ideas and plan refinement through Application Default Credentials         |
| Artifact Registry + Cloud Build | Created by `--source .` to build the `Dockerfile`                         |
| Cloud Logging                   | Structured JSON logs (severity, request id, trace link) written to stdout |

The container runs a compiled server (`node dist-server/index.js`) on production dependencies only, so cold starts are fast and the image is small. Each AI call has a 10 s limit and a 25 s overall deadline; if Gemini is slow or down, plans still ship with built-in personalised ideas.

## Verify after deploying

```bash
URL=$(gcloud run services describe fete --region asia-south1 --format 'value(status.url)')
curl -s $URL/api/health       # {"ok":true,"ai":"vertex"}
curl -s $URL/api/health/ai    # {"ok":true,"ai":"vertex","working":true,...}
```

Then open `$URL`, create a plan and put the URL in the README's live-demo line.

## Troubleshooting

| Symptom                                                            | Cause and fix                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Billing account … not found" / API cannot be enabled              | Enable billing on the project.                                                                                                                                                                                                                               |
| `PERMISSION_DENIED` while enabling services or deploying           | Use a project where you are Owner, or ask an admin for Cloud Run Admin, Service Usage Admin, Service Account Admin and Project IAM Admin.                                                                                                                    |
| Build step fails naming the Compute Engine default service account | New projects need it to build. Grant `roles/run.builder` (or `roles/cloudbuild.builds.builder` if that role is unavailable) to `PROJECT_NUMBER-compute@developer.gserviceaccount.com`, then re-run.                                                          |
| Public access is blocked ("allUsers", organisation policy)         | Your organisation forbids public services. Deploy in a personal project, or keep it private and run `gcloud run services proxy fete --region asia-south1`.                                                                                                   |
| `/api/health/ai` shows `"working":false` on Vertex                 | Check `gcloud run services logs read fete --region asia-south1`. 403: the Vertex AI API is off or `fete-run` lacks `roles/aiplatform.user`. 404: set `AI_LOCATION` to a location that serves the model. The app keeps working with built-in ideas meanwhile. |
| First request after idle is slow                                   | Cold start. Re-deploy with `MIN_INSTANCES=1 PROJECT_ID=… ./deploy/deploy.sh` before judging.                                                                                                                                                                 |
| `429 Too many requests`                                            | Rate limit (30/min per client, per instance). Wait a minute.                                                                                                                                                                                                 |

## Operations

| Task                 | Command                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------ |
| View logs            | `gcloud run services logs read fete --region asia-south1`                                  |
| Roll back            | `gcloud run services update-traffic fete --to-revisions=PREVIOUS=100 --region asia-south1` |
| Tear everything down | `gcloud run services delete fete --region asia-south1`                                     |

Cost: scale-to-zero means near-zero idle cost; Gemini Flash is billed per token and a demo uses very little. Add a **budget alert** in Billing for peace of mind.

## Optional: continuous deployment from GitHub

`.github/workflows/deploy.yml` deploys on demand (Actions → deploy → Run workflow) using Workload Identity Federation, so no keys are stored. Complete the [one-time setup](https://github.com/google-github-actions/auth#workload-identity-federation) and add the repository variables listed at the top of the workflow file.

## Notes

- Rate limiting and the plan cache are per instance (in memory), so the effective limit is up to `MAX_INSTANCES` times higher. Use Cloud Armor or Memorystore if you need a global limit.
- Without `GOOGLE_CLOUD_PROJECT` or `GEMINI_API_KEY` the app still works with built-in personalisation.
- Local development against Vertex: `gcloud auth application-default login`, then `GOOGLE_CLOUD_PROJECT=your-project npm run dev:server`.
