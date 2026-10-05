# Phase one: supplier catalogue image search

## Current implementation
Implemented directly by Codex following the user's revised instruction. Retailers search published wholesaler products in **Your Taste** (`/dashboard/retailer/your-taste`), where they select products for employee visibility. Retailer-uploaded designs are not the search collection.

The authenticated server page resolves a verified retailer and returns published products through the existing marketplace data source. Category filtering uses `jewellery_type`, not metal `category`; singular/plural labels are normalized. Existing category tiles, selection filters, product modal and publishing controls remain available. Supplier permissions remain the existing product marketplace rules.

## Flow
Name/tag search, or select a reference photograph and jewellery category. Image search runs CLIP (`Xenova/clip-vit-base-patch32`, q8) in a browser Web Worker using Transformers.js 3.8.1. No Jev call or additional API key is required. The reference file stays on the device. Catalogue images are fetched from existing image URLs. Model weights are downloaded from Hugging Face on first use and use the browser's model cache. Catalogue vectors are held in worker memory; worker termination clears them. No reference image or vector database migration is introduced.

Only close matches are displayed, up to 20, using an initial cosine cutoff of 0.90. This is a conservative engineering default, not validated 90% design accuracy. Fine-grained relevance still requires retailer-labelled customer photos, different angles/backgrounds and true no-match examples.

Search has progress, replace, clear, cancellation, no-match and explicit errors. Files are limited to JPEG/PNG/WebP up to 10 MB and decoded images to 25 million pixels. Broken catalogue images are skipped with a visible incomplete-results warning; an entirely unsearchable catalogue reports a failure rather than no match. Category/file changes invalidate stale results. Main-thread UI remains responsive.

Search does not publish products. Explicit per-product switches and bulk controls continue to change employee selections. Bulk actions apply to the currently displayed search/filter results, with bounded concurrency and rollback of failed writes. Only verified retailer callers may change selections; new selections must reference a published product. Server pages are keyed to the authenticated user. Marketplace API responses are private/no-store and excluded from service-worker caching.

## Verification
- 10 automated retrieval/validation/authorization tests pass.
- Targeted ESLint checks pass.
- Real browser inference passes on actual UI components: exact image retrieval, category restriction, weak/no-match withholding, corrupt/invalid files, cancellation/clear, mobile and desktop layout, no search-triggered selection writes, and bulk publication limited to matching results. UI API writes use fixtures; production selections were not changed.
- Read-only live database check found 441 total supplier products, 362 published: 148 necklace, 69 haram, 64 pendant, 15 bangles, 66 earrings (snapshot during implementation).
- Real browser search of 12 published supplier images using their actual storage URLs returned the reference product first, one qualifying match, in approximately 15.8 seconds including cold model setup. This is a smoke test, not a customer-photo accuracy benchmark.
- Production-bundled worker also passes a browser smoke test against three actual supplier images (three checked, zero skipped, one matching result).
- Production Next.js webpack build passes. The normal Turbopack build stalled locally, so production bundling was checked with `npm run build -- --webpack`. Existing next.config serverActions warning remains unrelated to this feature.

## Local usage
Run `npm run dev` (or build with `npm run build -- --webpack` and run `npm run start`) in `Jewel-India-Frontend`. Sign in as a verified retailer and open Your Taste. Select a category, choose an image using the camera button, and select Search by image. First-run model setup and category indexing take longer; subsequent searches reuse worker vectors. Cancelling a running search terminates the worker and requires rebuilding its in-memory catalogue vectors next time.

Tests:
- `node --experimental-vm-modules --test tests/catalogue-search.test.mjs tests/catalogue-access.test.mjs`
- `node tests/catalogue-search-browser.mjs` (requires Vite in the existing admin repo, Playwright from the desktop runtime, Chrome and network access for public model weights).
- Optional read-only supplier-image smoke: set `JEWEL_CATALOGUE_FIXTURE` to a private JSON fixture with products, category, reference (local image path), and title; then run the browser test. No credentials belong in fixtures or test output.

## Remaining scope
Not deployed to production. No broadcast/30-minute supplier queue, piracy decisions, employee-side search or Jev supplier scoring in this phase. Before claiming production search quality, validate and tune the cutoff against customer-photo labels. For larger catalogues or slower devices, move catalogue indexing to a persistent backend service after measuring this implementation.

## Release scope
This release contains retailer-side image search only. Jev text search and supplier decisions are deferred per the user's latest instruction. No Jev API call is made by this release. Secrets remain in ignored local environment files and are not pushed.
