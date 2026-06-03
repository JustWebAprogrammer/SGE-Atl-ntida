"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { arredondarNota } from "@/lib/notas"

import { orientadorNavItems as navItems } from "../orientadorNav"

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

export default function DisciplinasPage() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<Disciplina | null>(null)
  const [estudantes, setEstudantes] = useState<Estudante[]>([])
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(true)
  const [loadingEstudantes, setLoadingEstudantes] = useState(false)
  const [editandoNota, setEditandoNota] = useState<number | null>(null)
  const [notasEditadas, setNotasEditadas] = useState<Partial<Estudante>>({})
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    fetch("/api/orientador/disciplinas")
      .then(r => r.json())
      .then(data => {
        setDisciplinas(data.disciplinas)
        setLoadingDisciplinas(false)
      })
      .catch(() => setLoadingDisciplinas(false))
  }, [])

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
        setEstudantes(data.estudantes)
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
      case "recurso": return "var(--accent)"
      case "exame": return "#f0a500"
      case "ac": return "#22c55e"
      default: return "var(--text-muted)"
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

  return (
    <DashboardLayout
      navItems={navItems}
      title="Disciplinas e Notas"
      subtitle="Gerir notas das suas disciplinas"
    >
      {/* Disciplinas */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "14px",
        padding: "20px",
        marginBottom: "20px"
      }}>
        <div style={{
          fontSize: "14px",
          fontWeight: "600",
          marginBottom: "16px",
          color: "var(--text-primary)"
        }}>Minhas Disciplinas</div>

        {loadingDisciplinas ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>A carregar...</div>
        ) : disciplinas.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>
            Nenhuma disciplina atribuída
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {disciplinas.map(d => (
              <div 
                key={d.id} 
                onClick={() => selecionarDisciplina(d)}
                style={{
                  background: disciplinaSelecionada?.id === d.id ? "rgba(45,212,191,0.1)" : "var(--bg-input)",
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
                  <div style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: "500" }}>{d.nome}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "2px" }}>
                    {d.codigo} · {d.creditos} créditos · {(() => {
                      const pares = d.cursos.map(c => ({ ano: c.ano_curricular, sem: c.semestre }))
                      const paresUnicos = pares.filter((p, i, self) =>
                        i === self.findIndex(t => t.ano === p.ano && t.sem === p.sem)
                      ).sort((a, b) => a.ano - b.ano || a.sem.localeCompare(b.sem))
                      return paresUnicos.length > 0
                        ? paresUnicos.map(p => `${p.ano}º Ano ${p.sem}`).join(", ")
                        : "—"
                    })()}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#2dd4bf"
                  }}>
                    {d.total_estudantes} estudantes
                  </div>
                  <div style={{
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    transition: "transform 0.2s",
                    transform: disciplinaSelecionada?.id === d.id ? "rotate(180deg)" : "rotate(0deg)"
                  }}>▼</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estudantes da disciplina selecionada */}
      {disciplinaSelecionada && (
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "14px",
          padding: "20px"
        }}>
          <div style={{
            fontSize: "14px",
            fontWeight: "600",
            marginBottom: "16px",
            color: "var(--text-primary)"
          }}>
            Estudantes — {disciplinaSelecionada.nome}
          </div>

          {loadingEstudantes ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>A carregar estudantes...</div>
          ) : estudantes.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>
              Nenhum estudante encontrado
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color-strong)" }}>
                    <th style={{ textAlign: "left", padding: "10px", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase" }}>Estudante</th>
                    <th style={{ textAlign: "center", padding: "10px", color: "var(--text-muted)", fontSize: "11px" }}>AC1</th>
                    <th style={{ textAlign: "center", padding: "10px", color: "var(--text-muted)", fontSize: "11px" }}>AC2</th>
                    <th style={{ textAlign: "center", padding: "10px", color: "var(--text-muted)", fontSize: "11px" }}>AC3</th>
                    <th style={{ textAlign: "center", padding: "10px", color: "var(--text-muted)", fontSize: "11px" }}>TTP</th>
                    <th style={{ textAlign: "center", padding: "10px", color: "var(--text-muted)", fontSize: "11px" }}>PP1</th>
                    <th style={{ textAlign: "center", padding: "10px", color: "var(--text-muted)", fontSize: "11px" }}>PP2</th>
                    <th style={{ textAlign: "center", padding: "10px", color: "var(--text-muted)", fontSize: "11px" }}>Exame</th>
                    <th style={{ textAlign: "center", padding: "10px", color: "var(--text-muted)", fontSize: "11px" }}>Recurso</th>
                    <th style={{ textAlign: "center", padding: "10px", color: "var(--text-muted)", fontSize: "11px" }}>Especial</th>
                    <th style={{ textAlign: "center", padding: "10px", color: "var(--text-muted)", fontSize: "11px" }}>Final</th>
                    <th style={{ textAlign: "center", padding: "10px", color: "var(--text-muted)", fontSize: "11px" }}>Estado</th>
                    <th style={{ textAlign: "center", padding: "10px", color: "var(--text-muted)", fontSize: "11px" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {estudantes.map(e => (
                    <tr key={e.id_nota} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "10px" }}>
                        <div style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: "500" }}>{e.nome}</div>
                        <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>{e.numero_estudante}</div>
                      </td>
                      {["ac1", "ac2", "ac3", "ttp", "pp1", "pp2", "exame", "recurso", "exame_especial"].map((campo) => (
                        <td key={campo} style={{ textAlign: "center", padding: "10px" }}>
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
                                width: "50px",
                                padding: "4px",
                                borderRadius: "4px",
                                border: "1px solid rgba(255,255,255,0.2)",
                                background: "var(--bg-input)",
                                color: "var(--text-primary)",
                                fontSize: "12px",
                                textAlign: "center"
                              }}
                            />
                          ) : (
                            <span style={{ color: "var(--text-primary)", fontSize: "12px" }}>
                              {e[campo as keyof Estudante] != null ? arredondarNota(Number(e[campo as keyof Estudante])) : "—"}
                            </span>
                          )}
                        </td>
                      ))}
                      <td style={{ textAlign: "center", padding: "10px" }}>
                        <span style={{
                          fontWeight: "700",
                          color: e.nota_final != null 
                            ? (e.nota_final >= 10 ? "#22c55e" : "var(--accent)")
                            : "var(--text-muted)"
                        }}>
                            {e.nota_final != null ? arredondarNota(e.nota_final) : "—"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", padding: "10px" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: "600",
                          background: `${getBadgeColor(e.avaliacao_atual)}20`,
                          color: getBadgeColor(e.avaliacao_atual)
                        }}>
                          {getBadgeText(e.avaliacao_atual)}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", padding: "10px" }}>
                        {editandoNota === e.id_nota ? (
                          <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                            <button
                              onClick={() => salvarNota(e.id_estudante)}
                              disabled={salvando}
                              style={{
                                padding: "4px 8px",
                                background: "#22c55e",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "11px",
                                cursor: "pointer"
                              }}
                            >
                              {salvando ? "..." : "Salvar"}
                            </button>
                            <button
                              onClick={cancelarEdicao}
                              style={{
                                padding: "4px 8px",
                                background: "var(--text-muted)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "11px",
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
                              padding: "4px 8px",
                              background: "#2dd4bf",
                              color: "var(--bg-input)",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "11px",
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
    </DashboardLayout>
  )
}