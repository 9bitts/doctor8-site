// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Forces a unique build ID each deploy so the CDN never serves stale chunks
  generateBuildId: async () => Date.now().toString(),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "*.cloudflare.com" },
    ],
  },
  // Security headers — HIPAA & GDPR requirement
  async headers() {
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.stripe.com https://*.daily.co wss://*.daily.co",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.daily.co",
            ].join("; "),
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
