"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/app/components/DashboardLayout"
import { recepcionistaNavItems } from "../recepcionistaNav"

interface Certificado {
  id_certificado: number
  id_estudante: number
  data_emissao: string
  tipo_certificado: string
  status?: string
  descricao?: string
  estudante: {
    nome_completo: string
    numero_estudante: string | null
    curso: {
      nome_curso: string
    }
  }
}

const STATUS_FLOW = [
  { value: "Solicitado", label: "Solicitado", color: "rgba(240,165,0,0.12)", textColor: "#f0a500" },
  { value: "EmPreparacao", label: "Em Preparação", color: "rgba(59,130,246,0.12)", textColor: "#3b82f6" },
  { value: "ProntoParaLevantamento", label: "Pronto para Levantamento", color: "rgba(168,85,247,0.12)", textColor: "#a855f7" },
  { value: "Entregue", label: "Entregue", color: "rgba(34,197,94,0.12)", textColor: "#22c55e" },
]

const TIPO_LABELS: Record<string, string> = {
  "Conclusao": "Certificado de Conclusão (Physical)",
  "Disciplina": "Certificado de Disciplinas (Digital)",
  "Declaracao": "Declaração Académica (Digital)"
}

export default function CertificadosRecepcionista() {
  const [certificados, setCertificados] = useState<Certificado[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState("todos")
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error">("success")

  useEffect(() => {
    loadCertificados()
  }, [])

  async function loadCertificados() {
    try {
      const res = await fetch("/api/recepcionista/certificados")
      const data = await res.json()
      
      if (res.ok) {
        setCertificados(data)
      } else {
        showMessage("Erro ao carregar certificados", "error")
      }
    } catch (error) {
      showMessage("Erro de ligação", "error")
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: number, newStatus: string) {
    try {
      const res = await fetch(`/api/recepcionista/certificados/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        showMessage("Status atualizado com sucesso!", "success")
        loadCertificados()
      } else {
        const data = await res.json()
        showMessage(data.error || "Erro ao atualizar status", "error")
      }
    } catch (error) {
      showMessage("Erro de ligação", "error")
    }
  }

  function getNextStatus(currentStatus: string): string | null {
    const currentIndex = STATUS_FLOW.findIndex(s => s.value === currentStatus)
    if (currentIndex === -1 || currentIndex === STATUS_FLOW.length - 1) {
      return null
    }
    return STATUS_FLOW[currentIndex + 1].value
  }

  function showMessage(msg: string, type: "success" | "error") {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(""), 5000)
  }

  function isDigital(tipo: string): boolean {
    return tipo === "Disciplina" || tipo === "Declaracao"
  }

  const filteredCertificados = certificados.filter(c => {
    if (filtroStatus !== "todos" && c.status !== filtroStatus) return false
    if (filtroTipo !== "todos" && c.tipo_certificado !== filtroTipo) return false
    return true
  })

  return (
    <DashboardLayout
      navItems={recepcionistaNavItems}
      title="Certificados"
      subtitle="Gerir pedidos de certificados e documentos digitais"
    >
      {/* Message alert */}
      {message && (
        <div
          className={`p-4 rounded-lg mb-6 ${
            messageType === "success" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
          }`}
        >
          {message}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
        >
          <option value="todos">Todos os status</option>
          {STATUS_FLOW.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
        >
          <option value="todos">Todos os tipos</option>
          <option value="Conclusao">Certificado de Conclusão (Physical)</option>
          <option value="Disciplina">Certificado de Disciplinas (Digital)</option>
          <option value="Declaracao">Declaração Académica (Digital)</option>
        </select>
      </div>

      {/* Info box */}
      <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 mb-6 text-blue-300">
        <p className="text-sm">
          <strong>Physical:</strong> Certificado de Conclusão - Requer preparação manual (status workflow).{" "}
          <strong>Digital:</strong> Certificado de Disciplinas e Declaração Académica - Gerado automaticamente pelo estudante (apenas visualização).
        </p>
      </div>

      {/* Certificados list */}
      {loading ? (
        <div className="text-center py-8">A carregar...</div>
      ) : filteredCertificados.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
          Nenhum certificado encontrado
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-750 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-700">
            <div className="col-span-3">Estudante</div>
            <div className="col-span-2">Curso</div>
            <div className="col-span-2">Tipo</div>
            <div className="col-span-2">Data</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1">Ação</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-700">
            {filteredCertificados.map((certificado) => {
              const nextStatus = getNextStatus(certificado.status || "")
              const statusConfig = STATUS_FLOW.find(s => s.value === certificado.status) || STATUS_FLOW[0]
              const digital = isDigital(certificado.tipo_certificado)

              return (
                <div
                  key={certificado.id_certificado}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-750/50"
                >
                  <div className="col-span-3">
                    <div className="font-medium text-white">
                      {certificado.estudante.nome_completo}
                    </div>
                    {certificado.estudante.numero_estudante && (
                      <div className="text-sm text-gray-400">
                        Nº {certificado.estudante.numero_estudante}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 text-gray-300">
                    {certificado.estudante.curso.nome_curso}
                  </div>
                  <div className="col-span-2 text-gray-300">
                    <span className={`px-2 py-1 rounded text-xs ${digital ? "bg-blue-500/20 text-blue-300" : "bg-gray-500/20 text-gray-300"}`}>
                      {TIPO_LABELS[certificado.tipo_certificado] || certificado.tipo_certificado}
                    </span>
                  </div>
                  <div className="col-span-2 text-gray-400 text-sm">
                    {new Date(certificado.data_emissao).toLocaleDateString("pt-PT")}
                  </div>
                  <div className="col-span-2">
                    {digital ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                        Digital
                      </span>
                    ) : (
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: statusConfig.color,
                          color: statusConfig.textColor
                        }}
                      >
                        {statusConfig.label}
                      </span>
                    )}
                  </div>
                  <div className="col-span-1">
                    {digital ? (
                      <a
                        href={`/recepcionista/certificados/${certificado.id_certificado}/pdf`}
                        target="_blank"
                        className="text-blue-400 hover:text-blue-300 text-sm"
                        title="Ver PDF"
                      >
                        📄
                      </a>
                    ) : nextStatus ? (
                      <button
                        onClick={() => {
                          if (confirm(`Marcar como "${STATUS_FLOW.find(s => s.value === nextStatus)?.label}"?`)) {
                            updateStatus(certificado.id_certificado, nextStatus)
                          }
                        }}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                        title="Avançar status"
                      >
                        →
                      </button>
                    ) : (
                      <span className="text-gray-500 text-xs">-</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-gray-750 text-xs text-gray-400 border-t border-gray-700">
            {filteredCertificados.length} certificado{filteredCertificados.length !== 1 ? "s" : ""}
            {filtroStatus !== "todos" && ` (filtrado por status)`}
            {filtroTipo !== "todos" && ` (filtrado por tipo)`}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}