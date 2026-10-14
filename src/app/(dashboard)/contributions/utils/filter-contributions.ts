import type { Contribution } from "@/types";

/**
 * Client-side filtering for the contributions page. The backend
 * GET /contributions supports only circleId/userId/page/limit, so search and
 * status filtering happen here on the fetched page.
 */
export function filterContributions(
  contributions: readonly Contribution[],
  search: string,
  status: "all" | Contribution["status"],
): Contribution[] {
  const q = search.trim().toLowerCase();
  return contributions.filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (!q) return true;
    const txn = typeof c.txnHash === "string" ? c.txnHash.toLowerCase() : "";
    return (
      c.circleId.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      txn.includes(q) ||
      String(c.roundNumber).includes(q)
    );
  });
}
