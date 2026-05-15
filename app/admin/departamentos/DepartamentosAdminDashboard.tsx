"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/app/components/DashboardLayout"
import { adminNavItems } from "@/app/admin/adminNav"

interface Departamento {
  id_departamento: number
  nome_departamento: string
  descricao: string | null
  _count: {
    cursos: number
    estudantes: number
  }
}

interface Orientador {
  id_orientador: number
  nome: string
  email: string
  especialidade: string
  e_gestor: boolean
}

interface DetalhesDepartamento {
  id_departamento: number
  nome_departamento: string
  descricao: string | null
  cursos: {
    id_curso: number
    nome_curso: string
    _count: {
      estudantes: number
      disciplinas: number
    }
  }[]
  orientadores: {
    id_orientador: number
    nome: string
    email: string
    especialidade: string
    e_gestor: boolean
  }[]
  estatisticas: {
    monografias: Record<string, number>
    totalMonografias: number
    premonografias: Record<string, number>
  }
}

export default function DepartamentosAdminDashboard() {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Estado para edição
  const [editingDept, setEditingDept] = useState<Departamento | null>(null)
  const [editFormData, setEditFormData] = useState({ nome_departamento: "", descricao: "", id_gestor: "" as string | number })
  const [orientadoresDept, setOrientadoresDept] = useState<Orientador[]>([])
  const [loadingOrientadores, setLoadingOrientadores] = useState(false)

  // Estado para detalhes expandidos (permitir múltiplos)
  const [expandedIds, setExpandedIds] = useState<number[]>([])
  const [detalhesMap, setDetalhesMap] = useState<Record<number, DetalhesDepartamento>>({})
  const [loadingDetalhesIds, setLoadingDetalhesIds] = useState<number[]>([])

  // Estado para delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    nome_departamento: "",
    descricao: ""
  })

  useEffect(() => {
    fetchDepartamentos()
  }, [])

  async function fetchDepartamentos() {
    try {
      const res = await fetch('/api/admin/departamentos')
      const data = await res.json()
      setDepartamentos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro:', error)
      setDepartamentos([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      const res = await fetch('/api/admin/departamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowModal(false)
        setFormData({ nome_departamento: "", descricao: "" })
        fetchDepartamentos()
      }
    } catch (error) {
      console.error('Erro ao criar departamento:', error)
    }
  }

  // Função para buscar detalhes do departamento
  async function fetchDetalhes(id: number) {
    try {
      setLoadingDetalhesIds(prev => [...prev, id])
      const res = await fetch(`/api/admin/departamentos/${id}`)
      if (res.ok) {
        const data = await res.json()
        setDetalhesMap(prev => ({ ...prev, [id]: data }))
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error)
    } finally {
      setLoadingDetalhesIds(prev => prev.filter(pid => pid !== id))
    }
  }

  // Toggle expandir card (múltiplos)
  function toggleExpand(id: number) {
    if (expandedIds.includes(id)) {
      setExpandedIds(prev => prev.filter(pid => pid !== id))
      // Optionally remove from map too to save memory:
      setDetalhesMap(prev => {
        const newMap = { ...prev }
        delete newMap[id]
        return newMap
      })
    } else {
      setExpandedIds(prev => [...prev, id])
      fetchDetalhes(id)
    }
  }

  // Editar departamento
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingDept) return

    try {
      const res = await fetch('/api/admin/departamentos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_departamento: editingDept.id_departamento,
          nome_departamento: editFormData.nome_departamento,
          descricao: editFormData.descricao,
          id_gestor: editFormData.id_gestor || null
        })
      })

      if (res.ok) {
        setEditingDept(null)
        fetchDepartamentos()
        if (expandedIds.includes(editingDept.id_departamento)) {
          fetchDetalhes(editingDept.id_departamento)
        }
      }
    } catch (error) {
      console.error('Erro ao editar departamento:', error)
    }
  }

  // Eliminar departamento
  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/admin/departamentos?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setDeletingId(null)
        fetchDepartamentos()
        setExpandedIds(prev => prev.filter(pid => pid !== id))
        setDetalhesMap(prev => {
          const newMap = { ...prev }
          delete newMap[id]
          return newMap
        })
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao eliminar departamento')
      }
    } catch (error) {
      console.error('Erro ao eliminar departamento:', error)
    }
  }

  return (
    <DashboardLayout
      navItems={adminNavItems}
      title="Gestão de Departamentos"
      subtitle="Gerir departamentos da instituição"
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
          ➕ Adicionar Novo Departamento
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#d0d7e8' }}>
          A carregar departamentos...
        </div>
      ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px', alignItems: 'start' }}>
          {departamentos.map((departamento) => (
            <div key={departamento.id_departamento} style={{
              background: '#1e2230',
              borderRadius: '12px',
              padding: '20px',
              borderTop: '3px solid #9b59b6'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#e8eaf0', fontSize: '18px' }}>{departamento.nome_departamento}</h3>
              <div style={{ color: '#d0d7e8', fontSize: '13px', marginBottom: '16px', minHeight: '38px' }}>
                {departamento.descricao || "Sem descrição"}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#2dd4bf' }}>{departamento._count.cursos}</div>
                  <div style={{ fontSize: '11px', color: '#b0b8cf', textTransform: 'uppercase' }}>Cursos</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#f0a500' }}>{departamento._count.estudantes}</div>
                  <div style={{ fontSize: '11px', color: '#b0b8cf', textTransform: 'uppercase' }}>Estudantes</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={async () => {
                    setEditingDept(departamento)
                    setEditFormData({ nome_departamento: departamento.nome_departamento, descricao: departamento.descricao || "", id_gestor: "" })
                    
                    // Fetch orientadores do departamento
                    try {
                      setLoadingOrientadores(true)
                      const res = await fetch(`/api/admin/departamentos/${departamento.id_departamento}`)
                      if (res.ok) {
                        const data = await res.json()
                        setOrientadoresDept(data.orientadores || [])
                        // Find current gestor
                        const gestor = data.orientadores?.find((o: Orientador) => o.e_gestor)
                        if (gestor) {
                          setEditFormData(prev => ({ ...prev, id_gestor: gestor.id_orientador }))
                        }
                      }
                    } catch (error) {
                      console.error('Erro ao buscar orientadores:', error)
                    } finally {
                      setLoadingOrientadores(false)
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#f0a500',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}>
                  ✏️ Editar
                </button>
                <button 
                  onClick={() => setDeletingId(departamento.id_departamento)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}>
                  🗑️ Eliminar
                </button>
              </div>

              <button 
                onClick={() => toggleExpand(departamento.id_departamento)}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '10px',
                  background: expandedIds.includes(departamento.id_departamento) ? 'rgba(155, 89, 182, 0.2)' : 'transparent',
                  border: '1px solid rgba(155, 89, 182, 0.3)',
                  borderRadius: '8px',
                  color: '#9b59b6',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}>
                {expandedIds.includes(departamento.id_departamento) ? '🔼 Ocultar Detalhes' : '🔽 Ver Detalhes'}
              </button>

              {/* Expandido - detalhes do departamento */}
              {expandedIds.includes(departamento.id_departamento) && (
                <div style={{ marginTop: '16px', padding: '16px', background: '#13161e', borderRadius: '8px' }}>
                  {loadingDetalhesIds.includes(departamento.id_departamento) ? (
                    <div style={{ color: '#d0d7e8', textAlign: 'center' }}>A carregar...</div>
                  ) : detalhesMap[departamento.id_departamento] ? (
                    <>
                      {/* Cursos */}
                      <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ color: '#e8eaf0', margin: '0 0 10px 0', fontSize: '14px' }}>Cursos ({detalhesMap[departamento.id_departamento].cursos.length})</h4>
                        {detalhesMap[departamento.id_departamento].cursos.length === 0 ? (
                          <div style={{ color: '#d0d7e8', fontSize: '13px' }}>Sem cursos</div>
                        ) : (
                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#d0d7e8', fontSize: '13px' }}>
                            {detalhesMap[departamento.id_departamento].cursos.map((c: { id_curso: number; nome_curso: string; _count: { estudantes: number } }) => (
                              <li key={c.id_curso} style={{ marginBottom: '4px' }}>
                                {c.nome_curso} ({c._count.estudantes} estudantes)
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Orientadores */}
                      <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ color: '#e8eaf0', margin: '0 0 10px 0', fontSize: '14px' }}>Orientadores ({detalhesMap[departamento.id_departamento].orientadores.length})</h4>
                        {detalhesMap[departamento.id_departamento].orientadores.length === 0 ? (
                          <div style={{ color: '#d0d7e8', fontSize: '13px' }}>Sem orientadores</div>
                        ) : (
                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#d0d7e8', fontSize: '13px' }}>
                            {detalhesMap[departamento.id_departamento].orientadores.map((o: { id_orientador: number; nome: string; especialidade: string; e_gestor: boolean }) => (
                              <li key={o.id_orientador} style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{o.nome} - {o.especialidade}</span>
                                {o.e_gestor && (
                                  <span style={{ background: '#2dd4bf', color: '#13161e', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>GESTOR</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Estatísticas Monografias */}
                      <div>
                        <h4 style={{ color: '#e8eaf0', margin: '0 0 10px 0', fontSize: '14px' }}>Monografias</h4>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ background: '#1e2230', padding: '8px 12px', borderRadius: '6px' }}>
                            <div style={{ fontSize: '16px', color: '#2dd4bf' }}>{detalhesMap[departamento.id_departamento].estatisticas.totalMonografias}</div>
                            <div style={{ fontSize: '10px', color: '#b0b8cf' }}>Total</div>
                          </div>
                          {Object.entries(detalhesMap[departamento.id_departamento].estatisticas.monografias).map(([estado, qtd]: [string, number]) => (
                            <div key={estado} style={{ background: '#1e2230', padding: '8px 12px', borderRadius: '6px' }}>
                              <div style={{ fontSize: '16px', color: '#f0a500' }}>{qtd}</div>
                              <div style={{ fontSize: '10px', color: '#b0b8cf' }}>{estado}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#d0d7e8' }}>Erro ao carregar detalhes</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Adicionar Departamento */}
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
            <h3 style={{ margin: '0 0 20px 0', color: '#e8eaf0' }}>Adicionar Novo Departamento</h3>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Nome do Departamento</label>
                <input
                  type="text"
                  value={formData.nome_departamento}
                  onChange={(e) => setFormData({...formData, nome_departamento: e.target.value})}
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

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#13161e',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: 'white',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
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
                    color: '#d0d7e8',
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
                  Criar Departamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Departamento */}
      {editingDept && (
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
        }} onClick={() => setEditingDept(null)}>
          <div style={{
            background: '#1e2230',
            borderRadius: '16px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: '#e8eaf0' }}>Editar Departamento</h3>
            
            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Nome do Departamento</label>
                <input
                  type="text"
                  value={editFormData.nome_departamento}
                  onChange={(e) => setEditFormData({...editFormData, nome_departamento: e.target.value})}
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

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Descrição</label>
                <textarea
                  value={editFormData.descricao}
                  onChange={(e) => setEditFormData({...editFormData, descricao: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#13161e',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: 'white',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Dropdown Gestor */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Gestor do Departamento</label>
                {loadingOrientadores ? (
                  <div style={{ color: '#d0d7e8', fontSize: '13px' }}>A carregar orientadores...</div>
                ) : (
                  <select
                    value={editFormData.id_gestor}
                    onChange={(e) => setEditFormData({...editFormData, id_gestor: e.target.value ? Number(e.target.value) : ""})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#13161e',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  >
                    <option value="">Nenhum (Sem gestor)</option>
                    {orientadoresDept.map((orientador) => (
                      <option key={orientador.id_orientador} value={orientador.id_orientador}>
                        {orientador.nome} - {orientador.especialidade}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  style={{
                    padding: '12px 20px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#d0d7e8',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 20px',
                    background: '#f0a500',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Guardar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Delete Confirmation */}
      {deletingId && (
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
        }} onClick={() => setDeletingId(null)}>
          <div style={{
            background: '#1e2230',
            borderRadius: '16px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', color: '#ef4444', fontSize: '20px' }}>⚠️ Confirmar Eliminação</h3>
            <p style={{ color: '#d0d7e8', marginBottom: '20px', lineHeight: '1.5' }}>
              Tem a certeza que deseja eliminar este departamento? Esta ação não pode ser desfeita.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeletingId(null)}
                style={{
                  padding: '12px 20px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#d0d7e8',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                style={{
                  padding: '12px 20px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
