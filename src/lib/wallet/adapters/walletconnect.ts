import { logger } from "@/lib/logger"
/**
 * WalletConnect v2 adapter for Stellar wallets.
 *
 * ## Singleton vs per-connect state
 *
 * The SignClient SDK is expensive to initialise (opens a WebSocket to the
 * relay) and the upstream library itself is not designed to be multi-instance,
 * so the SignClient instance and its initialisation promise are intentionally
 * module-level singletons.
 *
 * All *pairing* state — the URI that is shown to the user, the current
 * pairing phase, and any error — lives inside each `connectContext` object
 * that is created at the start of every `connect()` call. This means:
 *
 *  - Two concurrent connect() calls each get their own mutable context; they
 *    cannot stomp on each other.
 *  - When a new connect() is attempted while one is already in flight, the
 *    old one is signalled to abort via its AbortSignal and its context is
 *    discarded. "Latest wins" semantics.
 *  - When the component that triggered a connect unmounts, it can call
 *    `abortConnect()` to clean up without touching unrelated state.
 *
 * ## resetWcState scope
 *
 * `resetWcState()` only clears the *current* pending context and aborts it.
 * It does NOT clear all wc@2:* IndexedDB stores app-wide, which would be
 * destructive to unrelated sessions.
 */

import { WalletAdapter, WalletMeta, NetworkType } from "../types"
import { getRelayMonitor } from "../wc2-relay"
import { getWC2SessionStore } from "../wc2-session-store"
import { ARC_CHAIN_ID } from "@/lib/constants"

function isArcAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

function arcChainRef(chainId: number): string {
  return `eip155:${chainId}`
}

// ---------------------------------------------------------------------------
// Module-level singletons (intentional — one client, one WebSocket)
// ---------------------------------------------------------------------------

let signClientInstance: any = null
let initPromise: Promise<any> | null = null

async function getOrInitSignClient(): Promise<any> {
  if (signClientInstance) return signClientInstance
  if (initPromise) return initPromise

  initPromise = (async () => {
    const { SignClient } = await import("@walletconnect/sign-client")
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""

    if (!projectId || projectId === "demo-project-id") {
      throw new Error(
        "Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID — set a real Cloud project ID to use WalletConnect."
      )
    }

    signClientInstance = await SignClient.init({
      projectId,
      relayUrl: "wss://relay.walletconnect.com",
      metadata: {
        name: "Deodes",
        description: "Decentralized savings circles (ROSCA) on Arc",
        url:
          typeof window !== "undefined"
            ? window.location.origin
            : "https://deodes.com",
        icons: ["https://deodes.com/icon.png"],
      },
    })
    return signClientInstance
  })()

  return initPromise
}

// ---------------------------------------------------------------------------
// Per-connect context
// ---------------------------------------------------------------------------

export interface PairingContext {
  /** The WalletConnect pairing URI shown to the user (QR / deeplink). */
  uri: string | null
  /** Current phase of the pairing handshake. */
  state: "idle" | "pairing" | "awaiting_approval" | "approved" | "rejected"
  /** Human-readable error, if any. */
  error: string | null
  /** AbortController so callers can cancel an in-flight connect. */
  abortController: AbortController
}

/**
 * Options accepted by the WalletConnect adapter's `connect()`.
 *
 * `network` picks the chain requested in `requiredNamespaces` and `onUri`
 * receives the pairing URI as soon as the relay issues it.
 */
export interface WalletConnectConnectOptions {
  network?: NetworkType
  onUri?: (uri: string) => void
}

/**
 * The most-recently started connect() context.
 * Only one active pairing is supported at a time; starting a new one cancels
 * the previous one ("latest wins").
 */
let _currentContext: PairingContext | null = null

/** Listener that the wallet-selector component registers to observe changes. */
let _onContextChange: ((ctx: PairingContext | null) => void) | null = null

function notifyContextChange(): void {
  _onContextChange?.(_currentContext)
}

function createContext(): PairingContext {
  return {
    uri: null,
    state: "idle",
    error: null,
    abortController: new AbortController(),
  }
}

// ---------------------------------------------------------------------------
// Public API consumed by the wallet-selector UI layer
// ---------------------------------------------------------------------------

/**
 * Register a callback that is invoked whenever the active pairing context
 * changes. Pass `null` to unsubscribe. Called immediately with the current
 * context on registration.
 */
export function onPairingContextChange(
  cb: ((ctx: PairingContext | null) => void) | null
): void {
  _onContextChange = cb
  if (cb) cb(_currentContext)
}

/**
 * Abort the currently pending connect attempt and clear the context.
 * Safe to call when a component unmounts mid-pairing.
 * Does NOT close the SignClient or clear IndexedDB stores.
 */
export function abortConnect(): void {
  if (_currentContext) {
    _currentContext.abortController.abort()
    _currentContext = null
    notifyContextChange()
  }
}

