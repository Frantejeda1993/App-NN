import { z } from 'zod'
import { WORKSHOP_SHARE_KEY } from '@/domain/percent'
import {
  SharesSchema,
  centsSchema,
  emailKeySchema,
  idSchema,
  isoDateSchema,
  nameSchema,
  nonNegativeCentsSchema,
  nullableId,
  nullableIsoDate,
  positiveCentsSchema,
  textSchema,
} from './common'

// ---- boxes (cajas) -----------------------------------------------------------
export const BoxDataSchema = z.object({
  name: nameSchema,
  active: z.boolean().default(true),
})
export type BoxData = z.infer<typeof BoxDataSchema>

// ---- generalExpenses ---------------------------------------------------------
export const GENERAL_EXPENSE_KINDS = ['fijo', 'esporadico'] as const
export const GeneralExpenseDataSchema = z
  .object({
    name: nameSchema,
    kind: z.enum(GENERAL_EXPENSE_KINDS),
    /** Taller, Herramientas, Insumos… */
    category: nameSchema,
    /** Importe habitual (fijo) o del gasto puntual (esporádico). */
    amountCents: positiveCentsSchema,
    /** Día del mes en que vence un gasto fijo. */
    dayOfMonth: z.number().int().min(1).max(28).nullable().default(null),
    /** Cómo se reparte entre socios y taller (suma 100 %). */
    shares: SharesSchema,
    active: z.boolean().default(true),
    notes: textSchema,
  })
  .refine((g) => g.kind !== 'fijo' || g.dayOfMonth !== null, {
    message: 'Un gasto fijo necesita el día del mes',
    path: ['dayOfMonth'],
  })
export type GeneralExpenseData = z.infer<typeof GeneralExpenseDataSchema>

// ---- movements ---------------------------------------------------------------
export const MOVEMENT_TYPES = [
  'cobro', // ingreso de un proyecto (seña o pago)
  'gasto_proyecto',
  'gasto_general',
  'retiro', // un socio saca dinero
  'aporte', // un socio pone dinero
  'transferencia', // entre cajas
  'reintegro', // el taller le devuelve a un socio un gasto que pagó de su bolsillo
  'reparto', // pasa fondo común del taller a la ganancia de un socio (no mueve cajas)
] as const
export type MovementType = (typeof MOVEMENT_TYPES)[number]

export const MOVEMENT_STATUSES = ['pagado', 'pendiente_pago'] as const

const ProjectSplitSchema = z.object({ projectId: idSchema, amountCents: positiveCentsSchema })

/**
 * Máximo de partes de un reparto entre proyectos. Las reglas revisan y suman
 * cada parte por separado y tienen un tope de 1000 expresiones por escritura:
 * con más partes se pasaría ese tope y Firestore rechazaría el movimiento.
 */
export const MAX_PROJECT_SPLITS = 10

/** Tipos de movimiento que llevan un socio. */
export const MEMBER_MOVEMENT_TYPES: readonly MovementType[] = ['retiro', 'aporte', 'reintegro', 'reparto']

/** Campos del movimiento sin las reglas cruzadas (ver MovementDataSchema). */
export const MovementBaseSchema = z.object({
    type: z.enum(MOVEMENT_TYPES),
    status: z.enum(MOVEMENT_STATUSES).default('pagado'),
    amountCents: positiveCentsSchema,
    date: isoDateSchema,
    /** Caja de la que sale / a la que entra el dinero. */
    boxId: nullableId,
    /** Caja destino (solo transferencias). */
    toBoxId: nullableId,
    /** Socio que pagó de su bolsillo (el taller le queda debiendo). */
    paidBy: emailKeySchema.nullable().default(null),
    /** Socio del retiro / aporte / reintegro. */
    memberEmail: emailKeySchema.nullable().default(null),
    projectId: nullableId,
    /** Gasto compartido entre varios proyectos (las partes suman el total). */
    projectSplits: z.array(ProjectSplitSchema).max(50).default([]),
    generalExpenseId: nullableId,
    category: z.string().max(100).default(''),
    description: textSchema,
})

