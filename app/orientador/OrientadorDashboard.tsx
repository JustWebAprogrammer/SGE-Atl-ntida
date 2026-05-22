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

type AulaHorario = {
  id_aula: number
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  sala: string | null
  nome_disciplina: string
  codigo_disciplina: string
  nome_curso: string
  ano_curricular: number
  turno: string
}

type ProvaInfo = {
  id_prova: number
  tipo_prova: string
  data_prova: string
  hora_inicio: string
  hora_fim: string
  nome_disciplina: string
  codigo_disciplina: string
  nome_curso: string
  ano_curricular: number
  turno: string
}

const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

const TIPO_PROVA_LABELS: Record<string, string> = {
  PP1: "1ª Prova Permanente",
  PP2: "2ª Prova Permanente",
  Exame: "Exame",
  Recurso: "Recurso",
  Exame_Especial: "Exame Especial",
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

const cardStyle: React.CSSProperties = {
  background: "#1e2230",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "14px",
  padding: "20px",
  marginBottom: "20px",
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

  // Plano de Aula
  const [horarios, setHorarios] = useState<AulaHorario[]>([])
  const [provas, setProvas] = useState<ProvaInfo[]>([])
  const [duracao, setDuracao] = useState(90)
  const [intervalo, setIntervalo] = useState(10)

  useEffect(() => {
    Promise.all([
      fetch("/api/orientador/resumo").then(r => r.json()),
      fetch("/api/orientador/disciplinas").then(r => r.json()),
      fetch("/api/orientador/plano-aula").then(r => r.json()),
    ]).then(([resumoData, discData, aulaData]) => {
      setResumo(resumoData)
      setDisciplinas(discData.disciplinas || [])
      setHorarios(aulaData.horarios || [])
      setProvas(aulaData.provas || [])
      setDuracao(aulaData.duracao || 90)
      setIntervalo(aulaData.intervalo || 10)
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

  // Anos disponíveis baseados nas disciplinas reais
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<number>()
    disciplinas.forEach(d => {
      if (filtroCurso === "todos") {
        d.cursos.forEach(c => anos.add(c.ano_curricular))
      } else {
        const cursoId = parseInt(filtroCurso)
        d.cursos
          .filter(c => c.id_curso === cursoId)
          .forEach(c => anos.add(c.ano_curricular))
      }
    })
    return Array.from(anos).sort((a, b) => a - b)
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
        if (!d.cursos.some(c => c.ano_curricular === ano)) return false
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

  // ── Helpers do Horário ──
  const TURNOS_HORARIOS: Record<string, { inicio: string; fim: string }> = {
    Matinal: { inicio: "08:00", fim: "13:00" },
    Vespertino: { inicio: "13:00", fim: "18:00" },
    Noturno: { inicio: "18:00", fim: "23:00" },
  }

  function calcularMaxPosicoes(duracao: number, intervalo: number) {
    // Usa o turno mais abrangente (Matinal) como base para a grelha
    const t = TURNOS_HORARIOS["Matinal"]
    const [h, m] = t.inicio.split(":").map(Number)
    const [hFim, mFim] = t.fim.split(":").map(Number)
    const totalMin = hFim * 60 + mFim - (h * 60 + m)
    const bloco = duracao + intervalo
    let posicoes = 0
    let usado = 0
    while (usado + duracao <= totalMin) {
      posicoes++
      usado += bloco
    }
    return posicoes
  }

  function calcularHorario(posicao: number, duracao: number, intervalo: number) {
    const t = TURNOS_HORARIOS["Matinal"]
    if (!t) return null
    const [h, m] = t.inicio.split(":").map(Number)
    const inicioMin = h * 60 + m
    const bloco = duracao + intervalo
    const inicioAula = inicioMin + (posicao - 1) * bloco
    const fimAula = inicioAula + duracao
    const [hFim, mFim] = t.fim.split(":").map(Number)
    if (fimAula > hFim * 60 + mFim) return null
    const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`
    return { inicio: fmt(inicioAula), fim: fmt(fimAula) }
  }

  const posicoesTurno = useMemo(() => {
    const max = calcularMaxPosicoes(duracao, intervalo)
    const result: { posicao: number; inicio: string; fim: string }[] = []
    for (let i = 1; i <= max; i++) {
      const h = calcularHorario(i, duracao, intervalo)
      if (h) result.push({ posicao: i, inicio: h.inicio, fim: h.fim })
    }
    return result
  }, [duracao, intervalo])

  // Group provas by month
  const provasMes = useMemo(() => {
    const grupos: { mes: string; items: ProvaInfo[] }[] = []
    const map = new Map<string, ProvaInfo[]>()
    for (const p of provas) {
      const [ano, mes] = p.data_prova.split("-")
      const chave = `${ano}-${mes}`
      const lista = map.get(chave) || []
      lista.push(p)
      map.set(chave, lista)
    }
    const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
    for (const [chave, items] of map) {
      const [, mes] = chave.split("-")
      grupos.push({ mes: MESES[parseInt(mes) - 1], items })
    }
    return grupos
  }, [provas])

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

      {/* ── HORÁRIO DE AULAS ── */}
      <div style={cardStyle}>
        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px", color: "#e8eaf0", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ background: "#2dd4bf", color: "#13161e", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
            HORÁRIO
          </span>
          Plano de Aula — Horário Semanal
        </div>
        <div style={{ color: "#d0d7e8", fontSize: "12px", marginBottom: "16px" }}>
          {resumo?.anoLectivo || ""} · {resumo?.semestreAtual === "S1" ? "1º Semestre" : "2º Semestre"}
        </div>

        {horarios.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#b0b8cf" }}>
            Nenhuma aula registada para as suas disciplinas.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: `120px repeat(${diasSemana.length}, 1fr)`,
              gap: "1px",
              background: "#13161e",
              borderRadius: "10px",
            }}>
              {/* Header */}
              <div style={{ padding: "12px", fontWeight: "600", color: "#2dd4bf", borderBottom: "1px solid rgba(45,212,191,0.2)", textAlign: "center" }}></div>
              {diasSemana.map(dia => (
                <div key={dia} style={{ padding: "12px", fontWeight: "600", color: "#2dd4bf", borderBottom: "1px solid rgba(45,212,191,0.2)", textAlign: "center" }}>
                  {dia}
                </div>
              ))}

              {/* Time slots */}
              {posicoesTurno.map(pos => (
                <div key={pos.posicao} style={{ display: "contents" }}>
                  <div style={{
                    padding: "12px",
                    fontWeight: "700",
                    color: "#e8eaf0",
                    borderRight: "1px solid rgba(255,255,255,0.1)",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {pos.inicio} – {pos.fim}
                  </div>
                  {diasSemana.map(dia => {
                    const aula = horarios.find(a =>
                      a.dia_semana === dia && a.hora_inicio === pos.inicio && a.hora_fim === pos.fim
                    )
                    return (
                      <div key={`${pos.posicao}-${dia}`} style={{
                        padding: "8px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        {aula ? (
                          <div style={{ background: "#1e2230", borderRadius: "6px", padding: "8px", width: "100%", textAlign: "center" }}>
                            <div style={{ color: "#e8eaf0", fontWeight: "600", fontSize: "11px" }}>{aula.nome_disciplina}</div>
                            <div style={{ color: "#d0d7e8", fontSize: "10px", marginTop: "3px" }}>{aula.nome_curso}</div>
                            {aula.sala && <div style={{ color: "#b0b8cf", marginTop: "3px", fontSize: "10px" }}>📍 {aula.sala}</div>}
                          </div>
                        ) : (
                          <div style={{ color: "#b0b8cf", fontSize: "10px" }}>—</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── PLANO DE PROVAS ── */}
      <div style={cardStyle}>
        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px", color: "#e8eaf0", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ background: "#f0a500", color: "#13161e", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
            PROVAS
          </span>
          Plano de Aula — Provas
        </div>
        <div style={{ color: "#d0d7e8", fontSize: "12px", marginBottom: "16px" }}>
          {resumo?.anoLectivo || ""} · {resumo?.semestreAtual === "S1" ? "1º Semestre" : "2º Semestre"}
        </div>

        {provas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#b0b8cf" }}>
            Nenhuma prova registada para as suas disciplinas.
          </div>
        ) : (
          provasMes.map((grupo) => (
            <div key={grupo.mes} style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#2dd4bf", marginBottom: "8px" }}>
                {grupo.mes}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                      <th style={{ textAlign: "left", padding: "10px 12px", color: "#d0d7e8", fontWeight: "600", fontSize: "12px" }}>Data</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", color: "#d0d7e8", fontWeight: "600", fontSize: "12px" }}>Horário</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", color: "#d0d7e8", fontWeight: "600", fontSize: "12px" }}>Tipo</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", color: "#d0d7e8", fontWeight: "600", fontSize: "12px" }}>Disciplina</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", color: "#d0d7e8", fontWeight: "600", fontSize: "12px" }}>Curso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.items.map((p) => (
                      <tr key={p.id_prova} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "10px 12px", color: "#e8eaf0", fontWeight: "600", whiteSpace: "nowrap" }}>
                          {new Date(p.data_prova + "T12:00:00").toLocaleDateString("pt-AO", { weekday: "short", day: "2-digit", month: "2-digit" })}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#e8eaf0", whiteSpace: "nowrap" }}>
                          {p.hora_inicio} — {p.hora_fim}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            background: p.tipo_prova === "Exame"
                              ? "rgba(155,89,182,0.1)"
                              : p.tipo_prova === "Recurso"
                                ? "rgba(224,61,61,0.1)"
                                : "rgba(45,212,191,0.1)",
                            color: p.tipo_prova === "Exame"
                              ? "#9b59b6"
                              : p.tipo_prova === "Recurso"
                                ? "#e03d3d"
                                : "#2dd4bf",
                            padding: "3px 10px",
                            borderRadius: "20px",
                            fontSize: "11px",
                            fontWeight: "600",
                          }}>
                            {TIPO_PROVA_LABELS[p.tipo_prova] || p.tipo_prova}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#e8eaf0" }}>
                          {p.nome_disciplina}
                          <span style={{ color: "#b0b8cf", marginLeft: "6px", fontSize: "11px" }}>({p.codigo_disciplina})</span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#d0d7e8" }}>
                          {p.nome_curso} · {p.ano_curricular}º · {p.turno}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
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
                      {d.codigo} · {d.creditos} créditos · {(() => {
                        const pares = d.cursos.map(c => ({ ano: c.ano_curricular, sem: c.semestre }))
                        const paresUnicos = pares.filter((p, i, self) =>
                          i === self.findIndex(t => t.ano === p.ano && t.sem === p.sem)
                        ).sort((a, b) => a.ano - b.ano || a.sem.localeCompare(b.sem))
                        return paresUnicos.length > 0
                          ? paresUnicos.map(p => `${p.ano}º Ano ${p.sem}`).join(", ")
                          : "—"
                      })()}
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