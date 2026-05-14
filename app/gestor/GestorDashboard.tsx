"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import DashboardLayout from "../components/DashboardLayout"
import { gestorNavItems } from "./gestorNav"
import DatePickerPT from "../components/DatePickerPT"
import { arredondarNota } from "@/lib/notas"

type Resumo = {
  anoLectivo: string
  semestreAtual: string
  totalCursos: number
  totalDisciplinas: number
  preProjetosParaAvaliar: number
  monografiasParaAvaliar: number
  monografiasParaDefender: number
  monografiasSemNota: number
}

type Curso = {
  id_curso: number
  nome_curso: string
  duracao_anos: number | null
  turnos: string | null
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

type Aula = {
  id_aula: number
  id_disciplina: number
  turno: string
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  sala: string | null
  disciplina: { nome_disciplina: string; codigo_disciplina: string }
}

type Prova = {
  id_prova: number
  id_disciplina: number
  tipo_prova: string
  data_prova: string
  turno: string
  hora_inicio: string
  hora_fim: string
  disciplina: { nome_disciplina: string; codigo_disciplina: string }
}

const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const TURNOS_HORARIOS: Record<string, { inicio: string; fim: string }> = {
  Matinal: { inicio: "08:00", fim: "13:00" },
  Vespertino: { inicio: "13:00", fim: "18:00" },
  Noturno: { inicio: "18:00", fim: "23:00" },
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
        color: "#555e78",
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

export default function GestorDashboard() {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros para Minhas Disciplinas
  const [filtroCurso, setFiltroCurso] = useState<string>("todos")
  const [filtroAno, setFiltroAno] = useState<string>("todos")
  const [filtroTurno, setFiltroTurno] = useState<string>("todos")

  // Dropdown de alunos
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<Disciplina | null>(null)
  const [estudantes, setEstudantes] = useState<Estudante[]>([])
  const [loadingEstudantes, setLoadingEstudantes] = useState(false)

  // Edição de notas
  const [editandoNota, setEditandoNota] = useState<number | null>(null)
  const [notasEditadas, setNotasEditadas] = useState<Partial<Estudante>>({})
  const [salvando, setSalvando] = useState(false)

  // ===== LESSON CALENDAR (Horário de Aulas) =====
  const [cursos, setCursos] = useState<Curso[]>([])
  const [aulas, setAulas] = useState<Aula[]>([])
  const [loadingAulas, setLoadingAulas] = useState(false)
  const [filtroTurnoHorario, setFiltroTurnoHorario] = useState<string>("Matinal")
  const [turnosHorario, setTurnosHorario] = useState<string[]>(["Matinal"])
  const [duracaoHorario, setDuracaoHorario] = useState(90)
  const [intervaloHorario, setIntervaloHorario] = useState(10)

  // ===== EXAMS CALENDAR (Plano de Provas) =====
  const [provas, setProvas] = useState<Prova[]>([])
  const [loadingProvas, setLoadingProvas] = useState(false)
  const [filtroTurnoProvas, setFiltroTurnoProvas] = useState<string>("Matinal")
  const [turnosProvas, setTurnosProvas] = useState<string[]>(["Matinal"])

  // Available turnos from the system (extracted from cursos data)
  const turnosDisponiveis = useMemo(() => {
    const turnoSet = new Set<string>()
    cursos.forEach(c => {
      if (c.turnos) {
        c.turnos.split(",").forEach(t => turnoSet.add(t.trim()))
      }
    })
    return Array.from(turnoSet)
  }, [cursos])

  // Carregar disciplinas do gestor (com filtros de curso + turno)
  function carregarDisciplinasGestor() {
    let url = "/api/orientador/disciplinas"
    const params = new URLSearchParams()
    if (filtroCurso !== "todos") params.set("cursoId", filtroCurso)
    if (filtroTurno !== "todos") params.set("turno", filtroTurno)
    const queryString = params.toString()
    if (queryString) url += "?" + queryString

    fetch(url)
      .then(r => r.json())
      .then(data => {
        setDisciplinas(data.disciplinas || [])
      })
      .catch(() => {})
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/gestor/resumo").then(r => r.json()),
      fetch("/api/gestor/cursos").then(r => r.json()),
    ]).then(([resumoData, cursosData]) => {
      setResumo(resumoData)
      setCursos(cursosData.cursos || [])
      setLoading(false)
    }).catch(() => setLoading(false))
    carregarDisciplinasGestor()
  }, [])

  // Recarregar disciplinas quando filtros de curso ou turno mudam
  useEffect(() => {
    carregarDisciplinasGestor()
  }, [filtroCurso, filtroTurno])

  // Carregar turnos disponíveis do gestor (apenas uma vez, sem filtro de turno)
  useEffect(() => {
    fetch(`/api/orientador/horario?`)
      .then(r => r.json())
      .then(data => {
        if (data.turnos && data.turnos.length > 0) {
          setTurnosHorario(data.turnos)
          setDuracaoHorario(data.duracao || 90)
          setIntervaloHorario(data.intervalo || 10)
        }
      })
      .catch(() => {})
  }, [])

  // Carregar aulas do gestor quando muda o turno
  useEffect(() => {
    setLoadingAulas(true)
    const params = new URLSearchParams({ turno: filtroTurnoHorario })
    fetch(`/api/orientador/horario?${params}`)
      .then(r => r.json())
      .then(data => {
        setAulas(data.horarios || [])
        setLoadingAulas(false)
      })
      .catch(() => setLoadingAulas(false))
  }, [filtroTurnoHorario])

  // Carregar turnos de provas disponíveis (sem filtro de turno)
  useEffect(() => {
    fetch(`/api/orientador/plano-provas?`)
      .then(r => r.json())
      .then(data => {
        if (data.turnos && data.turnos.length > 0) {
          setTurnosProvas(data.turnos)
        }
      })
      .catch(() => {})
  }, [])

  // Carregar provas do professor quando muda o turno
  useEffect(() => {
    setLoadingProvas(true)
    const params = new URLSearchParams({ turno: filtroTurnoProvas })
    fetch(`/api/orientador/plano-provas?${params}`)
      .then(r => r.json())
      .then(data => {
        setProvas(data.provas || [])
        setLoadingProvas(false)
      })
      .catch(() => setLoadingProvas(false))
  }, [filtroTurnoProvas])

  // Atualizar turno quando horário carrega (primeiro turno disponível)
  useEffect(() => {
    if (turnosHorario.length > 0 && turnosHorario[0] !== "Matinal") {
      setFiltroTurnoHorario(turnosHorario[0])
    }
  }, [turnosHorario])

  // Anos disponíveis baseados no filtro de curso (Minhas Disciplinas)
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

  // Cursos únicos para o filtro (Minhas Disciplinas)
  const cursosUnicos = useMemo(() => {
    const map = new Map<number, string>()
    disciplinas.forEach(d => {
      d.cursos.forEach(c => {
        if (!map.has(c.id_curso)) map.set(c.id_curso, c.nome_curso)
      })
    })
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }))
  }, [disciplinas])

  // Disciplinas filtradas (Minhas Disciplinas)
  const disciplinasFiltradas = useMemo(() => {
    return disciplinas.filter(d => {
      if (filtroCurso !== "todos") {
        const cursoId = parseInt(filtroCurso)
        if (!d.cursos.some(c => c.id_curso === cursoId)) return false
      }
      if (filtroAno !== "todos") {
        const ano = parseInt(filtroAno)
        // Check the cursos array for the year (d.ano_curricular is undefined at discipline level)
        if (!d.cursos.some(c => c.ano_curricular === ano)) return false
      }
      return true
    })
  }, [disciplinas, filtroCurso, filtroAno])

  // Aulas agrupadas por horário (para timetable)
  const aulasPorHorario = useMemo(() => {
    const map = new Map<string, Map<string, Aula>>()
    const tempos = new Set<string>()
    for (const aula of aulas) {
      const tempo = `${aula.hora_inicio} - ${aula.hora_fim}`
      tempos.add(tempo)
    }
    for (const tempo of tempos) {
      map.set(tempo, new Map<string, Aula>())
    }
    for (const aula of aulas) {
      const tempo = `${aula.hora_inicio} - ${aula.hora_fim}`
      const diaMap = map.get(tempo)
      if (diaMap) {
        diaMap.set(aula.dia_semana, aula)
      }
    }
    const temposOrdenados = Array.from(tempos).sort((a, b) => a.localeCompare(b))
    return { temposOrdenados, aulasPorHorario: map }
  }, [aulas])

  // Provas agrupadas por data
  const provasPorData = useMemo(() => {
    const map = new Map<string, Prova[]>()
    for (const prova of provas) {
      const data = prova.data_prova
      if (!map.has(data)) map.set(data, [])
      map.get(data)!.push(prova)
    }
    const datasOrdenadas = Array.from(map.keys()).sort((a, b) => a.localeCompare(b))
    return { datasOrdenadas, provasPorData: map }
  }, [provas])

  function carregarEstudantes(disciplinaId: number) {
    setLoadingEstudantes(true)
    const params = new URLSearchParams()
    if (filtroCurso !== "todos") params.set("cursoId", filtroCurso)
    if (filtroTurno !== "todos") params.set("turno", filtroTurno)
    const queryString = params.toString()
    fetch(`/api/gestor/disciplinas/${disciplinaId}/estudantes${queryString ? '?' + queryString : ''}`)
      .then(r => r.json())
      .then(data => {
        setEstudantes(data.estudantes || [])
        setLoadingEstudantes(false)
      })
      .catch(() => setLoadingEstudantes(false))
  }

  function selecionarDisciplina(disc: Disciplina) {
    if (disciplinaSelecionada?.id === disc.id) {
      setDisciplinaSelecionada(null)
      setEstudantes([])
      return
    }
    setDisciplinaSelecionada(disc)
    carregarEstudantes(disc.id)
  }

  // Refresh student table when filters change while it's open
  useEffect(() => {
    if (disciplinaSelecionada) {
      carregarEstudantes(disciplinaSelecionada.id)
    }
  }, [disciplinaSelecionada, filtroCurso, filtroTurno, filtroAno])

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
      default: return "#555e78"
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

  function getCorTipoProva(tipo: string) {
    switch (tipo) {
      case "PP1": return "#22c55e"
      case "PP2": return "#3b82f6"
      case "Exame": return "#f0a500"
      case "Recurso": return "#e03d3d"
      case "Exame_Especial": return "#a855f7"
      default: return "#555e78"
    }
  }

  const stats = resumo ? [
    { label: "Cursos no Departamento", value: resumo.totalCursos, color: "#2dd4bf" },
    { label: "Disciplinas Responsáveis", value: resumo.totalDisciplinas, color: "#9b59b6", href: "/gestor/disciplinas" },
    { label: "Ano Lectivo", value: resumo.anoLectivo, color: "#22c55e" },
    { label: "Semestre Actual", value: resumo.semestreAtual === "S1" ? "📖 S1" : "📗 S2", color: resumo.semestreAtual === "S1" ? "#4fc3f7" : "#ffa726" },
    { label: "Pré-Projetos p/ Avaliar", value: resumo.preProjetosParaAvaliar, color: "#f0a500", href: "/gestor/monografias" },
    { label: "Monografias p/ Avaliar", value: resumo.monografiasParaAvaliar, color: "#e03d3d", href: "/gestor/monografias" },
    { label: "Monografias p/ Defender", value: resumo.monografiasParaDefender, color: "#3498db", href: "/gestor/monografias" },
    { label: "Defendidas sem Nota", value: resumo.monografiasSemNota, color: "#e67e22", href: "/gestor/monografias" },
  ] : []

  const estiloSelect: React.CSSProperties = {
    background: "#13161e",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    padding: "8px 12px",
    color: "#e8eaf0",
    fontSize: "13px",
    minWidth: "120px"
  }

  return (
    <DashboardLayout
      navItems={gestorNavItems}
      title="Portal do Gestor"
      subtitle="Visão geral do departamento"
    >
      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "24px"
      }}>
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{
              background: "#1e2230",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px",
              padding: "20px",
              borderTop: "2px solid #555e78"
            }}>
              <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#555e78", marginBottom: "10px" }}>A carregar...</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#555e78" }}>...</div>
            </div>
          ))
        ) : (
          stats.map((s) => (
            <CardStat key={s.label} label={s.label} value={s.value} color={s.color} href={s.href} />
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
            style={estiloSelect}
          >
            <option value="todos">Todos os Cursos</option>
            {cursosUnicos.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          <select
            value={filtroAno}
            onChange={e => setFiltroAno(e.target.value)}
            style={estiloSelect}
          >
            <option value="todos">Todos os Anos</option>
            {anosDisponiveis.map(ano => (
              <option key={ano} value={ano}>{ano}º Ano</option>
            ))}
          </select>

          <select
            value={filtroTurno}
            onChange={e => setFiltroTurno(e.target.value)}
            style={estiloSelect}
          >
            <option value="todos">Todos os Turnos</option>
            {turnosDisponiveis.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {(filtroCurso !== "todos" || filtroAno !== "todos" || filtroTurno !== "todos") && (
            <button
              onClick={() => { setFiltroCurso("todos"); setFiltroAno("todos"); setFiltroTurno("todos") }}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#9098b0",
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#555e78", padding: "30px" }}>A carregar...</div>
        ) : disciplinasFiltradas.length === 0 ? (
          <div style={{ textAlign: "center", color: "#555e78", padding: "30px" }}>
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
                    <div style={{ color: "#555e78", fontSize: "12px", marginTop: "2px" }}>
                      {d.codigo} · {d.creditos} créditos
                      {(() => {
                        // Extrair pares (ano_curricular, semestre) únicos e ordenados
                        const pares = d.cursos.map(c => ({ ano: c.ano_curricular, sem: c.semestre }))
                        const paresUnicos = pares.filter((p, i, self) =>
                          i === self.findIndex(t => t.ano === p.ano && t.sem === p.sem)
                        ).sort((a, b) => a.ano - b.ano || a.sem.localeCompare(b.sem))
                        if (paresUnicos.length > 0) {
                          return <span> · {paresUnicos.map(p => `${p.ano}º Ano ${p.sem}`).join(", ")}</span>
                        }
                        return null
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
                      color: "#555e78",
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
                      <div style={{ textAlign: "center", color: "#555e78", padding: "20px" }}>A carregar estudantes...</div>
                    ) : estudantes.length === 0 ? (
                      <div style={{ textAlign: "center", color: "#555e78", padding: "20px" }}>
                        Nenhum estudante encontrado
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                              <th style={{ textAlign: "left", padding: "8px", color: "#555e78", fontSize: "11px", textTransform: "uppercase" }}>Estudante</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#555e78", fontSize: "11px" }}>AC1</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#555e78", fontSize: "11px" }}>AC2</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#555e78", fontSize: "11px" }}>AC3</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#555e78", fontSize: "11px" }}>TTP</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#555e78", fontSize: "11px" }}>PP1</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#555e78", fontSize: "11px" }}>PP2</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#555e78", fontSize: "11px" }}>Exame</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#555e78", fontSize: "11px" }}>Rec</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#555e78", fontSize: "11px" }}>Esp</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#555e78", fontSize: "11px" }}>Final</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#555e78", fontSize: "11px" }}>Estado</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#555e78", fontSize: "11px" }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {estudantes.map(e => (
                              <tr key={e.id_nota} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <td style={{ padding: "8px" }}>
                                  <div style={{ color: "#e8eaf0", fontSize: "12px", fontWeight: "500" }}>{e.nome}</div>
                                  <div style={{ color: "#555e78", fontSize: "11px" }}>{e.numero_estudante}</div>
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
                                      : "#555e78",
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
                                          background: "#555e78",
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

      {/* ===== LESSON CALENDAR SECTION ===== */}
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
          marginBottom: "12px",
          color: "#e8eaf0"
        }}>Calendário de Aulas</div>

        {/* Only Turno filter visible */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px" }}>Turno</div>
            <select value={filtroTurnoHorario} onChange={e => setFiltroTurnoHorario(e.target.value)} style={estiloSelect}>
              {turnosHorario.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {loadingAulas ? (
          <div style={{ textAlign: "center", color: "#555e78", padding: "30px" }}>A carregar aulas...</div>
        ) : aulas.length === 0 ? (
          <div style={{ textAlign: "center", color: "#555e78", padding: "30px" }}>Nenhuma aula encontrada para este turno</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: `120px repeat(${diasSemana.length}, 1fr)`, gap: "1px", background: "#13161e", borderRadius: "10px" }}>
              {/* Header row */}
              <div style={{ padding: "12px", fontWeight: "600", color: "#2dd4bf", borderBottom: "1px solid rgba(45,212,191,0.2)", textAlign: "center" }}></div>
              {diasSemana.map(dia => (
                <div key={dia} style={{ padding: "12px", fontWeight: "600", color: "#2dd4bf", borderBottom: "1px solid rgba(45,212,191,0.2)", textAlign: "center" }}>
                  {dia}
                </div>
              ))}
              
              {/* Time slots rows */}
              {aulasPorHorario.temposOrdenados.map(tempo => (
                <div key={tempo} style={{ display: "contents" }}>
                  <div style={{ 
                    padding: "12px", 
                    fontWeight: "700", 
                    color: "#e8eaf0", 
                    borderRight: "1px solid rgba(255,255,255,0.1)", 
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {tempo}
                  </div>
                  {diasSemana.map(dia => {
                    const diaMap = aulasPorHorario.aulasPorHorario.get(tempo)
                    const aula = diaMap?.get(dia)
                    return (
                      <div key={`${tempo}-${dia}`} style={{ 
                        padding: "8px", 
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {aula ? (
                          <div style={{ background: "#1e2230", borderRadius: "6px", padding: "8px", width: "100%", textAlign: "center" }}>
                            <div style={{ color: "#e8eaf0", fontWeight: "500", fontSize: "11px" }}>{aula.disciplina.nome_disciplina}</div>
                            {aula.disciplina.codigo_disciplina && (
                              <div style={{ marginTop: "4px" }}>
                                <span style={{ 
                                  padding: "2px 6px", 
                                  borderRadius: "4px", 
                                  background: "rgba(45,212,191,0.15)", 
                                  color: "#2dd4bf", 
                                  fontSize: "9px", 
                                  fontWeight: "600"
                                }}>{aula.disciplina.codigo_disciplina}</span>
                              </div>
                            )}
                            {aula.sala && <div style={{ color: "#9098b0", marginTop: "4px", fontSize: "10px" }}>📍 {aula.sala}</div>}
                          </div>
                        ) : (
                          <div style={{ color: "#555e78", fontSize: "10px" }}>—</div>
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

      {/* ===== EXAMS CALENDAR SECTION ===== */}
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
          marginBottom: "12px",
          color: "#e8eaf0"
        }}>Calendário de Provas</div>

        {/* Only Turno filter visible */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px" }}>Turno</div>
            <select value={filtroTurnoProvas} onChange={e => setFiltroTurnoProvas(e.target.value)} style={estiloSelect}>
              {turnosProvas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {loadingProvas ? (
          <div style={{ textAlign: "center", color: "#555e78", padding: "30px" }}>A carregar provas...</div>
        ) : provas.length === 0 ? (
          <div style={{ textAlign: "center", color: "#555e78", padding: "30px" }}>Nenhuma prova encontrada para este turno</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: `160px 1fr`, gap: "1px", background: "#13161e", borderRadius: "10px" }}>
              {/* Header row */}
              <div style={{ padding: "12px", fontWeight: "600", color: "#2dd4bf", borderBottom: "1px solid rgba(45,212,191,0.2)", textAlign: "center" }}>Horário</div>
              <div style={{ padding: "12px", fontWeight: "600", color: "#2dd4bf", borderBottom: "1px solid rgba(45,212,191,0.2)", textAlign: "center" }}>Provas</div>

              {/* Rows grouped by date */}
              {provasPorData.datasOrdenadas.map(dataStr => {
                const provasDesteDia = provasPorData.provasPorData.get(dataStr) || []
                const d = new Date(dataStr + "T00:00:00")
                const diaSemana = diasSemana[d.getDay()]
                const dia = String(d.getDate()).padStart(2, "0")
                const mes = String(d.getMonth() + 1).padStart(2, "0")

                return (
                  <div key={dataStr} style={{ display: "contents" }}>
                    {/* Left column: Date */}
                    <div style={{
                      padding: "12px",
                      fontWeight: "700",
                      color: "#e8eaf0",
                      borderRight: "1px solid rgba(255,255,255,0.1)",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      fontSize: "12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px"
                    }}>
                      <div style={{ fontSize: "13px" }}>{diaSemana}</div>
                      <div style={{ color: "#2dd4bf", fontSize: "14px" }}>{dia}/{mes}</div>
                    </div>
                    {/* Right column: Exam cards */}
                    <div style={{
                      padding: "8px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px"
                    }}>
                      {provasDesteDia.map(prova => (
                        <div key={prova.id_prova} style={{
                          background: "#1e2230",
                          borderRadius: "6px",
                          padding: "10px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <div>
                            <div style={{ color: "#e8eaf0", fontWeight: "500", fontSize: "12px" }}>{prova.disciplina.nome_disciplina}</div>
                            {prova.disciplina.codigo_disciplina && (
                              <div style={{ marginTop: "3px" }}>
                                <span style={{
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: "rgba(45,212,191,0.15)",
                                  color: "#2dd4bf",
                                  fontSize: "9px",
                                  fontWeight: "600"
                                }}>{prova.disciplina.codigo_disciplina}</span>
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{
                              fontWeight: "700",
                              color: "#e8eaf0",
                              fontSize: "12px",
                              whiteSpace: "nowrap"
                            }}>
                              {prova.hora_inicio} - {prova.hora_fim}
                            </div>
                            <span style={{
                              padding: "3px 8px",
                              borderRadius: "4px",
                              background: `${getCorTipoProva(prova.tipo_prova)}18`,
                              color: getCorTipoProva(prova.tipo_prova),
                              fontSize: "11px",
                              fontWeight: "600"
                            }}>{prova.tipo_prova}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}