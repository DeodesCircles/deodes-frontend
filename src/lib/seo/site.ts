/**
 * Site-wide SEO constants.
 *
 * This module deliberately has **zero runtime imports**. `scripts/audit-seo-routes.mjs`
 * loads the route registry in a bare Node process so it can audit the routes
 * without booting Next.js, a bundler or a test runner. Anything this module
 * reaches for at runtime has to be available there too, so the constants are
 * derived from `process.env` inline rather than pulled from a helper.
 */

const DEFAULT_SITE_URL = "https://deodes.com"

/**
 * Absolute origin that relative canonicals and `og:url` resolve against.
 *
 * `NEXT_PUBLIC_APP_URL` wins when it parses as an absolute URL, so a preview
 * deployment advertises its own origin in link previews instead of leaking the
 * production one. Anything unparseable falls back to the production origin —
 * a malformed env var must never turn into a broken canonical.
 */
export const SITE_URL = (() => {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (!configured) return DEFAULT_SITE_URL
  try {
    return new URL(configured).origin
  } catch {
    return DEFAULT_SITE_URL
  }
})()

export const SITE_NAME = "Deodes"

export const TWITTER_SITE = "@deodes"
export const TWITTER_CREATOR = "@cyprianzube"
export const TWITTER_CONTRIBUTOR = "@nekwasar"

// DEODES is built by two founders. Order and links are intentional.
export const AUTHOR_NAME = "Nzubechukwu Cyprian & Nekwachukwu Ucheokoye"
export const FOUNDERS = [
  {
    name: "Nzubechukwu Cyprian",
    role: "Co-founder",
    site: "https://cyprianz.com",
    x: "https://x.com/cyprianzube",
    xHandle: "@cyprianzube",
    github: "https://github.com/cypriannwokolo2-creator",
  },
  {
    name: "Nekwachukwu Ucheokoye",
    role: "Co-founder",
    site: "https://nekwasar.com",
    x: "https://x.com/nekwasar",
    xHandle: "@nekwasar",
    github: "https://github.com/nekwasar",
  },
] as const

/**
 * Default social card. Served from `public/logo.jpg` (1200x630), which is the
 * aspect ratio every major scraper expects for a large link preview.
 *
 * Deliberately not `as const`: `Metadata["openGraph"]["images"]` expects a
 * mutable object, and a readonly literal would fail to type-check there.
 */
export const OG_IMAGE = {
  url: "/logo.jpg",
  width: 1200,
  height: 630,
  alt: "Deodes — decentralized savings circles on Arc",
}

/** Turn a route path into the absolute URL a social scraper should cache. */
export function absoluteUrl(path: string): string {
  if (path === "/" || path === "") return SITE_URL
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}
