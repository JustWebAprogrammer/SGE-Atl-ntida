"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { useSession } from "next-auth/react"
import DashboardLayout from "../../components/DashboardLayout"
import { gestorNavItems } from "../gestorNav"

type Curso = { id_curso: number; nome_curso: string; duracao_anos: number | null; turnos: string | null }
type Disciplina = { id_disciplina: number; nome_disciplina: string; codigo_disciplina: string; ano_curricular: number; semestre: string }
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
type ProfessorInfo = {
  id_disciplina: number
  nome_disciplina: string
  codigo_disciplina: string
  nome_professor: string
}

const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const TURNOS_HORARIOS: Record<string, { inicio: string; fim: string }> = {
  Matinal: { inicio: "08:00", fim: "13:00" },
  Vespertino: { inicio: "13:00", fim: "18:00" },
  Noturno: { inicio: "18:00", fim: "23:00" },
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

export default function HorarioPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [aulas, setAulas] = useState<Aula[]>([])
  const [professores, setProfessores] = useState<ProfessorInfo[]>([])
  const [loading, setLoading] = useState(true)

  const [cursoId, setCursoId] = useState<string>("")
  const [ano, setAno] = useState<string>("1")
  const [semestre, setSemestre] = useState<string>("S1")
  const [anoLectivo, setAnoLectivo] = useState<string>("2025/2026")
  const [filtroTurno, setFiltroTurno] = useState<string>("Matinal")

  // Formulário
  const [disciplinaId, setDisciplinaId] = useState<string>("")
  const [diaSemana, setDiaSemana] = useState<string>("Segunda")
  const [posicao, setPosicao] = useState<string>("1")
  const [sala, setSala] = useState<string>("")
  const [salvando, setSalvando] = useState(false)

  // Estado configuração
  const [duracao, setDuracao] = useState(90)
  const [intervalo, setIntervalo] = useState(10)
  const [turnosCurso, setTurnosCurso] = useState<string[]>(["Matinal"])

  // Sessão para obter o nome do gestor
  const { data: session } = useSession()
  const nomeGestor = session?.user?.nome_completo || session?.user?.name || "Gestor do Departamento"

  // Estado para impressão
  const [turnoParaImprimir, setTurnoParaImprimir] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/gestor/cursos")
      .then(r => r.json())
      .then(data => {
        setCursos(data.cursos || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!cursoId) { setDisciplinas([]); return }
    fetch(`/api/gestor/curriculo?cursoId=${cursoId}`)
      .then(r => r.json())
      .then(data => {
        const filtradas = (data.curriculo || []).filter((d: Disciplina) =>
          d.ano_curricular === parseInt(ano) && d.semestre === semestre
        )
        setDisciplinas(filtradas)
      })
  }, [cursoId, ano, semestre])

  useEffect(() => {
    if (!cursoId) { setAulas([]); setProfessores([]); return }
    const params = new URLSearchParams({
      cursoId,
      ano,
      semestre,
      ano_lectivo: anoLectivo,
      turno: filtroTurno,
    })
    fetch(`/api/gestor/horario?${params}`)
      .then(r => r.json())
      .then(data => {
        setAulas(data.horarios || [])
        setTurnosCurso(data.turnos || ["Matinal"])
        setDuracao(data.duracao || 90)
        setIntervalo(data.intervalo || 10)
        setProfessores(data.professores || [])
      })
  }, [cursoId, ano, semestre, anoLectivo, filtroTurno])

  const anosDisponiveis = useMemo(() => {
    const curso = cursos.find(c => c.id_curso === parseInt(cursoId))
    const d = curso?.duracao_anos || 6
    return Array.from({ length: d }, (_, i) => i + 1)
  }, [cursos, cursoId])

  // Turnos do curso no select de filtro
  const turnosDoCurso = useMemo(() => {
    const curso = cursos.find(c => c.id_curso === parseInt(cursoId))
    if (!curso?.turnos) return []
    return curso.turnos.split(",").map((t: string) => t.trim()).filter(Boolean)
  }, [cursos, cursoId])

  // Atualizar filtroTurno quando o curso muda
  useEffect(() => {
    if (turnosDoCurso.length > 0) {
      setFiltroTurno(turnosDoCurso[0])
    }
  }, [turnosDoCurso])

  const maxPosicoes = useMemo(() => calcularMaxPosicoes(filtroTurno, duracao, intervalo), [filtroTurno, duracao, intervalo])

  const horarioPreview = useMemo(() => {
    if (!filtroTurno || !posicao) return null
    return calcularHorario(parseInt(posicao), filtroTurno, duracao, intervalo)
  }, [posicao, filtroTurno, duracao, intervalo])

  // Posições para a grelha de impressão
  const posicoesTurno = useMemo(() => {
    const max = calcularMaxPosicoes(filtroTurno, duracao, intervalo)
    const result: { posicao: number; inicio: string; fim: string }[] = []
    for (let i = 1; i <= max; i++) {
      const h = calcularHorario(i, filtroTurno, duracao, intervalo)
      if (h) result.push({ posicao: i, inicio: h.inicio, fim: h.fim })
    }
    return result
  }, [filtroTurno, duracao, intervalo])

  // Disparar impressão
  useEffect(() => {
    if (turnoParaImprimir) {
      setTimeout(() => window.print(), 200)
    }
  }, [turnoParaImprimir])

  useEffect(() => {
    const handler = () => { setTurnoParaImprimir(null) }
    window.addEventListener("afterprint", handler)
    return () => window.removeEventListener("afterprint", handler)
  }, [])

  async function adicionarAula(e: React.FormEvent) {
    e.preventDefault()
    if (!cursoId || !disciplinaId || !filtroTurno || !posicao) return
    setSalvando(true)
    try {
      const res = await fetch("/api/gestor/horario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_curso: parseInt(cursoId),
          id_disciplina: parseInt(disciplinaId),
          ano_curricular: parseInt(ano),
          semestre,
          dia_semana: diaSemana,
          turno: filtroTurno,
          posicao: parseInt(posicao),
          sala: sala || null,
          ano_lectivo: anoLectivo
        })
      })
      if (res.ok) {
        const params = new URLSearchParams({ cursoId, ano, semestre, ano_lectivo: anoLectivo, turno: filtroTurno })
        const data = await fetch(`/api/gestor/horario?${params}`).then(r => r.json())
        setAulas(data.horarios || [])
        setProfessores(data.professores || [])
        setDisciplinaId("")
        setSala("")
        setPosicao("1")
      } else {
        const err = await res.json()
        alert(err.error || "Erro ao adicionar aula")
      }
    } catch {
      alert("Erro ao adicionar aula")
    } finally {
      setSalvando(false)
    }
  }

  async function removerAula(id: number) {
    if (!confirm("Remover esta aula do horário?")) return
    try {
      await fetch(`/api/gestor/horario?id=${id}`, { method: "DELETE" })
      const params = new URLSearchParams({ cursoId, ano, semestre, ano_lectivo: anoLectivo, turno: filtroTurno })
      const data = await fetch(`/api/gestor/horario?${params}`).then(r => r.json())
      setAulas(data.horarios || [])
    } catch {
      alert("Erro ao remover aula")
    }
  }

  const aulasPorDia = useMemo(() => {
    const map = new Map<string, Aula[]>()
    for (const dia of diasSemana) map.set(dia, [])
    for (const aula of aulas) {
      const lista = map.get(aula.dia_semana) || []
      lista.push(aula)
      map.set(aula.dia_semana, lista)
    }
    for (const [dia, lista] of map) {
      lista.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
      map.set(dia, lista)
    }
    return map
  }, [aulas])

  const estiloSelect: React.CSSProperties = {
    background: "#13161e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
    padding: "8px 12px", color: "#e8eaf0", fontSize: "13px", minWidth: "120px"
  }

  if (loading) {
    return (
      <DashboardLayout navItems={gestorNavItems} title="Horário de Aulas" subtitle="Gerir horário semanal por curso">
        <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "40px", textAlign: "center" }}>
          <div style={{ color: "#b0b8cf" }}>A carregar...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout navItems={gestorNavItems} title="Horário de Aulas" subtitle="Gerir horário semanal por curso">
      {/* Selecionar Turma — com Turno incluído (como no plano-provas) */}
      <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px", marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#e8eaf0" }}>Selecionar Turma</div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Curso</div>
            <select value={cursoId} onChange={e => { setCursoId(e.target.value); setAno("1") }} style={estiloSelect}>
              <option value="">Selecionar...</option>
              {cursos.map(c => <option key={c.id_curso} value={c.id_curso}>{c.nome_curso}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Ano</div>
            <select value={ano} onChange={e => setAno(e.target.value)} style={estiloSelect}>
              {anosDisponiveis.map(a => <option key={a} value={a}>{a}º</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Semestre</div>
            <select value={semestre} onChange={e => setSemestre(e.target.value)} style={estiloSelect}>
              <option value="S1">S1</option>
              <option value="S2">S2</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Ano Lectivo</div>
            <input type="text" value={anoLectivo} onChange={e => setAnoLectivo(e.target.value)} style={{ ...estiloSelect, minWidth: "100px" }} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Turno</div>
            <select value={filtroTurno} onChange={e => { setFiltroTurno(e.target.value); setPosicao("1") }} style={estiloSelect}>
              {turnosDoCurso.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {cursoId && (
          <div style={{ marginTop: "10px", color: "#d0d7e8", fontSize: "12px" }}>
            ⏱️ Aula: <strong style={{ color: "#2dd4bf" }}>{duracao} min</strong> · Intervalo: <strong style={{ color: "#2dd4bf" }}>{intervalo} min</strong>
            · Turno: <strong style={{ color: "#2dd4bf" }}>{filtroTurno}</strong>
          </div>
        )}
      </div>

      {cursoId && (
        <>
          {/* Formulário — Turno disabled, herdado do filtro (como no plano-provas) */}
          <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px", marginBottom: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#e8eaf0" }}>Adicionar Aula</div>
            <form onSubmit={adicionarAula} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Disciplina</div>
                <select value={disciplinaId} onChange={e => setDisciplinaId(e.target.value)} required style={{ ...estiloSelect, minWidth: "220px" }}>
                  <option value="">Selecionar...</option>
                  {disciplinas.map(d => <option key={d.id_disciplina} value={d.id_disciplina}>{d.nome_disciplina} ({d.codigo_disciplina})</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Dia</div>
                <select value={diaSemana} onChange={e => setDiaSemana(e.target.value)} style={estiloSelect}>
                  {diasSemana.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Turno</div>
                <select value={filtroTurno} disabled style={{ ...estiloSelect, opacity: 0.7, cursor: "not-allowed" }}>
                  {turnosCurso.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Posição ({maxPosicoes} max)</div>
                <select value={posicao} onChange={e => setPosicao(e.target.value)} style={estiloSelect}>
                  {Array.from({ length: Math.max(maxPosicoes, 1) }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}ª aula</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Sala</div>
                <input type="text" placeholder="Ex: Sala 101" value={sala} onChange={e => setSala(e.target.value)} style={{ ...estiloSelect, minWidth: "100px" }} />
              </div>
              <button type="submit" disabled={salvando || !disciplinaId} style={{
                padding: "8px 16px", background: disciplinaId ? "#2dd4bf" : "#b0b8cf",
                color: disciplinaId ? "#13161e" : "#d0d7e8", border: "none", borderRadius: "8px",
                fontSize: "13px", fontWeight: "600", cursor: disciplinaId ? "pointer" : "not-allowed"
              }}>{salvando ? "A adicionar..." : "+ Adicionar"}</button>
            </form>
            {horarioPreview && (
              <div style={{ marginTop: "10px", color: "#2dd4bf", fontSize: "12px", fontWeight: "500" }}>
                🕐 Horário calculado: {horarioPreview.inicio} — {horarioPreview.fim}
              </div>
            )}
            {disciplinas.length === 0 && (
              <div style={{ color: "#b0b8cf", fontSize: "12px", marginTop: "10px" }}>
                Nenhuma disciplina no currículo. Adicione no <a href="/gestor/curriculo" style={{ color: "#2dd4bf" }}>Currículo</a> primeiro.
              </div>
            )}
          </div>

          {/* Grade Semanal — Timetable com coluna de tempo */}
          <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px", marginBottom: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "#e8eaf0" }}>
              Horário Semanal — {cursos.find(c => c.id_curso === parseInt(cursoId))?.nome_curso} ({ano}º ano, {semestre}) — {filtroTurno}
            </div>

            {/* Botão de Imprimir */}
            <div style={{ marginBottom: "16px" }}>
              <button
                onClick={() => setTurnoParaImprimir(filtroTurno)}
                style={{
                  padding: "10px 18px",
                  background: "#2dd4bf",
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
                🖨️ Imprimir Horário — {filtroTurno}
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: `120px repeat(${diasSemana.length}, 1fr)`, gap: "1px", background: "#13161e", borderRadius: "10px" }}>
                {/* Header row */}
                <div style={{ padding: "12px", fontWeight: "600", color: "#2dd4bf", borderBottom: "1px solid rgba(45,212,191,0.2)", textAlign: "center" }}></div>
                {diasSemana.map(dia => (
                  <div key={dia} style={{ padding: "12px", fontWeight: "600", color: "#2dd4bf", borderBottom: "1px solid rgba(45,212,191,0.2)", textAlign: "center" }}>
                    {dia}
                  </div>
                ))}

                {/* Time slot rows */}
                {posicoesTurno.map(pos => {
                  const tempo = `${pos.inicio} – ${pos.fim}`
                  return (
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
                        justifyContent: "center"
                      }}>
                        {tempo}
                      </div>
                      {diasSemana.map(dia => {
                        const aula = aulas.find(a => a.dia_semana === dia && a.hora_inicio === pos.inicio && a.hora_fim === pos.fim)
                        return (
                          <div key={`${pos.posicao}-${dia}`} style={{
                            padding: "8px",
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}>
                            {aula ? (
                              <div style={{ background: "#1e2230", borderRadius: "6px", padding: "8px", width: "100%", textAlign: "center" }}>
                                <div style={{ color: "#e8eaf0", fontWeight: "500", fontSize: "11px" }}>{aula.disciplina.nome_disciplina}</div>
                                {aula.sala && <div style={{ color: "#d0d7e8", marginTop: "4px", fontSize: "10px" }}>📍 {aula.sala}</div>}
                                <button onClick={() => removerAula(aula.id_aula)} style={{
                                  marginTop: "4px", padding: "2px 6px", background: "transparent",
                                  border: "1px solid rgba(224,61,61,0.3)", borderRadius: "4px",
                                  color: "#e03d3d", fontSize: "10px", cursor: "pointer"
                                }}>Remover</button>
                              </div>
                            ) : (
                              <div style={{ color: "#b0b8cf", fontSize: "10px" }}>—</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tabela Professores-Disciplinas (visível no ecrã e no print) */}
          {professores.length > 0 && ( // always true now since we include all curriculum disciplines
            <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px", marginBottom: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "#e8eaf0" }}>
                <span style={{ background: "#2dd4bf", color: "#13161e", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", marginRight: "10px", verticalAlign: "middle" }}>DOCENTES</span>
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
                    {professores.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "10px 12px", color: "#e8eaf0" }}>{p.nome_professor}</td>
                        <td style={{ padding: "10px 12px", color: "#e8eaf0" }}>{p.nome_disciplina}</td>
                        <td style={{ padding: "10px 12px", color: "#b0b8cf" }}>{p.codigo_disciplina}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Grid de Impressão — via createPortal para o body */}
      {turnoParaImprimir && typeof document !== "undefined" && createPortal(
        <div ref={printRef} className="print-grid-horario">
          <style>{`
            @media print {
              @page { size: landscape; margin: 10mm; }
              html, body { margin: 0; padding: 0; height: auto; }
              body > :not(.print-grid-horario) { display: none !important; }
              .print-grid-horario { display: block !important; }
              .print-grid-horario { position: fixed; top: 0; left: 0; right: 0; padding: 8mm; }
              .print-section { margin-bottom: 16px; page-break-inside: avoid; }
              .print-table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; }
              .print-table th, .print-table td { border: 1px solid #333; padding: 4px 6px; text-align: center; font-size: 10px; height: 28px; }
              .print-table th { background: #e8eaf0; font-weight: 700; font-size: 11px; height: 32px; }
              .print-table td.hora { font-weight: 600; white-space: nowrap; text-align: right; background: #f5f6fa; width: 100px; font-size: 9px; }
              .print-header { text-align: center; font-size: 14px; font-weight: 700; margin-bottom: 6px; }
              .print-sub { text-align: center; font-size: 11px; color: #555; margin-bottom: 12px; }
              .print-footer { margin-top: 32px; display: flex; justify-content: flex-start; }
              .print-assinatura { text-align: left; }
              .print-assinatura div:first-child { font-size: 11px; color: #555; margin-bottom: 16px; }
              .print-linha-assinatura { border-top: 2px solid #333; padding-top: 8px; font-size: 13px; font-weight: 600; min-width: 250px; }
              .print-prof-table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; margin-top: 20px; }
              .print-prof-table th, .print-prof-table td { border: 1px solid #999; padding: 5px 8px; text-align: left; font-size: 10px; }
              .print-prof-table th { background: #e8eaf0; font-weight: 700; font-size: 11px; }
              .print-prof-title { font-size: 12px; font-weight: 600; margin-top: 24px; margin-bottom: 6px; }
            }
          `}</style>

          <div className="print-header">
            Horário de Aulas — {cursos.find(c => c.id_curso === parseInt(cursoId))?.nome_curso}
          </div>
          <div className="print-sub">
            {ano}º ano, {semestre} • {anoLectivo} • Turno: {turnoParaImprimir}
          </div>

          <div className="print-section">
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: "100px" }}>Horário</th>
                  {diasSemana.map(dia => (
                    <th key={dia}>{dia}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {posicoesTurno.map(pos => {
                  // Filtrar aulas que correspondem a este horário e dia
                  return (
                    <tr key={pos.posicao}>
                      <td className="hora">{pos.inicio} — {pos.fim}</td>
                      {diasSemana.map(dia => {
                        const aulasNoSlot = aulas.filter(a =>
                          a.dia_semana === dia &&
                          a.hora_inicio === pos.inicio &&
                          a.hora_fim === pos.fim
                        )
                        return (
                          <td key={dia}>
                            {aulasNoSlot.length > 0 ? (
                              aulasNoSlot.map(a => (
                                <div key={a.id_aula}>
                                  <div style={{ fontWeight: 600 }}>{a.disciplina.nome_disciplina}</div>
                                  {a.sala && <div style={{ fontSize: 9, color: "#666" }}>{a.sala}</div>}
                                </div>
                              ))
                            ) : (
                              <div style={{ color: "#ccc", fontSize: 9 }}>—</div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Tabela de Professores no print */}
          {professores.length > 0 && (
            <div>
              <div className="print-prof-title">Professores e Disciplinas</div>
              <table className="print-prof-table">
                <thead>
                  <tr>
                    <th>Professor</th>
                    <th>Disciplina</th>
                    <th>Código</th>
                  </tr>
                </thead>
                <tbody>
                  {professores.map((p, idx) => (
                    <tr key={idx}>
                      <td>{p.nome_professor}</td>
                      <td>{p.nome_disciplina}</td>
                      <td>{p.codigo_disciplina}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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