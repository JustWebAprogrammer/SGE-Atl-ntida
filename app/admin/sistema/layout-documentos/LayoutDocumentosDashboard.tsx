"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/app/components/DashboardLayout"
import { adminNavItems } from "@/app/admin/adminNav"
import { getLayoutDefaults, getPlaceholderHelp } from "@/lib/layout-defaults"
import type { LayoutConfig, DocumentoTipo } from "@/lib/layout-defaults"

type TabKey = DocumentoTipo

// Fonte ÚNICA de defaults: lib/layout-defaults.ts
// NÃO duplicar defaults aqui — usar getLayoutDefaults() da lib.
const DEFAULTS: Record<TabKey, LayoutConfig> = {
  DeclaracaoAcademica: getLayoutDefaults("DeclaracaoAcademica"),
  CertificadoConclusao: getLayoutDefaults("CertificadoConclusao"),
  CertificadoDisciplinas: getLayoutDefaults("CertificadoDisciplinas"),
}

// Placeholders obtidos da lib — ÚNICA fonte de verdade
const PLACEHOLDER_HELP = getPlaceholderHelp()
const PLACEHOLDERS = PLACEHOLDER_HELP.map(h => h.placeholder)

// Valores de exemplo para preview (apenas para preview, não afecta PDFs reais)
const SAMPLE_VALUES: Record<string, string> = {
  "{NOME_COMPLETO}": "João Silva",
  "{NUMERO_ESTUDANTE}": "2024/0001",
  "{NOME_CURSO}": "Engenharia Informática",
  "{ANO_LECTIVO}": "2024/2025",
  "{ANO_CURRICULAR}": "3º Ano",
  "{NOTA_FINAL}": "15",
  "{NOTA_POR_EXTENSO}": "quinze",
  "{DURACAO_ANOS}": "4",
  "{NOME_UNIVERSIDADE}": "Instituto Superior Politécnico Atlântida",
}

function resolvePlaceholders(text: string) {
  return Object.entries(SAMPLE_VALUES).reduce(
    (acc, [key, val]) => acc.replace(key, val),
    text
  )
}

