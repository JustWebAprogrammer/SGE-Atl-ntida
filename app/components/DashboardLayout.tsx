"use client"

import { signOut, useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import ThemeToggle from "./ThemeToggle"

// Componente Dropdown Menu para renderizar itens com children
function DropdownMenu({ items, pathname, router }: { items: NavItem[], pathname: string, router: any }) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  
  return (
    <>
      {items.map((item) => {
        // Se tem children, é um dropdown
        if (item.children && item.children.length > 0) {
          const isOpen = openDropdown === item.label
          return (
            <div key={item.label}>
              <button
                onClick={() => setOpenDropdown(isOpen ? null : item.label)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "none",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: "13.5px",
                  fontWeight: "400",
                  textAlign: "left",
                  cursor: "pointer",
                  marginBottom: "2px",
                  transition: "all 0.15s"
                }}
              >
                <span>{item.label}</span>
                <span style={{ 
                  fontSize: "10px", 
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s"
                }}>▼</span>
              </button>
              {isOpen && (
                <div style={{ 
                  paddingLeft: "12px",
                  marginBottom: "8px" 
                }}>
                  {item.children.map((child) => {
                    const active = pathname === child.path
                    return (
                      <button
                        key={child.path}
                        onClick={() => router.push(child.path || "")}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "none",
                          background: active ? "var(--accent-bg)" : "transparent",
                          color: active ? "var(--accent)" : "var(--text-secondary)",
                          fontSize: "13px",
                          fontWeight: active ? "500" : "400",
                          textAlign: "left",
                          cursor: "pointer",
                          marginBottom: "2px",
                          transition: "all 0.15s"
                        }}
                      >
                        {child.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        }
        
        // Se não tem children, é um item simples
        const active = pathname === item.path
        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path || "")}
            style={{
              display: "block",
              width: "100%",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "none",
              background: active ? "var(--accent-bg)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-secondary)",
              fontSize: "13.5px",
              fontWeight: active ? "500" : "400",
              textAlign: "left",
              cursor: "pointer",
              marginBottom: "2px",
              transition: "all 0.15s"
            }}
          >{item.label}</button>
        )
      })}
    </>
  )
}

interface NavItem {
  label: string
  path?: string
  children?: NavItem[]
}

interface DashboardLayoutProps {
  children: React.ReactNode
  navItems: NavItem[]
  title: string
  subtitle?: string
}

export default function DashboardLayout({
  children,
  navItems,
  title,
  subtitle,
}: DashboardLayoutProps) {
  const { data: session, update, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sessionExpired, setSessionExpired] = useState(false)
  const [showPerfilModal, setShowPerfilModal] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])
  const [dadosPerfil, setDadosPerfil] = useState({
    nome: "",
    nome_usuario: "",
    email: "",
    telemovel: "",
    password_actual: "",
    password_nova: "",
    password_confirmar: ""
  })
  const [loadingPerfil, setLoadingPerfil] = useState(false)
  const [simuladorAtivo, setSimuladorAtivo] = useState(false)
  const [dataSimulada, setDataSimulada] = useState<Date | null>(null)
  const [notificacoes, setNotificacoes] = useState<any[]>([])
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0)
  const [showNotificacoes, setShowNotificacoes] = useState(false)
  const [loadingNotificacoes, setLoadingNotificacoes] = useState(false)

  // Tratar erro de sessão/expiração - NÃO chamar signOut() aqui pois causa loop infinito
  // signOut() força re-fetch do NextAuth que pode falhar e causar ciclo infinito
  useEffect(() => {
    if (status === 'unauthenticated' && !sessionExpired) {
      setSessionExpired(true)
      // Simples redirect sem chamar signOut - isso evita o loop
      setTimeout(() => {
        router.replace('/login')
      }, 2000)
    }
  }, [status, router, sessionExpired])

  /* eslint-disable react-hooks/rules-of-hooks */
  // Carregar dados do perfil quando abre o modal (só executa se sessão não expirou)
  useEffect(() => {
    if (showPerfilModal && session?.user?.id) {
      fetchPerfil()
    }
  }, [showPerfilModal, session?.user?.id])

  // Carregar status do simulador de tempo (para admin)
  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchSimuladorStatus()
      // Re-fetch quando o simulador for alterado noutra página
      window.addEventListener('simulador-updated', fetchSimuladorStatus)
      return () => window.removeEventListener('simulador-updated', fetchSimuladorStatus)
    }
  }, [session?.user?.role])

  // Carregar notificações
  useEffect(() => {
    if (session?.user?.id) {
      fetchNotificacoes()
      fetchContagem()
      // Refresh periódico a cada 30s
      const interval = setInterval(() => {
        fetchContagem()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [session?.user?.id])

  async function fetchNotificacoes() {
    try {
      setLoadingNotificacoes(true)
      const res = await fetch('/api/notificacoes')
      if (res.ok) {
        const data = await res.json()
        setNotificacoes(data)
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
    } finally {
      setLoadingNotificacoes(false)
    }
  }

  async function fetchContagem() {
    try {
      const res = await fetch('/api/notificacoes/contagem')
      if (res.ok) {
        const data = await res.json()
        setNotificacoesNaoLidas(data.total)
      }
    } catch (error) {
      console.error('Erro ao carregar contagem:', error)
    }
  }

  async function marcarLida(id: number) {
    try {
      await fetch(`/api/notificacoes/${id}`, { method: 'PUT' })
      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
      setNotificacoesNaoLidas(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Erro ao marcar notificação:', error)
    }
  }

  async function marcarTodasLidas() {
    try {
      await fetch('/api/notificacoes/marcar-todas', { method: 'PUT' })
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
      setNotificacoesNaoLidas(0)
    } catch (error) {
      console.error('Erro ao marcar todas:', error)
    }
  }

  async function fetchSimuladorStatus() {
    try {
      const res = await fetch('/api/admin/sistema/config')
      if (res.ok) {
        const data = await res.json()
        setSimuladorAtivo(data.simulador_ativo || false)
        setDataSimulada(data.data_simulada ? new Date(data.data_simulada) : null)
      }
    } catch (error) {
      console.error('Erro ao carregar status do simulador:', error)
    }
  }

  // Se sessão expirou, mostrar tela de erro (executa após todos os hooks)
    if (sessionExpired) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          maxWidth: '400px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ margin: '0 0 16px 0', color: 'var(--warning)' }}>
            Sessão Expirada
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            A sua sessão expirou ou houve um erro de conexão.
            <br />
            Por favor, faça login novamente.
          </p>
          <p style={{ color: 'var(--accent)', marginTop: '20px', fontSize: '14px' }}>
            A redirecionar para o login...
          </p>
        </div>
      </div>
    )
  }

  // Usar dadosPerfil.nome_usuario para display (nome de usuário curto)
  // Caso contrário, usar session.user.nome_usuario da sessão
  // E como fallback, session.user.name
  const displayName = dadosPerfil.nome_usuario || session?.user?.nome_usuario || session?.user?.name || ""
  
  // Iniciais baseadas no nome de usuário atualizado
  const initials = displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?"

  // Carregar dados do perfil quando abre o modal
  useEffect(() => {
    if (showPerfilModal && session?.user?.id) {
      fetchPerfil()
    }
  }, [showPerfilModal, session?.user?.id])

  async function fetchPerfil() {
    try {
      setLoadingPerfil(true)
      const res = await fetch('/api/perfil')
      if (!res.ok) {
        throw new Error(`Erro HTTP: ${res.status}`)
      }
      const dados = await res.json()
      // Extrair último 8 dígitos do telefone (sem o +244 9)
      const telefoneFull = dados.telemovel || ""
      const telefoneDigits = telefoneFull.replace(/\D/g, '').slice(-8)
      
      setDadosPerfil({
        nome: dados.nome || "",
        nome_usuario: dados.nome_usuario || "",
        email: dados.email || "",
        telemovel: telefoneDigits, // Apenas os 8 dígitos para o input
        password_actual: "",
        password_nova: "",
        password_confirmar: ""
      })
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    } finally {
      setLoadingPerfil(false)
    }
  }

  async function salvarPerfil() {
    try {
      // Telefone deve ter 8 dígitos (API formata para +244 9XXXXXXXX)
      // Extrair apenas os dígitos do telefone e pegar os últimos 8
      const telefoneDigits = dadosPerfil.telemovel?.replace(/\D/g, '').slice(-8) || ''
      
      const res = await fetch('/api/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dadosPerfil,
          telemovel: telefoneDigits,
          morada: "" // morada is not in the schema
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro HTTP: ${res.status}`)
      }
      
      // Fechar modal - o novo nome fica visível após refresh abaixo
      setShowPerfilModal(false)
      
      // Atualizar sessão NextAuth com os novos dados
      try {
        const refreshRes = await fetch('/api/auth/refresh-jwt', { 
          method: 'POST' 
        })
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json()
          // Actualizar estado local imediatamente para o sidebar reflectir
          setDadosPerfil(prev => ({
            ...prev,
            nome: refreshData.nome_completo || prev.nome,
            nome_usuario: refreshData.nome_usuario || prev.nome_usuario
          }))
          // Atualizar a sessão do NextAuth com o update()
          if (update) {
            await update({
              ...session,
              user: {
                ...session?.user,
                name: refreshData.name,
                nome_completo: refreshData.nome_completo,
                nome_usuario: refreshData.nome_usuario,
              }
            })
          }
        }
      } catch (err) {
        console.warn('Não foi possível atualizar a sessão:', err)
      }
      
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
    }
  }

  return (
      <div style={{
        display: "flex",
        minHeight: "100dvh",
        background: "var(--bg-primary)",
        fontFamily: "system-ui, sans-serif",
        color: "var(--text-primary)"
      }}>

      {/* Responsive styles for mobile */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile-content { display: flex !important; }
          .sidebar-mobile-overlay { display: block !important; }
          .topbar-hamburger { display: flex !important; }
          .content-padding { padding: 16px !important; }
          .main-margin { margin-left: 0 !important; }
          .topbar-padding { padding: 12px 16px !important; }
          .notif-dropdown { right: -60px !important; width: 300px !important; }
          .perfil-modal { width: 95% !important; }
        }
          .sidebar-mobile-overlay { display: none; }
          .sidebar-mobile-content { display: none; }
          .topbar-hamburger { display: none; }
        /* tables scroll horizontally on small screens */
        @media (max-width: 768px) {
          .responsive-table { overflow-x: auto; display: block; max-width: 100%; }
          table { min-width: 600px; }
        }
      `}</style>

      {/* MOBILE OVERLAY */}
      <div
        className="sidebar-mobile-overlay"
        onClick={() => setMobileOpen(false)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 99,
          opacity: mobileOpen ? 1 : 0,
          visibility: mobileOpen ? "visible" : "hidden",
          transition: "opacity 0.3s ease, visibility 0.3s ease"
        }}
      />

      {/* DESKTOP SIDEBAR (hidden on mobile) */}
      <aside className="sidebar-desktop" style={{
        width: "240px",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 100,
        overflow: "hidden"
      }}>

        {/* Brand */}
        <div style={{
          padding: "24px 20px",
          borderBottom: "1px solid var(--border-color)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px",
              background: "var(--accent)",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: "800", fontSize: "15px", color: "white"
            }}>A</div>
            <span style={{ fontWeight: "700", fontSize: "15px" }}>ISP Atlântida</span>
          </div>
          <div style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            marginTop: "4px",
            paddingLeft: "42px"
          }}>Portal Académico</div>
        </div>

        {/* User */}
        <div 
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer"
          }}
          onClick={() => setShowPerfilModal(true)}
        >
          <div style={{
            width: "36px", height: "36px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent), #8b1a1a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "700", fontSize: "13px", color: "white",
            flexShrink: 0
          }}>{initials}</div>
            <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: "13px",
              fontWeight: "500",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>{displayName}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              {dadosPerfil.email || session?.user?.email}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-thumb) var(--bg-secondary)" }}>
          {/* Webkit scrollbar styling for Chrome/Edge/Safari */}
          <style>{`
            nav::-webkit-scrollbar { width: 6px; }
            nav::-webkit-scrollbar-track { background: var(--bg-secondary); border-radius: 3px; }
            nav::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }
            nav::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }
          `}</style>
          <DropdownMenu items={navItems} pathname={pathname} router={router} />
        </nav>

        {/* Logout */}
        <div style={{
          padding: "14px 10px",
          borderTop: "1px solid var(--border-color)"
        }}>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              display: "block",
              width: "100%",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: "var(--text-muted)",
              fontSize: "13px",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.color = "var(--accent)"
              ;(e.target as HTMLButtonElement).style.background = "var(--accent-bg)"
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.color = "var(--text-muted)"
              ;(e.target as HTMLButtonElement).style.background = "transparent"
            }}
          >Terminar Sessão</button>
        </div>
      </aside>

      {/* MOBILE SIDEBAR (slide-in, hidden on desktop) */}
      <aside className="sidebar-mobile-content" style={{
        width: "240px",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 100,
        overflow: "hidden",
        transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s ease"
      }}>

        {/* Brand */}
        <div style={{
          padding: "24px 20px",
          borderBottom: "1px solid var(--border-color)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px",
              background: "var(--accent)",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: "800", fontSize: "15px", color: "white"
            }}>A</div>
            <span style={{ fontWeight: "700", fontSize: "15px" }}>ISP Atlântida</span>
          </div>
          <div style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            marginTop: "4px",
            paddingLeft: "42px"
          }}>Portal Académico</div>
        </div>

        {/* User */}
        <div 
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer"
          }}
          onClick={() => setShowPerfilModal(true)}
        >
          <div style={{
            width: "36px", height: "36px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent), #8b1a1a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "700", fontSize: "13px", color: "white",
            flexShrink: 0
          }}>{initials}</div>
            <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: "13px",
              fontWeight: "500",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>{displayName}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              {dadosPerfil.email || session?.user?.email}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-thumb) var(--bg-secondary)" }}>
          <style>{`
            nav::-webkit-scrollbar { width: 6px; }
            nav::-webkit-scrollbar-track { background: var(--bg-secondary); border-radius: 3px; }
            nav::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }
            nav::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }
          `}</style>
          <DropdownMenu items={navItems} pathname={pathname} router={router} />
        </nav>

        {/* Logout */}
        <div style={{
          padding: "14px 10px",
          borderTop: "1px solid var(--border-color)"
        }}>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              display: "block",
              width: "100%",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: "var(--text-muted)",
              fontSize: "13px",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.color = "var(--accent)"
              ;(e.target as HTMLButtonElement).style.background = "var(--accent-bg)"
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.color = "var(--text-muted)"
              ;(e.target as HTMLButtonElement).style.background = "transparent"
            }}
          >Terminar Sessão</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-margin" style={{ marginLeft: "240px",marginTop: 0,paddingTop: 0, flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-primary)", minHeight: "100dvh" }}>

        {/* Topbar */}
        <header className="topbar-padding" style={{
          padding: "18px 32px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-primary)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            {/* Hamburger — visible only on mobile */}
            <button
              className="topbar-hamburger"
              onClick={() => setMobileOpen(true)}
              style={{
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: "22px",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "6px",
                flexShrink: 0
              }}
            >
              ☰
            </button>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "18px", fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                {subtitle}
              </div>
            )}
          </div>
          </div> {/* close hamburger/title wrapper */}
          
          {/* Notificações */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => {
                setShowNotificacoes(!showNotificacoes)
                if (!showNotificacoes) fetchNotificacoes()
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                borderRadius: "8px",
                position: "relative",
                color: "var(--text-secondary)",
                fontSize: "20px",
                display: "flex",
                alignItems: "center"
              }}
            >
              🔔
              {notificacoesNaoLidas > 0 && (
                <span style={{
                  position: "absolute",
                  top: "0px",
                  right: "0px",
                  background: "var(--accent)",
                  color: "white",
                  fontSize: "10px",
                  fontWeight: "700",
                  minWidth: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid var(--bg-primary)"
                }}>
                  {notificacoesNaoLidas > 99 ? "99+" : notificacoesNaoLidas}
                </span>
              )}
            </button>

            {/* Dropdown Notificações */}
            {showNotificacoes && (
              <>
                {/* Overlay para fechar ao clicar fora */}
                <div
                  style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                  onClick={() => setShowNotificacoes(false)}
                />
                <div className="notif-dropdown" style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: "380px",
                  maxHeight: "480px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color-strong)",
                  borderRadius: "12px",
                  boxShadow: "var(--shadow-dropdown)",
                  zIndex: 100,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column"
                }}>
                  {/* Header do dropdown */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 16px",
                    borderBottom: "1px solid var(--border-color)"
                  }}>
                    <span style={{ fontWeight: "600", fontSize: "14px", color: "var(--text-primary)" }}>Notificações</span>
                    {notificacoesNaoLidas > 0 && (
                      <button
                        onClick={marcarTodasLidas}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--accent)",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontWeight: "500"
                        }}
                      >
                        Marcar todas lidas
                      </button>
                    )}
                  </div>

                  {/* Lista */}
                  <div style={{
                    overflowY: "auto",
                    flex: 1,
                    scrollbarWidth: "thin",
                    scrollbarColor: "var(--scrollbar-thumb) var(--bg-card)"
                  }}>
                    {loadingNotificacoes ? (
                      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                        A carregar...
                      </div>
                    ) : notificacoes.length === 0 ? (
                      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                        Nenhuma notificação
                      </div>
                    ) : (
                      notificacoes.map((n: any) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.lida) marcarLida(n.id)
                            if (n.link_url) {
                              router.push(n.link_url)
                              setShowNotificacoes(false)
                            }
                          }}
                          style={{
                            padding: "12px 16px",
                            borderBottom: "1px solid var(--border-color)",
                            cursor: n.link_url ? "pointer" : "default",
                            background: n.lida ? "transparent" : "var(--accent-bg-subtle)",
                            transition: "background 0.15s"
                          }}
                        >
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "8px"
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: "13px",
                                fontWeight: n.lida ? "400" : "600",
                                color: "var(--text-primary)",
                                marginBottom: "3px"
                              }}>{n.titulo}</div>
                              <div style={{
                                fontSize: "12px",
                                color: "var(--text-muted)",
                                lineHeight: "1.4",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical"
                              }}>{n.mensagem}</div>
                              <div style={{
                                fontSize: "11px",
                                color: "#6b7280",
                                marginTop: "4px"
                              }}>
                                {new Date(n.data_hora).toLocaleDateString('pt-PT', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                            {!n.lida && (
                              <div style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background: "var(--accent)",
                                flexShrink: 0,
                                marginTop: "6px"
                              }} />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Simulador Indicator */}
          {simuladorAtivo && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--warning-bg)",
              border: "1px solid var(--warning-border)",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              color: "var(--warning)",
              fontWeight: "600"
            }}>
              <span>🕐</span>
              <span>SIMULADOR ACTIVO</span>
              {dataSimulada && (
                <span style={{ color: "var(--warning)", opacity: 0.8 }}>
                  ({dataSimulada.toLocaleDateString('pt-PT')})
                </span>
              )}
            </div>
          )}
        </header>

        {/* Content */}
        <div className="content-padding" style={{ padding: "28px 32px", flex: 1, background: "var(--bg-primary)" }}>
          {children}
        </div>
      </main>

      {/* Modal Perfil Utilizador */}
      {showPerfilModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--overlay-modal)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }} onClick={() => setShowPerfilModal(false)}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
            width: '450px',
            maxWidth: '90%',
            maxHeight: '85vh',
            overflowY: 'auto',
            margin: '16px',
            boxShadow: 'var(--shadow-modal)',
            scrollbarWidth: "thin",
            scrollbarColor: "var(--scrollbar-thumb) var(--bg-card)"
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Meu Perfil</h3>
            
            {loadingPerfil ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                A carregar perfil...
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Nome Completo</label>
                  <input
                    type="text"
                    value={dadosPerfil.nome}
                    onChange={(e) => setDadosPerfil({...dadosPerfil, nome: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Nome de Utilizador</label>
                  <input
                    type="text"
                    value={dadosPerfil.nome_usuario}
                    onChange={(e) => setDadosPerfil({...dadosPerfil, nome_usuario: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Email</label>
                  <input
                    type="email"
                    value={dadosPerfil.email}
                    onChange={(e) => setDadosPerfil({...dadosPerfil, email: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Telemóvel</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                    <div style={{
                      padding: '12px',
                      background: 'var(--scrollbar-thumb)',
                      border: '1px solid var(--border-color)',
                      borderRight: 'none',
                      borderRadius: '8px 0 0 8px',
                      color: 'var(--text-secondary)',
                      fontSize: '14px'
                    }}>+244 9</div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={8}
                      pattern="[0-9]{8}"
                      value={dadosPerfil.telemovel}
                      onChange={(e) => setDadosPerfil({...dadosPerfil, telemovel: e.target.value.replace(/\D/g, '').slice(0, 8)})}
                      placeholder="12345678"
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderLeft: 'none',
                        borderRadius: '0 8px 8px 0',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>


                {/* Alterar Password */}
                <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                  <h4 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '15px' }}>🔑 Alterar Password</h4>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Password Actual</label>
                    <input
                      type="password"
                      value={dadosPerfil.password_actual}
                      onChange={(e) => setDadosPerfil({...dadosPerfil, password_actual: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Nova Password</label>
                  <input
                    type="password"
                    value={dadosPerfil.password_nova}
                    onChange={(e) => setDadosPerfil({...dadosPerfil, password_nova: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Confirmar Nova Password</label>
                  <input
                    type="password"
                    value={dadosPerfil.password_confirmar}
                    onChange={(e) => setDadosPerfil({...dadosPerfil, password_confirmar: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box'
                    }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowPerfilModal(false)}
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
                    onClick={salvarPerfil}
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
                    💾 Salvar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}