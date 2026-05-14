"use client"

import { useState, useEffect, useRef } from "react"
import DashboardLayout from "@/app/components/DashboardLayout"
import { adminNavItems } from "@/app/admin/adminNav"

interface AssinaturaPresidente {
  id_assinatura: number
  nome_presidente: string
  ano_lectivo: string
  caminho_arquivo: string
  data_inicio: string
  data_fim: string | null
  ativo: boolean
}

interface Departamento {
  id_departamento: number
  nome_departamento: string
}

interface Gestor {
  id_orientador: number
  nome_completo: string
  id_departamento: number | null
}

interface AssinaturaGestor {
  id_assinatura: number
  id_gestor: number
  id_departamento: number
  ano_lectivo: string
  caminho_arquivo: string
  data_inicio: string
  data_fim: string | null
  ativo: boolean
  gestor: Gestor
  departamento: Departamento
}

interface AssinaturaDiretor {
  id_assinatura: number
  nome_diretor: string
  caminho_arquivo: string
  data_inicio: string
  data_fim: string | null
  ativo: boolean
  ano_lectivo: string
}

// ─── Shared style tokens (matches the rest of the dashboard) ────────────────
const card = {
  background: "#1e2230",
  borderRadius: "12px",
  padding: "24px",
} as const

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  background: "#13161e",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "8px",
  color: "#e8eaf0",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box" as const,
}

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#9098b0",
  fontSize: "12px",
  fontWeight: "500" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
}

