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
