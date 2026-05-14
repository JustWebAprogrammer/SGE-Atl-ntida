"use client"

import { useState } from "react"

type MulticaixaModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  pagamento: {
    id: string
    referencia: string
    valor_total: number
    descricao: string
  }
  /** Código de confirmação de 3 dígitos gerado pelo sistema (para serviços) */
  codigoGerado?: string
  /** Se true, usa o endpoint de serviços para confirmar */
  isServico?: boolean
}

export default function MulticaixaModal({ isOpen, onClose, onSuccess, pagamento, codigoGerado, isServico }: MulticaixaModalProps) {
  const [codigo, setCodigo] = useState("")
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [etapa, setEtapa] = useState<"confirmar" | "processando" | "sucesso">("confirmar")

  if (!isOpen) return null

  function handleCodigoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, "").slice(0, 3) // max 3 dígitos
    setCodigo(val)
    setErro("")
  }

  async function handleConfirm() {
    if (codigo.length !== 3) {
      setErro("O código deve ter 3 dígitos")
      return
    }

    setEtapa("processando")
    setLoading(true)

    try {
      // Escolher o endpoint consoante o tipo
      const endpoint = isServico
        ? "/api/estudante/servicos/confirmar"
        : "/api/estudante/pagamentos/confirmar"

      const body = isServico
        ? { factura_id: pagamento.id, codigo }
        : { id_pagamento: pagamento.id, codigo }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setErro(data.error || "Erro ao confirmar pagamento")
        setEtapa("confirmar")
        return
      }

      setEtapa("sucesso")
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 1500)
    } catch {
      setErro("Erro de conexão. Tente novamente.")
      setEtapa("confirmar")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setCodigo("")
    setErro("")
    setEtapa("confirmar")
    onClose()
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "380px",
          maxWidth: "95vw",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          background: "#fff",
        }}
      >
        {/* Header — vermelho Multicaixa */}
        <div
          style={{
            background: "linear-gradient(135deg, #c0392b, #e74c3c)",
            padding: "24px 20px 20px",
            textAlign: "center",
            color: "white",
          }}
        >
          <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", opacity: 0.8, marginBottom: "4px" }}>
            MULTICAIXA EXPRESS
          </div>
          <div style={{ fontSize: "22px", fontWeight: "700" }}>
            Pagamento
          </div>
        </div>

        {/* Corpo */}
        <div style={{ padding: "24px 20px" }}>
          {etapa === "confirmar" && (
            <>
              {/* Informações da transação */}
              <div style={{
                background: "#f8f9fa",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "20px",
              }}>
                {/* Descrição */}
                <div style={{
                  textAlign: "center",
                  marginBottom: "16px",
                  fontSize: "13px",
                  color: "#666",
                }}>
                  {pagamento.descricao}
                </div>

                {/* Entidade */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid #eee",
                }}>
                  <span style={{ color: "#666", fontSize: "13px" }}>Entidade</span>
                  <span style={{
                    fontWeight: "700",
                    fontSize: "18px",
                    letterSpacing: "2px",
                    color: "#1a1a1a",
                  }}>
                    00867
                  </span>
                </div>

                {/* Referência */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid #eee",
                }}>
                  <span style={{ color: "#666", fontSize: "13px" }}>Referência</span>
                  <span style={{
                    fontWeight: "700",
                    fontSize: "16px",
                    letterSpacing: "1px",
                    color: "#1a1a1a",
                    fontFamily: "monospace",
                  }}>
                    {pagamento.referencia}
                  </span>
                </div>

                {/* Código de confirmação gerado (mostrado apenas se fornecido) */}
                {codigoGerado && (
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #eee",
                  }}>
                    <span style={{ color: "#666", fontSize: "13px" }}>Código</span>
                    <span style={{
                      fontWeight: "700",
                      fontSize: "24px",
                      letterSpacing: "4px",
                      color: "#1a1a1a",
                      fontFamily: "monospace",
                      background: "#ffeaa7",
                      padding: "4px 12px",
                      borderRadius: "6px",
                    }}>
                      {codigoGerado}
                    </span>
                  </div>
                )}

                {/* Valor */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                }}>
                  <span style={{ color: "#666", fontSize: "13px" }}>Valor</span>
                  <span style={{
                    fontWeight: "700",
                    fontSize: "22px",
                    color: "#1a1a1a",
                  }}>
                    {pagamento.valor_total.toLocaleString("pt-AO")} Kz
                  </span>
                </div>
              </div>

              {/* Código Input */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#666",
                  marginBottom: "8px",
                  textAlign: "center",
                }}>
                  {codigoGerado
                    ? "Digite o código de 3 dígitos acima para confirmar"
                    : "Introduza o código de confirmação Multicaixa"}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  value={codigo}
                  onChange={handleCodigoChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && codigo.length === 3) handleConfirm()
                  }}
                  placeholder="•••"
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "16px",
                    fontSize: "28px",
                    textAlign: "center",
                    letterSpacing: "16px",
                    border: `2px solid ${erro ? "#e74c3c" : "#e0e0e0"}`,
                    borderRadius: "12px",
                    outline: "none",
                    background: "#fafafa",
                    boxSizing: "border-box",
                    color: "#1a1a1a",
                  }}
                />
                {erro && (
                  <div style={{ color: "#e74c3c", fontSize: "12px", textAlign: "center", marginTop: "8px" }}>
                    {erro}
                  </div>
                )}
              </div>

              {/* Botões */}
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={handleClose}
                  style={{
                    flex: 1,
                    padding: "14px",
                    background: "#f0f0f0",
                    border: "none",
                    borderRadius: "12px",
                    color: "#666",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={codigo.length !== 3 || loading}
                  style={{
                    flex: 2,
                    padding: "14px",
                    background: codigo.length === 3 ? "#c0392b" : "#ccc",
                    border: "none",
                    borderRadius: "12px",
                    color: "white",
                    fontSize: "15px",
                    fontWeight: "700",
                    cursor: codigo.length === 3 ? "pointer" : "not-allowed",
                    transition: "background 0.2s",
                  }}
                >
                  Confirmar Pagamento
                </button>
              </div>
            </>
          )}

          {etapa === "processando" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{
                width: "48px",
                height: "48px",
                border: "4px solid #e0e0e0",
                borderTop: "4px solid #c0392b",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 20px",
              }} />
              <div style={{ color: "#666", fontSize: "15px" }}>
                A processar pagamento...
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {etapa === "sucesso" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#22c55e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: "32px",
              }}>
                ✓
              </div>
              <div style={{ color: "#1a1a1a", fontSize: "18px", fontWeight: "700", marginBottom: "4px" }}>
                Pagamento Confirmado
              </div>
              <div style={{ color: "#666", fontSize: "13px" }}>
                {pagamento.valor_total.toLocaleString("pt-AO")} Kz
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          background: "#f8f9fa",
          padding: "12px 20px",
          textAlign: "center",
          fontSize: "10px",
          color: "#999",
          borderTop: "1px solid #eee",
        }}>
          Ref: {pagamento.referencia} | Ent: 00867
        </div>
      </div>
    </div>
  )
}