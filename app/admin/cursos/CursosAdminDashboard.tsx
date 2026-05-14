"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/app/components/DashboardLayout"
import { adminNavItems } from "@/app/admin/adminNav"


interface Curso {
  id_curso: number
  nome_curso: string
  duracao_anos: number
  turnos: string
  id_departamento: number
  departamento: {
    nome_departamento: string
  }
  precos: Array<{
    ano_curricular: number
    valor_propina: number
    valor_multa: number
  }>
  _count: {
    estudantes: number
  }
}

const TURNOS_OPCOES = ["Matinal", "Vespertino", "Noturno"]

function ToggleTurno({ turnos, onChange }: { turnos: string[], onChange: (t: string[]) => void }) {
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {TURNOS_OPCOES.map(t => {
        const ativo = turnos.includes(t)
        return (
          <button
            key={t}
            type="button"
            onClick={() => {
              if (ativo) onChange(turnos.filter(x => x !== t))
              else onChange([...turnos, t])
            }}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid",
              borderColor: ativo ? "#2dd4bf" : "rgba(255,255,255,0.1)",
              background: ativo ? "rgba(45,212,191,0.15)" : "#13161e",
              color: ativo ? "#2dd4bf" : "#9098b0",
              fontSize: "13px",
              fontWeight: ativo ? "600" : "400",
              cursor: "pointer"
            }}
          >
            {ativo ? "✓ " : ""}{t}
          </button>
        )
      })}
    </div>
  )
}

interface Departamento {
  id_departamento: number
  nome_departamento: string
}

interface Disciplina {
  id_disciplina: number
  nome_disciplina: string
  codigo_disciplina: string
  ano_curricular: number
  id_departamento?: number
  nome_departamento?: string
}

interface DisciplinaResponse {
  id_disciplina: number
  nome_disciplina: string
  codigo_disciplina: string
  ano_curricular: number
  creditos?: number
  id_departamento?: number
  nome_departamento?: string
}

