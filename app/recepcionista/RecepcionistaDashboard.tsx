"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "../components/DashboardLayout"

import { recepcionistaNavItems } from "./recepcionistaNav"

const navItems = recepcionistaNavItems

const ANOS = [
  { value: "todos", label: "Todos os anos" },
  { value: "1", label: "1º ano" },
  { value: "2", label: "2º ano" },
  { value: "3", label: "3º ano" },
  { value: "4", label: "4º ano" },
  { value: "5", label: "5º ano" },
]

type Curso = { id_curso: number; nome_curso: string }

type Estudante = {
  id_estudante: number
  nome_completo: string
  numero_estudante: string | null
  ano_current: number | null
  estado: string
  pagamento: string
  curso: { nome_curso: string; id_curso: number }
}

function BadgePagamento({ estado }: { estado: string }) {
  const cfg = {
    Pago:     { bg: "rgba(34,197,94,0.12)",  color: "#22c55e", label: "Propina OK" },
    Pendente: { bg: "rgba(240,165,0,0.12)",   color: "#f0a500", label: "Pendente" },
    Atrasado: { bg: "rgba(224,61,61,0.12)",   color: "#e03d3d", label: "Atrasado" },
  }[estado] ?? { bg: "rgba(85,94,120,0.2)", color: "#b0b8cf", label: estado }

  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      padding: "3px 10px", borderRadius: "20px",
      fontSize: "11px", fontWeight: "600"
    }}>{cfg.label}</span>
  )
}

function BadgeEstado({ estado }: { estado: string }) {
  const cfg = {
    EmCurso:    { bg: "rgba(45,212,191,0.1)",  color: "#2dd4bf" },
    Finalizado: { bg: "rgba(34,197,94,0.12)",  color: "#22c55e" },
    Desistente: { bg: "rgba(224,61,61,0.12)",  color: "#e03d3d" },
  }[estado] ?? { bg: "rgba(85,94,120,0.2)", color: "#b0b8cf" }

  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      padding: "3px 10px", borderRadius: "20px",
      fontSize: "11px", fontWeight: "600"
    }}>{estado}</span>
  )
}

