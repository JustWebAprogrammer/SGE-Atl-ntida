"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "../components/DashboardLayout"
import { arredondarNota } from "@/lib/notas"

import { estudanteNavItems as navItems } from "./estudanteNav"

const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

type EstudanteInfo = {
  id_estudante: number
  nome_completo: string
  numero_estudante: string | null
  numero_telemovel: string | null
  email: string
  turno: string
  ano_current: number | null
  ano_electivo: string | null
  estado: string
  tipo_bolsa: string
  curso: {
    id_curso: number
    nome_curso: string
    duracao_anos: number | null
  }
}

type AulaHorario = {
  id_aula: number
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  sala: string | null
  nome_disciplina: string
  codigo_disciplina: string
  nome_professor: string
}

type ProvaInfo = {
  id_prova: number
  tipo_prova: string
  data_prova: string
  hora_inicio: string
  hora_fim: string
  nome_disciplina: string
  codigo_disciplina: string
  nome_professor: string
}

type MonografiaInfo = {
  id_monografia: number
  titulo: string
  estado: string
  nota_final: number | null
  data_defesa: string | null
  hora_defesa: string | null
  sala_defesa: string | null
  feedback_gestor: string | null
}

type NotaResumo = {
  id_nota: number
  nome_disciplina: string
  codigo_disciplina: string
  semestre: string
  nota_final: number | null
  aprovado: boolean | null
  tem_dispensa: boolean
  nota_dispensa: number
  dispensavel: boolean
  estado: string
  situacao: string
  is_provisional: boolean
}

const TURNOS_HORARIOS: Record<string, { inicio: string; fim: string }> = {
  Matinal: { inicio: "08:00", fim: "13:00" },
  Vespertino: { inicio: "13:00", fim: "18:00" },
  Noturno: { inicio: "18:00", fim: "23:00" },
}

