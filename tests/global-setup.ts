/**
 * Playwright global setup: refuse to run against production.
 *
 * E2E circles once landed in the PROD database because a run targeted a
 * production host (directly or via the shared local backend). The suites
 * below expect an isolated dev server with mocked APIs — running them
 * anywhere near prod writes real rows. This gate fails the run before any
 * browser launches unless the target is loopback.
 */
import { FullConfig } from "@playwright/test"

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"]);

async function globalSetup(config: FullConfig): Promise<void> {
  const raw =
    process.env.PLAYWRIGHT_BASE_URL ??
    config.projects[0]?.use?.baseURL ??
    "http://localhost:1110";
  let host = "";
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    throw new Error(`[e2e-guard] unparseable baseURL ${JSON.stringify(raw)} — refusing to run`);
  }
  if (!LOOPBACK.has(host)) {
    throw new Error(
      `[e2e-guard] baseURL host ${JSON.stringify(host)} is not loopback — ` +
        "e2e suites must never run against production (they create real circles). " +
        "Run against the local dev server instead.",
    );
  }
}

export default globalSetup;
