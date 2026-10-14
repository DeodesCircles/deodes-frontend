import { WalletAdapter, WalletMeta, NetworkType } from "../types"
import { ARC_NETWORK } from "@/lib/constants"
import { getCsrfHeaders } from "@/lib/auth/csrf"
import {
  publicKeyToLegacyAddress,
  hexEncode,
  secureZeroMemory,
} from "@/lib/crypto/key-derivation"
import { hexToBytes } from "@noble/hashes/utils.js"
import { classifyPasskeyError } from "@/lib/passkey/error-messages"

const CREDENTIAL_STORAGE_KEY = "deodes_passkey_credential"

export interface StoredCredential {
  credentialId: string
  publicKeyRaw: string
  email?: string
}

// Stored as plain JSON — credentialId is a public identifier, not a secret.
// The wallet seed is derived from credentialId + server pepper (server-side only).
// Do NOT encrypt this value — it must be readable across tabs and browser sessions.

interface PasskeySession {
  credentialId: string
  publicKey: Uint8Array
  legacyAddress: string
  expiresAt: number
}

export function createPasskeyAdapter(): WalletAdapter {
  const meta: WalletMeta = {
    id: "passkey",
    name: "Passkey",
    category: "passkey",
    icon: "passkey-icon",
    installUrl: "",
    description: "Sign in with biometrics. No password needed.",
    priority: 30,
    isAvailable: () => {
      if (typeof window === "undefined") return false
      return typeof PublicKeyCredential !== "undefined"
    },
  }

  let session: PasskeySession | null = null

  function getStoredCredential(): StoredCredential | null {
    if (typeof window === "undefined") return null
    try {
      const raw = localStorage.getItem(CREDENTIAL_STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as StoredCredential
    } catch {
      return null
    }
  }

  function storeCredential(cred: StoredCredential): void {
    if (typeof window === "undefined") return
    localStorage.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify(cred))
  }

  function removeStoredCredential(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(CREDENTIAL_STORAGE_KEY)
  }

  function zeroSession(): void {
    if (session) {
      secureZeroMemory(session.publicKey)
      session = null
    }
  }

  async function apiPost<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw {
        adapter: "passkey" as const,
        code: "internal" as const,
        message: ((data as Record<string, unknown>).error as string) || "Request failed",
      }
    }
    return res.json()
  }

  return {
    meta,

    async connect(email?: string) {
      if (typeof window === "undefined") {
        throw { adapter: "passkey", code: "not_supported" as const, message: "Not available server-side" }
      }

      if (session && Date.now() < session.expiresAt) {
        return { publicKey: hexEncode(session.publicKey) }
      }

      const { startRegistration, startAuthentication } = await import("@simplewebauthn/browser")
      const stored = getStoredCredential()

      // Stored credential path — existing user logging in (unless email is explicitly provided for re-registration)
      if (stored && !email) {
        const { options, tempKey } = await apiPost<{ options: Record<string, unknown>; tempKey: string }>(
          "/api/auth/passkey/generate-options",
          { credentialId: stored.credentialId, mode: "authenticate" }
        )

        let assertion: unknown
        try {
          assertion = await startAuthentication({
            optionsJSON: options as unknown as Parameters<typeof startAuthentication>[0]["optionsJSON"],
            useBrowserAutofill: true,
          })
        } catch (err: unknown) {
          const info = classifyPasskeyError(err)
          throw {
            adapter: "passkey",
            code: info.kind === "cancelled" ? "user_rejected" as const : "internal" as const,
            message: info.title,
            description: info.description,
            canRetry: info.canRetry,
            kind: info.kind,
          }
        }

        const verifyResult = await apiPost<{ verified: boolean; credentialId: string; publicKey: string }>(
          "/api/auth/passkey/auth-verify",
          { credentialId: stored.credentialId, assertion, tempKey }
        )

        const publicKey = hexToBytes(verifyResult.publicKey)
        const publicKeyHex = verifyResult.publicKey
        session = {
          credentialId: stored.credentialId,
          publicKey,
          legacyAddress: publicKeyToLegacyAddress(publicKey),
          expiresAt: Date.now() + 3600000,
        }
        return { publicKey: publicKeyHex }
      }

      // No stored credential or explicit registration flow requested
      const existingRaw = localStorage.getItem(CREDENTIAL_STORAGE_KEY)
      if (existingRaw && !email) {
        throw {
          adapter: "passkey",
          code: "credential_unreadable" as const,
          message: "Existing passkey credential is corrupted or unreadable. Clear browser data for this site and try again.",
        }
      }

      const { options, tempKey } = await apiPost<{ options: Record<string, unknown>; tempKey: string }>(
        "/api/auth/passkey/generate-options",
        { mode: "register", email }
      )

      let attestation: unknown
      try {
        attestation = await startRegistration({
          optionsJSON: options as unknown as Parameters<typeof startRegistration>[0]["optionsJSON"],
        })
      } catch (err: unknown) {
        const info = classifyPasskeyError(err)
        throw {
          adapter: "passkey",
          code: info.kind === "cancelled" ? "user_rejected" as const : "internal" as const,
          message: info.title,
          description: info.description,
          canRetry: info.canRetry,
          kind: info.kind,
        }
      }

      const attestationRecord = attestation as { rawId?: string; id?: string }
      const credentialId = attestationRecord.rawId || attestationRecord.id || ""

      const registerResult = await apiPost<{ verified: boolean; credentialId: string; publicKey: string }>(
        "/api/auth/passkey/register",
        { attestation, tempKey, email }
      )

      const publicKey = hexToBytes(registerResult.publicKey)
      const publicKeyHex = registerResult.publicKey

      storeCredential({
        credentialId,
        publicKeyRaw: publicKeyHex,
        email,
      })

      session = {
        credentialId,
        publicKey,
        legacyAddress: publicKeyToLegacyAddress(publicKey),
        expiresAt: Date.now() + 3600000,
      }

      return { publicKey: publicKeyHex }
    },

    reset() {
      removeStoredCredential()
      zeroSession()
    },

    async disconnect() {
      zeroSession()
    },

    async isConnected() {
      return session !== null && Date.now() < session.expiresAt
    },

    async getPublicKey() {
      if (!session || Date.now() >= session.expiresAt) {
        throw { adapter: "passkey", code: "not_installed" as const, message: "Not authenticated" }
      }
      return hexEncode(session.publicKey)
    },

    async signMessage(message: string) {
      if (!session || Date.now() >= session.expiresAt) {
        throw { adapter: "passkey", code: "not_installed" as const, message: "Not authenticated" }
      }

      const result = await apiPost<{ signature: string; publicKey: string }>(
        "/api/auth/passkey/sign-message",
        { credentialId: session.credentialId, message }
      )

      return { signature: result.signature, publicKey: result.publicKey }
    },

    async signTransaction() {
      // XDR signing was removed with the legacy chain (the server route is
      // deleted). Same precedent as the Arc adapter: explicit not_supported.
      throw {
        adapter: "passkey" as const,
        code: "not_supported" as const,
        message: "Transaction signing is unsupported for passkey wallets.",
      }
    },

    async getNetwork(): Promise<NetworkType> {
      return ARC_NETWORK as NetworkType
    },
  }
}
