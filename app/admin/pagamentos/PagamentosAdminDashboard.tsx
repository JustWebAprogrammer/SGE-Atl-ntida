"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/app/components/DashboardLayout"
import { adminNavItems } from "@/app/admin/adminNav"

interface Pagamento {
  id_pagamento: number
  referencia: string
  mes: number
  ano: number
  valor_base: number
  valor_multa: number
  valor_total: number
  estado: string
  data_vencimento: string
  data_pagamento: string | null
  estudante: {
    nome_completo: string
    numero_estudante: string
  }
}

export default function PagamentosAdminDashboard() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("todos")

  useEffect(() => {
    fetchPagamentos()
  }, [])

  async function fetchPagamentos() {
    try {
      const res = await fetch('/api/admin/pagamentos')
      const data = await res.json()
      setPagamentos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro:', error)
      setPagamentos([])
    } finally {
      setLoading(false)
    }
  }

  const pagamentosFiltrados = filtroEstado === "todos" 
    ? pagamentos 
    : pagamentos.filter(p => p.estado === filtroEstado)

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString('pt-AO')
  }

  return (
    <DashboardLayout
      navItems={adminNavItems}
      title="Gestão de Pagamentos"
      subtitle="Ver todos os pagamentos de propinas do sistema"
    >
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Filtrar estado:</span>
        {['todos', 'Pago', 'Pendente', 'Atrasado'].map(estado => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: filtroEstado === estado ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {estado === 'todos' ? 'Todos' : estado}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          A carregar pagamentos...
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ textAlign: 'left', padding: '14px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Estudante</th>
                <th style={{ textAlign: 'left', padding: '14px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Referência</th>
                <th style={{ textAlign: 'left', padding: '14px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Mês/Ano</th>
                <th style={{ textAlign: 'left', padding: '14px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Valor</th>
                <th style={{ textAlign: 'left', padding: '14px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Vencimento</th>
                <th style={{ textAlign: 'left', padding: '14px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pagamentosFiltrados.map((pagamento) => (
                <tr key={pagamento.id_pagamento} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '14px', color: 'var(--text-primary)' }}>{pagamento.estudante.nome_completo}</td>
                  <td style={{ padding: '14px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{pagamento.referencia}</td>
                  <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>{pagamento.mes}/{pagamento.ano}</td>
                  <td style={{ padding: '14px', color: 'var(--text-primary)' }}>{Number(pagamento.valor_total).toLocaleString('pt-AO')} Kz</td>
                  <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>{formatarData(pagamento.data_vencimento)}</td>
                  <td style={{ padding: '14px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: 
                        pagamento.estado === 'Pago' ? '#22c55e20' :
                        pagamento.estado === 'Pendente' ? '#f0a50020' : 'var(--accent)20',
                      color: 
                        pagamento.estado === 'Pago' ? '#22c55e' :
                        pagamento.estado === 'Pendente' ? '#f0a500' : 'var(--accent)'
                    }}>
                      {pagamento.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  )
}