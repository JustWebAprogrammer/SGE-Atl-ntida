"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/app/components/DashboardLayout"
import { adminNavItems } from "@/app/admin/adminNav"
import { cleanPhoneForInput, formatPhone, validatePhone } from "@/lib/phone"

interface Recepcionista {
  id_recepcionista: number
  nome_completo: string
  numero_telemovel: string | null
  turno: string
  id_usuario: number
  usuario: {
    nome_usuario: string
    email: string
    data_cadastro: string
  }
}

export default function RecepcionistasAdminDashboard() {
  const [recepcionistas, setRecepcionistas] = useState<Recepcionista[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRecepcionista, setEditingRecepcionista] = useState<Recepcionista | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    nome_completo: '',
    telemovel: '',
    turno: 'Manha'
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Password padrão para novos recepcionistas
  const SENHA_PADRAO = 'recepcionista123'

  useEffect(() => {
    fetchRecepcionistas()
  }, [])

  const fetchRecepcionistas = async () => {
    try {
      const res = await fetch('/api/admin/recepcionistas')
      if (res.ok) {
        const data = await res.json()
        setRecepcionistas(data)
      }
    } catch (err) {
      console.error('Erro ao buscar recepcionistas:', err)
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingRecepcionista(null)
    setFormData({
      email: '',
      nome_completo: '',
      telemovel: '',
      turno: 'Manha'
    })
    setError('')
    setShowModal(true)
  }

  // Função para redefinir password
  const handleResetPassword = async () => {
    if (!editingRecepcionista) return
    
    if (!confirm(`Tens a certeza que queres redefinir a password do recepcionista ${editingRecepcionista.nome_completo} para "${SENHA_PADRAO}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/recepcionistas/${editingRecepcionista.id_recepcionista}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_recepcionista: editingRecepcionista.id_recepcionista,
          tipo: 'reset_password'
        })
      })

      if (res.ok) {
        const data = await res.json()
        alert(data.message || 'Password redefinida com sucesso!')
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao redefinir password')
      }
    } catch (error) {
      console.error('Erro ao redefinir password:', error)
      alert('Erro ao redefinir password')
    }
  }

  const openEditModal = (recepcionista: Recepcionista) => {
    setEditingRecepcionista(recepcionista)
    setFormData({
      email: recepcionista.usuario.email,
      nome_completo: recepcionista.nome_completo,
      // Extrair apenas os últimos 8 dígitos (após o prefixo +244 9)
      telemovel: cleanPhoneForInput(recepcionista.numero_telemovel),
      turno: recepcionista.turno
    })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    if (formData.telemovel && !validatePhone(formData.telemovel)) {
      alert('O número de telefone deve ter 8 dígitos')
      setSaving(false)
      return
    }

    try {
      const url = editingRecepcionista 
        ? `/api/admin/recepcionistas/${editingRecepcionista.id_recepcionista}`
        : '/api/admin/recepcionistas'
      
      const method = editingRecepcionista ? 'PUT' : 'POST'

      const payload = {
        ...formData,
        telemovel: formData.telemovel ? formatPhone(formData.telemovel) : "",
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao salvar')
        return
      }

      setShowModal(false)
      fetchRecepcionistas()
    } catch (err) {
      setError('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (recepcionista: Recepcionista) => {
    if (!confirm(`Tem certeza que deseja remover o recepcionista "${recepcionista.usuario.nome_usuario}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/recepcionistas/${recepcionista.id_recepcionista}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Erro ao remover')
        return
      }

      fetchRecepcionistas()
    } catch (err) {
      alert('Erro ao remover')
    }
  }

  return (
    <DashboardLayout
      navItems={adminNavItems}
      title="Gestão de Recepcionistas"
      subtitle="Gerir utilizadores recepcionistas do sistema"
    >
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={openCreateModal}
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
          ➕ Adicionar Novo Recepcionista
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          A carregar recepcionistas...
        </div>
      ) : (
        recepcionistas.length === 0 ? (
          <div style={{ 
            background: 'var(--bg-card)', 
            borderRadius: '12px', 
            padding: '60px', 
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            Nenhum recepcionista encontrado
          </div>
        ) : (
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Nome</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Telefone</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Turno</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {recepcionistas.map((recepcionista) => (
                  <tr key={recepcionista.id_recepcionista} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>{recepcionista.nome_completo}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>{recepcionista.usuario.email}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>{recepcionista.numero_telemovel || '—'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-primary)', fontSize: '13px' }}>
                      <span style={{ 
                        background: recepcionista.turno === 'Manha' ? 'rgba(240,165,0,0.15)' : 'rgba(45,212,191,0.15)',
                        color: recepcionista.turno === 'Manha' ? '#f0a500' : '#2dd4bf',
                        padding: '4px 10px', 
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {recepcionista.turno === 'Manha' ? 'Manhã' : 'Tarde'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button 
                        onClick={() => openEditModal(recepcionista)}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          border: '1px solid var(--border-color-strong)',
                          borderRadius: '6px',
                          color: '#f0a500',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}>✏️ Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal Adicionar/Editar Recepcionista */}
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
            width: '400px',
            maxWidth: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)' }}>
              {editingRecepcionista ? 'Editar Recepcionista' : 'Adicionar Novo Recepcionista'}
            </h3>
            
            {error && (
              <div style={{ 
                background: 'var(--accent-bg)', 
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({...formData, nome_completo: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'white',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'white',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Telefone (+244 9)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px', whiteSpace: 'nowrap' }}>+244 9</span>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="XXXXXXXX"
                    value={formData.telemovel}
                    onChange={(e) => setFormData({...formData, telemovel: e.target.value.replace(/\D/g, '').slice(0, 8)})}
                    style={{ 
                      flex: 1, 
                      width: 'auto', 
                      padding: '12px', 
                      background: 'var(--bg-input)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px', 
                      color: 'white',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Turno</label>
                <select
                  value={formData.turno}
                  onChange={(e) => setFormData({...formData, turno: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'white',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Manha">Manhã</option>
                  <option value="Tarde">Tarde</option>
                </select>
              </div>

              {!editingRecepcionista && (
                <div style={{ marginBottom: '20px', padding: '12px', background: '#f0a50020', borderRadius: '8px' }}>
                  <span style={{ color: '#f0a500', fontSize: '13px' }}>🔑 Senha padrão: <strong>{SENHA_PADRAO}</strong></span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {/* Botão Apagar só na edição */}
                {editingRecepcionista && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingRecepcionista)}
                    style={{
                      padding: '12px 20px',
                      background: 'transparent',
                      border: '1px solid var(--accent)',
                      borderRadius: '8px',
                      color: 'var(--accent)',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Apagar
                  </button>
                )}
                
                {/* Botão Reset Password só na edição */}
                {editingRecepcionista && (
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
                    🔑 Reset
                  </button>
                )}

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
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
