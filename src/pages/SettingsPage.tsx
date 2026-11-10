import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, Field, Input, Textarea } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import { useMembers, useWorkshopSettings } from '@/data/hooks'
import { bpMapToPercentInputs, defaultSharesFor, parsePercentInputs } from '@/domain/projects'
import { SharesEditor } from '@/features/projects/SharesEditor'
import { useTour } from '@/features/tour/tourContext'
import { notifyError, notifyWrite } from '@/lib/notify'
import { WorkshopSettingsSchema } from '@/model'

const FormSchema = WorkshopSettingsSchema.pick({
  name: true,
  taxId: true,
  address: true,
  phone: true,
  email: true,
  contactAlertDays: true,
  quoteValidityDays: true,
  defaultQuoteTerms: true,
  defaultQuoteNotes: true,
})
const FORM_KEYS = Object.keys(FormSchema.shape) as (keyof FormValues)[]
type FormValues = z.output<typeof FormSchema>

export function SettingsPage() {
  const api = useData()
  const me = useMyEmail()
  const state = useWorkshopSettings()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<z.input<typeof FormSchema>, unknown, FormValues>({ resolver: zodResolver(FormSchema) })

  // Carga los valores guardados, pero nunca pisa lo que el usuario está editando
  // (llegada del dato del servidor tras la caché, o cambio de otro socio).
  useEffect(() => {
    if (state && !isDirty) reset(Object.fromEntries(FORM_KEYS.map((k) => [k, state.settings[k]])) as FormValues)
  }, [state, reset, isDirty])

  if (!state) return <p className="text-sm text-muted-foreground">Cargando…</p>

  return (
    <section className="flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
      <Card data-tour="ajustes-taller">
        <h2 className="mb-1 font-semibold">Datos del taller</h2>
        <p className="mb-3 text-sm text-muted-foreground">Salen en el encabezado y el pie de los presupuestos en PDF.</p>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((v) => {
            try {
              notifyWrite(api.saveWorkshopSettings({ ...state.settings, ...v }, state.exists, me), 'Ajustes guardados')
            } catch (e) {
              notifyError(e)
            }
          })}
        >
          <Field id="settings-name" label="Nombre del taller" error={errors.name?.message}>
            <Input id="settings-name" {...register('name')} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="settings-tax" label="NIF / CIF" error={errors.taxId?.message}>
              <Input id="settings-tax" {...register('taxId')} />
            </Field>
            <Field id="settings-phone" label="Teléfono" error={errors.phone?.message}>
              <Input id="settings-phone" type="tel" {...register('phone')} />
            </Field>
            <Field id="settings-email" label="Email" error={errors.email?.message}>
              <Input id="settings-email" type="email" {...register('email')} />
            </Field>
            <Field id="settings-address" label="Dirección" error={errors.address?.message}>
              <Input id="settings-address" {...register('address')} />
            </Field>
          </div>
          <h3 className="mt-2 text-sm font-semibold">Presupuestos</h3>
          <Field
            id="settings-validity"
            label="Validez (días)"
            hint="Con esto se calcula «Válido hasta» de cada presupuesto nuevo"
            error={errors.quoteValidityDays?.message}
          >
            <Input
              id="settings-validity"
              type="number"
              min={1}
              max={365}
              className="w-32"
              {...register('quoteValidityDays', { valueAsNumber: true })}
            />
          </Field>
          <Field
            id="settings-terms"
            label="Condiciones de pago y plazo"
            hint="Texto inicial de cada presupuesto nuevo"
            error={errors.defaultQuoteTerms?.message}
          >
            <Textarea id="settings-terms" {...register('defaultQuoteTerms')} />
          </Field>
          <Field id="settings-notes" label="Observaciones" hint="Garantía, qué no incluye…" error={errors.defaultQuoteNotes?.message}>
            <Textarea id="settings-notes" {...register('defaultQuoteNotes')} />
          </Field>
          <h3 className="mt-2 text-sm font-semibold">Clientes</h3>
          <Field
            id="settings-alert-days"
            label="Avisar si un cliente lleva más de N días sin contacto"
            error={errors.contactAlertDays?.message}
          >
            <Input
              id="settings-alert-days"
              type="number"
              min={1}
              max={365}
              className="w-32"
              {...register('contactAlertDays', { valueAsNumber: true })}
            />
          </Field>
          <div>
            <Button type="submit" disabled={!isDirty}>
              Guardar
            </Button>
          </div>
        </form>
      </Card>
      <DefaultSharesCard key={state.exists ? 'saved' : 'new'} />
      <TourCard />
    </section>
  )
}

/** Reparto con el que arranca cada proyecto nuevo (se puede cambiar por proyecto). */
function DefaultSharesCard() {
  const api = useData()
  const me = useMyEmail()
  const state = useWorkshopSettings()
  const members = useMembers()
  // Se inicializa una sola vez con lo guardado; después es del usuario.
  const [value, setValue] = useState<Record<string, string> | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!state || !members) return null
  const effective = defaultSharesFor(members, state.settings.defaultShares)
  const current = value ?? bpMapToPercentInputs(effective)
  // El guardado menciona a un socio que ya no está activo: se usa partes iguales.
  const discarded = state.settings.defaultShares !== null && JSON.stringify(effective) !== JSON.stringify(state.settings.defaultShares)

  return (
    <Card>
      <h2 className="mb-1 font-semibold">Reparto por defecto de los proyectos</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Con esta participación arranca cada proyecto nuevo. Después se puede cambiar en cada uno.
      </p>
      {discarded && (
        <p role="note" className="mb-3 rounded-md bg-amber-500/10 p-2 text-sm text-amber-700 dark:text-amber-300">
          El reparto guardado incluía a un socio que ya no está activo, así que se usa partes iguales. Revisalo y guardalo de nuevo.
        </p>
      )}
      <SharesEditor idPrefix="default-share" members={members} value={current} onChange={setValue} />
      {error && (
        <p role="alert" className="mt-1 text-sm text-destructive">
          No se puede guardar: {error}
        </p>
      )}
      <Button
        className="mt-3"
        disabled={value === null}
        onClick={() => {
          const parsed = parsePercentInputs(current)
          if (!parsed.ok) {
            setError(parsed.error)
            return
          }
          setError(null)
          try {
            notifyWrite(
              api.saveWorkshopSettings({ ...state.settings, defaultShares: parsed.shares }, state.exists, me),
              'Reparto por defecto guardado',
            )
            setValue(null)
          } catch (e) {
            notifyError(e)
          }
        }}
      >
        Guardar reparto
      </Button>
    </Card>
  )
}

/** Repetir el recorrido guiado de la app. */
function TourCard() {
  const tour = useTour()
  return (
    <Card>
      <h2 className="mb-1 font-semibold">Tour de la app</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Un recorrido por todas las secciones: cómo se usa cada una y por qué funciona así.
      </p>
      <Button variant="outline" onClick={tour.start}>
        Repetir el tour
      </Button>
    </Card>
  )
}
