"use client"

import { useState, useEffect } from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"
import { ptBR } from "date-fns/locale"

type DatePickerPTProps = {
  value: string
  onChange: (val: string) => void
  style?: React.CSSProperties
  min?: string
  max?: string
}

export default function DatePickerPT({ value, onChange, style, min, max }: DatePickerPTProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dataSimulada, setDataSimulada] = useState<string | null>(null)

  // Buscar a data simulada quando o componente monta
  useEffect(() => {
    fetch("/api/admin/sistema/simulador")
      .then(r => r.json())
      .then(data => {
        if (data.simulador_ativo && data.data_simulada) {
          setDataSimulada(data.data_simulada)
        }
      })
      .catch(() => {})
  }, [])

  // Parse yyyy-mm-dd to Date object (local timezone safe)
  const selectedDate = value ? new Date(value + "T00:00:00") : undefined

  const minDate = min ? new Date(min + "T00:00:00") : undefined
  const maxDate = max ? new Date(max + "T00:00:00") : undefined

  // Data simulada como Date (para desativar dias anteriores)
  const dataSimuladaDate = dataSimulada ? new Date(dataSimulada + "T00:00:00") : undefined

  // Determinar o mês padrão para o calendário:
  // 1. Se há data selecionada, usa essa
  // 2. Se o simulador está ativo, usa a data simulada
  // 3. Caso contrário, usa a data real do sistema
  const defaultMonth = selectedDate
    ? selectedDate
    : dataSimulada
      ? new Date(dataSimulada + "T00:00:00")
      : new Date()

  // Format date for display: dd/MM/yyyy
  const display = value
    ? value.split("-").reverse().join("/")
    : ""

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Format back to yyyy-mm-dd for API (local timezone safe)
      const yyyy = date.getFullYear()
      const mm = String(date.getMonth() + 1).padStart(2, "0")
      const dd = String(date.getDate()).padStart(2, "0")
      onChange(`${yyyy}-${mm}-${dd}`)
    } else {
      onChange("")
    }
    setIsOpen(false)
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        readOnly
        value={display}
        placeholder="dd/mm/aaaa"
        style={style}
        onClick={() => setIsOpen(!isOpen)}
      />
      {isOpen && (
        <>
          {/* Backdrop overlay - only closes when clicking outside calendar */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
            }}
            onClick={() => setIsOpen(false)}
          />
          {/* Calendar dropdown - positioned above overlay */}
          <div style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 1000,
            marginTop: "4px",
          }}>
            <div style={{
              background: "#1e2230",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              padding: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              position: "relative",
              zIndex: 1001,
            }}>
              <div
                className="rdp-portuguese"
                data-month-name={selectedDate
                  ? ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][selectedDate.getMonth()]
                  : "Mês"}
              >
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleSelect}
                  defaultMonth={defaultMonth}
                  className="rdp-dark rdp-portuguese"
                  locale={ptBR}
                  disabled={[
                    ...(dataSimuladaDate ? [{ before: dataSimuladaDate } as const] : []),
                    ...(minDate ? [{ before: minDate } as const] : []),
                    ...(maxDate ? [{ after: maxDate } as const] : []),
                  ]}
                  styles={{
                    selected: {
                      backgroundColor: "#6366f1",
                      color: "white",
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}