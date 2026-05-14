"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function VerificarDocumento() {
  const params = useParams()
  const id = params.id as string

  const [documento, setDocumento] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (id) {
      fetchDocumento()
    }
  }, [id])

  async function fetchDocumento() {
    try {
      const res = await fetch(`/api/verificar/${id}`)
      const data = await res.json()

      if (res.ok) {
        setDocumento(data)
      } else {
        setError(data.error || "Documento não encontrado")
      }
    } catch (err) {
      setError("Erro ao verificar documento")
    } finally {
      setLoading(false)
    }
  }

  const getDocumentTypeLabel = (tipo: string) => {
    switch (tipo) {
      case "declaracao": return "Declaração Académica"
      case "cert-disc": return "Certificado de Disciplinas"
      case "cert": return "Certificado de Conclusão"
      default: return "Documento"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">A verificar documento...</p>
        </div>
      </div>
    )
  }

  const tipo = documento?.tipo || null

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Instituto Superior Politécnico Atlântida
          </h1>
          <p className="text-gray-400">Verificação de Documentos</p>
        </div>

        {/* Result */}
        {error ? (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-8 text-center">
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-red-300 mb-2">Documento Inválido</h2>
            <p className="text-red-200">{error}</p>
          </div>
        ) : documento ? (
          <div className="bg-gray-800 rounded-lg p-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-semibold text-green-400 mb-2">Documento Válido</h2>
              <p className="text-gray-400">
                Este documento foi emitido pelo Instituto Superior Politécnico Atlântida
              </p>
              <div className="mt-2">
                <span className="inline-block bg-blue-600 text-white text-sm px-3 py-1 rounded-full">
                  {getDocumentTypeLabel(tipo)}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border-b border-gray-700 pb-4">
                <p className="text-sm text-gray-400">Número do Documento</p>
                <p className="text-white font-medium">{documento.numero_documento}</p>
              </div>

              <div className="border-b border-gray-700 pb-4">
                <p className="text-sm text-gray-400">Nome do Estudante</p>
                <p className="text-white font-medium">{documento.estudante.nome_completo}</p>
              </div>

              <div className="border-b border-gray-700 pb-4">
                <p className="text-sm text-gray-400">Número de Matrícula</p>
                <p className="text-white font-medium">{documento.estudante.numero_estudante}</p>
              </div>

              <div className="border-b border-gray-700 pb-4">
                <p className="text-sm text-gray-400">Curso</p>
                <p className="text-white font-medium">{documento.estudante.curso.nome_curso}</p>
              </div>

              {documento.ano_lectivo && (
                <div className="border-b border-gray-700 pb-4">
                  <p className="text-sm text-gray-400">Ano Lectivo</p>
                  <p className="text-white font-medium">{documento.ano_lectivo}</p>
                </div>
              )}

              {documento.descricao && (
                <div className="border-b border-gray-700 pb-4">
                  <p className="text-sm text-gray-400">Descrição</p>
                  <p className="text-white font-medium">{documento.descricao}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-400">Data de Emissão</p>
                <p className="text-white font-medium">
                  {new Date(documento.data_emissao).toLocaleDateString("pt-PT")}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-700 text-center">
              <p className="text-sm text-gray-400">
                Verificado em: {new Date().toLocaleString("pt-PT")}
              </p>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Este serviço é fornecido pelo Instituto Superior Politécnico Atlântida
          </p>
        </div>
      </div>
    </div>
  )
}