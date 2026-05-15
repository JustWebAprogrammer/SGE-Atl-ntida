"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import DashboardLayout from "@/app/components/DashboardLayout"
import { adminNavItems } from "@/app/admin/adminNav"
import FinalistasDashboard from "./FinalistasDashboard"

export default function FinalistasPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (status === "loading") return
    if (!session || session.user.role !== "admin") {
      router.push("/login")
    }
  }, [session, status, router])

  if (!isClient || status === "loading") {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0d0f14',
        color: '#d0d7e8'
      }}>
        A carregar...
      </div>
    )
  }

  if (!session || session.user.role !== "admin") {
    return null
  }

  return (
    <DashboardLayout
      navItems={adminNavItems}
      title="Recordes de Finalistas"
      subtitle="Visualização dos snapshots de estudantes finalizados"
    >
      <FinalistasDashboard />
    </DashboardLayout>
  )
}