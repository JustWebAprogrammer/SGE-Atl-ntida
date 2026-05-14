"use client"

import { useState, useEffect } from "react"

type NotaDisciplina = {
  id_nota: number
  nome_disciplina: string
  codigo_disciplina: string
  ano_curricular: number
  semestre: string
  nota_final: number | null
  ano_lectivo: string
  dispensada: boolean
}

type GrupoAno = {
  ano_curricular: number
  semestre: string
  disciplinas: NotaDisciplina[]
}

type Finalista = {
  id_snapshot: number
  id_estudante: number
  data_snapshot: string
  ano_lectivo: string
  estudante: {
    nome_completo: string
    numero_estudante: string | null
    curso: string
  }
  dados_pessoais: {
    nome_completo: string
    numero_estudante: string | null
    nome_curso: string
    duracao_anos: number | null
    ano_current: number | null
    ano_electivo: string | null
    turno: string
    tipo_bolsa: string
  } | null
  monografia_snapshot: {
    id_monografia: number
    titulo: string
    nota_final: number | null
    data_defesa: string | null
    hora_defesa: string | null
    sala_defesa: string | null
    nome_co_orientador: string | null
    nome_co_autor: string | null
    orientador: { nome_completo: string; especialidade: string } | null
  } | null
  notas_snapshot: NotaDisciplina[] | GrupoAno[] | null
}

type Curso = {
  id_curso: number
  nome_curso: string
}

function isFormatoAgrupado(notas: NotaDisciplina[] | GrupoAno[]): notas is GrupoAno[] {
  if (notas.length === 0) return false
  const item = notas[0] as Record<string, unknown>
  return "disciplinas" in item && Array.isArray(item.disciplinas)
}

