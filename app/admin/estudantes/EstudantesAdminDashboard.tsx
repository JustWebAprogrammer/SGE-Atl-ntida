"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/app/components/DashboardLayout"
import { adminNavItems } from "@/app/admin/adminNav"
import { cleanPhoneForInput, formatPhone, validatePhone } from "@/lib/phone"
import { arredondarNota, calcularNotaFinal } from "@/lib/notas"

interface Estudante {
  id_estudante: number
  nome_completo: string
  numero_estudante: string
  numero_telemovel?: string
  id_curso?: number
  ano_current: number
  turno?: string
  estado: string
  tipo_bolsa?: string
  curso?: {
    nome_curso: string
  }
  usuario: {
    email: string
    nome_usuario: string
  }
}

interface Nota {
  id_nota: number
  ac1: number | null
  ac2: number | null
  ac3: number | null
  ttp: number | null
  pp1: number | null
  pp2: number | null
  exame: number | null
  recurso: number | null
  exame_especial: number | null
  disciplina?: {
    id_disciplina: number
    nome_disciplina: string
    codigo_disciplina: string
    ano_curricular: number
  }
}

type NotaField = 'ac1' | 'ac2' | 'ac3' | 'ttp' | 'pp1' | 'pp2' | 'exame' | 'recurso' | 'exame_especial'

interface Pagamento {
  id: number
  tipo: 'propina' | 'servico'
  referencia: string
  descricao: string
  valor_base: number
  valor_multa: number
  valor_total: number
  estado: string
  data: string | Date
  mes: number | null
  ano: number | null
}

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const modalBoxStyle: React.CSSProperties = {
  background: '#1e2230',
  borderRadius: '16px',
  padding: '24px',
  width: '450px',
  maxWidth: '90%',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  background: '#13161e',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '8px',
  color: 'white',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  color: '#d0d7e8',
  fontSize: '13px',
}

