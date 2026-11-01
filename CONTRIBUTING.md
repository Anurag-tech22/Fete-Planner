# Contributing

Thanks for helping improve Fête.

1. **Set up:** Node 22 (`nvm use`), then `npm ci`.
2. **Branch** from `main` and keep changes focused.
3. **Verify:** `npm run check` must pass. It runs Prettier, ESLint (with accessibility rules), strict TypeScript, the full test suite with **100% coverage enforced**, the production build and the bundle-size budget.
4. **Browser tests:** `npx playwright install chromium && npm run test:e2e` runs the real-browser suite (it needs `npm run build` first).
5. **Keep it small:** ESLint enforces complexity ≤ 12, functions ≤ 90 lines and files ≤ 260 lines; split code rather than raising limits.
6. **Tests first for behaviour:** shared logic gets unit and property-based tests; UI gets Testing Library tests and must stay axe-clean.
7. **Commits:** short imperative subject, e.g. `fix: reject impossible calendar dates`.
8. **Pull request:** fill in the template; CI must be green.

Security issues: please follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