function DocumentPreview({ config, tipo }: { config: LayoutConfig; tipo: TabKey }) {
  const today = new Date().toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div
      style={{
        background: "#ffffff",
        color: "#111",
        borderRadius: "6px",
        padding: "28px 32px",
        fontFamily: "Georgia, serif",
        fontSize: "10px",
        lineHeight: 1.6,
        position: "relative",
        border: "1px solid #ccc",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        minHeight: "500px",
      }}
    >
      {/* Page border inset */}
      <div
        style={{
          position: "absolute",
          top: "8px",
          left: "8px",
          right: "8px",
          bottom: "8px",
          border: "1px solid #999",
          pointerEvents: "none",
        }}
      />

      {/* Document number */}
      <div style={{ position: "absolute", top: "16px", right: "20px", fontSize: "8px", color: "#888" }}>
        Nº DOC-2024/0042
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "14px", gap: "12px" }}>
        {/* Logo placeholder */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "12px",
            fontWeight: "bold",
            flexShrink: 0,
          }}
        >
          U
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontWeight: "bold", fontSize: "11px" }}>{config.nome_universidade}</div>
          <div style={{ fontSize: "8px", color: "#555", letterSpacing: "0.5px" }}>DIRECÇÃO ACADÉMICA</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderBottom: "1px solid #000", marginBottom: "12px" }} />

      {/* Title */}
      <div
        style={{
          fontWeight: "bold",
          fontSize: "13px",
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "14px",
        }}
      >
        {config.titulo}
      </div>

      {/* Body text */}
      <div style={{ marginBottom: "16px", textAlign: "justify" }}>
        {resolvePlaceholders(config.texto_corpo)}
      </div>

      {/* Sample table for CertificadoDisciplinas */}
      {tipo === "CertificadoDisciplinas" && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "9px" }}>
          <thead>
            <tr style={{ background: "#f0f0f0", borderBottom: "1px solid #ccc" }}>
              <th style={{ textAlign: "left", padding: "5px 6px" }}>Disciplina</th>
              <th style={{ textAlign: "center", padding: "5px 6px" }}>Semestre</th>
              <th style={{ textAlign: "center", padding: "5px 6px" }}>Nota</th>
              <th style={{ textAlign: "center", padding: "5px 6px" }}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Cálculo Diferencial", "1º Sem.", "16", "Aprovado"],
              ["Álgebra Linear", "1º Sem.", "14", "Aprovado"],
              ["Programação I", "2º Sem.", "17", "Aprovado"],
            ].map(([d, s, n, sit], i) => (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "4px 6px" }}>{d}</td>
                <td style={{ textAlign: "center", padding: "4px 6px" }}>{s}</td>
                <td style={{ textAlign: "center", padding: "4px 6px" }}>{n}</td>
                <td style={{ textAlign: "center", padding: "4px 6px", color: "#2a7a2a" }}>{sit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Footer */}
      <div style={{ marginTop: "auto" }}>
        <div style={{ textAlign: "right", marginBottom: "10px", fontSize: "9px" }}>
          {config.localidade}, {today}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
          <div style={{ width: "42%", textAlign: "center" }}>
            <div style={{ marginBottom: "5px", color: "#999", fontSize: "8px" }}>[Assinatura]</div>
            <div style={{ borderTop: "1px solid #000", paddingTop: "4px", fontSize: "9px" }}>
              {config.label_assinatura_diretor}
            </div>
          </div>
          <div style={{ width: "42%", textAlign: "center" }}>
            <div style={{ marginBottom: "5px", color: "#999", fontSize: "8px" }}>[Assinatura]</div>
            <div style={{ borderTop: "1px solid #000", paddingTop: "4px", fontSize: "9px" }}>
              {config.label_assinatura_presidente}
            </div>
            <div style={{ fontSize: "8px", color: "#555" }}>Prof. Dr. António Ferreira</div>
          </div>
        </div>

        {/* QR Code indicator */}
        {config.tem_qr_code && (
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              right: "20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                background: "#f9f9f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
              }}
            >
              ▦
            </div>
            <div style={{ fontSize: "7px", color: "#777", marginTop: "3px", maxWidth: "60px" }}>
              {config.texto_verificacao}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LayoutDocumentosDashboard() {
  const [configs, setConfigs] = useState<Record<TabKey, LayoutConfig>>({ ...DEFAULTS })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error">("success")
  const [activeTab, setActiveTab] = useState<TabKey>("DeclaracaoAcademica")

  useEffect(() => {
    loadConfigs()
  }, [])

  async function loadConfigs() {
    try {
      const res = await fetch("/api/admin/layout-documentos")
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : data.layouts || []
        const loadedConfigs: Partial<Record<TabKey, LayoutConfig>> = {}
        items.forEach((item: any) => {
          const tipo = item.tipo_documento as TabKey
          // Merge with defaults from lib to ensure all fields are present
          loadedConfigs[tipo] = { ...DEFAULTS[tipo], ...item.conteudo }
        })
        setConfigs((prev: Record<TabKey, LayoutConfig>) => ({ ...prev, ...loadedConfigs }))
      }
    } catch (error) {
      console.error("Error loading configs:", error)
    } finally {
      setLoading(false)
    }
  }

  async function saveConfig(tipo: TabKey) {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/layout-documentos/${tipo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conteudo: configs[tipo] }),
      })
      if (res.ok) {
        showMessage("Configuração guardada com sucesso!", "success")
      } else {
        const data = await res.json()
        showMessage(data.error || "Erro ao guardar configuração", "error")
      }
    } catch {
      showMessage("Erro de ligação", "error")
    } finally {
      setSaving(false)
    }
  }

  function resetToDefaults(tipo: TabKey) {
    setConfigs((prev: Record<TabKey, LayoutConfig>) => ({ ...prev, [tipo]: { ...DEFAULTS[tipo] } }))
    showMessage("Valores restaurados para padrões (sem guardar)", "success")
  }

  function showMessage(msg: string, type: "success" | "error") {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(""), 5000)
  }

  function updateField<K extends keyof LayoutConfig>(field: K, value: LayoutConfig[K]) {
    setConfigs((prev: Record<TabKey, LayoutConfig>) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [field]: value },
    }))
  }

  const currentConfig = configs[activeTab]

  const TABS: { key: TabKey; label: string }[] = [
    { key: "DeclaracaoAcademica", label: "Declaração Académica" },
    { key: "CertificadoConclusao", label: "Certificado de Conclusão" },
    { key: "CertificadoDisciplinas", label: "Certificado de Disciplinas" },
  ]

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    background: "var(--bg-input)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box" as const,
  }

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    color: "var(--text-secondary)",
    fontSize: "12px",
    fontWeight: "500" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  }

  if (loading) {
    return (
      <DashboardLayout navItems={adminNavItems} title="Layout de Documentos" subtitle="A carregar...">
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>A carregar...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      navItems={adminNavItems}
      title="Layout de Documentos"
      subtitle="Configure os textos e campos dos documentos emitidos"
    >
      {/* Toast message */}
      {message && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "13px",
            fontWeight: "500",
            background: messageType === "success" ? "rgba(45,212,191,0.12)" : "var(--accent-bg)",
            color: messageType === "success" ? "#2dd4bf" : "var(--accent)",
            border: `1px solid ${messageType === "success" ? "rgba(45,212,191,0.25)" : "rgba(224,61,61,0.25)"}`,
          }}
        >
          {messageType === "success" ? "✅" : "❌"} {message}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                border: isActive ? "none" : "1px solid var(--border-color)",
                background: isActive ? "var(--accent)" : "transparent",
                color: isActive ? "#fff" : "var(--text-secondary)",
                fontSize: "13px",
                fontWeight: isActive ? "600" : "400",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>

        {/* Left: Form */}
        <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "24px" }}>
          <h3 style={{ margin: "0 0 20px 0", color: "var(--text-primary)", fontSize: "14px", fontWeight: "600" }}>
            Campos Configuráveis
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Título */}
            <div>
              <label style={labelStyle}>Título do Documento</label>
              <input
                type="text"
                value={currentConfig.titulo}
                onChange={(e) => updateField("titulo", e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Texto do Corpo */}
            <div>
              <label style={labelStyle}>Texto do Corpo</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                {PLACEHOLDERS.map((p) => (
                  <span
                    key={p}
                    onClick={() => navigator.clipboard.writeText(p)}
                    title="Clique para copiar"
                    style={{
                      fontSize: "10px",
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-color)",
                      color: "#f0a500",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontFamily: "monospace",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
              <textarea
                value={currentConfig.texto_corpo}
                onChange={(e) => updateField("texto_corpo", e.target.value)}
                rows={5}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            {/* Assinaturas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Label Assinatura Diretor</label>
                <input
                  type="text"
                  value={currentConfig.label_assinatura_diretor}
                  onChange={(e) => updateField("label_assinatura_diretor", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Label Assinatura Presidente</label>
                <input
                  type="text"
                  value={currentConfig.label_assinatura_presidente}
                  onChange={(e) => updateField("label_assinatura_presidente", e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Texto de Verificação */}
            <div>
              <label style={labelStyle}>Texto de Verificação</label>
              <input
                type="text"
                value={currentConfig.texto_verificacao ?? ""}
                onChange={(e) => updateField("texto_verificacao", e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Universidade & Localidade */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Nome da Universidade</label>
                <input
                  type="text"
                  value={currentConfig.nome_universidade}
                  onChange={(e) => updateField("nome_universidade", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Localidade</label>
                <input
                  type="text"
                  value={currentConfig.localidade}
                  onChange={(e) => updateField("localidade", e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* QR Code toggle */}
            <div>
              <label
                style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
              >
                <div
                  onClick={() => updateField("tem_qr_code", !currentConfig.tem_qr_code)}
                  style={{
                    width: "40px",
                    height: "22px",
                    borderRadius: "11px",
                    background: currentConfig.tem_qr_code ? "var(--accent)" : "var(--border-color-strong)",
                    position: "relative",
                    transition: "background 0.2s",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "3px",
                      left: currentConfig.tem_qr_code ? "21px" : "3px",
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s",
                    }}
                  />
                </div>
                <span style={{ color: "var(--text-primary)", fontSize: "13px" }}>
                  Incluir QR Code no documento
                  {currentConfig.tem_qr_code ? (
                    <span style={{ color: "#2dd4bf", marginLeft: "8px", fontSize: "11px" }}>● Activo</span>
                  ) : (
                    <span style={{ color: "var(--text-secondary)", marginLeft: "8px", fontSize: "11px" }}>○ Inactivo</span>
                  )}
                </span>
              </label>
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                paddingTop: "8px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <button
                onClick={() => saveConfig(activeTab)}
                disabled={saving}
                style={{
                  padding: "11px 22px",
                  background: saving ? "rgba(224,61,61,0.4)" : "var(--accent)",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                {saving ? "A guardar..." : "💾 Guardar"}
              </button>
              <button
                onClick={() => resetToDefaults(activeTab)}
                style={{
                  padding: "11px 22px",
                  background: "transparent",
                  border: "1px solid var(--border-color-strong)",
                  borderRadius: "8px",
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Restaurar Padrões
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: "14px", fontWeight: "600" }}>
              Pré-visualização
            </h3>
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                background: "var(--bg-card)",
                padding: "4px 10px",
                borderRadius: "12px",
              }}
            >
              Dados de exemplo
            </span>
          </div>

          <DocumentPreview config={currentConfig} tipo={activeTab} />

          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              background: "var(--bg-card)",
              borderRadius: "8px",
              fontSize: "11px",
              color: "var(--text-secondary)",
            }}
          >
            💡 A pré-visualização usa dados de exemplo. Os placeholders{" "}
            <span style={{ color: "#f0a500", fontFamily: "monospace" }}>{"{NOME_COMPLETO}"}</span> etc.
            serão substituídos pelos dados reais do estudante ao gerar o documento.
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}