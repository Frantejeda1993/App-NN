import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/form'
import { ClientDataSchema } from '@/model'

export const ClientFormSchema = ClientDataSchema.pick({
  name: true,
  phone: true,
  email: true,
  address: true,
  source: true,
  notes: true,
  followUp: true,
})
export type ClientFormValues = z.output<typeof ClientFormSchema>

const EMPTY: ClientFormValues = { name: '', phone: '', email: '', address: '', source: '', notes: '', followUp: true }

export function ClientForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: ClientFormValues
  submitLabel: string
  onSubmit: (values: ClientFormValues) => void
  onCancel?: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof ClientFormSchema>, unknown, ClientFormValues>({
    resolver: zodResolver(ClientFormSchema),
    defaultValues: initial ?? EMPTY,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2" noValidate>
      <Field id="client-name" label="Nombre *" error={errors.name?.message} className="md:col-span-2">
        <Input id="client-name" autoComplete="off" aria-invalid={!!errors.name} {...register('name')} />
      </Field>
      <Field id="client-phone" label="Teléfono" error={errors.phone?.message} hint="Números de España sin prefijo; de otro país con +código (ej. +54…)">
        <Input id="client-phone" type="tel" inputMode="tel" {...register('phone')} />
      </Field>
      <Field id="client-email" label="Email" error={errors.email?.message}>
        <Input id="client-email" type="email" aria-invalid={!!errors.email} {...register('email')} />
      </Field>
      <Field id="client-address" label="Dirección" error={errors.address?.message}>
        <Input id="client-address" {...register('address')} />
      </Field>
      <Field id="client-source" label="Origen" hint="Wallapop, recomendación, Instagram…" error={errors.source?.message}>
        <Input id="client-source" {...register('source')} />
      </Field>
      <Field id="client-notes" label="Notas" error={errors.notes?.message} className="md:col-span-2">
        <Textarea id="client-notes" {...register('notes')} />
      </Field>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" className="size-4 accent-[var(--primary)]" {...register('followUp')} />
        Seguimiento activo (avisarme si pasa mucho tiempo sin contacto)
      </label>
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
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
