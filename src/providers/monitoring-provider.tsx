"use client"

import { useEffect } from "react"
import { initMonitoring } from "@/lib/monitoring"

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initMonitoring()
  }, [])

  return <>{children}</>
}
