import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import {
  searchDocs,
  type DocPage,
} from "@/lib/docs/search-utils"

const DOCS_DIR = path.join(process.cwd(), "content/docs")

interface DocEntry {
  slug: string
  title: string
  content: string
}

function loadAllDocs(): DocEntry[] {
  if (!fs.existsSync(DOCS_DIR)) return []

  const entries: DocEntry[] = []
  const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith(".md"))

  for (const file of files) {
    const raw = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8")
    const parts = raw.split("---\n")
    let title = file.replace(/\.md$/, "")
    let content = raw

    if (parts.length >= 3) {
      const meta: Record<string, string> = {}
      parts[1].split("\n").forEach(line => {
        const [key, ...rest] = line.split(":")
        if (key) meta[key.trim()] = rest.join(":").trim()
      })
      title = meta.title || title
      content = parts.slice(2).join("---\n").trim()
    }

    content = content
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[#*`\[\]]/g, "")
      .replace(/\n+/g, " ")

    entries.push({
      slug: file.replace(/\.md$/, ""),
      title,
      content,
    })
  }

  return entries
}

const staticPages: DocPage[] = [
  { slug: "faq", title: "FAQ", source: "page", content: "passkey auth auto wallet stellar USDC zero fees MoiScore reputation savings circles ROSCA how to join create circle contribute payout" },
  { slug: "how-it-works", title: "How It Works", source: "page", content: "sign in with passkey Face ID fingerprint create circle join contribute receive payout build reputation MoiScore start saving" },
  { slug: "about", title: "About", source: "page", content: "mission financial inclusion Stellar blockchain open source passkey wallet no email no KYC" },
  { slug: "developers", title: "Developers", source: "page", content: "API passkey auth circles contributions payouts reputation endpoints smart contracts Soroban Stellar" },
  { slug: "support", title: "Support", source: "page", content: "help ticket support contact passkey wallet circle payment withdrawal" },
]

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? ""

  const docs: DocPage[] = loadAllDocs().map(d => ({
    ...d,
    source: "docs" as const,
  }))

  const pages = [...docs, ...staticPages]
  const results = searchDocs(pages, query)

  return NextResponse.json({ results, query })
}