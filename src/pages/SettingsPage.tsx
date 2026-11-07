import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, Field, Input } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import { useWorkshopSettings } from '@/data/hooks'
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
    </section>
  )
}