/**
 * Reset only the in-memory pairing state for the active context.
 * Equivalent to `abortConnect()` — exported under the legacy name so existing
 * call-sites don't break.
 *
 * Scoped to the owning connect attempt; does **not** touch any wc@2:*
 * IndexedDB stores or other sessions.
 */
export function resetWcState(): void {
  abortConnect()
}

/**
 * Legacy adapter for the wallet-selector component.
 * The component can subscribe to pairing URI events by passing a function:
 *   setOnPairingUri((uri) => updateMyStore(uri))
 * Pass `null` to unsubscribe.
 *
 * In the new architecture this is a thin shim over `onPairingContextChange`.
 */
export function setOnPairingUri(
  uriOrHandler: string | ((uri: string) => void) | null
): void {
  if (typeof uriOrHandler === "function") {
    // Caller is registering a URI listener (the new contract).
    const handler = uriOrHandler
    onPairingContextChange((ctx) => {
      if (ctx?.uri) handler(ctx.uri)
    })
  } else {
    // Caller is passing null to unsubscribe.
    onPairingContextChange(null)
  }
}

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

export function createWalletConnectAdapter(): WalletAdapter & {
  getPairingUri: () => string | null
  getPairingState: () => string
  getPairingError: () => string | null
} {
  let currentPublicKey: string | null = null
  let currentSession: any = null

  const meta: WalletMeta = {
    id: "walletconnect",
    name: "WalletConnect",
    category: "mobile",
    priority: 0,
    installUrl: "",
    description:
      "Connect 500+ mobile EVM wallets on Arc via QR",
    icon: "/icons/walletconnect.svg",
    isAvailable: () => typeof window !== "undefined",
  }

  return {
    meta,

    // Expose per-context state via the current context (backward-compat getters).
    getPairingUri: () => _currentContext?.uri ?? null,
    getPairingState: () => _currentContext?.state ?? "idle",
    getPairingError: () => _currentContext?.error ?? null,

    /**
     * `WalletAdapter.connect` is declared as `connect(email?: string)`, so the
     * string form is accepted to satisfy that contract and ignored here —
     * WalletConnect pairing is anonymous and keyed off {@link WalletConnectConnectOptions}.
     */
    async connect(
      emailOrOptions?: string | WalletConnectConnectOptions
    ): Promise<{ publicKey: string; network: NetworkType }> {
      const options =
        typeof emailOrOptions === "string" ? undefined : emailOrOptions
      const relay = getRelayMonitor()
      if (relay.isDownForConnect) {
        const err = new Error(
          "WalletConnect relay is temporarily unavailable. Please try another wallet."
        )
        ;(err as any).code = "relay_down"
        throw err
      }

      // ── Cancel any previous in-flight connect (latest-wins) ──────────────
      if (_currentContext) {
        _currentContext.abortController.abort()
      }

      const ctx: PairingContext = createContext()
      _currentContext = ctx
      ctx.state = "pairing"
      notifyContextChange()

      const connectStartedAt = Date.now()

      try {
        const client = await getOrInitSignClient()

        // ── Bail if aborted while initialising the client ─────────────────
        if (ctx.abortController.signal.aborted) {
          throw Object.assign(new Error("Connect aborted"), { code: "user_rejected" })
        }

        // ── Reuse existing live session ───────────────────────────────────
        const sessions = client.session.getAll()
        if (sessions.length > 0) {
          const active = sessions[sessions.length - 1]
          const eipAccounts: string[] = active.namespaces?.eip155?.accounts || []
          if (eipAccounts.length > 0) {
            const parts = eipAccounts[0].split(":")
            const address = parts[parts.length - 1]
            if (address && isArcAddress(address)) {
              currentPublicKey = address
              currentSession = active
              ctx.state = "approved"
              _currentContext = null
              notifyContextChange()
              relay.recordOutcome(true, Date.now() - connectStartedAt)
              return {
                publicKey: address,
                network: "testnet",
              }
            }
          }
        }

        // ── Initiate new pairing ──────────────────────────────────────────
        const { uri, approval } = await client.connect({
          requiredNamespaces: {
            eip155: {
              methods: [
                "personal_sign",
                "eth_sendTransaction",
                "eth_signTypedData",
              ],
              chains: [arcChainRef(options?.network === "mainnet" ? 5042 : ARC_CHAIN_ID)],
              events: ["chainChanged", "accountsChanged"],
            },
          },
        })

        if (ctx.abortController.signal.aborted) {
          throw Object.assign(new Error("Connect aborted"), { code: "user_rejected" })
        }

        if (!uri) {
          throw Object.assign(
            new Error("WalletConnect did not return a pairing URI"),
            { code: "internal" }
          )
        }

        ctx.uri = uri
        ctx.state = "awaiting_approval"
        notifyContextChange()
        options?.onUri?.(uri)

        // ── Race approval against abort ───────────────────────────────────
        const session = await Promise.race([
          approval(),
          new Promise<never>((_, reject) => {
            ctx.abortController.signal.addEventListener("abort", () => {
              reject(
                Object.assign(new Error("Connect aborted"), {
                  code: "user_rejected",
                })
              )
            })
          }),
        ])

        ctx.uri = null
        ctx.state = "approved"
        _currentContext = null
        notifyContextChange()

        const accounts = session.namespaces?.eip155?.accounts || []
        if (accounts.length === 0) {
          throw new Error(
            "No Arc (EVM) accounts found in WalletConnect session"
          )
        }

        const split = accounts[0].split(":")
        const address = split[split.length - 1]
        const network = "testnet"
        if (!address || !isArcAddress(address)) {
          throw new Error(
            "Invalid Arc 0x address returned from WalletConnect session"
          )
        }

        currentPublicKey = address
        currentSession = session

        const store = getWC2SessionStore()
        store.saveSession(session)
        relay.recordOutcome(true, Date.now() - connectStartedAt)

        return {
          publicKey: address,
          network: network === "testnet" ? "testnet" : "mainnet",
        }
      } catch (err: any) {
        // Only update ctx if it is still the active one (another connect may
        // have already replaced it).
        if (_currentContext === ctx) {
          ctx.uri = null
          ctx.state = "rejected"
          ctx.error = err?.message || "Connection failed"
          _currentContext = null
          notifyContextChange()
        }
        relay.recordOutcome(false, Date.now() - connectStartedAt)
        throw {
          code: err?.code ?? "user_rejected",
          message: err?.message || "Connection rejected",
          adapter: "walletconnect",
        }
      }
    },

    async disconnect() {
      // Cancel any pending connect for this adapter instance.
      abortConnect()

      try {
        if (currentSession) {
          const client = await getOrInitSignClient()
          await client.disconnect({
            topic: currentSession.topic,
            reason: { code: 6000, message: "User disconnected" },
          })
        }
      } catch (e) {
        logger.warn("[walletconnect] Disconnect cleanup warning:", e)
      }

      currentPublicKey = null
      currentSession = null

      // Clear persisted session without nuking all IndexedDB stores.
      getWC2SessionStore().clear()
    },

    async isConnected() {
      if (!currentPublicKey || !currentSession) return false
      try {
        const client = await getOrInitSignClient()
        const sessions = client.session.getAll()
        return sessions.some((s: any) => s.topic === currentSession.topic)
      } catch {
        return false
      }
    },

    async signTransaction(xdr: string) {
      if (!currentPublicKey || !currentSession) {
        throw {
          code: "not_connected",
          message: "Not connected to WalletConnect",
          adapter: "walletconnect",
        }
      }
      const relay = getRelayMonitor()
      if (relay.isDownForSign) {
        throw {
          code: "relay_down",
          message: "Relay is down for signing",
          adapter: "walletconnect",
        }
      }

      const signStartedAt = Date.now()

      try {
        const client = await getOrInitSignClient()
        const chainId =
          currentSession.namespaces?.eip155?.chains?.[0] || arcChainRef(ARC_CHAIN_ID)

        const result = await client.request({
          chainId,
          request: {
            method: "personal_sign",
            params: [xdr, currentPublicKey],
          },
        })
        relay.recordOutcome(true, Date.now() - signStartedAt)
        return (result as any)?.signedXdr || (result as string)
      } catch (err: any) {
        relay.recordOutcome(false, Date.now() - signStartedAt)
        throw {
          code: "user_rejected",
          message: err?.message || "Signing rejected",
          adapter: "walletconnect",
        }
      }
    },

    async signMessage(message: string) {
      if (!currentPublicKey || !currentSession) {
        throw {
          code: "not_installed",
          message: "WalletConnect not connected",
          adapter: "walletconnect",
        }
      }
      try {
        const client = await getOrInitSignClient()
        const chainId =
          currentSession.namespaces?.eip155?.chains?.[0] || arcChainRef(ARC_CHAIN_ID)

        const result = await client.request({
          chainId,
          request: {
            method: "personal_sign",
            params: [message, currentPublicKey],
          },
        })
        return (result as any)?.signedMessage || (result as string)
      } catch (err: any) {
        throw {
          code: "user_rejected",
          message: err?.message || "Message signing rejected",
          adapter: "walletconnect",
        }
      }
    },

    async getPublicKey() {
      if (!currentPublicKey) {
        throw {
          code: "not_installed",
          message: "WalletConnect not connected",
          adapter: "walletconnect",
        }
      }
      return currentPublicKey
    },

    async getNetwork(): Promise<NetworkType> {
      if (!currentSession) return "testnet"
      const chainId =
        currentSession.namespaces?.eip155?.chains?.[0] || ""
      return chainId.includes("5042") && !chainId.includes("5042002")
        ? "mainnet"
        : "testnet"
    },
  }
}