export default function FinalistasDashboard() {
  const [finalistas, setFinalistas] = useState<Finalista[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [loading, setLoading] = useState(true)
  const [pesquisa, setPesquisa] = useState("")
  const [filtroCurso, setFiltroCurso] = useState("")
  const [filtroAnoLectivo, setFiltroAnoLectivo] = useState("")
  const [selectedFinalista, setSelectedFinalista] = useState<Finalista | null>(null)

  useEffect(() => {
    fetch("/api/admin/sistema/finalistas")
      .then(r => r.json())
      .then(data => {
        setFinalistas(data.finalistas || [])
        setCursos(data.cursos || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const anosLectivos = Array.from(new Set(finalistas.map(f => f.ano_lectivo).filter(Boolean))).sort().reverse()

  const filtered = finalistas.filter(f => {
    if (pesquisa) {
      const termo = pesquisa.toLowerCase().trim()
      const nomeMatch = f.estudante.nome_completo.toLowerCase().includes(termo)
      const numeroMatch = f.estudante.numero_estudante?.toLowerCase().includes(termo)
      if (!nomeMatch && !numeroMatch) return false
    }
    if (filtroCurso && f.estudante.curso !== filtroCurso) return false
    if (filtroAnoLectivo && f.ano_lectivo !== filtroAnoLectivo) return false
    return true
  })

  function formatNota(nota: number | null): string {
    if (nota === null) return "—"
    return nota.toFixed(2)
  }

  function formatData(data: string | null): string {
    if (!data) return "—"
    return new Date(data).toLocaleDateString("pt-AO")
  }

  function renderNotas(notas: Finalista["notas_snapshot"]) {
    if (!notas || notas.length === 0) return <em style={{ color: "#555e78" }}>Nenhuma nota registada</em>

    // Formato novo: agrupado por ano/semestre com disciplinas dentro
    if (isFormatoAgrupado(notas)) {
      return notas.map((grupo) => {
        const g = grupo as GrupoAno
        return (
          <div key={`${g.ano_curricular}-${g.semestre}`} style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#2dd4bf", marginBottom: "8px" }}>
              {g.ano_curricular}º Ano — {g.semestre}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "#555e78" }}>Disciplina</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: "#555e78" }}>Nota</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: "#555e78" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {g.disciplinas.map((n) => (
                  <tr key={n.id_nota} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "6px 8px", color: "#e8eaf0" }}>{n.nome_disciplina}</td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>
                      <span style={{
                        fontWeight: "700",
                        color: n.nota_final != null && n.nota_final >= 10 ? "#22c55e" : "#e03d3d",
                      }}>
                        {formatNota(n.nota_final)}
                      </span>
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>
                      {n.dispensada ? (
                        <span style={{ color: "#2dd4bf", fontSize: "11px" }}>Dispensa</span>
                      ) : n.nota_final != null && n.nota_final >= 10 ? (
                        <span style={{ color: "#22c55e", fontSize: "11px" }}>Aprovado</span>
                      ) : (
                        <span style={{ color: "#e03d3d", fontSize: "11px" }}>Reprovado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })
    }

    // Formato antigo (plano): agrupa por ano manualmente
    const notasPlanas = notas as NotaDisciplina[]
    const porAno: Record<number, NotaDisciplina[]> = {}
    for (const n of notasPlanas) {
      if (!porAno[n.ano_curricular]) porAno[n.ano_curricular] = []
      porAno[n.ano_curricular].push(n)
    }

    return Object.entries(porAno)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([ano, lista]) => (
        <div key={ano} style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#2dd4bf", marginBottom: "8px" }}>
            {ano}º Ano
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#555e78" }}>Disciplina</th>
                <th style={{ textAlign: "center", padding: "6px 8px", color: "#555e78" }}>Semestre</th>
                <th style={{ textAlign: "center", padding: "6px 8px", color: "#555e78" }}>Nota</th>
                <th style={{ textAlign: "center", padding: "6px 8px", color: "#555e78" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista
                .sort((a, b) => a.semestre.localeCompare(b.semestre))
                .map((n) => (
                  <tr key={n.id_nota} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "6px 8px", color: "#e8eaf0" }}>{n.nome_disciplina}</td>
                    <td style={{ padding: "6px 8px", color: "#9098b0", textAlign: "center" }}>{n.semestre}</td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>
                      <span style={{
                        fontWeight: "700",
                        color: n.nota_final != null && n.nota_final >= 10 ? "#22c55e" : "#e03d3d",
                      }}>
                        {formatNota(n.nota_final)}
                      </span>
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>
                      {n.dispensada ? (
                        <span style={{ color: "#2dd4bf", fontSize: "11px" }}>Dispensa</span>
                      ) : n.nota_final != null && n.nota_final >= 10 ? (
                        <span style={{ color: "#22c55e", fontSize: "11px" }}>Aprovado</span>
                      ) : (
                        <span style={{ color: "#e03d3d", fontSize: "11px" }}>Reprovado</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))
  }

  const cardStyle: React.CSSProperties = {
    background: "#1e2230",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "20px",
  }

  return (
    <>
      {/* Filtros */}
      <div style={{
        display: "flex",
        gap: "12px",
        marginBottom: "20px",
        flexWrap: "wrap",
        alignItems: "center",
      }}>
        <input
          type="text"
          placeholder="🔍 Pesquisar por nome ou nº estudante..."
          value={pesquisa}
          onChange={e => setPesquisa(e.target.value)}
          style={{
            flex: 1,
            minWidth: "200px",
            padding: "10px 14px",
            background: "#13161e",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "#e8eaf0",
            fontSize: "13px",
          }}
        />
        <select
          value={filtroCurso}
          onChange={e => setFiltroCurso(e.target.value)}
          style={{
            padding: "10px 14px",
            background: "#13161e",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "#e8eaf0",
            fontSize: "13px",
            minWidth: "160px",
          }}
        >
          <option value="">Todos os Cursos</option>
          {cursos.map(c => (
            <option key={c.id_curso} value={c.nome_curso}>{c.nome_curso}</option>
          ))}
        </select>
        <select
          value={filtroAnoLectivo}
          onChange={e => setFiltroAnoLectivo(e.target.value)}
          style={{
            padding: "10px 14px",
            background: "#13161e",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "#e8eaf0",
            fontSize: "13px",
            minWidth: "140px",
          }}
        >
          <option value="">Todos os Anos Lectivos</option>
          {anosLectivos.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <div style={{ fontSize: "12px", color: "#555e78", whiteSpace: "nowrap" }}>
          {filtered.length} finalista(s)
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#555e78" }}>A carregar...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#555e78" }}>
          Nenhum finalista encontrado.
        </div>
      ) : (
        <div style={{ background: "#1e2230", borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <th style={{ textAlign: "left", padding: "12px", color: "#9098b0", fontSize: "11px", textTransform: "uppercase" }}>Nome</th>
                <th style={{ textAlign: "left", padding: "12px", color: "#9098b0", fontSize: "11px", textTransform: "uppercase" }}>Nº</th>
                <th style={{ textAlign: "left", padding: "12px", color: "#9098b0", fontSize: "11px", textTransform: "uppercase" }}>Curso</th>
                <th style={{ textAlign: "center", padding: "12px", color: "#9098b0", fontSize: "11px", textTransform: "uppercase" }}>Nota</th>
                <th style={{ textAlign: "center", padding: "12px", color: "#9098b0", fontSize: "11px", textTransform: "uppercase" }}>Defesa</th>
                <th style={{ textAlign: "center", padding: "12px", color: "#9098b0", fontSize: "11px", textTransform: "uppercase" }}>Ano Lectivo</th>
                <th style={{ textAlign: "center", padding: "12px", color: "#9098b0", fontSize: "11px", textTransform: "uppercase" }}>Acções</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id_snapshot} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "12px", color: "#e8eaf0", fontWeight: "500" }}>{f.estudante.nome_completo}</td>
                  <td style={{ padding: "12px", color: "#9098b0" }}>{f.estudante.numero_estudante || "—"}</td>
                  <td style={{ padding: "12px", color: "#9098b0" }}>{f.estudante.curso}</td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <span style={{
                      fontWeight: "700",
                      color: f.monografia_snapshot?.nota_final != null && f.monografia_snapshot.nota_final >= 10 ? "#22c55e" : "#e03d3d",
                    }}>
                      {f.monografia_snapshot ? formatNota(f.monografia_snapshot.nota_final) : "—"}
                    </span>
                  </td>
                  <td style={{ padding: "12px", textAlign: "center", color: "#9098b0", fontSize: "12px" }}>
                    {f.monografia_snapshot?.data_defesa ? formatData(f.monografia_snapshot.data_defesa) : "—"}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center", color: "#9098b0" }}>{f.ano_lectivo || "—"}</td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <button
                      onClick={() => setSelectedFinalista(f)}
                      style={{
                        padding: "6px 12px",
                        background: "#9b59b6",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de detalhes */}
      {selectedFinalista && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px", overflowY: "auto",
        }} onClick={() => setSelectedFinalista(null)}>
          <div style={{
            background: "#1e2230", border: "1px solid rgba(155,89,182,0.3)",
            borderRadius: "16px", padding: "28px", maxWidth: "800px", width: "100%",
            maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#e8eaf0" }}>
                  🎓 {selectedFinalista.estudante.nome_completo}
                </div>
                <div style={{ fontSize: "13px", color: "#555e78", marginTop: "4px" }}>
                  {selectedFinalista.estudante.numero_estudante} · {selectedFinalista.estudante.curso}
                </div>
              </div>
              <button
                onClick={() => setSelectedFinalista(null)}
                style={{
                  padding: "8px 12px", background: "#555e78", color: "white",
                  border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer",
                }}
              >
                ✕ Fechar
              </button>
            </div>

            {/* Dados Pessoais (congelados) */}
            {selectedFinalista.dados_pessoais && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#2dd4bf", marginBottom: "8px" }}>
                  📋 Dados Pessoais (Snapshot)
                </div>
                <div style={{
                  background: "rgba(13,15,20,0.5)", borderRadius: "10px", padding: "16px",
                  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px",
                }}>
                  <div>
                    <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#555e78", marginBottom: "2px" }}>Nome</div>
                    <div style={{ fontSize: "13px", color: "#e8eaf0" }}>{selectedFinalista.dados_pessoais.nome_completo}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#555e78", marginBottom: "2px" }}>Nº</div>
                    <div style={{ fontSize: "13px", color: "#e8eaf0" }}>{selectedFinalista.dados_pessoais.numero_estudante || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#555e78", marginBottom: "2px" }}>Curso</div>
                    <div style={{ fontSize: "13px", color: "#e8eaf0" }}>{selectedFinalista.dados_pessoais.nome_curso}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#555e78", marginBottom: "2px" }}>Ano Lectivo</div>
                    <div style={{ fontSize: "13px", color: "#e8eaf0" }}>{selectedFinalista.dados_pessoais.ano_electivo || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#555e78", marginBottom: "2px" }}>Turno</div>
                    <div style={{ fontSize: "13px", color: "#e8eaf0" }}>{selectedFinalista.dados_pessoais.turno}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#555e78", marginBottom: "2px" }}>Bolsa</div>
                    <div style={{ fontSize: "13px", color: "#e8eaf0" }}>
                      {selectedFinalista.dados_pessoais.tipo_bolsa === "Nenhuma" ? "Sem bolsa" :
                       selectedFinalista.dados_pessoais.tipo_bolsa === "Cinquenta" ? "50%" : "100%"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Monografia */}
            {selectedFinalista.monografia_snapshot && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#9b59b6", marginBottom: "8px" }}>
                  📄 Monografia
                </div>
                <div style={{
                  background: "rgba(13,15,20,0.5)", borderRadius: "10px", padding: "16px",
                  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px",
                }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#555e78", marginBottom: "2px" }}>Título</div>
                    <div style={{ fontSize: "13px", color: "#e8eaf0", fontWeight: "500" }}>{selectedFinalista.monografia_snapshot.titulo}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#555e78", marginBottom: "2px" }}>Nota Final</div>
                    <div style={{
                      fontSize: "24px", fontWeight: "700",
                      color: (selectedFinalista.monografia_snapshot.nota_final ?? 0) >= 10 ? "#22c55e" : "#e03d3d",
                    }}>
                      {formatNota(selectedFinalista.monografia_snapshot.nota_final)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#555e78", marginBottom: "2px" }}>Resultado</div>
                    <div style={{ fontSize: "13px", color: (selectedFinalista.monografia_snapshot.nota_final ?? 0) >= 10 ? "#22c55e" : "#e03d3d" }}>
                      {(selectedFinalista.monografia_snapshot.nota_final ?? 0) >= 10 ? "✅ Aprovado" : "❌ Reprovado"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#555e78", marginBottom: "2px" }}>Data Defesa</div>
                    <div style={{ fontSize: "13px", color: "#e8eaf0" }}>
                      {formatData(selectedFinalista.monografia_snapshot.data_defesa)}
                      {selectedFinalista.monografia_snapshot.hora_defesa ? ` às ${selectedFinalista.monografia_snapshot.hora_defesa}h` : ""}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#555e78", marginBottom: "2px" }}>Sala</div>
                    <div style={{ fontSize: "13px", color: "#e8eaf0" }}>{selectedFinalista.monografia_snapshot.sala_defesa || "—"}</div>
                  </div>
                  {selectedFinalista.monografia_snapshot.orientador && (
                    <div>
                      <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#555e78", marginBottom: "2px" }}>Orientador</div>
                      <div style={{ fontSize: "13px", color: "#e8eaf0" }}>
                        {selectedFinalista.monografia_snapshot.orientador.nome_completo}
                      </div>
                    </div>
                  )}
                  {selectedFinalista.monografia_snapshot.nome_co_orientador && (
                    <div>
                      <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#555e78", marginBottom: "2px" }}>Co-orientador</div>
                      <div style={{ fontSize: "13px", color: "#e8eaf0" }}>{selectedFinalista.monografia_snapshot.nome_co_orientador}</div>
                    </div>
                  )}
                  {selectedFinalista.monografia_snapshot.nome_co_autor && (
                    <div>
                      <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#555e78", marginBottom: "2px" }}>Co-autor</div>
                      <div style={{ fontSize: "13px", color: "#e8eaf0" }}>{selectedFinalista.monografia_snapshot.nome_co_autor}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notas */}
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#22c55e", marginBottom: "8px" }}>
                📊 Notas (Snapshot)
              </div>
              {renderNotas(selectedFinalista.notas_snapshot)}
            </div>

            {/* Data snapshot */}
            <div style={{ marginTop: "16px", fontSize: "11px", color: "#555e78", textAlign: "center" }}>
              Snapshot criado em {new Date(selectedFinalista.data_snapshot).toLocaleString("pt-AO")}
            </div>
          </div>
        </div>
      )}
    </>
  )
}