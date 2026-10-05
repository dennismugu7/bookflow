import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The share image reads its Urbanist fonts from disk at request time.
  outputFileTracingIncludes: { "/s/[slug]/share-image": ["./assets/fonts/**"] },
};

export default nextConfig;