function calcularMaxPosicoes(turno: string, duracao: number, intervalo: number) {
  const t = TURNOS_HORARIOS[turno]
  if (!t) return 0
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

function calcularHorario(posicao: number, turno: string, duracao: number, intervalo: number) {
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

const ESTADO_LABELS: Record<string, string> = {
  EmCurso: "Em Curso",
  Finalizado: "Finalizado",
  Desistente: "Desistente",
}

const TIPO_PROVA_LABELS: Record<string, string> = {
  PP1: "1ª Prova Permanente",
  PP2: "2ª Prova Permanente",
  Exame: "Exame",
  Recurso: "Recurso",
  Exame_Especial: "Exame Especial",
}

function getEstadoMonografia(estado: string) {
  switch (estado) {
    case "Submetida": return { label: "Submetida", bg: "rgba(45,212,191,0.12)", color: "#2dd4bf" }
    case "EmRevisao": return { label: "Em Revisão", bg: "rgba(240,165,0,0.12)", color: "#f0a500" }
    case "Aprovada": return { label: "Aprovada", bg: "rgba(34,197,94,0.12)", color: "#22c55e" }
    case "ParaDefender": return { label: "Para Defender", bg: "rgba(155,89,182,0.12)", color: "#9b59b6" }
    case "Defendida": return { label: "Defendida", bg: "rgba(34,197,94,0.12)", color: "#22c55e" }
    case "Rejeitada": return { label: "Rejeitada", bg: "rgba(224,61,61,0.12)", color: "#e03d3d" }
    default: return { label: estado, bg: "rgba(85,94,120,0.2)", color: "#b0b8cf" }
  }
}

function getStatusMonografia(estado: string): string {
  switch (estado) {
    case "Submetida": return "A aguardar revisão do gestor"
    case "EmRevisao": return "Em revisão pelo gestor"
    case "Aprovada": return "A aguardar agendamento de defesa"
    case "ParaDefender": return "Defesa agendada"
    case "Defendida": return "Monografia defendida"
    case "Rejeitada": return "Monografia rejeitada"
    default: return ""
  }
}

export default function EstudanteDashboard() {
  const [estudante, setEstudante] = useState<EstudanteInfo | null>(null)
  const [horarios, setHorarios] = useState<AulaHorario[]>([])
  const [horariosPendentes, setHorariosPendentes] = useState<{ ano: number; horarios: AulaHorario[] }[]>([])
  const [provas, setProvas] = useState<ProvaInfo[]>([])
  const [provasPendentes, setProvasPendentes] = useState<{ ano: number; provas: ProvaInfo[] }[]>([])
  const [filtroAnosHorario, setFiltroAnosHorario] = useState<number[]>([])
  const [filtroAnosProvas, setFiltroAnosProvas] = useState<number[]>([])
  const [anoSelecionadoHorario, setAnoSelecionadoHorario] = useState<number | null>(null)
  const [anoSelecionadoProvas, setAnoSelecionadoProvas] = useState<number | null>(null)
  const [monografia, setMonografia] = useState<MonografiaInfo | null>(null)
  const [notasResumo, setNotasResumo] = useState<NotaResumo[]>([])
  const [pagamentoEmDia, setPagamentoEmDia] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [duracao, setDuracao] = useState(90)
  const [intervalo, setIntervalo] = useState(10)

  // Re-enrollment state
  const [currentAnoLectivo, setCurrentAnoLectivo] = useState<string>("")
  const [semestreAtual, setSemestreAtual] = useState<"S1" | "S2">("S1")

  const router = useRouter()

  useEffect(() => {
    async function carregar() {
      try {
        const [meRes, horRes, provRes] = await Promise.all([
          fetch("/api/estudante/me"),
          fetch("/api/estudante/horario"),
          fetch("/api/estudante/plano-provas"),
        ])

        if (!meRes.ok) {
          setError("Erro ao carregar dados do estudante")
          return
        }

        const meData = await meRes.json()
        const horData = await horRes.json()
        const provData = await provRes.json()

        setEstudante(meData)
        setHorarios(horData.horarios || [])
        setHorariosPendentes(horData.horariosPendentes || [])
        if (horData.filtroAnos) {
          setFiltroAnosHorario(horData.filtroAnos)
          setAnoSelecionadoHorario(horData.filtroAnos[0])
        }
        setDuracao(horData.duracao || 90)
        setIntervalo(horData.intervalo || 10)
        setProvas(provData.provas || [])
        setProvasPendentes(provData.provasPendentes || [])
        if (provData.filtroAnos) {
          setFiltroAnosProvas(provData.filtroAnos)
          setAnoSelecionadoProvas(provData.filtroAnos[0])
        }

        // Fetch current academic year for re-enrollment check
        fetch("/api/admin/sistema/config")
          .then(r => r.json())
          .then(data => {
            if (data.ano_lectivo_atual) {
              setCurrentAnoLectivo(data.ano_lectivo_atual)
            }
          })
          .catch(() => {})

        // Fetch current semester
        fetch("/api/admin/sistema/semestre")
          .then(r => r.json())
          .then(data => {
            if (data.semestre_atual) {
              setSemestreAtual(data.semestre_atual)
            }
          })
          .catch(() => {})

        // Check if final year — fetch monografia info
        const isFinalYear = meData.estado === "Finalizado" || (meData.ano_current && meData.curso.duracao_anos && meData.ano_current >= meData.curso.duracao_anos)
        if (isFinalYear) {
          const monoRes = await fetch("/api/estudante/monografia")
          if (monoRes.ok) {
            const monoData = await monoRes.json()
            // The API returns monografias array, use the first active one
            if (monoData.monografias && monoData.monografias.length > 0) {
              const ativa = monoData.monografias.find((m: { estado: string }) =>
                ["Submetida", "EmRevisao", "Aprovada", "ParaDefender", "Defendida"].includes(m.estado)
              )
              setMonografia(ativa || monoData.monografias[0])
            }
          }
        }

        // Check payment status — if current month paid, fetch grades
        const payRes = await fetch("/api/estudante/pagamentos-status")
        if (payRes.ok) {
          const payData = await payRes.json()
          if (payData.mesAtualPago) {
            setPagamentoEmDia(true)
            const notasRes = await fetch("/api/estudante/notas-resumo")
            if (notasRes.ok) {
              const notasData = await notasRes.json()
              setNotasResumo(notasData.notas || [])
            }
          }
        }
      } catch {
        setError("Erro ao carregar dados")
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [])

  const turno = estudante?.turno || "Matinal"

  const posicoesTurno = useMemo(() => {
    const max = calcularMaxPosicoes(turno, duracao, intervalo)
    const result: { posicao: number; inicio: string; fim: string }[] = []
    for (let i = 1; i <= max; i++) {
      const h = calcularHorario(i, turno, duracao, intervalo)
      if (h) result.push({ posicao: i, inicio: h.inicio, fim: h.fim })
    }
    return result
  }, [turno, duracao, intervalo])

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

  const cardStyle: React.CSSProperties = {
    background: "#1e2230",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "20px",
  }

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Visão Geral" subtitle="Resumo académico do estudante">
        <div style={{ ...cardStyle, textAlign: "center", padding: "60px" }}>
          <div style={{ color: "#b0b8cf" }}>A carregar...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !estudante) {
    return (
      <DashboardLayout navItems={navItems} title="Visão Geral" subtitle="Resumo académico do estudante">
        <div style={{ ...cardStyle, textAlign: "center", padding: "60px" }}>
          <div style={{ color: "#e03d3d" }}>{error || "Dados não encontrados"}</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout navItems={navItems} title="Visão Geral" subtitle="Resumo académico do estudante">

      {/* ── Banner de Rematrícula (se aplicável) ── */}
      {estudante && currentAnoLectivo && estudante.estado === "EmCurso" && estudante.ano_electivo !== currentAnoLectivo && (
        <div
          onClick={() => router.push("/estudante/pagamentos")}
          style={{
            background: "linear-gradient(135deg, #1e3a5f 0%, #1e2230 100%)",
            border: "1px solid rgba(59,130,246,0.3)",
            borderRadius: "14px",
            padding: "24px",
            marginBottom: "20px",
            cursor: "pointer",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
            <div style={{ fontSize: "28px" }}>📋</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#e8eaf0", marginBottom: "8px" }}>
                Rematrícula para o Ano Lectivo {currentAnoLectivo}
              </div>
              <div style={{ fontSize: "13px", color: "#d0d7e8", lineHeight: "1.6", marginBottom: "12px" }}>
                A Taxa de Rematrícula determina a sua continuidade no curso.
                {estudante.ano_current && (
                  <span> Seu ano curricular actual é <strong style={{ color: "#e8eaf0" }}>{estudante.ano_current}º</strong>.</span>
                )}
              </div>
              <div style={{ fontSize: "13px", color: "#3b82f6", fontWeight: "600" }}>
                Clique aqui para ir a Pagamentos → Pagar Taxa de Rematrícula
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Informação do Estudante ── */}
      <div style={cardStyle}>
        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "#e8eaf0", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ background: "#2dd4bf", color: "#13161e", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
            ESTUDANTE
          </span>
          Dados Pessoais
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
          <InfoCampo label="Nome Completo" value={estudante.nome_completo} />
          <InfoCampo label="Nº Estudante" value={estudante.numero_estudante || "—"} />
          <InfoCampo label="Curso" value={estudante.curso.nome_curso} />
          <InfoCampo label="Ano Curricular" value={estudante.ano_current ? `${estudante.ano_current}º Ano` : "—"} />
          <InfoCampo label="Ano Lectivo" value={estudante.ano_electivo || "—"} />
          <div>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#b0b8cf", marginBottom: "4px" }}>
              Semestre Actual
            </div>
            <div style={{
              fontSize: "14px",
              fontWeight: "700",
              color: semestreAtual === "S1" ? "#4fc3f7" : "#ffa726",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <span>{semestreAtual === "S1" ? "📖" : "📗"}</span>
              {semestreAtual}
            </div>
          </div>
          <InfoCampo label="Turno" value={estudante.turno} />
          <InfoCampo label="Estado" value={ESTADO_LABELS[estudante.estado] || estudante.estado} />
          <InfoCampo label="Bolsa" value={estudante.tipo_bolsa === "Nenhuma" ? "Sem bolsa" : estudante.tipo_bolsa === "Cinquenta" ? "50%" : "100%"} />
          {estudante.numero_telemovel && <InfoCampo label="Telemóvel" value={estudante.numero_telemovel} />}
          <InfoCampo label="Email" value={estudante.email} />
        </div>
      </div>

      {/* ── Horário de Aulas ── */}
      <div style={cardStyle}>
        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px", color: "#e8eaf0", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ background: "#2dd4bf", color: "#13161e", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
            HORÁRIO
          </span>
          Horário Semanal
        </div>
        <div style={{ color: "#d0d7e8", fontSize: "12px", marginBottom: "16px" }}>
          {estudante.curso.nome_curso} · {estudante.ano_current}º ano · {estudante.turno} · {estudante.ano_electivo || "2025/2026"}
        </div>

        {/* Filtro de anos para horário */}
        {filtroAnosHorario.length > 1 && (
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
            {filtroAnosHorario.map(ano => (
              <button
                key={ano}
                onClick={() => setAnoSelecionadoHorario(ano)}
                style={{
                  padding: "5px 14px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: anoSelecionadoHorario === ano ? "#2dd4bf" : "rgba(45,212,191,0.1)",
                  color: anoSelecionadoHorario === ano ? "#13161e" : "#2dd4bf",
                  border: anoSelecionadoHorario === ano ? "none" : "1px solid rgba(45,212,191,0.2)",
                }}
              >
                {ano}º Ano{ano === (estudante.ano_current || 1) ? " (Actual)" : " 🔄"}
              </button>
            ))}
          </div>
        )}

        {(() => {
          // Selecionar horários com base no filtro de ano
          const horariosVisiveis = anoSelecionadoHorario === (estudante.ano_current || 1)
            ? horarios
            : (horariosPendentes.find(h => h.ano === anoSelecionadoHorario)?.horarios || [])

          if (horariosVisiveis.length === 0) {
            return (
              <div style={{ textAlign: "center", padding: "40px", color: "#b0b8cf" }}>
                {anoSelecionadoHorario !== (estudante.ano_current || 1)
                  ? "Nenhuma aula pendente registada para este ano."
                  : "Nenhuma aula registada para este horário."}
              </div>
            )
          }

          return (
            <>
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
                        const aula = horariosVisiveis.find(a =>
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
                                <div style={{ color: "#2dd4bf", fontSize: "10px", marginTop: "3px" }}>{aula.nome_professor}</div>
                                {aula.sala && <div style={{ color: "#d0d7e8", marginTop: "3px", fontSize: "10px" }}>📍 {aula.sala}</div>}
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

                  {/* Professores & Disciplinas table */}
                  {horariosVisiveis.length > 0 && (
                    <div style={{ marginTop: "16px" }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "10px", color: "#e8eaf0" }}>
                        <span style={{ background: "#2dd4bf", color: "#13161e", padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "700", marginRight: "8px" }}>
                          DOCENTES
                        </span>
                        Professores e Disciplinas
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                              <th style={{ textAlign: "left", padding: "10px 12px", color: "#d0d7e8", fontWeight: "600", fontSize: "12px" }}>Professor</th>
                              <th style={{ textAlign: "left", padding: "10px 12px", color: "#d0d7e8", fontWeight: "600", fontSize: "12px" }}>Disciplina</th>
                              <th style={{ textAlign: "left", padding: "10px 12px", color: "#d0d7e8", fontWeight: "600", fontSize: "12px" }}>Código</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const seen = new Set<string>()
                              return horariosVisiveis.filter(a => {
                                const key = a.codigo_disciplina
                                if (seen.has(key)) return false
                                seen.add(key)
                                return true
                              }).map((a, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                  <td style={{ padding: "10px 12px", color: "#e8eaf0" }}>{a.nome_professor}</td>
                                  <td style={{ padding: "10px 12px", color: "#e8eaf0" }}>{a.nome_disciplina}</td>
                                  <td style={{ padding: "10px 12px", color: "#b0b8cf" }}>{a.codigo_disciplina}</td>
                                </tr>
                              ))
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>

      {/* ── Monografia (final year only) ── */}
      {estudante.ano_current && estudante.curso.duracao_anos && estudante.ano_current >= estudante.curso.duracao_anos && monografia && (
        <div style={cardStyle}>
          <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "#e8eaf0", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ background: "#9b59b6", color: "#fff", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
              MONOGRAFIA
            </span>
            <span style={{
              padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600",
              background: getEstadoMonografia(monografia.estado).bg,
              color: getEstadoMonografia(monografia.estado).color,
            }}>
              {getEstadoMonografia(monografia.estado).label}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
            <InfoCampo label="Título" value={monografia.titulo} />

            {monografia.estado === "Defendida" && monografia.nota_final !== null && (
              <div>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#b0b8cf", marginBottom: "4px" }}>
                  Nota Final
                </div>
                <div style={{
                  fontSize: "28px", fontWeight: "700",
                  color: monografia.nota_final >= 10 ? "#22c55e" : "#e03d3d",
                }}>
                  {arredondarNota(monografia.nota_final)}
                </div>
              </div>
            )}

            {monografia.estado === "Defendida" && monografia.nota_final !== null && (
              <InfoCampo label="Resultado" value={monografia.nota_final >= 10 ? "✅ Aprovado" : "❌ Reprovado"} />
            )}

            {monografia.data_defesa && (
              <InfoCampo label="Data da Defesa" value={new Date(monografia.data_defesa).toLocaleDateString("pt-AO", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) + (monografia.hora_defesa ? ` às ${monografia.hora_defesa}h` : "")} />
            )}

            {monografia.sala_defesa && (
              <InfoCampo label="Sala" value={monografia.sala_defesa} />
            )}

            <InfoCampo label="Situação" value={getStatusMonografia(monografia.estado)} />
          </div>

          {monografia.feedback_gestor && (
            <div style={{ marginTop: "16px", padding: "14px", background: "rgba(13,15,20,0.5)", borderRadius: "10px", borderLeft: "3px solid #f0a500" }}>
              <div style={{ fontSize: "12px", color: "#b0b8cf", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Feedback do Gestor</div>
              <div style={{ fontSize: "13px", color: "#d0d7e8", lineHeight: "1.5" }}>{monografia.feedback_gestor}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Plano de Provas ── */}
      <div style={cardStyle}>
        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px", color: "#e8eaf0", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ background: "#f0a500", color: "#13161e", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
            PROVAS
          </span>
          Plano de Provas
        </div>
        <div style={{ color: "#d0d7e8", fontSize: "12px", marginBottom: "16px" }}>
          {estudante.curso.nome_curso} · {estudante.ano_current}º ano · {estudante.turno} · {estudante.ano_electivo || "2025/2026"}
        </div>

        {provas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#b0b8cf" }}>
            Nenhuma prova registada para este horário.
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
                      <th style={{ textAlign: "left", padding: "10px 12px", color: "#d0d7e8", fontWeight: "600", fontSize: "12px" }}>Professor</th>
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
                          {p.nome_professor}
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

      {/* ── Notas (only if current month propina is paid) ── */}
      {pagamentoEmDia && notasResumo.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px", color: "#e8eaf0", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ background: "#22c55e", color: "#13161e", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
              NOTAS
            </span>
            Resumo — {estudante.ano_electivo || "2025/2026"}
          </div>
          <div style={{ color: "#d0d7e8", fontSize: "12px", marginBottom: "16px" }}>
            Notas do ano lectivo actual
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#d0d7e8", fontWeight: "600", fontSize: "12px" }}>Disciplina</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", color: "#d0d7e8", fontWeight: "600", fontSize: "12px" }}>Semestre</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", color: "#d0d7e8", fontWeight: "600", fontSize: "12px" }}>Nota Final</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", color: "#d0d7e8", fontWeight: "600", fontSize: "12px" }}>Dispensável</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", color: "#d0d7e8", fontWeight: "600", fontSize: "12px" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {notasResumo.map((n) => (
                  <tr key={n.id_nota} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "10px 12px", color: "#e8eaf0" }}>
                      {n.nome_disciplina}
                      <span style={{ color: "#b0b8cf", marginLeft: "6px", fontSize: "11px" }}>({n.codigo_disciplina})</span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#d0d7e8", textAlign: "center" }}>{n.semestre}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <span style={{
                        fontWeight: "700",
                        color: n.nota_final != null
                          ? (n.aprovado ? "#22c55e" : "#e03d3d")
                          : "#b0b8cf",
                      }}>
                        {n.nota_final != null ? arredondarNota(n.nota_final) : "—"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      {n.tem_dispensa ? (
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "600",
                          background: "rgba(45,212,191,0.12)",
                          color: "#2dd4bf",
                        }}>
                          Sim
                        </span>
                      ) : (
                        <span style={{ color: "#b0b8cf", fontSize: "11px" }}>Não</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: n.estado === "Aprovado" ? "rgba(34,197,94,0.12)"
                          : n.estado === "Reprovado" ? "rgba(224,61,61,0.12)"
                          : n.estado === "Exame" ? "rgba(240,165,0,0.15)"
                          : n.estado === "Recurso" ? "rgba(245,158,11,0.15)"
                          : n.estado === "Exame Especial" ? "rgba(139,92,246,0.15)"
                          : n.estado === "Dispensa" ? "rgba(45,212,191,0.12)"
                          : "rgba(85,94,120,0.2)",
                        color: n.estado === "Aprovado" ? "#22c55e"
                          : n.estado === "Reprovado" ? "#e03d3d"
                          : n.estado === "Exame" ? "#f0a500"
                          : n.estado === "Recurso" ? "#f59e0b"
                          : n.estado === "Exame Especial" ? "#8b5cf6"
                          : n.estado === "Dispensa" ? "#2dd4bf"
                          : "#b0b8cf",
                      }}>
                        {n.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}

function InfoCampo({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{
        fontSize: "11px",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        color: "#b0b8cf",
        marginBottom: "4px",
      }}>
        {label}
      </div>
      <div style={{
        fontSize: "14px",
        fontWeight: "600",
        color: "#e8eaf0",
      }}>
        {value}
      </div>
    </div>
  )
}