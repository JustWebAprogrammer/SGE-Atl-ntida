"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/app/components/DashboardLayout"
import { adminNavItems } from "@/app/admin/adminNav"

interface ConfigTaxas {
  id_configuracao: number
  Propina_ano1: number
  Propina_ano2: number
  Propina_ano3: number
  Propina_ano4: number
  Propina_ano5: number
  Propina_ano6: number
  valor_multa_atraso: number
  duracao_aula_minutos: number
  intervalo_aula_minutos: number
  atualizado_em: string
}

interface Servico {
  id_servico: number
  nome_servico: string
  descricao: string | null
  valor: number
  activo: boolean
  ordem: number
}

export default function PrecosAdminDashboard() {
  const [config, setConfig] = useState<ConfigTaxas | null>(null)
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  
  // Modal adicionar serviço
  const [showAddModal, setShowAddModal] = useState(false)
  const [newServico, setNewServico] = useState({ nome_servico: "", descricao: "", valor: 0 })
  
  // Modal editar serviço
  const [editingServico, setEditingServico] = useState<Servico | null>(null)
  const [editForm, setEditForm] = useState({ nome_servico: "", descricao: "", valor: 0 })

  const [formData, setFormData] = useState({
    Propina_ano1: 15000,
    Propina_ano2: 20000,
    Propina_ano3: 25000,
    Propina_ano4: 30000,
    Propina_ano5: 35000,
    Propina_ano6: 40000,
    valor_multa_atraso: 500,
    duracao_aula_minutos: 90,
    intervalo_aula_minutos: 10
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [configRes, servicosRes] = await Promise.all([
        fetch('/api/admin/config/taxas'),
        fetch('/api/admin/config/servicos')
      ])
      
      const configData = await configRes.json()
      const servicosData = await servicosRes.json()
      
      if (configData) {
        setConfig(configData)
        setFormData({
          Propina_ano1: Number(configData.Propina_ano1) || 15000,
          Propina_ano2: Number(configData.Propina_ano2) || 20000,
          Propina_ano3: Number(configData.Propina_ano3) || 25000,
          Propina_ano4: Number(configData.Propina_ano4) || 30000,
          Propina_ano5: Number(configData.Propina_ano5) || 35000,
          Propina_ano6: Number(configData.Propina_ano6) || 40000,
          valor_multa_atraso: Number(configData.valor_multa_atraso) || 500,
          duracao_aula_minutos: configData.duracao_aula_minutos || 90,
          intervalo_aula_minutos: configData.intervalo_aula_minutos || 10
        })
      }
      
      setServicos(Array.isArray(servicosData) ? servicosData : [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveFallbacks(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage("")

    try {
      const res = await fetch('/api/admin/config/taxas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setMessage("✅ Valores fallback guardados com sucesso!")
        fetchData()
      } else {
        setMessage("❌ Erro ao guardar valores")
      }
    } catch (error) {
      setMessage("❌ Erro ao guardar valores")
    } finally {
      setSaving(false)
    }
  }

  async function handleAddServico(e: React.FormEvent) {
    e.preventDefault()
    if (!newServico.nome_servico || !newServico.valor) {
      setMessage("❌ Nome e valor são obrigatórios")
      return
    }

    try {
      const res = await fetch('/api/admin/config/servicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newServico)
      })

      if (res.ok) {
        setShowAddModal(false)
        setNewServico({ nome_servico: "", descricao: "", valor: 0 })
        setMessage("✅ Serviço adicionado com sucesso!")
        fetchData()
      } else {
        setMessage("❌ Erro ao adicionar serviço")
      }
    } catch (error) {
      setMessage("❌ Erro ao adicionar serviço")
    }
  }

  async function handleUpdateServico(e: React.FormEvent) {
    e.preventDefault()
    if (!editingServico) return

    try {
      const res = await fetch('/api/admin/config/servicos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_servico: editingServico.id_servico,
          ...editForm
        })
      })

      if (res.ok) {
        setEditingServico(null)
        setMessage("✅ Serviço atualizado com sucesso!")
        fetchData()
      } else {
        setMessage("❌ Erro ao atualizar serviço")
      }
    } catch (error) {
      setMessage("❌ Erro ao atualizar serviço")
    }
  }

  async function handleDeleteServico(id: number) {
    if (!confirm("Tens a certeza que queres eliminar este serviço?")) return

    try {
      const res = await fetch(`/api/admin/config/servicos?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setMessage("✅ Serviço eliminado com sucesso!")
        fetchData()
      } else {
        setMessage("❌ Erro ao eliminar serviço")
      }
    } catch (error) {
      setMessage("❌ Erro ao eliminar serviço")
    }
  }

  function formatarKwanzas(valor: number) {
    return valor.toLocaleString('pt-AO') + ' Kz'
  }

  if (loading) {
    return (
      <DashboardLayout navItems={adminNavItems} title="Preços e Taxas" subtitle="Configurar valores dos serviços">
        <div style={{ textAlign: 'center', padding: '40px', color: '#d0d7e8' }}>A carregar...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      navItems={adminNavItems}
      title="Preços e Taxas"
      subtitle="Configure valores fallback e gerencie serviços académicos"
    >
      <div style={{ maxWidth: '900px' }}>
        {/* Mensagem de sucesso/erro */}
        {message && (
          <div style={{ 
            padding: '12px 20px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            background: message.includes('sucesso') ? '#2dd4bf20' : '#e03d3d20',
            color: message.includes('sucesso') ? '#2dd4bf' : '#e03d3d'
          }}>
            {message}
          </div>
        )}

        {/* Fallbacks - Propinas por Ano */}
        <form onSubmit={handleSaveFallbacks} style={{ background: '#1e2230', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ color: '#e8eaf0', marginBottom: '8px', marginTop: 0 }}>💰 Propinas (Fallback)</h3>
          <p style={{ color: '#d0d7e8', fontSize: '13px', marginBottom: '20px' }}>
            ⚠️ Estes valores são usados automaticamente quando um curso não tem preços específicos definidos na gestão de cursos.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: '#13161e', padding: '16px', borderRadius: '12px' }}>
              <label style={{ display: 'block', color: '#d0d7e8', fontSize: '13px', marginBottom: '8px' }}>1º Ano</label>
              <input
                type="number"
                value={formData.Propina_ano1}
                onChange={(e) => setFormData({...formData, Propina_ano1: Number(e.target.value)})}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0d0f14',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ color: '#2dd4bf', marginTop: '8px', fontSize: '14px' }}>{formatarKwanzas(formData.Propina_ano1)}</div>
            </div>

            <div style={{ background: '#13161e', padding: '16px', borderRadius: '12px' }}>
              <label style={{ display: 'block', color: '#d0d7e8', fontSize: '13px', marginBottom: '8px' }}>2º Ano</label>
              <input
                type="number"
                value={formData.Propina_ano2}
                onChange={(e) => setFormData({...formData, Propina_ano2: Number(e.target.value)})}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0d0f14',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ color: '#2dd4bf', marginTop: '8px', fontSize: '14px' }}>{formatarKwanzas(formData.Propina_ano2)}</div>
            </div>

            <div style={{ background: '#13161e', padding: '16px', borderRadius: '12px' }}>
              <label style={{ display: 'block', color: '#d0d7e8', fontSize: '13px', marginBottom: '8px' }}>3º Ano</label>
              <input
                type="number"
                value={formData.Propina_ano3}
                onChange={(e) => setFormData({...formData, Propina_ano3: Number(e.target.value)})}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0d0f14',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ color: '#2dd4bf', marginTop: '8px', fontSize: '14px' }}>{formatarKwanzas(formData.Propina_ano3)}</div>
            </div>

            <div style={{ background: '#13161e', padding: '16px', borderRadius: '12px' }}>
              <label style={{ display: 'block', color: '#d0d7e8', fontSize: '13px', marginBottom: '8px' }}>4º Ano</label>
              <input
                type="number"
                value={formData.Propina_ano4}
                onChange={(e) => setFormData({...formData, Propina_ano4: Number(e.target.value)})}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0d0f14',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ color: '#2dd4bf', marginTop: '8px', fontSize: '14px' }}>{formatarKwanzas(formData.Propina_ano4)}</div>
            </div>

            <div style={{ background: '#13161e', padding: '16px', borderRadius: '12px' }}>
              <label style={{ display: 'block', color: '#d0d7e8', fontSize: '13px', marginBottom: '8px' }}>5º Ano</label>
              <input
                type="number"
                value={formData.Propina_ano5}
                onChange={(e) => setFormData({...formData, Propina_ano5: Number(e.target.value)})}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0d0f14',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ color: '#2dd4bf', marginTop: '8px', fontSize: '14px' }}>{formatarKwanzas(formData.Propina_ano5)}</div>
            </div>

            <div style={{ background: '#13161e', padding: '16px', borderRadius: '12px' }}>
              <label style={{ display: 'block', color: '#d0d7e8', fontSize: '13px', marginBottom: '8px' }}>6º Ano</label>
              <input
                type="number"
                value={formData.Propina_ano6}
                onChange={(e) => setFormData({...formData, Propina_ano6: Number(e.target.value)})}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0d0f14',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ color: '#2dd4bf', marginTop: '8px', fontSize: '14px' }}>{formatarKwanzas(formData.Propina_ano6)}</div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'A guardar...' : '💾 Guardar Fallbacks'}
          </button>
        </form>

        {/* Fallback - Multa */}
        <form onSubmit={handleSaveFallbacks} style={{ background: '#1e2230', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ color: '#e8eaf0', marginBottom: '8px', marginTop: 0 }}>⚠️ Multa por Atraso (Fallback)</h3>
          <p style={{ color: '#d0d7e8', fontSize: '13px', marginBottom: '20px' }}>
            ⚠️ Valor usado automaticamente quando um curso não tem multa específica definida.
          </p>
          
          <div style={{ background: '#13161e', padding: '16px', borderRadius: '12px', maxWidth: '300px' }}>
            <input
              type="number"
              value={formData.valor_multa_atraso}
              onChange={(e) => setFormData({...formData, valor_multa_atraso: Number(e.target.value)})}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0d0f14',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ color: '#e03d3d', marginTop: '8px', fontSize: '14px' }}>{formatarKwanzas(formData.valor_multa_atraso)}</div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              marginTop: '16px'
            }}
          >
            {saving ? 'A guardar...' : '💾 Guardar'}
          </button>
        </form>

        {/* Configuração de Horário */}
        <form onSubmit={handleSaveFallbacks} style={{ background: '#1e2230', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ color: '#e8eaf0', marginBottom: '8px', marginTop: 0 }}>⏱️ Configuração de Horário</h3>
          <p style={{ color: '#d0d7e8', fontSize: '13px', marginBottom: '20px' }}>
            Define a duração padrão de cada aula e o intervalo entre aulas. Usado pelo gestor ao elaborar horários.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: '#13161e', padding: '16px', borderRadius: '12px' }}>
              <label style={{ display: 'block', color: '#d0d7e8', fontSize: '13px', marginBottom: '8px' }}>Duração da Aula (minutos)</label>
              <input
                type="number"
                min={30}
                max={180}
                value={formData.duracao_aula_minutos}
                onChange={(e) => setFormData({...formData, duracao_aula_minutos: Number(e.target.value)})}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0d0f14',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ color: '#2dd4bf', marginTop: '8px', fontSize: '14px' }}>{formData.duracao_aula_minutos} minutos</div>
            </div>

            <div style={{ background: '#13161e', padding: '16px', borderRadius: '12px' }}>
              <label style={{ display: 'block', color: '#d0d7e8', fontSize: '13px', marginBottom: '8px' }}>Intervalo entre Aulas (minutos)</label>
              <input
                type="number"
                min={0}
                max={60}
                value={formData.intervalo_aula_minutos}
                onChange={(e) => setFormData({...formData, intervalo_aula_minutos: Number(e.target.value)})}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0d0f14',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ color: '#2dd4bf', marginTop: '8px', fontSize: '14px' }}>{formData.intervalo_aula_minutos} minutos</div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'A guardar...' : '💾 Guardar Configuração de Horário'}
          </button>
        </form>

        {/* Serviços Acadêmicos - Lista Dinâmica */}
        <div style={{ background: '#1e2230', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ color: '#e8eaf0', marginBottom: '8px', marginTop: 0 }}>📄 Serviços Acadêmicos</h3>
              <p style={{ color: '#d0d7e8', fontSize: '13px', margin: 0 }}>
                Lista dinâmica de serviços disponíveis para emissão na recepção
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '10px 20px',
                background: '#22c55e',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ➕ Adicionar Serviço
            </button>
          </div>

          {servicos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#d0d7e8' }}>
              Nenhum serviço cadastrado. Clique em Adicionar Serviço para começar.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {servicos.map((servico) => (
                <div
                  key={servico.id_servico}
                  style={{
                    background: '#13161e',
                    padding: '16px',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
            <div style={{ color: '#e8eaf0', fontWeight: '600', fontSize: '15px' }}>{servico.nome_servico?.replace(/"/g, '"')}</div>
                    {servico.descricao && (
                      <div style={{ color: '#d0d7e8', fontSize: '13px', marginTop: '4px' }}>{servico.descricao}</div>
                    )}
                    <div style={{ color: '#f0a500', fontWeight: '600', marginTop: '8px' }}>{formatarKwanzas(Number(servico.valor))}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setEditingServico(servico)
                        setEditForm({
                          nome_servico: servico.nome_servico,
                          descricao: servico.descricao || "",
                          valor: Number(servico.valor)
                        })
                      }}
                      style={{
                        padding: '8px 16px',
                        background: '#f0a500',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDeleteServico(servico.id_servico)}
                      style={{
                        padding: '8px 16px',
                        background: '#e03d3d',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {config?.atualizado_em && (
          <p style={{ color: '#d0d7e8', marginTop: '16px', fontSize: '13px', textAlign: 'center' }}>
            Última atualização fallback: {new Date(config.atualizado_em).toLocaleString('pt-AO')}
          </p>
        )}
      </div>

      {/* Modal Adicionar Serviço */}
      {showAddModal && (
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
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            background: '#1e2230',
            borderRadius: '16px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: '#e8eaf0' }}>Adicionar Novo Serviço</h3>
            
            <form onSubmit={handleAddServico}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Nome do Serviço</label>
                <input
                  type="text"
                  value={newServico.nome_servico}
                  onChange={(e) => setNewServico({...newServico, nome_servico: e.target.value})}
                  placeholder="Ex: Certificado de Conclusão"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#13161e',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: 'white',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Descrição (opcional)</label>
                <input
                  type="text"
                  value={newServico.descricao}
                  onChange={(e) => setNewServico({...newServico, descricao: e.target.value})}
                  placeholder="Ex: Emissão de certificado de conclusão de curso"
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

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Valor (Kz)</label>
                <input
                  type="number"
                  value={newServico.valor}
                  onChange={(e) => setNewServico({...newServico, valor: Number(e.target.value)})}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#13161e',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: 'white',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                    background: '#22c55e',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Serviço */}
      {editingServico && (
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
        }} onClick={() => setEditingServico(null)}>
          <div style={{
            background: '#1e2230',
            borderRadius: '16px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: '#e8eaf0' }}>Editar Serviço</h3>
            
            <form onSubmit={handleUpdateServico}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Nome do Serviço</label>
                <input
                  type="text"
                  value={editForm.nome_servico}
                  onChange={(e) => setEditForm({...editForm, nome_servico: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#13161e',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: 'white',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Descrição (opcional)</label>
                <input
                  type="text"
                  value={editForm.descricao}
                  onChange={(e) => setEditForm({...editForm, descricao: e.target.value})}
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

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Valor (Kz)</label>
                <input
                  type="number"
                  value={editForm.valor}
                  onChange={(e) => setEditForm({...editForm, valor: Number(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#13161e',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: 'white',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingServico(null)}
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
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}