// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
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
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' 'unsafe-hashes'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' https://api.stripe.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