export const MovementDataSchema = MovementBaseSchema.superRefine((m, ctx) => {
    const issue = (message: string, path: string) => ctx.addIssue({ code: 'custom', message, path: [path] })
    const isExpense = m.type === 'gasto_proyecto' || m.type === 'gasto_general'
    const usesMember = MEMBER_MOVEMENT_TYPES.includes(m.type)

    if (m.status === 'pendiente_pago' && !isExpense) issue('Solo un gasto puede quedar pendiente de pago', 'status')
    if (m.type !== 'transferencia' && m.toBoxId) issue('Solo una transferencia tiene caja destino', 'toBoxId')
    // Campos que no corresponden al tipo: evitan que un dato suelto se cuente dos veces.
    if (!usesMember && m.memberEmail) issue('Este tipo de movimiento no lleva socio', 'memberEmail')
    if (m.type !== 'gasto_proyecto' && m.projectSplits.length > 0) issue('Solo un gasto de proyecto se reparte', 'projectSplits')
    if (m.type !== 'gasto_general' && m.generalExpenseId) issue('Solo un gasto general lleva gasto asociado', 'generalExpenseId')
    if (m.type !== 'cobro' && m.type !== 'gasto_proyecto' && m.projectId) issue('Este tipo de movimiento no lleva proyecto', 'projectId')
    if (m.status === 'pendiente_pago' && (m.boxId || m.paidBy)) issue('Un gasto pendiente todavía no tiene origen del dinero', 'boxId')
    const splitIds = m.projectSplits.map((p) => p.projectId)
    if (new Set(splitIds).size !== splitIds.length) issue('Un proyecto aparece dos veces en el reparto', 'projectSplits')
    if (m.projectSplits.length > MAX_PROJECT_SPLITS) issue(`Como máximo ${MAX_PROJECT_SPLITS} proyectos en un reparto`, 'projectSplits')

    switch (m.type) {
      case 'cobro':
        if (!m.projectId) issue('Un cobro debe ser de un proyecto', 'projectId')
        if (!m.boxId) issue('Elegí en qué caja entra el dinero', 'boxId')
        break
      case 'gasto_proyecto':
      case 'gasto_general': {
        if (m.type === 'gasto_proyecto') {
          if (!m.projectId && m.projectSplits.length === 0) issue('Elegí el proyecto del gasto', 'projectId')
          if (m.projectId && m.projectSplits.length > 0) issue('Usá un proyecto o un reparto, no ambos', 'projectSplits')
          if (m.projectSplits.length > 0) {
            const total = m.projectSplits.reduce((s, p) => s + p.amountCents, 0)
            if (total !== m.amountCents) issue('Las partes del reparto deben sumar el total', 'projectSplits')
          }
        } else if (!m.generalExpenseId) {
          issue('Elegí el gasto general', 'generalExpenseId')
        }
        if (m.status === 'pagado') {
          if (!m.boxId && !m.paidBy) issue('Indicá si se pagó desde una caja o un socio', 'boxId')
          if (m.boxId && m.paidBy) issue('Desde una caja O del bolsillo de un socio, no ambos', 'paidBy')
        }
        break
      }
      case 'retiro':
      case 'aporte':
      case 'reintegro':
        if (!m.memberEmail) issue('Elegí el socio', 'memberEmail')
        if (!m.boxId) issue('Elegí la caja', 'boxId')
        break
      case 'reparto':
        if (!m.memberEmail) issue('Elegí el socio', 'memberEmail')
        if (m.boxId) issue('Un reparto del fondo del taller no mueve dinero de las cajas', 'boxId')
        break
      case 'transferencia':
        if (!m.boxId || !m.toBoxId) issue('Elegí caja de origen y destino', 'toBoxId')
        else if (m.boxId === m.toBoxId) issue('Las cajas deben ser distintas', 'toBoxId')
        break
    }
    if (m.type !== 'gasto_proyecto' && m.type !== 'gasto_general' && m.paidBy) {
      issue('Solo un gasto puede pagarse del bolsillo de un socio', 'paidBy')
    }
  })
export type MovementData = z.infer<typeof MovementDataSchema>

/** Campos que maneja la capa de datos (no el formulario). */
export const MovementControlSchema = z.object({
  version: z.number().int().min(1),
  deleted: z.boolean(),
  deletedReason: z.string().max(500).default(''),
})
export type MovementControl = z.infer<typeof MovementControlSchema>

// ---- settings/opening: saldos iniciales (al empezar a usar la app) -----------

/** Montos con los que arranca cada socio y el taller (mismas columnas que el panel). */
export const PersonOpeningSchema = z.object({
  /** Ganancia (o pérdida) de proyectos anterior. */
  projects: centsSchema.default(0),
  /** Gastos generales que ya le tocaron. */
  general: nonNegativeCentsSchema.default(0),
  aportes: nonNegativeCentsSchema.default(0),
  retiros: nonNegativeCentsSchema.default(0),
  /** Lo que el taller le debe (gastos que pagó de su bolsillo). */
  debt: centsSchema.default(0),
})
export type PersonOpening = z.infer<typeof PersonOpeningSchema>

export const OpeningBalancesSchema = z.object({
  /** Fecha a la que corresponden los saldos. */
  date: nullableIsoDate,
  /** Dinero inicial de cada caja (por id). */
  boxes: z.record(idSchema, centsSchema).default({}),
  /** Por socio (email) y "taller". */
  people: z
    .record(z.string(), PersonOpeningSchema)
    .default({})
    .superRefine((people, ctx) => {
      for (const key of Object.keys(people)) {
        if (key !== WORKSHOP_SHARE_KEY && !emailKeySchema.safeParse(key).success) {
          ctx.addIssue({ code: 'custom', message: `"${key}" no es un socio válido`, path: [key] })
        }
      }
    }),
  notes: textSchema,
})
export type OpeningBalances = z.infer<typeof OpeningBalancesSchema>
