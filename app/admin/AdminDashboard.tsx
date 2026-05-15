"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "../components/DashboardLayout"
import { adminNavItems } from "./adminNav"

interface DashboardStats {
  totalEstudantes: number
  totalMonografiasAtivas: number
  pagamentosPendentes: number
  totalArrecadadoMes: number
  totalOrientadores: number
  semestreAtual: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEstudantes: 0,
    totalMonografiasAtivas: 0,
    pagamentosPendentes: 0,
    totalArrecadadoMes: 0,
    totalOrientadores: 0,
    semestreAtual: "S1"
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout
      navItems={adminNavItems}
      title="Painel Admin"
      subtitle="Gestão geral do sistema"
    >
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px",
        marginBottom: "24px"
      }}>
        {[
          { label: "Total Estudantes", value: stats.totalEstudantes.toString(), color: "#e03d3d" },
          { label: "Monografias Activas", value: stats.totalMonografiasAtivas.toString(), color: "#f0a500" },
          { label: "Pagamentos Pendentes", value: stats.pagamentosPendentes.toString(), color: "#2dd4bf" },
          { label: "Arrecadado Mês", value: stats.totalArrecadadoMes.toLocaleString('pt-AO') + " Kz", color: "#22c55e" },
          { label: "Orientadores", value: stats.totalOrientadores.toString(), color: "#9b59b6" },
          { 
            label: "Semestre Actual", 
            value: stats.semestreAtual === "S1" ? "📖 S1" : "📗 S2", 
            color: stats.semestreAtual === "S1" ? "#4fc3f7" : "#ffa726" 
          },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: "#1e2230",
            border: "1px solid rgba(255,255,0.07)",
            borderRadius: "14px",
            padding: "20px",
            borderTop: `2px solid ${stat.color}`
          }}>
            <div style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "#b0b8cf",
              marginBottom: "10px"
            }}>{stat.label}</div>
            <div style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#e8eaf0"
            }}>{stat.value}</div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}