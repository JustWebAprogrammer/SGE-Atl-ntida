"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/app/components/DashboardLayout"
import { adminNavItems } from "@/app/admin/adminNav"
import { cleanPhoneForInput, formatPhone, validatePhone } from "@/lib/phone"

interface Departamento {
  id_departamento: number
  nome_departamento: string
}

interface Curso {
  id_curso: number
  nome_curso: string
}

interface Orientador {
  id_orientador: number
  nome_completo: string
  especialidade: string
  numero_telemovel: string | null
  e_gestor: boolean
  id_departamento: number | null
  departamento: Departamento | null
  usuario: {
    email: string
    nome_usuario: string
  }
}

export default function OrientadoresAdminDashboard() {
  const [orientadores, setOrientadores] = useState<Orientador[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editOrientador, setEditOrientador] = useState<Orientador | null>(null)
  const [showReplaceGestorModal, setShowReplaceGestorModal] = useState(false)
  const [gestorExistente, setGestorExistente] = useState<string>("")

  // Filtros
  const [search, setSearch] = useState("")
  const [filtroDepartamento, setFiltroDepartamento] = useState("")
  const [filtroCurso, setFiltroCurso] = useState("")

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    especialidade: "",
    numero_telemovel: "",
    id_departamento: ""
  })

  const [editFormData, setEditFormData] = useState({
    nome_completo: "",
    especialidade: "",
    numero_telemovel: "",
    id_departamento: "",
    e_gestor: false
  })

  useEffect(() => {
    fetchOrientadores()
    fetchDepartamentos()
    fetchCursos()
  }, [])

  useEffect(() => {
    // Debounce para pesquisa
    const timer = setTimeout(() => {
      fetchOrientadores()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, filtroDepartamento, filtroCurso])

  async function fetchCursos() {
    try {
      const res = await fetch('/api/admin/cursos')
      const data = await res.json()
      setCursos(data)
    } catch (error) {
      console.error('Erro ao carregar cursos:', error)
    }
  }

  async function fetchOrientadores() {
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (filtroDepartamento) params.append('id_departamento', filtroDepartamento)
      if (filtroCurso) params.append('id_curso', filtroCurso)
      
      const res = await fetch(`/api/admin/orientadores?${params.toString()}`)
      const data = await res.json()
      setOrientadores(data)
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchDepartamentos() {
    try {
      const res = await fetch('/api/admin/departamentos')
      const data = await res.json()
      setDepartamentos(data)
    } catch (error) {
      console.error('Erro ao carregar departamentos:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (formData.numero_telemovel && !validatePhone(formData.numero_telemovel)) {
      alert('O número de telefone deve ter 8 dígitos')
      return
    }
    
    try {
      const res = await fetch('/api/admin/orientadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          numero_telemovel: formData.numero_telemovel ? formatPhone(formData.numero_telemovel) : "",
        })
      })

      if (res.ok) {
        setShowModal(false)
        setFormData({ nome: "", email: "", especialidade: "", numero_telemovel: "", id_departamento: "" })
        fetchOrientadores()
      }
    } catch (error) {
      console.error('Erro ao criar orientador:', error)
    }
  }

  function openEditModal(orientador: Orientador) {
    setEditOrientador(orientador)
    setEditFormData({
      nome_completo: orientador.nome_completo,
      especialidade: orientador.especialidade,
      numero_telemovel: cleanPhoneForInput(orientador.numero_telemovel ?? null),
      id_departamento: orientador.id_departamento?.toString() || "",
      e_gestor: orientador.e_gestor
    })
    setShowEditModal(true)
  }

  async function handleResetPassword() {
    if (!editOrientador) return

    if (!confirm(`Tens a certeza que queres redefinir a password do orientador ${editOrientador.nome_completo} para "orientador123"?`)) {
      return
    }

    try {
      const res = await fetch('/api/admin/orientadores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_orientador: editOrientador.id_orientador,
          tipo: 'reset_password'
        })
      })

      if (res.ok) {
        const data = await res.json()
        alert(data.message || 'Password redefinida com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao redefinir password:', error)
      alert('Erro ao redefinir password')
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!editOrientador) return
    if (editFormData.numero_telemovel && !validatePhone(editFormData.numero_telemovel)) {
      alert('O número de telefone deve ter 8 dígitos')
      return
    }

    try {
      const res = await fetch('/api/admin/orientadores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_orientador: editOrientador.id_orientador,
          ...editFormData,
          numero_telemovel: editFormData.numero_telemovel ? formatPhone(editFormData.numero_telemovel) : "",
        })
      })

      if (res.ok) {
        setShowEditModal(false)
        setEditOrientador(null)
        fetchOrientadores()
      } else if (res.status === 409) {
        // Já existe gestor, perguntar se deseja substituir
        const data = await res.json()
        setGestorExistente(data.gestor_existente)
        setShowReplaceGestorModal(true)
      }
    } catch (error) {
      console.error('Erro ao editar orientador:', error)
    }
  }

  async function confirmarSubstituirGestor() {
    if (!editOrientador) return

    try {
      const res = await fetch('/api/admin/orientadores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_orientador: editOrientador.id_orientador,
          ...editFormData,
          substituir_gestor: true
        })
      })

      if (res.ok) {
        setShowReplaceGestorModal(false)
        setShowEditModal(false)
        setEditOrientador(null)
        setGestorExistente("")
        fetchOrientadores()
      }
    } catch (error) {
      console.error('Erro ao substituir gestor:', error)
    }
  }

  return (
    <DashboardLayout
      navItems={adminNavItems}
      title="Gestão de Orientadores"
      subtitle="Adicionar, editar e gerir todos os professores orientadores"
    >
      {/* Barra de Pesquisa e Filtros */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* Pesquisa por nome */}
        <div style={{ flex: '1', minWidth: '200px' }}>
          <input
            type="text"
            placeholder="🔍 Pesquisar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Filtro Departamento */}
        <select
          value={filtroDepartamento}
          onChange={(e) => setFiltroDepartamento(e.target.value)}
          style={{
            padding: '10px 14px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            minWidth: '180px'
          }}
        >
          <option value="">Todos os Departamentos</option>
          {departamentos.map((dept) => (
            <option key={dept.id_departamento} value={dept.id_departamento}>
              {dept.nome_departamento}
            </option>
          ))}
        </select>

        {/* Filtro Curso */}
        <select
          value={filtroCurso}
          onChange={(e) => setFiltroCurso(e.target.value)}
          style={{
            padding: '10px 14px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            minWidth: '180px'
          }}
        >
          <option value="">Todos os Cursos</option>
          {cursos.map((curso) => (
            <option key={curso.id_curso} value={curso.id_curso}>
              {curso.nome_curso}
            </option>
          ))}
        </select>

        {/* Botão adicionar */}
        <button 
          onClick={() => setShowModal(true)}
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          ➕ Adicionar Novo Orientador
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          A carregar orientadores...
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ textAlign: 'left', padding: '14px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Nome</th>
                <th style={{ textAlign: 'left', padding: '14px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '14px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Departamento</th>
                <th style={{ textAlign: 'left', padding: '14px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Especialidade</th>
                <th style={{ textAlign: 'left', padding: '14px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Função</th>
                <th style={{ textAlign: 'left', padding: '14px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {orientadores.map((orientador) => (
                <tr key={orientador.id_orientador} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '14px', color: 'var(--text-primary)' }}>{orientador.nome_completo}</td>
                  <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>{orientador.usuario.email}</td>
                  <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>{orientador.departamento?.nome_departamento || '—'}</td>
                  <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>{orientador.especialidade}</td>
                  <td style={{ padding: '14px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: orientador.e_gestor ? '#9b59b620' : 'var(--text-muted)20',
                      color: orientador.e_gestor ? '#9b59b6' : 'var(--text-muted)'
                    }}>
                      {orientador.e_gestor ? '✅ Gestor' : 'Professor'}
                    </span>
                  </td>
                  <td style={{ padding: '14px' }}>
                    <button 
                      onClick={() => openEditModal(orientador)}
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

      {/* Modal Adicionar Orientador */}
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
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
            width: '500px',
            maxWidth: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Adicionar Novo Orientador</h3>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Nome Completo</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Departamento</label>
                <select
                  value={formData.id_departamento}
                  onChange={(e) => setFormData({...formData, id_departamento: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                >
                  <option value="">Selecione um departamento</option>
                  {departamentos.map((dept) => (
                    <option key={dept.id_departamento} value={dept.id_departamento}>
                      {dept.nome_departamento}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Especialidade</label>
                <input
                  type="text"
                  value={formData.especialidade}
                  onChange={(e) => setFormData({...formData, especialidade: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Telemóvel (+244 9)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px', whiteSpace: 'nowrap' }}>+244 9</span>
                  <input
                    type="text"
                    value={formData.numero_telemovel}
                    onChange={(e) => {
                      const apenasNumeros = e.target.value.replace(/\D/g, '')
                      setFormData({...formData, numero_telemovel: apenasNumeros})
                    }}
                    placeholder="XXXXXXXX"
                    maxLength={8}
                    style={{ flex: 1, width: 'auto', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px', padding: '12px', background: '#f0a50020', borderRadius: '8px' }}>
                <span style={{ color: '#f0a500', fontSize: '13px' }}>🔑 Senha padrão: <strong>orientador123</strong></span>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '12px 20px',
                    background: 'transparent',
                    border: '1px solid var(--border-color-strong)',
                    borderRadius: '8px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 20px',
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Criar Orientador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Substituir Gestor */}
      {showReplaceGestorModal && (
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
          zIndex: 1100
        }} onClick={() => setShowReplaceGestorModal(false)}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>⚠️ Substituir Gestor</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
              Já existe um gestor neste departamento (<strong>{gestorExistente}</strong>). 
              Deseja remover o gestor atual e tornar este orientador no novo gestor?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowReplaceGestorModal(false)
                  setGestorExistente("")
                }}
                style={{
                  padding: '12px 20px',
                  background: 'transparent',
                  border: '1px solid var(--border-color-strong)',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarSubstituirGestor}
                style={{
                  padding: '12px 20px',
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ✅ Sim, Substituir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Orientador */}
      {showEditModal && editOrientador && (
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
        }} onClick={() => setShowEditModal(false)}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
            width: '500px',
            maxWidth: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Editar Orientador</h3>
            
            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Nome Completo</label>
                <input
                  type="text"
                  value={editFormData.nome_completo}
                  onChange={(e) => setEditFormData({...editFormData, nome_completo: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Departamento</label>
                <select
                  value={editFormData.id_departamento}
                  onChange={(e) => setEditFormData({...editFormData, id_departamento: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                >
                  <option value="">Selecione um departamento</option>
                  {departamentos.map((dept) => (
                    <option key={dept.id_departamento} value={dept.id_departamento}>
                      {dept.nome_departamento}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Especialidade</label>
                <input
                  type="text"
                  value={editFormData.especialidade}
                  onChange={(e) => setEditFormData({...editFormData, especialidade: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Telemóvel (+244 9)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px', whiteSpace: 'nowrap' }}>+244 9</span>
                  <input
                    type="text"
                    value={editFormData.numero_telemovel}
                    onChange={(e) => {
                      const apenasNumeros = e.target.value.replace(/\D/g, '')
                      setEditFormData({...editFormData, numero_telemovel: apenasNumeros})
                    }}
                    placeholder="XXXXXXXX"
                    maxLength={8}
                    style={{ flex: 1, width: 'auto', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editFormData.e_gestor}
                    onChange={(e) => setEditFormData({...editFormData, e_gestor: e.target.checked})}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>Este orientador é Gestor de Departamento</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  style={{
                    padding: '12px 20px',
                    background: 'transparent',
                    border: '1px solid #f0a500',
                    borderRadius: '8px',
                    color: '#f0a500',
                    cursor: 'pointer'
                  }}
                >
                  🔑 Reset Password
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: '12px 20px',
                    background: 'transparent',
                    border: '1px solid var(--border-color-strong)',
                    borderRadius: '8px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 20px',
                    background: 'var(--accent)',
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