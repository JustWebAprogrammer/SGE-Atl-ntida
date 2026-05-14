"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { estudanteNavItems as navItems } from "../estudanteNav"

type Nota = {
  id_nota: number
  nota_final: number | null
  dispensada: boolean
  disciplina: {
    nome_disciplina: string
    codigo_disciplina: string
    creditos: number
    ano_curricular: number
  }
}

type Documento = {
  id: number
  tipo: "CertificadoConclusao" | "CertificadoDisciplinas" | "DeclaracaoAcademica"
  data_emissao: string
  descricao: string
  anoLectivo: string
  documentoRef: "certificado" | "declaracao"
  numero_documento?: string
  disciplinas: {
    nome: string
    codigo: string
    creditos: number
    ano: number
  }[]
}

type DadosCertificados = {
  estudante: {
    nome_completo: string
    numero_estudante: string
    curso: { nome_curso: string; duracao_anos: number }
    ano_current: number
    pagamento: string
    estado: string
    ano_electivo: string
  }
  documentos: Documento[]
  certificados: {
    id: number; tipo: string; data_emissao: string; descricao: string | null
    disciplinas: { nome: string; codigo: string; creditos: number; ano: number }[]
  }[]
  notasPorAno: Record<string, Nota[]>
}

function BadgeTipo({ tipo }: { tipo: string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    CertificadoDisciplinas: { bg: "rgba(45,212,191,0.12)", color: "#2dd4bf", label: "Disciplinas" },
    CertificadoConclusao: { bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "Conclusão" },
    DeclaracaoAcademica: { bg: "rgba(59,130,246,0.12)", color: "#3b82f6", label: "Declaração" },
  }
  const style = config[tipo] ?? { bg: "rgba(85,94,120,0.2)", color: "#555e78", label: tipo }
  return (
    <span style={{ background: style.bg, color: style.color, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600" }}>
      {style.label}
    </span>
  )
}

function CardDocumento(props: {
  icon: string
  titulo: string
  descricao: string
  cor: string
  corBg: string
  podeEmitir: boolean
  estaBaixando: boolean
  onBaixar: () => Promise<void>
  bloqueado?: boolean
  msgBloqueado?: string
}) {
  const { icon, titulo, descricao, cor, corBg, podeEmitir, estaBaixando, onBaixar, bloqueado, msgBloqueado } = props
  return (
    <div style={{
      background: corBg,
      border: `1px solid ${cor}33`,
      borderRadius: "14px",
      padding: "20px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
      flexWrap: "wrap",
      opacity: bloqueado ? 0.6 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ fontSize: "32px" }}>{icon}</div>
        <div>
          <div style={{ fontSize: "15px", fontWeight: "600", color: "#e8eaf0", marginBottom: "4px" }}>{titulo}</div>
          <div style={{ fontSize: "12px", color: "#9098b0" }}>{bloqueado ? msgBloqueado : descricao}</div>
        </div>
      </div>
      {podeEmitir && !bloqueado && (
        <button
          onClick={onBaixar}
          disabled={estaBaixando}
          style={{
            flexShrink: 0, padding: "10px 20px",
            background: estaBaixando ? "#555e78" : cor,
            color: estaBaixando ? "#fff" : "#0d0f14",
            border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600",
            cursor: estaBaixando ? "not-allowed" : "pointer",
          }}
        >
          {estaBaixando ? "..." : "📥 Baixar PDF"}
        </button>
      )}
    </div>
  )
}

export default function CertificadosDashboard() {
  const [dados, setDados] = useState<DadosCertificados | null>(null)
  const [loading, setLoading] = useState(true)
  const [baixando, setBaixando] = useState<string | null>(null)
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState("")

  useEffect(() => {
    fetch("/api/estudante/certificados")
      .then((r) => r.json())
      .then(setDados)
      .finally(() => setLoading(false))
  }, [])

  async function baixarDocumento(tipo: "declaracao" | "disciplinas" | "conclusao", id?: number) {
    const key = id ? `${tipo}-${id}` : tipo
    setBaixando(key)
    setErro("")
    setSucesso("")

    try {
      if (tipo === "declaracao") {
        if (id) {
          window.open(`/api/estudante/declaracao/${id}/pdf`, "_blank")
        } else {
          const res = await fetch("/api/estudante/declaracao/pdf")
          if (!res.ok) {
            const err = await res.json()
            setErro(err.error || "Erro ao gerar declaração")
            return
          }
          const data = await res.json()
          const { pdf } = await import("@react-pdf/renderer")
          const { default: DeclaracaoPDF } = await import("../../components/DeclaracaoPDF")
          const blob = await pdf(
            <DeclaracaoPDF
              layoutConfig={data.layoutConfig}
              studentName={data.studentName}
              studentNumber={data.studentNumber}
              courseName={data.courseName}
              currentYear={data.currentYear}
              anoLectivo={data.anoLectivo}
              presidentSignature={data.presidentSignature}
              presidentName={data.presidentName}
              directorSignature={data.directorSignature}
              directorName={data.directorName}
              documentNumber={data.documentNumber}
              qrCodeUrl={data.qrCodeUrl}
              logoUrl={data.logoUrl}
              systemDate={data.systemDate ? new Date(data.systemDate) : undefined}
            />
          ).toBlob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `${data.documentNumber}.pdf`
          a.click()
          URL.revokeObjectURL(url)
          setSucesso("Declaração Académica emitida com sucesso!")
        }
      } else if (tipo === "disciplinas") {
        // Fetch JSON data from API
        const res = await fetch("/api/estudante/certificado/disciplinas/pdf")
        if (!res.ok) {
          const err = await res.json()
          setErro(err.error || "Erro ao gerar certificado de disciplinas")
          return
        }
        const data = await res.json()

        // Dynamically import @react-pdf/renderer
        const { pdf } = await import("@react-pdf/renderer")
        const { default: CertificadoDisciplinasPDF } = await import("../../components/CertificadoDisciplinasPDF")

        // Generate PDF blob
        const blob = await pdf(
          <CertificadoDisciplinasPDF
            layoutConfig={data.layoutConfig}
            studentName={data.studentName}
            studentNumber={data.studentNumber}
            courseName={data.courseName}
            anoLectivo={data.anoLectivo}
            disciplinas={data.disciplinas}
            presidentSignature={data.presidentSignature}
            presidentName={data.presidentName}
            directorSignature={data.directorSignature}
            directorName={data.directorName}
            documentNumber={data.documentNumber}
            qrCodeUrl={data.qrCodeUrl}
            logoUrl={data.logoUrl}
            systemDate={data.systemDate ? new Date(data.systemDate) : undefined}
          />
        ).toBlob()

        // Trigger download
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${data.documentNumber}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        setSucesso("Certificado de Disciplinas emitido com sucesso!")
      } else {
        // conclusao: client-side PDF generation
        const res = await fetch("/api/estudante/certificado/conclusao/pdf")
        if (!res.ok) {
          const err = await res.json()
          setErro(err.error || "Erro ao gerar certificado de conclusão")
          return
        }
        const data = await res.json()

        // Dynamically import @react-pdf/renderer
        const { pdf } = await import("@react-pdf/renderer")
        const { default: CertificadoConclusaoPDF } = await import("../../components/CertificadoConclusaoPDF")

        // Generate PDF blob - texto_corpo já vem com placeholders substituídos pela API
        const blob = await pdf(
          <CertificadoConclusaoPDF
            layoutConfig={data.layoutConfig}
            studentName={data.studentName}
            studentNumber={data.studentNumber}
            courseName={data.courseName}
            courseDuration={data.courseDuration}
            anoLectivo={data.anoLectivo}
            gradesByYear={data.gradesByYear}
            monografiaGrade={data.monografiaGrade}
            finalGrade={data.finalGrade}
            finalGradeExtenso={data.finalGradeExtenso}
            presidentSignature={data.presidentSignature}
            presidentName={data.presidentName}
            directorSignature={data.directorSignature}
            directorName={data.directorName}
            documentNumber={data.documentNumber}
            qrCodeUrl={data.qrCodeUrl}
            logoUrl={data.logoUrl}
            systemDate={data.systemDate ? new Date(data.systemDate) : undefined}
          />
        ).toBlob()

        // Trigger download
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${data.documentNumber}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        setSucesso(`Certificado de Conclusão emitido com sucesso! (${data.documentNumber})`)
      }
    } catch (err) {
      console.error("Erro ao baixar documento:", err)
      setErro("Erro ao processar documento")
    } finally {
      setBaixando(null)
    }
  }

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Certificados" subtitle="Certificados e diplomas">
        <div style={{ textAlign: "center", color: "#555e78", padding: "60px" }}>A carregar...</div>
      </DashboardLayout>
    )
  }

  if (!dados) {
    return (
      <DashboardLayout navItems={navItems} title="Certificados" subtitle="Certificados e diplomas">
        <div style={{ textAlign: "center", color: "#e03d3d", padding: "60px" }}>Erro ao carregar dados</div>
      </DashboardLayout>
    )
  }

  const { estudante, documentos, notasPorAno } = dados
  const temNotas = Object.keys(notasPorAno).length > 0
  const isFinalizado = estudante.estado === "Finalizado"
  const isFinalista = !isFinalizado && estudante.ano_current === (estudante.curso.duracao_anos || 4)
  const propinaPaga = estudante.pagamento === "Pago" || isFinalista || isFinalizado
  const podeEmitir = propinaPaga

  return (
    <DashboardLayout navItems={navItems} title="Certificados" subtitle="Certificados e diplomas">
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Documentos Emitidos", value: documentos.length, color: "#2dd4bf" },
          { label: "Anos Concluídos", value: Object.keys(notasPorAno).length, color: "#22c55e" },
          { label: "Estado Propina", value: propinaPaga ? "Pago" : estudante.pagamento, color: propinaPaga ? "#22c55e" : "#f0a500" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px", borderTop: `2px solid ${s.color}` }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#555e78", marginBottom: "10px" }}>{s.label}</div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Messages */}
      {erro && (
        <div style={{ background: "rgba(224,61,61,0.08)", border: "1px solid rgba(224,61,61,0.2)", borderRadius: "10px", padding: "14px 18px", marginBottom: "20px", fontSize: "13px", color: "#e03d3d", fontWeight: "500" }}>
          ❌ {erro}
        </div>
      )}
      {sucesso && (
        <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "10px", padding: "14px 18px", marginBottom: "20px", fontSize: "13px", color: "#22c55e", fontWeight: "500" }}>
          ✅ {sucesso}
        </div>
      )}

      {/* 3 Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
        <CardDocumento
          icon="📋" titulo="Declaração Académica"
          descricao="Declaração com o histórico académico, médias por ano e situação actual."
          cor="#3b82f6" corBg="rgba(59,130,246,0.06)"
          podeEmitir={podeEmitir}
          estaBaixando={baixando === "declaracao"}
          onBaixar={() => baixarDocumento("declaracao")}
          bloqueado={isFinalizado}
          msgBloqueado="Estudantes finalizados já não necessitam de declaração académica"
        />
        <CardDocumento
          icon="📄" titulo="Certificado de Disciplinas"
          descricao="Certificado com a lista de disciplinas concluídas e notas obtidas."
          cor="#2dd4bf" corBg="rgba(45,212,191,0.06)"
          podeEmitir={podeEmitir}
          estaBaixando={baixando === "disciplinas"}
          onBaixar={() => baixarDocumento("disciplinas")}
        />
        <CardDocumento
          icon="🎓" titulo="Certificado de Conclusão"
          descricao="Certificado de licenciatura com média final do curso."
          cor="#22c55e" corBg="rgba(34,197,94,0.06)"
          podeEmitir={podeEmitir}
          estaBaixando={baixando === "conclusao"}
          onBaixar={() => baixarDocumento("conclusao")}
          bloqueado={!isFinalizado}
          msgBloqueado="Apenas estudantes finalizados podem emitir este certificado"
        />
      </div>

      {/* Propina pendente */}
      {!podeEmitir && (
        <div style={{ background: "rgba(240,165,0,0.08)", border: "1px solid rgba(240,165,0,0.2)", borderRadius: "14px", padding: "24px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ fontSize: "28px" }}>⚠️</div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0a500", marginBottom: "4px" }}>Propina pendente</div>
            <div style={{ fontSize: "13px", color: "#9098b0" }}>Precisa de estar com a propina em dia para emitir novos documentos.</div>
          </div>
          <a href="/estudante/pagamentos" style={{ marginLeft: "auto", padding: "8px 16px", background: "#f0a500", color: "#0d0f14", borderRadius: "8px", fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>Ver Pagamentos</a>
        </div>
      )}

      {/* Histórico */}
      <h3 style={{ color: "#e8eaf0", fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" }}>Histórico de Documentos Emitidos</h3>

      {documentos.length === 0 ? (
        <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "60px", textAlign: "center", color: "#555e78" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>📜</div>
          <div style={{ fontSize: "14px" }}>Nenhum documento emitido ainda.</div>
        </div>
      ) : (
        <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden" }}>
          {documentos.map((doc, i) => {
            const docKey = `${doc.documentoRef}-${doc.id}`
            const isDownloading = baixando === docKey
            const nomeDoc = doc.tipo === "DeclaracaoAcademica"
              ? `Declaração Académica - ${doc.anoLectivo}`
              : doc.tipo === "CertificadoConclusao"
                ? `Certificado de Conclusão - ${doc.anoLectivo}`
                : `Certificado de Disciplinas - ${doc.anoLectivo}`
            const icone = doc.tipo === "DeclaracaoAcademica" ? "📋" : doc.tipo === "CertificadoConclusao" ? "🎓" : "📄"

            function handleDownload() {
              if (doc.documentoRef === "declaracao") {
                baixarDocumento("declaracao", doc.id)
              } else {
                const tipo = doc.tipo === "CertificadoConclusao" ? "conclusao" : "disciplinas"
                window.open(`/api/estudante/certificado/${tipo}/pdf`, "_blank")
              }
            }

            return (
              <div key={docKey} style={{ padding: "18px 24px", borderBottom: i < documentos.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "24px" }}>{icone}</span>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8eaf0" }}>{nomeDoc}</div>
                      <div style={{ fontSize: "12px", color: "#555e78" }}>Emitido em {new Date(doc.data_emissao).toLocaleDateString("pt-AO")}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <BadgeTipo tipo={doc.tipo} />
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      style={{ padding: "6px 14px", background: isDownloading ? "#555e78" : "#2dd4bf", color: "#0d0f14", borderRadius: "6px", fontSize: "12px", fontWeight: "600", border: "none", cursor: isDownloading ? "not-allowed" : "pointer" }}
                    >
                      {isDownloading ? "..." : "📥 Download PDF"}
                    </button>
                  </div>
                </div>
                {doc.descricao && <div style={{ fontSize: "12px", color: "#9098b0", marginTop: "4px" }}>{doc.descricao}</div>}
                {doc.disciplinas && doc.disciplinas.length > 0 && (
                  <div style={{ marginTop: "8px", fontSize: "11px", color: "#555e78" }}>{doc.disciplinas.length} disciplina(s) incluída(s)</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}