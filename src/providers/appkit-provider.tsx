"use client"

import { useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  WagmiProvider,
  cookieToInitialState,
  type State as WagmiInitialState,
} from "wagmi"
import { createAppKit } from "@reown/appkit/react"
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi"
import { arcMainnet, arcTestnet, defaultArcChain } from "@/lib/arc-chains"

/**
 * Reown AppKit foundation provider.
 *
 * COEXISTENCE ONLY — nothing consumes this yet. The legacy wallet system
 * (multiWalletStore + wallet adapters) keeps working untouched; a later
 * cutover step will migrate consumers and delete the legacy code.
 *
 * ## QueryClient choice (documented per task)
 *
 * An OWN QueryClient is created here instead of reusing the one inside
 * QueryProvider. Reuse is not trivially possible: QueryProvider builds its
 * client in internal useState and never exports it, so reaching in would
 * require refactoring that provider (out of scope — no consumer changes).
 * The nested <QueryClientProvider> is safe: the inner legacy provider
 * shadows the outer one for app hooks, while wagmi/AppKit hooks resolve to
 * the outer client. Isolation also keeps the legacy auth-driven
 * removeQueries behaviour from ever touching wagmi's cache.
 */

const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ||
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  ""

// AppKit networks: both Arc chains always selectable; the active one per
// ARC_NETWORK is the default.
const networks = [arcTestnet, arcMainnet] as unknown as [
  typeof arcTestnet,
  typeof arcMainnet,
]

// Module-scope singleton per Reown docs. Guarded so a missing project ID
// (CI, fresh clone without .env.local) degrades to a pass-through instead
// of crashing the whole tree at import time — no consumers exist yet, so
// rendering children without wagmi is the safe fallback.
let wagmiAdapter: WagmiAdapter | undefined
if (projectId) {
  wagmiAdapter = new WagmiAdapter({
    ssr: true,
    projectId,
    networks,
  })
  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    defaultNetwork: defaultArcChain as unknown as typeof networks[number],
    projectId,
    metadata: {
      name: "Deodes",
      description: "Arc savings circles — decentralized rotating savings on Arc",
      url: "https://deodes.com",
      icons: ["https://deodes.com/logo.jpg"],
    },
  })
}

interface AppKitProviderProps {
  children: ReactNode
  /**
   * Raw `cookie` request header from the server layout, used to hydrate the
   * wagmi connection state during SSR. Optional — when omitted the provider
   * simply starts disconnected.
   */
  cookies?: string | null
}

export function AppKitProvider({ children, cookies }: AppKitProviderProps) {
  const [queryClient] = useState(() => new QueryClient())
  const [initialState] = useState<WagmiInitialState | undefined>(() =>
    wagmiAdapter && cookies
      ? cookieToInitialState(wagmiAdapter.wagmiConfig, cookies)
      : undefined,
  )

  // No project ID configured: render children untouched (see above).
  if (!wagmiAdapter) {
    return <>{children}</>
  }

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

// Re-exported for the cutover step (consumers will need the active chain).
export { arcMainnet, arcTestnet, defaultArcChain }
