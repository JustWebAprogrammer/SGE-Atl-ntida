"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { gestorNavItems } from "../gestorNav"
import { arredondarNota } from "@/lib/notas"

type CursoInfo = {
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
  id_departamento: number
  departamento: string
  total_estudantes: number
  duracao_maxima: number
  cursos: CursoInfo[]
}

type Estudante = {
  id_nota: number
  id_estudante: number
  nome: string
  numero_estudante: string | null
  turno: string
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

type ProfessorDisciplina = {
  id: number
  id_usuario: number
  id_disciplina: number
  ano_lectivo: string
  usuario: {
    id_usuario: number
    nome_usuario: string
    email: string
  }
}

type Orientador = {
  id_orientador: number
  nome_completo: string
  usuario: {
    id_usuario: number
    nome_usuario: string
    email: string
  }
}

export default function DisciplinasDashboard() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<Disciplina | null>(null)
  const [orientador, setOrientador] = useState<string | null>(null)
  const [estudantes, setEstudantes] = useState<Estudante[]>([])
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(true)
  const [loadingEstudantes, setLoadingEstudantes] = useState(false)
  const [editandoNota, setEditandoNota] = useState<number | null>(null)
  const [notasEditadas, setNotasEditadas] = useState<Partial<Estudante>>({})
  const [salvando, setSalvando] = useState(false)

  // Gestão de Professores
  const [modalProfessoresAberto, setModalProfessoresAberto] = useState(false)
  const [professoresDisciplina, setProfessoresDisciplina] = useState<ProfessorDisciplina[]>([])
  const [listaOrientadores, setListaOrientadores] = useState<Orientador[]>([])
  const [professorSelecionado, setProfessorSelecionado] = useState<number | null>(null)
  const [carregandoProfessores, setCarregandoProfessores] = useState(false)

  // Department of the logged in gestor
  const [idDepartamentoGestor, setIdDepartamentoGestor] = useState<number | null>(null)

  // Filtros
  const [filtroAno, setFiltroAno] = useState<number | null>(null)
  const [filtroSemestre, setFiltroSemestre] = useState<string | null>(null)
  const [filtroTexto, setFiltroTexto] = useState("")
  const [filtroCursoId, setFiltroCursoId] = useState<number | null>(null)
  const [filtroTurno, setFiltroTurno] = useState<string | null>(null)
  const [filtroProfessorId, setFiltroProfessorId] = useState<number | null>(null)

  const [anoLectivo, setAnoLectivo] = useState("")

  // Turnos disponíveis para o filtro (vem dos cursos do departamento)
  const [turnosDisponiveisFiltro, setTurnosDisponiveisFiltro] = useState<string[]>([])

  // Carregar orientadores do departamento para o filtro de professor
  useEffect(() => {
    fetch("/api/gestor/orientadores/lista")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setListaOrientadores(data)
      })
      .catch(() => {})
  }, [])

  // Função para carregar disciplinas com filtros
  function carregarDisciplinas() {
    setLoadingDisciplinas(true)
    let url = "/api/gestor/disciplinas"
    const params = new URLSearchParams()
    if (filtroCursoId) params.set("cursoId", String(filtroCursoId))
    if (filtroTurno) params.set("turno", filtroTurno)
    if (filtroProfessorId) params.set("professorId", String(filtroProfessorId))
    const queryString = params.toString()
    if (queryString) url += "?" + queryString

    fetch(url)
      .then(r => r.json())
      .then(data => {
        setDisciplinas(data.disciplinas)
        setAnoLectivo(data.ano_lectivo || "")
        setIdDepartamentoGestor(data.id_departamento_gestor)
        // Turnos padrão do sistema
        setTurnosDisponiveisFiltro(["Matinal", "Vespertino", "Noturno"])
        setLoadingDisciplinas(false)
      })
      .catch(() => setLoadingDisciplinas(false))
  }

  // Carregar disciplinas iniciais
  useEffect(() => {
    carregarDisciplinas()
  }, [])

  // ── Semestre actual e trigger de aviso ──
  const [semestreAtual, setSemestreAtual] = useState<"S1" | "S2">("S1")
  const [disciplinasSemOrientador, setDisciplinasSemOrientador] = useState(0)

  useEffect(() => {
    fetch("/api/admin/sistema/semestre")
      .then(r => r.json())
      .then(data => {
        if (data.semestre_atual) setSemestreAtual(data.semestre_atual)
      })
      .catch(() => {})
  }, [])

  // Se estiver em S2, verificar disciplinas sem orientador
  useEffect(() => {
    if (semestreAtual !== "S2") return
    fetch("/api/gestor/disciplinas?semOrientador=S2")
      .then(r => r.json())
      .then(data => {
        if (typeof data.sem_orientador === "number") {
          setDisciplinasSemOrientador(data.sem_orientador)
        }
      })
      .catch(() => {})
  }, [semestreAtual])

  // Quando o filtro de curso, turno ou professor mudar:
  // 1. Recarregar disciplinas (para actualizar total_estudantes)
  // 2. Se houver disciplina selecionada, recarregar também os estudantes
  useEffect(() => {
    carregarDisciplinas()
    if (disciplinaSelecionada) {
      carregarEstudantes(disciplinaSelecionada.id, filtroCursoId, filtroTurno)
    }
  }, [filtroCursoId, filtroTurno, filtroProfessorId])

  function carregarEstudantes(disciplinaId: number, cursoId: number | null, turno: string | null) {
    setLoadingEstudantes(true)
    let url = `/api/gestor/disciplinas/${disciplinaId}/estudantes`
    const params = new URLSearchParams()
    if (cursoId) params.set("cursoId", String(cursoId))
    if (turno) params.set("turno", turno)
    const queryString = params.toString()
    if (queryString) url += "?" + queryString
    
    fetch(url)
      .then(r => r.json().then(data => ({ ok: r.ok, status: r.status, data })))
      .then(({ ok, status, data }) => {
        if (!ok) {
          console.error("Erro API:", status, data)
          throw new Error(data?.error || `Erro HTTP: ${status}`)
        }
        return data
      })
      .then((data) => {
        if (data?.error) {
          alert("Erro: " + data.error)
          setEstudantes([])
        } else {
          const lista = data?.estudantes
          if (Array.isArray(lista)) {
            setEstudantes(lista)
          } else {
            setEstudantes([])
          }
          setOrientador(data?.orientador || null)
        }
        setLoadingEstudantes(false)
      })
      .catch((err) => {
        console.error("Erro ao carregar estudantes:", err)
        alert("Erro ao carregar estudantes. Verifica a consola para mais detalhes.")
        setEstudantes([])
        setLoadingEstudantes(false)
      })
  }

  function selecionarDisciplina(disc: Disciplina) {
    // Toggle: se clicar na mesma disciplina, fecha
    if (disciplinaSelecionada?.id === disc.id) {
      setDisciplinaSelecionada(null)
      setOrientador(null)
      setEstudantes([])
      return
    }
    
    setDisciplinaSelecionada(disc)
    setOrientador(null)
    setEstudantes([] as Estudante[])
    setFiltroTurno(null) // reset turno filter when switching discipline
    carregarEstudantes(disc.id, filtroCursoId, null)
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

  // Funções para gestão de professores
  async function abrirModalProfessores() {
    if (!disciplinaSelecionada) return
    
    setCarregandoProfessores(true)
    setModalProfessoresAberto(true)
    
    try {
      // Carregar professores já atribuídos
      const resProfessores = await fetch(`/api/gestor/disciplinas/${disciplinaSelecionada.id}/professores`)
      const professores = await resProfessores.json()
      setProfessoresDisciplina(Array.isArray(professores) ? professores : [])

      // Carregar lista de todos os orientadores
      const resOrientadores = await fetch("/api/gestor/orientadores/lista")
      const orientadores = await resOrientadores.json()
      setListaOrientadores(Array.isArray(orientadores) ? orientadores : [])
    } catch (error) {
      console.error("Erro ao carregar dados", error)
    } finally {
      setCarregandoProfessores(false)
    }
  }

  async function adicionarProfessor() {
    if (!disciplinaSelecionada || !professorSelecionado) return

    try {
      const res = await fetch(`/api/gestor/disciplinas/${disciplinaSelecionada.id}/professores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: professorSelecionado })
      })

      if (res.ok) {
        // Recarregar lista para ficar actualizado
        const resAtualizado = await fetch(`/api/gestor/disciplinas/${disciplinaSelecionada.id}/professores`)
        const listaActualizada = await resAtualizado.json()
        setProfessoresDisciplina(Array.isArray(listaActualizada) ? listaActualizada : [])
        setProfessorSelecionado(null)
      } else {
        const error = await res.json()
        alert(error.error)
      }
    } catch (error) {
      alert("Erro ao adicionar professor")
    }
  }

  async function removerProfessor(id_usuario: number) {
    if (!disciplinaSelecionada) return

    try {
      await fetch(`/api/gestor/disciplinas/${disciplinaSelecionada.id}/professores`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario })
      })

      // Recarregar lista para ficar actualizado
      const resAtualizado = await fetch(`/api/gestor/disciplinas/${disciplinaSelecionada.id}/professores`)
      const listaActualizada = await resAtualizado.json()
      setProfessoresDisciplina(Array.isArray(listaActualizada) ? listaActualizada : [])
    } catch (error) {
      alert("Erro ao remover professor")
    }
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
        setEstudantes(prev => {
          if (!Array.isArray(prev)) return []
          return prev.map(e => 
            e.id_estudante === idEstudante 
              ? { ...e, ...notasEditadas, nota_final: data.nota.nota_final, dispensada: data.nota.dispensada, tipo_avaliacao: data.nota.tipo_avaliacao }
              : e
          )
        })
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

  // Get unique years from all course placements
  const anosDisponiveis = [...new Set(disciplinas.flatMap(d => d.cursos.map(c => c.ano_curricular)))].sort()

  // Get unique courses from all disciplines for the course filter
  const cursosDisponiveis = Array.from(
    new Map(
      disciplinas.flatMap(d =>
        d.cursos.map(c => [c.id_curso, { id_curso: c.id_curso, nome_curso: c.nome_curso }])
      )
    ).values()
  ).sort((a, b) => a.nome_curso.localeCompare(b.nome_curso))

  // Filtrar disciplinas — a disciplina aparece se algum dos seus cursos/colocações corresponder ao filtro
  const disciplinasFiltradas = disciplinas.filter(d => {
    // Text filter: search by name or code
    if (filtroTexto) {
      const texto = filtroTexto.toLowerCase()
      if (!d.nome.toLowerCase().includes(texto) && !d.codigo.toLowerCase().includes(texto)) {
        return false
      }
    }

    // Course filter: check if the discipline is assigned to the selected course
    if (filtroCursoId) {
      if (!d.cursos.some(c => c.id_curso === filtroCursoId)) {
        return false
      }
    }

    // Year/semester filter: check if any placement matches
    if (filtroAno || filtroSemestre) {
      return d.cursos.some(c => {
        if (filtroAno && c.ano_curricular !== filtroAno) return false
        if (filtroSemestre && c.semestre !== filtroSemestre) return false
        return true
      })
    }

    return true
  })

  // Filtrar estudantes por turno
  const estudantesFiltrados = Array.isArray(estudantes)
    ? (filtroTurno ? estudantes.filter(e => e.turno === filtroTurno) : estudantes)
    : []

  // Get unique turnos from current students
  const turnosDisponiveis = Array.isArray(estudantes)
    ? [...new Set(estudantes.map(e => e.turno))].sort()
    : []

  return (
    <DashboardLayout
      navItems={gestorNavItems}
      title="Disciplinas - Gestor"
      subtitle="Todas as disciplinas do departamento"
    >
      {/* Filtros */}
      <div style={{
        background: "#1e2230",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        padding: "16px",
        marginBottom: "16px"
      }}>
        {/* Primeira linha: texto + curso */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "12px", alignItems: "center" }}>
          {/* Caixa de pesquisa por texto */}
          <input
            type="text"
            placeholder="🔍 Pesquisar disciplina por nome ou código..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "#13161e",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#e8eaf0",
              fontSize: "12px",
              outline: "none"
            }}
          />
          {/* Filtro por curso */}
          <select
            value={filtroCursoId ?? ""}
            onChange={(e) => setFiltroCursoId(e.target.value ? parseInt(e.target.value) : null)}
            style={{
              padding: "8px 12px",
              background: "#13161e",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#e8eaf0",
              fontSize: "12px",
              minWidth: "200px"
            }}
          >
            <option value="">Todos os Cursos</option>
            {cursosDisponiveis.map(curso => (
              <option key={curso.id_curso} value={curso.id_curso}>
                {curso.nome_curso}
              </option>
            ))}
          </select>
          {/* Filtro por turno */}
          <select
            value={filtroTurno ?? ""}
            onChange={(e) => setFiltroTurno(e.target.value || null)}
            style={{
              padding: "8px 12px",
              background: "#13161e",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#e8eaf0",
              fontSize: "12px",
              minWidth: "140px"
            }}
          >
            <option value="">Todos os Turnos</option>
            {turnosDisponiveisFiltro.map(turno => (
              <option key={turno} value={turno}>
                {turno}
              </option>
            ))}
          </select>
          {/* Filtro por professor */}
          <select
            value={filtroProfessorId ?? ""}
            onChange={(e) => setFiltroProfessorId(e.target.value ? parseInt(e.target.value) : null)}
            style={{
              padding: "8px 12px",
              background: "#13161e",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#e8eaf0",
              fontSize: "12px",
              minWidth: "180px"
            }}
          >
            <option value="">Todos os Professores</option>
            {listaOrientadores.map(o => (
              <option key={o.id_orientador} value={o.usuario.id_usuario}>
                {o.nome_completo}
              </option>
            ))}
          </select>
        </div>
        {/* Segunda linha: ano + semestre */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <span style={{ color: "#d0d7e8", fontSize: "12px" }}>Filtrar:</span>
          <div style={{ display: "flex", gap: "4px" }}>
            {anosDisponiveis.map(ano => (
              <button
                key={ano}
                onClick={() => setFiltroAno(filtroAno === ano ? null : ano)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "1px solid",
                  borderColor: filtroAno === ano ? "#2dd4bf" : "rgba(255,255,255,0.1)",
                  background: filtroAno === ano ? "rgba(45,212,191,0.1)" : "transparent",
                  color: filtroAno === ano ? "#2dd4bf" : "#d0d7e8",
                  fontSize: "11px",
                  cursor: "pointer"
                }}
              >
                {ano}º Ano
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            {(["S1", "S2"] as const).map(sem => (
              <button
                key={sem}
                onClick={() => setFiltroSemestre(filtroSemestre === sem ? null : sem)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "1px solid",
                  borderColor: filtroSemestre === sem ? "#f0a500" : "rgba(255,255,255,0.1)",
                  background: filtroSemestre === sem ? "rgba(240,165,0,0.1)" : "transparent",
                  color: filtroSemestre === sem ? "#f0a500" : "#d0d7e8",
                  fontSize: "11px",
                  cursor: "pointer"
                }}
              >
                {sem}
              </button>
            ))}
          </div>
          {/* Botão para limpar filtros */}
          {(filtroTexto || filtroCursoId || filtroAno || filtroSemestre) && (
            <button
              onClick={() => {
                setFiltroTexto("")
                setFiltroCursoId(null)
                setFiltroAno(null)
                setFiltroSemestre(null)
              }}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: "1px solid #e03d3d",
                background: "rgba(224,61,61,0.1)",
                color: "#e03d3d",
                fontSize: "11px",
                cursor: "pointer",
                marginLeft: "auto"
              }}
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px",
        marginBottom: "24px"
      }}>
        {[
          { label: "Total Disciplinas", value: disciplinas.length, color: "#2dd4bf" },
          { label: "Mostrando", value: disciplinasFiltradas.length, color: "#f0a500" },
          { label: "Ano Lectivo", value: anoLectivo || "—", color: "#22c55e" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "#1e2230",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "14px",
            padding: "20px",
            borderTop: `2px solid ${s.color}`
          }}>
            <div style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "#b0b8cf",
              marginBottom: "10px"
            }}>{s.label}</div>
            <div style={{
              fontSize: "16px",
              fontWeight: "700",
              color: "#e8eaf0"
            }}>{loadingDisciplinas ? "..." : s.value}</div>
          </div>
        ))}
      </div>

      {/* Disciplinas */}
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
        }}>Todas as Disciplinas</div>

        {loadingDisciplinas ? (
          <div style={{ textAlign: "center", color: "#b0b8cf", padding: "30px" }}>A carregar...</div>
        ) : disciplinasFiltradas.length === 0 ? (
          <div style={{ textAlign: "center", color: "#b0b8cf", padding: "30px" }}>
            Nenhuma disciplina encontrada
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {disciplinasFiltradas.map(d => (
              <div key={d.id}>
                {/* Disciplina item */}
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
                    border: disciplinaSelecionada?.id === d.id ? "1px solid #2dd4bf" : "1px solid transparent"
                  }}
                >
                  <div>
                    <div style={{ color: "#e8eaf0", fontSize: "14px", fontWeight: "500" }}>{d.nome}</div>
                    <div style={{ color: "#b0b8cf", fontSize: "12px", marginTop: "2px" }}>
                      {d.codigo} · {d.creditos} créditos · {d.departamento}
                    </div>
                    {/* Mostrar colocações no currículo (curso + ano + semestre) */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                      {d.cursos.map((c, idx) => (
                        <span key={idx} style={{
                          padding: "2px 8px",
                          background: "rgba(45,212,191,0.1)",
                          borderRadius: "4px",
                          fontSize: "10px",
                          color: "#2dd4bf",
                          border: "1px solid rgba(45,212,191,0.2)"
                        }}>
                          {c.nome_curso} · {c.ano_curricular}º Ano · {c.semestre}
                        </span>
                      ))}
                    </div>
                    {disciplinaSelecionada?.id === d.id && orientador && (
                      <div style={{ color: "#2dd4bf", fontSize: "11px", marginTop: "4px" }}>
                        Professor: {orientador}
                      </div>
                    )}
                  </div>
                   <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                     {disciplinaSelecionada?.id === d.id && (
                       <div style={{ display: "flex", gap: "8px" }}>
                         {/* Só mostrar botão Professores se a disciplina for do mesmo departamento do gestor */}
                         {idDepartamentoGestor === d.id_departamento && (
                           <button 
                             onClick={(e) => {
                               e.stopPropagation()
                               abrirModalProfessores()
                             }}
                             style={{
                               padding: "4px 10px",
                               background: "#f0a500",
                               color: "#13161e",
                               border: "none",
                               borderRadius: "6px",
                               fontSize: "11px",
                               fontWeight: "600",
                               cursor: "pointer"
                             }}>
                             👨‍🏫 Professores
                           </button>
                         )}
                       </div>
                     )}
                     <div style={{
                       fontSize: "14px",
                       fontWeight: "700",
                       color: "#2dd4bf"
                     }}>
                       {d.total_estudantes} estudantes
                     </div>
                     <div style={{
                       fontSize: "18px",
                       color: "#b0b8cf",
                       transform: disciplinaSelecionada?.id === d.id ? "rotate(180deg)" : "rotate(0deg)",
                       transition: "transform 0.2s"
                     }}>
                       ▼
                     </div>
                   </div>
                </div>

                {/* Tabela de estudantes (accordion) */}
                {disciplinaSelecionada?.id === d.id && (
                  <div style={{
                    background: "#1e2230",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "0 0 10px 10px",
                    padding: "16px",
                    marginTop: "-1px"
                  }}>
                    {/* Contador de alunos (quando filtro de turno activo) */}
                    {filtroTurno && (
                      <div style={{ color: "#d0d7e8", fontSize: "11px", marginBottom: "12px" }}>
                        Mostrando {estudantesFiltrados.length} de {estudantes.length} alunos
                      </div>
                    )}

                    {loadingEstudantes ? (
                      <div style={{ textAlign: "center", color: "#b0b8cf", padding: "20px" }}>A carregar estudantes...</div>
                    ) : estudantesFiltrados.length === 0 ? (
                      <div style={{ textAlign: "center", color: "#b0b8cf", padding: "20px" }}>
                        {estudantes.length > 0 ? "Nenhum estudante encontrado neste turno" : "Nenhum estudante encontrado"}
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                              <th style={{ textAlign: "left", padding: "8px", color: "#b0b8cf", fontSize: "10px", textTransform: "uppercase" }}>Estudante</th>
                              <th style={{ textAlign: "left", padding: "8px", color: "#b0b8cf", fontSize: "10px", textTransform: "uppercase" }}>Turno</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>AC1</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>AC2</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>AC3</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>TTP</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>PP1</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>PP2</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>Exame</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>Recurso</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>Especial</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>Final</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>Estado</th>
                              <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {estudantesFiltrados.map(e => (
                              <tr key={e.id_nota} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <td style={{ padding: "8px" }}>
                                  <div style={{ color: "#e8eaf0", fontSize: "12px", fontWeight: "500" }}>{e.nome}</div>
                                  <div style={{ color: "#b0b8cf", fontSize: "10px" }}>{e.numero_estudante}</div>
                                </td>
                                <td style={{ padding: "8px" }}>
                                  <span style={{
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "10px",
                                    background: "rgba(240,165,0,0.1)",
                                    color: "#f0a500"
                                  }}>
                                    {e.turno}
                                  </span>
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
                                    fontSize: "11px",
                                    color: e.nota_final != null 
                                      ? (e.nota_final >= 10 ? "#22c55e" : "#e03d3d")
                                      : "#b0b8cf"
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
                                        {salvando ? "..." : "Salvar"}
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
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => iniciarEdicao(e)}
                                      style={{
                                        padding: "3px 6px",
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

       {/* Modal Gestão de Professores */}
       {modalProfessoresAberto && disciplinaSelecionada && (
         <div style={{
           position: "fixed",
           top: 0,
           left: 0,
           right: 0,
           bottom: 0,
           background: "rgba(0,0,0,0.7)",
           display: "flex",
           alignItems: "center",
           justifyContent: "center",
           zIndex: 9999,
           padding: "20px"
         }} onClick={() => setModalProfessoresAberto(false)}>
           <div onClick={e => e.stopPropagation()} style={{
             background: "#1e2230",
             borderRadius: "16px",
             padding: "24px",
             width: "100%",
             maxWidth: "500px",
             border: "1px solid rgba(255,255,255,0.1)"
           }}>
             <div style={{
               fontSize: "16px",
               fontWeight: "700",
               color: "#e8eaf0",
               marginBottom: "20px"
             }}>
               🧑‍🏫 Professores da Disciplina: {disciplinaSelecionada.nome}
             </div>

             {carregandoProfessores ? (
               <div style={{ textAlign: "center", padding: "30px", color: "#b0b8cf" }}>A carregar...</div>
             ) : (
               <>
                 {/* Lista de professores atribuídos */}
                 <div style={{ marginBottom: "20px" }}>
                 <div style={{ fontSize: "12px", color: "#d0d7e8", marginBottom: "8px" }}>✅ Professor Responsável:</div>
                   {professoresDisciplina.length === 0 ? (
                     <div style={{ color: "#b0b8cf", fontSize: "12px", padding: "12px", background: "#13161e", borderRadius: "8px" }}>
                       Nenhum professor atribuído a esta disciplina
                     </div>
                   ) : (
                     <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                       {professoresDisciplina.map(prof => (
                         <div key={prof.id} style={{
                           display: "flex",
                           justifyContent: "space-between",
                           alignItems: "center",
                           padding: "10px 12px",
                           background: "#13161e",
                           borderRadius: "8px"
                         }}>
                           <div>
                             <div style={{ color: "#e8eaf0", fontSize: "13px" }}>{prof.usuario.nome_usuario}</div>
                             <div style={{ color: "#b0b8cf", fontSize: "11px" }}>{prof.usuario.email}</div>
                           </div>
                           <button onClick={() => removerProfessor(prof.id_usuario)} style={{
                             background: "#e03d3d",
                             color: "white",
                             border: "none",
                             padding: "4px 8px",
                             borderRadius: "4px",
                             fontSize: "10px",
                             cursor: "pointer"
                           }}>
                             Remover
                           </button>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>

                 {/* Adicionar novo professor */}
                 <div style={{
                   display: "flex",
                   gap: "8px",
                   alignItems: "center"
                 }}>
                   <select 
                     value={professorSelecionado ?? ""} 
                     onChange={(e) => setProfessorSelecionado(e.target.value ? parseInt(e.target.value) : null)}
                     style={{
                       flex: 1,
                       padding: "8px 12px",
                       background: "#13161e",
                       border: "1px solid rgba(255,255,255,0.1)",
                       borderRadius: "8px",
                       color: "#e8eaf0",
                       fontSize: "13px"
                     }}>
                     <option value="">Selecionar Professor...</option>
                     {listaOrientadores
                       .filter(o => !professoresDisciplina.some(p => p.id_usuario === o.usuario.id_usuario))
                       .map(orientador => (
                         <option key={orientador.id_orientador} value={orientador.usuario.id_usuario}>
                           {orientador.nome_completo}
                         </option>
                       ))
                     }
                   </select>
                   <button 
                     onClick={adicionarProfessor} 
                     disabled={!professorSelecionado}
                     style={{
                       padding: "8px 16px",
                       background: professorSelecionado ? "#22c55e" : "#333",
                       color: "white",
                       border: "none",
                       borderRadius: "8px",
                       fontSize: "12px",
                       fontWeight: "600",
                       cursor: professorSelecionado ? "pointer" : "not-allowed"
                     }}>
                     Adicionar
                   </button>
                 </div>
               </>
             )}

             <button onClick={() => setModalProfessoresAberto(false)} style={{
               width: "100%",
               marginTop: "20px",
               padding: "10px",
               background: "#b0b8cf",
               color: "white",
               border: "none",
               borderRadius: "8px",
               fontSize: "13px",
               cursor: "pointer"
             }}>
               Fechar
             </button>
           </div>
         </div>
       )}
     </DashboardLayout>
   )
 }