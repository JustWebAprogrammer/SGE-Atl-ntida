"use client"

import { useState, useEffect, useCallback } from "react"
import DashboardLayout from "../../../components/DashboardLayout"
import { adminNavItems } from "../../adminNav"

type NotaSnapshot = {
  id_nota: number
  id_disciplina: number
  codigo_disciplina: string
  nome_disciplina: string
  ano_curricular: number
  semestre: string
  ac1: number | null
  ac2: number | null
  ac3: number | null
  ttp: number | null
  pp1: number | null
  pp2: number | null
  exame: number | null
  recurso: number | null
  exame_especial: number | null
  nota_final: number | null
  dispensada: boolean
  tem_dispensa: boolean
  nota_dispensa: number
}

type Registo = {
  id_snapshot: number
  id_estudante: number
  ano_lectivo: string
  semestre: string
  data_snapshot: string
  notas_snapshot: NotaSnapshot[] | null
  estudante: {
    id_estudante: number
    nome_completo: string
    numero_estudante: string | null
    ano_current: number | null
    turno: string
    curso: { id_curso: number; nome_curso: string }
  }
  usuario: { nome_usuario: string } | null
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

type Filtros = {
  anosLectivos: string[]
  cursos: { id_curso: number; nome_curso: string }[]
}

const TURNOS = ["", "Matinal", "Vespertino", "Noturno"]

function formatValor(v: number | null): string {
  if (v === null) return "—"
  return v.toFixed(2)
}

export default function RegistosDashboard() {
  const [registos, setRegistos] = useState<Registo[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [filtros, setFiltros] = useState<Filtros>({ anosLectivos: [], cursos: [] })
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [cursoId, setCursoId] = useState("")
  const [turno, setTurno] = useState("")
  const [anoLectivoFilter, setAnoLectivoFilter] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const carregar = useCallback((page = 1) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (cursoId) params.set("cursoId", cursoId)
    if (turno) params.set("turno", turno)
    if (anoLectivoFilter) params.set("anoLectivo", anoLectivoFilter)
    params.set("page", String(page))
    params.set("limit", "20")

    fetch(`/api/admin/sistema/registos?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRegistos(data.registos || [])
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
        setFiltros(data.filtros || { anosLectivos: [], cursos: [] })
      })
      .finally(() => setLoading(false))
  }, [search, cursoId, turno, anoLectivoFilter])

  useEffect(() => {
    carregar(1)
  }, [carregar])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    carregar(1)
  }

  return (
    <DashboardLayout navItems={adminNavItems} title="Registos Lectivo" subtitle="Histórico de snapshots de rematrícula">
      {/* Filters */}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Pesquisar</label>
          <input
            type="text"
            placeholder="Nome ou nº estudante"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "8px 12px", background: "#0d0f14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "white", fontSize: "13px", minWidth: "200px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Curso</label>
          <select value={cursoId} onChange={(e) => setCursoId(e.target.value)} style={{ padding: "8px 12px", background: "#0d0f14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "white", fontSize: "13px" }}>
            <option value="">Todos</option>
            {filtros.cursos.map((c) => (
              <option key={c.id_curso} value={c.id_curso}>{c.nome_curso}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Turno</label>
          <select value={turno} onChange={(e) => setTurno(e.target.value)} style={{ padding: "8px 12px", background: "#0d0f14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "white", fontSize: "13px" }}>
            {TURNOS.map((t) => (
              <option key={t} value={t}>{t || "Todos"}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Ano Lectivo</label>
          <select value={anoLectivoFilter} onChange={(e) => setAnoLectivoFilter(e.target.value)} style={{ padding: "8px 12px", background: "#0d0f14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "white", fontSize: "13px" }}>
            <option value="">Todos</option>
            {filtros.anosLectivos.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <button type="submit" style={{ padding: "8px 20px", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
          Filtrar
        </button>
      </form>

      {loading ? (
        <div style={{ textAlign: "center", color: "#b0b8cf", padding: "60px" }}>A carregar registos...</div>
      ) : registos.length === 0 ? (
        <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "60px", textAlign: "center", color: "#b0b8cf" }}>
          Nenhum registo de rematrícula encontrado.
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div style={{ marginBottom: "16px", fontSize: "13px", color: "#d0d7e8" }}>
            {pagination.total} registo(s) encontrado(s)
            {pagination.totalPages > 1 && ` — Página ${pagination.page} de ${pagination.totalPages}`}
          </div>

          {registos.map((r) => {
            const isExpanded = expandedId === r.id_snapshot
            return (
              <div key={r.id_snapshot} style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", marginBottom: "12px", overflow: "hidden" }}>
                {/* Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : r.id_snapshot)}
                  style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "#e8eaf0" }}>
                      {r.estudante.nome_completo}
                      <span style={{ fontSize: "12px", color: "#b0b8cf", marginLeft: "8px" }}>
                        {r.estudante.numero_estudante}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#d0d7e8", marginTop: "4px" }}>
                      {r.estudante.curso.nome_curso} · {r.estudante.turno} · Snapshot de {r.ano_lectivo}
                    </div>
                    <div style={{ fontSize: "11px", color: "#b0b8cf", marginTop: "2px" }}>
                      {new Date(r.data_snapshot).toLocaleDateString("pt-AO")}
                      {r.usuario && ` · por ${r.usuario.nome_usuario}`}
                    </div>
                  </div>
                  <div style={{ color: isExpanded ? "#3b82f6" : "#b0b8cf", fontSize: "20px", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "none" }}>
                    ▼
                  </div>
                </div>

                {/* Expanded grade table */}
                {isExpanded && r.notas_snapshot && (
                  <div style={{ padding: "0 20px 20px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginTop: "12px" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            <th style={{ textAlign: "left", padding: "8px 6px", color: "#b0b8cf" }}>Disciplina</th>
                            <th style={{ textAlign: "center", padding: "8px 6px", color: "#b0b8cf" }}>Sem</th>
                            <th style={{ textAlign: "center", padding: "8px 6px", color: "#b0b8cf" }}>Ano</th>
                            <th style={{ textAlign: "center", padding: "8px 6px", color: "#b0b8cf" }}>AC1</th>
                            <th style={{ textAlign: "center", padding: "8px 6px", color: "#b0b8cf" }}>AC2</th>
                            <th style={{ textAlign: "center", padding: "8px 6px", color: "#b0b8cf" }}>AC3</th>
                            <th style={{ textAlign: "center", padding: "8px 6px", color: "#b0b8cf" }}>TTP</th>
                            <th style={{ textAlign: "center", padding: "8px 6px", color: "#b0b8cf" }}>PP1</th>
                            <th style={{ textAlign: "center", padding: "8px 6px", color: "#b0b8cf" }}>PP2</th>
                            <th style={{ textAlign: "center", padding: "8px 6px", color: "#b0b8cf" }}>Exame</th>
                            <th style={{ textAlign: "center", padding: "8px 6px", color: "#b0b8cf" }}>Rec</th>
                            <th style={{ textAlign: "center", padding: "8px 6px", color: "#b0b8cf" }}>Ex.Esp</th>
                            <th style={{ textAlign: "center", padding: "8px 6px", color: "#b0b8cf" }}>Final</th>
                            <th style={{ textAlign: "center", padding: "8px 6px", color: "#b0b8cf" }}>Disp</th>
                            <th style={{ textAlign: "center", padding: "8px 6px", color: "#b0b8cf" }}>Limiar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.notas_snapshot.map((n: NotaSnapshot) => {
                            const failed = n.nota_final !== null && n.nota_final < 10 && !n.dispensada
                            return (
                              <tr key={n.codigo_disciplina} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: failed ? "rgba(224,61,61,0.06)" : "transparent" }}>
                                <td style={{ padding: "6px", color: "#e8eaf0", fontWeight: "500", whiteSpace: "nowrap" }}>
                                  {n.nome_disciplina}
                                  {n.dispensada && <span style={{ color: "#22c55e", marginLeft: "4px" }}>✓</span>}
                                  {failed && <span style={{ color: "#e03d3d", marginLeft: "4px" }}>✗</span>}
                                </td>
                                <td style={{ textAlign: "center", padding: "6px", color: "#d0d7e8" }}>{n.semestre}</td>
                                <td style={{ textAlign: "center", padding: "6px", color: "#d0d7e8" }}>{n.ano_curricular}º</td>
                                <td style={{ textAlign: "center", padding: "6px", color: "#d0d7e8" }}>{formatValor(n.ac1)}</td>
                                <td style={{ textAlign: "center", padding: "6px", color: "#d0d7e8" }}>{formatValor(n.ac2)}</td>
                                <td style={{ textAlign: "center", padding: "6px", color: "#d0d7e8" }}>{formatValor(n.ac3)}</td>
                                <td style={{ textAlign: "center", padding: "6px", color: "#d0d7e8" }}>{formatValor(n.ttp)}</td>
                                <td style={{ textAlign: "center", padding: "6px", color: "#d0d7e8" }}>{formatValor(n.pp1)}</td>
                                <td style={{ textAlign: "center", padding: "6px", color: "#d0d7e8" }}>{formatValor(n.pp2)}</td>
                                <td style={{ textAlign: "center", padding: "6px", color: "#d0d7e8" }}>{formatValor(n.exame)}</td>
                                <td style={{ textAlign: "center", padding: "6px", color: "#d0d7e8" }}>{formatValor(n.recurso)}</td>
                                <td style={{ textAlign: "center", padding: "6px", color: "#d0d7e8" }}>{formatValor(n.exame_especial)}</td>
                                <td style={{ textAlign: "center", padding: "6px", fontWeight: "700", color: n.nota_final !== null && n.nota_final >= 10 ? "#22c55e" : "#e03d3d" }}>
                                  {formatValor(n.nota_final)}
                                </td>
                                <td style={{ textAlign: "center", padding: "6px", color: n.dispensada ? "#22c55e" : "#b0b8cf" }}>
                                  {n.dispensada ? "Sim" : "Não"}
                                </td>
                                <td style={{ textAlign: "center", padding: "6px", color: "#b0b8cf" }}>
                                  {n.tem_dispensa ? `≥${n.nota_dispensa}` : "—"}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "20px" }}>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => carregar(pg)}
                  style={{
                    padding: "8px 14px",
                    background: pg === pagination.page ? "#3b82f6" : "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    color: pg === pagination.page ? "white" : "#d0d7e8",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  {pg}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}