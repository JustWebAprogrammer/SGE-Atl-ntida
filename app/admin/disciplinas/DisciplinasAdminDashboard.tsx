"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/app/components/DashboardLayout"
import { adminNavItems } from "@/app/admin/adminNav"

interface Disciplina {
  id_disciplina: number
  nome_disciplina: string
  codigo_disciplina: string
  creditos: number
  tem_dispensa: boolean
  nota_dispensa: number
  ano_curricular: number
  semestre: string
  departamento: {
    id_departamento: number
    nome_departamento: string
  }
}

interface Departamento {
  id_departamento: number
  nome_departamento: string
}

export default function DisciplinasAdminDashboard() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Estado para edição
  const [editModal, setEditModal] = useState(false)
  const [disciplinaEditando, setDisciplinaEditando] = useState<Disciplina | null>(null)

  const emptyForm = {
    nome_disciplina: "",
    codigo_disciplina: "",
    creditos: 6,
    id_departamento: 1,
    tem_dispensa: true,
    nota_dispensa: 14,
    ano_curricular: 1,
    semestre: "S1",
  }

  const [formData, setFormData] = useState({ ...emptyForm })

  const [editFormData, setEditFormData] = useState({ ...emptyForm })

  useEffect(() => {
    fetchDisciplinas()
  }, [])

  async function fetchDisciplinas() {
    try {
      const [resDisciplinas, resDepartamentos] = await Promise.all([
        fetch('/api/admin/disciplinas'),
        fetch('/api/admin/departamentos')
      ])
      const dataDisciplinas = await resDisciplinas.json()
      const dataDepartamentos = await resDepartamentos.json()
      setDisciplinas(Array.isArray(dataDisciplinas) ? dataDisciplinas : [])
      setDepartamentos(Array.isArray(dataDepartamentos) ? dataDepartamentos : [])
    } catch (error) {
      console.error('Erro:', error)
      setDisciplinas([])
      setDepartamentos([])
    } finally {
      setLoading(false)
    }
  }

  function abrirEditar(disciplina: Disciplina) {
    setDisciplinaEditando(disciplina)
    setEditFormData({
      nome_disciplina: disciplina.nome_disciplina,
      codigo_disciplina: disciplina.codigo_disciplina,
      creditos: disciplina.creditos,
      id_departamento: disciplina.departamento?.id_departamento || 1,
      tem_dispensa: disciplina.tem_dispensa,
      nota_dispensa: disciplina.nota_dispensa,
      ano_curricular: disciplina.ano_curricular || 1,
      semestre: disciplina.semestre || "S1",
    })
    setEditModal(true)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!disciplinaEditando) return

    try {
      const res = await fetch('/api/admin/disciplinas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_disciplina: disciplinaEditando.id_disciplina,
          ...editFormData
        })
      })

      if (res.ok) {
        setEditModal(false)
        setDisciplinaEditando(null)
        fetchDisciplinas()
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao editar')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao editar')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      const res = await fetch('/api/admin/disciplinas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowModal(false)
        setFormData({ ...emptyForm })
        fetchDisciplinas()
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao criar disciplina')
      }
    } catch (error) {
      console.error('Erro ao criar disciplina:', error)
    }
  }

  return (
    <DashboardLayout
      navItems={adminNavItems}
      title="Gestão de Disciplinas"
      subtitle="Gerir todas as disciplinas, configurar dispensa e nota mínima"
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
          ➕ Adicionar Nova Disciplina
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9098b0' }}>
          A carregar disciplinas...
        </div>
      ) : (
        <div style={{ background: '#1e2230', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th style={{ textAlign: 'left', padding: '14px', color: '#9098b0', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Código</th>
                <th style={{ textAlign: 'left', padding: '14px', color: '#9098b0', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Nome</th>
                <th style={{ textAlign: 'left', padding: '14px', color: '#9098b0', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Ano</th>
                <th style={{ textAlign: 'left', padding: '14px', color: '#9098b0', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Semestre</th>
                <th style={{ textAlign: 'left', padding: '14px', color: '#9098b0', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Departamento</th>
                <th style={{ textAlign: 'left', padding: '14px', color: '#9098b0', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Créditos</th>
                <th style={{ textAlign: 'left', padding: '14px', color: '#9098b0', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Dispensa</th>
                <th style={{ textAlign: 'left', padding: '14px', color: '#9098b0', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {disciplinas.map((disciplina) => (
                <tr key={disciplina.id_disciplina} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '14px', color: '#9098b0', fontFamily: 'monospace' }}>{disciplina.codigo_disciplina}</td>
                  <td style={{ padding: '14px', color: '#e8eaf0' }}>{disciplina.nome_disciplina}</td>
                  <td style={{ padding: '14px', color: '#e8eaf0' }}>{disciplina.ano_curricular}º</td>
                  <td style={{ padding: '14px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: disciplina.semestre === 'S1' ? 'rgba(79,195,247,0.15)' : 'rgba(255,167,38,0.15)',
                      color: disciplina.semestre === 'S1' ? '#4fc3f7' : '#ffa726'
                    }}>
                      {disciplina.semestre === 'S1' ? 'S1' : 'S2'}
                    </span>
                  </td>
                  <td style={{ padding: '14px', color: '#9098b0' }}>{disciplina.departamento?.nome_departamento || '-'}</td>
                  <td style={{ padding: '14px', color: '#9098b0' }}>{disciplina.creditos} ECTS</td>
                  <td style={{ padding: '14px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: disciplina.tem_dispensa ? '#2dd4bf20' : '#e03d3d20',
                      color: disciplina.tem_dispensa ? '#2dd4bf' : '#e03d3d'
                    }}>
                      {disciplina.tem_dispensa ? `✅ ${disciplina.nota_dispensa} valores` : '❌ Sem dispensa'}
                    </span>
                  </td>
                  <td style={{ padding: '14px' }}>
                    <button 
                      onClick={() => abrirEditar(disciplina)}
                      style={{ background: 'transparent', border: 'none', color: '#f0a500', cursor: 'pointer' }}
                    >
                      ✏️ Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Adicionar Disciplina */}
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
            width: '500px',
            maxWidth: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: '#e8eaf0' }}>Adicionar Nova Disciplina</h3>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Nome da Disciplina</label>
                  <input
                    type="text"
                    value={formData.nome_disciplina}
                    onChange={(e) => setFormData({...formData, nome_disciplina: e.target.value})}
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
                  <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Código</label>
                  <input
                    type="text"
                    value={formData.codigo_disciplina}
                    onChange={(e) => setFormData({...formData, codigo_disciplina: e.target.value})}
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Ano Curricular</label>
                  <select
                    value={formData.ano_curricular}
                    onChange={(e) => setFormData({...formData, ano_curricular: Number(e.target.value)})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#13161e',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  >
                    {[1,2,3,4,5,6].map(a => (
                      <option key={a} value={a}>{a}º Ano</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Semestre</label>
                  <select
                    value={formData.semestre}
                    onChange={(e) => setFormData({...formData, semestre: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#13161e',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  >
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Créditos</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={formData.creditos}
                    onChange={(e) => setFormData({...formData, creditos: Number(e.target.value)})}
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
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
                    required
                  >
                    {departamentos.map(dep => (
                      <option key={dep.id_departamento} value={dep.id_departamento}>{dep.nome_departamento}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>&nbsp;</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingTop: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.tem_dispensa}
                        onChange={(e) => setFormData({...formData, tem_dispensa: e.target.checked})}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ color: '#e8eaf0' }}>Permite dispensa</span>
                    </label>

                    {formData.tem_dispensa && (
                      <div>
                        <input
                          type="number"
                          min="10"
                          max="20"
                          value={formData.nota_dispensa}
                          onChange={(e) => setFormData({...formData, nota_dispensa: Number(e.target.value)})}
                          style={{
                            width: '70px',
                            padding: '8px',
                            background: '#13161e',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '8px',
                            color: 'white'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
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
                  Criar Disciplina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Disciplina */}
      {editModal && (
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
        }} onClick={() => setEditModal(false)}>
          <div style={{
            background: '#1e2230',
            borderRadius: '16px',
            padding: '24px',
            width: '500px',
            maxWidth: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: '#e8eaf0' }}>Editar Disciplina</h3>
            
            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Nome da Disciplina</label>
                  <input
                    type="text"
                    value={editFormData.nome_disciplina}
                    onChange={(e) => setEditFormData({...editFormData, nome_disciplina: e.target.value})}
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
                  <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Código</label>
                  <input
                    type="text"
                    value={editFormData.codigo_disciplina}
                    onChange={(e) => setEditFormData({...editFormData, codigo_disciplina: e.target.value})}
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Ano Curricular</label>
                  <select
                    value={editFormData.ano_curricular}
                    onChange={(e) => setEditFormData({...editFormData, ano_curricular: Number(e.target.value)})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#13161e',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  >
                    {[1,2,3,4,5,6].map(a => (
                      <option key={a} value={a}>{a}º Ano</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Semestre</label>
                  <select
                    value={editFormData.semestre}
                    onChange={(e) => setEditFormData({...editFormData, semestre: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#13161e',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  >
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Créditos</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={editFormData.creditos}
                    onChange={(e) => setEditFormData({...editFormData, creditos: Number(e.target.value)})}
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Departamento</label>
                  <select
                    value={editFormData.id_departamento}
                    onChange={(e) => setEditFormData({...editFormData, id_departamento: Number(e.target.value)})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#13161e',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                    required
                  >
                    {departamentos.map(dep => (
                      <option key={dep.id_departamento} value={dep.id_departamento}>{dep.nome_departamento}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>&nbsp;</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingTop: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editFormData.tem_dispensa}
                        onChange={(e) => setEditFormData({...editFormData, tem_dispensa: e.target.checked})}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ color: '#e8eaf0' }}>Permite dispensa</span>
                    </label>

                    {editFormData.tem_dispensa && (
                      <div>
                        <input
                          type="number"
                          min="10"
                          max="20"
                          value={editFormData.nota_dispensa}
                          onChange={(e) => setEditFormData({...editFormData, nota_dispensa: Number(e.target.value)})}
                          style={{
                            width: '70px',
                            padding: '8px',
                            background: '#13161e',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '8px',
                            color: 'white'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditModal(false)}
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
    </DashboardLayout>
  )
}