# Jewel India web app

## Invitations: development and release

The invitation API is hosted by this Next.js app. The iOS app calls the host configured as `SITE_URL` in `wholesaler ios/Config.xcconfig`; changing or rebuilding SwiftUI does not deploy these server routes.

- `GET /api/referral/manage`: account settings, gift limits and invitation history.
- `POST /api/referral/manage`: save the account’s “Don’t show me again” preference.
- `POST /api/referral/generate`: explicitly create a single-use code and reserve the extra gift with an idempotency key.
- `DELETE /api/referral/manage`: cancel an unused funded invitation.
- `validate` and `claim`: existing retailer code/onboarding attribution.

The first-time guide renders while settings load and stays usable when that request fails. A preference is saved locally only after the signed-in server accepts it. Missing routes returning HTML 404 now show a service-update message, rather than a JSON parsing error. Opening the guide never generates a code or spends credits.

The server requires `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SITE_URL`; the browser also needs the public anon key. Never add a service-role key to a browser bundle or iOS configuration.

Before shipping an invitation-enabled iOS build, apply and reconcile the database prerequisites and migrations 015–018, deploy this Next app to the actual native `SITE_URL`, and verify activation using [the release handoff](../plans/invitation-referrals-release.md). Migration 018 preserves purchased credit lots in place, retaining their receipts and remaining units as a non-expiring bonus balance. It does not issue replacement grants.

Run the read-only release check from this repository:

```sh
node scripts/check-invitation-backend.mjs
# Optional: JEWEL_SITE_URL=https://your-native-api-host.example node scripts/check-invitation-backend.mjs
```

It checks for JSON 401 on the unauthenticated management endpoint, required tables/functions and active daily/referral flags. It creates no codes and changes no balances. Local build success is not proof of a deployed backend.

As audited on 3 October 2026, the configured live host returns HTML 404 for `/api/referral/manage`; the live database lacks `credit_program`, referral settings/generation RPCs and the new reporting/preferences schema. Production generation is therefore unavailable until rollout. The local recovery/accounting changes have not been published.

Local verification:

```sh
npm run build -- --webpack
node --experimental-vm-modules --test tests/referral-api.test.mjs
JEWEL_BROWSER_RUNTIME=/path/to/browser-runtime/node_modules node tests/referral-browser.mjs
```

The browser test covers the actual component with an HTML 404, visible first-time guide, unsaved failed preference, retry recovery, explicit generation, response-loss replay and copy. Accounting is separately tested with real disposable PostgreSQL; see the release handoff for commands.

<!-- # Jewel India 💎
### Premium Jewelry Wholesale Platform

Jewel India is a digital marketplace designed specifically for the jewelry industry in India. It builds a bridge between **Wholesale Manufacturers** and **Retail Jewelers**, making the process of discovering, ordering, and managing jewelry inventory seamless and modern.

---

## ✨ What is Jewel India?
Traditionally, jewelry wholesale involves heavy paperwork and physical visits. Jewel India digitizes this experience:
* **For Wholesalers:** A powerful dashboard to showcase your latest collections, manage stock, and track retailer queries in real-time.
* **For Retailers:** A premium, easy-to-use catalog to discover new designs and place orders from trusted suppliers.

---

## 🚀 Key Features

### 1. Simple Onboarding 📝
A professional registration process that ensures only verified businesses enter the platform. Includes:
* KYC Verification (GST, Aadhaar, PAN)
* Portfolio/Logo uploads
* Business profile management

### 2. Digital Catalog 💍
A stunning, high-performance product gallery where wholesalers can:
* Showcase products with rich images.
* Toggle "In-Stock" or "Out-of-Stock" instantly.
* Filter by category and design type.
* **New UI Enhancements**:
  * Added missing fields (Metal Purity, Crafted By, Added On, Studio/Seller name, Product ID/SKU).
  * Introduced wholesale‑specific fields (MOQ, Price per piece/set, Available Quantity, Restock Date, Bulk Discount Tiers).
  * Added Edit‑Info panel allowing inline editing of all wholesale fields.
  * Replaced side‑scrolling thumbnail strip with a wrapping flex layout.
  * Studio name now defaults to "Jewel India" when not set.
  * "Crafted By" now displays the onboarding user's name.

### 3. Smart Dashboard 📊
Track everything in one place:
* **Order Queries:** See who is interested in which designs.
* **Status Tracking:** Manage the journey from "Pending" to "Fulfilled."
* **Inventory Management:** Update your collection on the fly.

---

## 🛠️ How to Launch (For Developers)

If you are a developer looking to run this project locally, follow these simple steps:

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   Create a `.env` file and add your Supabase credentials (refer to `.env.example`).

3. **Start the Engine**
   ```bash
   npm run dev
   ```

4. **View the Site**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗️ Technology Behind the Scenes
We use modern tools to ensure the platform is fast and secure:
* **Framework:** Next.js (Fast & SEO friendly)
* **Database & Auth:** Supabase (Secure data storage)
* **Animations:** GSAP & Lenis (Smooth, premium user experience)
* **Styling:** CSS & Tailwind (Modern, responsive designs)

---

## 📦 Recent Enhancements
- **Product Detail Modal** now includes all previously missing fields and new wholesale‑specific data points.
- **Edit Info** button enables inline editing of wholesale information with live save/cancel actions.
- **Studio name fallback** changed to "Jewel India" for consistency.
- **Crafted By** automatically shows the name entered during onboarding.
- **Thumbnail carousel** no longer scrolls horizontally; images wrap into rows for better UX.

