import { useState } from 'react'
import { Input } from '@/components/ui/form'
import { formatEuros, parseEuros } from '@/domain/money'

/**
 * Importe en € con coma; guarda céntimos (o null si está vacío y `nullable`).
 * Si lo tecleado no es un importe válido, no cambia el valor guardado y lo
 * marca como inválido (con un mensaje corto) hasta que se corrija o se salga.
 */
export function MoneyInput({
  id,
  cents,
  onChange,
  nullable,
  allowNegative,
  placeholder,
  ...rest
}: {
  id: string
  cents: number | null
  onChange: (c: number | null) => void
  nullable?: boolean
  allowNegative?: boolean
  placeholder?: string
  'aria-label'?: string
}) {
  const fmt = (c: number | null) => (c === null ? '' : formatEuros(c).replace(/\s?€/, ''))
  // Mientras se escribe se muestra lo tecleado; si no tiene foco, siempre el valor
  // real (así se actualiza si cambia desde afuera: plantilla cargada, otro mueble…).
  const [editing, setEditing] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const errorId = `${id}-invalid`
  return (
    <div className="flex flex-col gap-1">
      <Input
        id={id}
        inputMode="decimal"
        placeholder={placeholder ?? (nullable ? 'Sugerida' : '0,00')}
        {...rest}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        value={editing ?? fmt(cents)}
        onFocus={() => setEditing(fmt(cents))}
        onChange={(e) => {
          setEditing(e.target.value)
          if (e.target.value.trim() === '') {
            setInvalid(false)
            onChange(nullable ? null : 0)
            return
          }
          // Recién empieza un negativo: todavía no es un error.
          if (allowNegative && e.target.value.trim() === '-') {
            setInvalid(false)
            return
          }
          const c = parseEuros(e.target.value)
          const ok = c !== null && (allowNegative || c >= 0)
          setInvalid(!ok)
          if (ok) onChange(c)
        }}
        onBlur={() => {
          setEditing(null)
          setInvalid(false)
        }}
      />
      {invalid && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {allowNegative ? 'Importe inválido (ej.: 1.234,50)' : 'Importe inválido (ej.: 1.234,50; sin negativos)'}
        </p>
      )}
    </div>
  )
}
