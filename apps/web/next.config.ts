import type { NextConfig } from "next";

/** The site's first address. Production requests to it move to WEB_BASE_URL (release 1.0.0). */
export const OLD_HOST = "bookflow-web-pearl.vercel.app";
export const NEW_ORIGIN = "https://bookflow.mugu-labs.com";
/** The bare address goes to Bookflow's product page (release 1.0.0 part 3). */
export const PRODUCT_PAGE = "https://mugu-labs.com/products/bookflow/";

const nextConfig: NextConfig = {
  // The share image reads its Urbanist fonts from disk at request time.
  outputFileTracingIncludes: { "/s/[slug]/share-image": ["./assets/fonts/**"] },
  async redirects() {
    // Vercel sets VERCEL_ENV at build time; previews keep their root page for testing.
    const production = process.env.VERCEL_ENV === "production";
    return [
      // First, so the old host's root goes there in one hop too. Exactly "/": every other path
      // (/s/*, /b/*, /me, /privacy, /terms, /delete-account, /api/*) is unchanged.
      ...(production ? [{ source: "/", destination: PRODUCT_PAGE, permanent: true }] : []),
      {
        // 308 with path and query kept. Not /api/*: owner app 0.5.0 still POSTs to
        // /api/account/delete on the old host. Previews have other hosts and stay put.
        source: "/:path((?!api(?:/|$)).*)",
        has: [{ type: "host", value: OLD_HOST }],
        destination: `${NEW_ORIGIN}/:path`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
