import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import type { Member } from '@/data/api'
import { todayIso } from '@/domain/dates'
import { distributionError, equalShares } from '@/domain/distribution'
import { formatEuros, parseEuros } from '@/domain/money'
import { notifyError, notifyWrite } from '@/lib/notify'
import { isoDateSchema } from '@/model'

const toInput = (cents: number) => formatEuros(cents).replace(/\s?€/, '')

/**
 * Pasa dinero del fondo común del taller a la ganancia de los socios, en partes
 * iguales. Pregunta cuánto sacar, muestra el cálculo y registra un movimiento
 * "reparto" por socio (todos juntos). No mueve dinero de las cajas.
 */
export function DistributionForm({
  members,
  fundCents,
  onDone,
  onCancel,
}: {
  /** Socios activos (los que pueden recibir). */
  members: Member[]
  /** Fondo común del taller disponible. */
  fundCents: number
  onDone: () => void
  onCancel?: () => void
}) {
  const api = useData()
  const me = useMyEmail()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayIso())
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<string[]>(() => members.map((m) => m.email))
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false)
  const [busy, setBusy] = useState(false)

  const cents = parseEuros(amount)
  const chosen = members.filter((m) => selected.includes(m.email)).map((m) => m.email)
  const shares = cents !== null && cents > 0 ? equalShares(cents, chosen) : {}
  const toggle = (email: string, on: boolean) =>
    setSelected((s) => (on ? [...new Set([...s, email])] : s.filter((e) => e !== email)))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const err = distributionError(cents, fundCents, chosen) ?? (isoDateSchema.safeParse(date).success ? null : 'Elegí una fecha válida')
    setError(err)
    if (err || submitting.current || cents === null) return
    submitting.current = true
    setBusy(true)
    try {
      const desc = description.trim() || `Reparto del fondo del taller: ${formatEuros(cents)} entre ${chosen.length} socio${chosen.length > 1 ? 's' : ''}`
      notifyWrite(api.createDistribution({ date, description: desc, shares }, me), 'Reparto registrado')
      onDone()
    } catch (ex) {
      submitting.current = false
      setBusy(false)
      notifyError(ex)
    }
  }

  return (
    <form noValidate onSubmit={submit} className="grid gap-4 md:grid-cols-2" aria-label="Reparto del fondo del taller">
      <p className="rounded-lg bg-muted px-3 py-2 text-sm md:col-span-2">
        Fondo común del taller disponible: <strong className="tabular-nums">{formatEuros(fundCents)}</strong>
        <span className="block text-xs text-muted-foreground">
          Pasa a la ganancia de cada socio en partes iguales. El dinero no sale de las cajas: después cada socio lo puede retirar.
        </span>
      </p>

      <Field id="rp-amount" label="¿Cuánto querés repartir? (€) *" error={error ?? undefined}>
        <div className="flex gap-2">
          <Input
            id="rp-amount"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            aria-invalid={!!error}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button variant="outline" size="sm" disabled={fundCents <= 0} onClick={() => setAmount(toInput(fundCents))}>
            Todo
          </Button>
        </div>
      </Field>
      <Field id="rp-date" label="Fecha">
        <Input id="rp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3 md:col-span-2">
        <legend className="px-1 text-sm font-medium">Socios que reciben</legend>
        {members.length === 0 && <p className="text-sm text-muted-foreground">No hay socios activos.</p>}
        <ul aria-label="Cálculo del reparto" className="flex flex-col gap-1 text-sm">
          {members.map((m) => (
            <li key={m.email} className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={selected.includes(m.email)}
                  onChange={(e) => toggle(m.email, e.target.checked)}
                />
                {m.name}
              </label>
              <span className="tabular-nums text-muted-foreground">{shares[m.email] !== undefined ? formatEuros(shares[m.email]) : '—'}</span>
            </li>
          ))}
        </ul>
        {cents !== null && cents > 0 && cents <= fundCents && (
          <p className="text-xs text-muted-foreground">
            Al taller le quedan {formatEuros(fundCents - cents)} en el fondo común.
          </p>
        )}
      </fieldset>

      <Field id="rp-description" label="Descripción" className="md:col-span-2">
        <Textarea id="rp-description" placeholder="Ej.: reparto de ganancias de octubre" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={busy}>
          Registrar reparto
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
