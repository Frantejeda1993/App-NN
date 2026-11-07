import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import type { Box, Member, Project } from '@/data/api'
import { todayIso } from '@/domain/dates'
import { formatEuros, parseEuros } from '@/domain/money'
import { MovementDataSchema, type MovementData, type MovementType } from '@/model'
import { FORM_TYPES, TYPE_LABELS } from './labels'

const toInput = (cents: number) => formatEuros(cents).replace(/\s?€/, '')

/** Errores que ya se muestran junto a su campo. */
const SHOWN_INLINE = new Set([
  'amountCents',
  'date',
  'projectId',
  'projectSplits',
  'boxId',
  'toBoxId',
  'paidBy',
  'memberEmail',
  'category',
  'description',
])

interface SplitRow {
  projectId: string
  amount: string
}

export interface MovementFormProps {
  boxes: Box[]
  members: Member[]
  projects: Project[]
  /** Lo que el taller le debe a cada socio (para el reintegro). */
  debts?: Record<string, number>
  initial?: Partial<MovementData>
  submitLabel: string
  onSubmit: (data: MovementData) => boolean
  onCancel?: () => void
}

export function MovementForm({ boxes, members, projects, debts = {}, initial, submitLabel, onSubmit, onCancel }: MovementFormProps) {
  const [type, setType] = useState<MovementType>(initial?.type ?? 'cobro')
  const [amount, setAmount] = useState(initial?.amountCents ? toInput(initial.amountCents) : '')
  const [date, setDate] = useState(initial?.date ?? todayIso())
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [pending, setPending] = useState(initial?.status === 'pendiente_pago')
  const [payer, setPayer] = useState<'box' | 'member'>(initial?.paidBy ? 'member' : 'box')
  const [boxId, setBoxId] = useState(initial?.boxId ?? '')
  const [toBoxId, setToBoxId] = useState(initial?.toBoxId ?? '')
  const [paidBy, setPaidBy] = useState(initial?.paidBy ?? '')
  const [memberEmail, setMemberEmail] = useState(initial?.memberEmail ?? '')
  const [projectId, setProjectId] = useState(initial?.projectId ?? '')
  const [splitMode, setSplitMode] = useState((initial?.projectSplits?.length ?? 0) > 0)
  const [splits, setSplits] = useState<SplitRow[]>(
    initial?.projectSplits?.length
      ? initial.projectSplits.map((s) => ({ projectId: s.projectId, amount: toInput(s.amountCents) }))
      : [
          { projectId: '', amount: '' },
          { projectId: '', amount: '' },
        ],
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isExpense = type === 'gasto_proyecto' || type === 'gasto_general'
  const usesMember = type === 'retiro' || type === 'aporte' || type === 'reintegro'
  const activeBoxes = boxes.filter((b) => b.active || b.id === initial?.boxId || b.id === initial?.toBoxId)
  const activeMembers = members.filter((m) => m.active || m.email === initial?.paidBy || m.email === initial?.memberEmail)
  const keepProjects = new Set([initial?.projectId, ...(initial?.projectSplits ?? []).map((s) => s.projectId)])
  const selectableProjects = projects.filter((p) => p.status !== 'archivado' || keepProjects.has(p.id))
  const types = initial?.type === 'gasto_general' ? [...FORM_TYPES, 'gasto_general' as const] : FORM_TYPES

  const splitTotal = splits.reduce((s, r) => s + (parseEuros(r.amount) ?? 0), 0)
  const amountCents = parseEuros(amount)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (amountCents === null || amountCents <= 0) errs.amountCents = 'Escribí un importe mayor a 0'
    const splitCents = splits.map((r) => parseEuros(r.amount))
    if (type === 'gasto_proyecto' && splitMode && splitCents.some((c) => c === null || c <= 0)) {
      errs.projectSplits = 'Cada parte del reparto necesita un importe mayor a 0'
    }

    // Un gasto usa caja solo si ya se pagó desde una caja; el resto de tipos siempre.
    const usesBox = isExpense ? !pending && payer === 'box' : true
    const data = {
      type,
      status: isExpense && pending ? 'pendiente_pago' : 'pagado',
      amountCents: amountCents ?? 0,
      date,
      description,
      category: isExpense ? category : '',
      boxId: usesBox ? boxId || null : null,
      toBoxId: type === 'transferencia' ? toBoxId || null : null,
      paidBy: isExpense && !pending && payer === 'member' ? paidBy || null : null,
      memberEmail: usesMember ? memberEmail || null : null,
      projectId: type === 'cobro' || (type === 'gasto_proyecto' && !splitMode) ? projectId || null : null,
      projectSplits:
        type === 'gasto_proyecto' && splitMode
          ? splits.map((r, i) => ({ projectId: r.projectId, amountCents: splitCents[i] ?? 0 }))
          : [],
      generalExpenseId: type === 'gasto_general' ? (initial?.generalExpenseId ?? null) : null,
    }
    const parsed = MovementDataSchema.safeParse(data)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        errs[key] ??= issue.message
      }
    }
    setErrors(errs)
    if (Object.keys(errs).length > 0 || !parsed.success) return
    onSubmit(parsed.data)
  }

  const boxSelect = (id: string, label: string, value: string, set: (v: string) => void, error?: string) => (
    <Field id={id} label={label} error={error}>
      <Select id={id} value={value} onChange={(e) => set(e.target.value)} aria-invalid={!!error}>
        <option value="">Elegí una caja…</option>
        {activeBoxes.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>
    </Field>
  )

  const projectOptions = (
    <>
      <option value="">Elegí un proyecto…</option>
      {selectableProjects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.title}
        </option>
      ))}
    </>
  )

  return (
    <form noValidate onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <Field id="mv-type" label="Tipo de movimiento" className="md:col-span-2">
        <Select id="mv-type" value={type} onChange={(e) => setType(e.target.value as MovementType)}>
          {types.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </Field>

      <Field id="mv-amount" label="Importe (€) *" error={errors.amountCents}>
        <Input
          id="mv-amount"
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          aria-invalid={!!errors.amountCents}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <Field id="mv-date" label="Fecha" error={errors.date}>
        <Input id="mv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      {(type === 'cobro' || type === 'gasto_proyecto') && (
        <div className="flex flex-col gap-2 md:col-span-2">
          {type === 'gasto_proyecto' && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={splitMode} onChange={(e) => setSplitMode(e.target.checked)} className="size-4" />
              Repartir entre varios proyectos (compra compartida)
            </label>
          )}
          {!splitMode || type === 'cobro' ? (
            <Field id="mv-project" label="Proyecto *" error={errors.projectId}>
              <Select id="mv-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-invalid={!!errors.projectId}>
                {projectOptions}
              </Select>
            </Field>
          ) : (
            <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
              <legend className="px-1 text-sm font-medium">Reparto entre proyectos</legend>
              {splits.map((row, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Select
                    aria-label={`Proyecto ${i + 1}`}
                    className="min-w-40 flex-1"
                    value={row.projectId}
                    onChange={(e) => setSplits(splits.map((r, j) => (j === i ? { ...r, projectId: e.target.value } : r)))}
                  >
                    {projectOptions}
                  </Select>
                  <Input
                    aria-label={`Importe proyecto ${i + 1}`}
                    inputMode="decimal"
                    placeholder="0,00"
                    className="w-28 text-right"
                    value={row.amount}
                    onChange={(e) => setSplits(splits.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r)))}
                  />
                  {splits.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar proyecto ${i + 1}`}
                      onClick={() => setSplits(splits.filter((_, j) => j !== i))}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <Button size="sm" variant="outline" onClick={() => setSplits([...splits, { projectId: '', amount: '' }])}>
                  <Plus /> Agregar proyecto
                </Button>
                <span className={amountCents !== null && splitTotal !== amountCents ? 'text-destructive' : 'text-muted-foreground'}>
                  Suma de partes: {formatEuros(splitTotal)}
                  {amountCents !== null && ` de ${formatEuros(amountCents)}`}
                </span>
              </div>
              {errors.projectSplits && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.projectSplits}
                </p>
              )}
            </fieldset>
          )}
        </div>
      )}

      {isExpense && (
        <div className="flex flex-col gap-3 md:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pending} onChange={(e) => setPending(e.target.checked)} className="size-4" />
            Todavía no está pagado (pendiente de pago)
          </label>
          {!pending && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">¿Con qué se pagó?</legend>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="payer" checked={payer === 'box'} onChange={() => setPayer('box')} />
                  Desde una caja del taller
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="payer" checked={payer === 'member'} onChange={() => setPayer('member')} />
                  Lo pagó un socio de su bolsillo
                </label>
              </div>
              {payer === 'box' ? (
                boxSelect('mv-box', 'Caja *', boxId, setBoxId, errors.boxId)
              ) : (
                <Field id="mv-paidby" label="Socio que pagó *" hint="El taller le queda debiendo este importe" error={errors.paidBy ?? errors.boxId}>
                  <Select id="mv-paidby" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                    <option value="">Elegí un socio…</option>
                    {activeMembers.map((m) => (
                      <option key={m.email} value={m.email}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </fieldset>
          )}
          <Field id="mv-category" label="Categoría" hint="Maderas, ferretería, herrajes, LEDs…" error={errors.category}>
            <Input id="mv-category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
        </div>
      )}

      {usesMember && (
        <>
          <Field
            id="mv-member"
            label="Socio *"
            error={errors.memberEmail}
            hint={
              type === 'reintegro' && memberEmail && (debts[memberEmail] ?? 0) !== 0
                ? `El taller le debe ${formatEuros(debts[memberEmail] ?? 0)}`
                : undefined
            }
          >
            <Select id="mv-member" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} aria-invalid={!!errors.memberEmail}>
              <option value="">Elegí un socio…</option>
              {activeMembers.map((m) => (
                <option key={m.email} value={m.email}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          {boxSelect('mv-box', 'Caja *', boxId, setBoxId, errors.boxId)}
        </>
      )}

      {type === 'cobro' && boxSelect('mv-box', 'Caja donde entra *', boxId, setBoxId, errors.boxId)}

      {type === 'transferencia' && (
        <>
          {boxSelect('mv-box', 'Desde la caja *', boxId, setBoxId, errors.boxId)}
          {boxSelect('mv-tobox', 'Hacia la caja *', toBoxId, setToBoxId, errors.toBoxId)}
        </>
      )}

      <Field id="mv-description" label="Descripción" className="md:col-span-2" error={errors.description}>
        <Textarea id="mv-description" placeholder="Ej.: seña cocina, compra de bisagras…" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      {/* Errores sin campo propio (estado, tipo…): que nunca quede un "no hace nada". */}
      {Object.entries(errors)
        .filter(([k]) => !SHOWN_INLINE.has(k))
        .map(([k, msg]) => (
          <p key={k} role="alert" className="text-sm text-destructive md:col-span-2">
            {msg}
          </p>
        ))}

      <div className="flex gap-2 md:col-span-2">
        <Button type="submit">{submitLabel}</Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
