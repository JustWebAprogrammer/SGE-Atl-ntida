'use client'

import React, { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/app/components/DashboardLayout'
import { adminNavItems } from '@/app/admin/adminNav'

// ── Interfaces ──────────────────────────────────────────────────────────────

interface ContextoPagamento {
  mes: number | null
  mes_nome: string | null
  ano: number | null
  referencia: string | null
  valor_base: number | null
  valor_multa: number | null
  valor_total: number | null
  forma_pagamento: string | null
}

interface ContextoFactura {
  numero_factura: string | null
  descricao_servico: string | null
  valor_total: number | null
  periodo: string | null
  ano_lectivo: string | null
}

interface ContextoCobranca {
  descricao: string | null
  valor: number | null
}

interface ContextoHorario {
  disciplina: string | null
  curso: string | null
  dia_semana: string | null
  hora_inicio: string | null
  hora_fim: string | null
  turno: string | null
  sala: string | null
}

interface ContextoProva {
  disciplina: string | null
  curso: string | null
  tipo_prova: string | null
  data_prova: string | null
  turno: string | null
  hora_inicio: string | null
  hora_fim: string | null
}

interface ContextoPeriodo {
  curso: string | null
  ano_curricular: number | null
  semestre: string | null
  data_inicio: string | null
  data_fim: string | null
}

interface ContextoProfessor {
  nome_professor: string | null
  disciplina: string | null
}

interface AuditLog {
  id_audit: number
  id_usuario: number
  nome_usuario: string
  email_usuario: string
  acao: string
  tabela: string
  id_registro: number
  valor_antes: string | null
  valor_depois: string | null
  ip_address: string
  data_hora: string
  contexto_estudante?: {
    nome: string
    numero_estudante?: string
    ano_curricular?: number
    curso: string
    disciplina?: string
  }
  contexto_pagamento?: ContextoPagamento
  contexto_factura?: ContextoFactura
  contexto_cobranca?: ContextoCobranca
  contexto_horario?: ContextoHorario
  contexto_prova?: ContextoProva
  contexto_periodo?: ContextoPeriodo
  contexto_professor?: ContextoProfessor
}

interface AuditResponse {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
  tabelas: string[]
  roles: string[]
  usuarios: { id_usuario: number; nome_usuario: string; email: string; tipo_usuario: string }[]
}

interface DiffEntry {
  campo: string
  antes: string
  depois: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

const CAMPOS_IGNORADOS = [
  'data_hora', 'data_cadastro', 'atualizado_em', 'created_at', 'updated_at',
  'data_vencimento', 'data_pagamento', 'data_emissao',
]

const CAMPOS_TECNICOS = [
  'id_nota', 'id_estudante', 'id_disciplina', 'id_pagamento', 'id_factura',
  'id_nota_cobranca', 'id_usuario', 'id_curso', 'id_registro',
  'referencia', 'codigo_confirmacao', 'numero_factura',
  'ano_lectivo', 'semestre', 'tipo_avaliacao', 'mes', 'ano',
  'codigo_disciplina',
]

const TODOS_IGNORADOS = new Set([...CAMPOS_IGNORADOS, ...CAMPOS_TECNICOS])

const LABELS_CAMPOS: Record<string, string> = {
  estado: 'Estado',
  nome_completo: 'Nome',
  nome_curso: 'Curso',
  nome_usuario: 'Utilizador',
  email: 'Email',
  ano_current: 'Ano',
  tipo_bolsa: 'Bolsa',
  valor_base: 'Valor Base',
  valor_multa: 'Multa',
  valor_total: 'Total',
  valor_propina: 'Valor Propina',
  pagamento: 'Estado Pagamento',
  ac1: 'AC1', ac2: 'AC2', ac3: 'AC3',
  pp1: 'PP1', pp2: 'PP2',
  exame: 'Exame',
  recurso: 'Recurso',
  nota_final: 'Nota Final',
  ttp: 'TTP',
  exame_especial: 'Exame Especial',
  dispensada: 'Dispensada',
  nome_servico: 'Serviço',
  descricao: 'Descrição',
  valor: 'Valor',
  activo: 'Ativo',
  // Disciplina / Curso / Professor
  nome_disciplina: 'Disciplina',
  nome_professor: 'Professor',
  // Horário / Provas / Professor
  dia_semana: 'Dia da Semana',
  hora_inicio: 'Hora Início',
  hora_fim: 'Hora Fim',
  sala: 'Sala',
  tipo_prova: 'Tipo de Prova',
  data_prova: 'Data da Prova',
  data_inicio: 'Data Início',
  data_fim: 'Data Fim',
  duracao_anos: 'Duração (anos)',
  Propina_ano1: 'Propina Ano 1',
  Propina_ano2: 'Propina Ano 2',
  Propina_ano3: 'Propina Ano 3',
  Propina_ano4: 'Propina Ano 4',
  Propina_ano5: 'Propina Ano 5',
  Propina_ano6: 'Propina Ano 6',
  valor_multa_atraso: 'Multa por Atraso',
  forma_pagamento: 'Forma de Pagamento',
  descricao_servico: 'Serviço',
  periodo: 'Período',
  metodo_pagamento: 'Método Pagamento',
}

import DatePickerPT from '@/app/components/DatePickerPT'

function isCreateAction(acao: string): boolean {
  const a = acao.toUpperCase()
  return a.includes('CRIAR') || a.includes('CREATE') || a.includes('INSERT') || a.includes('REGIST')
}

function getDiff(antes: string | null, depois: string | null): DiffEntry[] {
  try {
    // ── CREATE: valor_antes is null ──────────────────────────────────────────
    if (!antes) {
      const obj: Record<string, unknown> = depois ? JSON.parse(depois) : {}
      return Object.entries(obj)
        .filter(([k, v]) => !TODOS_IGNORADOS.has(k) && v !== null && v !== undefined)
        .map(([k, v]) => ({
          campo: LABELS_CAMPOS[k] ?? k,
          antes: '—',
          depois: formatValor(v),
        }))
    }

    // ── UPDATE / DELETE: standard field-by-field diff ────────────────────────
    const objAntes = JSON.parse(antes)
    const objDepois: Record<string, unknown> = depois ? JSON.parse(depois) : {}
    const todasChaves = new Set([...Object.keys(objAntes), ...Object.keys(objDepois)])
    const alteracoes: DiffEntry[] = []

    for (const chave of todasChaves) {
      if (TODOS_IGNORADOS.has(chave)) continue
      const valAntes = JSON.stringify(objAntes[chave] ?? null)
      const valDepois = JSON.stringify(objDepois[chave] ?? null)
      if (valAntes !== valDepois) {
        alteracoes.push({
          campo: LABELS_CAMPOS[chave] ?? chave,
          antes: formatValor(objAntes[chave]),
          depois: formatValor(objDepois[chave]),
        })
      }
    }
    return alteracoes
  } catch {
    return []
  }
}

const TABELAS_ESTUDANTE_DIRETO = ['Estudante']

function parseValor(val: string | null): Record<string, unknown> | null {
  try { return val ? JSON.parse(val) : null } catch { return null }
}

interface ContextoEstudante {
  tipo: 'estudante'
  nome: string
  numero?: string
  ano: string
  curso: string
  disciplina?: string
}
interface ContextoOutro { tipo: 'outro'; nome: string; tipoUtilizador: string }
type ContextoRegistro = ContextoEstudante | ContextoOutro

function getContextoRegistro(log: AuditLog): ContextoRegistro {
  if (log.contexto_estudante) {
    const ctx = log.contexto_estudante
    return {
      tipo: 'estudante',
      nome: ctx.nome,
      numero: ctx.numero_estudante,
      ano: ctx.ano_curricular ? `${ctx.ano_curricular}º Ano` : '—',
      curso: ctx.curso,
      disciplina: ctx.disciplina,
    }
  }

  const obj = parseValor(log.valor_antes) ?? parseValor(log.valor_depois) ?? {}

  if (TABELAS_ESTUDANTE_DIRETO.some(t => log.tabela === t)) {
    return {
      tipo: 'estudante',
      nome: (obj.nome_completo as string) ?? log.nome_usuario,
      ano: obj.ano_current ? `${obj.ano_current}º Ano` : '—',
      curso: '—',
      numero: (obj.numero_estudante as string) ?? undefined,
    }
  }

  return {
    tipo: 'outro',
    nome: log.nome_usuario,
    tipoUtilizador: (obj.tipo_usuario as string) ?? (obj.tipo as string) ?? '—',
  }
}

function formatValor(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'boolean') return val ? 'Sim' : 'Não'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function formatAOA(valor: number | null): string {
  if (valor === null) return '—'
  return valor.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 2 })
}

