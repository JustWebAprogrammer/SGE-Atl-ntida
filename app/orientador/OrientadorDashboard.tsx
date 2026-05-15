"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import DashboardLayout from "../components/DashboardLayout"
import { arredondarNota } from "@/lib/notas"

import { orientadorNavItems as navItems } from "./orientadorNav"

type Resumo = {
  anoLectivo: string
  semestreAtual: string
  totalDisciplinas: number
  preProjetosParaAvaliar: number
  monografiasParaAvaliar: number
}

type CursoDisciplina = {
  id_curso: number
  nome_curso: string
  duracao_anos: number | null
  ano_curricular: number
  semestre: string
}

type Disciplina = {
  id: number
  nome: string
  codigo: string
  creditos: number
  ano_curricular: number
  semestre: string
  total_estudantes: number
  cursos: CursoDisciplina[]
  duracao_maxima: number
}

type Estudante = {
  id_nota: number
  id_estudante: number
  nome: string
  numero_estudante: string | null
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
  tipo_avaliacao: string
  avaliacao_atual: string
  aprovado: boolean | null
}

function CardStat({
  label,
  value,
  color,
  href
}: {
  label: string
  value: string | number
  color: string
  href?: string
}) {
  const content = (
    <div style={{
      background: "#1e2230",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "14px",
      padding: "20px",
      borderTop: `2px solid ${color}`,
      cursor: href ? "pointer" : "default",
      transition: "all 0.2s"
    }}
    onMouseEnter={e => {
      if (href) {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.transform = "translateY(-2px)"
      }
    }}
    onMouseLeave={e => {
      if (href) {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"
        e.currentTarget.style.transform = "translateY(0)"
      }
    }}
    >
      <div style={{
        fontSize: "11px",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        color: "#b0b8cf",
        marginBottom: "10px"
      }}>{label}</div>
      <div style={{
        fontSize: "22px",
        fontWeight: "700",
        color: "#e8eaf0"
      }}>{value}</div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", display: "block" }}>
        {content}
      </Link>
    )
  }
  return content
}

