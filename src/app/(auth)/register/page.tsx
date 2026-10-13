"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { registerSchema, zodResolver, type RegisterInput } from "@/lib/validation"
import { AuthLayout } from "@/components/auth/auth-layout"
import { GoogleButton } from "@/components/auth/google-button"
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OTPInput } from "@/components/ui/otp-input"
import { useAuthStore } from "@/stores/auth-store"
import { useToast } from "@/hooks/use-toast"
import { post } from "@/lib/api-client"

interface RegisterEnvelope {
  success?: boolean
  data?: {
    message?: string
    token?: string
    refreshToken?: string
    hostedWallet?: string
  }
  error?: string
  message?: string
}

export default function RegisterPage() {
  const router = useRouter()
  const setTokens = useAuthStore((s) => s.setTokens)
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"credentials" | "code">("credentials")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState("")
  const [cooldown, setCooldown] = useState(0)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
  })

  const passwordValue = watch("password") || ""

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const startRegistration = useCallback(
    async (values: RegisterInput) => {
      setLoading(true)
      try {
        const res = await post<RegisterEnvelope>("/auth/register", {
          email: values.email,
          password: values.password,
        })
        if (res?.success === false) {
          throw new Error(res.error || res.message || "Registration failed")
        }
        setEmail(values.email)
        setCode("")
        setCodeError("")
        setCooldown(60)
        setStep("code")
        toast.success("Verification code sent to your email!")
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Registration failed"
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    },
    [toast],
  )

  const confirmCode = useCallback(async () => {
    if (code.length !== 6) {
      setCodeError("Enter the 6-digit code from your email.")
      return
    }
    setLoading(true)
    setCodeError("")
    try {
      const res = await post<RegisterEnvelope>("/auth/register/verify", { email, code })
      const token = res?.data?.token
      if (!token) {
        throw new Error(res?.error || res?.message || "Verification failed")
      }
      // setTokens persists the HttpOnly session cookie the middleware gates
      // on, so navigation must wait for it to resolve.
      await setTokens(token, res.data?.refreshToken ?? token)
      const hosted = res.data?.hostedWallet
      if (hosted && /^0x[0-9a-fA-F]{40}$/.test(hosted)) {
        try {
          sessionStorage.setItem("deodes_hosted_wallet", hosted)
        } catch {}
        toast.success(`Hosted Arc wallet created: ${hosted.slice(0, 6)}…${hosted.slice(-4)}`)
      } else {
        toast.success("Account created successfully!")
      }
      router.replace("/wallet?fresh=1")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed"
      setCodeError(msg)
    } finally {
      setLoading(false)
    }
  }, [code, email, router, setTokens, toast])

  const resendCode = useCallback(async () => {
    if (cooldown > 0 || !email) return
    setLoading(true)
    try {
      // Re-registering an unverified email re-sends the code.
      const password = watch("password")
      await post<RegisterEnvelope>("/auth/register", { email, password })
      setCooldown(60)
      toast.success("New code sent!")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not resend code")
    } finally {
      setLoading(false)
    }
  }, [cooldown, email, toast, watch])

  if (step === "code") {
    return (
      <AuthLayout title="Check Your Email">
        <div className="space-y-6">
          <p className="text-center text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>.
            Enter it below to finish creating your account.
          </p>
          <OTPInput
            id="register-code"
            label="Verification code"
            value={code}
            onChange={(v) => {
              setCode(v.replace(/\D/g, "").slice(0, 6))
              setCodeError("")
            }}
            length={6}
            error={codeError}
          />
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={loading}
            onClick={confirmCode}
            disabled={code.length !== 6}
          >
            Verify & Create Account
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setStep("credentials")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Use a different email
            </button>
            <button
              type="button"
              onClick={resendCode}
              disabled={cooldown > 0 || loading}
              className="text-aurora-violet hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create an Account">
      <div className="space-y-6">
        <form onSubmit={handleSubmit(startRegistration)} className="space-y-4" noValidate aria-label="Registration form">
          <Input
            id="name"
            type="text"
            label="Full Name"
            placeholder="Jane Doe"
            autoComplete="name"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            id="email"
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <div>
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register("password")}
            />
            <PasswordStrengthMeter password={passwordValue} />
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={loading}>
            Continue with Email
          </Button>
        </form>

        <GoogleButton mode="signup" />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-aurora-violet hover:underline focus:outline-none focus:ring-2 focus:ring-foreground">
            Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