export default function RecepcionistaDashboard() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [anoFiltro, setAnoFiltro] = useState("todos")
  const [cursoFiltro, setCursoFiltro] = useState("todos")
  const [cursos, setCursos] = useState<Curso[]>([])
  const [resultados, setResultados] = useState<Estudante[]>([])
  const [loading, setLoading] = useState(false)
  const [pesquisou, setPesquisou] = useState(false)
  const [erro, setErro] = useState("")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Carregar cursos ao montar
  useEffect(() => {
    fetch("/api/recepcionista/cursos")
      .then(r => r.json())
      .then(data => {
        if (data.cursos) setCursos(data.cursos)
      })
      .catch(() => console.error("Erro ao carregar cursos"))
  }, [])

  // Pesquisar quando filtros mudam
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    // Só pesquisar se houver pelo menos um filtro ativo
    const temFiltro = query.trim().length >= 2 || anoFiltro !== "todos" || cursoFiltro !== "todos"
    if (!temFiltro) {
      setResultados([])
      setPesquisou(false)
      return
    }

    timerRef.current = setTimeout(() => {
      pesquisar(query.trim(), anoFiltro, cursoFiltro)
    }, 400)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, anoFiltro, cursoFiltro])

  async function pesquisar(q: string, ano: string, curso: string) {
    setLoading(true)
    setPesquisou(true)
    setErro("")
    try {
      const params = new URLSearchParams()
      if (q.length >= 2) params.set("query", q)
      if (ano !== "todos") params.set("ano", ano)
      if (curso !== "todos") params.set("curso", curso)

      const res = await fetch(`/api/recepcionista/estudante?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        setErro(data.error ?? "Erro na pesquisa")
        setResultados([])
        return
      }
      setResultados(data.estudantes)
    } catch {
      setErro("Erro de ligação")
    } finally {
      setLoading(false)
    }
  }

  function abrirEstudante(id: number) {
    router.push(`/recepcionista/estudante/${id}`)
  }

  const selectStyle: React.CSSProperties = {
    padding: "10px 14px",
    background: "#0d0f14",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    color: "#e8eaf0",
    fontSize: "14px",
    outline: "none",
    cursor: "pointer",
  }

  return (
    <DashboardLayout
      navItems={navItems}
      title="Recepção"
      subtitle="Pesquisa de estudantes"
    >
      {/* Barra de filtros */}
      <div style={{
        background: "#1e2230",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "16px",
        padding: "28px 32px",
        marginBottom: "24px",
      }}>
        <div style={{ fontSize: "13px", color: "#d0d7e8", marginBottom: "16px", fontWeight: "500" }}>
          Filtros de pesquisa
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Pesquisa por nome/número */}
          <div style={{ position: "relative", flex: "1 1 280px", minWidth: "200px" }}>
            <span style={{
              position: "absolute", left: "14px", top: "50%",
              transform: "translateY(-50%)",
              color: "#b0b8cf", fontSize: "14px", pointerEvents: "none"
            }}>🔍</span>
            <input
              type="text"
              placeholder="Nome ou número de estudante..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px 10px 40px",
                background: "#0d0f14",
                border: `1px solid ${erro ? "#e03d3d" : "rgba(255,255,255,0.1)"}`,
                borderRadius: "10px",
                color: "#e8eaf0",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Filtro por ano */}
          <select
            value={anoFiltro}
            onChange={e => setAnoFiltro(e.target.value)}
            style={selectStyle}
          >
            {ANOS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>

          {/* Filtro por curso */}
          <select
            value={cursoFiltro}
            onChange={e => setCursoFiltro(e.target.value)}
            style={selectStyle}
          >
            <option value="todos">Todos os cursos</option>
            {cursos.map(c => (
              <option key={c.id_curso} value={String(c.id_curso)}>{c.nome_curso}</option>
            ))}
          </select>
        </div>

        {erro && (
          <div style={{ fontSize: "12px", color: "#e03d3d", marginTop: "10px" }}>{erro}</div>
        )}
        {!pesquisou && !loading && (
          <div style={{ fontSize: "12px", color: "#b0b8cf", marginTop: "10px" }}>
            Use os filtros acima para pesquisar estudantes
          </div>
        )}
        {loading && (
          <div style={{ fontSize: "12px", color: "#b0b8cf", marginTop: "10px" }}>
            A pesquisar...
          </div>
        )}
      </div>

      {/* Resultados */}
      {pesquisou && !loading && (
        resultados.length === 0 ? (
          <div style={{
            background: "#1e2230",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "14px", padding: "60px",
            textAlign: "center", color: "#b0b8cf"
          }}>
            Nenhum estudante encontrado com os filtros seleccionados.
          </div>
        ) : (
          <div style={{
            background: "#1e2230",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "14px", overflow: "hidden"
          }}>
            {/* Cabeçalho */}
            <div style={{
              padding: "12px 24px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "grid",
              gridTemplateColumns: "2fr 1fr 80px 100px 110px",
              gap: "12px",
              fontSize: "11px", color: "#b0b8cf",
              textTransform: "uppercase", letterSpacing: "0.5px"
            }}>
              <span>Estudante</span>
              <span>Curso</span>
              <span>Ano</span>
              <span>Estado</span>
              <span>Propina</span>
            </div>

            {resultados.map((e, i) => (
              <div
                key={e.id_estudante}
                onClick={() => abrirEstudante(e.id_estudante)}
                style={{
                  padding: "16px 24px",
                  borderBottom: i < resultados.length - 1
                    ? "1px solid rgba(255,255,255,0.05)"
                    : "none",
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 80px 100px 110px",
                  gap: "12px",
                  alignItems: "center",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={ev => (ev.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8eaf0" }}>
                    {e.nome_completo}
                  </div>
                  {e.numero_estudante && (
                    <div style={{ fontSize: "11px", color: "#b0b8cf", marginTop: "2px" }}>
                      Nº {e.numero_estudante}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: "13px", color: "#d0d7e8" }}>
                  {e.curso.nome_curso}
                </div>
                <div style={{ fontSize: "13px", color: "#d0d7e8" }}>
                  {e.ano_current ? `${e.ano_current}º ano` : "—"}
                </div>
                <BadgeEstado estado={e.estado} />
                <BadgePagamento estado={e.pagamento} />
              </div>
            ))}

            <div style={{
              padding: "10px 24px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              fontSize: "11px", color: "#b0b8cf"
            }}>
              {resultados.length} resultado{resultados.length !== 1 ? "s" : ""}
            </div>
          </div>
        )
      )}
    </DashboardLayout>
  )
}
