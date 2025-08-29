LiteStep - Starter Shopify Online Store 2.0 theme scaffold

This scaffold creates the minimal structure for the LiteStep theme (Online Store 2.0).

What's included:
- layout/theme.liquid (base layout)
- templates/index.json, product.json, collection.json
- sections/header.liquid, footer.liquid, hero.liquid, product-template.liquid
- snippets/product-card.liquid
- assets/styles.css, scripts.js
- config/settings_schema.json, settings_data.json, presets/default.json
- locales/en.default.json

How to preview locally
1. Install Shopify CLI v3: https://shopify.dev/docs/cli
2. From this folder run `shopify theme serve` to preview locally.

Notes
- This is a minimal starter scaffold. Continue by adding more sections, presets, and assets.

Usage notes
- Preview locally: run `shopify theme dev --store=404c9d-0e.myshopify.com --theme=140384927830` and open http://127.0.0.1:9292
- Shareable preview: https://404c9d-0e.myshopify.com/?preview_theme_id=140384927830

Assets
- Default logo added at `assets/logo-default.svg` and used as a header fallback when no logo is set in the theme editor.

End-to-end tests (Playwright)
------------------------------

We include a small Playwright E2E suite under `e2e/` which exercises quickview and basic cart flows.

Run E2E locally:

```bash
# start theme preview (Shopify CLI) in one terminal
shopify theme dev --store=<your-store>

# in another terminal run tests (uses PREVIEW_URL to point at the preview)
PREVIEW_URL="http://127.0.0.1:9292" RUN_E2E=1 npx playwright test --project=chromium
```

Mock fallback
-------------

Previews sometimes don't expose product anchors on the homepage. To make tests deterministic in CI we provide a mock fallback.

Set `MOCK_FALLBACK=1` to enable the deterministic mock flow which will inject a small ephemeral quickview and simulate a cart update when required:

```bash
MOCK_FALLBACK=1 PREVIEW_URL="http://127.0.0.1:9292" RUN_E2E=1 npx playwright test --project=chromium e2e/smoke.spec.js
```

CI
--

We recommend running E2E in CI with `MOCK_FALLBACK=1` so tests are reliable against ephemeral previews. See `.github/workflows/e2e.yml` for the example workflow.

CI requirements
---------------

To run the preview and E2E in GitHub Actions you must provide the following secrets in the repository settings:

- `SHOPIFY_STORE` — the permanent myshopify.com store domain (e.g. `example-store.myshopify.com`)
- `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` — API credentials or an authenticated way to run `shopify theme dev` on the runner

Notes on Shopify CLI in CI
-------------------------

The workflow will attempt to install the Shopify CLI on the Ubuntu runner. The runner still needs valid store auth; you can either:

- Preconfigure secrets and an authenticated session for the runner (recommended for private CI runs), or
- Use the workflow manually with `workflow_dispatch` and provide a stable `PREVIEW_PRODUCT` input to run a realistic E2E (see workflow docs).

If your CI environment cannot run `shopify theme dev`, keep using `MOCK_FALLBACK=1` to run deterministic E2E against the preview host.

