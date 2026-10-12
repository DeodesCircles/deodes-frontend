import type { Metadata } from "next"

import {
  AUTHOR_NAME,
  OG_IMAGE,
  SITE_NAME,
  TWITTER_CREATOR,
  TWITTER_SITE,
  absoluteUrl,
} from "./site"

/** Sitemap `changefreq` values Next.js accepts. */
export type ChangeFrequency = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"

export type RouteSeo = {
  /**
   * The route as it appears in the URL — `"/about"`, `"/"` for the home page.
   * This doubles as the registry key, so it must match the segment list the
   * route audit derives from the App Router directory tree.
   */
  path: string
  /** `title` for the document head. Rendered verbatim, so include the brand. */
  title: string
  /**
   * `<meta name="description">`. Unique per route — the audit script fails the
   * build on a duplicate, because a repeated description is the exact symptom
   * this registry exists to prevent.
   */
  description: string
  /** `og:title` — a link-preview headline, so it may differ from `title`. */
  ogTitle: string
  /** `og:description`. Unique per route, and the audit enforces that too. */
  ogDescription: string
  /** Split on commas in the emitted `keywords` meta tag. */
  keywords: string[]
  /**
   * Whether search engines may index the route. Non-indexable routes still
   * ship a full description and OG block — a shared 403 link should describe
   * itself, it just should not be crawled.
   */
  indexable: boolean
  /** Defaults to `"website"`. */
  ogType?: "website" | "article" | "profile"
  /** Sitemap hints. Ignored for non-indexable routes. */
  changeFrequency?: ChangeFrequency
  priority?: number
}

/**
 * Route groups whose pages are auth-gated. They are deliberately absent from
 * `PUBLIC_ROUTES`: the `(dashboard)` layout already sets `noindex, nofollow`,
 * so re-declaring every wallet and settings screen here would add noise
 * without adding coverage.
 */
export const NON_PUBLIC_ROUTE_GROUPS = ["(dashboard)"] as const

/**
 * Every public route, with its own description and OpenGraph copy.
 *
 * Pages build their `metadata` from an entry here rather than hand-rolling
 * one, which buys three things:
 *
 *  1. **Uniqueness is enforceable.** Descriptions live in one list, so a
 *     duplicate is a data bug an audit can catch, not a copy-paste slip
 *     spread over a dozen files.
 *  2. **OG tags can never go missing.** A route cannot opt out of
 *     `openGraph`/`twitter` without deleting its whole entry, and the builder
 *     emits both from the same strings as the meta description.
 *  3. **Canonicals stay honest.** `metadataBase`, `og:url` and the canonical
 *     link all derive from `SITE_URL`, so they cannot drift apart.
 *
 * Keep the order grouped: indexable marketing/docs routes first, then the
 * auth entry points, then the utility and error routes.
 */
