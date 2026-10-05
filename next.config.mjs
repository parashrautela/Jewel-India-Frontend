import { withSentryConfig } from '@sentry/nextjs';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  // Capability-protected pages must never enter the navigation cache.
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  extendDefaultRuntimeCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [{
      urlPattern: ({ url }) => url.pathname.startsWith("/share/") ||
        url.pathname.startsWith("/api/shared-wishlist") ||
        url.pathname.startsWith("/api/wishlist-shares") ||
        url.pathname.startsWith("/api/wishlists") ||
        url.pathname.startsWith("/api/retailer/marketplace"),
      handler: "NetworkOnly",
    }],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@fastify/otel', '@opentelemetry/api-logs'],
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        // Supabase storage — processed product images
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        // Railway backend — in case it ever serves images directly
        protocol: 'https',
        hostname: 'ai-pipeline-production-60ea.up.railway.app',
      },
    ],
  },
  serverActions: {
    allowedOrigins: ['app.jewelindia.shop', '*.jewelindia.shop', 'localhost:3000'],
  },
  async headers() {
    return [
      {
        source: '/share/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
      {
        source: '/.well-known/apple-app-site-association',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/entry_page/signin',
        permanent: false,
      },
      {
        source: '/signin',
        destination: '/entry_page/signin',
        permanent: true,
      },
      {
        source: '/signup',
        destination: '/entry_page/signup',
        permanent: true,
      },
    ];
  },
};

export default withPWA(
  withSentryConfig(nextConfig, {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: "personal-39v",

    project: "jwellery-frontend",

    // Suppress Sentry source map upload warnings when no auth token is set
    silent: true,
    disableSourceMapUpload: !process.env.SENTRY_AUTH_TOKEN,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    webpack: {
      // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
      // See the following for more information:
      // https://docs.sentry.io/product/crons/
      // https://vercel.com/docs/cron-jobs
      automaticVercelMonitors: true,

      // Tree-shaking options for reducing bundle size
      treeshake: {
        // Automatically tree-shake Sentry logger statements to reduce bundle size
        removeDebugLogging: true,
      },
    },
  })
);
