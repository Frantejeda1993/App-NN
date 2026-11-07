import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import type { Client, Member } from '@/data/api'
import { formatEuros, parseEuros } from '@/domain/money'
import { bpMapToPercentInputs, parsePercentInputs } from '@/domain/projects'
import { isoDateSchema, nameSchema, type ProjectData } from '@/model'
import { SharesEditor } from './SharesEditor'

const dateOrEmpty = z.union([isoDateSchema, z.literal('')])

const ProjectFormSchema = z.object({
  title: nameSchema,
  clientId: z.string().min(1, 'Elegí un cliente'),
  summary: z.string().max(5000),
  requestedAt: dateOrEmpty,
  quotedAt: dateOrEmpty,
  promisedDeliveryAt: dateOrEmpty,
  notes: z.string().max(5000),
  estimatedCost: z.string().refine((s) => s.trim() === '' || (parseEuros(s) ?? -1) >= 0, 'Importe inválido'),
})
type FormValues = z.output<typeof ProjectFormSchema>

/** Campos editables del proyecto que maneja este formulario. */
export type ProjectFormResult = Pick<
  ProjectData,
  'title' | 'clientId' | 'summary' | 'requestedAt' | 'quotedAt' | 'promisedDeliveryAt' | 'notes' | 'estimatedCostCents' | 'shares'
>

const orNull = (s: string) => (s === '' ? null : s)

export function ProjectForm({
  clients,
  members,
  initial,
  initialShares,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  clients: Client[]
  members: Member[]
  initial?: Partial<ProjectData>
  initialShares: Record<string, number>
  submitLabel: string
  onSubmit: (values: ProjectFormResult) => boolean
  onCancel?: () => void
}) {
  const [shares, setShares] = useState(() => bpMapToPercentInputs(initialShares))
  const [sharesError, setSharesError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(ProjectFormSchema),
    defaultValues: {
      title: initial?.title ?? '',
      clientId: initial?.clientId ?? '',
      summary: initial?.summary ?? '',
      requestedAt: initial?.requestedAt ?? '',
      quotedAt: initial?.quotedAt ?? '',
      promisedDeliveryAt: initial?.promisedDeliveryAt ?? '',
      notes: initial?.notes ?? '',
      estimatedCost:
        initial?.estimatedCostCents != null ? formatEuros(initial.estimatedCostCents).replace(/\s?€/, '') : '',
    },
  })

  return (
    <form
      noValidate
      className="grid gap-4 md:grid-cols-2"
      onSubmit={handleSubmit((v) => {
        const parsed = parsePercentInputs(shares)
        if (!parsed.ok) {
          setSharesError(parsed.error)
          return
        }
        setSharesError(null)
        onSubmit({
          title: v.title,
          clientId: v.clientId,
          summary: v.summary,
          requestedAt: orNull(v.requestedAt),
          quotedAt: orNull(v.quotedAt),
          promisedDeliveryAt: orNull(v.promisedDeliveryAt),
          notes: v.notes,
          estimatedCostCents: v.estimatedCost.trim() === '' ? null : parseEuros(v.estimatedCost),
          shares: parsed.shares,
        })
      })}
    >
      <Field id="project-title" label="Título *" error={errors.title?.message} className="md:col-span-2">
        <Input id="project-title" placeholder="Ej.: Cocina en L" aria-invalid={!!errors.title} {...register('title')} />
      </Field>
      <Field id="project-client" label="Cliente *" error={errors.clientId?.message} className="md:col-span-2">
        <Select id="project-client" aria-invalid={!!errors.clientId} {...register('clientId')}>
          <option value="">Elegí un cliente…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="project-summary" label="Resumen" className="md:col-span-2">
        <Textarea id="project-summary" placeholder="Qué hay que hacer" {...register('summary')} />
      </Field>
      <Field id="project-requested" label="Fecha de solicitud" error={errors.requestedAt?.message}>
        <Input id="project-requested" type="date" {...register('requestedAt')} />
      </Field>
      <Field id="project-quoted" label="Fecha de presupuesto" error={errors.quotedAt?.message}>
        <Input id="project-quoted" type="date" {...register('quotedAt')} />
      </Field>
      <Field id="project-promised" label="Entrega comprometida" error={errors.promisedDeliveryAt?.message}>
        <Input id="project-promised" type="date" {...register('promisedDeliveryAt')} />
      </Field>
      <Field id="project-estimated" label="Gastos estimados (€)" hint="Para comparar con los gastos reales" error={errors.estimatedCost?.message}>
        <Input id="project-estimated" inputMode="decimal" placeholder="0,00" {...register('estimatedCost')} />
      </Field>
      <Field id="project-notes" label="Notas" className="md:col-span-2">
        <Textarea id="project-notes" {...register('notes')} />
      </Field>
      <div className="md:col-span-2">
        <SharesEditor members={members} value={shares} onChange={setShares} />
        {sharesError && (
          <p role="alert" className="mt-1 text-sm text-destructive">
            No se puede guardar: {sharesError}
          </p>
        )}
      </div>
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
