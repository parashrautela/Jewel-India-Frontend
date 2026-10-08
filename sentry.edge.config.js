// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { filterWishlistTelemetry } from "./lib/wishlist/telemetry.mjs";

Sentry.init({
  beforeSend: filterWishlistTelemetry,
  beforeSendTransaction: filterWishlistTelemetry,
  beforeBreadcrumb: filterWishlistTelemetry,
  beforeSendLog: filterWishlistTelemetry,
  dsn: "https://cca0a2c6c0dae27598f0df788f7ad966@o4511036789424128.ingest.de.sentry.io/4511037123526736",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
