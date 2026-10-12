export interface DocPage {
  slug: string
  title: string
  content: string
  source: "docs" | "page"
}

export interface SearchMatch {
  title: string
  href: string
  score: number
  snippet: string
}

/** Escape a string for safe use inside a RegExp. */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Split a raw query into the lowercase, non-empty terms we actually rank on. */
export function buildTerms(query: string): string[] {
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

const SNIPPET_WINDOW = 120
const SNIPPET_LEAD = 45

/**
 * Build a readable snippet from a document's plain-text content, centered on
 * (and surrounding) the first query-term match. When nothing matches — or
 * there is no content — falls back to the article's opening or a prompt.
 */
export function windowSnippet(content: string, terms: string[]): string {
  const text = content.replace(/\s+/g, " ").trim()
  if (!text) return "Search this article for details."

  let idx = -1
  for (const term of terms) {
    if (!term) continue
    const i = text.toLowerCase().indexOf(term)
    if (i !== -1 && (idx === -1 || i < idx)) idx = i
  }

  if (idx === -1) {
    const head = text.slice(0, SNIPPET_WINDOW).trimEnd()
    return text.length > SNIPPET_WINDOW ? `${head}…` : text
  }

  const start = Math.max(0, idx - SNIPPET_LEAD)
  const end = Math.min(text.length, idx + SNIPPET_WINDOW)
  const lead = start > 0 ? "…" : ""
  const tail = end < text.length ? "…" : ""
  return `${lead}${text.slice(start, end).trim()}${tail}`
}

/**
 * Rank all pages against a query, returning the top matches each with a
 * human snippet. Higher title relevance and more content hits raise a page's
 * score; ties keep source-document order.
 */
export function searchDocs(
  pages: DocPage[],
  query: string,
  limit = 10
): SearchMatch[] {
  const terms = buildTerms(query)
  if (terms.length === 0) return []

  return pages
    .map((page) => {
      const searchText = `${page.title} ${page.content}`.toLowerCase()
      let score = 0
      for (const term of terms) {
        const count =
          (searchText.match(new RegExp(escapeRegExp(term), "g")) || []).length
        score += count
        if (page.title.toLowerCase().includes(term)) score += 5
      }

      const href =
        page.source === "docs"
          ? `/docs/${page.slug === "index" ? "" : page.slug}`
          : `/${page.slug}`

      return {
        title: page.title,
        href,
        score,
        snippet: windowSnippet(page.content, terms),
      }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}