"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@/lib/validation"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OTPInput } from "@/components/ui/otp-input"
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter"
import { useToast } from "@/hooks/use-toast"
import { post } from "@/lib/api-client"

const resetSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  code: z.string().length(6, "Enter the 6-digit code"),
  newPassword: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be 128 characters or fewer")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
})

type ResetInput = z.infer<typeof resetSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState(searchParams.get("code") ?? "")

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    mode: "onTouched",
    defaultValues: {
      email: searchParams.get("email") ?? "",
      code: searchParams.get("code") ?? "",
      newPassword: "",
    },
  })
  const newPasswordValue = watch("newPassword") || ""

  const onSubmit = async (values: ResetInput) => {
    setLoading(true)
    try {
      await post("/auth/password/reset", values)
      toast.success("Password reset. Please sign in with your new password.")
      router.replace("/login")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reset failed"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Choose a new password">
      <div className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate aria-label="Reset password form">
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
            <OTPInput
              id="code"
              label="Reset code"
              value={code}
              error={errors.code?.message}
              onChange={(v) => {
                setCode(v)
                setValue("code", v, { shouldValidate: true })
              }}
            />
          </div>
          <div>
            <Input
              id="newPassword"
              type="password"
              label="New Password"
              placeholder="••••••••"
              autoComplete="new-password"
              error={errors.newPassword?.message}
              {...register("newPassword")}
            />
            <PasswordStrengthMeter password={newPasswordValue} />
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={loading}>
            Reset password
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/forgot-password" className="text-aurora-violet hover:underline focus:outline-none focus:ring-2 focus:ring-foreground">
            Resend code
          </Link>{" "}
          ·{" "}
          <Link href="/login" className="text-aurora-violet hover:underline focus:outline-none focus:ring-2 focus:ring-foreground">
            Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