function getAcaoConfig(acao: string): { cor: string; fundo: string; icone: string; label: string } {
  const a = acao.toUpperCase()
  if (a.includes('CRIAR') || a.includes('CREATE') || a.includes('INSERT') || a.includes('REGIST')) {
    return { cor: '#16a34a', fundo: '#dcfce7', icone: '+', label: 'Criação' }
  }
  if (a.includes('ELIM') || a.includes('DELET') || a.includes('REMOV')) {
    return { cor: '#dc2626', fundo: '#fee2e2', icone: '×', label: 'Eliminação' }
  }
  if (a.includes('LOGIN') || a.includes('ACESSO')) {
    return { cor: '#7c3aed', fundo: '#ede9fe', icone: '→', label: 'Acesso' }
  }
  return { cor: '#d97706', fundo: '#fef3c7', icone: '✎', label: 'Alteração' }
}

function getIniciais(nome: string): string {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const hoje = new Date()
  const ontem = new Date(hoje)
  ontem.setDate(ontem.getDate() - 1)

  const hora = date.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })

  if (date.toDateString() === hoje.toDateString()) return `Hoje, ${hora}`
  if (date.toDateString() === ontem.toDateString()) return `Ontem, ${hora}`
  return date.toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + hora
}

function getSumario(acao: string, tabela: string, diff: DiffEntry[], valorAntes: string | null): string {
  // ── FIX: use valor_antes presence only — not acao string ──────────────────
  // isCreateAction() can misclassify updates whose acao contains "REGIST",
  // causing the "antes" side to be swallowed. The snapshot presence is the
  // only reliable signal.
  const isCriacao = !valorAntes
  if (diff.length === 0) return `Operação em ${tabela}`
  if (isCriacao && diff.length === 1) return `Registou "${diff[0].campo}": ${diff[0].depois}`
  if (isCriacao) return `Registou ${diff.length} campos em ${tabela}`
  if (diff.length === 1) return `Alterou "${diff[0].campo}": ${diff[0].antes} → ${diff[0].depois}`
  return `Alterou ${diff.length} campos em ${tabela}`
}