---

## 📮 Contact & Support
If you have any questions or need help setting up, please reach out to the project administrator.

*Copyright © 2026 Jewel India. All rights reserved.* -->

## Phase 2: Measured Performance Optimization Plan

This plan is **analysis-driven** and staged to avoid regressions. No implementation is included in this phase.

### Prioritized issues (impact, expected gain, risk, exact scope)

| Priority | Category | Issue | Expected gain | Risk | Exact files/components affected |
|---|---|---|---|---|---|
| **HIGH** | Data fetching | Revisit/mount refetches with no shared cache (`employees`, `retailer catalogue`, chat conversation bootstrapping). | **Navigation/revisit latency:** ~20-45% faster on repeated visits to audited routes. | Medium | `app/dashboard/retailer/employees/page.jsx`, `app/dashboard/retailer/catalogue/page.jsx`, `app/dashboard/employee/messages/page.jsx`, `app/dashboard/wholesaler/queries/page.jsx`, `app/dashboard/employee/messages/MessagesClient.jsx`, `lib/hooks/useRealtimeMessages.js` |
| **HIGH** | Rendering | Repeated chat read-mark side effect keyed on full `messages` array, causing unnecessary PATCH churn. | **Interaction lag/network chatter:** ~15-30% reduction in message-screen overhead. | Low | `components/chat/ChatWindow.jsx`, `app/api/chat/messages/read/route.js` |
| **HIGH** | Expensive workloads | Full dataset gallery fetch + client-side filtering over all products in employee wholesaler gallery. | **Search/filter responsiveness:** ~35-70% improvement under larger datasets. | Medium | `app/dashboard/employee/wholesaler-gallery/page.jsx`, `app/dashboard/employee/wholesaler-gallery/WholesalerGalleryClient.jsx`, `lib/api/supabase-products.js` |
| **HIGH** | API efficiency | Internal server pages call own API over HTTP with `cache: "no-store"` instead of direct data path. | **Server response time:** ~80-250ms saved per request path (typical local/edge overhead removed). | Medium | `app/dashboard/employee/messages/page.jsx`, `app/dashboard/wholesaler/queries/page.jsx`, `app/api/chat/conversations/route.js` |
| **MEDIUM** | Dead code removal | Unused components/imports and duplicate legacy surfaces increase client footprint and maintenance cost. | **Bundle/readability:** ~3-10% JS reduction in affected routes + lower parse/hydration work. | Low | `components/wholesaler/queries/QueriesClient.jsx`, `components/wholesaler/NavigationTabs.jsx`, `components/employee/EmployeeHeader.jsx`, `components/employee/EmployeeTabs.jsx`, `components/onboard/OnboardFooter.jsx`, `components/product/ProcessingView.jsx` import in `components/product/AddProductForm.jsx`, `app/dashboard/retailer/employees/page.jsx` (unused modal imports/state), `lib/api/retailer-designs.js`, `app/api/referral/list/route.js` |
| **MEDIUM** | Rendering/state boundaries | Monolithic context values in onboarding trigger broad rerenders across step consumers. | **Form step responsiveness:** ~10-25% less render work while editing fields. | Low | `context/OnboardContext.jsx`, `context/RetailerOnboardContext.jsx`, onboarding step containers/components under `components/onboard/**` and `components/onboard-retailer/**` |
| **MEDIUM** | Bundle/runtime | Hero animation ticker cleanup bug can leave RAF callback subscribed; GSAP/Lenis path is heavy. | **Homepage smoothness + memory stability:** remove leak risk, smoother long sessions. | Medium | `components/product/Hero.jsx`, homepage usage in `app/page.jsx` |
| **LOW** | Code splitting | No dynamic/lazy boundaries on heavy interactive modules (chat, large catalog UIs, modals). | **Initial route JS/hydration:** ~10-30% improvement on selected pages. | Medium | `app/dashboard/employee/messages/page.jsx`, `app/dashboard/wholesaler/queries/page.jsx`, `components/chat/*`, `components/wholesaler/catalogue/*`, `app/dashboard/retailer/catalogue/page.jsx` |
| **LOW** | Asset strategy | Extensive `<img>` usage in grid/list-heavy views where `next/image` could improve loading behavior. | **Image-heavy route LCP/CLS/network:** ~5-20% depending on image sizes and cache headers. | Medium | `components/product/ProductCard.jsx`, `components/wholesaler/catalogue/CatalogueGrid.jsx`, `components/chat/ConversationList.jsx`, `app/dashboard/employee/wholesaler-gallery/WholesalerGalleryClient.jsx`, `app/page.jsx`, `app/dashboard/retailer/catalogue/upload/page.jsx` |

### Controlled execution order (one category at a time)

1. Remove dead code safely.
2. Fix unnecessary re-renders (memoization only where proven beneficial, state placement corrections).
3. Optimize expensive computations and high-cost render paths.
4. Improve data fetching (cache/dedupe/revisit behavior).
5. Introduce selective code splitting.
6. Optimize large lists (including virtualization where thresholds justify it).

### Risk controls and measurement gates

- Keep behavior parity for each stage (no cross-category refactors in the same step).
- Measure before/after for the touched routes (navigation time, interaction delay, network request count).
- Roll out fixes in small, verifiable commits per category.
