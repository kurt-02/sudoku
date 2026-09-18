import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Google profile pictures for signed-in players.
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
};

export default nextConfig;
