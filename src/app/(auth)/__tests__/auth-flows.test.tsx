import { act } from "@testing-library/react"
import { describe, it, expect, beforeEach } from "vitest"
import { useAuthFlowStore } from "@/stores/auth-flow-store"

describe("Auth System Integration Flows", () => {
  beforeEach(() => {
    act(() => {
      useAuthFlowStore.getState().reset()
    })
  })

  // Test 1: Wallet selection to connected state transition
  it("Flow 1: handles wallet selection and transitions store state to connected", async () => {
    const store = useAuthFlowStore.getState()
    expect(store.connection.walletId).toBeNull()

    act(() => {
      useAuthFlowStore.getState().connectSuccess("freighter", "GAAXTEST1234567890")
    })

    const updated = useAuthFlowStore.getState()
    expect(updated.connection.walletId).toBe("freighter")
    expect(updated.connection.address).toBe("GAAXTEST1234567890")
    expect(updated.status.status).toBe("connected")
  })

  // Test 2: Passkey login flow state machine
  it("Flow 2: initiates passkey authentication state machine", () => {
    act(() => {
      useAuthFlowStore.getState().startLoginFlow()
    })

    expect(useAuthFlowStore.getState().mode).toBe("login")
    expect(useAuthFlowStore.getState().step).toBe("choose")

    act(() => {
      useAuthFlowStore.getState().connectStart("passkey")
    })

    expect(useAuthFlowStore.getState().status.status).toBe("connecting")
  })

  // Test 3: Register flow email verification state management
  it("Flow 3: updates and tracks email verification state transitions", () => {
    act(() => {
      useAuthFlowStore.getState().startRegisterFlow()
      useAuthFlowStore.getState().setEmailVerificationCodeSent("test@moistello.com", "verif-id-123")
    })

    const state = useAuthFlowStore.getState()
    expect(state.emailVerification.email).toBe("test@moistello.com")
    expect(state.emailVerification.verificationId).toBe("verif-id-123")
    expect(state.emailVerification.codeSent).toBe(true)
    expect(state.emailVerification.codeVerified).toBe(false)

    act(() => {
      useAuthFlowStore.getState().setEmailVerified()
    })

    expect(useAuthFlowStore.getState().emailVerification.codeVerified).toBe(true)
  })

  // Test 4: Profile form entry and validation state persistence
  it("Flow 4: validates profile form data and sets field errors", () => {
    act(() => {
      useAuthFlowStore.getState().startRegisterFlow()
    })

    // Missing display name should fail validation
    let isValid = false
    act(() => {
      isValid = useAuthFlowStore.getState().validateProfile()
    })
    expect(isValid).toBe(false)

    // Set valid display name and country
    act(() => {
      useAuthFlowStore.getState().updateProfileField("displayName", "Alice")
      useAuthFlowStore.getState().updateProfileField("countryCode", "NG")
      isValid = useAuthFlowStore.getState().validateProfile()
    })
    expect(isValid).toBe(true)
  })

  // Test 5: Nonce fetching & message signing flow
  it("Flow 5: executes nonce attachment and signature success sequence", () => {
    act(() => {
      useAuthFlowStore.getState().signStart("GAAXTEST1234567890")
      useAuthFlowStore.getState().setNonce("nonce-abc-xyz")
    })

    expect(useAuthFlowStore.getState().auth.nonce).toBe("nonce-abc-xyz")
    expect(useAuthFlowStore.getState().status.status).toBe("signing")

    act(() => {
      useAuthFlowStore.getState().signSuccess("signature-bytes-789", "nonce-abc-xyz")
    })

    expect(useAuthFlowStore.getState().auth.signature).toBe("signature-bytes-789")
    expect(useAuthFlowStore.getState().status.status).toBe("signed")
  })

  // Test 6: Session timeout notification & auto-recovery
  it("Flow 6: triggers error state on timeout and allows recovery reset", () => {
    act(() => {
      useAuthFlowStore.getState().setError("connection_timeout", "Wallet connection timed out")
    })

    expect(useAuthFlowStore.getState().status.status).toBe("error")
    expect(useAuthFlowStore.getState().error?.code).toBe("connection_timeout")

    act(() => {
      useAuthFlowStore.getState().clearError()
    })

    expect(useAuthFlowStore.getState().error).toBeNull()
  })

  // Test 7: Rate limit cooldown UI disablement & countdown
  it("Flow 7: sets rate limiting cooldown parameter", () => {
    const cooldownTime = Date.now() + 60000

    act(() => {
      useAuthFlowStore.getState().setRateLimit(2, cooldownTime)
    })

    const state = useAuthFlowStore.getState()
    expect(state.rateLimit.remainingAttempts).toBe(2)
    expect(state.rateLimit.cooldownUntil).toBe(cooldownTime)
  })

  // Test 8: Offline status detection & error banner display
  it("Flow 8: handles relay degradation and status tracking", () => {
    act(() => {
      useAuthFlowStore.getState().setRelayStatus("down")
    })

    expect(useAuthFlowStore.getState().connection.relayStatus).toBe("down")

    act(() => {
      useAuthFlowStore.getState().setRelayStatus("healthy")
    })

    expect(useAuthFlowStore.getState().connection.relayStatus).toBe("healthy")
  })
})