// ─── Signature Preview ───────────────────────────────────────────────────────
function SignaturePreview({
  presidenteSig,
  gestorSig,
  diretorSig,
}: {
  presidenteSig: AssinaturaPresidente | undefined
  gestorSig: AssinaturaGestor | undefined
  diretorSig: AssinaturaDiretor | undefined
}) {
  const today = new Date().toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const SignatureSlot = ({
    label,
    src,
    name,
  }: {
    label: string
    src?: string
    name?: string
  }) => (
    <div style={{ width: "42%", textAlign: "center" }}>
      <div
        style={{
          height: "44px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          marginBottom: "4px",
        }}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            style={{ maxHeight: "44px", maxWidth: "100%", objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              width: "80%",
              height: "32px",
              border: "1.5px dashed #ccc",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: "7px", color: "#aaa" }}>sem assinatura</span>
          </div>
        )}
      </div>
      <div
        style={{
          borderTop: "1px solid #000",
          paddingTop: "4px",
          fontSize: "9px",
          color: "#333",
        }}
      >
        {label}
      </div>
      {name && (
        <div style={{ fontSize: "8px", color: "#555", marginTop: "2px" }}>{name}</div>
      )}
    </div>
  )

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
        minHeight: "420px",
      }}
    >
      {/* Inset border */}
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

      {/* Doc number */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "20px",
          fontSize: "8px",
          color: "#888",
        }}
      >
        Nº DOC-2024/0042
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "14px",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "#e03d3d",
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
          <div style={{ fontWeight: "bold", fontSize: "11px" }}>
            Instituto Superior Politécnico Atlântida
          </div>
          <div style={{ fontSize: "8px", color: "#555", letterSpacing: "0.5px" }}>
            DIRECÇÃO ACADÉMICA
          </div>
        </div>
      </div>

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
        DECLARAÇÃO ACADÉMICA
      </div>

      {/* Body placeholder lines */}
      {[100, 95, 90, 70].map((w, i) => (
        <div
          key={i}
          style={{
            height: "8px",
            background: "#e8e8e8",
            borderRadius: "3px",
            marginBottom: "8px",
            width: `${w}%`,
          }}
        />
      ))}

      {/* Date + Signatures */}
      <div style={{ marginTop: "28px" }}>
        <div style={{ textAlign: "right", marginBottom: "10px", fontSize: "9px" }}>
          Luanda, {today}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
          <SignatureSlot
            label="O(A) Director(a) Académico(a)"
            src={diretorSig?.caminho_arquivo}
            name={diretorSig?.nome_diretor}
          />
          <SignatureSlot
            label="O(A) Presidente"
            src={presidenteSig?.caminho_arquivo}
            name={presidenteSig?.nome_presidente}
          />
        </div>
      </div>

      {/* QR placeholder */}
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
          Verifique a autenticidade em linha
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AssinaturasDashboard() {
  const [presidenteSignatures, setPresidenteSignatures] = useState<AssinaturaPresidente[]>([])
  const [gestorSignatures, setGestorSignatures] = useState<AssinaturaGestor[]>([])
  const [diretorSignatures, setDiretorSignatures] = useState<AssinaturaDiretor[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [gestores, setGestores] = useState<Gestor[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"presidente" | "gestor" | "diretor">("presidente")
  const [uploading, setUploading] = useState(false)

  // Presidente form
  const [presidenteNome, setPresidenteNome] = useState("")
  const [presidenteAno, setPresidenteAno] = useState(new Date().getFullYear().toString())
  const [presidenteFile, setPresidenteFile] = useState<File | null>(null)
  const [presidentePreview, setPresidentePreview] = useState<string | null>(null)
  const presidenteFileRef = useRef<HTMLInputElement>(null)

  // Gestor form
  const [selectedGestor, setSelectedGestor] = useState("")
  const [selectedDepartamento, setSelectedDepartamento] = useState("")
  const [filteredGestores, setFilteredGestores] = useState<Gestor[]>([])
  const [gestorAno, setGestorAno] = useState(new Date().getFullYear().toString())
  const [gestorFile, setGestorFile] = useState<File | null>(null)
  const [gestorPreview, setGestorPreview] = useState<string | null>(null)
  const gestorFileRef = useRef<HTMLInputElement>(null)

  // Director form
  const [diretorNome, setDiretorNome] = useState("")
  const [diretorAno, setDiretorAno] = useState(new Date().getFullYear().toString())
  const [diretorFile, setDiretorFile] = useState<File | null>(null)
  const [diretorPreview, setDiretorPreview] = useState<string | null>(null)
  const diretorFileRef = useRef<HTMLInputElement>(null)

  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error">("success")

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Filter gestores when department changes
    if (selectedDepartamento) {
      const gestoresFiltrados = gestores.filter(g => g.id_departamento === Number(selectedDepartamento))
      setFilteredGestores(gestoresFiltrados)
    } else {
      setFilteredGestores(gestores)
    }
    // Reset gestor selection when department changes
    setSelectedGestor("")
  }, [selectedDepartamento, gestores])

  async function loadData() {
    try {
      const [presidenteRes, gestorRes, diretorRes, departamentosRes, gestoresRes] = await Promise.all([
        fetch("/api/admin/assinaturas/presidente"),
        fetch("/api/admin/assinaturas/gestor"),
        fetch("/api/admin/assinaturas/diretor"),
        fetch("/api/admin/departamentos"),
        fetch("/api/admin/orientadores"),
      ])

      // Helper to safely parse JSON and ensure array
      const safeJson = async (res: Response, fallback: any[] = []) => {
        if (!res.ok) {
          console.error(`API error: ${res.status} ${res.statusText}`)
          return fallback
        }
        try {
          const data = await res.json()
          return Array.isArray(data) ? data : fallback
        } catch (e) {
          console.error("Error parsing JSON:", e)
          return fallback
        }
      }

      const presidenteData = await safeJson(presidenteRes)
      const gestorData = await safeJson(gestorRes)
      const diretorData = await safeJson(diretorRes)
      const departamentosData = await safeJson(departamentosRes, [])
      const gestoresData = await safeJson(gestoresRes)
      
      setPresidenteSignatures(presidenteData)
      setGestorSignatures(gestorData.flatMap((dept: any) => dept.assinaturas || []))
      setDiretorSignatures(diretorData)
      setDepartamentos(departamentosData || [])
      setGestores(gestoresData.filter((g: any) => g.e_gestor) || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  function handlePresidenteFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    setPresidenteFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setPresidentePreview(url)
    } else {
      setPresidentePreview(null)
    }
  }

  function handleGestorFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    setGestorFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setGestorPreview(url)
    } else {
      setGestorPreview(null)
    }
  }

  function handleDiretorFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    setDiretorFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setDiretorPreview(url)
    } else {
      setDiretorPreview(null)
    }
  }

  async function uploadPresidenteSignature(e: React.FormEvent) {
    e.preventDefault()
    if (!presidenteFile || !presidenteNome || !presidenteAno) {
      showMessage("Preencha todos os campos", "error")
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append("nome_presidente", presidenteNome)
    formData.append("ano_lectivo", presidenteAno)
    formData.append("assinatura", presidenteFile)
    try {
      const res = await fetch("/api/admin/assinaturas/presidente", { method: "POST", body: formData })
      if (res.ok) {
        showMessage("Assinatura do presidente carregada com sucesso!", "success")
        setPresidenteNome("")
        setPresidenteFile(null)
        setPresidentePreview(null)
        if (presidenteFileRef.current) presidenteFileRef.current.value = ""
        loadData()
      } else {
        const data = await res.json()
        showMessage(data.error || "Erro ao carregar assinatura", "error")
      }
    } catch {
      showMessage("Erro de ligação", "error")
    } finally {
      setUploading(false)
    }
  }

  async function uploadGestorSignature(e: React.FormEvent) {
    e.preventDefault()
    if (!gestorFile || !selectedGestor || !selectedDepartamento || !gestorAno) {
      showMessage("Preencha todos os campos", "error")
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append("id_gestor", selectedGestor)
    formData.append("id_departamento", selectedDepartamento)
    formData.append("ano_lectivo", gestorAno)
    formData.append("assinatura", gestorFile)
    try {
      const res = await fetch("/api/admin/assinaturas/gestor", { method: "POST", body: formData })
      if (res.ok) {
        showMessage("Assinatura do gestor carregada com sucesso!", "success")
        setSelectedGestor("")
        setSelectedDepartamento("")
        setGestorFile(null)
        setGestorPreview(null)
        if (gestorFileRef.current) gestorFileRef.current.value = ""
        loadData()
      } else {
        const data = await res.json()
        showMessage(data.error || "Erro ao carregar assinatura", "error")
      }
    } catch {
      showMessage("Erro de ligação", "error")
    } finally {
      setUploading(false)
    }
  }

  async function uploadDiretorSignature(e: React.FormEvent) {
    e.preventDefault()
    if (!diretorFile || !diretorNome || !diretorAno) {
      showMessage("Preencha todos os campos", "error")
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append("nome_diretor", diretorNome)
    formData.append("ano_lectivo", diretorAno)
    formData.append("assinatura", diretorFile)
    try {
      const res = await fetch("/api/admin/assinaturas/diretor", { method: "POST", body: formData })
      if (res.ok) {
        showMessage("Assinatura do diretor carregada com sucesso!", "success")
        setDiretorNome("")
        setDiretorFile(null)
        setDiretorPreview(null)
        if (diretorFileRef.current) diretorFileRef.current.value = ""
        loadData()
      } else {
        const data = await res.json()
        showMessage(data.error || "Erro ao carregar assinatura", "error")
      }
    } catch {
      showMessage("Erro de ligação", "error")
    } finally {
      setUploading(false)
    }
  }

  function showMessage(msg: string, type: "success" | "error") {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(""), 5000)
  }

  const activePresidente = presidenteSignatures.find((s) => s.ativo)
  const activeGestor = gestorSignatures.find((s) => s.ativo)
  const activeDiretor = diretorSignatures.find((s) => s.ativo)

  // Build a preview-time president sig using local blob URL if uploading
  const previewPresidenteSig: AssinaturaPresidente | undefined = presidentePreview
    ? {
        id_assinatura: -1,
        nome_presidente: presidenteNome || "Pré-visualização",
        ano_lectivo: presidenteAno,
        caminho_arquivo: presidentePreview,
        data_inicio: new Date().toISOString(),
        data_fim: null,
        ativo: true,
      }
    : activePresidente

  const previewGestorSig: AssinaturaGestor | undefined = gestorPreview
    ? {
        id_assinatura: -1,
        id_gestor: -1,
        id_departamento: -1,
        ano_lectivo: gestorAno,
        caminho_arquivo: gestorPreview,
        data_inicio: new Date().toISOString(),
        data_fim: null,
        ativo: true,
        gestor: { id_orientador: -1, nome_completo: gestores.find((g) => g.id_orientador === Number(selectedGestor))?.nome_completo || "Pré-visualização", id_departamento: null },
        departamento: { id_departamento: -1, nome_departamento: "" },
      }
    : activeGestor

  const previewDiretorSig: AssinaturaDiretor | undefined = diretorPreview
    ? {
        id_assinatura: -1,
        nome_diretor: diretorNome || "Pré-visualização",
        caminho_arquivo: diretorPreview,
        data_inicio: new Date().toISOString(),
        data_fim: null,
        ativo: true,
        ano_lectivo: diretorAno,
      }
    : activeDiretor

  const TABS = [
    { key: "presidente" as const, label: "Presidente" },
    { key: "gestor" as const, label: "Gestores" },
    { key: "diretor" as const, label: "Director(a) Académico(a)" },
  ]

  if (loading) {
    return (
      <DashboardLayout navItems={adminNavItems} title="Assinaturas" subtitle="A carregar...">
        <div style={{ textAlign: "center", padding: "40px", color: "#9098b0" }}>A carregar...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      navItems={adminNavItems}
      title="Assinaturas"
      subtitle="Gerir assinaturas digitais para emissão de documentos"
    >
      {/* Toast */}
      {message && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "13px",
            fontWeight: "500",
            background: messageType === "success" ? "rgba(45,212,191,0.12)" : "rgba(224,61,61,0.12)",
            color: messageType === "success" ? "#2dd4bf" : "#e03d3d",
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
                border: isActive ? "none" : "1px solid rgba(255,255,255,0.07)",
                background: isActive ? "#e03d3d" : "transparent",
                color: isActive ? "#fff" : "#9098b0",
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

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Upload form */}
          {activeTab === "presidente" ? (
            <div style={card}>
              <h3 style={{ margin: "0 0 20px 0", color: "#e8eaf0", fontSize: "14px", fontWeight: "600" }}>
                Carregar Nova Assinatura
              </h3>
              <form onSubmit={uploadPresidenteSignature} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={labelStyle}>Nome do Presidente</label>
                  <input
                    type="text"
                    value={presidenteNome}
                    onChange={(e) => setPresidenteNome(e.target.value)}
                    placeholder="Nome completo"
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Ano Lectivo</label>
                  <input
                    type="text"
                    value={presidenteAno}
                    onChange={(e) => setPresidenteAno(e.target.value)}
                    placeholder="2024/2025"
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Imagem da Assinatura</label>
                  <div
                    onClick={() => presidenteFileRef.current?.click()}
                    style={{
                      width: "100%",
                      padding: "24px 12px",
                      background: "#13161e",
                      border: "1px dashed rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      textAlign: "center",
                      boxSizing: "border-box",
                      transition: "border-color 0.15s",
                    }}
                  >
                    {presidentePreview ? (
                      <img
                        src={presidentePreview}
                        alt="Preview"
                        style={{ maxHeight: "56px", maxWidth: "200px", objectFit: "contain", margin: "0 auto", display: "block" }}
                      />
                    ) : (
                      <>
                        <div style={{ fontSize: "20px", marginBottom: "6px" }}>🖊️</div>
                        <div style={{ fontSize: "12px", color: "#9098b0" }}>Clique para seleccionar imagem</div>
                        <div style={{ fontSize: "11px", color: "rgba(144,152,176,0.5)", marginTop: "2px" }}>PNG ou JPEG</div>
                      </>
                    )}
                  </div>
                  <input
                    ref={presidenteFileRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handlePresidenteFileChange}
                    style={{ display: "none" }}
                  />
                </div>
                <div style={{ paddingTop: "4px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <button
                    type="submit"
                    disabled={uploading}
                    style={{
                      padding: "11px 22px",
                      background: uploading ? "rgba(224,61,61,0.4)" : "#e03d3d",
                      border: "none",
                      borderRadius: "8px",
                      color: "white",
                      fontWeight: "600",
                      fontSize: "13px",
                      cursor: uploading ? "not-allowed" : "pointer",
                    }}
                  >
                    {uploading ? "A carregar..." : "⬆️ Carregar Assinatura"}
                  </button>
                </div>
              </form>
            </div>
           ) : activeTab === "diretor" ? (
             <div style={card}>
               <h3 style={{ margin: "0 0 20px 0", color: "#e8eaf0", fontSize: "14px", fontWeight: "600" }}>
                 Carregar Assinatura do Director(a) Académico(a)
               </h3>
               <form onSubmit={uploadDiretorSignature} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                 <div>
                   <label style={labelStyle}>Nome do Director(a)</label>
                   <input
                     type="text"
                     value={diretorNome}
                     onChange={(e) => setDiretorNome(e.target.value)}
                     placeholder="Nome completo"
                     style={inputStyle}
                     required
                   />
                 </div>
                 <div>
                   <label style={labelStyle}>Ano Lectivo</label>
                   <input
                     type="text"
                     value={diretorAno}
                     onChange={(e) => setDiretorAno(e.target.value)}
                     placeholder="2024/2025"
                     style={inputStyle}
                     required
                   />
                 </div>
                 <div>
                   <label style={labelStyle}>Imagem da Assinatura</label>
                   <div
                     onClick={() => diretorFileRef.current?.click()}
                     style={{
                       width: "100%",
                       padding: "24px 12px",
                       background: "#13161e",
                       border: "1px dashed rgba(255,255,255,0.12)",
                       borderRadius: "8px",
                       cursor: "pointer",
                       textAlign: "center",
                       boxSizing: "border-box",
                     }}
                   >
                     {diretorPreview ? (
                       <img
                         src={diretorPreview}
                         alt="Preview"
                         style={{ maxHeight: "56px", maxWidth: "200px", objectFit: "contain", margin: "0 auto", display: "block" }}
                       />
                     ) : (
                       <>
                         <div style={{ fontSize: "20px", marginBottom: "6px" }}>🖊️</div>
                         <div style={{ fontSize: "12px", color: "#9098b0" }}>Clique para seleccionar imagem</div>
                         <div style={{ fontSize: "11px", color: "rgba(144,152,176,0.5)", marginTop: "2px" }}>PNG ou JPEG</div>
                       </>
                     )}
                   </div>
                   <input
                     ref={diretorFileRef}
                     type="file"
                     accept="image/png,image/jpeg"
                     onChange={handleDiretorFileChange}
                     style={{ display: "none" }}
                   />
                 </div>
                 <div style={{ paddingTop: "4px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                   <button
                     type="submit"
                     disabled={uploading}
                     style={{
                       padding: "11px 22px",
                       background: uploading ? "rgba(224,61,61,0.4)" : "#e03d3d",
                       border: "none",
                       borderRadius: "8px",
                       color: "white",
                       fontWeight: "600",
                       fontSize: "13px",
                       cursor: uploading ? "not-allowed" : "pointer",
                     }}
                   >
                     {uploading ? "A carregar..." : "⬆️ Carregar Assinatura"}
                   </button>
                 </div>
               </form>
             </div>
           ) : (
             <div style={card}>
               <h3 style={{ margin: "0 0 20px 0", color: "#e8eaf0", fontSize: "14px", fontWeight: "600" }}>
                 Carregar Assinatura de Gestor
               </h3>
               <form onSubmit={uploadGestorSignature} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                 <div>
                   <label style={labelStyle}>Departamento</label>
                   <select
                     value={selectedDepartamento}
                     onChange={(e) => setSelectedDepartamento(e.target.value)}
                     style={{ ...inputStyle, appearance: "auto" }}
                     required
                   >
                     <option value="">Selecione um departamento</option>
                     {departamentos.map((d) => (
                       <option key={d.id_departamento} value={d.id_departamento}>
                         {d.nome_departamento}
                       </option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label style={labelStyle}>Gestor</label>
                   <select
                     value={selectedGestor}
                     onChange={(e) => setSelectedGestor(e.target.value)}
                     style={{ ...inputStyle, appearance: "auto" }}
                     required
                   >
                     <option value="">Selecione um gestor</option>
                     {filteredGestores.map((g) => (
                       <option key={g.id_orientador} value={g.id_orientador}>
                         {g.nome_completo}
                       </option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label style={labelStyle}>Ano Lectivo</label>
                   <input
                     type="text"
                     value={gestorAno}
                     onChange={(e) => setGestorAno(e.target.value)}
                     placeholder="2024/2025"
                     style={inputStyle}
                     required
                   />
                 </div>
                 <div>
                   <label style={labelStyle}>Imagem da Assinatura</label>
                   <div
                     onClick={() => gestorFileRef.current?.click()}
                     style={{
                       width: "100%",
                       padding: "24px 12px",
                       background: "#13161e",
                       border: "1px dashed rgba(255,255,255,0.12)",
                       borderRadius: "8px",
                       cursor: "pointer",
                       textAlign: "center",
                       boxSizing: "border-box",
                     }}
                   >
                     {gestorPreview ? (
                       <img
                         src={gestorPreview}
                         alt="Preview"
                         style={{ maxHeight: "56px", maxWidth: "200px", objectFit: "contain", margin: "0 auto", display: "block" }}
                       />
                     ) : (
                       <>
                         <div style={{ fontSize: "20px", marginBottom: "6px" }}>🖊️</div>
                         <div style={{ fontSize: "12px", color: "#9098b0" }}>Clique para seleccionar imagem</div>
                         <div style={{ fontSize: "11px", color: "rgba(144,152,176,0.5)", marginTop: "2px" }}>PNG ou JPEG</div>
                       </>
                     )}
                   </div>
                   <input
                     ref={gestorFileRef}
                     type="file"
                     accept="image/png,image/jpeg"
                     onChange={handleGestorFileChange}
                     style={{ display: "none" }}
                   />
                 </div>
                 <div style={{ paddingTop: "4px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                   <button
                     type="submit"
                     disabled={uploading}
                     style={{
                       padding: "11px 22px",
                       background: uploading ? "rgba(224,61,61,0.4)" : "#e03d3d",
                       border: "none",
                       borderRadius: "8px",
                       color: "white",
                       fontWeight: "600",
                       fontSize: "13px",
                       cursor: uploading ? "not-allowed" : "pointer",
                     }}
                   >
                     {uploading ? "A carregar..." : "⬆️ Carregar Assinatura"}
                   </button>
                 </div>
               </form>
             </div>
           )}

          {/* Signature history table */}
          <div style={{ ...card, padding: "0", overflow: "hidden" }}>
            <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ margin: 0, color: "#e8eaf0", fontSize: "14px", fontWeight: "600" }}>
                {activeTab === "presidente" ? "Histórico — Presidente" : activeTab === "diretor" ? "Histórico — Director(a) Académico(a)" : "Histórico — Gestores"}
              </h3>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <th style={{ textAlign: "left", padding: "12px 24px", color: "#9098b0", fontWeight: "500", fontSize: "11px", textTransform: "uppercase" }}>
                    {activeTab === "presidente" ? "Nome" : activeTab === "diretor" ? "Nome" : "Gestor / Departamento"}
                  </th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "#9098b0", fontWeight: "500", fontSize: "11px", textTransform: "uppercase" }}>Ano</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "#9098b0", fontWeight: "500", fontSize: "11px", textTransform: "uppercase" }}>Data</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "#9098b0", fontWeight: "500", fontSize: "11px", textTransform: "uppercase" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {activeTab === "presidente"
                  ? presidenteSignatures.map((sig) => (
                      <tr key={sig.id_assinatura} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "12px 24px", color: "#e8eaf0", fontSize: "13px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <img
                              src={sig.caminho_arquivo}
                              alt={sig.nome_presidente}
                              style={{ height: "28px", maxWidth: "60px", objectFit: "contain", background: "#fff", borderRadius: "4px", padding: "2px" }}
                            />
                            {sig.nome_presidente}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#9098b0", fontSize: "13px" }}>{sig.ano_lectivo}</td>
                        <td style={{ padding: "12px 16px", color: "#9098b0", fontSize: "13px" }}>{new Date(sig.data_inicio).toLocaleDateString("pt-PT")}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "600",
                            background: sig.ativo ? "rgba(45,212,191,0.12)" : "rgba(255,255,255,0.05)",
                            color: sig.ativo ? "#2dd4bf" : "#9098b0",
                          }}>
                            {sig.ativo ? "● Ativo" : "○ Inativo"}
                          </span>
                        </td>
                      </tr>
                    ))
                  : activeTab === "diretor"
                  ? diretorSignatures.map((sig) => (
                      <tr key={sig.id_assinatura} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "12px 24px", color: "#e8eaf0", fontSize: "13px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <img
                              src={sig.caminho_arquivo}
                              alt={sig.nome_diretor}
                              style={{ height: "28px", maxWidth: "60px", objectFit: "contain", background: "#fff", borderRadius: "4px", padding: "2px" }}
                            />
                            {sig.nome_diretor}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#9098b0", fontSize: "13px" }}>{sig.ano_lectivo}</td>
                        <td style={{ padding: "12px 16px", color: "#9098b0", fontSize: "13px" }}>{new Date(sig.data_inicio).toLocaleDateString("pt-PT")}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "600",
                            background: sig.ativo ? "rgba(45,212,191,0.12)" : "rgba(255,255,255,0.05)",
                            color: sig.ativo ? "#2dd4bf" : "#9098b0",
                          }}>
                            {sig.ativo ? "● Ativo" : "○ Inativo"}
                          </span>
                        </td>
                      </tr>
                    ))
                  : gestorSignatures.map((sig) => (
                      <tr key={sig.id_assinatura} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "12px 24px", color: "#e8eaf0", fontSize: "13px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <img
                              src={sig.caminho_arquivo}
                              alt={sig.gestor?.nome_completo}
                              style={{ height: "28px", maxWidth: "60px", objectFit: "contain", background: "#fff", borderRadius: "4px", padding: "2px" }}
                            />
                            <div>
                              <div>{sig.gestor?.nome_completo}</div>
                              <div style={{ fontSize: "11px", color: "#9098b0" }}>{sig.departamento?.nome_departamento}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#9098b0", fontSize: "13px" }}>{sig.ano_lectivo}</td>
                        <td style={{ padding: "12px 16px", color: "#9098b0", fontSize: "13px" }}>{new Date(sig.data_inicio).toLocaleDateString("pt-PT")}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "600",
                            background: sig.ativo ? "rgba(45,212,191,0.12)" : "rgba(255,255,255,0.05)",
                            color: sig.ativo ? "#2dd4bf" : "#9098b0",
                          }}>
                            {sig.ativo ? "● Ativo" : "○ Inativo"}
                          </span>
                        </td>
                      </tr>
                    ))}
                {(activeTab === "presidente" ? presidenteSignatures : activeTab === "diretor" ? diretorSignatures : gestorSignatures).length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "#9098b0", fontSize: "13px" }}>
                      Nenhuma assinatura registada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT COLUMN — Live Preview ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <h3 style={{ margin: 0, color: "#e8eaf0", fontSize: "14px", fontWeight: "600" }}>
              Pré-visualização
            </h3>
            <span style={{ fontSize: "11px", color: "#9098b0", background: "#1e2230", padding: "4px 10px", borderRadius: "12px" }}>
              Documento de exemplo
            </span>
          </div>

          <SignaturePreview presidenteSig={previewPresidenteSig} gestorSig={previewGestorSig} diretorSig={previewDiretorSig} />

          <div style={{ marginTop: "12px", padding: "10px 14px", background: "#1e2230", borderRadius: "8px", fontSize: "11px", color: "#9098b0" }}>
            💡 A pré-visualização actualiza em tempo real ao seleccionar uma imagem. As assinaturas activas são usadas nos documentos emitidos.
          </div>

          {/* Active signature status cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
            {[
              { label: "Presidente", sig: activePresidente, name: activePresidente?.nome_presidente },
              { label: "Director(a) Académico(a)", sig: activeDiretor, name: activeDiretor?.nome_diretor },
              { label: "Gestor Activo", sig: activeGestor, name: activeGestor?.gestor?.nome_completo },
            ].map(({ label, sig, name }) => (
              <div key={label} style={{ ...card, padding: "14px 16px" }}>
                <div style={{ fontSize: "11px", color: "#9098b0", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {label}
                </div>
                {sig ? (
                  <>
                    <img
                      src={sig.caminho_arquivo}
                      alt={name}
                      style={{ height: "32px", maxWidth: "100%", objectFit: "contain", display: "block", background: "#fff", borderRadius: "4px", padding: "3px", marginBottom: "6px" }}
                    />
                    <div style={{ fontSize: "12px", color: "#e8eaf0", fontWeight: "500" }}>{name}</div>
                    <div style={{ fontSize: "11px", color: "#2dd4bf", marginTop: "2px" }}>● Ativo</div>
                  </>
                ) : (
                  <div style={{ fontSize: "12px", color: "#9098b0" }}>Sem assinatura activa</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}