import { z } from 'zod'
import {
  SharesSchema,
  idSchema,
  nameSchema,
  nonNegativeCentsSchema,
  nullableId,
  nullableIsoDate,
  textSchema,
  isoDateSchema,
} from './common'

// ---- members/{email} (solo lectura desde la app; se crean en la consola) ----
export const MemberDataSchema = z.object({
  name: nameSchema,
  active: z.boolean(),
})
export type MemberData = z.infer<typeof MemberDataSchema>

// ---- settings/workshop -------------------------------------------------------
export const WorkshopSettingsSchema = z.object({
  name: nameSchema.default('Taller NN'),
  taxId: z.string().max(50).default(''),
  address: z.string().max(300).default(''),
  phone: z.string().max(50).default(''),
  email: z.union([z.email(), z.literal('')]).default(''),
  logoUrl: z.string().max(2000).default(''),
  /** Condiciones de pago / plazo por defecto en el PDF. */
  defaultQuoteTerms: textSchema,
  /** Observaciones por defecto en el PDF (garantía, qué no incluye…). */
  defaultQuoteNotes: textSchema,
  quoteValidityDays: z.number().int().min(1).max(365).default(15),
  /** Alerta si un cliente activo lleva más de N días sin contacto. */
  contactAlertDays: z.number().int().min(1).max(365).default(14),
})
export type WorkshopSettings = z.infer<typeof WorkshopSettingsSchema>

// ---- clients -----------------------------------------------------------------
export const ClientDataSchema = z.object({
  name: nameSchema,
  phone: z.string().max(50).default(''),
  email: z.union([z.email(), z.literal('')]).default(''),
  address: z.string().max(300).default(''),
  /** De dónde llegó: Wallapop, recomendación, Instagram… */
  source: z.string().max(100).default(''),
  notes: textSchema,
  /** Fecha del último contacto (se actualiza al registrar uno). */
  lastContactAt: nullableIsoDate,
  /** Próxima fecha a contactar (alerta). */
  nextContactAt: nullableIsoDate,
})
export type ClientData = z.infer<typeof ClientDataSchema>

// ---- clients/{id}/contacts ---------------------------------------------------
export const CONTACT_CHANNELS = ['whatsapp', 'llamada', 'email', 'presencial', 'otro'] as const
export const ContactDataSchema = z.object({
  date: isoDateSchema,
  channel: z.enum(CONTACT_CHANNELS),
  note: textSchema,
  projectId: nullableId,
})
export type ContactData = z.infer<typeof ContactDataSchema>

// ---- projects ----------------------------------------------------------------
export const PROJECT_STATUSES = [
  'pendiente',
  'en_proceso',
  'entregado',
  'finalizado',
  'cobrado',
  'cancelado',
  'archivado',
] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const ProjectDataSchema = z.object({
  clientId: idSchema,
  title: nameSchema,
  summary: textSchema,
  status: z.enum(PROJECT_STATUSES).default('pendiente'),
  requestedAt: nullableIsoDate,
  quotedAt: nullableIsoDate,
  promisedDeliveryAt: nullableIsoDate,
  deliveredAt: nullableIsoDate,
  /** Participación en la ganancia: socios (email) + "taller", suma 100 %. */
  shares: SharesSchema,
  notes: textSchema,
  acceptedQuoteId: nullableId,
  /** Gastos estimados del proyecto (para comparar con los reales). */
  estimatedCostCents: nonNegativeCentsSchema.nullable().default(null),
})
export type ProjectData = z.infer<typeof ProjectDataSchema>
