import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, Field, Input } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import { useMembers, useWorkshopSettings } from '@/data/hooks'
import { bpMapToPercentInputs, defaultSharesFor, parsePercentInputs } from '@/domain/projects'
import { SharesEditor } from '@/features/projects/SharesEditor'
import { notifyError, notifyWrite } from '@/lib/notify'
import { WorkshopSettingsSchema } from '@/model'

const FormSchema = WorkshopSettingsSchema.pick({ name: true, contactAlertDays: true })
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
    if (state && !isDirty) reset({ name: state.settings.name, contactAlertDays: state.settings.contactAlertDays })
  }, [state, reset, isDirty])

  if (!state) return <p className="text-sm text-muted-foreground">Cargando…</p>

  return (
    <section className="flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
      <Card>
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
  const discarded =
    state.settings.defaultShares !== null && JSON.stringify(effective) !== JSON.stringify(state.settings.defaultShares)

  return (
    <Card>
      <h2 className="mb-1 font-semibold">Reparto por defecto de los proyectos</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Con esta participación arranca cada proyecto nuevo. Después se puede cambiar en cada uno.
      </p>
      {discarded && (
        <p role="note" className="mb-3 rounded-md bg-amber-500/10 p-2 text-sm text-amber-700 dark:text-amber-300">
          El reparto guardado incluía a un socio que ya no está activo, así que se usa partes iguales. Revisalo y guardalo de
          nuevo.
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
