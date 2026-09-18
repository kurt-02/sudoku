import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/*
 * Content-Security-Policy, set here rather than with per-request nonces so the privacy and terms
 * pages stay static (see Next's CSP guide, "Without Nonces"). Scripts may only come from this
 * site; 'unsafe-inline' is needed for Next's inline bootstrap scripts, and 'unsafe-eval' only in
 * development (React uses it for debugging).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Google profile pictures (menu and leaderboard).
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "font-src 'self'",
  // Server Actions and (in development) hot reload.
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  // Signing in submits a form that redirects to Google's sign-in page.
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Never allow the site inside another site's frame (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HTTPS only, for two years (browsers ignore this header over plain HTTP, e.g. localhost).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // The game uses none of these browser features.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework in every response.
  poweredByHeader: false,
  images: {
    // Google profile pictures for signed-in players.
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
