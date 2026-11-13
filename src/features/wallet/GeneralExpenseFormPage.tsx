import { ArrowLeft } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, Field, Input, Select, Textarea } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import type { GeneralExpense, Member } from '@/data/api'
import { useGeneralExpenses, useMembers, useWorkshopSettings } from '@/data/hooks'
import { formatEuros, parseEuros } from '@/domain/money'
import { bpMapToPercentInputs, defaultSharesFor, parsePercentInputs } from '@/domain/projects'
import { SharesEditor } from '@/features/projects/SharesEditor'
import { notifyError, notifyWrite } from '@/lib/notify'
import { GeneralExpenseDataSchema, type GeneralExpenseData } from '@/model'
import { payLink } from './generalExpenseLinks'
import { Loading } from '@/components/ui/loading'

const CATEGORY_SUGGESTIONS = ['Taller', 'Alquiler', 'Servicios', 'Herramientas', 'Insumos', 'Vehículo', 'Otros']
const toInput = (cents: number) => formatEuros(cents).replace(/\s?€/, '')

/** Alta (`/billetera/gastos/nuevo?tipo=fijo|esporadico`) y edición (`/billetera/gastos/:id`). */
export function GeneralExpenseFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const expenses = useGeneralExpenses()
  const members = useMembers()
  const settings = useWorkshopSettings()

  if (!expenses || !members || !settings) return <Loading />
  const existing = id ? expenses.find((g) => g.id === id) : undefined
  if (id && !existing) {
    return (
      <section className="flex flex-col gap-3">
        <p>No se encontró el gasto general.</p>
        <Link to="/billetera?tab=gastos" className="text-primary underline">
          Volver
        </Link>
      </section>
    )
  }
  const kind = existing?.kind ?? (params.get('tipo') === 'esporadico' ? 'esporadico' : 'fijo')
  return (
    <Form
      key={existing?.id ?? 'new'}
      existing={existing}
      kind={kind}
      members={members}
      initialShares={existing?.shares ?? defaultSharesFor(members, settings.settings.defaultShares)}
    />
  )
}

function Form({
  existing,
  kind,
  members,
  initialShares,
}: {
  existing?: GeneralExpense
  kind: 'fijo' | 'esporadico'
  members: Member[]
  initialShares: Record<string, number>
}) {
  const api = useData()
  const me = useMyEmail()
  const navigate = useNavigate()
  // Evita guardar dos veces con doble clic / Enter (la navegación no desmonta al instante).
  const submitting = useRef(false)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState(existing?.name ?? '')
  const [category, setCategory] = useState(existing?.category ?? (kind === 'fijo' ? 'Taller' : 'Herramientas'))
  const [amount, setAmount] = useState(existing ? toInput(existing.amountCents) : '')
  const [day, setDay] = useState(existing?.dayOfMonth ? String(existing.dayOfMonth) : '1')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [shares, setShares] = useState(() => bpMapToPercentInputs(initialShares))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const back = '/billetera?tab=gastos'

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const amountCents = parseEuros(amount)
    if (amountCents === null || amountCents <= 0) errs.amountCents = 'Escribí un importe mayor a 0'
    const parsedShares = parsePercentInputs(shares)
    if (!parsedShares.ok) errs.shares = parsedShares.error
    const data: GeneralExpenseData = {
      name,
      kind,
      category,
      amountCents: amountCents ?? 0,
      dayOfMonth: kind === 'fijo' ? Number(day) : null,
      shares: parsedShares.shares ?? {},
      active: existing?.active ?? true,
      notes,
    }
    const parsed = GeneralExpenseDataSchema.safeParse(data)
    if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0] ?? 'form')] ??= i.message
    setErrors(errs)
    if (Object.keys(errs).length > 0 || !parsed.success) return
    if (submitting.current) return
    submitting.current = true
    setBusy(true)

    try {
      if (existing) {
        notifyWrite(api.updateGeneralExpense(existing.id, parsed.data, me), 'Gasto actualizado')
        navigate(back)
      } else {
        const res = api.createGeneralExpense(parsed.data, me)
        notifyWrite(res, 'Gasto creado')
        // Un esporádico se crea para pagarlo ya: se pasa directo al pago.
        navigate(kind === 'esporadico' ? payLink(res.id) : back, { replace: true })
      }
    } catch (err) {
      submitting.current = false
      setBusy(false)
      notifyError(err)
    }
  }

  return (
    <section className="flex max-w-3xl flex-col gap-4">
      <Link to={back} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Gastos generales
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        {existing ? 'Editar gasto' : kind === 'fijo' ? 'Nuevo gasto fijo' : 'Nuevo gasto esporádico'}
      </h1>
      <Card>
        <form noValidate onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <Field id="ge-name" label="Nombre *" error={errors.name} className="md:col-span-2">
            <Input
              id="ge-name"
              placeholder={kind === 'fijo' ? 'Ej.: Alquiler del taller' : 'Ej.: Router Dewalt'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field id="ge-category" label="Categoría *" error={errors.category}>
            <Input id="ge-category" list="ge-categories" value={category} onChange={(e) => setCategory(e.target.value)} />
            <datalist id="ge-categories">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field
            id="ge-amount"
            label={kind === 'fijo' ? 'Importe habitual (€) *' : 'Importe (€) *'}
            error={errors.amountCents}
          >
            <Input id="ge-amount" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          {kind === 'fijo' && (
            <Field id="ge-day" label="Vence el día del mes" hint="Del 1 al 28" error={errors.dayOfMonth}>
              <Select id="ge-day" value={day} onChange={(e) => setDay(e.target.value)}>
                {Array.from({ length: 28 }, (_, i) => String(i + 1)).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field id="ge-notes" label="Notas" className="md:col-span-2">
            <Textarea id="ge-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <SharesEditor idPrefix="ge-share" members={members} value={shares} onChange={setShares} />
            {errors.shares && (
              <p role="alert" className="mt-1 text-sm text-destructive">
                No se puede guardar: {errors.shares}
              </p>
            )}
          </div>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={busy}>
              {existing ? 'Guardar cambios' : kind === 'esporadico' ? 'Crear y registrar pago' : 'Crear gasto fijo'}
            </Button>
            <Button variant="outline" onClick={() => navigate(back)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </section>
  )
}