// ── Estilos inline ─────────────────────────────────────────────────────────

const s = {
  page: { padding: '0' } as React.CSSProperties,

  filtrosContainer: {
    background: '#1e2230',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid rgba(255,255,255,0.07)',
  } as React.CSSProperties,

  filtrosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  } as React.CSSProperties,

  label: {
    display: 'block',
    marginBottom: '5px',
    color: '#9098b0',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },

  select: {
    width: '100%',
    padding: '10px 12px',
    background: '#13161e',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '10px 12px',
    background: '#13161e',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  filtrosRodape: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,

  btnLimpar: {
    padding: '8px 16px',
    background: 'rgba(224, 61, 61, 0.15)',
    border: '1px solid rgba(224, 61, 61, 0.3)',
    borderRadius: '8px',
    color: '#e03d3d',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  } as React.CSSProperties,

  timeline: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },

  logCard: (expandido: boolean): React.CSSProperties => ({
    background: '#1e2230',
    borderRadius: '12px',
    border: `1px solid ${expandido ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)'}`,
    overflow: 'hidden',
    transition: 'border-color 0.2s',
  }),

  logHeader: {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    userSelect: 'none' as const,
  } as React.CSSProperties,

  avatar: (): React.CSSProperties => ({
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#312e81',
    color: '#a5b4fc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    flexShrink: 0,
  }),

  logInfo: {
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,

  logTopo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '3px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,

  nomeusuario: {
    color: '#e8eaf0',
    fontSize: '14px',
    fontWeight: '500',
  } as React.CSSProperties,

  acaoBadge: (config: ReturnType<typeof getAcaoConfig>): React.CSSProperties => ({
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    background: config.fundo,
    color: config.cor,
    border: `1px solid ${config.cor}40`,
    letterSpacing: '0.3px',
  }),

  tabelaBadge: {
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    background: 'rgba(255,255,255,0.06)',
    color: '#9098b0',
    border: '1px solid rgba(255,255,255,0.08)',
  } as React.CSSProperties,

  sumario: {
    color: '#9098b0',
    fontSize: '13px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  logMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '4px',
    flexShrink: 0,
  } as React.CSSProperties,

  hora: {
    color: '#9098b0',
    fontSize: '12px',
  } as React.CSSProperties,

  ip: {
    color: '#555e78',
    fontSize: '11px',
    fontFamily: 'monospace',
  } as React.CSSProperties,

  chevron: (expandido: boolean): React.CSSProperties => ({
    color: '#555e78',
    fontSize: '12px',
    transition: 'transform 0.2s',
    transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)',
    flexShrink: 0,
  }),

  expandido: {
    borderTop: '1px solid rgba(255,255,255,0.05)',
    padding: '16px',
    background: '#13161e',
  } as React.CSSProperties,

  diffGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  } as React.CSSProperties,

  diffLinha: {
    display: 'grid',
    gridTemplateColumns: '140px 1fr auto 1fr',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.04)',
  } as React.CSSProperties,

  diffCampo: {
    color: '#9098b0',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
  } as React.CSSProperties,

  diffAntes: {
    color: '#e8eaf0',
    fontSize: '13px',
    background: 'rgba(224,61,61,0.1)',
    padding: '3px 8px',
    borderRadius: '5px',
    opacity: 0.7,
    wordBreak: 'break-word' as const,
  } as React.CSSProperties,

  diffSeta: {
    color: '#555e78',
    fontSize: '14px',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  diffDepois: {
    color: '#4ade80',
    fontSize: '13px',
    background: 'rgba(74,222,128,0.1)',
    padding: '3px 8px',
    borderRadius: '5px',
    fontWeight: '500',
    wordBreak: 'break-word' as const,
  } as React.CSSProperties,

  diffNovo: {
    color: '#38bdf8',
    fontSize: '13px',
    background: 'rgba(56,189,248,0.1)',
    padding: '3px 8px',
    borderRadius: '5px',
    fontWeight: '500',
    wordBreak: 'break-word' as const,
    gridColumn: '2 / 5',
  } as React.CSSProperties,

  contextoCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    background: 'rgba(99,102,241,0.07)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: '10px',
    padding: '12px 14px',
    marginBottom: '10px',
  } as React.CSSProperties,

  pagamentoCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    background: 'rgba(217,119,6,0.07)',
    border: '1px solid rgba(217,119,6,0.25)',
    borderRadius: '10px',
    padding: '12px 14px',
    marginBottom: '10px',
  } as React.CSSProperties,

  facturaCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    background: 'rgba(14,165,233,0.07)',
    border: '1px solid rgba(14,165,233,0.25)',
    borderRadius: '10px',
    padding: '12px 14px',
    marginBottom: '10px',
  } as React.CSSProperties,

  contextoIcone: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    background: 'rgba(99,102,241,0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    flexShrink: 0,
  } as React.CSSProperties,

  pagamentoIcone: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    background: 'rgba(217,119,6,0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    flexShrink: 0,
  } as React.CSSProperties,

  facturaIcone: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    background: 'rgba(14,165,233,0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    flexShrink: 0,
  } as React.CSSProperties,

  contextoNome: {
    color: '#e8eaf0',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '6px',
  } as React.CSSProperties,

  contextoPills: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,

  contextoPill: (cor: string): React.CSSProperties => ({
    fontSize: '11px',
    fontWeight: '500',
    padding: '2px 9px',
    borderRadius: '20px',
    background: `${cor}18`,
    color: cor,
    border: `1px solid ${cor}35`,
  }),

  semAlteracoes: {
    color: '#555e78',
    fontSize: '13px',
    fontStyle: 'italic',
    textAlign: 'center' as const,
    padding: '8px',
  } as React.CSSProperties,

  diffLabel: {
    fontSize: '11px',
    color: '#555e78',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '8px',
    marginTop: '4px',
  } as React.CSSProperties,

  paginacao: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    marginTop: '20px',
  } as React.CSSProperties,

  btnPagina: (ativo: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    background: '#1e2230',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '8px',
    color: 'white',
    cursor: ativo ? 'pointer' : 'not-allowed',
    opacity: ativo ? 1 : 0.4,
    fontSize: '13px',
  }),

  paginaInfo: {
    color: '#9098b0',
    fontSize: '13px',
    padding: '0 8px',
  } as React.CSSProperties,

  vazio: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#555e78',
    fontSize: '14px',
    background: '#1e2230',
    borderRadius: '12px',
  } as React.CSSProperties,

  statCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  } as React.CSSProperties,

  statCard: {
    background: '#1e2230',
    borderRadius: '10px',
    padding: '14px 16px',
    border: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  statNum: {
    color: '#e8eaf0',
    fontSize: '22px',
    fontWeight: '600',
    display: 'block',
  } as React.CSSProperties,

  statLabel: {
    color: '#9098b0',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginTop: '2px',
    display: 'block',
  } as React.CSSProperties,
}

