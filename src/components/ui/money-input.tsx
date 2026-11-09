import { useState } from 'react'
import { Input } from '@/components/ui/form'
import { formatEuros, parseEuros } from '@/domain/money'

/** Importe en € con coma; guarda céntimos (o null si está vacío y `nullable`). */
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
  return (
    <Input
      id={id}
      inputMode="decimal"
      placeholder={placeholder ?? (nullable ? 'Sugerida' : '0,00')}
      {...rest}
      value={editing ?? fmt(cents)}
      onFocus={() => setEditing(fmt(cents))}
      onChange={(e) => {
        setEditing(e.target.value)
        if (e.target.value.trim() === '') onChange(nullable ? null : 0)
        else {
          const c = parseEuros(e.target.value)
          if (c !== null && (allowNegative || c >= 0)) onChange(c)
        }
      }}
      onBlur={() => setEditing(null)}
    />
  )
}