export default function CursosAdminDashboard() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [cursoSelecionado, setCursoSelecionado] = useState<Curso | null>(null)
  const [tabActiva, setTabActiva] = useState(1)
  const [precosCurso, setPrecosCurso] = useState<Record<number, { valor_propina: string, valor_multa: string }>>({})
  
  // Estados para gestão de disciplinas
  const [todasDisciplinas, setTodasDisciplinas] = useState<Disciplina[]>([])
  const [disciplinasSelecionadas, setDisciplinasSelecionadas] = useState<number[]>([])
  const [pesquisaDisciplina, setPesquisaDisciplina] = useState("")
  const [filtroDepartamento, setFiltroDepartamento] = useState<number | "">("")
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(false)

  const [formData, setFormData] = useState({
    nome_curso: "",
    duracao_anos: 4,
    turnos: ["Matinal"] as string[],
    id_departamento: 1
  })

  const [editFormData, setEditFormData] = useState({
    nome_curso: "",
    duracao_anos: 4,
    turnos: ["Matinal"] as string[],
    id_departamento: 1
  })

  useEffect(() => {
    fetchAllData()
  }, [])

  async function fetchAllData() {
    try {
      setLoading(true)
      
      const [resCursos, resDepartamentos, resDisciplinas] = await Promise.all([
        fetch('/api/admin/cursos'),
        fetch('/api/admin/departamentos'),
        fetch('/api/admin/disciplinas')
      ])

      const dataCursos = await resCursos.json()
      const dataDepartamentos = await resDepartamentos.json()
      const dataDisciplinas = await resDisciplinas.json()

      setCursos(Array.isArray(dataCursos) ? dataCursos : [])
      setDepartamentos(Array.isArray(dataDepartamentos) ? dataDepartamentos : [])
      setDisciplinas(Array.isArray(dataDisciplinas) ? dataDisciplinas : [])
      
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      const res = await fetch('/api/admin/cursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowModal(false)
        setFormData({ nome_curso: "", duracao_anos: 4, turnos: ["Matinal"], id_departamento: 1 })
        fetchAllData()
      }
    } catch (error) {
      console.error('Erro ao criar curso:', error)
    }
  }

  async function abrirEditarCurso(curso: Curso) {
    setCursoSelecionado(curso)
    setTabActiva(1)
    setPesquisaDisciplina("")
    setFiltroDepartamento("")
    
    setEditFormData({
      nome_curso: curso.nome_curso,
      duracao_anos: curso.duracao_anos,
      turnos: curso.turnos ? curso.turnos.split(",") : ["Matinal"],
      id_departamento: curso.id_departamento
    })
    
    // Preencher preços existentes
    const precos: Record<number, { valor_propina: string, valor_multa: string }> = {}
    for (let ano = 1; ano <= curso.duracao_anos; ano++) {
      const precoExistente = curso.precos.find(p => p.ano_curricular === ano)
      precos[ano] = {
        valor_propina: precoExistente ? String(precoExistente.valor_propina) : "",
        valor_multa: precoExistente ? String(precoExistente.valor_multa) : ""
      }
    }
    setPrecosCurso(precos)
    
    // Carregar disciplinas do curso e todas as disponíveis
    try {
      setLoadingDisciplinas(true)
      const res = await fetch(`/api/admin/cursos/${curso.id_curso}/disciplinas`)
      const data = await res.json()
      
      if (data.todasDisciplinas) {
        setTodasDisciplinas(data.todasDisciplinas)
      }
      
      if (data.disciplinasDoCurso) {
        // Extrair IDs das disciplinas já associadas ao curso
        setDisciplinasSelecionadas(data.disciplinasDoCurso.map((d: DisciplinaResponse) => d.id_disciplina))
      }
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error)
    } finally {
      setLoadingDisciplinas(false)
    }
    
    setShowEditModal(true)
  }

  function toggleDisciplina(idDisciplina: number) {
    setDisciplinasSelecionadas(prev => {
      if (prev.includes(idDisciplina)) {
        return prev.filter(id => id !== idDisciplina)
      } else {
        return [...prev, idDisciplina]
      }
    })
  }

  async function salvarDisciplinas() {
    if (!cursoSelecionado) return
    
    try {
      await fetch(`/api/admin/cursos/${cursoSelecionado.id_curso}/disciplinas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disciplinasIds: disciplinasSelecionadas })
      })
      alert('Disciplinas salvas com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar disciplinas:', error)
      alert('Erro ao salvar disciplinas')
    }
  }

  // Filtrar disciplinas por ano, pesquisa e departamento
  const disciplinasFiltradas = todasDisciplinas.filter(d => {
    // Filtrar por ano curricular
    if (d.ano_curricular !== tabActiva) return false
    
    // Filtrar por pesquisa (nome ou código)
    if (pesquisaDisciplina) {
      const pesquisa = pesquisaDisciplina.toLowerCase()
      if (!d.nome_disciplina.toLowerCase().includes(pesquisa) && 
          !d.codigo_disciplina.toLowerCase().includes(pesquisa)) {
        return false
      }
    }
    
    // Filtrar por departamento
    if (filtroDepartamento && d.id_departamento !== filtroDepartamento) {
      return false
    }
    
    return true
  })

  async function salvarCursoCompleto() {
    if (!cursoSelecionado) return

    try {
      // 1. Atualizar dados do curso (nome, duração, departamento)
      const resCurso = await fetch(`/api/admin/cursos/${cursoSelecionado.id_curso}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          nome_curso: editFormData.nome_curso,
          duracao_anos: editFormData.duracao_anos,
          turnos: editFormData.turnos.join(","),
          id_departamento: editFormData.id_departamento
        })
      })

      if (!resCurso.ok) {
        const err = await resCurso.json()
        alert(err.error || 'Erro ao atualizar curso')
        return
      }

      // 2. Salvar preços para cada ano que tem valores
      for (const [ano, precos] of Object.entries(precosCurso)) {
        if (precos.valor_propina || precos.valor_multa) {
          await fetch(`/api/admin/config/precos-curso/${cursoSelecionado.id_curso}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ano_curricular: parseInt(ano),
              valor_propina: parseFloat(precos.valor_propina || "0"),
              valor_multa: parseFloat(precos.valor_multa || "0")
            })
          })
        }
      }

      alert('Curso atualizado com sucesso!')
      setShowEditModal(false)
      fetchAllData()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar alterações')
    }
  }

  // Função para salvar apenas preços (mantida para compatibilidade)
  async function salvarPreco(ano: number) {
    if (!cursoSelecionado) return

    try {
      const res = await fetch(`/api/admin/config/precos-curso/${cursoSelecionado.id_curso}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ano_curricular: ano,
          valor_propina: parseFloat(precosCurso[ano]?.valor_propina || "0"),
          valor_multa: parseFloat(precosCurso[ano]?.valor_multa || "0")
        })
      })
      
      if (res.ok) {
        alert('Preço salvo com sucesso!')
        fetchAllData()
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao salvar preço')
      }
    } catch (error) {
      console.error('Erro ao salvar preço:', error)
      alert('Erro ao salvar preço')
    }
  }

  async function removerPreco(ano: number) {
    if (!cursoSelecionado) return

    try {
      await fetch(`/api/admin/config/precos-curso/${cursoSelecionado.id_curso}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ano_curricular: ano })
      })
      
      setPrecosCurso(prev => ({
        ...prev,
        [ano]: { valor_propina: "", valor_multa: "" }
      }))
      
      fetchAllData()
    } catch (error) {
      console.error('Erro ao remover preço:', error)
    }
  }

  return (
    <DashboardLayout
      navItems={adminNavItems}
      title="Gestão de Cursos"
      subtitle="Gerir cursos e configurar cursos do sistema"
    >
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setShowModal(true)}
          style={{
            background: '#e03d3d',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          ➕ Adicionar Novo Curso
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9098b0' }}>
          A carregar cursos...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {cursos.map((curso) => (
            <div key={curso.id_curso} style={{
              background: '#1e2230',
              borderRadius: '12px',
              padding: '20px',
              borderTop: '3px solid #e03d3d'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#e8eaf0', fontSize: '18px' }}>{curso.nome_curso}</h3>
              <div style={{ color: '#9098b0', fontSize: '13px', marginBottom: '16px' }}>
                {curso.departamento.nome_departamento}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#2dd4bf' }}>{curso._count.estudantes}</div>
                  <div style={{ fontSize: '11px', color: '#555e78', textTransform: 'uppercase' }}>Estudantes</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#9b59b6' }}>{curso.duracao_anos}</div>
                  <div style={{ fontSize: '11px', color: '#555e78', textTransform: 'uppercase' }}>Anos</div>
                </div>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {curso.turnos?.split(",").map(t => (
                  <span key={t} style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(45,212,191,0.1)',
                    color: '#2dd4bf',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>{t}</span>
                ))}
              </div>

              <button 
                onClick={() => abrirEditarCurso(curso)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#f0a500',
                  cursor: 'pointer'
                }}>✏️ Editar Curso</button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Adicionar Curso */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: '#1e2230',
            borderRadius: '16px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: '#e8eaf0' }}>Adicionar Novo Curso</h3>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Nome do Curso</label>
                <input
                  type="text"
                  value={formData.nome_curso}
                  onChange={(e) => setFormData({...formData, nome_curso: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#13161e',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Departamento</label>
                <select
                  value={formData.id_departamento}
                  onChange={(e) => setFormData({...formData, id_departamento: Number(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#13161e',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                >
                  {departamentos.map(dep => (
                    <option key={dep.id_departamento} value={dep.id_departamento}>{dep.nome_departamento}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Duração (Anos)</label>
                <select
                  value={formData.duracao_anos}
                  onChange={(e) => setFormData({...formData, duracao_anos: Number(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#13161e',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                >
                  {[3,4,5].map(ano => (
                    <option key={ano} value={ano}>{ano} Anos</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#9098b0', fontSize: '13px' }}>Turnos</label>
                <ToggleTurno turnos={formData.turnos} onChange={(t) => setFormData({...formData, turnos: t})} />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '12px 20px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#9098b0',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 20px',
                    background: '#e03d3d',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Criar Curso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Curso Completo */}
      {showEditModal && cursoSelecionado && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          zIndex: 1000,
          overflowY: 'auto',
          padding: '30px 0'
        }} onClick={() => setShowEditModal(false)}>
          <div style={{
            background: '#1e2230',
            borderRadius: '16px',
            padding: '24px',
            width: '750px',
            maxWidth: '95%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: '#e8eaf0' }}>Editar Curso: {cursoSelecionado.nome_curso}</h3>

            {/* Dados Básicos */}
            <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ color: '#e8eaf0', marginBottom: '15px' }}>📋 Dados Básicos</h4>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '12px' }}>Nome do Curso</label>
                  <input
                    type="text"
                    value={editFormData.nome_curso}
                    onChange={(e) => setEditFormData({...editFormData, nome_curso: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#0a0c12',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '6px',
                      color: 'white'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '12px' }}>Duração</label>
                  <select
                    value={editFormData.duracao_anos}
                    onChange={(e) => setEditFormData({...editFormData, duracao_anos: Number(e.target.value)})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#0a0c12',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '6px',
                      color: 'white'
                    }}
                  >
                    {[3,4,5].map(ano => (
                      <option key={ano} value={ano}>{ano} Anos</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '12px' }}>Departamento</label>
                  <select
                    value={editFormData.id_departamento}
                    onChange={(e) => setEditFormData({...editFormData, id_departamento: Number(e.target.value)})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#0a0c12',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '6px',
                      color: 'white'
                    }}
                  >
                    {departamentos.map(dep => (
                      <option key={dep.id_departamento} value={dep.id_departamento}>{dep.nome_departamento}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#9098b0', fontSize: '12px' }}>Turnos</label>
                <ToggleTurno turnos={editFormData.turnos} onChange={(t) => setEditFormData({...editFormData, turnos: t})} />
              </div>
            </div>

            {/* Tabs por Ano */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
              {Array.from({ length: editFormData.duracao_anos }, (_, i) => i + 1).map(ano => (
                <button
                  key={ano}
                  onClick={() => setTabActiva(ano)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    background: tabActiva === ano ? '#e03d3d' : '#13161e',
                    color: 'white',
                    fontWeight: tabActiva === ano ? '600' : '400'
                  }}
                >
                  {ano}º Ano
                </button>
              ))}
            </div>

            {/* Conteudo do Ano Selecionado */}
            <div style={{ background: '#13161e', padding: '18px', borderRadius: '10px', marginBottom: '20px' }}>
              <div style={{ fontWeight: '600', color: '#e8eaf0', marginBottom: '15px', fontSize: '16px' }}>
                Configuração do {tabActiva}º Ano
              </div>

              {/* Preços */}
              <h5 style={{ color: '#2dd4bf', marginBottom: '12px', marginTop: '0' }}>💵 Valores</h5>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#9098b0', fontSize: '12px' }}>Propina (Kz)</label>
                  <input
                    type="number"
                    value={precosCurso[tabActiva]?.valor_propina || ""}
                    onChange={(e) => setPrecosCurso(prev => ({
                      ...prev,
                      [tabActiva]: { ...prev[tabActiva], valor_propina: e.target.value }
                    }))}
                    placeholder="Valor padrão"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#0a0c12',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '6px',
                      color: 'white'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#9098b0', fontSize: '12px' }}>Multa (Kz)</label>
                  <input
                    type="number"
                    value={precosCurso[tabActiva]?.valor_multa || ""}
                    onChange={(e) => setPrecosCurso(prev => ({
                      ...prev,
                      [tabActiva]: { ...prev[tabActiva], valor_multa: e.target.value }
                    }))}
                    placeholder="Valor padrão"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#0a0c12',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '6px',
                      color: 'white'
                    }}
                  />
                </div>
              </div>

              {/* Disciplinas - info para o admin */}
              <h5 style={{ color: '#9b59b6', marginBottom: '12px', marginTop: '0' }}>📚 Disciplinas</h5>
              
              <div style={{ 
                background: '#0d1117', 
                padding: '20px', 
                borderRadius: '8px', 
                textAlign: 'center',
                color: '#9098b0',
                border: '1px solid rgba(155, 89, 182, 0.3)'
              }}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                  🎓 As disciplinas são geridas pelo Gestor do Departamento
                </div>
                <div style={{ fontSize: '12px', color: '#555e78' }}>
                  O gestor de cada departamento é responsável por atribuir as disciplinas aos cursos definindo o ano e semestre.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={salvarCursoCompleto}
                style={{
                  padding: '12px 24px',
                  background: '#22c55e',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >💾 Salvar Alterações</button>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  padding: '12px 24px',
                  background: '#555e78',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >Fechar</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}