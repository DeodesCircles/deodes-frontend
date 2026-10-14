"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@/lib/validation"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { post } from "@/lib/api-client"

const forgotSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
})

type ForgotInput = z.infer<typeof forgotSchema>

export default function ForgotPasswordPage() {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema),
    mode: "onTouched",
  })

  const onSubmit = async (values: ForgotInput) => {
    setLoading(true)
    try {
      // Always reads as success (anti-enumeration): the next screen asks
      // for the code either way.
      await post("/auth/password/forgot", values)
      setSent(true)
      toast.success("If an account exists for this email, a reset code is on its way.")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Reset your password">
      <div className="space-y-6">
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Check your email for a 6-digit reset code, then enter it on the next screen.
            </p>
            <Link
              href="/reset-password"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-aurora-violet px-4 text-sm font-heading font-semibold text-white transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground"
            >
              Enter reset code
            </Link>
            <p className="text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-aurora-violet hover:underline focus:outline-none focus:ring-2 focus:ring-foreground"
              >
                Use a different email
              </button>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate aria-label="Forgot password form">
            <Input
              id="email"
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={loading}>
              Send reset code
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="text-aurora-violet hover:underline focus:outline-none focus:ring-2 focus:ring-foreground">
            Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
