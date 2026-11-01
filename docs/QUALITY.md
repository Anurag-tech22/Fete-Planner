# Quality evidence

Everything below is reproducible with the commands shown. Numbers are from the production build.

| Area                                     | Result                                                                                                                                         | How to reproduce                                      |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Unit, API, component and contract tests  | 189 passing                                                                                                                                    | `npm test`                                            |
| Coverage                                 | 100% statements, branches, functions, lines (build fails below 100%)                                                                           | `npm run coverage`                                    |
| Real-browser end-to-end                  | 20 passing (10 scenarios on desktop and a Pixel 5 profile)                                                                                     | `npx playwright install chromium && npm run test:e2e` |
| WCAG 2.2 A/AA (axe-core, real contrast)  | 0 violations, light and dark themes                                                                                                            | `npm run test:e2e`                                    |
| Lighthouse (desktop, unthrottled, local) | Performance 100 · Accessibility 100 · Best Practices 100 · SEO 100                                                                             | see below                                             |
| Core Web Vitals (same run)               | LCP 0.4 s · TBT 0 ms · CLS 0                                                                                                                   | see below                                             |
| Browser console and CSP                  | 0 errors, 0 warnings, 0 inspector issues                                                                                                       | `npm run test:e2e`                                    |
| JavaScript size                          | 98 kB gzipped (budget 100 kB, enforced)                                                                                                        | `npm run build && node scripts/check-size.mjs`        |
| Dependency audit                         | 0 vulnerabilities, including dev tooling                                                                                                       | `npm audit`                                           |
| Static analysis                          | Strict TypeScript (with `noUncheckedIndexedAccess`); ESLint with accessibility rules, complexity ≤ 12, functions ≤ 90 lines, files ≤ 260 lines | `npm run lint && npm run typecheck`                   |
| Supply chain                             | GitHub Actions pinned to commit SHAs, Dependabot, CodeQL                                                                                       | `.github/`                                            |

## Reproducing the Lighthouse run

```bash
npm run build && npm start &
npx lighthouse http://127.0.0.1:8787/ --only-categories=performance,accessibility,best-practices,seo \
  --throttling-method=provided --chrome-flags="--headless"
```

Scores were measured against a local server without network throttling; numbers on Cloud Run will vary with distance and cold starts (use `MIN_INSTANCES=1` while testing).
