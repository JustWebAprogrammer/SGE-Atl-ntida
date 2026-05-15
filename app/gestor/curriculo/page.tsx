"use client"

import { useState, useEffect, useMemo } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { gestorNavItems } from "../gestorNav"

type Curso = {
  id_curso: number
  nome_curso: string
  duracao_anos: number | null
}

type Disciplina = {
  id_disciplina: number
  nome_disciplina: string
  codigo_disciplina: string
  creditos: number
  id_departamento: number
  nome_departamento: string
}

type Departamento = {
  id_departamento: number
  nome_departamento: string
}

type CurriculoItem = {
  id_disciplina: number
  nome_disciplina: string
  codigo_disciplina: string
  creditos: number
  ano_curricular: number
  semestre: string
}

export default function CurriculoPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<Disciplina[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [cursoSelecionado, setCursoSelecionado] = useState<number | null>(null)
  const [curriculo, setCurriculo] = useState<CurriculoItem[]>([])
  const [cursoInfo, setCursoInfo] = useState<Curso | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingCurriculo, setLoadingCurriculo] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Formulário
  const [disciplinaId, setDisciplinaId] = useState<string>("")
  const [ano, setAno] = useState<string>("1")
  const [semestre, setSemestre] = useState<string>("S1")

  // Filtros de disciplinas
  const [filtroDepartamento, setFiltroDepartamento] = useState<string>("todos")
  const [filtroNome, setFiltroNome] = useState<string>("")

  useEffect(() => {
    Promise.all([
      fetch("/api/gestor/cursos").then(r => r.json()),
      fetch("/api/gestor/disciplinas/disponiveis").then(r => r.json()),
    ]).then(([cursosData, discData]) => {
      setCursos(cursosData.cursos || [])
      setDisciplinasDisponiveis(discData.disciplinas || [])
      setDepartamentos(discData.departamentos || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!cursoSelecionado) {
      setCurriculo([])
      setCursoInfo(null)
      return
    }
    setLoadingCurriculo(true)
    fetch(`/api/gestor/curriculo?cursoId=${cursoSelecionado}`)
      .then(r => r.json())
      .then(data => {
        setCurriculo(data.curriculo || [])
        if (data.curso) {
          setCursoInfo({
            id_curso: cursoSelecionado,
            nome_curso: data.curso.nome_curso,
            duracao_anos: data.curso.duracao_anos
          })
        }
        setLoadingCurriculo(false)
      })
      .catch(() => setLoadingCurriculo(false))
  }, [cursoSelecionado])

  const anosDisponiveis = useMemo(() => {
    const duracao = cursoInfo?.duracao_anos || 6
    return Array.from({ length: duracao }, (_, i) => i + 1)
  }, [cursoInfo])

  // Agrupar currículo por ano e semestre
  const curriculoAgrupado = useMemo(() => {
    const grupos = new Map<number, Map<string, CurriculoItem[]>>()
    for (const item of curriculo) {
      if (!grupos.has(item.ano_curricular)) {
        grupos.set(item.ano_curricular, new Map())
      }
      const semestres = grupos.get(item.ano_curricular)!
      if (!semestres.has(item.semestre)) {
        semestres.set(item.semestre, [])
      }
      semestres.get(item.semestre)!.push(item)
    }
    return grupos
  }, [curriculo])

  async function adicionarDisciplina(e: React.FormEvent) {
    e.preventDefault()
    if (!cursoSelecionado || !disciplinaId) return

    setSalvando(true)
    try {
      const res = await fetch("/api/gestor/curriculo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_curso: cursoSelecionado,
          id_disciplina: parseInt(disciplinaId),
          ano_curricular: parseInt(ano),
          semestre
        })
      })

      if (res.ok) {
        // Recarregar currículo
        const data = await fetch(`/api/gestor/curriculo?cursoId=${cursoSelecionado}`).then(r => r.json())
        setCurriculo(data.curriculo || [])
        setDisciplinaId("")
      } else {
        const err = await res.json()
        alert(err.error || "Erro ao adicionar disciplina")
      }
    } catch {
      alert("Erro ao adicionar disciplina")
    } finally {
      setSalvando(false)
    }
  }

  async function removerDisciplina(id_disciplina: number) {
    if (!cursoSelecionado) return
    if (!confirm("Tem certeza que deseja remover esta disciplina do currículo?")) return

    try {
      const res = await fetch(`/api/gestor/curriculo?id_curso=${cursoSelecionado}&id_disciplina=${id_disciplina}`, {
        method: "DELETE"
      })

      if (res.ok) {
        const data = await fetch(`/api/gestor/curriculo?cursoId=${cursoSelecionado}`).then(r => r.json())
        setCurriculo(data.curriculo || [])
      } else {
        alert("Erro ao remover disciplina")
      }
    } catch {
      alert("Erro ao remover disciplina")
    }
  }

  // Disciplinas ainda não atribuídas ao curso (com filtros)
  const disciplinasNaoAtribuidas = useMemo(() => {
    const atribuidasIds = new Set(curriculo.map(c => c.id_disciplina))
    return disciplinasDisponiveis.filter(d => {
      if (atribuidasIds.has(d.id_disciplina)) return false
      if (filtroDepartamento !== "todos" && d.id_departamento !== parseInt(filtroDepartamento)) return false
      if (filtroNome) {
        const termo = filtroNome.toLowerCase()
        const matchNome = d.nome_disciplina.toLowerCase().includes(termo)
        const matchCodigo = d.codigo_disciplina.toLowerCase().includes(termo)
        if (!matchNome && !matchCodigo) return false
      }
      return true
    })
  }, [disciplinasDisponiveis, curriculo, filtroDepartamento, filtroNome])

  return (
    <DashboardLayout
      navItems={gestorNavItems}
      title="Currículo dos Cursos"
      subtitle="Gerir disciplinas por curso, ano e semestre"
    >
      {/* Selecionar Curso */}
      <div style={{
        background: "#1e2230",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        padding: "20px",
        marginBottom: "20px"
      }}>
        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#e8eaf0" }}>
          Selecionar Curso
        </div>
        {loading ? (
          <div style={{ color: "#b0b8cf" }}>A carregar...</div>
        ) : cursos.length === 0 ? (
          <div style={{ color: "#b0b8cf" }}>Nenhum curso encontrado no departamento</div>
        ) : (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {cursos.map(c => (
              <button
                key={c.id_curso}
                onClick={() => setCursoSelecionado(c.id_curso)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "10px",
                  border: "1px solid",
                  borderColor: cursoSelecionado === c.id_curso ? "#2dd4bf" : "rgba(255,255,255,0.1)",
                  background: cursoSelecionado === c.id_curso ? "rgba(45,212,191,0.1)" : "#13161e",
                  color: cursoSelecionado === c.id_curso ? "#2dd4bf" : "#e8eaf0",
                  fontSize: "13px",
                  fontWeight: cursoSelecionado === c.id_curso ? "600" : "400",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {c.nome_curso}
                {c.duracao_anos && <span style={{ color: "#b0b8cf", marginLeft: "6px" }}>({c.duracao_anos} anos)</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {cursoSelecionado && (
        <>
          {/* Formulário para adicionar disciplina */}
          <div style={{
            background: "#1e2230",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "14px",
            padding: "20px",
            marginBottom: "20px"
          }}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#e8eaf0" }}>
              Adicionar Disciplina ao Curso
            </div>
            <form onSubmit={adicionarDisciplina}>
            {/* Filtros de disciplinas */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end", width: "100%", marginBottom: "8px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Departamento</div>
                <select
                  value={filtroDepartamento}
                  onChange={e => setFiltroDepartamento(e.target.value)}
                  style={{
                    background: "#13161e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "#e8eaf0",
                    fontSize: "13px",
                    minWidth: "180px"
                  }}
                >
                  <option value="todos">Todos os Departamentos</option>
                  {departamentos.map(dep => (
                    <option key={dep.id_departamento} value={dep.id_departamento}>
                      {dep.nome_departamento}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Pesquisar</div>
                <input
                  type="text"
                  placeholder="Nome ou código..."
                  value={filtroNome}
                  onChange={e => setFiltroNome(e.target.value)}
                  style={{
                    background: "#13161e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "#e8eaf0",
                    fontSize: "13px",
                    minWidth: "180px"
                  }}
                />
              </div>

              {(filtroDepartamento !== "todos" || filtroNome) && (
                <button
                  type="button"
                  onClick={() => { setFiltroDepartamento("todos"); setFiltroNome("") }}
                  style={{
                    padding: "8px 12px",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#d0d7e8",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  Limpar filtros
                </button>
              )}

              <div style={{ color: "#b0b8cf", fontSize: "12px", padding: "8px 0" }}>
                {disciplinasNaoAtribuidas.length} disciplina{disciplinasNaoAtribuidas.length !== 1 ? "s" : ""} disponível{disciplinasNaoAtribuidas.length !== 1 ? "is" : ""}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Disciplina</div>
                <select
                  value={disciplinaId}
                  onChange={e => setDisciplinaId(e.target.value)}
                  required
                  style={{
                    background: "#13161e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "#e8eaf0",
                    fontSize: "13px",
                    minWidth: "320px"
                  }}
                >
                  <option value="">
                    {disciplinasNaoAtribuidas.length === 0 ? "Nenhuma disciplina encontrada" : "Selecionar disciplina..."}
                  </option>
                  {disciplinasNaoAtribuidas.map(d => (
                    <option key={d.id_disciplina} value={d.id_disciplina}>
                      {d.nome_disciplina} ({d.codigo_disciplina}) — {d.creditos} créditos — {d.nome_departamento}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Ano</div>
                <select
                  value={ano}
                  onChange={e => setAno(e.target.value)}
                  style={{
                    background: "#13161e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "#e8eaf0",
                    fontSize: "13px",
                    minWidth: "80px"
                  }}
                >
                  {anosDisponiveis.map(a => (
                    <option key={a} value={a}>{a}º</option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#b0b8cf", marginBottom: "4px" }}>Semestre</div>
                <select
                  value={semestre}
                  onChange={e => setSemestre(e.target.value)}
                  style={{
                    background: "#13161e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "#e8eaf0",
                    fontSize: "13px",
                    minWidth: "90px"
                  }}
                >
                  <option value="S1">S1</option>
                  <option value="S2">S2</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={salvando || !disciplinaId}
                style={{
                  padding: "8px 16px",
                  background: disciplinaId ? "#2dd4bf" : "#b0b8cf",
                  color: disciplinaId ? "#13161e" : "#d0d7e8",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: disciplinaId ? "pointer" : "not-allowed",
                  transition: "all 0.2s"
                }}
              >
                {salvando ? "A adicionar..." : "+ Adicionar"}
              </button>
            </div>
            </form>
          </div>

          {/* Visualização do currículo */}
          <div style={{
            background: "#1e2230",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "14px",
            padding: "20px"
          }}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "#e8eaf0" }}>
              Currículo — {cursoInfo?.nome_curso}
            </div>

            {loadingCurriculo ? (
              <div style={{ color: "#b0b8cf", textAlign: "center", padding: "30px" }}>A carregar currículo...</div>
            ) : curriculo.length === 0 ? (
              <div style={{ color: "#b0b8cf", textAlign: "center", padding: "30px" }}>
                Nenhuma disciplina atribuída a este curso. Use o formulário acima para adicionar.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {anosDisponiveis.map(anoCurso => {
                  const semestres = curriculoAgrupado.get(anoCurso)
                  if (!semestres || semestres.size === 0) return null

                  return (
                    <div key={anoCurso}>
                      <div style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#2dd4bf",
                        marginBottom: "8px",
                        paddingBottom: "4px",
                        borderBottom: "1px solid rgba(45,212,191,0.2)"
                      }}>
                        {anoCurso}º Ano
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {["S1", "S2"].map(sem => {
                          const disciplinas = semestres.get(sem)
                          if (!disciplinas || disciplinas.length === 0) return null

                          return (
                            <div key={sem}>
                              <div style={{
                                fontSize: "11px",
                                fontWeight: "600",
                                color: "#d0d7e8",
                                textTransform: "uppercase",
                                marginBottom: "6px",
                                letterSpacing: "0.5px"
                              }}>
                                {sem === "S1" ? "1º Semestre" : "2º Semestre"}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {disciplinas.map(d => (
                                  <div key={d.id_disciplina} style={{
                                    background: "#13161e",
                                    borderRadius: "8px",
                                    padding: "10px 14px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                  }}>
                                    <div>
                                      <div style={{ color: "#e8eaf0", fontSize: "13px", fontWeight: "500" }}>
                                        {d.nome_disciplina}
                                      </div>
                                      <div style={{ color: "#b0b8cf", fontSize: "11px", marginTop: "2px" }}>
                                        {d.codigo_disciplina} · {d.creditos} créditos
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => removerDisciplina(d.id_disciplina)}
                                      style={{
                                        padding: "4px 10px",
                                        background: "transparent",
                                        border: "1px solid rgba(224,61,61,0.3)",
                                        borderRadius: "6px",
                                        color: "#e03d3d",
                                        fontSize: "11px",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                      }}
                                      onMouseEnter={e => {
                                        e.currentTarget.style.background = "rgba(224,61,61,0.1)"
                                      }}
                                      onMouseLeave={e => {
                                        e.currentTarget.style.background = "transparent"
                                      }}
                                    >
                                      Remover
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