export const PUBLIC_ROUTES: readonly RouteSeo[] = [
  {
    path: "/",
    title: "Deodes — Arc Savings Circles",
    description:
      "Decentralized savings circles on Arc. Sign in with a passkey (Face ID or fingerprint) and your Arc wallet is created automatically. Zero platform fees, no KYC, no email.",
    ogTitle: "Deodes — decentralized savings circles on Arc",
    ogDescription:
      "Join trustless passkey savings circles with zero intermediaries. Auto-created wallet, zero fees, no KYC — built on Arc for real financial sovereignty.",
    keywords: [
      "deodes",
      "arc",
      "savings circles",
      "defi",
      "decentralized finance",
      "passkey",
      "webauthn",
      "USDC",
      "USDC",
      "arc",
    ],
    indexable: true,
    priority: 1,
  },
  {
    path: "/about",
    title: "About — Deodes",
    description:
      "Deodes brings traditional savings circles — esusu, tontines, chit funds, tandas — onto the Arc blockchain. Our mission, why we chose Arc, and how the platform is open source.",
    ogTitle: "About Deodes — financial inclusion on Arc",
    ogDescription:
      "How Deodes wraps centuries-old rotating savings circles in Arc smart contracts, so 1.3 billion unbanked adults can build portable on-chain credit.",
    keywords: [
      "deodes",
      "about",
      "financial inclusion",
      "unbanked",
      "esusu",
      "tontine",
      "chit fund",
      "arc",
      "arc",
      "open source",
    ],
    indexable: true,
  },
  {
    path: "/explore",
    title: "Explore Circles — Deodes",
    description:
      "Browse public, private, community and premium savings circles on Deodes. See circle types and join from the app.",
    ogTitle: "Explore savings circles on Deodes",
    ogDescription:
      "Public, private, community and premium ROSCA circles with USDC on Arc. Find your circle and start saving.",
    keywords: [
      "deodes",
      "explore",
      "savings circles",
      "public circles",
      "private circles",
      "community circles",
      "rosca",
    ],
    indexable: true,
  },
  {
    path: "/payout-modes",
    title: "Payout Modes — Deodes",
    description:
      "Random, fixed-order, auction and vote-based payouts explained. How each DEODES circle distributes its pool.",
    ogTitle: "Four payout modes on Deodes",
    ogDescription:
      "VRF draws, fixed sequences, chit-fund auctions and community votes — every payout rule, enforced on-chain.",
    keywords: [
      "deodes",
      "payout",
      "chit fund",
      "auction",
      "rosca payout",
      "vrf",
    ],
    indexable: true,
  },
  {
    path: "/deoscore",
    title: "DeoScore Reputation — Deodes",
    description:
      "DeoScore is portable 0–1000 savings reputation: streak, completions, volume and recency, plus governance weight.",
    ogTitle: "DeoScore — reputation that follows your wallet",
    ogDescription:
      "On-time payments build on-chain credit that unlocks bigger circles, lower collateral and governance votes.",
    keywords: [
      "deodes",
      "deoscore",
      "reputation",
      "credit score",
      "governance",
    ],
    indexable: true,
  },
  {
    path: "/contact",
    title: "Contact — Deodes",
    description:
      "Reach the Deodes team: support tickets, X updates and contributor channels.",
    ogTitle: "Contact the Deodes team",
    ogDescription:
      "Support tickets, launch news and open-source contributor paths — three ways to reach us.",
    keywords: [
      "deodes",
      "contact",
      "support",
      "contribute",
    ],
    indexable: true,
  },
  {
    path: "/transparency",
    title: "Transparency & Fees — Deodes",
    description:
      "Every Deodes fee on one page: 0.5% on payouts only, sub-cent USDC settlement, no custody, Apache 2.0 source.",
    ogTitle: "Every fee on one page",
    ogDescription:
      "0.5% protocol fee on payouts, sub-cent Arc settlement, non-custodial contracts, open source.",
    keywords: [
      "deodes",
      "fees",
      "transparency",
      "protocol fee",
      "open source",
    ],
    indexable: true,
  },
  {
    path: "/changelog",
    title: "Changelog — Deodes",
    description:
      "What shipped on Deodes: open pages, mega-nav, dense homepage, Arc rebrand and production serving.",
    ogTitle: "What shipped on Deodes",
    ogDescription:
      "Release log sourced from the real repo history — open site, nav, landing, Arc brand, production builds.",
    keywords: [
      "deodes",
      "changelog",
      "releases",
      "updates",
    ],
    indexable: true,
  },
  {
    path: "/how-it-works",
    title: "How It Works — Deodes",
    description:
      "A step-by-step walkthrough of a Deodes savings circle: passkey sign-in, creating or joining a circle, contributing USDC each cycle, receiving your payout, and building your DeoScore.",
    ogTitle: "How Deodes savings circles work, step by step",
    ogDescription:
      "Five steps from passkey sign-in to your first payout. See how random, fixed-order, auction and vote-based payout rules are enforced on Arc.",
    keywords: [
      "deodes",
      "how it works",
      "savings circles",
      "passkey",
      "USDC",
      "payout",
      "deoscore",
      "arc",
      "rosca",
    ],
    indexable: true,
  },
  {
    path: "/faq",
    title: "FAQ — Deodes",
    description:
      "Answers about Deodes savings circles: what a ROSCA is, how passkey sign-in provisions your Arc wallet, penalties for missed contributions, and how DeoScore is scored.",
    ogTitle: "Deodes FAQ — circles, wallets and fees",
    ogDescription:
      "What is a ROSCA? How do late-payment penalties work? What does your DeoScore measure? Direct answers on circles, passkey wallets, USDC and zero platform fees.",
    keywords: [
      "deodes",
      "faq",
      "questions",
      "rosca",
      "esusu",
      "passkey",
      "webauthn",
      "USDC",
      "USDC",
      "deoscore",
      "smart contracts",
    ],
    indexable: true,
  },
  {
    path: "/docs/api",
    title: "API Reference — Deodes",
    description:
      "Interactive reference for the Deodes REST API. Every endpoint, request body and response shape for passkey auth, wallets, circles, contributions and reputation, served as live Swagger docs.",
    ogTitle: "Deodes API reference — live Swagger docs",
    ogDescription:
      "Browse every Deodes REST endpoint with schemas and examples: passkey auth, auto-provisioned wallets, circles, contributions and reputation.",
    keywords: [
      "deodes",
      "api",
      "api reference",
      "rest",
      "swagger",
      "openapi",
      "endpoints",
      "developers",
      "arc",
    ],
    indexable: true,
  },
  {
    path: "/developers",
    title: "Developers — Deodes",
    description:
      "Build on Deodes: a full REST API reference, WebAuthn passkey authentication, auto-provisioned Arc wallets and seven Arc smart contracts, all Apache 2.0 licensed.",
    ogTitle: "Developers — build on Deodes's Arc platform",
    ogDescription:
      "API docs, the passkey auth flow and a smart-contract reference for building on Deodes. Zero platform fees, no KYC, Apache 2.0 throughout.",
    keywords: [
      "deodes",
      "developers",
      "api",
      "rest",
      "typescript",
      "react",
      "arc",
      "arc",
      "smart contracts",
      "webauthn",
      "open source",
    ],
    indexable: true,
  },
  {
    path: "/docs",
    title: "Documentation — Deodes",
    description:
      "Deodes documentation covering getting started, savings circles, reputation scoring, wallet setup, contract architecture and platform security — for first-time savers and builders alike.",
    ogTitle: "Deodes documentation",
    ogDescription:
      "Guides for every Deodes workflow: passkey setup, creating circles, reputation scoring, Arc contracts and security.",
    keywords: [
      "deodes",
      "documentation",
      "docs",
      "guides",
      "arc",
      "savings circles",
      "wallet setup",
      "deoscore",
      "security",
      "arc",
    ],
    indexable: true,
  },
  {
    path: "/become-a-contributor",
    title: "Become a Contributor — Deodes",
    description:
      "Contribute to Deodes, an open-source, zero-fee, KYC-free savings platform on Arc. Developers, designers, technical writers and community builders are all welcome.",
    ogTitle: "Become a contributor — join Deodes's mission",
    ogDescription:
      "Help build passkey-based financial coordination for the next billion. Apply to contribute as a developer, designer, writer or community organiser.",
    keywords: [
      "deodes",
      "contribute",
      "open source",
      "developer",
      "designer",
      "community",
      "arc",
      "arc",
      "financial inclusion",
    ],
    indexable: true,
  },
  {
    path: "/status",
    title: "System Status — Deodes",
    description:
      "Live uptime and response times for the Deodes web app, public API, database and passkey authentication services on the Arc network.",
    ogTitle: "Deodes system status — live uptime",
    ogDescription:
      "Check current availability and response times for the Deodes web app, API, database and WebAuthn services.",
    keywords: [
      "deodes",
      "status",
      "uptime",
      "availability",
      "incident",
      "monitoring",
      "api",
      "arc",
    ],
    indexable: true,
    changeFrequency: "hourly",
  },
  {
    path: "/support",
    title: "Support — Deodes",
    description:
      "Get help with Deodes: passkey sign-in, your auto-provisioned Arc wallet, USDC contributions and payouts, and your DeoScore reputation. Open a ticket or look one up by ID.",
    ogTitle: "Deodes support — get help",
    ogDescription:
      "Troubleshooting for passkeys, wallets, contributions and reputation, plus a direct route to the Deodes support team.",
    keywords: [
      "deodes",
      "support",
      "help",
      "contact",
      "ticket",
      "passkey",
      "wallet",
      "USDC",
      "deoscore",
    ],
    indexable: true,
  },
  {
    path: "/login",
    title: "Sign In — Deodes",
    description:
      "Sign in to Deodes with your passkey — Face ID, fingerprint or device PIN. No email address, no password, no seed phrase, and no separate wallet to back up.",
    ogTitle: "Sign in to Deodes with a passkey",
    ogDescription:
      "One tap with Face ID or fingerprint. No email, no password, no seed phrase — your Arc wallet unlocks instantly.",
    keywords: [
      "deodes",
      "sign in",
      "login",
      "passkey",
      "webauthn",
      "face id",
      "fingerprint",
      "arc wallet",
    ],
    indexable: true,
  },
  {
    path: "/register",
    title: "Create an Account — Deodes",
    description:
      "Create a Deodes account in under a minute using a passkey. No email address, no password and no KYC — an Arc wallet is provisioned the moment you register.",
    ogTitle: "Create your Deodes account with a passkey",
    ogDescription:
      "Register in under a minute. No email, no password, no KYC, and your Arc wallet is created automatically.",
    keywords: [
      "deodes",
      "register",
      "sign up",
      "create account",
      "passkey",
      "webauthn",
      "no kyc",
      "arc wallet",
    ],
    indexable: true,
  },
  {
    path: "/privacy",
    title: "Privacy Policy — Deodes",
    description:
      "How Deodes handles your data: passkey credentials, your Arc wallet address, public on-chain activity and anonymous analytics. No email address or KYC documents are collected.",
    ogTitle: "Privacy policy — Deodes",
    ogDescription:
      "What we store, what we never store, and how to exercise your data rights. Passkey-only, no email address, no KYC documents.",
    keywords: [
      "deodes",
      "privacy",
      "policy",
      "data protection",
      "gdpr",
      "passkey",
      "webauthn",
      "on-chain data",
      "analytics",
    ],
    indexable: true,
  },
  {
    path: "/terms",
    title: "Terms of Service — Deodes",
    description:
      "The legal terms covering Deodes: authentication with a passkey, automatic Arc wallet creation, experimental smart contracts, limitations of liability and your responsibilities as a user.",
    ogTitle: "Terms of service — Deodes",
    ogDescription:
      "What you agree to when using Deodes: smart-contract risk, wallet security, eligibility and the limits of our liability.",
    keywords: [
      "deodes",
      "terms",
      "terms of service",
      "legal",
      "agreement",
      "liability",
      "smart contract risk",
      "arc",
      "rosca",
    ],
    indexable: true,
  },

  // ── Non-indexable, but still described ───────────────────────────────────
  // These are reachable with no session, so a pasted link must not fall back
  // to the site-wide marketing description. They ship a full OG block and are
  // marked `noindex, nofollow` so they never compete with the real pages.
  {
    path: "/passkey-setup",
    title: "Set Up a Passkey — Deodes",
    description:
      "Add a passkey to your Deodes account so future sign-ins use Face ID, fingerprint or your device PIN instead of a browser prompt.",
    ogTitle: "Set up a passkey — Deodes",
    ogDescription:
      "Register Face ID, a fingerprint or your device PIN on your account for faster, phishing-resistant sign-ins.",
    keywords: ["deodes", "passkey", "webauthn", "setup", "face id", "fingerprint", "account security"],
    indexable: false,
  },
  {
    path: "/verify-callback",
    title: "Verifying Session — Deodes",
    description:
      "Confirming your Deodes session after verification. You will be redirected automatically.",
    ogTitle: "Verifying session — Deodes",
    ogDescription:
      "One moment while your Deodes session is confirmed after verification.",
    keywords: ["deodes", "verify", "session", "passkey"],
    indexable: false,
  },
  {
    path: "/access-denied",
    title: "Access Denied (403) — Deodes",    description:
      "Your Deodes account does not have permission to open this resource. If that seems wrong, the support team can verify your access.",
    ogTitle: "Access denied (403) — Deodes",
    ogDescription:
      "This account is not permitted to open the requested resource. Contact Deodes support if you believe this is a mistake.",
    keywords: ["deodes", "403", "access denied", "forbidden", "permission", "support"],
    indexable: false,
  },
  {
    path: "/auth-required",
    title: "Sign In Required (401) — Deodes",
    description:
      "Your Deodes session has expired, or you are signed out. Sign in with your passkey to pick up exactly where you left off.",
    ogTitle: "Sign in required (401) — Deodes",
    ogDescription: "Your session needs a passkey again. Sign in to pick up exactly where you left off.",
    keywords: ["deodes", "401", "unauthorized", "session expired", "sign in", "passkey"],
    indexable: false,
  },
  {
    path: "/bad-request",
    title: "Bad Request (400) — Deodes",
    description:
      "Deodes could not read one or more values in that request. Go back, check what you entered and submit again — nothing was changed.",
    ogTitle: "Bad request (400) — Deodes",
    ogDescription: "Some request values were invalid. Return to the previous screen and submit again.",
    keywords: ["deodes", "400", "bad request", "validation", "invalid input"],
    indexable: false,
  },
  {
    path: "/internal-error",
    title: "Something Went Wrong (500) — Deodes",
    description:
      "Deodes hit an unexpected server error and the problem has been logged. Try again, or send the request ID to support so we can trace it.",
    ogTitle: "Something went wrong (500) — Deodes",
    ogDescription:
      "An unexpected error occurred on our side. Retry the request, or send us the request ID and we will trace it.",
    keywords: ["deodes", "500", "internal error", "server error", "incident", "support"],
    indexable: false,
  },
  {
    path: "/service-unavailable",
    title: "Service Unavailable (503) — Deodes",
    description:
      "Deodes is temporarily unavailable while we finish maintenance or recover from an incident. Your funds are untouched on-chain — please try again shortly.",
    ogTitle: "Service unavailable (503) — Deodes",
    ogDescription:
      "We are down for maintenance. Nothing on-chain has changed — please try again shortly.",
    keywords: ["deodes", "503", "service unavailable", "maintenance", "downtime", "incident"],
    indexable: false,
  },
  {
    path: "/offline",
    title: "You Are Offline — Deodes",
    description:
      "This device has no network connection, so Deodes cannot reach the Arc network right now. Reconnect and retry — anything already cached stays available.",
    ogTitle: "You are offline — Deodes",
    ogDescription: "No connection right now. Reconnect to reach the Arc network and retry.",
    keywords: ["deodes", "offline", "no connection", "network error", "pwa"],
    indexable: false,
  },
  {
    path: "/404",
    title: "Page Not Found (404) — Deodes",
    description:
      "That Deodes page does not exist. It may have been renamed or removed — try the documentation, the FAQ, or head back to the home page.",
    ogTitle: "Page not found (404) — Deodes",
    ogDescription: "This page does not exist. Try the docs, the FAQ, or head back to the home page.",
    keywords: ["deodes", "404", "not found", "page missing"],
    indexable: false,
  },
  {
    path: "/setup",
    title: "Initial Setup — Deodes",
    description:
      "One-time operator setup for this Deodes deployment: choose the first administrator username and password.",
    ogTitle: "Deodes initial setup",
    ogDescription: "One-time administrator setup for this deployment.",
    keywords: ["deodes", "setup", "install", "bootstrap", "admin"],
    indexable: false,
  },
  {
    path: "/upload",
    title: "Content Upload — Deodes",
    description:
      "Restricted upload console for publishing documentation and content pages to this Deodes deployment.",
    ogTitle: "Deodes content upload",
    ogDescription: "Restricted publishing console for this deployment.",
    keywords: ["deodes", "upload", "content", "publishing", "admin"],
    indexable: false,
  },
]

