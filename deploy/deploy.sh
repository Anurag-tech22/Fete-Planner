#!/usr/bin/env bash
# One-command deploy to Google Cloud Run with Gemini on Vertex AI (no API key to manage).
#
#   PROJECT_ID=my-project ./deploy/deploy.sh
#
# Optional: REGION (Cloud Run, default asia-south1 = Mumbai), AI_LOCATION (Vertex AI, default us-central1),
#           MIN_INSTANCES (default 0; use 1 during judging to avoid cold starts), MAX_INSTANCES (default 3).
set -euo pipefail
trap 'echo; echo "Deploy failed. See docs/DEPLOY-GCP.md#troubleshooting" >&2' ERR

command -v gcloud >/dev/null || { echo "Install the Google Cloud CLI first: https://cloud.google.com/sdk/docs/install" >&2; exit 1; }
: "${PROJECT_ID:?Set PROJECT_ID, e.g. PROJECT_ID=my-project ./deploy/deploy.sh}"
REGION="${REGION:-asia-south1}"
AI_LOCATION="${AI_LOCATION:-us-central1}"
MIN_INSTANCES="${MIN_INSTANCES:-0}"
MAX_INSTANCES="${MAX_INSTANCES:-3}"
SA="fete-run@${PROJECT_ID}.iam.gserviceaccount.com"

ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)"
[ -n "$ACCOUNT" ] || { echo "Not signed in. Run: gcloud auth login" >&2; exit 1; }
echo "Project: ${PROJECT_ID} | Cloud Run: ${REGION} | Vertex AI: ${AI_LOCATION} | Account: ${ACCOUNT}"
gcloud config set project "$PROJECT_ID" --quiet

echo "Enabling APIs (the first run takes a minute)..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com

echo "Creating the least-privilege runtime identity..."
gcloud iam service-accounts describe "$SA" >/dev/null 2>&1 || gcloud iam service-accounts create fete-run --display-name "Fête Cloud Run"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:${SA}" --role roles/aiplatform.user --condition=None >/dev/null

echo "Building and deploying (Cloud Build uses the Dockerfile)..."
gcloud run deploy fete --source . --region "$REGION" --quiet --allow-unauthenticated \
  --service-account "$SA" \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GOOGLE_CLOUD_LOCATION=${AI_LOCATION},TRUST_PROXY=1" \
  --cpu 1 --memory 512Mi --concurrency 80 --cpu-boost --timeout 60 \
  --min-instances "$MIN_INSTANCES" --max-instances "$MAX_INSTANCES"

URL="$(gcloud run services describe fete --region "$REGION" --format 'value(status.url)')"
echo "Smoke tests against ${URL}"
curl -fsS --retry 5 --retry-delay 3 --retry-all-errors "${URL}/api/health" >/dev/null && echo "  ok  service is up"
curl -fsS -X POST "${URL}/api/plan" -H 'content-type: application/json' \
  -d '{"type":"birthday","name":"Smoke test","date":"2099-01-01","guests":20,"budget":50000}' >/dev/null && echo "  ok  plan endpoint works"
AI="$(curl -fsS "${URL}/api/health/ai")"
case "$AI" in
  *'"working":true'*) echo "  ok  Gemini on Vertex AI is answering" ;;
  *) echo "  !!  Vertex AI is not answering yet: ${AI}" >&2; echo "      The app still works with built-in ideas. See docs/DEPLOY-GCP.md#troubleshooting" >&2 ;;
esac
echo
echo "Live: ${URL}"
