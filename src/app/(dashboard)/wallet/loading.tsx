import { WalletSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading wallet">
      <WalletSkeleton />
    </div>
  )
}
