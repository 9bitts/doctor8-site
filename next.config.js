// next.config.js
/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "*.cloudflare.com" },
    ],
  },
  // Security headers — HIPAA & GDPR requirement
  async headers() {
    const scriptSrc = isProd
      ? "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com"
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com";

    return [
      {
        source: "/embed/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors *",
            ].join("; "),
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              'camera=(self "https://*.daily.co"), microphone=(self "https://*.daily.co"), display-capture=(self "https://*.daily.co"), fullscreen=(self "https://*.daily.co"), autoplay=(self "https://*.daily.co"), geolocation=()',
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.stripe.com https://*.daily.co wss://*.daily.co https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com",
              "media-src 'self' https://*.daily.co blob:",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.daily.co",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

const sentryEnabled = Boolean(
  process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim(),
);

const sentryWebpackPluginOptions = {
  silent: true,
  disableServerWebpackPlugin: !sentryEnabled,
  disableClientWebpackPlugin: !sentryEnabled,
};

module.exports = sentryEnabled
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
