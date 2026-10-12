"use client"

import { MemoizedDashboardLayout } from "@/components/layout/dashboard-layout"
import { useRequireAuth } from "@/hooks/use-auth"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated } = useRequireAuth()

  if (!isAuthenticated) return null

  return <MemoizedDashboardLayout>{children}</MemoizedDashboardLayout>
}
