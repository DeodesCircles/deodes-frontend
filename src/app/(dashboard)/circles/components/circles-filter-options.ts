import type { Currency } from "@/types";

/** Browser filter/sort options for the /circles discovery page. */
export const TYPE_TABS = [
  { value: "all", label: "All" },
  { value: "my-circles", label: "My Circles" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "community", label: "Community" },
  { value: "premium", label: "Premium" },
];

export const SORT_OPTIONS = [
  { value: "date-desc", label: "Creation Date (Newest)", sortBy: "date", sortOrder: "desc" as const },
  { value: "date-asc", label: "Creation Date (Oldest)", sortBy: "date", sortOrder: "asc" as const },
  { value: "name-asc", label: "Name (A-Z)", sortBy: "name", sortOrder: "asc" as const },
  { value: "name-desc", label: "Name (Z-A)", sortBy: "name", sortOrder: "desc" as const },
  { value: "amount-asc", label: "Amount (Low to High)", sortBy: "amount", sortOrder: "asc" as const },
  { value: "amount-desc", label: "Amount (High to Low)", sortBy: "amount", sortOrder: "desc" as const },
  { value: "members-asc", label: "Members (Fewest)", sortBy: "members", sortOrder: "asc" as const },
  { value: "members-desc", label: "Members (Most)", sortBy: "members", sortOrder: "desc" as const },
];

/** Arc is USDC-only, so the currency toggle is a single chip. */
export const CURRENCIES: Currency[] = ["USDC"];
