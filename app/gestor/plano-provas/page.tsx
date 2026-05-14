"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { useSession } from "next-auth/react"
import DashboardLayout from "../../components/DashboardLayout"
import { gestorNavItems } from "../gestorNav"
import DatePickerPT from "../../components/DatePickerPT"

type Curso = {
  id_curso: number
  nome_curso: string
  duracao_anos: number | null
  turnos: string | null
}
type Disciplina = {
  id_disciplina: number
  nome_disciplina: string
  codigo_disciplina: string
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

const tiposProva = ["PP1", "PP2", "Exame", "Recurso", "Exame_Especial"]
const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

// Turnos com horários base (como no horário de aulas)
const TURNOS_HORARIOS: Record<string, { inicio: string; fim: string }> = {
  Matinal: { inicio: "08:00", fim: "13:00" },
  Vespertino: { inicio: "13:00", fim: "18:00" },
  Noturno: { inicio: "18:00", fim: "23:00" },
}

// Calcular horário baseado na posição (igual ao horário de aulas)
function calcularHorarioProva(posicao: number, turno: string, duracao: number, intervalo: number) {
  const t = TURNOS_HORARIOS[turno]
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

// Máximo de posições por turno
function calcularMaxPosicoes(turno: string, duracao: number, intervalo: number) {
  const t = TURNOS_HORARIOS[turno]
  if (!t) return 0
  const [h, m] = t.inicio.split(":").map(Number)
  const [hFim, mFim] = t.fim.split(":").map(Number)
  const totalMin = (hFim * 60 + mFim) - (h * 60 + m)
  const bloco = duracao + intervalo
  let posicoes = 0
  let usado = 0
  while (usado + duracao <= totalMin) {
    posicoes++
    usado += bloco
  }
  return posicoes
}

const estiloSelect: React.CSSProperties = {
  background: "#13161e",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  padding: "8px 12px",
  color: "#e8eaf0",
  fontSize: "13px",
  minWidth: "120px"
}

export default function PlanoProvasPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [provas, setProvas] = useState<Prova[]>([])
  const [loading, setLoading] = useState(true)

  const [cursoId, setCursoId] = useState<string>("")
  const [ano, setAno] = useState<string>("1")
  const [semestre, setSemestre] = useState<string>("S1")
  const [anoLectivo, setAnoLectivo] = useState<string>("2025/2026")

  // Período de provas
  const [periodoInicio, setPeriodoInicio] = useState<string>("")
  const [periodoFim, setPeriodoFim] = useState<string>("")
  const [erroPeriodo, setErroPeriodo] = useState<string>("")
  const [guardandoPeriodo, setGuardandoPeriodo] = useState(false)
  const [periodoGuardado, setPeriodoGuardado] = useState(false)

  // Filtros de contexto (vindos do Selecionar Turma)
  const [filtroTurno, setFiltroTurno] = useState<string>("")
  const [filtroTipoProva, setFiltroTipoProva] = useState<string>("PP1")

  // Formulário
  const [disciplinaId, setDisciplinaId] = useState<string>("")
  const [dataProva, setDataProva] = useState<string>("")
  const [posicao, setPosicao] = useState<string>("1")
  const [salvando, setSalvando] = useState(false)
  const [erroDataProva, setErroDataProva] = useState<string>("")

  // Configuração de horário
  const [duracaoAula, setDuracaoAula] = useState<number>(90)
  const [intervalo, setIntervalo] = useState<number>(10)

  // Sessão para obter o nome do gestor
  const { data: session } = useSession()
  const nomeGestor = session?.user?.nome_completo || session?.user?.name || "Gestor do Departamento"

  // Estado para impressão
  const [turnoParaImprimir, setTurnoParaImprimir] = useState<string | null>(null)
  const [tipoParaImprimir, setTipoParaImprimir] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  // Carregar cursos
  useEffect(() => {
    fetch("/api/gestor/cursos")
      .then(r => r.json())
      .then(data => {
        setCursos(data.cursos || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Carregar disciplinas do currículo filtradas por ano/semestre
  useEffect(() => {
    if (!cursoId) { setDisciplinas([]); return }
    fetch(`/api/gestor/curriculo?cursoId=${cursoId}`)
      .then(r => r.json())
      .then(data => {
        const filtradas = (data.curriculo || []).filter((d: Disciplina & { ano_curricular: number; semestre: string }) =>
          d.ano_curricular === parseInt(ano) && d.semestre === semestre
        )
        setDisciplinas(filtradas)
      })
  }, [cursoId, ano, semestre])

  // Carregar provas existentes
  useEffect(() => {
    if (!cursoId) { setProvas([]); return }
    fetch(`/api/gestor/plano-provas?cursoId=${cursoId}&ano=${ano}&semestre=${semestre}&ano_lectivo=${anoLectivo}`)
      .then(r => r.json())
      .then(data => setProvas(data.provas || []))
  }, [cursoId, ano, semestre, anoLectivo])

  // Carregar período de provas da BD
  useEffect(() => {
    if (!cursoId) { setPeriodoInicio(""); setPeriodoFim(""); setPeriodoGuardado(false); return }
    fetch(`/api/gestor/periodo-provas?cursoId=${cursoId}&ano=${ano}&semestre=${semestre}&ano_lectivo=${anoLectivo}`)
      .then(r => r.json())
      .then(data => {
        if (data.periodo) {
          const inicio = data.periodo.data_inicio.split("T")[0]
          const fim = data.periodo.data_fim.split("T")[0]
          setPeriodoInicio(inicio)
          setPeriodoFim(fim)
          setPeriodoGuardado(true)
        } else {
          setPeriodoGuardado(false)
        }
      })
      .catch(() => setPeriodoGuardado(false))
  }, [cursoId, ano, semestre, anoLectivo])

  async function guardarPeriodo() {
    if (!cursoId || !periodoInicio || !periodoFim) {
      alert("Preencha as datas do período")
      return
    }
    if (erroPeriodo) {
      alert("Corrija o erro no período antes de guardar")
      return
    }
    setGuardandoPeriodo(true)
    try {
      const res = await fetch("/api/gestor/periodo-provas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_curso: parseInt(cursoId),
          ano_curricular: parseInt(ano),
          semestre,
          ano_lectivo: anoLectivo,
          data_inicio: periodoInicio,
          data_fim: periodoFim,
        })
      })
      if (res.ok) {
        setPeriodoGuardado(true)
        alert("Período guardado com sucesso!")
      } else {
        const err = await res.json()
        alert(err.error || "Erro ao guardar período")
      }
    } catch {
      alert("Erro ao guardar período")
    } finally {
      setGuardandoPeriodo(false)
    }
  }

  // Carregar configuração de horários
  useEffect(() => {
    fetch("/api/config/taxas/route")
      .then(r => r.json())
      .then(data => {
        if (data.configuracao?.duracao_aula_minutos) {
          setDuracaoAula(data.configuracao.duracao_aula_minutos)
        }
        if (data.configuracao?.intervalo_minutos) {
          setIntervalo(data.configuracao.intervalo_minutos)
        }
      })
      .catch(() => {})
  }, [])

  const anosDisponiveis = useMemo(() => {
    const curso = cursos.find(c => c.id_curso === parseInt(cursoId))
    const duracao = curso?.duracao_anos || 6
    return Array.from({ length: duracao }, (_, i) => i + 1)
  }, [cursos, cursoId])

  // Turnos do curso seleccionado - extraídos do campo "turnos" do curso
  const turnosDoCurso = useMemo(() => {
    const curso = cursos.find(c => c.id_curso === parseInt(cursoId))
    if (!curso?.turnos) return []
    return curso.turnos.split(",").map((t: string) => t.trim()).filter(Boolean)
  }, [cursos, cursoId])

  // Máximo de posições para o turno seleccionado
  const maxPosicoes = useMemo(() => {
    if (!filtroTurno) return 0
    return calcularMaxPosicoes(filtroTurno, duracaoAula, intervalo)
  }, [filtroTurno, duracaoAula, intervalo])

  // Preview do horário calculado
  const horarioPreview = useMemo(() => {
    if (!filtroTurno || !posicao) return null
    return calcularHorarioProva(parseInt(posicao), filtroTurno, duracaoAula, intervalo)
  }, [posicao, filtroTurno, duracaoAula, intervalo])

  // Atualizar filtroTurno quando curso muda (começa com o primeiro turno)
  useEffect(() => {
    if (turnosDoCurso.length > 0) {
      setFiltroTurno(turnosDoCurso[0])
    } else {
      setFiltroTurno("")
    }
    setPosicao("1")
  }, [turnosDoCurso])

  // Atualizar posição máxima quando turno muda
  useEffect(() => {
    if (parseInt(posicao) > maxPosicoes) {
      setPosicao("1")
    }
  }, [maxPosicoes])

  // Validação: período - data início não pode ser depois do fim
  useEffect(() => {
    if (periodoInicio && periodoFim) {
      const inicio = new Date(periodoInicio + "T00:00:00")
      const fim = new Date(periodoFim + "T00:00:00")
      if (inicio > fim) {
        setErroPeriodo("A data de início não pode ser posterior à data de fim")
      } else {
        setErroPeriodo("")
      }
    } else {
      setErroPeriodo("")
    }
  }, [periodoInicio, periodoFim])

  // Validação: data da prova dentro do período
  useEffect(() => {
    if (dataProva && periodoInicio && periodoFim && !erroPeriodo) {
      const data = new Date(dataProva + "T00:00:00")
      const inicio = new Date(periodoInicio + "T00:00:00")
      const fim = new Date(periodoFim + "T00:00:00")
      if (data < inicio || data > fim) {
        setErroDataProva(`A data deve estar entre ${new Date(periodoInicio).toLocaleDateString("pt-BR")} e ${new Date(periodoFim).toLocaleDateString("pt-BR")}`)
      } else {
        setErroDataProva("")
      }
    } else if (dataProva && !periodoInicio) {
      setErroDataProva("Defina o período de provas primeiro")
    } else {
      setErroDataProva("")
    }
  }, [dataProva, periodoInicio, periodoFim, erroPeriodo])

  // Gerar lista de datas no período (apenas Seg a Sex)
  function formatLocalDate(d: Date): string {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  }

  const datasPeriodo = useMemo(() => {
    if (!periodoInicio || !periodoFim || erroPeriodo) return []
    const inicio = new Date(periodoInicio + "T00:00:00")
    const fim = new Date(periodoFim + "T00:00:00")
    if (inicio > fim) return []
    const datas: string[] = []
    const d = new Date(inicio)
    while (d <= fim) {
      const diaSem = d.getDay()
      if (diaSem >= 1 && diaSem <= 5) { // Segunda a Sexta
        datas.push(formatLocalDate(d))
      }
      d.setDate(d.getDate() + 1)
    }
    return datas
  }, [periodoInicio, periodoFim, erroPeriodo])

  function dataParaDiaSemana(dataStr: string) {
    const d = new Date(dataStr + "T00:00:00")
    return d.getDay()
  }

  // Posições de horário para o turno a imprimir (com horas calculadas)
  const posicoesTurno = useMemo(() => {
    const turnoAtivo = turnoParaImprimir || ""
    const posicoes: { posicao: number; inicio: string; fim: string }[] = []
    const max = calcularMaxPosicoes(turnoAtivo, duracaoAula, intervalo)
    for (let i = 1; i <= max; i++) {
      const h = calcularHorarioProva(i, turnoAtivo, duracaoAula, intervalo)
      if (h) posicoes.push({ posicao: i, inicio: h.inicio, fim: h.fim })
    }
    return posicoes
  }, [turnoParaImprimir, duracaoAula, intervalo])

  // Disparar impressão quando turnoParaImprimir for definido
  useEffect(() => {
    if (turnoParaImprimir) {
      setTimeout(() => { window.print() }, 200)
    }
  }, [turnoParaImprimir])

  // Limpar turnoParaImprimir após impressão ou cancelamento
  useEffect(() => {
    const handler = () => { setTurnoParaImprimir(null); setTipoParaImprimir(null) }
    window.addEventListener("afterprint", handler)
    return () => window.removeEventListener("afterprint", handler)
  }, [])

  async function adicionarProva(e: React.FormEvent) {
    e.preventDefault()
    if (!cursoId || !disciplinaId || !dataProva || !filtroTurno || !posicao) {
      alert("Preencha todos os campos obrigatórios")
      return
    }
    if (erroPeriodo || erroDataProva) {
      alert("Corrija os erros antes de adicionar")
      return
    }

    // Calcular horários baseados na posição
    const horarios = calcularHorarioProva(parseInt(posicao), filtroTurno, duracaoAula, intervalo)
    if (!horarios) {
      alert("Posição inválida para este turno")
      return
    }

    setSalvando(true)
    try {
      const res = await fetch("/api/gestor/plano-provas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_curso: parseInt(cursoId),
          id_disciplina: parseInt(disciplinaId),
          ano_curricular: parseInt(ano),
          semestre,
          tipo_prova: filtroTipoProva,
          data_prova: dataProva,
          turno: filtroTurno,
          hora_inicio: horarios.inicio,
          hora_fim: horarios.fim,
          ano_lectivo: anoLectivo
        })
      })
      if (res.ok) {
        const data = await fetch(`/api/gestor/plano-provas?cursoId=${cursoId}&ano=${ano}&semestre=${semestre}&ano_lectivo=${anoLectivo}`).then(r => r.json())
        setProvas(data.provas || [])
        setDisciplinaId("")
        setDataProva("")
        setPosicao("1")
      } else {
        const err = await res.json()
        alert(err.error || "Erro ao adicionar prova")
      }
    } catch {
      alert("Erro ao adicionar prova")
    } finally {
      setSalvando(false)
    }
  }

  async function removerProva(id: number) {
    if (!confirm("Remover esta prova do plano?")) return
    try {
      await fetch(`/api/gestor/plano-provas?id=${id}`, { method: "DELETE" })
      const data = await fetch(`/api/gestor/plano-provas?cursoId=${cursoId}&ano=${ano}&semestre=${semestre}&ano_lectivo=${anoLectivo}`).then(r => r.json())
      setProvas(data.provas || [])
    } catch {
      alert("Erro ao remover prova")
    }
  }

  function getCorTipo(tipo: string) {
    switch (tipo) {
      case "PP1": return "#22c55e"
      case "PP2": return "#3b82f6"
      case "Exame": return "#f0a500"
      case "Recurso": return "#e03d3d"
      case "Exame_Especial": return "#a855f7"
      default: return "#555e78"
    }
  }

  // Provas agrupadas por data (YYYY-MM-DD) e turno e tipo
  const provasPorTurnoEDiaETipo = useMemo(() => {
    const map = new Map<string, Prova[]>()
    for (const prova of provas) {
      const chave = `${prova.data_prova.split("T")[0]}_${prova.turno}_${prova.tipo_prova}`
      const lista = map.get(chave) || []
      lista.push(prova)
      map.set(chave, lista)
    }
    return map
  }, [provas])

  // Agrupar provas por data e turno (para impressão sem filtro de tipo)
  const provasPorTurnoEDia = useMemo(() => {
    const map = new Map<string, Prova[]>()
    for (const prova of provas) {
      const chave = `${prova.data_prova.split("T")[0]}_${prova.turno}`
      const lista = map.get(chave) || []
      lista.push(prova)
      map.set(chave, lista)
    }
    return map
  }, [provas])

  if (loading) {
    return (
      <DashboardLayout navItems={gestorNavItems} title="Horário de Prova" subtitle="Gerir calendário de avaliações por curso">
        <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "40px", textAlign: "center" }}>
          <div style={{ color: "#555e78" }}>A carregar...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout navItems={gestorNavItems} title="Horário de Prova" subtitle="Gerir calendário de avaliações por curso">
      {/* Selecionar Turma */}
      <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px", marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#e8eaf0" }}>Selecionar Turma</div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px" }}>Curso</div>
            <select value={cursoId} onChange={e => setCursoId(e.target.value)} style={estiloSelect}>
              <option value="">Selecionar...</option>
              {cursos.map(c => (
                <option key={c.id_curso} value={c.id_curso}>
                  {c.nome_curso} {c.turnos ? `(${c.turnos})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px" }}>Ano</div>
            <select value={ano} onChange={e => setAno(e.target.value)} style={estiloSelect}>
              {anosDisponiveis.map(a => <option key={a} value={a}>{a}º</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px" }}>Semestre</div>
            <select value={semestre} onChange={e => setSemestre(e.target.value)} style={estiloSelect}>
              <option value="S1">S1</option>
              <option value="S2">S2</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px" }}>Ano Lectivo</div>
            <input type="text" value={anoLectivo} onChange={e => setAnoLectivo(e.target.value)} style={{ ...estiloSelect, minWidth: "100px" }} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px" }}>Turno</div>
            <select value={filtroTurno} onChange={e => { setFiltroTurno(e.target.value); setPosicao("1") }} style={estiloSelect}>
              {turnosDoCurso.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px" }}>Tipo de Prova</div>
            <select value={filtroTipoProva} onChange={e => setFiltroTipoProva(e.target.value)} style={estiloSelect}>
              {tiposProva.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Período de Provas */}
      <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px", marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#e8eaf0" }}>Período de Provas</div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px" }}>Data Início</div>
            <DatePickerPT value={periodoInicio} onChange={setPeriodoInicio} style={{ ...estiloSelect, borderColor: erroPeriodo ? "#e03d3d" : "rgba(255,255,255,0.1)" }} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px" }}>Data Fim</div>
            <DatePickerPT value={periodoFim} onChange={setPeriodoFim} style={{ ...estiloSelect, borderColor: erroPeriodo ? "#e03d3d" : "rgba(255,255,255,0.1)" }} />
          </div>
          <button 
            onClick={guardarPeriodo}
            disabled={guardandoPeriodo || !periodoInicio || !periodoFim || !!erroPeriodo}
            style={{
              padding: "8px 14px",
              background: periodoInicio && periodoFim && !erroPeriodo ? "#2dd4bf" : "#555e78",
              color: periodoInicio && periodoFim && !erroPeriodo ? "#13161e" : "#9098b0",
              border: "none",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: periodoInicio && periodoFim && !erroPeriodo ? "pointer" : "not-allowed"
            }}
          >
            {guardandoPeriodo ? "A guardar..." : periodoGuardado ? "Guardar Alterações" : "💾 Guardar Período"}
          </button>
          {periodoGuardado && (
            <div style={{ color: "#22c55e", fontSize: "11px", alignSelf: "center", fontWeight: "500" }}>
              ✓ Guardado
            </div>
          )}
          {erroPeriodo && (
            <div style={{ color: "#e03d3d", fontSize: "12px", alignSelf: "center" }}>{erroPeriodo}</div>
          )}
        </div>
      </div>

      {cursoId && (
        <>
          {/* Formulário para adicionar prova */}
          <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px", marginBottom: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#e8eaf0" }}>Adicionar Prova</div>
            <form onSubmit={adicionarProva} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px" }}>Disciplina</div>
                <select value={disciplinaId} onChange={e => setDisciplinaId(e.target.value)} required style={{ ...estiloSelect, minWidth: "220px" }}>
                  <option value="">Selecionar...</option>
                  {disciplinas.map(d => (
                    <option key={d.id_disciplina} value={d.id_disciplina}>
                      {d.nome_disciplina} ({d.codigo_disciplina})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px" }}>Tipo</div>
                <select value={filtroTipoProva} disabled style={{ ...estiloSelect, opacity: 0.7, cursor: "not-allowed" }}>
                  {tiposProva.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px" }}>Data</div>
                <DatePickerPT 
                  value={dataProva} 
                  onChange={setDataProva} 
                  min={periodoInicio || undefined}
                  max={periodoFim || undefined}
                  style={{ ...estiloSelect, borderColor: erroDataProva ? "#e03d3d" : "rgba(255,255,255,0.1)" }} 
                />
                {erroDataProva && <div style={{ color: "#e03d3d", fontSize: "11px", marginTop: "4px" }}>{erroDataProva}</div>}
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px" }}>Turno</div>
                <select value={filtroTurno} disabled style={{ ...estiloSelect, opacity: 0.7, cursor: "not-allowed" }}>
                  {turnosDoCurso.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px" }}>Posição ({maxPosicoes} max)</div>
                <select value={posicao} onChange={e => setPosicao(e.target.value)} style={estiloSelect}>
                  {Array.from({ length: Math.max(maxPosicoes, 1) }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}ª Prova</option>
                  ))}
                </select>
              </div>
                <button type="submit" disabled={salvando || !disciplinaId || !dataProva || !filtroTurno || !!erroPeriodo || !!erroDataProva} style={{
                padding: "8px 16px",
                background: disciplinaId && dataProva && filtroTurno && !erroPeriodo && !erroDataProva ? "#2dd4bf" : "#555e78",
                color: disciplinaId && dataProva && filtroTurno && !erroPeriodo && !erroDataProva ? "#13161e" : "#9098b0",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: disciplinaId && dataProva && filtroTurno && !erroPeriodo && !erroDataProva ? "pointer" : "not-allowed"
              }}>{salvando ? "A adicionar..." : "+ Adicionar"}</button>
            </form>
            
            {/* Preview do horário calculado */}
            {horarioPreview && (
              <div style={{ marginTop: "10px", color: "#2dd4bf", fontSize: "12px", fontWeight: "500" }}>
                🕐 Horário calculado: {horarioPreview.inicio} — {horarioPreview.fim}
              </div>
            )}
            
            {disciplinas.length === 0 && (
              <div style={{ color: "#555e78", fontSize: "12px", marginTop: "10px" }}>
                Nenhuma disciplina encontrada no currículo para {ano}º ano, {semestre}. Adicione disciplinas no <a href="/gestor/curriculo" style={{ color: "#2dd4bf" }}>Currículo</a> primeiro.
              </div>
            )}
          </div>

          {/* Calendário de Provas */}
          <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px", marginBottom: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "#e8eaf0" }}>
              Calendário de Provas — {cursos.find(c => c.id_curso === parseInt(cursoId))?.nome_curso} ({ano}º ano, {semestre})
              {periodoInicio && periodoFim && !erroPeriodo && ` — ${new Date(periodoInicio + "T00:00:00").toLocaleDateString("pt-BR")} a ${new Date(periodoFim + "T00:00:00").toLocaleDateString("pt-BR")}`}
            </div>

            {/* Botão de Imprimir — único, baseado nos filtros seleccionados */}
            {periodoInicio && periodoFim && !erroPeriodo && datasPeriodo.length > 0 && filtroTurno && filtroTipoProva && (
              <div style={{ marginBottom: "16px" }}>
                <button
                  onClick={() => { setTurnoParaImprimir(filtroTurno); setTipoParaImprimir(filtroTipoProva) }}
                  style={{
                    padding: "10px 18px",
                    background: getCorTipo(filtroTipoProva),
                    color: "#13161e",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  🖨️ Imprimir {filtroTurno} — {filtroTipoProva}
                </button>
              </div>
            )}

            {/* Grid de dias com provas - agrupado por tipo_prova dentro de cada dia */}
            {periodoInicio && periodoFim && !erroPeriodo && datasPeriodo.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                {datasPeriodo.map(dataStr => {
                  const diaSemana = dataParaDiaSemana(dataStr)
                  
                  const provasDesteDia = provas.filter(p => {
                    const mesmaData = p.data_prova.split("T")[0] === dataStr
                    const mesmoTurno = !filtroTurno || p.turno === filtroTurno
                    const mesmotipo = !filtroTipoProva || p.tipo_prova === filtroTipoProva
                    return mesmaData && mesmoTurno && mesmotipo
                  })

                  if (provasDesteDia.length === 0 && filtroTurno) return null

                  // Agrupar por tipo_prova
                  const provasPorTipo = new Map<string, Prova[]>()
                  for (const p of provasDesteDia) {
                    const lista = provasPorTipo.get(p.tipo_prova) || []
                    lista.push(p)
                    provasPorTipo.set(p.tipo_prova, lista)
                  }

                  return (
                    <div key={dataStr} style={{ background: "#13161e", borderRadius: "8px", padding: "12px" }}>
                      <div style={{ fontSize: "12px", fontWeight: "600", color: "#2dd4bf", marginBottom: "8px" }}>
                        {diasSemana[diaSemana]} — {new Date(dataStr + "T00:00:00").toLocaleDateString("pt-BR")}
                      </div>
                      {provasDesteDia.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {Array.from(provasPorTipo.entries()).map(([tipo, provasDoTipo]) => (
                            <div key={tipo}>
                              <div style={{ fontSize: "11px", fontWeight: "600", color: getCorTipo(tipo), marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: getCorTipo(tipo) }}></span>
                                {tipo}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                {provasDoTipo.map(prova => (
                                  <div key={prova.id_prova} style={{ background: "#1e2230", borderRadius: "6px", padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                      <div style={{ color: "#e8eaf0", fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "180px" }}>
                                        {prova.disciplina.nome_disciplina}
                                      </div>
                                      <div style={{ color: "#9098b0", fontSize: "10px" }}>
                                        {prova.disciplina.codigo_disciplina} • <strong>{prova.hora_inicio}-{prova.hora_fim}</strong>
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                                      <span style={{ color: "#555e78", fontSize: "10px" }}>{prova.turno}</span>
                                      <button 
                                        onClick={() => removerProva(prova.id_prova)} 
                                        style={{
                                          padding: "2px 6px",
                                          background: "transparent",
                                          border: "1px solid rgba(224,61,61,0.3)",
                                          borderRadius: "4px",
                                          color: "#e03d3d",
                                          fontSize: "10px",
                                          cursor: "pointer",
                                        }}
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        !filtroTurno && <div style={{ color: "#555e78", fontSize: "11px", fontStyle: "italic" }}>— Sem provas</div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ color: "#555e78", textAlign: "center", padding: "30px" }}>
                {!periodoInicio ? "Defina o período de provas acima para ver o calendário." : erroPeriodo ? "Corrija o período de provas." : "Nenhuma data no período seleccionado."}
              </div>
            )}

            {/* Todas as Provas - Grid de Cartões */}
            {provas.length > 0 && (
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "12px", color: "#e8eaf0" }}>
                  Todas as Provas ({provas.length})
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px", maxHeight: "360px", overflowY: "auto" }}>
                  {provas.map(prova => {
                    const data = new Date(prova.data_prova)
                    const dia = String(data.getDate()).padStart(2, "0")
                    const mes = String(data.getMonth() + 1).padStart(2, "0")
                    return (
                      <div key={prova.id_prova} style={{ background: "#13161e", borderRadius: "10px", padding: "14px", position: "relative", border: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <button 
                          onClick={() => removerProva(prova.id_prova)} 
                          style={{
                            position: "absolute",
                            top: "6px",
                            right: "6px",
                            padding: "2px 6px",
                            background: "transparent",
                            border: "1px solid rgba(224,61,61,0.25)",
                            borderRadius: "4px",
                            color: "#e03d3d",
                            fontSize: "10px",
                            cursor: "pointer",
                            lineHeight: "1.4"
                          }}
                        >
                          ✕
                        </button>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: getCorTipo(prova.tipo_prova), flexShrink: 0 }}></div>
                          <span style={{ padding: "2px 7px", borderRadius: "4px", background: `${getCorTipo(prova.tipo_prova)}18`, color: getCorTipo(prova.tipo_prova), fontSize: "11px", fontWeight: "600" }}>{prova.tipo_prova}</span>
                        </div>
                        <div>
                          <div style={{ color: "#e8eaf0", fontSize: "13px", fontWeight: "500", lineHeight: "1.3", marginBottom: "2px" }}>{prova.disciplina.nome_disciplina}</div>
                          <div style={{ color: "#555e78", fontSize: "11px" }}>{prova.disciplina.codigo_disciplina}</div>
                        </div>
                        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "3px" }}>
                          <div style={{ color: "#9098b0", fontSize: "11px" }}>
                            📅 {diasSemana[data.getDay()]}, <strong>{dia}/{mes}</strong>
                          </div>
                          <div style={{ color: "#9098b0", fontSize: "11px" }}>
                            🕐 <strong>{prova.hora_inicio} — {prova.hora_fim}</strong>
                          </div>
                          <div style={{ color: "#9098b0", fontSize: "11px" }}>
                            🔄 {prova.turno}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Grid de Impressão (invisível no ecrã, visível ao imprimir) - Agrupado por semanas */}
      {/* Usamos createPortal para renderizar diretamente no body, 
          porque a regra CSS @media print usa "body > :not(.print-grid)" para esconder tudo menos o print-grid.
          Sem portal, o print-grid fica aninhado dentro do DashboardLayout e a regra CSS não consegue mantê-lo visível. */}
      {turnoParaImprimir && tipoParaImprimir && periodoInicio && periodoFim && datasPeriodo.length > 0 && typeof document !== "undefined" && createPortal(
        <div ref={printRef} className="print-grid">
          <style>{`
            @media print {
              @page { size: landscape; margin: 10mm; }
              html, body { margin: 0; padding: 0; height: auto; }
              body > :not(.print-grid) { display: none !important; }
              .print-grid { display: block !important; }
              .print-grid { position: fixed; top: 0; left: 0; right: 0; padding: 8mm; }
              .print-section { margin-bottom: 16px; page-break-inside: avoid; }
              .print-table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; }
              .print-table th, .print-table td { border: 1px solid #333; padding: 4px 6px; text-align: center; font-size: 10px; height: 28px; }
              .print-table th { background: #e8eaf0; font-weight: 700; font-size: 11px; height: 32px; }
              .print-table td.hora { font-weight: 600; white-space: nowrap; text-align: right; background: #f5f6fa; width: 100px; font-size: 9px; }
              .print-header { text-align: center; font-size: 14px; font-weight: 700; margin-bottom: 6px; }
              .print-sub { text-align: center; font-size: 11px; color: #555; margin-bottom: 12px; }
              .print-week { font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px; margin-top: 12px; }
              .print-prova-nome { font-size: 10px; font-weight: 600; }
              .print-vazia { color: #ccc; font-size: 9px; }
              .print-footer { margin-top: 32px; display: flex; justify-content: flex-start; }
              .print-assinatura { text-align: left; }
              .print-assinatura div:first-child { font-size: 11px; color: #555; margin-bottom: 16px; }
              .print-linha-assinatura { border-top: 2px solid #333; padding-top: 8px; font-size: 13px; font-weight: 600; min-width: 250px; }
            }
          `}</style>

          <div className="print-header">
            Horário de Prova — {cursos.find(c => c.id_curso === parseInt(cursoId))?.nome_curso}
          </div>
          <div className="print-sub">
            {ano}º ano, {semestre} • {anoLectivo} • Turno: {turnoParaImprimir} • {tipoParaImprimir}
            <br />
            {new Date(periodoInicio + "T00:00:00").toLocaleDateString("pt-BR")} a {new Date(periodoFim + "T00:00:00").toLocaleDateString("pt-BR")}
          </div>

          {(() => {
            // Agrupar datas por semana real (Segunda a Domingo)
            // Usar o ISO week number para garantir que dias da mesma semana ficam juntos
            const semanas: string[][] = []
            let semanaAtual: string[] = []
            let lastMonday = ""

            for (const d of datasPeriodo) {
              const dt = new Date(d + "T12:00:00")
              const diaSem = dt.getDay() // 0=domingo, 1=segunda...
              // Calcular a data da segunda-feira desta semana
              const segunda = new Date(dt)
              const diff = diaSem === 0 ? -6 : 1 - diaSem // se domingo, volta 6 dias
              segunda.setDate(segunda.getDate() + diff)
              const segundaStr = `${segunda.getFullYear()}-${String(segunda.getMonth() + 1).padStart(2, "0")}-${String(segunda.getDate()).padStart(2, "0")}`

              if (segundaStr !== lastMonday && lastMonday !== "") {
                semanas.push(semanaAtual)
                semanaAtual = []
              }
              semanaAtual.push(d)
              lastMonday = segundaStr
            }
            if (semanaAtual.length > 0) semanas.push(semanaAtual)
            return semanas
          })().map((semana, idx) => (
            <div key={idx} className="print-section">
              <div className="print-week">Semana {idx + 1}</div>
              <table className="print-table">
                <thead>
                  <tr>
                    <th style={{ width: "100px" }}>Horário</th>
                    {semana.map(dataStr => {
                      const diaSemana = dataParaDiaSemana(dataStr)
                      const data = new Date(dataStr + "T00:00:00")
                      return (
                        <th key={dataStr}>
                          {diasSemana[diaSemana]}<br />
                          {String(data.getDate()).padStart(2, "0")}/{String(data.getMonth() + 1).padStart(2, "0")}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {posicoesTurno.map(pos => (
                    <tr key={pos.posicao}>
                      <td className="hora">{pos.inicio} — {pos.fim}</td>
                      {semana.map(dataStr => {
                        // Usar chave com turno + tipo para filtrar exatamente o que se pretende imprimir
                        const chave = `${dataStr}_${turnoParaImprimir}_${tipoParaImprimir}`
                        const provasNoSlot = (provasPorTurnoEDiaETipo.get(chave) || [])
                          .filter(p => p.hora_inicio === pos.inicio && p.hora_fim === pos.fim)
                        
                        return (
                          <td key={dataStr}>
                            {provasNoSlot.length > 0 ? (
                              provasNoSlot.map(p => (
                                <div key={p.id_prova}>
                                  <div className="print-prova-nome">{p.disciplina.nome_disciplina}</div>
                                </div>
                              ))
                            ) : (
                              <div className="print-vazia">—</div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {/* Rodapé de assinatura */}
          <div className="print-footer">
            <div className="print-assinatura">
              <div>O Gestor do Departamento</div>
              <div className="print-linha-assinatura">{nomeGestor}</div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </DashboardLayout>
  )
}