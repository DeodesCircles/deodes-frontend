import { describe, it, expect, vi, beforeEach } from "vitest"
import { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from "axios"

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}))

vi.mock("@/lib/api-client", () => ({
  post: mockPost,
}))

vi.mock("@/lib/monitoring", () => ({
  recordMetric: vi.fn(),
  captureAuthError: vi.fn(),
}))

import { useAuthFlowStore } from "@/stores/auth-flow-store"

function resetStore() {
  useAuthFlowStore.getState().reset()
  // Reset all state including email verification
  useAuthFlowStore.setState({
    status: { status: "idle" },
    emailVerification: {
      email: "",
      verificationId: null,
      codeSent: false,
      codeVerified: false,
      expiresAt: null,
      remainingAttempts: 5,
    },
  })
}

function makeAxiosError(status: number, data?: Record<string, unknown>): AxiosError {
  return new AxiosError(
    "Request failed",
    "ERR_BAD_RESPONSE",
    undefined,
    null,
    {
      status,
      data: data ?? { error: "Something went wrong" },
      statusText: "Error",
      headers: new AxiosHeaders(),
      config: {} as InternalAxiosRequestConfig,
    },
  )
}

describe("AuthFlowStore - sendVerificationCode", () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it("sends code and updates verification state on success", async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        verificationId: "vid-123",
        expiresAt: Date.now() + 600000,
        remainingAttempts: 3,
      },
    })

    await expect(useAuthFlowStore.getState().sendVerificationCode("test@example.com")).resolves.toBeUndefined()

    const state = useAuthFlowStore.getState()
    expect(mockPost).toHaveBeenCalledWith("/auth/verification/send", { email: "test@example.com", captchaToken: undefined })
    expect(state.emailVerification.email).toBe("test@example.com")
    expect(state.emailVerification.verificationId).toBe("vid-123")
    expect(state.emailVerification.codeSent).toBe(true)
    expect(state.emailVerification.remainingAttempts).toBe(3)
    expect(state.status).toEqual({ status: "code_sent" })
  })

  it("sets error state on API failure", async () => {
    mockPost.mockRejectedValueOnce(new Error("Network error"))

    await expect(useAuthFlowStore.getState().sendVerificationCode("test@example.com")).rejects.toThrow()

    const state = useAuthFlowStore.getState()
    expect(state.status).toEqual({
      status: "error",
      code: "email_send_failed",
      message: "Failed to send verification code. Please try again.",
      canRetry: true,
    })
  })

  it("sets sending_code status before request", async () => {
    mockPost.mockImplementationOnce(() => {
      const state = useAuthFlowStore.getState()
      expect(state.status).toEqual({ status: "sending_code" })
      return Promise.resolve({
        data: {
          verificationId: "vid-1",
          expiresAt: Date.now() + 600000,
          remainingAttempts: 3,
        },
      })
    })

    await useAuthFlowStore.getState().sendVerificationCode("test@example.com")
  })

  it("resets codeSent when resending", async () => {
    mockPost.mockResolvedValueOnce({
      data: { verificationId: "vid-1", expiresAt: Date.now() + 600000, remainingAttempts: 3 },
    })
    await expect(useAuthFlowStore.getState().sendVerificationCode("first@test.com")).resolves.toBeUndefined()

    mockPost.mockResolvedValueOnce({
      data: { verificationId: "vid-2", expiresAt: Date.now() + 600000, remainingAttempts: 2 },
    })
    await expect(useAuthFlowStore.getState().sendVerificationCode("second@test.com")).resolves.toBeUndefined()

    const state = useAuthFlowStore.getState()
    expect(state.emailVerification.email).toBe("second@test.com")
    expect(state.emailVerification.verificationId).toBe("vid-2")
    expect(state.emailVerification.remainingAttempts).toBe(2)
  })
})

