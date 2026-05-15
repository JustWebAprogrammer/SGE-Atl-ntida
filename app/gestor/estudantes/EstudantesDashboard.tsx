"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { gestorNavItems } from "../gestorNav"
import { arredondarNota } from "@/lib/notas"

type NotaDetalhe = {
  id_nota: number | null
  id_disciplina: number
  disciplina: string
  codigo: string
  creditos: number
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
  tipo_avaliacao: string
  aprovado: boolean | null
}

type AnoCurricular = {
  ano: number
  ano_lectivo: string
  semestres: {
    S1: NotaDetalhe[]
    S2: NotaDetalhe[]
  }
}

type EstudanteDetalhe = {
  id_estudante: number
  nome: string
  numero_estudante: string | null
  turno: string
  ano_current: number
  estado: string
  pagamento: string
  tipo_bolsa: string
  curso: {
    id: number
    nome: string
    duracao_anos: number
    turnos_disponiveis: string[]
  }
  anos_curriculares: AnoCurricular[]
}

type EstudanteResumo = {
  id_estudante: number
  nome: string
  numero_estudante: string | null
  ano_current: number | null
  turno: string
  estado: string
  pagamento: string
  curso: string
  departamento: string
}

// Modal de edição de notas
function ModalEditarNota({
  nota,
  idEstudante,
  ano_lectivo,
  onClose,
  onSave,
}: {
  nota: NotaDetalhe
  idEstudante: number
  ano_lectivo: string
  onClose: () => void
  onSave: (notaActualizada: NotaDetalhe) => void
}) {
  const [formData, setFormData] = useState({
    ac1: nota.ac1 ?? null,
    ac2: nota.ac2 ?? null,
    ac3: nota.ac3 ?? null,
    ttp: nota.ttp ?? null,
    pp1: nota.pp1 ?? null,
    pp2: nota.pp2 ?? null,
    exame: nota.exame ?? null,
    recurso: nota.recurso ?? null,
    exame_especial: nota.exame_especial ?? null,
  })
  const [saving, setSaving] = useState(false)

  // Calcular nota final preview
  function calcularPreview() {
    const { ac1, ac2, ac3, ttp, pp1, pp2, exame, recurso, exame_especial } = formData
    if (exame_especial != null) return { nota: arredondarNota(exame_especial), tipo: "Especial", is_provisional: false }
    if (recurso != null) return { nota: arredondarNota(recurso), tipo: "Recurso", is_provisional: false }

    // Calcular progressivamente (usando apenas valores não-null)
    const acValues = [ac1, ac2, ac3].filter(v => v !== null)
    const ppValues = [pp1, pp2].filter(v => v !== null)

    // Se AC está vazio (todos null) e PP está vazio, retorna null
    if (acValues.length === 0 && ppValues.length === 0 && ttp === null) {
      return null
    }

    // Calcular nota AC (média dos valores disponíveis)
    const acAvg = acValues.length > 0 
      ? acValues.reduce((sum, v) => sum + v, 0) / acValues.length 
      : 0
    
    const ttpVal = ttp ?? 0
    
    // MAC = ((média AC) + TTP) / 2
    const mac = (acAvg + ttpVal) / 2
    
    // Média = round((MAC + PP1 + PP2) / 3)
    // Se PP1 ou PP2 for null, são excluídos da média
    const ppSum = ppValues.reduce((sum, v) => sum + v, 0)
    const ppCount = ppValues.length
    const totalComponents = 1 + ppCount // MAC counts as 1 component
    
    const media = arredondarNota((mac + ppSum) / totalComponents)

    // Considerar dispensa (nota_dispensa = 14)
    if (media !== null && media >= 14) return { nota: media, tipo: "Dispensado", is_provisional: false }

    if (exame != null && media !== null) {
      const notaFinal = arredondarNota((media + exame) / 2)
      return { nota: notaFinal, tipo: "Com Exame", is_provisional: false }
    }

    // Sem exame ainda (provisional)
    return { nota: media, tipo: "Parcial", is_provisional: true }
  }

  const preview = calcularPreview()

  async function handleSave() {
    setSaving(true)
    try {
      let idNota = nota.id_nota

      // Se a nota ainda não existe na BD, criar primeiro
      if (idNota == null) {
        const createRes = await fetch(`/api/gestor/estudantes/${idEstudante}/notas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_disciplina: nota.id_disciplina,
            ano_lectivo,
            semestre: nota.semestre,
          }),
        })
        if (!createRes.ok) {
          const err = await createRes.json()
          alert(err.error || "Erro ao criar registo de nota")
          setSaving(false)
          return
        }
        const { id_nota } = await createRes.json()
        idNota = id_nota
      }

      // Agora fazer PUT para preencher os valores
      const res = await fetch(`/api/gestor/estudantes/${idEstudante}/notas/${idNota}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        const actualizada = await res.json()
        onSave(actualizada)
      } else {
        alert("Erro ao salvar nota")
      }
    } catch {
      alert("Erro de conexão")
    } finally {
      setSaving(false)
    }
  }

  function handleChange(campo: string, valor: string) {
    const num = valor === "" ? null : Math.min(20, Math.max(0, parseFloat(valor) || 0))
    // Recurso e exame_especial têm max 12
    if ((campo === "recurso" || campo === "exame_especial") && num != null && num > 12) return
    setFormData(prev => ({ ...prev, [campo]: num }))
  }

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: "#1e2230",
        borderRadius: "16px",
        padding: "24px",
        width: "500px",
        maxWidth: "90vw",
        maxHeight: "90vh",
        overflow: "auto",
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 4px 0", color: "#e8eaf0" }}>✏️ Editar Nota</h3>
        <div style={{ color: "#d0d7e8", fontSize: "13px", marginBottom: "16px" }}>
          {nota.disciplina} ({nota.codigo})
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          {(["ac1", "ac2", "ac3"] as const).map(campo => (
            <div key={campo}>
              <label style={{ fontSize: "11px", color: "#b0b8cf", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>
                {campo.toUpperCase()}
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={formData[campo] ?? ""}
                onChange={(e) => handleChange(campo, e.target.value)}
                style={{
                  width: "100%", padding: "8px",
                  background: "#0a0c12", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "6px", color: "white", fontSize: "13px"
                }}
              />
            </div>
          ))}
          <div>
            <label style={{ fontSize: "11px", color: "#b0b8cf", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>
              TTP
            </label>
            <input
              type="number" step="0.1" min="0" max="20"
              value={formData.ttp ?? ""}
              onChange={(e) => handleChange("ttp", e.target.value)}
              style={{
                width: "100%", padding: "8px",
                background: "#0a0c12", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "6px", color: "white", fontSize: "13px"
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "#b0b8cf", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>
              PP1
            </label>
            <input
              type="number" step="0.1" min="0" max="20"
              value={formData.pp1 ?? ""}
              onChange={(e) => handleChange("pp1", e.target.value)}
              style={{
                width: "100%", padding: "8px",
                background: "#0a0c12", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "6px", color: "white", fontSize: "13px"
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "#b0b8cf", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>
              PP2
            </label>
            <input
              type="number" step="0.1" min="0" max="20"
              value={formData.pp2 ?? ""}
              onChange={(e) => handleChange("pp2", e.target.value)}
              style={{
                width: "100%", padding: "8px",
                background: "#0a0c12", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "6px", color: "white", fontSize: "13px"
              }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          <div>
            <label style={{ fontSize: "11px", color: "#f0a500", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>
              Exame
            </label>
            <input
              type="number" step="0.1" min="0" max="20"
              value={formData.exame ?? ""}
              onChange={(e) => handleChange("exame", e.target.value)}
              style={{
                width: "100%", padding: "8px",
                background: "#0a0c12", border: "1px solid rgba(240,165,0,0.3)",
                borderRadius: "6px", color: "white", fontSize: "13px"
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "#e03d3d", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>
              Recurso (max 12)
            </label>
            <input
              type="number" step="0.1" min="0" max="12"
              value={formData.recurso ?? ""}
              onChange={(e) => handleChange("recurso", e.target.value)}
              style={{
                width: "100%", padding: "8px",
                background: "#0a0c12", border: "1px solid rgba(224,61,61,0.3)",
                borderRadius: "6px", color: "white", fontSize: "13px"
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "#9b59b6", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>
              Ex. Especial (max 12)
            </label>
            <input
              type="number" step="0.1" min="0" max="12"
              value={formData.exame_especial ?? ""}
              onChange={(e) => handleChange("exame_especial", e.target.value)}
              style={{
                width: "100%", padding: "8px",
                background: "#0a0c12", border: "1px solid rgba(155,89,182,0.3)",
                borderRadius: "6px", color: "white", fontSize: "13px"
              }}
            />
          </div>
        </div>

        {/* Preview da nota final */}
        <div style={{
          background: "#13161e",
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ color: "#d0d7e8", fontSize: "13px" }}>Pré-visualização:</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {preview?.is_provisional && (
              <span style={{
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: "600",
                background: "rgba(240,165,0,0.15)",
                color: "#f0a500",
              }}>
                ⚠ Provisório
              </span>
            )}
            <span style={{
              fontWeight: "700",
              fontSize: "18px",
              color: preview && preview.nota !== null
                ? (preview.nota >= 10 ? "#22c55e" : "#e03d3d")
                : "#b0b8cf",
            }}>
              {preview ? `${preview.nota} (${preview.tipo})` : "— (incompleto)"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#d0d7e8",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 24px",
              background: saving ? "#b0b8cf" : "#2dd4bf",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontWeight: "600",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "A guardar..." : "💾 Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EstudantesDashboard() {
  const [estudantes, setEstudantes] = useState<EstudanteResumo[]>([])
  const [estudanteSelecionado, setEstudanteSelecionado] = useState<EstudanteDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null)
  const [filtroSemestre, setFiltroSemestre] = useState<string | null>(null)

  // Estado para modal de edição
  const [notaEditando, setNotaEditando] = useState<NotaDetalhe | null>(null)

  // Estado para orientador
  type OrientadorInfo = {
    id_solicitacao: number
    id_orientador: number
    nome: string
    especialidade: string
    gestor_assigned: boolean
  }
  type OrientadorDisponivel = {
    id_orientador: number
    nome: string
    especialidade: string
    e_gestor: boolean
  }
  const [orientadorAtual, setOrientadorAtual] = useState<OrientadorInfo | null>(null)
  const [orientadoresDisponiveis, setOrientadoresDisponiveis] = useState<OrientadorDisponivel[]>([])
  const [showOrientadorModal, setShowOrientadorModal] = useState(false)
  const [orientadorSelecionadoId, setOrientadorSelecionadoId] = useState<number>(0)
  const [atribuindoOrientador, setAtribuindoOrientador] = useState(false)
  const [loadingOrientador, setLoadingOrientador] = useState(false)
  const [podeAtribuir, setPodeAtribuir] = useState(false)
  const [motivosBloqueio, setMotivosBloqueio] = useState<string[]>([])

  // Filtros
  const [todosCursos, setTodosCursos] = useState<string[]>([])
  const [filtroCurso, setFiltroCurso] = useState<string>("")
  const [filtroAno, setFiltroAno] = useState<string>("todos")
  const [filtroTurno, setFiltroTurno] = useState<string>("todos")
  const [pesquisa, setPesquisa] = useState("")
  const [tipoPesquisa, setTipoPesquisa] = useState<"numero" | "nome">("numero")

  useEffect(() => {
    const params = new URLSearchParams()
    if (filtroCurso) params.set("curso", filtroCurso)
    if (pesquisa) params.set("pesquisa", pesquisa)
    params.set("tipoPesquisa", tipoPesquisa)

    fetch(`/api/gestor/estudantes?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        setEstudantes(data.estudantes)
        // Only set todosCursos once on initial load (not on filter changes)
        if (todosCursos.length === 0) {
          const cursosUnicos = [...new Set(data.estudantes.map((e: EstudanteResumo) => e.curso))] as string[]
          setTodosCursos(cursosUnicos)
        }
        setLoading(false)
      })
      .catch(() => {
        setEstudantes([])
        setLoading(false)
      })
  }, [filtroCurso, pesquisa, tipoPesquisa])

  const carregarDetalhe = useCallback(async (id: number) => {
    setLoadingDetalhe(true)
    setEstudanteSelecionado(null)
    setAnoSelecionado(null)
    setFiltroSemestre(null)
    try {
      const res = await fetch(`/api/gestor/estudantes/${id}`)
      if (res.ok) {
        const data = await res.json()
        setEstudanteSelecionado(data)
        // Selecionar o ano actual por defeito
        if (data.ano_current) {
          setAnoSelecionado(data.ano_current)
        }
      }
    } catch {
      console.error("Erro ao carregar detalhes")
    } finally {
      setLoadingDetalhe(false)
    }
  }, [])

  function selecionarEstudante(est: EstudanteResumo) {
    // Toggle: if same student, close the sidebar
    if (estudanteSelecionado?.id_estudante === est.id_estudante) {
      setEstudanteSelecionado(null)
      setAnoSelecionado(null)
      setFiltroSemestre(null)
      return
    }
    carregarDetalhe(est.id_estudante)
    carregarOrientador(est.id_estudante)
  }

  async function carregarOrientador(idEstudante: number) {
    setLoadingOrientador(true)
    setOrientadorAtual(null)
    try {
      const res = await fetch(`/api/gestor/estudantes/${idEstudante}/orientador`)
      if (res.ok) {
        const data = await res.json()
        setOrientadorAtual(data.currentOrientador)
        setOrientadoresDisponiveis(data.orientadoresDisponiveis || [])
        setPodeAtribuir(data.podeAtribuir ?? false)
        setMotivosBloqueio(data.motivosBloqueio ?? [])
      }
    } catch {
      console.error("Erro ao carregar orientador")
    } finally {
      setLoadingOrientador(false)
    }
  }

  async function atribuirOrientador() {
    if (!estudanteSelecionado || !orientadorSelecionadoId) return
    setAtribuindoOrientador(true)
    try {
      const res = await fetch(`/api/gestor/estudantes/${estudanteSelecionado.id_estudante}/orientador`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_orientador: orientadorSelecionadoId }),
      })
      if (res.ok) {
        setShowOrientadorModal(false)
        setOrientadorSelecionadoId(0)
        await carregarOrientador(estudanteSelecionado.id_estudante)
      } else {
        const data = await res.json()
        alert(data.error || "Erro ao atribuir orientador")
      }
    } catch {
      alert("Erro ao atribuir orientador")
    } finally {
      setAtribuindoOrientador(false)
    }
  }

  async function removerOrientador() {
    if (!estudanteSelecionado) return
    if (!confirm("Tem certeza que deseja remover o orientador deste estudante?")) return
    try {
      const res = await fetch(`/api/gestor/estudantes/${estudanteSelecionado.id_estudante}/orientador`, {
        method: "DELETE",
      })
      if (res.ok) {
        await carregarOrientador(estudanteSelecionado.id_estudante)
      } else {
        const data = await res.json()
        alert(data.error || "Erro ao remover orientador")
      }
    } catch {
      alert("Erro ao remover orientador")
    }
  }

  async function handleNotaSave(_notaActualizada: NotaDetalhe) {
    // Buscar dados frescos da BD sem limpar o estado primeiro,
    // para manter o ano/semestre que o utilizador está a ver
    if (!estudanteSelecionado) return
    setNotaEditando(null)
    try {
      const res = await fetch(`/api/gestor/estudantes/${estudanteSelecionado.id_estudante}`)
      if (res.ok) {
        const data = await res.json()
        // Preserva o ano selecionado actual (não força ano_current)
        const anoAtual = anoSelecionado
        setEstudanteSelecionado(data)
        setAnoSelecionado(anoAtual)
      }
    } catch {
      console.error("Erro ao recarregar dados do estudante")
    }
  }

  function getStatusColor(estado: string) {
    switch (estado) {
      case "EmCurso": return "#22c55e"
      case "Finalizado": return "#2dd4bf"
      case "Desistente": return "#e03d3d"
      default: return "#b0b8cf"
    }
  }

  function getPagamentoColor(pagamento: string) {
    switch (pagamento) {
      case "Pago": return "#22c55e"
      case "Pendente": return "#f0a500"
      default: return "#b0b8cf"
    }
  }

  // Disciplinas do ano selecionado
  const anoAtual = estudanteSelecionado?.anos_curriculares.find(a => a.ano === anoSelecionado)
  const disciplinasFiltradas = anoAtual
    ? [
        ...anoAtual.semestres.S1.map(n => ({ ...n, semestre: "S1" })),
        ...anoAtual.semestres.S2.map(n => ({ ...n, semestre: "S2" })),
      ].filter(d => !filtroSemestre || d.semestre === filtroSemestre)
    : []

  // Filtered student list based on all filters (client-side)
  const estudantesFiltrados = useMemo(() => {
    return estudantes.filter(e => {
      if (filtroCurso && e.curso !== filtroCurso) return false
      if (filtroAno !== "todos" && e.ano_current !== parseInt(filtroAno)) return false
      if (filtroTurno !== "todos" && e.turno !== filtroTurno) return false
      return true
    })
  }, [estudantes, filtroCurso, filtroAno, filtroTurno])

  // Filter options derived from the FULL (unfiltered) student list
  const anosDisponiveis = useMemo(() => {
    const anos = [...new Set(estudantes.map(e => e.ano_current).filter(Boolean))] as number[]
    return anos.sort((a, b) => a - b)
  }, [estudantes])

  const turnosDisponiveis = useMemo(() => {
    const turnos = [...new Set(estudantes.map(e => e.turno).filter(Boolean))] as string[]
    return turnos.sort()
  }, [estudantes])

  const totalEstudantes = estudantesFiltrados.length
  const estudantesAtivos = estudantesFiltrados.filter(e => e.estado === "EmCurso").length
  const pagamentoPendente = estudantesFiltrados.filter(e => e.pagamento === "Pendente").length

  return (
    <DashboardLayout
      navItems={gestorNavItems}
      title="Estudantes - Gestor"
      subtitle="Gestão de estudantes do departamento"
    >
      {/* Filtros */}
      <div style={{
        background: "#1e2230",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        padding: "16px",
        marginBottom: "16px"
      }}>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", color: "#d0d7e8", textTransform: "uppercase" }}>Curso</label>
            <select
              value={filtroCurso}
              onChange={(e) => setFiltroCurso(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "#13161e",
                color: "#e8eaf0",
                fontSize: "12px"
              }}
            >
              <option value="">Todos</option>
              {todosCursos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", color: "#d0d7e8", textTransform: "uppercase" }}>Ano</label>
            <select
              value={filtroAno}
              onChange={(e) => setFiltroAno(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "#13161e",
                color: "#e8eaf0",
                fontSize: "12px"
              }}
            >
              <option value="todos">Todos</option>
              {anosDisponiveis.map(ano => (
                <option key={ano} value={ano}>{ano}º Ano</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", color: "#d0d7e8", textTransform: "uppercase" }}>Turno</label>
            <select
              value={filtroTurno}
              onChange={(e) => setFiltroTurno(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "#13161e",
                color: "#e8eaf0",
                fontSize: "12px"
              }}
            >
              <option value="todos">Todos</option>
              {turnosDisponiveis.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: "200px" }}>
            <label style={{ fontSize: "11px", color: "#d0d7e8", textTransform: "uppercase" }}>Pesquisar</label>
            <div style={{ display: "flex", gap: "4px" }}>
              <select
                value={tipoPesquisa}
                onChange={(e) => setTipoPesquisa(e.target.value as "numero" | "nome")}
                style={{
                  padding: "8px",
                  borderRadius: "6px 0 0 6px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "#13161e",
                  color: "#e8eaf0",
                  fontSize: "11px"
                }}
              >
                <option value="numero">Nº Estudante</option>
                <option value="nome">Nome</option>
              </select>
              <input
                type="text"
                placeholder={tipoPesquisa === "numero" ? "Ex: 20240001" : "Ex: João Silva"}
                value={pesquisa}
                onChange={(e) => {
                  const raw = e.target.value
                  if (tipoPesquisa === "numero") {
                    // Only allow digits
                    const filtered = raw.replace(/\D/g, "")
                    setPesquisa(filtered)
                  } else {
                    // Only allow letters, spaces, and accented characters
                    const filtered = raw.replace(/[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]/g, "")
                    setPesquisa(filtered)
                  }
                }}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "0 6px 6px 0",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "#13161e",
                  color: "#e8eaf0",
                  fontSize: "12px"
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "16px",
        marginBottom: "24px"
      }}>
        {[
          { label: "Total Estudantes", value: totalEstudantes, color: "#2dd4bf" },
          { label: "Estudantes Ativos", value: estudantesAtivos, color: "#22c55e" },
          { label: "Propina Pendente", value: pagamentoPendente, color: "#f0a500" },
          { label: "Ano Lectivo", value: "2025/2026", color: "#9b59b6" },
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
            }}>{loading ? "..." : s.value}</div>
          </div>
        ))}
      </div>

      {/* Lista de Estudantes */}
      <div style={{
        display: "grid",
        gridTemplateColumns: estudanteSelecionado ? "1fr 2fr" : "1fr",
        gap: "16px",
        alignItems: "flex-start",
      }}>
        {/* Coluna da lista */}
        <div style={{
          background: "#1e2230",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px",
          padding: "20px",
        }}>
          <div style={{
            fontSize: "14px",
            fontWeight: "600",
            marginBottom: "16px",
            color: "#e8eaf0"
          }}>Estudantes do Departamento</div>

          {loading ? (
            <div style={{ textAlign: "center", color: "#b0b8cf", padding: "30px" }}>A carregar...</div>
          ) : estudantes.length === 0 ? (
            <div style={{ textAlign: "center", color: "#b0b8cf", padding: "30px" }}>
              Nenhum estudante encontrado
            </div>
          ) : (
            <div id="lista-estudantes" style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "500px", overflow: "auto", scrollbarWidth: "thin", scrollbarColor: "#2a2f3d #1e2230" }}>
              <style>{`
                #lista-estudantes::-webkit-scrollbar { width: 6px; }
                #lista-estudantes::-webkit-scrollbar-track { background: #1e2230; border-radius: 3px; }
                #lista-estudantes::-webkit-scrollbar-thumb { background: #2a2f3d; border-radius: 3px; }
                #lista-estudantes::-webkit-scrollbar-thumb:hover { background: #3a3f4d; }
              `}</style>
              {estudantesFiltrados.map(e => (
                <div 
                  key={e.id_estudante} 
                  onClick={() => selecionarEstudante(e)}
                  style={{
                    background: estudanteSelecionado?.id_estudante === e.id_estudante ? "rgba(45,212,191,0.1)" : "#13161e",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    cursor: "pointer",
                    border: estudanteSelecionado?.id_estudante === e.id_estudante ? "1px solid #2dd4bf" : "1px solid transparent"
                  }}
                >
                  <div style={{ color: "#e8eaf0", fontSize: "13px", fontWeight: "500" }}>{e.nome}</div>
                  <div style={{ color: "#b0b8cf", fontSize: "11px", marginTop: "2px" }}>
                    {e.numero_estudante} · {e.curso} · {e.ano_current}º Ano
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                    <span style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: "600",
                      background: `${getStatusColor(e.estado)}20`,
                      color: getStatusColor(e.estado)
                    }}>
                      {e.estado}
                    </span>
                    <span style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: "600",
                      background: `${getPagamentoColor(e.pagamento)}20`,
                      color: getPagamentoColor(e.pagamento)
                    }}>
                      {e.pagamento}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna de detalhes */}
        {estudanteSelecionado && (
          <div>
            {/* Info do estudante */}
            <div style={{
              background: "#1e2230",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px",
              padding: "20px",
              marginBottom: "16px",
            }}>
              {loadingDetalhe ? (
                <div style={{ textAlign: "center", color: "#b0b8cf", padding: "20px" }}>A carregar detalhes...</div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "#e8eaf0" }}>
                        {estudanteSelecionado.nome}
                      </div>
                      <div style={{ color: "#b0b8cf", fontSize: "12px", marginTop: "4px" }}>
                        {estudanteSelecionado.numero_estudante} · {estudanteSelecionado.curso.nome}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: "rgba(45,212,191,0.1)",
                        color: "#2dd4bf",
                      }}>
                        {estudanteSelecionado.turno}
                      </span>
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: `${getStatusColor(estudanteSelecionado.estado)}20`,
                        color: getStatusColor(estudanteSelecionado.estado),
                      }}>
                        {estudanteSelecionado.estado}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "12px", color: "#d0d7e8" }}>
                    <span>📚 {estudanteSelecionado.ano_current}º Ano</span>
                    <span>🎓 {estudanteSelecionado.curso.duracao_anos} anos</span>
                    <span>💳 {estudanteSelecionado.pagamento}</span>
                    {estudanteSelecionado.tipo_bolsa !== "Nenhuma" && (
                      <span>🎁 Bolsa {estudanteSelecionado.tipo_bolsa}%</span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Orientador Section */}
            <div style={{
              background: "#1e2230",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px",
              padding: "20px",
              marginBottom: "16px",
            }}>
              <div style={{
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "12px",
                color: "#e8eaf0"
              }}>Orientador</div>

              {loadingOrientador ? (
                <div style={{ textAlign: "center", color: "#b0b8cf", padding: "16px" }}>A carregar orientador...</div>
              ) : orientadorAtual ? (
                <div style={{
                  background: "#13161e",
                  borderRadius: "10px",
                  padding: "14px",
                  border: "1px solid rgba(255,255,255,0.05)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ color: "#e8eaf0", fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
                        {orientadorAtual.nome}
                        {orientadorAtual.gestor_assigned && (
                          <span title="Atribuido pelo gestor" style={{ marginLeft: "6px", fontSize: "12px" }}>🔹</span>
                        )}
                      </div>
                      <div style={{ color: "#b0b8cf", fontSize: "12px" }}>
                        {orientadorAtual.especialidade}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => { setOrientadorSelecionadoId(0); setShowOrientadorModal(true) }}
                        style={{
                          padding: "6px 12px",
                          background: "rgba(240,165,0,0.15)",
                          border: "1px solid rgba(240,165,0,0.3)",
                          borderRadius: "6px",
                          color: "#f0a500",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        Alterar
                      </button>
                      <button
                        onClick={removerOrientador}
                        style={{
                          padding: "6px 12px",
                          background: "rgba(224,61,61,0.15)",
                          border: "1px solid rgba(224,61,61,0.3)",
                          borderRadius: "6px",
                          color: "#e03d3d",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {!podeAtribuir && motivosBloqueio.length > 0 && (
                    <div style={{
                      background: "rgba(240,165,0,0.1)",
                      border: "1px solid rgba(240,165,0,0.3)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      marginBottom: "12px",
                      fontSize: "11px",
                      color: "#f0a500",
                    }}>
                      {motivosBloqueio.map((motivo, idx) => (
                        <div key={idx} style={{ marginBottom: idx < motivosBloqueio.length - 1 ? "4px" : 0 }}>
                          ⚠️ {motivo}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ color: "#b0b8cf", fontSize: "13px", marginBottom: "12px", textAlign: "center" }}>
                    Nenhum orientador atribuido
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <button
                      onClick={() => { setOrientadorSelecionadoId(0); setShowOrientadorModal(true) }}
                      disabled={!podeAtribuir}
                      title={!podeAtribuir ? motivosBloqueio.join("; ") : ""}
                      style={{
                        padding: "8px 16px",
                        background: podeAtribuir ? "#2dd4bf" : "#b0b8cf",
                        border: "none",
                        borderRadius: "6px",
                        color: podeAtribuir ? "#0a0c12" : "#d0d7e8",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: podeAtribuir ? "pointer" : "not-allowed",
                      }}
                    >
                      Atribuir Orientador
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs de anos curriculares */}
            {estudanteSelecionado.anos_curriculares.length > 0 && (
              <div style={{
                background: "#1e2230",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "14px",
                padding: "20px",
              }}>
                <div style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "12px",
                  color: "#e8eaf0"
                }}>
                  Percurso Académico
                </div>

                {/* Tabs de anos */}
                <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
                  {estudanteSelecionado.anos_curriculares.map(a => {
                    const isCurrent = a.ano === estudanteSelecionado.ano_current
                    return (
                      <button
                        key={a.ano}
                        onClick={() => { setAnoSelecionado(a.ano); setFiltroSemestre(null) }}
                        style={{
                          padding: "6px 16px",
                          borderRadius: "8px",
                          border: "none",
                          cursor: "pointer",
                          background: anoSelecionado === a.ano ? "#2dd4bf" : isCurrent ? "rgba(45,212,191,0.15)" : "#13161e",
                          color: anoSelecionado === a.ano ? "#0a0c12" : isCurrent ? "#2dd4bf" : "#d0d7e8",
                          fontWeight: anoSelecionado === a.ano ? "700" : "500",
                          fontSize: "13px",
                        }}
                      >
                        {a.ano}º Ano {isCurrent ? "●" : ""}
                        <div style={{ fontSize: "9px", opacity: 0.7 }}>{a.ano_lectivo}</div>
                      </button>
                    )
                  })}
                </div>

                {/* Filtro de semestre */}
                <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
                  {(["S1", "S2"] as const).map(sem => {
                    const temDisciplinas = anoAtual && (
                      (sem === "S1" && anoAtual.semestres.S1.length > 0) ||
                      (sem === "S2" && anoAtual.semestres.S2.length > 0)
                    )
                    if (!temDisciplinas) return null
                    return (
                      <button
                        key={sem}
                        onClick={() => setFiltroSemestre(filtroSemestre === sem ? null : sem)}
                        style={{
                          padding: "4px 12px",
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
                    )
                  })}
                </div>

                {/* Tabela de disciplinas */}
                {disciplinasFiltradas.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#b0b8cf", padding: "20px" }}>
                    Nenhuma disciplina encontrada para este ano/semestre
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                          <th style={{ textAlign: "left", padding: "8px", color: "#b0b8cf", fontSize: "10px", textTransform: "uppercase" }}>Disciplina</th>
                          <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>Sem</th>
                          <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>AC1</th>
                          <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>AC2</th>
                          <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>AC3</th>
                          <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>TTP</th>
                          <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>PP1</th>
                          <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>PP2</th>
                          <th style={{ textAlign: "center", padding: "8px", color: "#f0a500", fontSize: "10px" }}>Exame</th>
                          <th style={{ textAlign: "center", padding: "8px", color: "#e03d3d", fontSize: "10px" }}>Rec</th>
                          <th style={{ textAlign: "center", padding: "8px", color: "#9b59b6", fontSize: "10px" }}>Ex.Esp</th>
                          <th style={{ textAlign: "center", padding: "8px", color: "#e8eaf0", fontSize: "10px" }}>Final</th>
                          <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>Estado</th>
                          <th style={{ textAlign: "center", padding: "8px", color: "#b0b8cf", fontSize: "10px" }}>Acção</th>
                        </tr>
                      </thead>
                      <tbody>
                        {disciplinasFiltradas.map((n, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "8px" }}>
                              <div style={{ color: "#e8eaf0", fontWeight: "500" }}>{n.disciplina}</div>
                              <div style={{ color: "#b0b8cf", fontSize: "10px" }}>{n.codigo}</div>
                            </td>
                            <td style={{ textAlign: "center", padding: "8px", color: "#d0d7e8" }}>{n.semestre}</td>
                            <td style={{ textAlign: "center", padding: "8px", color: n.ac1 != null ? "#e8eaf0" : "#b0b8cf" }}>{n.ac1 != null ? arredondarNota(n.ac1) : "—"}</td>
                            <td style={{ textAlign: "center", padding: "8px", color: n.ac2 != null ? "#e8eaf0" : "#b0b8cf" }}>{n.ac2 != null ? arredondarNota(n.ac2) : "—"}</td>
                            <td style={{ textAlign: "center", padding: "8px", color: n.ac3 != null ? "#e8eaf0" : "#b0b8cf" }}>{n.ac3 != null ? arredondarNota(n.ac3) : "—"}</td>
                            <td style={{ textAlign: "center", padding: "8px", color: n.ttp != null ? "#e8eaf0" : "#b0b8cf" }}>{n.ttp != null ? arredondarNota(n.ttp) : "—"}</td>
                            <td style={{ textAlign: "center", padding: "8px", color: n.pp1 != null ? "#e8eaf0" : "#b0b8cf" }}>{n.pp1 != null ? arredondarNota(n.pp1) : "—"}</td>
                            <td style={{ textAlign: "center", padding: "8px", color: n.pp2 != null ? "#e8eaf0" : "#b0b8cf" }}>{n.pp2 != null ? arredondarNota(n.pp2) : "—"}</td>
                            <td style={{ textAlign: "center", padding: "8px", color: n.exame != null ? "#f0a500" : "#b0b8cf" }}>
                              {n.exame != null ? arredondarNota(n.exame) : "—"}
                            </td>
                            <td style={{ textAlign: "center", padding: "8px", color: n.recurso != null ? "#e03d3d" : "#b0b8cf" }}>
                              {n.recurso != null ? arredondarNota(n.recurso) : "—"}
                            </td>
                            <td style={{ textAlign: "center", padding: "8px", color: n.exame_especial != null ? "#9b59b6" : "#b0b8cf" }}>
                              {n.exame_especial != null ? arredondarNota(n.exame_especial) : "—"}
                            </td>
                            <td style={{ textAlign: "center", padding: "8px" }}>
                              <span style={{
                                fontWeight: "700",
                                color: n.nota_final != null 
                                  ? (n.nota_final >= 10 ? "#22c55e" : "#e03d3d")
                                  : "#b0b8cf"
                              }}>
                                {n.nota_final != null ? arredondarNota(n.nota_final) : "—"}
                              </span>
                            </td>
                            <td style={{ textAlign: "center", padding: "8px" }}>
                              <span style={{
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "9px",
                                fontWeight: "600",
                                background: n.aprovado === null 
                                  ? "rgba(85,94,120,0.2)" 
                                  : n.aprovado 
                                    ? "rgba(34,197,94,0.2)" 
                                    : "rgba(224,61,61,0.2)",
                                color: n.aprovado === null 
                                  ? "#b0b8cf" 
                                  : n.aprovado 
                                    ? "#22c55e" 
                                    : "#e03d3d"
                              }}>
                                {n.dispensada ? "Dispensado" : n.aprovado === null ? "Em Curso" : n.aprovado ? "Aprovado" : "Reprovado"}
                              </span>
                            </td>
                            <td style={{ textAlign: "center", padding: "8px" }}>
                              <button
                                onClick={() => setNotaEditando(n)}
                                style={{
                                  padding: "4px 8px",
                                  background: "rgba(240,165,0,0.15)",
                                  border: "1px solid rgba(240,165,0,0.3)",
                                  borderRadius: "6px",
                                  color: "#f0a500",
                                  fontSize: "10px",
                                  cursor: "pointer",
                                }}
                              >
                                ✏️ Editar
                              </button>
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
        )}
      </div>

      {/* Modal de edição */}
      {notaEditando && estudanteSelecionado && anoAtual && (
        <ModalEditarNota
          nota={notaEditando}
          idEstudante={estudanteSelecionado.id_estudante}
          ano_lectivo={anoAtual.ano_lectivo}
          onClose={() => setNotaEditando(null)}
          onSave={handleNotaSave}
        />
      )}

      {/* Modal de atribuição de orientador */}
      {showOrientadorModal && estudanteSelecionado && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => setShowOrientadorModal(false)}>
          <div style={{
            background: "#1e2230",
            borderRadius: "16px",
            padding: "24px",
            width: "450px",
            maxWidth: "90vw",
            maxHeight: "90vh",
            overflow: "auto",
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 4px 0", color: "#e8eaf0" }}>Atribuir Orientador</h3>
            <div style={{ color: "#d0d7e8", fontSize: "13px", marginBottom: "16px" }}>
              {estudanteSelecionado.nome} ({estudanteSelecionado.curso.nome})
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{
                fontSize: "11px",
                color: "#d0d7e8",
                textTransform: "uppercase",
                marginBottom: "4px",
                display: "block"
              }}>Selecione o Orientador</label>
              <select
                value={orientadorSelecionadoId}
                onChange={(e) => setOrientadorSelecionadoId(parseInt(e.target.value))}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#0a0c12",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#e8eaf0",
                  fontSize: "13px"
                }}
              >
                <option value={0}>-- Selecione --</option>
                {orientadoresDisponiveis.map(o => (
                  <option key={o.id_orientador} value={o.id_orientador}>
                    {o.nome} ({o.especialidade}){o.e_gestor ? " [Gestor]" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowOrientadorModal(false)}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#d0d7e8",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={atribuirOrientador}
                disabled={!orientadorSelecionadoId || atribuindoOrientador}
                style={{
                  padding: "10px 24px",
                  background: !orientadorSelecionadoId || atribuindoOrientador ? "#b0b8cf" : "#2dd4bf",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  fontWeight: "600",
                  cursor: !orientadorSelecionadoId || atribuindoOrientador ? "not-allowed" : "pointer",
                }}
              >
                {atribuindoOrientador ? "A atribuir..." : "Confirmar Atribuição"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
