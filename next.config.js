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
      ? "script-src 'self' 'unsafe-inline' https://js.stripe.com"
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com";

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
              'camera=(self "https://doctor8.daily.co"), microphone=(self "https://doctor8.daily.co"), display-capture=(self "https://doctor8.daily.co"), fullscreen=(self "https://doctor8.daily.co"), autoplay=(self "https://doctor8.daily.co"), geolocation=()',
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
              "connect-src 'self' https://api.stripe.com https://*.daily.co wss://*.daily.co https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.daily.co",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

const sentryWebpackPluginOptions = {
  silent: true,
  disableServerWebpackPlugin: !process.env.SENTRY_DSN,
  disableClientWebpackPlugin: !process.env.SENTRY_DSN,
};

module.exports = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
