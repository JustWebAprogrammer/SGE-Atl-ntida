"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { gestorNavItems } from "../gestorNav"
import { arredondarNota } from "@/lib/notas"
import DatePickerPT from "../../components/DatePickerPT"

type Monografia = {
  id_monografia: number
  titulo: string
  estado: string
  nota_final: number | null
  nota_gestor: number | null
  feedback_gestor: string | null
  data_submissao: string | null
  data_defesa: string | null
  hora_defesa: string | null
  sala_defesa: string | null
  nome_co_orientador: string | null
  nome_co_autor: string | null
  caminho_arquivo: string | null
  nome_arquivo: string | null
  estudante: {
    id_estudante: number
    nome: string
    numero_estudante: string | null
    curso: string
  }
}

type PreProjeto = {
  id_premonografia: number
  titulo: string
  estado: string
  feedback: string | null
  data_submissao: string | null
  caminho_arquivo: string | null
  nome_arquivo: string | null
  estudante: {
    id_estudante: number
    nome: string
    numero_estudante: string | null
    curso: string
  }
}

export default function MonografiasDashboard() {
  const [monografias, setMonografias] = useState<Monografia[]>([])
  const [meusPreProjetos, setMeusPreProjetos] = useState<PreProjeto[]>([])
  const [minhasMonografias, setMinhasMonografias] = useState<Monografia[]>([])
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState<number | null>(null)
  const [editandoDefesa, setEditandoDefesa] = useState<number | null>(null)
  const [dataDefesa, setDataDefesa] = useState("")
  const [horaDefesa, setHoraDefesa] = useState("")
  // Pré-projecto evaluation
  const [avalPreId, setAvalPreId] = useState<number | null>(null)
  const [feedbackPre, setFeedbackPre] = useState("")
  const [processandoPre, setProcessandoPre] = useState<number | null>(null)
  const [salaDefesa, setSalaDefesa] = useState("")
  const [editandoDataHoraDefesa, setEditandoDataHoraDefesa] = useState<number | null>(null)
  const [dataDefesaEdit, setDataDefesaEdit] = useState("")
  const [horaDefesaEdit, setHoraDefesaEdit] = useState("")
  const [editandoNota, setEditandoNota] = useState<number | null>(null)
  const [notaFinal, setNotaFinal] = useState("")
  const [feedbackGestor, setFeedbackGestor] = useState("")

  // Filtros
  const [pesquisa, setPesquisa] = useState("")
  const [filtroCurso, setFiltroCurso] = useState<string | null>(null)
  const [abaActiva, setAbaActiva] = useState<"preprojetos" | "monografias" | "gestao">("gestao")

  useEffect(() => {
    fetch("/api/gestor/monografias")
      .then(r => r.json())
      .then(data => {
        setMonografias(data.monografias)
        setMeusPreProjetos(data.meusPreProjetos || [])
        setMinhasMonografias(data.minhasMonografias || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function agendarDefesa(idMonografia: number) {
    if (!dataDefesa) {
      alert("Selecione uma data de defesa")
      return
    }

    setProcessando(idMonografia)

    try {
      const res = await fetch(`/api/gestor/monografias/${idMonografia}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: "ParaDefender",
          data_defesa: dataDefesa,
          hora_defesa: horaDefesa || null,
          sala_defesa: salaDefesa || null
        }),
      })

      if (res.ok) {
        setMonografias(prev => prev.map(m =>
          m.id_monografia === idMonografia ? { ...m, estado: "ParaDefender", data_defesa: dataDefesa, hora_defesa: horaDefesa || null, sala_defesa: salaDefesa || null } : m
        ))
        setEditandoDefesa(null)
        setDataDefesa("")
        setHoraDefesa("")
        setSalaDefesa("")
      } else {
        const data = await res.json()
        alert(data.error || "Erro ao agendar defesa")
      }
    } catch {
      alert("Erro ao agendar defesa")
    } finally {
      setProcessando(null)
    }
  }

  async function atualizarSalaDefesa(idMonografia: number) {
    setProcessando(idMonografia)
    try {
      const res = await fetch(`/api/gestor/monografias/${idMonografia}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sala_defesa: salaDefesa }),
      })
      if (res.ok) {
        setMonografias(prev => prev.map(m =>
          m.id_monografia === idMonografia ? { ...m, sala_defesa: salaDefesa || null } : m
        ))
        setEditandoDefesa(null)
        setSalaDefesa("")
      }
    } catch {
      alert("Erro ao atualizar sala")
    } finally {
      setProcessando(null)
    }
  }

  async function avaliarPremonografia(id: number, estado: "Aprovado" | "Reprovado") {
    setProcessandoPre(id)
    try {
      const res = await fetch(`/api/gestor/premonografia/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, feedback: feedbackPre || null })
      })
      if (res.ok) {
        setMeusPreProjetos(prev => prev.map(p =>
          p.id_premonografia === id ? { ...p, estado, feedback: feedbackPre || null } : p
        ))
        setAvalPreId(null)
        setFeedbackPre("")
      } else {
        const d = await res.json()
        alert(d.error || "Erro ao avaliar pré-projecto")
      }
    } catch {
      alert("Erro de rede")
    } finally {
      setProcessandoPre(null)
    }
  }

  async function atualizarDataHoraDefesa(idMonografia: number) {
    if (!dataDefesaEdit) {
      alert("Selecione uma data de defesa")
      return
    }

    setProcessando(idMonografia)

    try {
      const res = await fetch(`/api/gestor/monografias/${idMonografia}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data_defesa: dataDefesaEdit,
          hora_defesa: horaDefesaEdit || null,
        }),
      })

      if (res.ok) {
        setMonografias(prev => prev.map(m =>
          m.id_monografia === idMonografia ? { ...m, data_defesa: dataDefesaEdit, hora_defesa: horaDefesaEdit || null } : m
        ))
        setEditandoDataHoraDefesa(null)
        setDataDefesaEdit("")
        setHoraDefesaEdit("")
      } else {
        const data = await res.json()
        alert(data.error || "Erro ao atualizar data/hora")
      }
    } catch {
      alert("Erro ao atualizar data/hora")
    } finally {
      setProcessando(null)
    }
  }

  async function atribuirNotaFinal(idMonografia: number) {
    if (!notaFinal) {
      alert("Insira a nota final")
      return
    }

    const nota = parseFloat(notaFinal)
    if (isNaN(nota) || nota < 0 || nota > 20) {
      alert("Nota deve ser entre 0 e 20")
      return
    }

    setProcessando(idMonografia)

    try {
      const res = await fetch(`/api/gestor/monografias/${idMonografia}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: "Defendida",
          nota_final: nota,
          feedback_gestor: feedbackGestor || null
        }),
      })

      if (res.ok) {
        setMonografias(prev => prev.map(m =>
          m.id_monografia === idMonografia ? { ...m, estado: "Defendida", nota_final: nota, feedback_gestor: feedbackGestor || null } : m
        ))
        setEditandoNota(null)
        setNotaFinal("")
        setFeedbackGestor("")
      } else {
        const data = await res.json()
        alert(data.error || "Erro ao atribuir nota")
      }
    } catch {
      alert("Erro ao atribuir nota")
    } finally {
      setProcessando(null)
    }
  }

  function getStatusColor(estado: string) {
    switch (estado) {
      case "Submetida": return "#2dd4bf"
      case "EmRevisao": return "#f0a500"
      case "Aprovada": return "#22c55e"
      case "ParaDefender": return "#9b59b6"
      case "Defendida": return "#22c55e"
      case "Rejeitada": return "#e03d3d"
      case "Proposto": return "#f0a500"
      case "Aprovado": return "#22c55e"
      case "Reprovado": return "#e03d3d"
      case "Cancelado": return "#b0b8cf"
      default: return "#b0b8cf"
    }
  }

  function getStatusText(estado: string) {
    switch (estado) {
      case "Submetida": return "Submetida"
      case "EmRevisao": return "Em Revisão"
      case "Aprovada": return "Aprovada"
      case "ParaDefender": return "Para Defender"
      case "Defendida": return "Defendida"
      case "Rejeitada": return "Rejeitada"
      case "Proposto": return "Proposto"
      case "Aprovado": return "Aprovado"
      case "Reprovado": return "Reprovado"
      case "Cancelado": return "Cancelado"
      default: return estado
    }
  }

  function handleDownload(caminho: string, nome: string, tipo: "monografia" | "premonografia" = "monografia") {
    const url = `/api/orientador/download?path=${encodeURIComponent(caminho)}&nome=${encodeURIComponent(nome)}&tipo=${tipo}`
    window.open(url, "_blank")
  }

  const total = monografias.length
  const submetidas = monografias.filter(m => m.estado === "Submetida").length
  const emRevisao = monografias.filter(m => m.estado === "EmRevisao").length
  const paraDefender = monografias.filter(m => m.estado === "ParaDefender").length

  return (
    <DashboardLayout
      navItems={gestorNavItems}
      title="Monografias - Gestor"
      subtitle="Gestão de monografias do departamento"
    >
      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "16px",
        marginBottom: "24px"
      }}>
        {[
          { label: "Total Monografias", value: total, color: "#2dd4bf" },
          { label: "Submetidas", value: submetidas, color: "#2dd4bf" },
          { label: "Em Revisão", value: emRevisao, color: "#f0a500" },
          { label: "Para Defender", value: paraDefender, color: "#9b59b6" },
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

      {/* Abas */}
      <div style={{
        display: "flex",
        gap: "8px",
        marginBottom: "16px"
      }}>
        <button
          onClick={() => setAbaActiva("preprojetos")}
          style={{
            padding: "10px 20px",
            background: abaActiva === "preprojetos" ? "#f0a500" : "#1e2230",
            color: abaActiva === "preprojetos" ? "#13161e" : "#e8eaf0",
            border: abaActiva === "preprojetos" ? "1px solid #f0a500" : "1px solid rgba(255,255,255,0.07)",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer"
          }}>
          📝 Pré-Projetos
        </button>
        <button
          onClick={() => setAbaActiva("monografias")}
          style={{
            padding: "10px 20px",
            background: abaActiva === "monografias" ? "#2dd4bf" : "#1e2230",
            color: abaActiva === "monografias" ? "#13161e" : "#e8eaf0",
            border: abaActiva === "monografias" ? "1px solid #2dd4bf" : "1px solid rgba(255,255,255,0.07)",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer"
          }}>
          📄 Monografias
        </button>
        <button
          onClick={() => setAbaActiva("gestao")}
          style={{
            padding: "10px 20px",
            background: abaActiva === "gestao" ? "#22c55e" : "#1e2230",
            color: abaActiva === "gestao" ? "#13161e" : "#e8eaf0",
            border: abaActiva === "gestao" ? "1px solid #22c55e" : "1px solid rgba(255,255,255,0.07)",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer"
          }}>
          🎯 Avaliação Final
        </button>
      </div>

       {/* Filtros */}
       <div style={{
         background: "#1e2230",
         border: "1px solid rgba(255,255,255,0.07)",
         borderRadius: "14px",
         padding: "16px",
         marginBottom: "16px"
       }}>
         <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
           <input
             type="text"
             placeholder="🔍 Procurar por nome ou número de estudante..."
             value={pesquisa}
             onChange={(e) => setPesquisa(e.target.value)}
             style={{
               flex: 1,
               minWidth: "250px",
               padding: "8px 12px",
               background: "#13161e",
               border: "1px solid rgba(255,255,255,0.1)",
               borderRadius: "8px",
               color: "#e8eaf0",
               fontSize: "13px"
             }}
           />

           <select
             value={filtroCurso ?? ""}
             onChange={(e) => setFiltroCurso(e.target.value || null)}
             style={{
               padding: "8px 12px",
               background: "#13161e",
               border: "1px solid rgba(255,255,255,0.1)",
               borderRadius: "8px",
               color: "#e8eaf0",
               fontSize: "13px",
               minWidth: "180px"
             }}>
             <option value="">Todos os Cursos</option>
             {Array.from(new Set(monografias.map(m => m.estudante.curso))).map(curso => (
               <option key={curso} value={curso}>{curso}</option>
             ))}
           </select>
         </div>
       </div>

       {/* Lista de Monografias */}
       <div style={{
         background: "#1e2230",
         border: "1px solid rgba(255,255,255,0.07)",
         borderRadius: "14px",
         padding: "20px"
       }}>
         <div style={{
           fontSize: "14px",
           fontWeight: "600",
           marginBottom: "16px",
           color: "#e8eaf0"
         }}>
           {abaActiva === "preprojetos" ? "Pré-Projetos dos Meus Tutorados" :
            abaActiva === "monografias" ? "Monografias dos Meus Tutorados (para Aprovar/Rejeitar)" :
            "Avaliação Final (Aprovadas, Para Defender, Defendidas)"}
         </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#b0b8cf", padding: "30px" }}>A carregar...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ textAlign: "left", padding: "10px", color: "#b0b8cf", fontSize: "11px", textTransform: "uppercase" }}>Estudante</th>
                  <th style={{ textAlign: "left", padding: "10px", color: "#b0b8cf", fontSize: "11px", textTransform: "uppercase" }}>Título</th>
                  <th style={{ textAlign: "center", padding: "10px", color: "#b0b8cf", fontSize: "11px" }}>Estado</th>
                  <th style={{ textAlign: "center", padding: "10px", color: "#b0b8cf", fontSize: "11px" }}>Co-autores</th>
                  <th style={{ textAlign: "center", padding: "10px", color: "#b0b8cf", fontSize: "11px" }}>Nota Final</th>
                  <th style={{ textAlign: "center", padding: "10px", color: "#b0b8cf", fontSize: "11px" }}>Data Defesa</th>
                  <th style={{ textAlign: "center", padding: "10px", color: "#b0b8cf", fontSize: "11px" }}>Sala</th>
                  <th style={{ textAlign: "center", padding: "10px", color: "#b0b8cf", fontSize: "11px" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(
                  abaActiva === "preprojetos" ? meusPreProjetos :
                  abaActiva === "monografias" ? minhasMonografias :
                  monografias
                )
                  .filter((item: Monografia | PreProjeto) => {
                    if (abaActiva === "gestao") {
                      if (!["Aprovada", "ParaDefender", "Defendida"].includes(item.estado)) return false
                    } else if (abaActiva === "monografias") {
                      if (!["EmRevisao"].includes(item.estado)) return false
                    }

                    if (pesquisa) {
                      const termo = pesquisa.toLowerCase().trim()
                      const nomeMatch = item.estudante.nome.toLowerCase().includes(termo)
                      const numeroMatch = item.estudante.numero_estudante?.toLowerCase().includes(termo)
                      if (!nomeMatch && !numeroMatch) return false
                    }

                    if (filtroCurso && item.estudante.curso !== filtroCurso) return false

                    return true
                  })
                  .map((item) => {
                    const isMonografia = 'id_monografia' in item
                    const key = isMonografia ? item.id_monografia : item.id_premonografia
                    const mono = isMonografia ? item as Monografia : null

                    return (
                  <tr key={key} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "10px" }}>
                      <div style={{ color: "#e8eaf0", fontSize: "13px", fontWeight: "500" }}>{item.estudante.nome}</div>
                      <div style={{ color: "#b0b8cf", fontSize: "11px" }}>{item.estudante.numero_estudante} · {item.estudante.curso}</div>
                    </td>
                    <td style={{ padding: "10px" }}>
                      <div style={{ color: "#e8eaf0", fontSize: "13px", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.titulo}</div>
                    </td>
                    <td style={{ textAlign: "center", padding: "10px" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: "600",
                        background: `${getStatusColor(item.estado)}20`,
                        color: getStatusColor(item.estado)
                      }}>
                        {getStatusText(item.estado)}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", padding: "10px" }}>
                      {'nome_co_orientador' in item && item.nome_co_orientador && (
                        <div style={{ fontSize: "11px", color: "#d0d7e8", marginBottom: "2px" }}>
                          Co-orientador: {item.nome_co_orientador}
                        </div>
                      )}
                      {'nome_co_autor' in item && item.nome_co_autor && (
                        <div style={{ fontSize: "11px", color: "#d0d7e8" }}>
                          Co-autor: {item.nome_co_autor}
                        </div>
                      )}
                      {(!('nome_co_orientador' in item) || (!item.nome_co_orientador && !item.nome_co_autor)) && (
                        <span style={{ color: "#b0b8cf", fontSize: "11px" }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center", padding: "10px" }}>
                      <span style={{
                        fontWeight: "700",
                        color: 'nota_final' in item && item.nota_final != null
                          ? (item.nota_final >= 10 ? "#22c55e" : "#e03d3d")
                          : "#b0b8cf"
                      }}>
                        {'nota_final' in item && item.nota_final != null ? arredondarNota(item.nota_final) : "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", padding: "10px" }}>
                      {mono && editandoDataHoraDefesa === mono.id_monografia && mono.estado === "ParaDefender" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                          <DatePickerPT
                            value={dataDefesaEdit}
                            onChange={setDataDefesaEdit}
                            min={new Date().toISOString().split("T")[0]}
                            style={{
                              padding: "4px 8px",
                              background: "#13161e",
                              border: "1px solid rgba(255,255,255,0.2)",
                              borderRadius: "4px",
                              color: "#e8eaf0",
                              fontSize: "11px",
                              width: "130px"
                            }}
                          />
                          <input
                            type="time"
                            value={horaDefesaEdit}
                            onChange={e => setHoraDefesaEdit(e.target.value)}
                            style={{
                              padding: "4px 8px",
                              background: "#13161e",
                              border: "1px solid rgba(255,255,255,0.2)",
                              borderRadius: "4px",
                              color: "#e8eaf0",
                              fontSize: "11px",
                              width: "130px"
                            }}
                          />
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              onClick={() => atualizarDataHoraDefesa(mono.id_monografia)}
                              disabled={processando === mono.id_monografia}
                              style={{
                                padding: "4px 8px",
                                background: processando === mono.id_monografia ? "#b0b8cf" : "#22c55e",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "10px",
                                fontWeight: "600",
                                cursor: processando === mono.id_monografia ? "not-allowed" : "pointer"
                              }}
                            >
                              {processando === mono.id_monografia ? "..." : "OK"}
                            </button>
                            <button
                              onClick={() => { setEditandoDataHoraDefesa(null); setDataDefesaEdit(""); setHoraDefesaEdit("") }}
                              style={{
                                padding: "4px 6px",
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
                        </div>
                      ) : mono && mono.estado === "ParaDefender" ? (
                        <div style={{ display: "flex", gap: "4px", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "#e8eaf0", fontSize: "12px" }}>
                            {mono.data_defesa ? new Date(mono.data_defesa).toLocaleDateString("pt-PT") + (mono.hora_defesa ? ` ${mono.hora_defesa}h` : "") : "—"}
                          </span>
                          <button
                            onClick={() => { setEditandoDataHoraDefesa(mono.id_monografia); setDataDefesaEdit(mono.data_defesa ? new Date(mono.data_defesa).toISOString().split("T")[0] : ""); setHoraDefesaEdit(mono.hora_defesa || "") }}
                            style={{
                              padding: "2px 6px",
                              background: "transparent",
                              border: "1px solid rgba(155,89,182,0.3)",
                              borderRadius: "4px",
                              color: "#9b59b6",
                              fontSize: "10px",
                              cursor: "pointer"
                            }}
                          >
                            ✏️
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#e8eaf0", fontSize: "12px" }}>
                          {mono?.data_defesa ? new Date(mono.data_defesa).toLocaleDateString("pt-PT") + (mono.hora_defesa ? ` ${mono.hora_defesa}h` : "") : "—"}
                        </span>
                      )}
                    </td>
                    {/* Sala column */}
                    <td style={{ textAlign: "center", padding: "10px" }}>
                      {mono && editandoDefesa === mono.id_monografia && (mono.estado === "ParaDefender" || mono.estado === "Defendida") ? (
                        <div style={{ display: "flex", gap: "4px", alignItems: "center", justifyContent: "center" }}>
                          <input
                            type="text"
                            placeholder="Sala"
                            value={salaDefesa}
                            onChange={e => setSalaDefesa(e.target.value)}
                            style={{
                              width: "80px",
                              padding: "4px 8px",
                              background: "#13161e",
                              border: "1px solid rgba(255,255,255,0.2)",
                              borderRadius: "4px",
                              color: "#e8eaf0",
                              fontSize: "11px"
                            }}
                          />
                          <button
                            onClick={() => atualizarSalaDefesa(mono.id_monografia)}
                            disabled={processando === mono.id_monografia}
                            style={{
                              padding: "4px 8px",
                              background: "#22c55e",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "10px",
                              fontWeight: "600",
                              cursor: "pointer"
                            }}
                          >
                            {processando === mono.id_monografia ? "..." : "OK"}
                          </button>
                          <button
                            onClick={() => { setEditandoDefesa(null); setSalaDefesa("") }}
                            style={{
                              padding: "4px 6px",
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
                      ) : mono && (mono.estado === "ParaDefender" || mono.estado === "Defendida") ? (
                        <div style={{ display: "flex", gap: "4px", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "#e8eaf0", fontSize: "12px" }}>{mono.sala_defesa || "—"}</span>
                          <button
                            onClick={() => { setEditandoDefesa(mono.id_monografia); setSalaDefesa(mono.sala_defesa || "") }}
                            style={{
                              padding: "2px 6px",
                              background: "transparent",
                              border: "1px solid rgba(45,212,191,0.3)",
                              borderRadius: "4px",
                              color: "#2dd4bf",
                              fontSize: "10px",
                              cursor: "pointer"
                            }}
                          >
                            ✏️
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#b0b8cf", fontSize: "11px" }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center", padding: "10px" }}>
                      {isMonografia && item.estado === "Submetida" && (
                        <button
                          onClick={() => {
                            if (confirm("Marcar esta monografia para revisão?")) {
                              fetch(`/api/gestor/monografias/${item.id_monografia}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ estado: "EmRevisao" }),
                              })
                              .then(r => r.json())
                              .then(() => {
                                setMonografias(prev => prev.map(m =>
                                  m.id_monografia === item.id_monografia ? { ...m, estado: "EmRevisao" } : m
                                ))
                                setMinhasMonografias(prev => prev.map(m =>
                                  m.id_monografia === item.id_monografia ? { ...m, estado: "EmRevisao" } : m
                                ))
                              })
                              .catch(() => alert("Erro ao iniciar revisão"))
                            }
                          }}
                          style={{
                            padding: "4px 8px",
                            background: "#f0a500",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer"
                          }}
                        >
                          Iniciar Revisão
                        </button>
                      )}
                      {isMonografia && item.estado === "EmRevisao" && (
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            onClick={() => {
                              if (confirm("Aprovar esta monografia?")) {
                                fetch(`/api/gestor/monografias/${item.id_monografia}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ estado: "Aprovada" }),
                                })
                                .then(r => r.json())
                                .then(() => {
                                  setMonografias(prev => prev.map(m =>
                                    m.id_monografia === item.id_monografia ? { ...m, estado: "Aprovada" } : m
                                  ))
                                  setMinhasMonografias(prev => prev.map(m =>
                                    m.id_monografia === item.id_monografia ? { ...m, estado: "Aprovada" } : m
                                  ))
                                })
                                .catch(() => alert("Erro ao aprovar"))
                              }
                            }}
                            style={{
                              padding: "4px 8px",
                              background: "#22c55e",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: "600",
                              cursor: "pointer"
                            }}
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Rejeitar esta monografia?")) {
                                fetch(`/api/gestor/monografias/${item.id_monografia}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ estado: "Rejeitada" }),
                                })
                                .then(r => r.json())
                                .then(() => {
                                  setMonografias(prev => prev.map(m =>
                                    m.id_monografia === item.id_monografia ? { ...m, estado: "Rejeitada" } : m
                                  ))
                                  setMinhasMonografias(prev => prev.map(m =>
                                    m.id_monografia === item.id_monografia ? { ...m, estado: "Rejeitada" } : m
                                  ))
                                })
                                .catch(() => alert("Erro ao rejeitar"))
                              }
                            }}
                            style={{
                              padding: "4px 8px",
                              background: "#e03d3d",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: "600",
                              cursor: "pointer"
                            }}
                          >
                            Rejeitar
                          </button>
                        </div>
                      )}
                      {isMonografia && item.estado === "Aprovada" && editandoDefesa !== item.id_monografia && (
                        <button
                          onClick={() => setEditandoDefesa(item.id_monografia)}
                          style={{
                            padding: "4px 8px",
                            background: "#9b59b6",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer"
                          }}
                        >
                          Agendar Defesa
                        </button>
                      )}
                      {isMonografia && item.estado === "Aprovada" && editandoDefesa === item.id_monografia && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                          <DatePickerPT
                            value={dataDefesa}
                            onChange={setDataDefesa}
                            min={new Date().toISOString().split("T")[0]}
                            style={{
                              padding: "4px 8px",
                              background: "#13161e",
                              border: "1px solid rgba(255,255,255,0.2)",
                              borderRadius: "4px",
                              color: "#e8eaf0",
                              fontSize: "11px",
                              width: "130px"
                            }}
                          />
                          <input
                            type="time"
                            value={horaDefesa}
                            onChange={e => setHoraDefesa(e.target.value)}
                            style={{
                              padding: "4px 8px",
                              background: "#13161e",
                              border: "1px solid rgba(255,255,255,0.2)",
                              borderRadius: "4px",
                              color: "#e8eaf0",
                              fontSize: "11px",
                              width: "130px"
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Sala (opcional)"
                            value={salaDefesa}
                            onChange={e => setSalaDefesa(e.target.value)}
                            style={{
                              padding: "4px 8px",
                              background: "#13161e",
                              border: "1px solid rgba(255,255,255,0.2)",
                              borderRadius: "4px",
                              color: "#e8eaf0",
                              fontSize: "11px",
                              width: "130px"
                            }}
                          />
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              onClick={() => agendarDefesa(item.id_monografia)}
                              disabled={processando === item.id_monografia}
                              style={{
                                padding: "4px 8px",
                                background: processando === item.id_monografia ? "#b0b8cf" : "#22c55e",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: "600",
                                cursor: processando === item.id_monografia ? "not-allowed" : "pointer"
                              }}
                            >
                              {processando === item.id_monografia ? "..." : "Confirmar"}
                            </button>
                            <button
                              onClick={() => { setEditandoDefesa(null); setDataDefesa(""); setHoraDefesa(""); setSalaDefesa("") }}
                              style={{
                                padding: "4px 8px",
                                background: "#b0b8cf",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: "600",
                                cursor: "pointer"
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                      {isMonografia && item.estado === "ParaDefender" && editandoNota !== item.id_monografia && (
                        <button
                          onClick={() => setEditandoNota(item.id_monografia)}
                          style={{
                            padding: "4px 8px",
                            background: "#22c55e",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer"
                          }}
                        >
                          Atribuir Nota
                        </button>
                      )}
                      {isMonografia && editandoNota === item.id_monografia && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            step="0.01"
                            value={notaFinal}
                            onChange={e => setNotaFinal(e.target.value)}
                            placeholder="Nota (0-20)"
                            style={{
                              width: "80px",
                              padding: "4px 8px",
                              background: "#13161e",
                              border: "1px solid rgba(255,255,255,0.2)",
                              borderRadius: "4px",
                              color: "#e8eaf0",
                              fontSize: "11px",
                              textAlign: "center"
                            }}
                          />
                          <textarea
                            value={feedbackGestor}
                            onChange={e => setFeedbackGestor(e.target.value)}
                            placeholder="Feedback (opcional)"
                            rows={2}
                            style={{
                              width: "150px",
                              padding: "4px 8px",
                              background: "#13161e",
                              border: "1px solid rgba(255,255,255,0.2)",
                              borderRadius: "4px",
                              color: "#e8eaf0",
                              fontSize: "11px",
                              resize: "vertical"
                            }}
                          />
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              onClick={() => atribuirNotaFinal(item.id_monografia)}
                              disabled={processando === item.id_monografia}
                              style={{
                                padding: "4px 8px",
                                background: processando === item.id_monografia ? "#b0b8cf" : "#22c55e",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: "600",
                                cursor: processando === item.id_monografia ? "not-allowed" : "pointer"
                              }}
                            >
                              {processando === item.id_monografia ? "..." : "Confirmar"}
                            </button>
                            <button
                              onClick={() => { setEditandoNota(null); setNotaFinal(""); setFeedbackGestor("") }}
                              style={{
                                padding: "4px 8px",
                                background: "#b0b8cf",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: "600",
                                cursor: "pointer"
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                      {/* Pré-projecto: mostrar botão de download do documento */}
                      {!isMonografia && item.caminho_arquivo && item.nome_arquivo && (
                        <div style={{ marginBottom: "4px" }}>
                          <button
                            onClick={() => handleDownload(item.caminho_arquivo!, item.nome_arquivo!, "premonografia")}
                            style={{
                              padding: "3px 8px",
                              background: "#2d3348",
                              color: "#e8eaf0",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "10px",
                              fontWeight: "600",
                              cursor: "pointer"
                            }}
                          >
                            ⬇ {item.nome_arquivo}
                          </button>
                        </div>
                      )}
                      {/* Pré-projecto: mostrar botões de aprovar/reprovar para o gestor */}
                      {!isMonografia && (
                        <>
                          {item.estado === "Proposto" && (
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button
                                onClick={() => {
                                  if (confirm("Aprovar este pré-projecto?")) {
                                    avaliarPremonografia(item.id_premonografia, "Aprovado")
                                  }
                                }}
                                style={{
                                  padding: "4px 8px",
                                  background: "#22c55e",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  cursor: "pointer"
                                }}
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Reprovar este pré-projecto?")) {
                                    avaliarPremonografia(item.id_premonografia, "Reprovado")
                                  }
                                }}
                                style={{
                                  padding: "4px 8px",
                                  background: "#e03d3d",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  cursor: "pointer"
                                }}
                              >
                                Reprovar
                              </button>
                            </div>
                          )}
                          {item.estado === "Aprovado" && (
                            <span style={{ color: "#22c55e", fontSize: "11px", fontWeight: "600" }}>✅ Aprovado</span>
                          )}
                          {item.estado === "Reprovado" && (
                            <span style={{ color: "#e03d3d", fontSize: "11px", fontWeight: "600" }}>❌ Reprovado</span>
                          )}
                        </>
                      )}
                      {/* Monografias: mostrar "—" quando sem acção */}
                      {isMonografia && (item.estado === "Submetida" || item.estado === "EmRevisao" || item.estado === "Defendida" || item.estado === "Rejeitada") && (
                        <span style={{ color: "#b0b8cf", fontSize: "11px" }}>—</span>
                      )}
                    </td>
                  </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}