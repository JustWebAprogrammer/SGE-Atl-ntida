"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/app/components/DashboardLayout"
import { adminNavItems } from "@/app/admin/adminNav"
import { cleanPhoneForInput, formatPhone, validatePhone } from "@/lib/phone"

interface Admin {
  id_admin: number
  nome_completo: string | null
  numero_telemovel: string | null
  id_usuario: number
  usuario: {
    nome_usuario: string
    email: string
    data_cadastro: string
  }
}

export default function AdminsAdminDashboard() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [search, setSearch] = useState("")
  const [formData, setFormData] = useState({
    email: '',
    nome_completo: '',
    telemovel: ''
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAdmins()
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAdmins()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchAdmins = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      
      const res = await fetch(`/api/admin/admins?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setAdmins(data)
      }
    } catch (err) {
      console.error('Erro ao buscar administradores:', err)
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingAdmin(null)
    setFormData({
      email: '',
      nome_completo: '',
      telemovel: ''
    })
    setError('')
    setShowModal(true)
  }

  const openEditModal = (admin: Admin) => {
    setEditingAdmin(admin)
    setFormData({
      email: admin.usuario.email,
      nome_completo: admin.nome_completo || '',
      telemovel: cleanPhoneForInput(admin.numero_telemovel)
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
      const url = editingAdmin 
        ? `/api/admin/admins/${editingAdmin.id_admin}`
        : '/api/admin/admins'
      
      const method = editingAdmin ? 'PUT' : 'POST'

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
      fetchAdmins()
    } catch (err) {
      setError('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingAdmin) return
    
    if (!confirm(`Tem certeza que deseja remover o administrador "${editingAdmin.usuario.nome_usuario}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/admins/${editingAdmin.id_admin}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Erro ao remover')
        return
      }

      setShowModal(false)
      fetchAdmins()
    } catch (err) {
      alert('Erro ao remover')
    }
  }

  const handleResetPassword = async () => {
    if (!editingAdmin) return

    if (!confirm(`Tens a certeza que queres redefinir a password do administrador ${editingAdmin.nome_completo} para "admin123"?`)) {
      return
    }

    try {
      const res = await fetch('/api/admin/admins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_admin: editingAdmin.id_admin,
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

  return (
    <DashboardLayout
      navItems={adminNavItems}
      title="Gestão de Administradores"
      subtitle="Gerir utilizadores administradores do sistema"
    >
      {/* Barra de Pesquisa e Filtros */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* Pesquisa */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Pesquisar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: '#13161e',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '8px',
              color: 'white',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Botão adicionar */}
        <button 
          onClick={openCreateModal}
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
          ➕ Adicionar Novo Administrador
        </button>
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9098b0' }}>
          A carregar administradores...
        </div>
      ) : admins.length === 0 ? (
        <div style={{ 
          background: '#1e2230', 
          borderRadius: '12px', 
          padding: '60px', 
          textAlign: 'center',
          color: '#9098b0'
        }}>
          Nenhum administrador encontrado
        </div>
      ) : (
        <div style={{ background: '#1e2230', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th style={{ textAlign: 'left', padding: '14px', color: '#9098b0', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Nome</th>
                <th style={{ textAlign: 'left', padding: '14px', color: '#9098b0', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Utilizador</th>
                <th style={{ textAlign: 'left', padding: '14px', color: '#9098b0', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '14px', color: '#9098b0', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Telefone</th>
                <th style={{ textAlign: 'left', padding: '14px', color: '#9098b0', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Cadastro</th>
                <th style={{ textAlign: 'left', padding: '14px', color: '#9098b0', fontWeight: '500', fontSize: '12px', textTransform: 'uppercase' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id_admin} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '14px', color: '#e8eaf0', fontSize: '14px', fontWeight: '500' }}>
                    {admin.nome_completo || '—'}
                  </td>
                  <td style={{ padding: '14px', color: '#9098b0', fontSize: '13px' }}>
                    @{admin.usuario.nome_usuario}
                  </td>
                  <td style={{ padding: '14px', color: '#9098b0', fontSize: '13px' }}>
                    {admin.usuario.email}
                  </td>
                  <td style={{ padding: '14px', color: '#9098b0', fontSize: '13px' }}>
                    {admin.numero_telemovel || '—'}
                  </td>
                  <td style={{ padding: '14px', color: '#9098b0', fontSize: '13px' }}>
                    {new Date(admin.usuario.data_cadastro).toLocaleDateString('pt-AO')}
                  </td>
                  <td style={{ padding: '14px' }}>
                    <button 
                      onClick={() => openEditModal(admin)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f0a500',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
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

      {/* Modal Adicionar/Editar Administrador */}
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
            <h3 style={{ margin: '0 0 20px 0', color: '#e8eaf0' }}>
              {editingAdmin ? 'Editar Administrador' : 'Adicionar Novo Administrador'}
            </h3>
            
            {error && (
              <div style={{ 
                background: 'rgba(224,61,61,0.12)', 
                border: '1px solid #e03d3d',
                color: '#e03d3d',
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
                <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({...formData, nome_completo: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#13161e',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: 'white',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#13161e',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: 'white',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#9098b0', fontSize: '13px' }}>Telefone (+244 9)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ color: '#9098b0', fontSize: '14px', whiteSpace: 'nowrap' }}>+244 9</span>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="12345678"
                    value={formData.telemovel}
                    onChange={(e) => setFormData({...formData, telemovel: e.target.value.replace(/\D/g, '').slice(0, 8)})}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#13161e',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '8px',
                      color: 'white',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {!editingAdmin && (
                <div style={{ marginBottom: '20px', padding: '12px', background: '#f0a50020', borderRadius: '8px' }}>
                  <span style={{ color: '#f0a500', fontSize: '13px' }}>🔑 Senha padrão: <strong>admin123</strong></span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {editingAdmin && (
                  <>
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
                      onClick={handleDelete}
                      style={{
                        padding: '12px 20px',
                        background: 'transparent',
                        border: '1px solid #e03d3d',
                        borderRadius: '8px',
                        color: '#e03d3d',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Remover
                    </button>
                  </>
                )}
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