export default function OrientadorDashboard() {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroCurso, setFiltroCurso] = useState<string>("todos")
  const [filtroAno, setFiltroAno] = useState<string>("todos")

  // Dropdown de alunos
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<Disciplina | null>(null)
  const [estudantes, setEstudantes] = useState<Estudante[]>([])
  const [loadingEstudantes, setLoadingEstudantes] = useState(false)

  // Edição de notas
  const [editandoNota, setEditandoNota] = useState<number | null>(null)
  const [notasEditadas, setNotasEditadas] = useState<Partial<Estudante>>({})
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/orientador/resumo").then(r => r.json()),
      fetch("/api/orientador/disciplinas").then(r => r.json()),
    ]).then(([resumoData, discData]) => {
      setResumo(resumoData)
      setDisciplinas(discData.disciplinas || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Cursos únicos para o filtro
  const cursosUnicos = useMemo(() => {
    const map = new Map<number, string>()
    disciplinas.forEach(d => {
      d.cursos.forEach(c => {
        if (!map.has(c.id_curso)) map.set(c.id_curso, c.nome_curso)
      })
    })
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }))
  }, [disciplinas])

  // Anos disponíveis baseados no filtro de curso
  const anosDisponiveis = useMemo(() => {
    if (filtroCurso === "todos") {
      const maxAno = disciplinas.length > 0
        ? Math.max(...disciplinas.map(d => d.duracao_maxima))
        : 6
      return Array.from({ length: maxAno }, (_, i) => i + 1)
    }
    const cursoId = parseInt(filtroCurso)
    const cursosFiltrados = disciplinas.flatMap(d => d.cursos).filter(c => c.id_curso === cursoId)
    const duracao = cursosFiltrados.length > 0
      ? (cursosFiltrados[0].duracao_anos || 6)
      : 6
    return Array.from({ length: duracao }, (_, i) => i + 1)
  }, [filtroCurso, disciplinas])

  // Disciplinas filtradas
  const disciplinasFiltradas = useMemo(() => {
    return disciplinas.filter(d => {
      if (filtroCurso !== "todos") {
        const cursoId = parseInt(filtroCurso)
        if (!d.cursos.some(c => c.id_curso === cursoId)) return false
      }
      if (filtroAno !== "todos") {
        const ano = parseInt(filtroAno)
        if (d.ano_curricular !== ano) return false
      }
      return true
    })
  }, [disciplinas, filtroCurso, filtroAno])

  function selecionarDisciplina(disc: Disciplina) {
    if (disciplinaSelecionada?.id === disc.id) {
      setDisciplinaSelecionada(null)
      setEstudantes([])
      return
    }
    setDisciplinaSelecionada(disc)
    setLoadingEstudantes(true)
    fetch(`/api/orientador/disciplinas/${disc.id}/estudantes`)
      .then(r => r.json())
      .then(data => {
        setEstudantes(data.estudantes || [])
        setLoadingEstudantes(false)
      })
      .catch(() => setLoadingEstudantes(false))
  }

  function iniciarEdicao(estudante: Estudante) {
    setEditandoNota(estudante.id_nota)
    setNotasEditadas({
      ac1: estudante.ac1,
      ac2: estudante.ac2,
      ac3: estudante.ac3,
      ttp: estudante.ttp,
      pp1: estudante.pp1,
      pp2: estudante.pp2,
      exame: estudante.exame,
      recurso: estudante.recurso,
      exame_especial: estudante.exame_especial
    })
  }

  function cancelarEdicao() {
    setEditandoNota(null)
    setNotasEditadas({})
  }

  async function salvarNota(idEstudante: number) {
    if (!disciplinaSelecionada) return
    setSalvando(true)
    try {
      const res = await fetch("/api/notas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_estudante: idEstudante,
          id_disciplina: disciplinaSelecionada.id,
          ...notasEditadas
        })
      })
      if (res.ok) {
        const data = await res.json()
        setEstudantes(prev => prev.map(e =>
          e.id_estudante === idEstudante
            ? { ...e, ...notasEditadas, nota_final: data.nota.nota_final, dispensada: data.nota.dispensada, tipo_avaliacao: data.nota.tipo_avaliacao }
            : e
        ))
        setEditandoNota(null)
        setNotasEditadas({})
      } else {
        const error = await res.json()
        alert(error.error || "Erro ao salvar nota")
      }
    } catch {
      alert("Erro ao salvar nota")
    } finally {
      setSalvando(false)
    }
  }

  function getBadgeColor(avaliacao: string) {
    switch (avaliacao) {
      case "especial": return "#9b59b6"
      case "recurso": return "#e03d3d"
      case "exame": return "#f0a500"
      case "ac": return "#22c55e"
      default: return "#b0b8cf"
    }
  }

  function getBadgeText(avaliacao: string) {
    switch (avaliacao) {
      case "especial": return "Exame Especial"
      case "recurso": return "Recurso"
      case "exame": return "Exame"
      case "ac": return "Dispensado"
      default: return "Em Curso"
    }
  }

  const stats = resumo ? [
    { label: "Disciplinas Responsáveis", value: resumo.totalDisciplinas, color: "#2dd4bf", href: "/orientador/disciplinas" },
    { label: "Ano Lectivo", value: resumo.anoLectivo, color: "#22c55e" },
    { label: "Semestre Actual", value: resumo.semestreAtual === "S1" ? "📖 S1" : "📗 S2", color: resumo.semestreAtual === "S1" ? "#4fc3f7" : "#ffa726" },
    { label: "Pré-Projetos p/ Avaliar", value: resumo.preProjetosParaAvaliar, color: "#f0a500", href: "/orientador/monografias" },
    { label: "Monografias p/ Avaliar", value: resumo.monografiasParaAvaliar, color: "#e03d3d", href: "/orientador/monografias" },
  ] : []

  return (
    <DashboardLayout
      navItems={navItems}
      title="Portal do Orientador"
      subtitle="Visão geral"
    >
      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "24px"
      }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              background: "#1e2230",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px",
              padding: "20px",
              borderTop: "2px solid #b0b8cf"
            }}>
              <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#b0b8cf", marginBottom: "10px" }}>A carregar...</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#b0b8cf" }}>...</div>
            </div>
          ))
        ) : (
          stats.map((s) => (
            <CardStat key={s.label} label={s.label} value={s.value} color={s.color} href={s.href} />
          ))
        )}
      </div>

      {/* Links rápidos */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px",
        marginBottom: "24px"
      }}>
        <Link href="/orientador/disciplinas" style={{
          background: "#1e2230",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px",
          padding: "24px",
          textDecoration: "none",
          color: "#e8eaf0",
          transition: "all 0.2s",
          cursor: "pointer"
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "#2dd4bf"
          e.currentTarget.style.transform = "translateY(-2px)"
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"
          e.currentTarget.style.transform = "translateY(0)"
        }}
        >
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>📚</div>
          <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>Disciplinas e Notas</div>
          <div style={{ fontSize: "12px", color: "#b0b8cf" }}>Lançar e editar notas das suas disciplinas</div>
        </Link>

        <Link href="/orientador/solicitacoes" style={{
          background: "#1e2230",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px",
          padding: "24px",
          textDecoration: "none",
          color: "#e8eaf0",
          transition: "all 0.2s",
          cursor: "pointer"
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "#f0a500"
          e.currentTarget.style.transform = "translateY(-2px)"
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"
          e.currentTarget.style.transform = "translateY(0)"
        }}
        >
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>📋</div>
          <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>Solicitações</div>
          <div style={{ fontSize: "12px", color: "#b0b8cf" }}>Pedidos de orientação de estudantes</div>
        </Link>

        <Link href="/orientador/monografias" style={{
          background: "#1e2230",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px",
          padding: "24px",
          textDecoration: "none",
          color: "#e8eaf0",
          transition: "all 0.2s",
          cursor: "pointer"
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "#22c55e"
          e.currentTarget.style.transform = "translateY(-2px)"
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"
          e.currentTarget.style.transform = "translateY(0)"
        }}
        >
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>📝</div>
          <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>Monografias</div>
          <div style={{ fontSize: "12px", color: "#b0b8cf" }}>Rever e orientar monografias dos estudantes</div>
        </Link>
      </div>

      {/* Secção de Disciplinas com Filtros */}
      <div style={{
        background: "#1e2230",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        padding: "20px",
        marginBottom: "20px"
      }}>
        <div style={{
          fontSize: "14px",
          fontWeight: "600",
          marginBottom: "16px",
          color: "#e8eaf0"
        }}>Minhas Disciplinas</div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <select
            value={filtroCurso}
            onChange={e => { setFiltroCurso(e.target.value); setFiltroAno("todos") }}
            style={{
              background: "#13161e",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "#e8eaf0",
              fontSize: "13px",
              minWidth: "180px"
            }}
          >
            <option value="todos">Todos os Cursos</option>
            {cursosUnicos.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          <select
            value={filtroAno}
            onChange={e => setFiltroAno(e.target.value)}
            style={{
              background: "#13161e",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "#e8eaf0",
              fontSize: "13px",
              minWidth: "140px"
            }}
          >
            <option value="todos">Todos os Anos</option>
            {anosDisponiveis.map(ano => (
              <option key={ano} value={ano}>{ano}º Ano</option>
            ))}
          </select>

          {(filtroCurso !== "todos" || filtroAno !== "todos") && (
            <button
              onClick={() => { setFiltroCurso("todos"); setFiltroAno("todos") }}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#d0d7e8",
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#b0b8cf", padding: "30px" }}>A carregar...</div>
        ) : disciplinasFiltradas.length === 0 ? (
          <div style={{ textAlign: "center", color: "#b0b8cf", padding: "30px" }}>
            Nenhuma disciplina encontrada para os filtros selecionados
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {disciplinasFiltradas.map(d => (
              <div key={d.id}>
                <div
                  onClick={() => selecionarDisciplina(d)}
                  style={{
                    background: disciplinaSelecionada?.id === d.id ? "rgba(45,212,191,0.1)" : "#13161e",
                    borderRadius: "10px",
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    border: disciplinaSelecionada?.id === d.id ? "1px solid #2dd4bf" : "1px solid transparent",
                    transition: "all 0.2s"
                  }}
                >
                  <div>
                    <div style={{ color: "#e8eaf0", fontSize: "14px", fontWeight: "500" }}>{d.nome}</div>
                    <div style={{ color: "#b0b8cf", fontSize: "12px", marginTop: "2px" }}>
                      {d.codigo} · {d.creditos} créditos · {d.ano_curricular}º Ano · {d.semestre}
                      {d.cursos.length > 0 && (
                        <span> · {d.cursos.map(c => c.nome_curso).join(", ")}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#2dd4bf" }}>
                      {d.total_estudantes} estudantes
                    </div>
                    <div style={{
                      color: "#b0b8cf",
                      fontSize: "12px",
                      transition: "transform 0.2s",
                      transform: disciplinaSelecionada?.id === d.id ? "rotate(180deg)" : "rotate(0deg)"
                    }}>▼</div>
                  </div>
                </div>

                {/* Dropdown de estudantes */}
                {disciplinaSelecionada?.id === d.id && (
                  <div style={{
                    background: "#1e2230",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "10px",
                    padding: "16px",
                    marginTop: "8px",
                    marginLeft: "8px",
                    marginRight: "8px"
                  }}>
                    {loadingEstudantes ? (
                      <div style={{ textAlign: "center", color: "#b0b8cf", padding: "20px" }}>A carregar estudantes...</div>
                    ) : estudantes.length === 0 ? (
                      <div style={{ textAlign: "center", color: "#b0b8cf", padding: "20px" }}>
                        Nenhum estudante encontrado
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                              <th style={{ textAlign: "left", padding: "8px", color: "#b0b8cf", fontSize: "11px", textTransform: "uppercase" }}>Estudante</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "11px" }}>AC1</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "11px" }}>AC2</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "11px" }}>AC3</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "11px" }}>TTP</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "11px" }}>PP1</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "11px" }}>PP2</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "11px" }}>Exame</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "11px" }}>Rec</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "11px" }}>Esp</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "11px" }}>Final</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "11px" }}>Estado</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "11px" }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {estudantes.map(e => (
                              <tr key={e.id_nota} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <td style={{ padding: "8px" }}>
                                  <div style={{ color: "#e8eaf0", fontSize: "12px", fontWeight: "500" }}>{e.nome}</div>
                                  <div style={{ color: "#b0b8cf", fontSize: "11px" }}>{e.numero_estudante}</div>
                                </td>
                                {["ac1", "ac2", "ac3", "ttp", "pp1", "pp2", "exame", "recurso", "exame_especial"].map((campo) => (
                                  <td key={campo} style={{ textAlign: "center", padding: "8px" }}>
                                    {editandoNota === e.id_nota ? (
                                      <input
                                        type="number"
                                        min={0}
                                        max={campo === "recurso" || campo === "exame_especial" ? 12 : 20}
                                        step={0.01}
                                        value={(notasEditadas[campo as keyof Estudante] as string | number | undefined) ?? ""}
                                        onChange={(ev) => setNotasEditadas(prev => ({
                                          ...prev,
                                          [campo]: ev.target.value === "" ? null : parseFloat(ev.target.value)
                                        }))}
                                        style={{
                                          width: "45px",
                                          padding: "3px",
                                          borderRadius: "4px",
                                          border: "1px solid rgba(255,255,255,0.2)",
                                          background: "#13161e",
                                          color: "#e8eaf0",
                                          fontSize: "11px",
                                          textAlign: "center"
                                        }}
                                      />
                                    ) : (
                                      <span style={{ color: "#e8eaf0", fontSize: "11px" }}>
                                        {e[campo as keyof Estudante] != null ? arredondarNota(Number(e[campo as keyof Estudante])) : "—"}
                                      </span>
                                    )}
                                  </td>
                                ))}
                                <td style={{ textAlign: "center", padding: "8px" }}>
                                  <span style={{
                                    fontWeight: "700",
                                    color: e.nota_final != null
                                      ? (e.nota_final >= 10 ? "#22c55e" : "#e03d3d")
                                      : "#b0b8cf",
                                    fontSize: "12px"
                                  }}>
                                    {e.nota_final != null ? arredondarNota(e.nota_final) : "—"}
                                  </span>
                                </td>
                                <td style={{ textAlign: "center", padding: "8px" }}>
                                  <span style={{
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "9px",
                                    fontWeight: "600",
                                    background: `${getBadgeColor(e.avaliacao_atual)}20`,
                                    color: getBadgeColor(e.avaliacao_atual)
                                  }}>
                                    {getBadgeText(e.avaliacao_atual)}
                                  </span>
                                </td>
                                <td style={{ textAlign: "center", padding: "8px" }}>
                                  {editandoNota === e.id_nota ? (
                                    <div style={{ display: "flex", gap: "3px", justifyContent: "center" }}>
                                      <button
                                        onClick={() => salvarNota(e.id_estudante)}
                                        disabled={salvando}
                                        style={{
                                          padding: "3px 6px",
                                          background: "#22c55e",
                                          color: "white",
                                          border: "none",
                                          borderRadius: "4px",
                                          fontSize: "10px",
                                          cursor: "pointer"
                                        }}
                                      >
                                        {salvando ? "..." : "✓"}
                                      </button>
                                      <button
                                        onClick={cancelarEdicao}
                                        style={{
                                          padding: "3px 6px",
                                          background: "#b0b8cf",
                                          color: "white",
                                          border: "none",
                                          borderRadius: "4px",
                                          fontSize: "10px",
                                          cursor: "pointer"
                                        }}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => iniciarEdicao(e)}
                                      style={{
                                        padding: "3px 8px",
                                        background: "#2dd4bf",
                                        color: "#13161e",
                                        border: "none",
                                        borderRadius: "4px",
                                        fontSize: "10px",
                                        fontWeight: "600",
                                        cursor: "pointer"
                                      }}
                                    >
                                      Editar
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
