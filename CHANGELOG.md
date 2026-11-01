# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.3.0]

### Added

- Lighthouse 100 / 100 / 100 / 100 (performance, accessibility, best practices, SEO); `docs/QUALITY.md` lists every measured result and how to reproduce it.
- End-to-end test that fails on any console error, CSP violation or browser inspector issue.
- Stricter ESLint: strict TypeScript rules, complexity, function and file size limits.

### Changed

- ESLint 10 and a patched `minimatch`: `npm audit` is now clean including dev tooling.
- State and server calls moved into a `usePlanSession` hook; pure plan edits in `shared/edits.ts`; reports in `shared/reports.ts`; health and personalisation split into small rule functions.
- All GitHub Actions pinned to commit SHAs.

### Fixed

- Zod's eval-based JIT triggered a Content-Security-Policy inspector issue in Chrome; it is now disabled in the browser.

## [1.2.0]

### Added

- Real-browser end-to-end suite (Playwright, desktop and mobile): plan creation, spend warnings, axe WCAG 2.2 AA with real contrast in light and dark, keyboard order, 320 px reflow, security headers, offline PWA, share links. CI job included.
- `RATE_LIMIT_PER_MIN` setting; README screenshots generated from the real app (`npm run screenshots`).

### Fixed

- Offline mode now precaches the app files on the very first visit (previously only after a second visit).
- The plan-health card no longer reads "Next best action: Next: …".

## [1.1.0]

### Added

- `GET /api/health/ai` deep health check; the deploy script uses it to confirm Vertex AI is answering.
- Per-attempt (10 s) and overall (25 s) limits on model calls.
- Optional GitHub Actions deployment to Cloud Run with Workload Identity Federation.
- Deployment troubleshooting guide, `.gcloudignore`, configurable regions and instance counts.

### Changed

- Production now runs a compiled server (`node dist-server/index.js`) for faster cold starts and a smaller image.
- Cloud Run defaults to Mumbai (`asia-south1`) with Vertex AI in `us-central1`.

## [1.0.0]

### Added

- Event planner for weddings, birthdays and community events: exact budget split, dated timeline, vendor checklist, personalised ideas.
- Gemini integration (API key or Vertex AI with the Cloud Run service account) with strict validation and an offline fallback.
- Plan health score with next best action, spend tracker, guest list with dietary summary, run sheet, `.ics` and JSON export, share links, offline PWA.
- One-command Google Cloud Run deployment, structured Cloud Logging output.
- 189 tests at 100% coverage, property-based tests, axe-core and contrast checks, bundle-size budget, CI, CodeQL and Dependabot.

### Security

- Strict request validation, rate limiting, security headers, prompt-injection guard, tamper-proof share links, `npm audit` clean.