const ROUTES_BY_PATH = new Map(PUBLIC_ROUTES.map((route) => [route.path, route]))

/** Look up a route's SEO entry. Returns `undefined` for unregistered paths. */
export function getRouteSeo(path: string): RouteSeo | undefined {
  return ROUTES_BY_PATH.get(path)
}

/** Indexable routes only — the set the sitemap should advertise. */
export const INDEXABLE_ROUTES: readonly RouteSeo[] = PUBLIC_ROUTES.filter(
  (route) => route.indexable,
)

/**
 * Build a Next.js `Metadata` object for a public route.
 *
 * Every field a social scraper or a crawler reads comes from a single registry
 * entry, so `description`, `og:description` and `twitter:description` are always
 * populated together and `og:url` always agrees with the canonical link.
 *
 * Throws on an unknown path rather than silently emitting an empty description.
 * A missing entry is exactly the bug this module exists to prevent, and failing
 * at build time is far cheaper than discovering it from a blank link preview.
 */
export function buildRouteMetadata(path: string): Metadata {
  const route = getRouteSeo(path)
  if (!route) {
    throw new Error(
      `[seo] No SEO entry registered for "${path}". Add one to PUBLIC_ROUTES in ` +
        "src/lib/seo/route-metadata.ts — the route audit fails the build on any " +
        "unregistered public route.",
    )
  }

  return {
    title: route.title,
    description: route.description,
    keywords: [...route.keywords],
    authors: [{ name: AUTHOR_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    alternates: { canonical: route.path },
    robots: route.indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      type: route.ogType ?? "website",
      locale: "en_US",
      url: absoluteUrl(route.path),
      siteName: SITE_NAME,
      title: route.ogTitle,
      description: route.ogDescription,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      site: TWITTER_SITE,
      creator: TWITTER_CREATOR,
      title: route.ogTitle,
      description: route.ogDescription,
      images: [OG_IMAGE.url],
    },
  }
}
