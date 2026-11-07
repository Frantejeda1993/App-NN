import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'
import { WORKSHOP_SHARE_KEY, validateShares } from '@/domain/percent'

/** Importe en céntimos de euro (entero, puede ser negativo). */
export const centsSchema = z.number().int('Debe ser un importe en céntimos')
/** Importe en céntimos > 0. */
export const positiveCentsSchema = centsSchema.positive('El importe debe ser mayor a 0')
/** Importe en céntimos ≥ 0. */
export const nonNegativeCentsSchema = centsSchema.nonnegative('El importe no puede ser negativo')
/** Porcentaje en puntos básicos (0–10000 = 0–100 %). */
export const bpSchema = z.number().int().min(0).max(10000)

/** Fecha de negocio sin hora, "YYYY-MM-DD" (sin problemas de zona horaria). */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato AAAA-MM-DD')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
  }, 'Fecha inexistente')

export const nullableIsoDate = isoDateSchema.nullable().default(null)

/** Email de socio normalizado (id de members/). */
export const emailKeySchema = z
  .email('Email inválido')
  .refine((e) => e === e.trim().toLowerCase(), 'El email debe estar en minúsculas')

export const idSchema = z.string().min(1).max(128)
export const nullableId = idSchema.nullable().default(null)

export const nameSchema = z.string().trim().min(1, 'Obligatorio').max(200)
export const textSchema = z.string().max(5000).default('')
export const urlSchema = z.union([z.url(), z.literal('')]).default('')

/**
 * Reparto en bp entre socios (por email) y el taller ("taller"). Debe sumar 100 %.
 */
export const SharesSchema = z
  .record(z.string(), bpSchema)
  .superRefine((shares, ctx) => {
    for (const key of Object.keys(shares)) {
      if (key !== WORKSHOP_SHARE_KEY && !emailKeySchema.safeParse(key).success) {
        ctx.addIssue({ code: 'custom', message: `"${key}" no es un socio válido`, path: [key] })
      }
    }
    const v = validateShares(shares)
    if (!v.ok) ctx.addIssue({ code: 'custom', message: v.error ?? 'Reparto inválido' })
  })

export const timestampSchema = z.custom<Timestamp>((v) => v instanceof Timestamp, 'Fecha del servidor inválida')

/** Campos de auditoría que agrega la capa de datos (y validan las reglas). */
export const AuditFieldsSchema = z.object({
  createdBy: emailKeySchema,
  createdAt: timestampSchema,
  updatedBy: emailKeySchema,
  updatedAt: timestampSchema,
})
export type AuditFields = z.infer<typeof AuditFieldsSchema>

/** Documento leído: datos + auditoría + id. */
export type Stored<T> = T & AuditFields & { id: string }
