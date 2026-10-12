import { Metadata } from "next"
import CreateCircleContent from "./content"

export const metadata: Metadata = {
  title: "Create Circle — Moistello",
  description: "Create a new savings circle within your community.",
}

export default function CommunityCreateCirclePage() {
  return <CreateCircleContent />
}
