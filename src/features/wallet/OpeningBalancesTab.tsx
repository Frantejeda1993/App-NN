import { AlertTriangle, CheckCircle2, Save } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, Field, Input, Textarea } from '@/components/ui/form'
import { MoneyInput } from '@/components/ui/money-input'
import { useData, useMyEmail } from '@/data/DataProvider'
import type { Box, Member, OpeningState } from '@/data/api'
import { useBoxes, useMembers, useOpeningBalances } from '@/data/hooks'
import { formatEuros } from '@/domain/money'
import { WORKSHOP_SHARE_KEY } from '@/domain/percent'
import { WORKSHOP_LABEL } from '@/features/projects/labels'
import { notifyError, notifyWrite } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { OpeningBalancesSchema, PersonOpeningSchema, type OpeningBalances, type PersonOpening } from '@/model'

const EMPTY_PERSON: PersonOpening = PersonOpeningSchema.parse({})

/** Columnas por persona (mismas que el panel "Lo que le corresponde a cada uno"). */
const COLUMNS: { key: keyof PersonOpening; label: string; hint: string; negative?: boolean; sign: 1 | -1 }[] = [
  { key: 'projects', label: 'Proyectos', hint: 'Ganancia (o pérdida) de proyectos anterior', negative: true, sign: 1 },
  { key: 'general', label: 'Gastos generales', hint: 'Gastos generales que ya le tocaron', sign: -1 },
  { key: 'aportes', label: 'Aportes', hint: 'Dinero que puso', sign: 1 },
  { key: 'retiros', label: 'Retiros', hint: 'Dinero que sacó', sign: -1 },
  { key: 'debt', label: 'Le debe el taller', hint: 'Gastos que pagó de su bolsillo y no se le devolvieron', negative: true, sign: 1 },
]

const personTotal = (p: PersonOpening) => COLUMNS.reduce((s, c) => s + c.sign * p[c.key], 0)

/**
 * Configuración inicial de la billetera: dinero con el que arranca cada caja y
 * los montos iniciales de cada socio y del taller (proyectos, gastos, aportes,
 * retiros y lo que les debe el taller). Se suman a lo que calculan los movimientos.
 */
export function OpeningBalancesTab() {
  const boxes = useBoxes()
  const members = useMembers()
  const opening = useOpeningBalances()
  if (!boxes || !members || !opening) return <p className="text-sm text-muted-foreground">Cargando…</p>
  return <OpeningEditor boxes={boxes} members={members} state={opening} />
}

