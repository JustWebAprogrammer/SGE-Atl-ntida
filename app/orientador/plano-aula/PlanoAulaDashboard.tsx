"use client"

import { useState, useEffect, useMemo } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { orientadorNavItems as navItems } from "../orientadorNav"

const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

const TIPO_PROVA_LABELS: Record<string, string> = {
  PP1: "1ª Prova Permanente",
  PP2: "2ª Prova Permanente",
  Exame: "Exame",
  Recurso: "Recurso",
  Exame_Especial: "Exame Especial",
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

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-color)",
  borderRadius: "14px",
  padding: "20px",
  marginBottom: "20px",
}

const TURNOS_HORARIOS: Record<string, { inicio: string; fim: string }> = {
  Matinal: { inicio: "08:00", fim: "13:00" },
  Vespertino: { inicio: "13:00", fim: "18:00" },
  Noturno: { inicio: "18:00", fim: "23:00" },
}

function calcularMaxPosicoes(duracao: number, intervalo: number) {
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

export default function PlanoAulaDashboard() {
  const [horarios, setHorarios] = useState<AulaHorario[]>([])
  const [provas, setProvas] = useState<ProvaInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [duracao, setDuracao] = useState(90)
  const [intervalo, setIntervalo] = useState(10)
  const [anoLectivo, setAnoLectivo] = useState("")
  const [semestre, setSemestre] = useState("")

  useEffect(() => {
    fetch("/api/orientador/plano-aula")
      .then(r => r.json())
      .then(data => {
        setHorarios(data.horarios || [])
        setProvas(data.provas || [])
        setDuracao(data.duracao || 90)
        setIntervalo(data.intervalo || 10)
        setAnoLectivo(data.ano_lectivo || "")
        setSemestre(data.semestre || "")
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const posicoesTurno = useMemo(() => {
    const max = calcularMaxPosicoes(duracao, intervalo)
    const result: { posicao: number; inicio: string; fim: string }[] = []
    for (let i = 1; i <= max; i++) {
      const h = calcularHorario(i, duracao, intervalo)
      if (h) result.push({ posicao: i, inicio: h.inicio, fim: h.fim })
    }
    return result
  }, [duracao, intervalo])

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

  return (
    <DashboardLayout
      navItems={navItems}
      title="Plano de Aula"
      subtitle="Visualização do horário e provas das suas disciplinas"
    >
      {loading ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: "60px" }}>
          <div style={{ color: "var(--text-muted)" }}>A carregar...</div>
        </div>
      ) : (
        <>
          {/* ── HORÁRIO ── */}
          <div style={cardStyle}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ background: "#2dd4bf", color: "var(--bg-input)", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
                HORÁRIO
              </span>
              Horário Semanal
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: "12px", marginBottom: "16px" }}>
              {anoLectivo} · {semestre === "S1" ? "1º Semestre" : "2º Semestre"}
            </div>

            {horarios.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                Nenhuma aula registada para as suas disciplinas.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: `120px repeat(${diasSemana.length}, 1fr)`,
                  gap: "1px",
                  background: "var(--bg-input)",
                  borderRadius: "10px",
                }}>
                  <div style={{ padding: "12px", fontWeight: "600", color: "#2dd4bf", borderBottom: "1px solid rgba(45,212,191,0.2)", textAlign: "center" }}></div>
                  {diasSemana.map(dia => (
                    <div key={dia} style={{ padding: "12px", fontWeight: "600", color: "#2dd4bf", borderBottom: "1px solid rgba(45,212,191,0.2)", textAlign: "center" }}>
                      {dia}
                    </div>
                  ))}

                  {posicoesTurno.map(pos => (
                    <div key={pos.posicao} style={{ display: "contents" }}>
                      <div style={{
                        padding: "12px", fontWeight: "700", color: "var(--text-primary)",
                        borderRight: "1px solid var(--border-color-strong)", borderBottom: "1px solid rgba(255,255,255,0.05)",
                        fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {pos.inicio} – {pos.fim}
                      </div>
                      {diasSemana.map(dia => {
                        const aula = horarios.find(a => a.dia_semana === dia && a.hora_inicio === pos.inicio && a.hora_fim === pos.fim)
                        return (
                          <div key={`${pos.posicao}-${dia}`} style={{
                            padding: "8px", borderBottom: "1px solid rgba(255,255,255,0.05)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {aula ? (
                              <div style={{ background: "var(--bg-card)", borderRadius: "6px", padding: "8px", width: "100%", textAlign: "center" }}>
                                <div style={{ color: "var(--text-primary)", fontWeight: "600", fontSize: "11px" }}>{aula.nome_disciplina}</div>
                                <div style={{ color: "var(--text-secondary)", fontSize: "10px", marginTop: "3px" }}>{aula.nome_curso} · {aula.ano_curricular}º</div>
                                {aula.sala && <div style={{ color: "var(--text-muted)", marginTop: "3px", fontSize: "10px" }}>📍 {aula.sala}</div>}
                              </div>
                            ) : (
                              <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>—</div>
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

          {/* ── PROVAS ── */}
          <div style={cardStyle}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ background: "#f0a500", color: "var(--bg-input)", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
                PROVAS
              </span>
              Plano de Provas
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: "12px", marginBottom: "16px" }}>
              {anoLectivo} · {semestre === "S1" ? "1º Semestre" : "2º Semestre"}
            </div>

            {provas.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
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
                        <tr style={{ borderBottom: "1px solid var(--border-color-strong)" }}>
                          <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-secondary)", fontWeight: "600", fontSize: "12px" }}>Data</th>
                          <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-secondary)", fontWeight: "600", fontSize: "12px" }}>Horário</th>
                          <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-secondary)", fontWeight: "600", fontSize: "12px" }}>Tipo</th>
                          <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-secondary)", fontWeight: "600", fontSize: "12px" }}>Disciplina</th>
                          <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-secondary)", fontWeight: "600", fontSize: "12px" }}>Curso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.items.map((p) => (
                          <tr key={p.id_prova} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "10px 12px", color: "var(--text-primary)", fontWeight: "600", whiteSpace: "nowrap" }}>
                              {new Date(p.data_prova + "T12:00:00").toLocaleDateString("pt-AO", { weekday: "short", day: "2-digit", month: "2-digit" })}
                            </td>
                            <td style={{ padding: "10px 12px", color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                              {p.hora_inicio} — {p.hora_fim}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{
                                background: p.tipo_prova === "Exame" ? "rgba(155,89,182,0.1)" : p.tipo_prova === "Recurso" ? "rgba(224,61,61,0.1)" : "rgba(45,212,191,0.1)",
                                color: p.tipo_prova === "Exame" ? "#9b59b6" : p.tipo_prova === "Recurso" ? "var(--accent)" : "#2dd4bf",
                                padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600",
                              }}>
                                {TIPO_PROVA_LABELS[p.tipo_prova] || p.tipo_prova}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px", color: "var(--text-primary)" }}>
                              {p.nome_disciplina}
                              <span style={{ color: "var(--text-muted)", marginLeft: "6px", fontSize: "11px" }}>({p.codigo_disciplina})</span>
                            </td>
                            <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>
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
        </>
      )}
    </DashboardLayout>
  )
}