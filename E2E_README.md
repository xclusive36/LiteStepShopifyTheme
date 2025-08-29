# Playwright E2E (LiteStep)

Quick start (local):

1. Start your theme preview (Shopify CLI) so the dev proxy is available, e.g.:

```bash
cd /path/to/LiteStep
shopify theme dev
```

1. Install Playwright deps (already in devDependencies):

```bash
npm install
npx playwright install --with-deps
```

1. Run E2E tests (they are skipped by default unless RUN_E2E=1):

```bash
RUN_E2E=1 PREVIEW_URL=http://127.0.0.1:9292 npm run test:e2e
```

Notes:

- The E2E is conservative and skipped by default to avoid CI flakiness. Enable via RUN_E2E=1 locally.
- Update `PREVIEW_URL` if your dev proxy URL differs.
