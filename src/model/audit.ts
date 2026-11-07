import { z } from 'zod'
import { emailKeySchema, idSchema, timestampSchema } from './common'

export const AUDIT_ACTIONS = ['create', 'update', 'delete'] as const

/**
 * auditLog/{entityId}_v{version}: una entrada por cada versión de un movimiento.
 * Las reglas de Firestore exigen que exista en el mismo batch que el cambio.
 */
export const AuditLogSchema = z.object({
  entity: z.literal('movements'),
  entityId: idSchema,
  version: z.number().int().min(1),
  action: z.enum(AUDIT_ACTIONS),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()),
  by: emailKeySchema,
  at: timestampSchema,
})
export type AuditLog = z.infer<typeof AuditLogSchema>

export function auditLogId(entityId: string, version: number): string {
  return `${entityId}_v${version}`
}
