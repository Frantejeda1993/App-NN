import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { addDays, todayIso } from '@/domain/dates'
import { CONTACT_CHANNELS, isoDateSchema } from '@/model'
import { CHANNEL_LABELS } from './labels'

const ContactFormSchema = z
  .object({
    // "Hoy" se calcula al validar (no al cargar la pantalla).
    date: isoDateSchema.refine((d) => d <= todayIso(), 'El contacto no puede ser a futuro'),
    channel: z.enum(CONTACT_CHANNELS),
    note: z.string().max(5000),
    /** Vacío = sin próxima fecha. */
    nextContactAt: z.union([isoDateSchema, z.literal('')]),
  })
  .refine((v) => v.nextContactAt === '' || v.nextContactAt >= v.date, {
    message: 'El próximo contacto debe ser posterior al registrado',
    path: ['nextContactAt'],
  })
export type ContactFormValues = z.output<typeof ContactFormSchema>

const QUICK_NEXT = [3, 7, 15, 30]

/** `onSubmit` devuelve true si se guardó: solo entonces se limpia el formulario. */
export function ContactForm({ onSubmit }: { onSubmit: (v: ContactFormValues) => boolean }) {
  const today = todayIso()
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(ContactFormSchema),
    defaultValues: { date: today, channel: 'whatsapp', note: '', nextContactAt: '' },
  })

  return (
    <form
      noValidate
      className="grid gap-3 md:grid-cols-2"
      onSubmit={handleSubmit((v) => {
        if (onSubmit(v)) reset({ date: todayIso(), channel: v.channel, note: '', nextContactAt: '' })
      })}
    >
      <Field id="contact-date" label="Fecha" error={errors.date?.message}>
        <Input id="contact-date" type="date" max={today} {...register('date')} />
      </Field>
      <Field id="contact-channel" label="Medio">
        <Select id="contact-channel" {...register('channel')}>
          {CONTACT_CHANNELS.map((c) => (
            <option key={c} value={c}>
              {CHANNEL_LABELS[c]}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="contact-note" label="Qué se habló" error={errors.note?.message} className="md:col-span-2">
        <Textarea id="contact-note" placeholder="Ej.: le pasé el presupuesto, lo revisa con la pareja" {...register('note')} />
      </Field>
      <Field
        id="contact-next"
        label="Próximo contacto"
        hint="Opcional: genera un aviso ese día"
        error={errors.nextContactAt?.message}
        className="md:col-span-2"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input id="contact-next" type="date" min={today} className="w-auto" {...register('nextContactAt')} />
          {QUICK_NEXT.map((d) => (
            <Button
              key={d}
              size="sm"
              variant="outline"
              onClick={() => setValue('nextContactAt', addDays(today, d), { shouldValidate: true })}
            >
              +{d} días
            </Button>
          ))}
        </div>
      </Field>
      <div className="md:col-span-2">
        <Button type="submit">Registrar contacto</Button>
      </div>
    </form>
  )
}
