"use client"

import { useEffect, useState, useCallback } from "react"
import DatePickerPT from "@/app/components/DatePickerPT"

interface SistemaConfig {
  id_config: number
  ano_lectivo_inicio: string
  ano_lectivo_fim: string
  ano_lectivo_label: string | null
  matricula_data_inicio: string
  matricula_data_fim: string
  propina_dia_geracao: number
  data_simulada: string | null
  simulador_ativo: boolean
  semestre_atual: "S1" | "S2"
  is_enrollment_open: boolean
  is_within_academic_year: boolean
  dias_restantes_ano: number
}

export default function AnoLectivoDashboard() {
  const [config, setConfig] = useState<SistemaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    ano_lectivo_inicio: "",
    ano_lectivo_fim: "",
    matricula_data_inicio: "",
    matricula_data_fim: "",
    propina_dia_geracao: 5,
  })

  // Simulator states
  const [simuladorData, setSimuladorData] = useState("")
  const [simuladorAtivo, setSimuladorAtivo] = useState(false)
  const [systemDate, setSystemDate] = useState<Date>(new Date())
  // Track if we're using simulated date (don't tick the clock)
  const [isSimulated, setIsSimulated] = useState(false)
  // Guardar a data real do sistema antes de activar o simulador
  const [dataRealOriginal, setDataRealOriginal] = useState("")
  // Marcar que o simulador já foi usado (sticker persistente após desactivar)
  const [jaFoiSimulado, setJaFoiSimulado] = useState(false)
  const [avancandoAno, setAvancandoAno] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  // Update local clock every second when NOT in simulator mode
  useEffect(() => {
    if (isSimulated) return // don't tick simulated date
    const interval = setInterval(() => {
      setSystemDate(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [isSimulated])

  async function fetchConfig() {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/sistema/config")
      if (!res.ok) throw new Error("Erro ao carregar configuração")
      
      const data = await res.json()
      setConfig(data)
      
      // Populate form
      setFormData({
        ano_lectivo_inicio: data.ano_lectivo_inicio?.split("T")[0] || "",
        ano_lectivo_fim: data.ano_lectivo_fim?.split("T")[0] || "",
        matricula_data_inicio: data.matricula_data_inicio?.split("T")[0] || "",
        matricula_data_fim: data.matricula_data_fim?.split("T")[0] || "",
        propina_dia_geracao: data.propina_dia_geracao || 5,
      })
      
      setSimuladorAtivo(data.simulador_ativo || false)
      if (data.data_simulada) {
        setSimuladorData(data.data_simulada.split("T")[0])
      }
      
      // Use system_date from API (accounts for simulated date server-side)
      if (data.system_date) {
        setSystemDate(new Date(data.system_date))
        setIsSimulated(data.simulador_ativo || false)
      } else {
        setSystemDate(new Date())
        setIsSimulated(false)
      }
    } catch (error) {
      console.error("Error fetching config:", error)
      setMessage({ type: "error", text: "Erro ao carregar configuração" })
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/admin/sistema/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ano_lectivo_inicio: formData.ano_lectivo_inicio,
          ano_lectivo_fim: formData.ano_lectivo_fim,
          matricula_data_inicio: formData.matricula_data_inicio,
          matricula_data_fim: formData.matricula_data_fim,
          propina_dia_geracao: Number(formData.propina_dia_geracao),
        }),
      })

      if (!res.ok) throw new Error("Erro ao salvar configuração")

      setMessage({ type: "success", text: "Configuração salva com sucesso!" })
      fetchConfig()
    } catch (error) {
      console.error("Error saving config:", error)
      setMessage({ type: "error", text: "Erro ao salvar configuração" })
    } finally {
      setSaving(false)
    }
  }

  async function handleActivateSimulator() {
    if (!simuladorData) {
      setMessage({ type: "error", text: "Selecione uma data para o simulador" })
      return
    }

    try {
      const res = await fetch("/api/admin/sistema/simulador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data_simulada: simuladorData,
          simulador_ativo: true,
        }),
      })

      if (!res.ok) throw new Error("Erro ao ativar simulador")

      // Guardar a data real antes de activar
      setDataRealOriginal(systemDate.toISOString().split("T")[0])
      setJaFoiSimulado(true)
      setMessage({ type: "success", text: "Simulador ativado com sucesso!" })
      window.dispatchEvent(new CustomEvent('simulador-updated'))
      fetchConfig()
    } catch (error) {
      console.error("Error activating simulator:", error)
      setMessage({ type: "error", text: "Erro ao ativar simulador" })
    }
  }

  async function handleResetSimulator() {
    // Voltar para a data real do sistema (mantendo simulador activo)
    const dataReal = dataRealOriginal || new Date().toISOString().split("T")[0]
    setSimuladorData(dataReal)
    try {
      await fetch("/api/admin/sistema/simulador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data_simulada: dataReal, simulador_ativo: true }),
      })
      window.dispatchEvent(new CustomEvent('simulador-updated'))
      fetchConfig()
    } catch {}
  }

  async function handleDeactivateSimulator() {
    try {
      const res = await fetch("/api/admin/sistema/simulador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data_simulada: null,
          simulador_ativo: false,
        }),
      })

      if (!res.ok) throw new Error("Erro ao desativar simulador")

      setMessage({ type: "success", text: "Simulador desativado com sucesso!" })
      setSimuladorData("")
      window.dispatchEvent(new CustomEvent('simulador-updated'))
      fetchConfig()
    } catch (error) {
      console.error("Error deactivating simulator:", error)
      setMessage({ type: "error", text: "Erro ao desativar simulador" })
    }
  }

  // Calculate status based on system date
  const getStatus = () => {
    if (!config) return "Fora do Período"
    const today = systemDate
    const start = new Date(config.ano_lectivo_inicio)
    const end = new Date(config.ano_lectivo_fim)
    
    if (today >= start && today <= end) return "Activo"
    return "Fora do Período"
  }

  const getEnrollmentStatus = () => {
    if (!config) return "Fechadas"
    const today = systemDate
    const start = new Date(config.matricula_data_inicio)
    const end = new Date(config.matricula_data_fim)
    
    return today >= start && today <= end ? "Abertas" : "Fechadas"
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Success/Error Messages */}
      {message && (
        <div style={{
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "20px",
          background: message.type === "success" ? "rgba(46,204,113,0.15)" : "rgba(231,76,60,0.15)",
          border: `1px solid ${message.type === "success" ? "rgba(46,204,113,0.3)" : "rgba(231,76,60,0.3)"}`,
          color: message.type === "success" ? "#2ecc71" : "#e74c3c",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span>{message.type === "success" ? "✅" : "❌"}</span>
          {message.text}
        </div>
      )}

      {/* ── Botão Manual: Gerar Propinas em Falta ── */}
      <div style={{
        background: "#1a1f2e",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px",
        border: "1px solid rgba(46,204,113,0.2)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
          <span style={{ fontSize: "24px" }}>💰</span>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#e8eaf0" }}>
              Gerar Propinas em Falta
            </div>
            <div style={{ fontSize: "12px", color: "#b0b8cf", marginTop: "2px" }}>
              Gera propinas para todos os meses do ano lectivo cujo dia de geração já passou.
              Respeita o simulador de tempo.
            </div>
          </div>
        </div>
        <button
          onClick={async () => {
            try {
              setSaving(true)
              setMessage(null)
              const res = await fetch("/api/admin/gerar-propinas-falta", { method: "POST" })
              const data = await res.json()
              if (!res.ok) throw new Error(data.error || "Erro ao gerar propinas")
              setMessage({
                type: "success",
                text: data.mensagem,
              })
              fetchConfig()
            } catch (err: any) {
              setMessage({ type: "error", text: err.message || "Erro ao gerar propinas" })
            } finally {
              setSaving(false)
            }
          }}
          disabled={saving}
          style={{
            marginTop: "16px",
            padding: "10px 24px",
            background: saving ? "#b0b8cf" : "#22c55e",
            border: "none",
            borderRadius: "6px",
            color: "white",
            fontWeight: "600",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: "14px",
          }}
        >
          {saving ? "A gerar..." : "💰 Gerar Propinas em Falta"}
        </button>
      </div>

      {/* Academic Year Configuration */}
      <div style={{
        background: "#1a1f2e",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
      }}>
        <h2 style={{ margin: "0 0 20px 0", color: "#e8eaf0", fontSize: "18px" }}>
          📅 Configuração do Ano Lectivo
        </h2>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#b0b8cf" }}>
            A carregar...
          </div>
        ) : (
          <form onSubmit={handleSaveConfig}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#d0d7e8", fontSize: "13px" }}>
                  Ano Lectivo Início
                </label>
                <DatePickerPT
                  value={formData.ano_lectivo_inicio}
                  onChange={(val) => setFormData({ ...formData, ano_lectivo_inicio: val })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#13161e",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "6px",
                    color: "#e8eaf0",
                    fontSize: "14px"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#d0d7e8", fontSize: "13px" }}>
                  Ano Lectivo Fim
                </label>
                <DatePickerPT
                  value={formData.ano_lectivo_fim}
                  onChange={(val) => setFormData({ ...formData, ano_lectivo_fim: val })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#13161e",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "6px",
                    color: "#e8eaf0",
                    fontSize: "14px"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#d0d7e8", fontSize: "13px" }}>
                  Ano Lectivo (Auto-calculado)
                </label>
                <input
                  type="text"
                  value={
                    formData.ano_lectivo_inicio && formData.ano_lectivo_fim
                      ? `${new Date(formData.ano_lectivo_inicio).getFullYear()}/${new Date(formData.ano_lectivo_fim).getFullYear()}`
                      : ""
                  }
                  readOnly
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#2a2f3d",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "6px",
                    color: "#d0d7e8",
                    fontSize: "14px"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#d0d7e8", fontSize: "13px" }}>
                  Início do Período de Matrícula
                </label>
                <DatePickerPT
                  value={formData.matricula_data_inicio}
                  onChange={(val) => setFormData({ ...formData, matricula_data_inicio: val })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#13161e",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "6px",
                    color: "#e8eaf0",
                    fontSize: "14px"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#d0d7e8", fontSize: "13px" }}>
                  Fim do Período de Matrícula
                </label>
                <DatePickerPT
                  value={formData.matricula_data_fim}
                  onChange={(val) => setFormData({ ...formData, matricula_data_fim: val })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#13161e",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "6px",
                    color: "#e8eaf0",
                    fontSize: "14px"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#d0d7e8", fontSize: "13px" }}>
                  Dia de Geração de Propinas
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={formData.propina_dia_geracao}
                  onChange={(e) => setFormData({ ...formData, propina_dia_geracao: Number(e.target.value) })}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#13161e",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "6px",
                    color: "#e8eaf0",
                    fontSize: "14px"
                  }}
                />
                <div style={{ fontSize: "11px", color: "#b0b8cf", marginTop: "4px" }}>
                  dia do mês em que as propinas são geradas automaticamente
                </div>
              </div>
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "10px 24px",
                  background: saving ? "#b0b8cf" : "#e03d3d",
                  border: "none",
                  borderRadius: "6px",
                  color: "white",
                  fontWeight: "600",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? "A guardar..." : "💾 Guardar Configuração"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Status Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "24px"
      }}>
        <div style={{
          background: "#1a1f2e",
          borderRadius: "12px",
          padding: "16px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "12px", color: "#b0b8cf", marginBottom: "4px" }}>Ano Lectivo Actual</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#e8eaf0" }}>
            {config?.ano_lectivo_label || "—"}
          </div>
        </div>

        <div style={{
          background: "#1a1f2e",
          borderRadius: "12px",
          padding: "16px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "12px", color: "#b0b8cf", marginBottom: "4px" }}>Estado do Ano</div>
          <div style={{
            fontSize: "18px",
            fontWeight: "700",
            color: getStatus() === "Activo" ? "#2ecc71" : "#f39c12"
          }}>
            {getStatus()}
          </div>
        </div>

        <div style={{
          background: "#1a1f2e",
          borderRadius: "12px",
          padding: "16px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "12px", color: "#b0b8cf", marginBottom: "4px" }}>Matrículas</div>
          <div style={{
            fontSize: "18px",
            fontWeight: "700",
            color: getEnrollmentStatus() === "Abertas" ? "#2ecc71" : "#e74c3c"
          }}>
            {getEnrollmentStatus()}
          </div>
        </div>

        <div style={{
          background: "#1a1f2e",
          borderRadius: "12px",
          padding: "16px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "12px", color: "#b0b8cf", marginBottom: "4px" }}>Data do Sistema</div>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8eaf0" }}>
            {systemDate.toLocaleDateString("pt-PT")}
          </div>
          {simuladorAtivo ? (
            <div style={{ fontSize: "11px", color: "#ffa500", marginTop: "2px" }}>
              🕐 Simulada
            </div>
          ) : jaFoiSimulado ? (
            <div style={{ fontSize: "11px", color: "#b0b8cf", marginTop: "2px" }}>
              ℹ️ Anteriormente simulada
            </div>
          ) : null}
        </div>

        <div style={{
          background: "#1a1f2e",
          borderRadius: "12px",
          padding: "16px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "12px", color: "#b0b8cf", marginBottom: "4px" }}>Dias Restantes</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#e8eaf0" }}>
            {config?.dias_restantes_ano ?? 0}
          </div>
        </div>
      </div>

      {/* Semester Control */}
      <div style={{
        background: "#1a1f2e",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
        border: "1px solid rgba(100,200,255,0.2)"
      }}>
        <h2 style={{ margin: "0 0 16px 0", color: "#e8eaf0", fontSize: "18px" }}>
          📚 Controlo de Semestre
        </h2>
        <p style={{ fontSize: "12px", color: "#b0b8cf", marginBottom: "16px" }}>
          Seleciona o semestre actual da simulação. Quando mudas para S2, os orientadores perdem as disciplinas do S1 e podes re-atribuí-las.
        </p>
        
        <div style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          marginBottom: "12px"
        }}>
          <div style={{ fontSize: "14px", color: "#d0d7e8", fontWeight: "500" }}>
            Semestre Actual:
          </div>
          
          <button
            onClick={async () => {
              if (!config) return
              if (config.semestre_atual === "S1") {
                setMessage({ type: "success", text: "Já estás no Semestre 1" })
                return
              }
              // S2 → S1: blocked
              if (config.semestre_atual === "S2") {
                setMessage({ type: "error", text: "❌ Não podes voltar para Semestre 1 depois de teres avançado para o Semestre 2" })
                return
              }
            }}
            style={{
              padding: "10px 24px",
              border: "2px solid",
              borderColor: config?.semestre_atual === "S1" ? "#4fc3f7" : "rgba(255,255,255,0.15)",
              borderRadius: "8px",
              background: config?.semestre_atual === "S1" ? "rgba(79,195,247,0.15)" : "transparent",
              color: config?.semestre_atual === "S1" ? "#4fc3f7" : "#d0d7e8",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: config?.semestre_atual === "S1" ? "700" : "400",
              flex: 1,
              maxWidth: "150px",
              textAlign: "center"
            }}
          >
            📖 Semestre 1
          </button>
          
          <button
            onClick={async () => {
              if (!config) return
              if (config.semestre_atual === "S2") {
                setMessage({ type: "success", text: "Já estás no Semestre 2" })
                return
              }
              // S1 → S2: confirm and execute
              if (!confirm("⚠️ Tens a certeza? Mudar para S2 vai:\n\n1. Guardar snapshot dos orientadores (ProfessorDisciplina)\n2. Guardar snapshot dos planos de prova e horários do S1\n3. Apagar os dados do S1 para que possas re-atribuir\n4. Os orientadores precisarão de ser re-atribuídos às disciplinas\n\nContinuar?")) {
                return
              }
              
              try {
                setSaving(true)
                const res = await fetch("/api/admin/sistema/semestre", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ semestre: "S2" }),
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || "Erro ao mudar semestre")
                setMessage({ type: "success", text: `✅ ${data.message} (${data.stats?.professor_disciplinas_snapshot || 0} orientadores, ${data.stats?.planos_prova_snapshot || 0} provas, ${data.stats?.horarios_snapshot || 0} horários guardados)` })
                fetchConfig()
              } catch (error: any) {
                setMessage({ type: "error", text: error.message || "Erro ao mudar semestre" })
              } finally {
                setSaving(false)
              }
            }}
            disabled={saving}
            style={{
              padding: "10px 24px",
              border: "2px solid",
              borderColor: config?.semestre_atual === "S2" ? "#ffa726" : "rgba(255,255,255,0.15)",
              borderRadius: "8px",
              background: config?.semestre_atual === "S2" ? "rgba(255,167,38,0.15)" : "transparent",
              color: config?.semestre_atual === "S2" ? "#ffa726" : "#d0d7e8",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: config?.semestre_atual === "S2" ? "700" : "400",
              flex: 1,
              maxWidth: "150px",
              textAlign: "center",
              opacity: saving ? 0.7 : 1
            }}
          >
            📗 Semestre 2
          </button>
        </div>
        
        {config?.semestre_atual === "S2" && (
          <div style={{
            background: "rgba(255,167,38,0.1)",
            border: "1px solid rgba(255,167,38,0.3)",
            borderRadius: "6px",
            padding: "10px 14px",
            color: "#ffa726",
            fontSize: "12px"
          }}>
            ⚠️ Estás no S2. Orientadores sem disciplinas atribuídas. Podes re-atribuí-las no Gestor.
          </div>
        )}
      </div>

      {/* Time Simulator */}
      <div style={{
        background: "#1a1f2e",
        borderRadius: "12px",
        padding: "24px",
        border: "1px solid rgba(255,165,0,0.2)"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px"
        }}>
          <span style={{ fontSize: "20px" }}>⚠️</span>
          <h2 style={{ margin: 0, color: "#ffa500", fontSize: "16px" }}>
            MODO DE TESTE — Simulador de Tempo
          </h2>
        </div>
        <p style={{ fontSize: "12px", color: "#b0b8cf", marginBottom: "20px" }}>
          O simulador substitui a data real do sistema. Desactive antes de usar em produção.
        </p>

        {simuladorAtivo ? (
          <div style={{
            background: "rgba(255,165,0,0.1)",
            border: "1px solid rgba(255,165,0,0.3)",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "16px"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#ffa500",
              fontWeight: "600",
              marginBottom: "12px"
            }}>
              <span>🕐</span>
              <span>SIMULADOR ACTIVO — Data simulada: {new Date(simuladorData).toLocaleDateString("pt-PT")}</span>
            </div>
            
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <DatePickerPT
                value={simuladorData}
                onChange={(val) => setSimuladorData(val)}
                style={{
                  padding: "8px 12px",
                  background: "#13161e",
                  border: "1px solid rgba(255,165,0,0.3)",
                  borderRadius: "6px",
                  color: "#ffa500",
                  fontSize: "14px"
                }}
              />
              
              <button
                onClick={async () => {
                  const date = new Date(simuladorData || new Date())
                  date.setMonth(date.getMonth() + 1)
                  const novaData = date.toISOString().split("T")[0]
                  setSimuladorData(novaData)
                  try {
                    await fetch("/api/admin/sistema/simulador", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ data_simulada: novaData, simulador_ativo: true }),
                    })
                    window.dispatchEvent(new CustomEvent('simulador-updated'))
                    fetchConfig()
                  } catch {}
                }}
                style={{
                  padding: "8px 16px",
                  background: "rgba(255,165,0,0.2)",
                  border: "1px solid rgba(255,165,0,0.3)",
                  borderRadius: "6px",
                  color: "#ffa500",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
              >
                Avançar 1 mês
              </button>
              
              <button
                onClick={async () => {
                  const date = new Date(simuladorData || new Date())
                  date.setDate(date.getDate() + 7)
                  const novaData = date.toISOString().split("T")[0]
                  setSimuladorData(novaData)
                  try {
                    await fetch("/api/admin/sistema/simulador", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ data_simulada: novaData, simulador_ativo: true }),
                    })
                    window.dispatchEvent(new CustomEvent('simulador-updated'))
                    fetchConfig()
                  } catch {}
                }}
                style={{
                  padding: "8px 16px",
                  background: "rgba(255,165,0,0.2)",
                  border: "1px solid rgba(255,165,0,0.3)",
                  borderRadius: "6px",
                  color: "#ffa500",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
              >
                Avançar 1 semana
              </button>
              
               <button
                 onClick={async () => {
                   if (!confirm(`⚠️ AVANÇAR ANO LECTIVO?\n\nVai:\n1. Avançar a data simulada para 1 de Setembro do próximo ano\n2. Actualizar o ano lectivo\n3. Processar rematrícula de TODOS os estudantes (avançar/repetir conforme notas)\n4. Suspender quem não rematricular\n5. Resetar para Semestre 1\n\nContinuar?`)) return
                   setAvancandoAno(true)
                   try {
                     const res = await fetch("/api/admin/sistema/avancar-ano-lectivo", { method: "POST" })
                     const data = await res.json()
                     if (data.success) {
                       setMessage({ type: "success", text: data.message })
                     } else {
                       setMessage({ type: "error", text: data.error || "Erro ao avançar ano" })
                     }
                     window.dispatchEvent(new CustomEvent('simulador-updated'))
                     fetchConfig()
                   } catch {
                     setMessage({ type: "error", text: "Erro ao avançar ano lectivo" })
                   } finally {
                     setAvancandoAno(false)
                   }
                 }}
                 disabled={avancandoAno}
                 style={{
                   padding: "8px 16px",
                   background: avancandoAno ? "#b0b8cf" : "rgba(46,204,113,0.2)",
                   border: "1px solid rgba(46,204,113,0.3)",
                   borderRadius: "6px",
                   color: avancandoAno ? "#d0d7e8" : "#2ecc71",
                   cursor: avancandoAno ? "not-allowed" : "pointer",
                   fontSize: "13px",
                   fontWeight: "600"
                 }}
               >
                 {avancandoAno ? "A avançar..." : "📆 Avançar 1 Ano Lectivo ⏭️"}
               </button>

               <button
                 onClick={handleResetSimulator}
                style={{
                  padding: "8px 16px",
                  background: "rgba(52,152,219,0.2)",
                  border: "1px solid rgba(52,152,219,0.3)",
                  borderRadius: "6px",
                  color: "#3498db",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600"
                }}
              >
                🔄 Reset para Data Real
              </button>

              <button
                onClick={handleDeactivateSimulator}
                style={{
                  padding: "8px 16px",
                  background: "#e74c3c",
                  border: "none",
                  borderRadius: "6px",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600"
                }}
              >
                Desactivar Simulador
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            background: "rgba(85,94,120,0.1)",
            border: "1px solid rgba(85,94,120,0.3)",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "16px"
          }}>
            <div style={{ color: "#b0b8cf", marginBottom: "12px" }}>
              <strong>Simulador Inactivo</strong> — Sistema a usar data real: {systemDate.toLocaleDateString("pt-PT")}
            </div>
            
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <DatePickerPT
                value={simuladorData}
                onChange={(val) => setSimuladorData(val)}
                style={{
                  padding: "8px 12px",
                  background: "#13161e",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "6px",
                  color: "#e8eaf0",
                  fontSize: "14px"
                }}
              />
              
              <button
                onClick={handleActivateSimulator}
                disabled={!simuladorData}
                style={{
                  padding: "8px 16px",
                  background: simuladorData ? "#ffa500" : "#b0b8cf",
                  border: "none",
                  borderRadius: "6px",
                  color: simuladorData ? "#13161e" : "#d0d7e8",
                  cursor: simuladorData ? "pointer" : "not-allowed",
                  fontSize: "13px",
                  fontWeight: "600"
                }}
              >
                Activar Simulador
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}