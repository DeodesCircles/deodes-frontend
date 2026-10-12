"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/auth-store"

export function AuthRedirect() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace("/")
    }
  }, [isAuthenticated, isLoading, router])

  return null
}
