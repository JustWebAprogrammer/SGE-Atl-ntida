"use client"

import { signOut, useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"

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
                  color: "#d0d7e8",
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
                          background: active ? "rgba(224,61,61,0.12)" : "transparent",
                          color: active ? "#e03d3d" : "#d0d7e8",
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
              background: active ? "rgba(224,61,61,0.12)" : "transparent",
              color: active ? "#e03d3d" : "#d0d7e8",
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
        background: '#13161e',
        color: 'white',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          maxWidth: '400px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ margin: '0 0 16px 0', color: '#f0a500' }}>
            Sessão Expirada
          </h2>
          <p style={{ color: '#d0d7e8', lineHeight: '1.6' }}>
            A sua sessão expirou ou houve um erro de conexão.
            <br />
            Por favor, faça login novamente.
          </p>
          <p style={{ color: '#e03d3d', marginTop: '20px', fontSize: '14px' }}>
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
      minHeight: "100vh",
      background: "#0d0f14",
      fontFamily: "system-ui, sans-serif",
      color: "#e8eaf0"
    }}>

      {/* SIDEBAR */}
      <aside style={{
        width: "240px",
        height: "100vh",
        background: "#13161e",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
        overflow: "hidden"
      }}>

        {/* Brand */}
        <div style={{
          padding: "24px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.07)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px",
              background: "#e03d3d",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: "800", fontSize: "15px", color: "white"
            }}>A</div>
            <span style={{ fontWeight: "700", fontSize: "15px" }}>ISP Atlântida</span>
          </div>
          <div style={{
            fontSize: "11px",
            color: "#b0b8cf",
            marginTop: "4px",
            paddingLeft: "42px"
          }}>Portal Académico</div>
        </div>

        {/* User */}
        <div 
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
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
            background: "linear-gradient(135deg, #e03d3d, #8b1a1a)",
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
            <div style={{ fontSize: "11px", color: "#b0b8cf" }}>
              {dadosPerfil.email || session?.user?.email}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#2a2f3d #13161e" }}>
          {/* Webkit scrollbar styling for Chrome/Edge/Safari */}
          <style>{`
            nav::-webkit-scrollbar { width: 6px; }
            nav::-webkit-scrollbar-track { background: #13161e; border-radius: 3px; }
            nav::-webkit-scrollbar-thumb { background: #2a2f3d; border-radius: 3px; }
            nav::-webkit-scrollbar-thumb:hover { background: #3a3f4d; }
          `}</style>
          <DropdownMenu items={navItems} pathname={pathname} router={router} />
        </nav>

        {/* Logout */}
        <div style={{
          padding: "14px 10px",
          borderTop: "1px solid rgba(255,255,255,0.07)"
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
              color: "#b0b8cf",
              fontSize: "13px",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.color = "#e03d3d"
              ;(e.target as HTMLButtonElement).style.background = "rgba(224,61,61,0.12)"
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.color = "#b0b8cf"
              ;(e.target as HTMLButtonElement).style.background = "transparent"
            }}
          >Terminar Sessão</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ marginLeft: "240px",marginTop: 0,paddingTop: 0, flex: 1, display: "flex", flexDirection: "column", background: "#0d0f14", minHeight: "100vh" }}>

        {/* Topbar */}
        <header style={{
          padding: "18px 32px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "#0d0f14",
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "700" }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: "12px", color: "#b0b8cf", marginTop: "2px" }}>
                {subtitle}
              </div>
            )}
          </div>
          
          {/* Simulador Indicator */}
          {simuladorAtivo && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255,165,0,0.15)",
              border: "1px solid rgba(255,165,0,0.3)",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              color: "#ffa500",
              fontWeight: "600"
            }}>
              <span>🕐</span>
              <span>SIMULADOR ACTIVO</span>
              {dataSimulada && (
                <span style={{ color: "#ffa500", opacity: 0.8 }}>
                  ({dataSimulada.toLocaleDateString('pt-PT')})
                </span>
              )}
            </div>
          )}
        </header>

        {/* Content */}
        <div style={{ padding: "28px 32px", flex: 1, background: "#0d0f14" }}>
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
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }} onClick={() => setShowPerfilModal(false)}>
          <div style={{
            background: '#1e2230',
            borderRadius: '16px',
            padding: '24px',
            width: '450px',
            maxWidth: '90%',
            maxHeight: '85vh',
            overflowY: 'auto',
            margin: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            scrollbarWidth: "thin",
            scrollbarColor: "#2a2f3d #1e2230"
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: '#e8eaf0' }}>Meu Perfil</h3>
            
            {loadingPerfil ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#d0d7e8' }}>
                A carregar perfil...
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Nome Completo</label>
                  <input
                    type="text"
                    value={dadosPerfil.nome}
                    onChange={(e) => setDadosPerfil({...dadosPerfil, nome: e.target.value})}
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
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Nome de Utilizador</label>
                  <input
                    type="text"
                    value={dadosPerfil.nome_usuario}
                    onChange={(e) => setDadosPerfil({...dadosPerfil, nome_usuario: e.target.value})}
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
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Email</label>
                  <input
                    type="email"
                    value={dadosPerfil.email}
                    onChange={(e) => setDadosPerfil({...dadosPerfil, email: e.target.value})}
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
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Telemóvel</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                    <div style={{
                      padding: '12px',
                      background: '#2a2f3d',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRight: 'none',
                      borderRadius: '8px 0 0 8px',
                      color: '#d0d7e8',
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
                        background: '#13161e',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderLeft: 'none',
                        borderRadius: '0 8px 8px 0',
                        color: 'white',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>


                {/* Alterar Password */}
                <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <h4 style={{ color: '#e8eaf0', marginBottom: '12px', fontSize: '15px' }}>🔑 Alterar Password</h4>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Password Actual</label>
                    <input
                      type="password"
                      value={dadosPerfil.password_actual}
                      onChange={(e) => setDadosPerfil({...dadosPerfil, password_actual: e.target.value})}
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

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Nova Password</label>
                  <input
                    type="password"
                    value={dadosPerfil.password_nova}
                    onChange={(e) => setDadosPerfil({...dadosPerfil, password_nova: e.target.value})}
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

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>Confirmar Nova Password</label>
                  <input
                    type="password"
                    value={dadosPerfil.password_confirmar}
                    onChange={(e) => setDadosPerfil({...dadosPerfil, password_confirmar: e.target.value})}
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
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowPerfilModal(false)}
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
                    onClick={salvarPerfil}
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