function OpeningEditor({ boxes, members, state }: { boxes: Box[]; members: Member[]; state: OpeningState }) {
  const api = useData()
  const me = useMyEmail()
  const [draft, setDraft] = useState<OpeningBalances>(() => structuredClone(state.opening))
  // Lo que había en el servidor al empezar: si otro socio guarda mientras tanto, se avisa.
  const [base] = useState(() => JSON.stringify(state.opening))
  const changedByOther = JSON.stringify(state.opening) !== base
  const submitting = useRef(false)
  const [busy, setBusy] = useState(false)

  const keys = [
    ...new Set([...members.filter((m) => m.active).map((m) => m.email), ...Object.keys(draft.people).filter((k) => k !== WORKSHOP_SHARE_KEY)]),
    WORKSHOP_SHARE_KEY,
  ]
  const name = (k: string) => (k === WORKSHOP_SHARE_KEY ? WORKSHOP_LABEL : (members.find((m) => m.email === k)?.name ?? k))
  const person = (k: string) => draft.people[k] ?? EMPTY_PERSON
  const setPerson = (k: string, field: keyof PersonOpening, cents: number) =>
    setDraft((d) => ({ ...d, people: { ...d.people, [k]: { ...(d.people[k] ?? EMPTY_PERSON), [field]: cents } } }))
  const setBox = (id: string, cents: number) => setDraft((d) => ({ ...d, boxes: { ...d.boxes, [id]: cents } }))

  const boxesTotal = boxes.reduce((s, b) => s + (draft.boxes[b.id] ?? 0), 0)
  const peopleTotal = keys.reduce((s, k) => s + personTotal(person(k)), 0)
  const squares = boxesTotal === peopleTotal

  function save() {
    if (changedByOther) return notifyError(new Error('Otro socio cambió la configuración inicial mientras editabas. Recargá la página para ver sus cambios.'))
    // Se guardan solo las personas y cajas con algún importe.
    const people = Object.fromEntries(Object.entries(draft.people).filter(([, p]) => COLUMNS.some((c) => p[c.key] !== 0)))
    const boxMap = Object.fromEntries(Object.entries(draft.boxes).filter(([, c]) => c !== 0))
    const parsed = OpeningBalancesSchema.safeParse({ ...draft, people, boxes: boxMap })
    if (!parsed.success) return notifyError(new Error(parsed.error.issues[0]?.message ?? 'Datos inválidos'))
    // Guardar es idempotente (reemplaza el documento); el guardia solo evita el doble clic.
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    try {
      notifyWrite(api.saveOpeningBalances(parsed.data, state.exists, me), 'Configuración inicial guardada')
    } catch (e) {
      notifyError(e)
    } finally {
      queueMicrotask(() => {
        submitting.current = false
        setBusy(false)
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="text-sm text-muted-foreground">
        Cargá cómo estaban las cuentas al empezar a usar la app. Estos montos se suman a todo lo que registren los
        movimientos. Lo podés corregir cuando quieras.
      </Card>

      {changedByOther && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Otro socio cambió la configuración inicial. Recargá la página para ver sus cambios antes de guardar.
        </p>
      )}

      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          <Field id="op-date" label="Fecha de los saldos iniciales" hint="Desde cuándo cuentan los movimientos">
            <Input id="op-date" type="date" value={draft.date ?? ''} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value || null }))} />
          </Field>
          <Field id="op-notes" label="Notas">
            <Textarea id="op-notes" value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Dinero inicial en cada caja</h2>
        {boxes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Primero creá las cajas (pestaña Cajas).</p>
        ) : (
          <ul aria-label="Saldo inicial por caja" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {boxes.map((b) => (
              <li key={b.id}>
                <Field id={`op-box-${b.id}`} label={b.name}>
                  <MoneyInput
                    id={`op-box-${b.id}`}
                    allowNegative
                    nullable
                    placeholder="0,00"
                    cents={draft.boxes[b.id] || null}
                    onChange={(c) => setBox(b.id, c ?? 0)}
                  />
                </Field>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">Montos iniciales de cada socio y del taller</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Lo mismo que muestra el panel en «Lo que le corresponde a cada uno», pero al momento de empezar.
        </p>
        <div className="overflow-x-auto">
          <table aria-label="Montos iniciales por socio" className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-2 font-medium">Socio</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-2 font-medium" title={c.hint}>
                    {c.label}
                  </th>
                ))}
                <th className="pl-2 text-right font-medium">Le corresponde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keys.map((k) => (
                <tr key={k}>
                  <th scope="row" className="py-2 pr-2 text-left font-medium">
                    {name(k)}
                  </th>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="px-1 py-1">
                      <MoneyInput
                        id={`op-${c.key}-${k}`}
                        aria-label={`${c.label}: ${name(k)}`}
                        allowNegative={c.negative}
                        // 0 se muestra vacío: así se escribe el importe sin borrar "0,00" antes.
                        nullable
                        placeholder="0,00"
                        cents={person(k)[c.key] || null}
                        onChange={(v) => setPerson(k, c.key, v ?? 0)}
                      />
                    </td>
                  ))}
                  <td className="pl-2 text-right font-semibold tabular-nums">{formatEuros(personTotal(person(k)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p role="status" className={cn('mt-3 flex items-center gap-2 text-xs', squares ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400')}>
          {squares ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertTriangle className="size-4" />}
          Suma de todos: {formatEuros(peopleTotal)} · dinero inicial en cajas: {formatEuros(boxesTotal)}
          {!squares && ` (diferencia ${formatEuros(peopleTotal - boxesTotal)}: el panel no va a cuadrar hasta que coincidan)`}
        </p>
      </Card>

      <div>
        <Button onClick={save} disabled={busy || changedByOther}>
          <Save /> Guardar configuración inicial
        </Button>
      </div>
    </div>
  )
}