export default function EstudantesAdminDashboard() {
  const [estudantes, setEstudantes] = useState<Estudante[]>([])
  const [cursos, setCursos] = useState<{id_curso: number, nome_curso: string, duracao_anos: number | null, turnos?: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  
  // Filtros
  const [search, setSearch] = useState("")
  const [filtroCurso, setFiltroCurso] = useState("")
  const [filtroAno, setFiltroAno] = useState("")
  const [filtroBolsa, setFiltroBolsa] = useState("")
  const [filtroTurno, setFiltroTurno] = useState("")

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    id_curso: 1,
    ano_actual: 1,
    turno: "Matinal",
    tipo_bolsa: "Nenhuma",
  })

  const [selectedStudent, setSelectedStudent] = useState<Estudante | null>(null)
  const [activeTab, setActiveTab] = useState<'notas' | 'pagamentos'>('notas')
  const [selectedAno, setSelectedAno] = useState(1)
  const [notas, setNotas] = useState<Nota[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [searchPagamentos, setSearchPagamentos] = useState("")
  const [filtroTipoPagamento, setFiltroTipoPagamento] = useState<"todos" | "propina" | "servico">("todos")
  // State for grade editing with explicit save
  const [localGrades, setLocalGrades] = useState<Record<number, Partial<Nota>>>({})
  const [originalGrades, setOriginalGrades] = useState<Record<number, Partial<Nota>>>({})
  const [savingGrades, setSavingGrades] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  const [editingStudent, setEditingStudent] = useState<Estudante | null>(null)
  const [editFormData, setEditFormData] = useState({
    id_estudante: 0,
    nome_completo: "",
    numero_telemovel: "",
    id_curso: 1,
    ano_current: 1,
    turno: "Matinal",
    tipo_bolsa: "Nenhuma",
    estado: "EmCurso",
  })

  useEffect(() => {
    fetchCursos()
    fetchEstudantes()
  }, [])

  async function fetchCursos() {
    try {
      const res = await fetch('/api/admin/cursos')
      if (res.ok) {
        const data = await res.json()
        setCursos(data)
      }
    } catch (error) {
      console.error('Erro ao carregar cursos:', error)
    }
  }

  async function fetchEstudantes() {
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (filtroCurso) params.append('id_curso', filtroCurso)
      if (filtroAno) params.append('ano_current', filtroAno)
      if (filtroBolsa) params.append('tipo_bolsa', filtroBolsa)
      if (filtroTurno) params.append('turno', filtroTurno)
      
      const res = await fetch(`/api/admin/estudantes?${params.toString()}`)
      const data = await res.json()
      setEstudantes(data)
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEstudantes()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, filtroCurso, filtroAno, filtroBolsa, filtroTurno])

  // Fetch notas when selected student changes
  useEffect(() => {
    if (selectedStudent) {
      fetchNotas()
    }
  }, [selectedStudent, selectedAno])

  // Initialize localGrades when notas changes
  useEffect(() => {
    if (notas.length > 0) {
      const grades: Record<number, Partial<Nota>> = {}
      const originals: Record<number, Partial<Nota>> = {}
      
      notas.forEach(nota => {
        grades[nota.id_nota] = {
          ac1: nota.ac1,
          ac2: nota.ac2,
          ac3: nota.ac3,
          ttp: nota.ttp,
          pp1: nota.pp1,
          pp2: nota.pp2,
          exame: nota.exame,
          recurso: nota.recurso,
          exame_especial: nota.exame_especial,
        }
        originals[nota.id_nota] = {
          ac1: nota.ac1,
          ac2: nota.ac2,
          ac3: nota.ac3,
          ttp: nota.ttp,
          pp1: nota.pp1,
          pp2: nota.pp2,
          exame: nota.exame,
          recurso: nota.recurso,
          exame_especial: nota.exame_especial,
        }
      })
      
      setLocalGrades(grades)
      setOriginalGrades(originals)
    } else {
      setLocalGrades({})
      setOriginalGrades({})
    }
  }, [notas])

  // Fetch pagamentos when selected student changes
  useEffect(() => {
    if (selectedStudent && activeTab === 'pagamentos') {
      fetchPagamentos()
    }
  }, [selectedStudent, activeTab])

  async function fetchNotas() {
    if (!selectedStudent) return
    try {
      setLoadingDetails(true)
      const res = await fetch(`/api/admin/estudantes/${selectedStudent.id_estudante}?tipo=notas&ano=${selectedAno}`)
      if (res.ok) {
        const data = await res.json()
        setNotas(data)
      }
    } catch (error) {
      console.error('Erro ao carregar notas:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  async function fetchPagamentos() {
    if (!selectedStudent) return
    try {
      setLoadingDetails(true)
      const res = await fetch(`/api/admin/estudantes/${selectedStudent.id_estudante}?tipo=pagamentos`)
      if (res.ok) {
        const data = await res.json()
        setPagamentos(data)
      }
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  // handleUpdateNota removed - using modal pattern with explicit save button

  async function handleUpdatePagamento(id_pagamento: number, novoEstado: string) {
    try {
      const res = await fetch(`/api/admin/estudantes/${selectedStudent?.id_estudante}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'pagamento',
          id_registro: id_pagamento,
          estado: novoEstado
        })
      })
      if (res.ok) {
        fetchPagamentos()
      }
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (formData.telefone && !validatePhone(formData.telefone)) {
      alert('O número de telefone deve ter 8 dígitos')
      return
    }
    try {
      const res = await fetch('/api/admin/estudantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          telefone: formData.telefone ? formatPhone(formData.telefone) : "",
        }),
      })
      if (res.ok) {
        setShowModal(false)
        setFormData({ nome: "", email: "", telefone: "", id_curso: 1, ano_actual: 1, turno: "Matinal", tipo_bolsa: "Nenhuma" })
        fetchEstudantes()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao criar estudante')
      }
    } catch (error) {
      console.error('Erro ao criar estudante:', error)
      alert('Erro de conexão com o servidor')
    }
  }

  async function handleResetPassword() {
    if (!editFormData.id_estudante) return
    if (!confirm('Tem certeza que deseja redefinir a password para "estudante12345"?')) return
    
    try {
      const res = await fetch(`/api/admin/estudantes/${editFormData.id_estudante}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'reset_password' })
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
      alert('Erro de conexão')
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editFormData.numero_telemovel && !validatePhone(editFormData.numero_telemovel)) {
      alert('O número de telefone deve ter 8 dígitos')
      return
    }
    try {
      const res = await fetch('/api/admin/estudantes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          numero_telemovel: editFormData.numero_telemovel ? formatPhone(editFormData.numero_telemovel) : "",
        }),
      })
      if (res.ok) {
        setEditingStudent(null)
        fetchEstudantes()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao atualizar estudante')
      }
    } catch (error) {
      console.error('Erro ao atualizar estudante:', error)
      alert('Erro de conexão com o servidor')
    }
  }

  // handleUpdateNota removed - using explicit save button pattern

  // Calculate preview grade with rounding
  function calcularPreview() {
    if (!selectedStudent || notas.length === 0) return null

    // Get the first nota (assuming one per discipline for preview)
    const nota = notas[0]
    if (!nota) return null

    const { ac1, ac2, ac3, ttp, pp1, pp2, exame, recurso, exame_especial } = nota

    // Special cases: Exame Especial and Recurso
    if (exame_especial != null) return { nota: arredondarNota(exame_especial), tipo: "Exame Especial", is_provisional: false }
    if (recurso != null) return { nota: arredondarNota(recurso), tipo: "Recurso", is_provisional: false }

    // Calculate progressively (using only non-null values)
    const acValues = [ac1, ac2, ac3].filter(v => v !== null)
    const ppValues = [pp1, pp2].filter(v => v !== null)

    // If AC is empty (all null) and PP is empty, return null
    if (acValues.length === 0 && ppValues.length === 0 && ttp === null) {
      return null
    }

    // Calculate AC grade (average of available values)
    const acAvg = acValues.length > 0 
      ? acValues.reduce((sum, v) => sum + v, 0) / acValues.length 
      : 0
    
    const ttpVal = ttp ?? 0
    
    // MAC = ((média AC) + TTP) / 2
    const mac = (acAvg + ttpVal) / 2
    
    // Média = round((MAC + PP1 + PP2) / 3)
    // If PP1 or PP2 is null, they are excluded from the average
    const ppSum = ppValues.reduce((sum, v) => sum + v, 0)
    const ppCount = ppValues.length
    const totalComponents = 1 + ppCount // MAC counts as 1 component
    
    const media = arredondarNota((mac + ppSum) / totalComponents)

    // Consider dispensa (nota_dispensa = 14)
    if (media !== null && media >= 14) return { nota: media, tipo: "Dispensado", is_provisional: false }

    if (exame != null && media !== null) {
      const notaFinal = arredondarNota((media + exame) / 2)
      return { nota: notaFinal, tipo: "Com Exame", is_provisional: false }
    }

    // Sem exame ainda (provisional)
    return { nota: media, tipo: "Parcial", is_provisional: true }
  }

  const preview = calcularPreview()

  // Helper: get turnos array for a given curso id
  function getTurnosForCurso(id_curso: number): string[] {
    const curso = cursos.find(c => c.id_curso === id_curso)
    if (!curso?.turnos) return ["Matinal"]
    return curso.turnos.split(",").map(t => t.trim()).filter(Boolean)
  }

  // All unique turnos across all courses (for filter dropdown)
  const allTurnos = Array.from(new Set(cursos.flatMap(c => getTurnosForCurso(c.id_curso))))

  // Check if there are any changes
  const hasChanges = Object.keys(localGrades).some(idNotaStr => {
    const id_nota = Number(idNotaStr)
    const local = localGrades[id_nota]
    const original = originalGrades[id_nota]
    
    if (!local || !original) return false
    
        const campos: NotaField[] = ['ac1', 'ac2', 'ac3', 'ttp', 'pp1', 'pp2', 'exame', 'recurso', 'exame_especial']
    return campos.some(campo => {
      const localVal = local[campo] ?? null
      const originalVal = original[campo] ?? null
      return localVal !== originalVal
    })
  })

  async function handleSaveGrades() {
    if (!selectedStudent) return
    
    setSavingGrades(true)
    setSaveMessage(null)
    
    try {
      // Get changed grades
      const changed: { id_nota: number; data: any }[] = []
      
      for (const [idNotaStr, localData] of Object.entries(localGrades)) {
        const id_nota = Number(idNotaStr)
        const original = originalGrades[id_nota]
        
        if (!original) continue
        
        const campos: NotaField[] = ['ac1', 'ac2', 'ac3', 'ttp', 'pp1', 'pp2', 'exame', 'recurso', 'exame_especial']
        const hasChanges = campos.some(campo => {
          const local = localData[campo] ?? null
          const originalVal = original[campo] ?? null
          return local !== originalVal
        })
        
        if (hasChanges) {
          changed.push({ id_nota, data: localData })
        }
      }
      
      if (changed.length === 0) {
        setSaveMessage({ type: 'success', text: 'Nenhuma alteração para salvar' })
        return
      }
      
      // Send all requests in parallel
      const results = await Promise.allSettled(
        changed.map(({ id_nota, data }) =>
          fetch(`/api/gestor/estudantes/${selectedStudent.id_estudante}/notas/${id_nota}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
        )
      )
      
      // Check if all succeeded
      const allSuccess = results.every(r => r.status === 'fulfilled' && r.value.ok)
      
      if (allSuccess) {
        setSaveMessage({ type: 'success', text: `Notas salvas com sucesso (${changed.length} disciplina(s))` })
        // Refresh data
        await fetchNotas()
        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        const failedCount = results.filter(r => r.status === 'rejected' || !r.value.ok).length
        setSaveMessage({ type: 'error', text: `Falha ao salvar ${failedCount} disciplina(s)` })
      }
    } catch (error) {
      console.error('Erro ao salvar notas:', error)
      setSaveMessage({ type: 'error', text: 'Erro de conexão ao salvar notas' })
    } finally {
      setSavingGrades(false)
    }
  }

  return (
    <DashboardLayout
      navItems={adminNavItems}
      title="Gestão de Estudantes"
      subtitle="Adicionar, editar e gerir todos os estudantes do sistema"
    >
      {/* ── Filtros ─────────────────────────────────────────── */}
      <div style={{ 
        marginBottom: '20px', 
        display: 'flex', 
        gap: '12px', 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* Pesquisa */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Pesquisar por nome ou número..."
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

        {/* Filtro Curso */}
        <select
          value={filtroCurso}
          onChange={(e) => setFiltroCurso(e.target.value)}
          style={{
            padding: '10px 14px',
            background: '#13161e',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '8px',
            color: 'white',
            minWidth: '150px',
          }}
        >
          <option value="">Todos os Cursos</option>
          {cursos.map(curso => (
            <option key={curso.id_curso} value={curso.id_curso}>
              {curso.nome_curso}
            </option>
          ))}
        </select>

        {/* Filtro Ano */}
        <select
          value={filtroAno}
          onChange={(e) => setFiltroAno(e.target.value)}
          style={{
            padding: '10px 14px',
            background: '#13161e',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '8px',
            color: 'white',
            minWidth: '120px',
          }}
        >
          <option value="">Todos os Anos</option>
          <option value="1">1º Ano</option>
          <option value="2">2º Ano</option>
          <option value="3">3º Ano</option>
          <option value="4">4º Ano</option>
          <option value="5">5º Ano</option>
        </select>

        {/* Filtro Turno */}
        <select
          value={filtroTurno}
          onChange={(e) => setFiltroTurno(e.target.value)}
          style={{
            padding: '10px 14px',
            background: '#13161e',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '8px',
            color: 'white',
            minWidth: '120px',
          }}
        >
          <option value="">Todos os Turnos</option>
          {allTurnos.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Filtro Bolsa */}
        <select
          value={filtroBolsa}
          onChange={(e) => setFiltroBolsa(e.target.value)}
          style={{
            padding: '10px 14px',
            background: '#13161e',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '8px',
            color: 'white',
            minWidth: '150px',
          }}
        >
          <option value="">Todas as Bolsas</option>
          <option value="Nenhuma">Nenhuma</option>
          <option value="Cinquenta">50%</option>
          <option value="Cem">100%</option>
        </select>

        {/* Botão Adicionar */}
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
            fontWeight: '600',
          }}
        >
          ➕ Adicionar Novo Estudante
        </button>
      </div>

      {/* ── Tabela ──────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#d0d7e8' }}>
          A carregar estudantes...
        </div>
      ) : (
        <div style={{ background: '#1e2230', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Nome', 'Nº Estudante', 'Email', 'Curso', 'Ano', 'Turno', 'Estado', 'Bolsa', 'Ações'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '14px',
                      color: '#d0d7e8',
                      fontWeight: '500',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {estudantes.map((estudante) => (
                <tr
                  key={estudante.id_estudante}
                  style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setSelectedStudent(estudante)
                    setSelectedAno(estudante.ano_current)
                    setActiveTab('notas')
                  }}
                >
                  <td style={{ padding: '14px', color: '#e8eaf0' }}>
                    <span style={{ color: '#3b82f6' }}>
                      {estudante.nome_completo}
                    </span>
                  </td>
                  <td style={{ padding: '14px', color: '#d0d7e8' }}>{estudante.numero_estudante}</td>
                  <td style={{ padding: '14px', color: '#d0d7e8' }}>{estudante.usuario.email}</td>
                  <td style={{ padding: '14px', color: '#d0d7e8' }}>
                    {estudante.curso?.nome_curso ?? '—'}
                  </td>
                  <td style={{ padding: '14px', color: '#d0d7e8' }}>{estudante.ano_current}º Ano</td>
                  <td style={{ padding: '14px', color: '#d0d7e8' }}>{estudante.turno || '—'}</td>
                  <td style={{ padding: '14px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: estudante.estado === 'EmCurso' ? '#22c55e20' : '#e03d3d20',
                        color: estudante.estado === 'EmCurso' ? '#22c55e' : '#e03d3d',
                      }}
                    >
                      {estudante.estado}
                    </span>
                  </td>
                  <td style={{ padding: '14px' }}>
                    {estudante.tipo_bolsa && estudante.tipo_bolsa !== 'Nenhuma' && (
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: estudante.tipo_bolsa === 'Cem' ? '#f0a50020' : '#3b82f620',
                          color: estudante.tipo_bolsa === 'Cem' ? '#f0a500' : '#3b82f6',
                        }}
                      >
                        {estudante.tipo_bolsa === 'Cem' ? '100%' : '50%'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingStudent(estudante)
                        setEditFormData({
                          id_estudante: estudante.id_estudante,
                          nome_completo: estudante.nome_completo,
                          numero_telemovel: cleanPhoneForInput(estudante.numero_telemovel ?? null),
                          id_curso: estudante.id_curso || 1,
                          ano_current: estudante.ano_current || 1,
                          turno: estudante.turno || "Matinal",
                          tipo_bolsa: estudante.tipo_bolsa || "Nenhuma",
                          estado: estudante.estado,
                        })
                      }}
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

      {/* ── Modal: Adicionar Estudante ───────────────────────── */}
      {showModal && (
        <div style={modalBackdropStyle} onClick={() => setShowModal(false)}>
          <div style={modalBoxStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: '#e8eaf0' }}>Adicionar Novo Estudante</h3>

            <form onSubmit={handleSubmit}>
              {/* Nome */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Nome Completo</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              {/* Telefone */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Telefone (+244 9)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ color: '#d0d7e8', fontSize: '14px', whiteSpace: 'nowrap' }}>+244 9</span>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => {
                      const apenasNumeros = e.target.value.replace(/\D/g, '')
                      setFormData({ ...formData, telefone: apenasNumeros })
                    }}
                    placeholder="XXXXXXXX"
                    maxLength={8}
                    style={{ ...inputStyle, flex: 1, width: 'auto' }}
                    required
                  />
                </div>
              </div>

              {/* Info senha */}
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                }}
              >
                <p style={{ margin: 0, color: '#22c55e', fontSize: '13px', fontWeight: 500 }}>
                  ℹ️ Senha padrão: <strong>estudante12345</strong>
                </p>
                <p style={{ margin: '4px 0 0 0', color: '#d0d7e8', fontSize: '12px' }}>
                  O estudante poderá alterar depois no seu perfil
                </p>
              </div>

              {/* Curso + Ano + Turno */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Curso</label>
                  <select
                    value={formData.id_curso}
                    onChange={(e) => {
                      const cursoId = Number(e.target.value)
                      const curso = cursos.find(c => c.id_curso === cursoId)
                      const maxAnos = curso?.duracao_anos ?? 5
                      const newAno = formData.ano_actual > maxAnos ? 1 : formData.ano_actual
                      const turnos = getTurnosForCurso(cursoId)
                      const newTurno = turnos.includes(formData.turno) ? formData.turno : turnos[0] || "Matinal"
                      setFormData({ ...formData, id_curso: cursoId, ano_actual: newAno, turno: newTurno })
                    }}
                    style={inputStyle}
                  >
                    {cursos.length === 0 ? (
                      <option value="">A carregar cursos...</option>
                    ) : (
                      cursos.map(curso => (
                        <option key={curso.id_curso} value={curso.id_curso}>
                          {curso.nome_curso}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Ano Actual</label>
                  {(() => {
                    const cursoAtual = cursos.find(c => c.id_curso === formData.id_curso)
                    const maxAnos = cursoAtual?.duracao_anos ?? 5
                    return (
                      <select
                        value={formData.ano_actual}
                        onChange={(e) => setFormData({ ...formData, ano_actual: Number(e.target.value) })}
                        style={inputStyle}
                      >
                        {Array.from({ length: maxAnos }, (_, i) => i + 1).map(ano => (
                          <option key={ano} value={ano}>{ano}º Ano</option>
                        ))}
                      </select>
                    )
                  })()}
                </div>

                <div>
                  <label style={labelStyle}>Turno</label>
                  <select
                    value={formData.turno}
                    onChange={(e) => setFormData({ ...formData, turno: e.target.value })}
                    style={inputStyle}
                  >
                    {getTurnosForCurso(formData.id_curso).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tipo Bolsa */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Tipo de Bolsa</label>
                <select
                  value={formData.tipo_bolsa}
                  onChange={(e) => setFormData({ ...formData, tipo_bolsa: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Nenhuma">Nenhuma</option>
                  <option value="Cinquenta">Cinquenta (50%)</option>
                  <option value="Cem">Cem (100%)</option>
                </select>
              </div>

              {/* Acções */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '12px 20px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#d0d7e8',
                    cursor: 'pointer',
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
                    cursor: 'pointer',
                  }}
                >
                  Criar Estudante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Estudante ──────────────────────────── */}
      {editingStudent && (
        <div style={modalBackdropStyle} onClick={() => setEditingStudent(null)}>
          <div style={modalBoxStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: '#e8eaf0' }}>Editar Estudante</h3>

            <form onSubmit={handleEditSubmit}>
              {/* Nome */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Nome Completo</label>
                <input
                  type="text"
                  value={editFormData.nome_completo}
                  onChange={(e) => setEditFormData({ ...editFormData, nome_completo: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              {/* Telefone */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Telefone (+244 9)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ color: '#d0d7e8', fontSize: '14px', whiteSpace: 'nowrap' }}>+244 9</span>
                  <input
                    type="text"
                    value={editFormData.numero_telemovel}
                    onChange={(e) => {
                      const apenasNumeros = e.target.value.replace(/\D/g, '')
                      setEditFormData({ ...editFormData, numero_telemovel: apenasNumeros })
                    }}
                    placeholder="XXXXXXXX"
                    maxLength={8}
                    style={{ ...inputStyle, flex: 1, width: 'auto' }}
                  />
                </div>
              </div>

              {/* Curso + Ano + Turno */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Curso</label>
                  <select
                    value={editFormData.id_curso}
                    onChange={(e) => {
                      const cursoId = Number(e.target.value)
                      const curso = cursos.find(c => c.id_curso === cursoId)
                      const maxAnos = curso?.duracao_anos ?? 5
                      const newAno = editFormData.ano_current > maxAnos ? 1 : editFormData.ano_current
                      const turnos = getTurnosForCurso(cursoId)
                      const newTurno = turnos.includes(editFormData.turno) ? editFormData.turno : turnos[0] || "Matinal"
                      setEditFormData({ ...editFormData, id_curso: cursoId, ano_current: newAno, turno: newTurno })
                    }}
                    style={inputStyle}
                  >
                    {cursos.map(curso => (
                      <option key={curso.id_curso} value={curso.id_curso}>
                        {curso.nome_curso}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Ano Actual</label>
                  {(() => {
                    const cursoAtual = cursos.find(c => c.id_curso === editFormData.id_curso)
                    const maxAnos = cursoAtual?.duracao_anos ?? 5
                    return (
                      <select
                        value={editFormData.ano_current}
                        onChange={(e) => setEditFormData({ ...editFormData, ano_current: Number(e.target.value) })}
                        style={inputStyle}
                      >
                        {Array.from({ length: maxAnos }, (_, i) => i + 1).map(ano => (
                          <option key={ano} value={ano}>{ano}º Ano</option>
                        ))}
                      </select>
                    )
                  })()}
                </div>

                <div>
                  <label style={labelStyle}>Turno</label>
                  <select
                    value={editFormData.turno}
                    onChange={(e) => setEditFormData({ ...editFormData, turno: e.target.value })}
                    style={inputStyle}
                  >
                    {getTurnosForCurso(editFormData.id_curso).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tipo Bolsa + Estado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>Tipo de Bolsa</label>
                  <select
                    value={editFormData.tipo_bolsa}
                    onChange={(e) => setEditFormData({ ...editFormData, tipo_bolsa: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="Nenhuma">Nenhuma</option>
                    <option value="Cinquenta">Cinquenta (50%)</option>
                    <option value="Cem">Cem (100%)</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Estado</label>
                  <select
                    value={editFormData.estado}
                    onChange={(e) => setEditFormData({ ...editFormData, estado: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="EmCurso">Em Curso</option>
                    <option value="Suspenso">Suspenso</option>
                    <option value="Concluido">Concluído</option>
                    <option value="Desistente">Desistente</option>
                  </select>
                </div>
              </div>

              {/* Acções */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  style={{
                    padding: '12px 20px',
                    background: 'transparent',
                    border: '1px solid #e03d3d',
                    borderRadius: '8px',
                    color: '#e03d3d',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  🔑 Reset Password
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    style={{
                      padding: '12px 20px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#d0d7e8',
                      cursor: 'pointer',
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
                      cursor: 'pointer',
                    }}
                  >
                    Guardar Alterações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Detalhes do Estudante ─────────────────────── */}
      {selectedStudent && (
        <div style={{...modalBackdropStyle, zIndex: 2000}} onClick={() => setSelectedStudent(null)}>
          <div 
            style={{
              ...modalBoxStyle,
              width: '1200px',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 8px 0', color: '#e8eaf0', fontSize: '20px' }}>
                  {selectedStudent.nome_completo}
                </h3>
                <p style={{ margin: 0, color: '#d0d7e8', fontSize: '14px' }}>
                  Nº {selectedStudent.numero_estudante} • {selectedStudent.curso?.nome_curso} • {selectedStudent.ano_current}º Ano
                </p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#d0d7e8',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0 8px'
                }}
              >
                ×
              </button>
            </div>

            {/* Abas */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                onClick={() => setActiveTab('notas')}
                style={{
                  padding: '12px 24px',
                  background: activeTab === 'notas' ? '#e03d3d' : 'transparent',
                  border: 'none',
                  borderRadius: '8px 8px 0 0',
                  color: activeTab === 'notas' ? 'white' : '#d0d7e8',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                📝 Notas
              </button>
              <button
                onClick={() => { setActiveTab('pagamentos'); fetchPagamentos() }}
                style={{
                  padding: '12px 24px',
                  background: activeTab === 'pagamentos' ? '#e03d3d' : 'transparent',
                  border: 'none',
                  borderRadius: '8px 8px 0 0',
                  color: activeTab === 'pagamentos' ? 'white' : '#d0d7e8',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                💰 Pagamentos
              </button>
            </div>

            {/* Conteúdo das Abas */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {activeTab === 'notas' && (
                <div>
                  {/* Selector de Ano Curricular */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ ...labelStyle, marginBottom: '8px' }}>Ano do Curso</label>
                    <select
                      value={selectedAno}
                      onChange={(e) => setSelectedAno(Number(e.target.value))}
                      style={{ ...inputStyle, width: '200px' }}
                    >
                      {(() => {
                        // Determinar a duração máxima do curso com base no curso do estudante selecionado
                        const cursoAtual = cursos.find(c => c.id_curso === selectedStudent?.id_curso)
                        const maxAnos = cursoAtual?.duracao_anos ?? 5
                        return Array.from({ length: maxAnos }, (_, i) => i + 1).map(ano => (
                          <option key={ano} value={ano}>{ano}º Ano</option>
                        ))
                      })()}
                    </select>
                  </div>

                  {loadingDetails ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#d0d7e8' }}>A carregar...</div>
                  ) : notas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#d0d7e8' }}>
                      Sem notas registradas para este ano
                    </div>
                  ) : (
                    <div>
                    <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)' }}>
                          <th style={{ textAlign: 'left', padding: '10px 12px', color: '#d0d7e8', fontSize: '13px', fontWeight: '600' }}>Disciplina</th>
                          <th style={{ textAlign: 'center', padding: '10px 6px', color: '#d0d7e8', fontSize: '13px', fontWeight: '600' }}>AC1</th>
                          <th style={{ textAlign: 'center', padding: '10px 6px', color: '#d0d7e8', fontSize: '13px', fontWeight: '600' }}>AC2</th>
                          <th style={{ textAlign: 'center', padding: '10px 6px', color: '#d0d7e8', fontSize: '13px', fontWeight: '600' }}>AC3</th>
                          <th style={{ textAlign: 'center', padding: '10px 6px', color: '#d0d7e8', fontSize: '13px', fontWeight: '600' }}>TTP</th>
                          <th style={{ textAlign: 'center', padding: '10px 6px', color: '#d0d7e8', fontSize: '13px', fontWeight: '600' }}>PP1</th>
                          <th style={{ textAlign: 'center', padding: '10px 6px', color: '#d0d7e8', fontSize: '13px', fontWeight: '600' }}>PP2</th>
                          <th style={{ textAlign: 'center', padding: '10px 6px', color: '#d0d7e8', fontSize: '13px', fontWeight: '600' }}>Exame</th>
                          <th style={{ textAlign: 'center', padding: '10px 6px', color: '#d0d7e8', fontSize: '13px', fontWeight: '600' }}>Rec.</th>
                          <th style={{ textAlign: 'center', padding: '10px 6px', color: '#d0d7e8', fontSize: '13px', fontWeight: '600' }}>Esp.</th>
                        </tr>
                      </thead>
                      <tbody>
                    {notas.map((nota) => (
                      <tr key={nota.id_nota} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px', color: '#e8eaf0' }}>
                          {nota.disciplina?.nome_disciplina}
                          <div style={{ fontSize: '11px', color: '#d0d7e8' }}>{nota.disciplina?.codigo_disciplina}</div>
                        </td>
        {(['ac1', 'ac2', 'ac3', 'ttp', 'pp1', 'pp2', 'exame', 'recurso', 'exame_especial'] as const).map((campo) => {
                          const valor = localGrades[nota.id_nota]?.[campo] ?? null
                          const displayValue = valor !== null ? String(arredondarNota(valor)) : '—'
                          
                          return (
                            <td key={campo} style={{ padding: '8px', textAlign: 'center' }}>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.01"
                                value={displayValue}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setLocalGrades(prev => ({
                                    ...prev,
                                    [nota.id_nota]: {
                                      ...prev[nota.id_nota],
                                      [campo]: val === '' ? null : Number(val)
                                    }
                                  }))
                                }}
                                disabled={savingGrades}
                                style={{
                                  width: '50px',
                                  padding: '6px',
                                  background: '#13161e',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '4px',
                                  color: 'white',
                                  textAlign: 'center',
                                  fontSize: '13px',
                                  opacity: savingGrades ? 0.5 : 1,
                                  cursor: savingGrades ? 'not-allowed' : 'pointer'
                                }}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                      </tbody>
                    </table>
                    </div>
                    
                    {/* Save Button Section */}
                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {saveMessage && (
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          background: saveMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(224, 61, 61, 0.1)',
                          border: `1px solid ${saveMessage.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(224, 61, 61, 0.3)'}`,
                          color: saveMessage.type === 'success' ? '#22c55e' : '#e03d3d',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          {saveMessage.type === 'success' ? '✓' : '✗'} {saveMessage.text}
                        </div>
                      )}
                      
                      <button
                        onClick={handleSaveGrades}
                        disabled={savingGrades || !hasChanges}
                        style={{
                          padding: '12px 24px',
                          background: savingGrades ? '#b0b8cf' : hasChanges ? '#22c55e' : '#3a3f4d',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white',
                          fontWeight: '600',
                          cursor: savingGrades ? 'not-allowed' : (hasChanges ? 'pointer' : 'not-allowed'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          opacity: savingGrades ? 0.7 : 1
                        }}
                      >
                        {savingGrades ? (
                          <>
                            <span className="spinner" style={{
                              width: '16px',
                              height: '16px',
                              border: '2px solid rgba(255,255,255,0.3)',
                              borderTop: '2px solid white',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }}></span>
                            A guardar...
                          </>
                        ) : (
                          <>💾 Guardar Notas</>
                        )}
                      </button>
                    </div>
                    </div>
                  )}
                </div>
              )}
              

              {activeTab === 'pagamentos' && (
                <div>
                  {/* Filtros */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <input
                      type="text"
                      placeholder="Pesquisar pagamentos..."
                      value={searchPagamentos}
                      onChange={(e) => setSearchPagamentos(e.target.value)}
                      style={{
                        ...inputStyle,
                        flex: 1,
                      }}
                    />
                    <select
                      value={filtroTipoPagamento}
                      onChange={(e) => setFiltroTipoPagamento(e.target.value as "todos" | "propina" | "servico")}
                      style={{
                        padding: '10px 14px',
                        background: '#1e2230',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="todos">Todos</option>
                      <option value="propina">Propinas</option>
                      <option value="servico">Outros Serviços</option>
                    </select>
                  </div>

                  {loadingDetails ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#d0d7e8' }}>A carregar...</div>
                  ) : pagamentos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#d0d7e8' }}>
                      Sem pagamentos registrados
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {pagamentos
                        .filter(p => {
                          if (filtroTipoPagamento !== 'todos' && p.tipo !== filtroTipoPagamento) return false
                          if (searchPagamentos && 
                              !p.referencia?.toLowerCase().includes(searchPagamentos.toLowerCase()) &&
                              !p.descricao?.toLowerCase().includes(searchPagamentos.toLowerCase())) return false
                          return true
                        })
                        .map((pagamento) => (
                        <div
                          key={`${pagamento.tipo}-${pagamento.id}`}
                          style={{
                            background: '#13161e',
                            padding: '16px',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ 
                                padding: '2px 8px', 
                                borderRadius: '4px', 
                                fontSize: '11px',
                                background: pagamento.tipo === 'propina' ? '#3b82f6' : '#8b5cf6',
                                color: 'white'
                              }}>
                                {pagamento.tipo === 'propina' ? 'Propina' : 'Serviço'}
                              </span>
                              <div style={{ color: '#e8eaf0', fontWeight: '500' }}>
                                {pagamento.descricao}
                              </div>
                            </div>
                            <div style={{ color: '#d0d7e8', fontSize: '13px' }}>
                              Ref: {pagamento.referencia || '—'} • {pagamento.data ? new Date(pagamento.data).toLocaleDateString('pt-AO') : '—'}
                            </div>
                            <div style={{ color: '#d0d7e8', fontSize: '13px' }}>
                              Valor: {Number(pagamento.valor_total).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                              {Number(pagamento.valor_base) !== Number(pagamento.valor_total) && (
                                <span style={{ marginLeft: '8px', color: '#22c55e', fontSize: '11px' }}>
                                  (Desconto bolsa)
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <select
                              value={pagamento.estado}
                              onChange={(e) => handleUpdatePagamento(pagamento.id, e.target.value)}
                              disabled={pagamento.tipo === 'servico'}
                              style={{
                                padding: '8px 12px',
                                background: '#1e2230',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '6px',
                                color: pagamento.estado === 'Pago' ? '#22c55e' : pagamento.estado === 'Pendente' ? '#f0a500' : '#e03d3d',
                                fontWeight: '600',
                                cursor: pagamento.tipo === 'servico' ? 'not-allowed' : 'pointer',
                                opacity: pagamento.tipo === 'servico' ? 0.5 : 1,
                              }}
                            >
                              <option value="Pendente">Pendente</option>
                              <option value="Pago">Pago</option>
                              <option value="Atrasado">Atrasado</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}