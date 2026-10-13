"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { loginSchema, zodResolver, type LoginInput } from "@/lib/validation"
import { useAuthStore } from "@/stores/auth-store"
import { useToast } from "@/hooks/use-toast"
import { post } from "@/lib/api-client"
import type { User } from "@/types"
import dynamic from "next/dynamic"
import { AuthLayout } from "@/components/auth/auth-layout"
import { GoogleButton } from "@/components/auth/google-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWalletAuth } from "@/hooks/use-wallet-auth"

const WalletSelector = dynamic(
  () => import("@/components/wallet/wallet-selector").then((m) => m.WalletSelector),
  { ssr: false }
)

interface LoginEnvelope {
  success?: boolean
  data?: {
    token?: string
    refreshToken?: string
    user?: User
  }
  token?: string
  refreshToken?: string
  user?: User
  error?: string
  message?: string
}

export default function LoginPage() {
  const router = useRouter()
  const setTokens = useAuthStore((s) => s.setTokens)
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  // Bridge: once WalletSelector connects, sign + verify and redirect to "/".
  const walletAuth = useWalletAuth({ mode: "login" })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
  })

  const onSubmit = useCallback(
    async (values: LoginInput) => {
      setLoading(true)
      try {
        const res = await post<LoginEnvelope>("/auth/login", values)
        const data = res?.data ?? res
        const token = data?.token
        if (res?.success === false) {
          throw new Error(res.error || res.message || "Login failed")
        }
        if (token) {
          // setTokens persists the HttpOnly session cookie the middleware gates
          // on, so navigation must wait for it to resolve.
          await setTokens(token, data?.refreshToken ?? token, data?.user)
          toast.success("Welcome back!")
          router.replace("/")
        } else {
          throw new Error("Invalid login response")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Login failed"
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    },
    [setTokens, toast, router],
  )

  return (
    <AuthLayout title="Sign in to Deodes">
      <div className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate aria-label="Email login form">
          <Input
            id="email"
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={loading}>
            Sign In with Email
          </Button>
        </form>

        <GoogleButton mode="signin" />

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-white/10" />
          <span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase">Or connect wallet</span>
          <div className="flex-grow border-t border-white/10" />
        </div>

        <WalletSelector />

        <div aria-live="polite" className="space-y-2">
          {walletAuth.isAuthenticating && (
            <p className="text-center text-sm text-muted-foreground">
              Wallet connected — signing you in…
            </p>
          )}
          {walletAuth.error && !walletAuth.isAuthenticating && (
            <div className="space-y-2 text-center">
              <p role="alert" className="text-sm text-red-400">
                {walletAuth.error}
              </p>
              <button
                type="button"
                onClick={() => void walletAuth.retry()}
                className="text-sm text-aurora-violet hover:underline focus:outline-none focus:ring-2 focus:ring-foreground"
              >
                Retry signing
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-aurora-violet hover:underline focus:outline-none focus:ring-2 focus:ring-foreground">
            Register
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
