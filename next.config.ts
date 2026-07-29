import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB; bill attachments (photo/PDF scans) need headroom
      // beyond the 10MB per-file cap enforced in src/lib/supabase/storage.ts.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
