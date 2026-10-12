"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useRouter } from "next/navigation"

export function useRedirectIfAuthenticated() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace("/")
    }
  }, [isAuthenticated, isLoading, router])
}