// ── Page component ──────────────────────────────────────────────────────────

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [tabelas, setTabelas] = useState<string[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [usuarios, setUsuarios] = useState<{ id_usuario: number; nome_usuario: string; email: string; tipo_usuario: string }[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [filtroRole, setFiltroRole] = useState('')
  const [filtroCurso, setFiltroCurso] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [filtroTabela, setFiltroTabela] = useState('')
  const [filtroAcao, setFiltroAcao] = useState('')
  const [filtroSearch, setFiltroSearch] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [expandedLog, setExpandedLog] = useState<number | null>(null)

  // Data for dropdowns
  const [cursos, setCursos] = useState<{ id_curso: number; nome_curso: string }[]>([])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      if (filtroRole) params.append('role', filtroRole)
      if (filtroUsuario) params.append('id_usuario', filtroUsuario)
      if (filtroTabela) params.append('tabela', filtroTabela)
      if (filtroAcao) params.append('acao', filtroAcao)
      if (filtroSearch) params.append('search', filtroSearch)
      if (filtroDataInicio) params.append('data_inicio', filtroDataInicio)
      if (filtroDataFim) params.append('data_fim', filtroDataFim)
      // Send id_curso for both estudante and orientador roles
      if ((filtroRole === 'estudante' || filtroRole === 'orientador') && filtroCurso) {
        params.append('id_curso', filtroCurso)
      }

      const res = await fetch(`/api/audit?${params}`)
      const data = await res.json()
      setLogs(data.logs)
      setTabelas(data.tabelas)
      setRoles(data.roles || [])
      setUsuarios(data.usuarios || [])
      setTotal(data.total)
      setTotalPages(data.totalPages)
      // Store cursos for dropdown filters
      setCursos(data.cursos || [])
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
    } finally {
      setLoading(false)
    }
  }, [page, filtroRole, filtroCurso, filtroUsuario, filtroTabela, filtroAcao, filtroSearch, filtroDataInicio, filtroDataFim])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const resetFilters = () => {
    setFiltroRole(''); setFiltroCurso('')
    setFiltroUsuario(''); setFiltroTabela('')
    setFiltroAcao(''); setFiltroSearch('')
    setFiltroDataInicio(''); setFiltroDataFim(''); setPage(1)
  }

  // Handle role change - cascade: reset user selection
  const handleRoleChange = (role: string) => {
    setFiltroRole(role)
    setFiltroUsuario('') // Reset user when role changes
    setPage(1)
  }

  // Filter users by selected role
  const filteredUsuarios = filtroRole
    ? usuarios.filter(u => u.tipo_usuario === filtroRole)
    : usuarios

  const contagens = logs.reduce((acc, log) => {
    const tipo = getAcaoConfig(log.acao).label
    acc[tipo] = (acc[tipo] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <DashboardLayout navItems={adminNavItems} title="Registro de auditoria" subtitle="Registo de todas as alterações no sistema">

      {/* ── Stat cards ── */}
      <div style={s.statCards}>
        <div style={s.statCard}>
          <span style={s.statNum}>{total}</span>
          <span style={s.statLabel}>Total registos</span>
        </div>
        <div style={{ ...s.statCard, borderColor: 'rgba(74,222,128,0.15)' }}>
          <span style={{ ...s.statNum, color: '#4ade80' }}>{contagens['Criação'] ?? 0}</span>
          <span style={s.statLabel}>Criações</span>
        </div>
        <div style={{ ...s.statCard, borderColor: 'rgba(251,191,36,0.15)' }}>
          <span style={{ ...s.statNum, color: '#fbbf24' }}>{contagens['Alteração'] ?? 0}</span>
          <span style={s.statLabel}>Alterações</span>
        </div>
        <div style={{ ...s.statCard, borderColor: 'rgba(248,113,113,0.15)' }}>
          <span style={{ ...s.statNum, color: '#f87171' }}>{contagens['Eliminação'] ?? 0}</span>
          <span style={s.statLabel}>Eliminações</span>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div style={s.filtrosContainer}>
        <div style={s.filtrosGrid}>
          {/* Cargo dropdown - cascade filter */}
          <div>
            <label style={s.label}>Cargo</label>
            <select value={filtroRole}
              onChange={(e) => { handleRoleChange(e.target.value) }}
              style={s.select}>
              <option value="">Todos</option>
              {roles.map(r => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>
          {/* User dropdown - filtered by selected role */}
          <div>
            <label style={s.label}>Utilizador {filtroRole && <span style={{ color: '#6366f1' }}>({filteredUsuarios.length})</span>}</label>
            <select value={filtroUsuario}
              onChange={(e) => { setFiltroUsuario(e.target.value); setPage(1) }}
              style={s.select}>
              <option value="">Todos</option>
              {filteredUsuarios.map(u => (
                <option key={u.id_usuario} value={u.id_usuario}>{u.nome_usuario}</option>
              ))}
            </select>
          </div>
          {/* Table dropdown */}
          <div>
            <label style={s.label}>Tabela</label>
            <select value={filtroTabela}
              onChange={(e) => { setFiltroTabela(e.target.value); setPage(1) }}
              style={s.select}>
              <option value="">Todas</option>
              {tabelas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {/* Action type dropdown */}
          <div>
            <label style={s.label}>Acção</label>
            <select value={filtroAcao}
              onChange={(e) => { setFiltroAcao(e.target.value); setPage(1) }}
              style={s.select}>
              <option value="">Todas</option>
              <option value="CRIAR">Criação</option>
              <option value="ALTERAR">Alteração</option>
              <option value="ELIMINAR">Eliminação</option>
              <option value="LOGIN">Acesso</option>
            </select>
          </div>
          {/* Text search */}
          <div>
            <label style={s.label}>Pesquisar</label>
            <input type="text"
              value={filtroSearch}
              placeholder="Ação, tabela ou utilizador..."
              onChange={(e) => { setFiltroSearch(e.target.value); setPage(1) }}
              style={s.input}
            />
          </div>
          {/* Curso dropdown - shown when role=estudante or orientador */}
          {(filtroRole === 'estudante' || filtroRole === 'orientador') && (
            <div>
              <label style={s.label}>Curso</label>
              <select value={filtroCurso}
                onChange={(e) => { setFiltroCurso(e.target.value); setFiltroUsuario(''); setPage(1) }}
                style={s.select}>
                <option value="">Todos os cursos</option>
                {cursos.map(c => (
                  <option key={c.id_curso} value={c.id_curso}>{c.nome_curso}</option>
                ))}
              </select>
            </div>
          )}
          {/* Date range */}
          <div>
            <label style={s.label}>Data Início</label>
            <DatePickerPT value={filtroDataInicio}
              onChange={(v) => { setFiltroDataInicio(v); setPage(1) }}
              style={s.input} />
          </div>
          <div>
            <label style={s.label}>Data Fim</label>
            <DatePickerPT value={filtroDataFim}
              onChange={(v) => { setFiltroDataFim(v); setPage(1) }}
              style={s.input} />
          </div>
        </div>
        <div style={s.filtrosRodape}>
          <span style={{ color: '#9098b0', fontSize: '13px' }}>
            A mostrar <strong style={{ color: 'white' }}>{logs.length}</strong> de <strong style={{ color: 'white' }}>{total}</strong> registos
          </span>
          <button onClick={resetFilters} style={s.btnLimpar}>Limpar filtros</button>
        </div>
      </div>

      {/* ── Lista de logs ── */}
      {loading ? (
        <div style={s.vazio}>A carregar registos...</div>
      ) : logs.length === 0 ? (
        <div style={s.vazio}>Nenhum registo encontrado para os filtros selecionados.</div>
      ) : (
        <>
          <div style={s.timeline}>
            {logs.map((log, index) => {
              const expandido = expandedLog === log.id_audit
              const acaoConfig = getAcaoConfig(log.acao)
              // ── FIX: isCriacao driven solely by valor_antes presence ──────
              // Previously: !log.valor_antes || isCreateAction(log.acao)
              // isCreateAction matches "REGIST*" which fires on update actions
              // like "REGISTAR NOTAS", hiding the "antes" column incorrectly.
              const isCriacao = !log.valor_antes
              const diff = getDiff(log.valor_antes, log.valor_depois)
              const sumario = getSumario(log.acao, log.tabela, diff, log.valor_antes)

              return (
                <div key={`${log.id_audit}-${index}`} style={s.logCard(expandido)}>
                  {/* Cabeçalho clicável */}
                  <div style={s.logHeader}
                    onClick={() => setExpandedLog(expandido ? null : log.id_audit)}>
                    <div style={s.avatar()}>{getIniciais(log.nome_usuario)}</div>

                    <div style={s.logInfo}>
                      <div style={s.logTopo}>
                        <span style={s.nomeusuario}>{log.nome_usuario}</span>
                        <span style={s.acaoBadge(acaoConfig)}>
                          {acaoConfig.icone} {log.acao}
                        </span>
                        <span style={s.tabelaBadge}>{log.tabela}</span>
                      </div>
                      <div style={s.sumario}>{sumario}</div>
                    </div>

                    <div style={s.logMeta}>
                      <span style={s.hora}>{formatDate(log.data_hora)}</span>
                      <span style={s.ip}>{log.ip_address.replace('::ffff:', '')}</span>
                    </div>

                    <span style={s.chevron(expandido)}>▼</span>
                  </div>

                  {/* Detalhe expandido */}
                  {expandido && (() => {
                    const ctx = getContextoRegistro(log)
                    return (
                      <div style={s.expandido}>

                        {/* ── Student context card ── */}
                        <div style={s.contextoCard}>
                          <div style={s.contextoIcone}>
                            {ctx.tipo === 'estudante' ? '🎓' : '👤'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={s.contextoNome}>{ctx.nome}</div>
                            <div style={s.contextoPills}>
                              {ctx.tipo === 'estudante' ? (
                                <>
                                  {ctx.numero && (
                                    <span style={s.contextoPill('#9098b0')}>#{ctx.numero}</span>
                                  )}
                                  <span style={s.contextoPill('#6366f1')}>{ctx.ano}</span>
                                  <span style={s.contextoPill('#0ea5e9')}>{ctx.curso}</span>
                                  {ctx.disciplina && (
                                    <span style={s.contextoPill('#10b981')}>{ctx.disciplina}</span>
                                  )}
                                </>
                              ) : (
                                <span style={s.contextoPill('#a78bfa')}>{ctx.tipoUtilizador}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ── Payment identity card (PagamentoPropina) ── */}
                        {log.contexto_pagamento && (
                          <div style={s.pagamentoCard}>
                            <div style={s.pagamentoIcone}>💳</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={s.contextoNome}>
                                Propina — {log.contexto_pagamento.mes_nome} {log.contexto_pagamento.ano}
                              </div>
                              <div style={s.contextoPills}>
                                {log.contexto_pagamento.referencia && (
                                  <span style={s.contextoPill('#d97706')}>
                                    Ref: {log.contexto_pagamento.referencia}
                                  </span>
                                )}
                                {log.contexto_pagamento.valor_total != null && (
                                  <span style={s.contextoPill('#f59e0b')}>
                                    {formatAOA(log.contexto_pagamento.valor_total)}
                                  </span>
                                )}
                                {log.contexto_pagamento.valor_multa != null && log.contexto_pagamento.valor_multa > 0 && (
                                  <span style={s.contextoPill('#ef4444')}>
                                    Multa: {formatAOA(log.contexto_pagamento.valor_multa)}
                                  </span>
                                )}
                                {log.contexto_pagamento.forma_pagamento && (
                                  <span style={s.contextoPill('#78716c')}>
                                    {log.contexto_pagamento.forma_pagamento}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Invoice identity card (Factura) ── */}
                        {log.contexto_factura && (
                          <div style={s.facturaCard}>
                            <div style={s.facturaIcone}>🧾</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={s.contextoNome}>
                                {log.contexto_factura.numero_factura
                                  ? `Factura ${log.contexto_factura.numero_factura}`
                                  : 'Factura'}
                              </div>
                              <div style={s.contextoPills}>
                                {log.contexto_factura.descricao_servico && (
                                  <span style={s.contextoPill('#0ea5e9')}>
                                    {log.contexto_factura.descricao_servico}
                                  </span>
                                )}
                                {log.contexto_factura.periodo && (
                                  <span style={s.contextoPill('#7dd3fc')}>
                                    {log.contexto_factura.periodo}
                                  </span>
                                )}
                                {log.contexto_factura.ano_lectivo && (
                                  <span style={s.contextoPill('#38bdf8')}>
                                    {log.contexto_factura.ano_lectivo}
                                  </span>
                                )}
                                {log.contexto_factura.valor_total != null && (
                                  <span style={s.contextoPill('#06b6d4')}>
                                    {formatAOA(log.contexto_factura.valor_total)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Debt note identity card (NotaCobranca) ── */}
                        {log.contexto_cobranca && (
                          <div style={{ ...s.facturaCard, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <div style={{ ...s.facturaIcone, background: 'rgba(239,68,68,0.15)' }}>📋</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={s.contextoNome}>Nota de Cobrança</div>
                              <div style={s.contextoPills}>
                                {log.contexto_cobranca.descricao && (
                                  <span style={s.contextoPill('#f87171')}>
                                    {log.contexto_cobranca.descricao}
                                  </span>
                                )}
                                {log.contexto_cobranca.valor != null && (
                                  <span style={s.contextoPill('#ef4444')}>
                                    {formatAOA(log.contexto_cobranca.valor)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Horario Aula context card ── */}
                        {log.contexto_horario && (
                          <div style={{ ...s.pagamentoCard, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)' }}>
                            <div style={{ ...s.pagamentoIcone, background: 'rgba(16,185,129,0.18)' }}>📅</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={s.contextoNome}>Horário de Aula</div>
                              <div style={s.contextoPills}>
                                {log.contexto_horario.disciplina && (
                                  <span style={s.contextoPill('#10b981')}>{log.contexto_horario.disciplina}</span>
                                )}
                                {log.contexto_horario.curso && (
                                  <span style={s.contextoPill('#6366f1')}>{log.contexto_horario.curso}</span>
                                )}
                                {log.contexto_horario.dia_semana && (
                                  <span style={s.contextoPill('#f59e0b')}>{log.contexto_horario.dia_semana}</span>
                                )}
                                {log.contexto_horario.hora_inicio && log.contexto_horario.hora_fim && (
                                  <span style={s.contextoPill('#0ea5e9')}>
                                    {log.contexto_horario.hora_inicio} — {log.contexto_horario.hora_fim}
                                  </span>
                                )}
                                {log.contexto_horario.turno && (
                                  <span style={s.contextoPill('#8b5cf6')}>{log.contexto_horario.turno}</span>
                                )}
                                {log.contexto_horario.sala && (
                                  <span style={s.contextoPill('#9098b0')}>📍 {log.contexto_horario.sala}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Plano Prova context card ── */}
                        {log.contexto_prova && (
                          <div style={{ ...s.pagamentoCard, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)' }}>
                            <div style={{ ...s.pagamentoIcone, background: 'rgba(245,158,11,0.18)' }}>📝</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={s.contextoNome}>Plano de Provas</div>
                              <div style={s.contextoPills}>
                                {log.contexto_prova.disciplina && (
                                  <span style={s.contextoPill('#10b981')}>{log.contexto_prova.disciplina}</span>
                                )}
                                {log.contexto_prova.curso && (
                                  <span style={s.contextoPill('#6366f1')}>{log.contexto_prova.curso}</span>
                                )}
                                {log.contexto_prova.tipo_prova && (
                                  <span style={s.contextoPill('#f59e0b')}>{log.contexto_prova.tipo_prova}</span>
                                )}
                                {log.contexto_prova.data_prova && (
                                  <span style={s.contextoPill('#0ea5e9')}>{log.contexto_prova.data_prova}</span>
                                )}
                                {log.contexto_prova.turno && (
                                  <span style={s.contextoPill('#8b5cf6')}>{log.contexto_prova.turno}</span>
                                )}
                                {log.contexto_prova.hora_inicio && log.contexto_prova.hora_fim && (
                                  <span style={s.contextoPill('#9098b0')}>
                                    {log.contexto_prova.hora_inicio} — {log.contexto_prova.hora_fim}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Periodo Prova context card ── */}
                        {log.contexto_periodo && (
                          <div style={{ ...s.pagamentoCard, background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.25)' }}>
                            <div style={{ ...s.pagamentoIcone, background: 'rgba(59,130,246,0.18)' }}>📆</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={s.contextoNome}>Período de Provas</div>
                              <div style={s.contextoPills}>
                                {log.contexto_periodo.curso && (
                                  <span style={s.contextoPill('#3b82f6')}>{log.contexto_periodo.curso}</span>
                                )}
                                {log.contexto_periodo.ano_curricular && (
                                  <span style={s.contextoPill('#6366f1')}>{log.contexto_periodo.ano_curricular}º Ano</span>
                                )}
                                {log.contexto_periodo.semestre && (
                                  <span style={s.contextoPill('#f59e0b')}>{log.contexto_periodo.semestre}</span>
                                )}
                                {log.contexto_periodo.data_inicio && log.contexto_periodo.data_fim && (
                                  <span style={s.contextoPill('#0ea5e9')}>
                                    {log.contexto_periodo.data_inicio} a {log.contexto_periodo.data_fim}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Professor Disciplina context card ── */}
                        {log.contexto_professor && (
                          <div style={{ ...s.pagamentoCard, background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.25)' }}>
                            <div style={{ ...s.pagamentoIcone, background: 'rgba(139,92,246,0.18)' }}>👨‍🏫</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={s.contextoNome}>Atribuição de Professor</div>
                              <div style={s.contextoPills}>
                                {log.contexto_professor.nome_professor && (
                                  <span style={s.contextoPill('#8b5cf6')}>{log.contexto_professor.nome_professor}</span>
                                )}
                                {log.contexto_professor.disciplina && (
                                  <span style={s.contextoPill('#10b981')}>{log.contexto_professor.disciplina}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Diff / field changes ── */}
                        {diff.length === 0 ? (
                          <p style={s.semAlteracoes}>Sem alterações de dados registadas para esta ação.</p>
                        ) : (
                          <div style={s.diffGrid}>
                            {/* Column headers */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '140px 1fr auto 1fr',
                              gap: '8px',
                              padding: '0 12px 8px',
                            }}>
                              <span style={{ ...s.diffCampo, color: '#555e78' }}>Campo</span>
                              {isCriacao ? (
                                <span style={{ fontSize: '11px', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.4px', gridColumn: '2 / 5' }}>
                                  Valor registado
                                </span>
                              ) : (
                                <>
                                  <span style={{ fontSize: '11px', color: '#555e78', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Antes</span>
                                  <span />
                                  <span style={{ fontSize: '11px', color: '#555e78', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Depois</span>
                                </>
                              )}
                            </div>

                            {diff.map((entrada, i) => (
                              <div key={i} style={s.diffLinha}>
                                <span style={s.diffCampo}>{entrada.campo}</span>
                                {isCriacao ? (
                                  <span style={s.diffNovo}>{entrada.depois}</span>
                                ) : (
                                  <>
                                    <span style={s.diffAntes}>{entrada.antes}</span>
                                    <span style={s.diffSeta}>→</span>
                                    <span style={s.diffDepois}>{entrada.depois}</span>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>

          {/* Paginação */}
          <div style={s.paginacao}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={s.btnPagina(page > 1)}>← Anterior</button>
            <span style={s.paginaInfo}>Página {page} de {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={s.btnPagina(page < totalPages)}>Próxima →</button>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}