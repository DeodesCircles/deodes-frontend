"use client"

import { useEffect } from "react"
import { verifyPasskeyRevocation } from "@/stores/auth-flow-store"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    verifyPasskeyRevocation()
  }, [])

  return <>{children}</>
}