describe("AuthFlowStore - verifyCode", () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it("verifies code and marks as verified on success", async () => {
    useAuthFlowStore.setState({
      emailVerification: {
        email: "test@example.com",
        verificationId: "vid-123",
        codeSent: true,
        codeVerified: false,
        expiresAt: Date.now() + 600000,
        remainingAttempts: 5,
      },
    })

    mockPost.mockResolvedValueOnce({ verified: true })

    await useAuthFlowStore.getState().verifyCode("123456")

    const state = useAuthFlowStore.getState()
    expect(mockPost).toHaveBeenCalledWith("/auth/verification/verify", {
      verificationId: "vid-123",
      code: "123456",
    })
    expect(state.emailVerification.codeVerified).toBe(true)
    expect(state.status).toEqual({ status: "idle" })
  })

  it("rejects invalid code format (non-6-digit)", async () => {
    useAuthFlowStore.setState({
      emailVerification: {
        email: "test@example.com",
        verificationId: "vid-123",
        codeSent: true,
        codeVerified: false,
        expiresAt: Date.now() + 600000,
        remainingAttempts: 5,
      },
    })

    await expect(useAuthFlowStore.getState().verifyCode("abc")).rejects.toThrow("Invalid code format.")

    expect(mockPost).not.toHaveBeenCalled()
    const state = useAuthFlowStore.getState()
    expect(state.status).toEqual({
      status: "error",
      code: "email_code_invalid",
      message: "Invalid code format.",
      canRetry: false,
    })
  })

  it("handles 429 rate limit error", async () => {
    useAuthFlowStore.setState({
      emailVerification: {
        email: "test@example.com",
        verificationId: "vid-123",
        codeSent: true,
        codeVerified: false,
        expiresAt: Date.now() + 600000,
        remainingAttempts: 5,
      },
    })

    mockPost.mockRejectedValueOnce(makeAxiosError(429))

    await expect(useAuthFlowStore.getState().verifyCode("123456")).rejects.toThrow()

    const state = useAuthFlowStore.getState()
    expect(state.status).toEqual({
      status: "error",
      code: "email_rate_limited",
      message: "Too many attempts. Please wait before trying again.",
      canRetry: true,
    })
  })

  it("decrements remainingAttempts on wrong code", async () => {
    useAuthFlowStore.setState({
      emailVerification: {
        email: "test@example.com",
        verificationId: "vid-123",
        codeSent: true,
        codeVerified: false,
        expiresAt: Date.now() + 600000,
        remainingAttempts: 3,
      },
    })

    mockPost.mockRejectedValueOnce(makeAxiosError(400, { error: "Invalid code. 2 attempt(s) remaining." }))

    await expect(useAuthFlowStore.getState().verifyCode("000000")).rejects.toThrow()

    const state = useAuthFlowStore.getState()
    expect(state.emailVerification.remainingAttempts).toBe(2)
  })

  it("handles expired code error", async () => {
    useAuthFlowStore.setState({
      emailVerification: {
        email: "test@example.com",
        verificationId: "vid-123",
        codeSent: true,
        codeVerified: false,
        expiresAt: Date.now() + 600000,
        remainingAttempts: 5,
      },
    })

    mockPost.mockRejectedValueOnce(makeAxiosError(410, { error: "expired" }))

    await expect(useAuthFlowStore.getState().verifyCode("123456")).rejects.toThrow()

    const state = useAuthFlowStore.getState()
    expect(state.status).toEqual({
      status: "error",
      code: "email_code_expired",
      message: "Verification code has expired. Request a new one.",
      canRetry: false,
    })
  })

  it("handles API error with message in response body", async () => {
    useAuthFlowStore.setState({
      emailVerification: {
        email: "test@example.com",
        verificationId: "vid-123",
        codeSent: true,
        codeVerified: false,
        expiresAt: Date.now() + 600000,
        remainingAttempts: 5,
      },
    })

    mockPost.mockRejectedValueOnce(makeAxiosError(400, { error: "Invalid code format" }))

    await expect(useAuthFlowStore.getState().verifyCode("000000")).rejects.toThrow("Invalid code format")

    const state = useAuthFlowStore.getState()
    expect(state.status).toEqual({
      status: "error",
      code: "email_code_invalid",
      message: "Invalid code format",
      canRetry: true,
    })
  })

  it("preserves rate limit remaining state", async () => {
    useAuthFlowStore.setState({
      emailVerification: {
        email: "test@example.com",
        verificationId: "vid-123",
        codeSent: true,
        codeVerified: false,
        expiresAt: Date.now() + 600000,
        remainingAttempts: 1,
      },
    })

    mockPost.mockRejectedValueOnce(makeAxiosError(429))

    await expect(useAuthFlowStore.getState().verifyCode("123456")).rejects.toThrow()

    const state = useAuthFlowStore.getState()
    expect(state.emailVerification.remainingAttempts).toBe(1)
  })
})

describe("AuthFlowStore - resendCode", () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it("calls sendVerificationCode with stored email", async () => {
    useAuthFlowStore.setState({
      emailVerification: {
        email: "test@example.com",
        verificationId: "vid-old",
        codeSent: true,
        codeVerified: false,
        expiresAt: Date.now() + 600000,
        remainingAttempts: 3,
      },
    })

    mockPost.mockResolvedValueOnce({
      data: { verificationId: "vid-new", expiresAt: Date.now() + 600000, remainingAttempts: 3 },
    })

    await useAuthFlowStore.getState().resendCode()

    expect(mockPost).toHaveBeenCalledWith("/auth/verification/send", { email: "test@example.com", captchaToken: undefined })
  })

  it("does nothing if no email is stored", async () => {
    await useAuthFlowStore.getState().resendCode()

    expect(mockPost).not.toHaveBeenCalled()
  })
})

describe("AuthFlowStore - clearEmailVerification", () => {
  it("resets email verification to initial state", () => {
    useAuthFlowStore.setState({
      emailVerification: {
        email: "test@example.com",
        verificationId: "vid-123",
        codeSent: true,
        codeVerified: true,
        expiresAt: Date.now() + 600000,
        remainingAttempts: 3,
      },
    })

    useAuthFlowStore.getState().clearEmailVerification()

    const state = useAuthFlowStore.getState()
    expect(state.emailVerification.email).toBe("")
    expect(state.emailVerification.verificationId).toBeNull()
    expect(state.emailVerification.codeSent).toBe(false)
    expect(state.emailVerification.codeVerified).toBe(false)
    expect(state.emailVerification.expiresAt).toBeNull()
    expect(state.emailVerification.remainingAttempts).toBe(5)
  })
})
