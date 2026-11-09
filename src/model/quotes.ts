import { z } from 'zod'
import {
  bpSchema,
  centsSchema,
  idSchema,
  nameSchema,
  nonNegativeCentsSchema,
  nullableId,
  nullableIsoDate,
  textSchema,
} from './common'

const mmSchema = z.number().positive('La medida debe ser mayor a 0').max(20000)
const qtySchema = z.number().int().min(0).max(1000)

const HardwareLineSchema = z.object({ hardwareId: idSchema, qty: z.number().positive().max(10000) })

const PanelSchema = z.object({
  materialId: nullableId,
  thicknessMm: z.number().positive().max(100).default(19),
})

/**
 * Un mueble del presupuesto (y de las plantillas). Guarda todo lo necesario para
 * calcular el precio y dibujarlo en 3D: medidas exteriores, divisiones, frentes.
 */
export const FurnitureItemSchema = z.object({
  id: idSchema,
  name: nameSchema,
  quantity: z.number().int().min(1).max(1000).default(1),
  widthMm: mmSchema,
  heightMm: mmSchema,
  depthMm: mmSchema,
  shelves: qtySchema.default(0),
  dividers: qtySchema.default(0),
  structure: PanelSchema.default({ materialId: null, thicknessMm: 19 }),
  /** null = sin trasera. */
  back: PanelSchema.nullable().default({ materialId: null, thicknessMm: 3 }),
  fronts: PanelSchema.default({ materialId: null, thicknessMm: 19 }),
  doors: z
    .object({
      count: qtySchema.default(0),
      /** Bisagras (puede haber dos tipos, como en el Excel). */
      hinges: z.array(HardwareLineSchema).max(10).default([]),
    })
    .default({ count: 0, hinges: [] }),
  drawers: z
    .object({
      count: qtySchema.default(0),
      slideHardwareId: nullableId,
    })
    .default({ count: 0, slideHardwareId: null }),
  edgeBanding: z
    .object({ edgeBandingId: nullableId, meters: z.number().min(0).max(10000).default(0) })
    .default({ edgeBandingId: null, meters: 0 }),
  /** Otros herrajes del catálogo (tiradores, tip-on…). */
  hardware: z.array(HardwareLineSchema).max(50).default([]),
  /** Extras por metro lineal: LED, perfiles, zócalo. */
  linearExtras: z
    .array(z.object({ hardwareId: idSchema, meters: z.number().positive().max(10000) }))
    .max(20)
    .default([]),
  /** Otros herrajes cargados a mano (€). */
  otherHardwareCents: nonNegativeCentsSchema.default(0),
  /** Mano de obra final escrita a mano; null = usar la sugerida. */
  laborCents: nonNegativeCentsSchema.nullable().default(null),
  complexityCents: nonNegativeCentsSchema.default(0),
  /** Precio final manual del mueble; null = usar el calculado. */
  finalPriceCents: nonNegativeCentsSchema.nullable().default(null),
  /** Para aceptación parcial del presupuesto. */
  accepted: z.boolean().default(true),
  notes: textSchema,
})
export type FurnitureItem = z.infer<typeof FurnitureItemSchema>

// ---- templates ---------------------------------------------------------------
export const TemplateDataSchema = z.object({
  name: nameSchema,
  category: z.string().max(100).default(''),
  /** Mueble modelo; al usarlo se le asigna un id nuevo. */
  item: FurnitureItemSchema.omit({ id: true, accepted: true }),
})
export type TemplateData = z.infer<typeof TemplateDataSchema>

// ---- quotes ------------------------------------------------------------------
export const QUOTE_STATUSES = [
  'borrador',
  'enviado',
  'aceptado',
  'aceptado_parcial',
  'rechazado',
  'vencido',
  'finalizado',
  'archivado',
] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

const FreeLineSchema = z.object({
  id: idSchema,
  description: nameSchema,
  amountCents: nonNegativeCentsSchema,
  accepted: z.boolean().default(true),
})

const AdjustmentSchema = z.object({
  id: idSchema,
  /** Motivo visible internamente: "Diseño", "Descuento"… */
  reason: nameSchema,
  /** Con signo: positivo suma, negativo descuenta. */
  amountCents: centsSchema,
})

const uniqueIds = <T extends { id: string }>(arr: T[]) => new Set(arr.map((x) => x.id)).size === arr.length

export const QuoteDataSchema = z.object({
  title: nameSchema,
  projectId: nullableId,
  clientId: nullableId,
  version: z.number().int().min(1).default(1),
  /** Presupuesto del que es una nueva versión. */
  parentQuoteId: nullableId,
  status: z.enum(QUOTE_STATUSES).default('borrador'),
  validUntil: nullableIsoDate,
  sentAt: nullableIsoDate,
  acceptedAt: nullableIsoDate,
  items: z.array(FurnitureItemSchema).max(200).default([]).refine(uniqueIds, 'Ids de muebles repetidos'),
  freeLines: z.array(FreeLineSchema).max(100).default([]).refine(uniqueIds, 'Ids de líneas repetidos'),
  adjustments: z.array(AdjustmentSchema).max(50).default([]).refine(uniqueIds, 'Ids de ajustes repetidos'),
  /** Anticipo / seña pedida (bp). */
  depositBp: bpSchema.default(0),
  /** IVA (bp); 0 = sin IVA (por ahora no se usa). */
  vatBp: bpSchema.default(0),
  terms: textSchema,
  notes: textSchema,
  /** Lista de compras: claves de lo ya comprado (sheet:<id>, edge:<id>, hw:<id>). */
  purchased: z.array(z.string().min(1).max(200)).max(500).default([]),
  /** Totales calculados y guardados para listar sin recalcular. */
  totals: z
    .object({
      subtotalCents: centsSchema.default(0),
      totalCents: centsSchema.default(0),
      acceptedTotalCents: centsSchema.default(0),
    })
    .default({ subtotalCents: 0, totalCents: 0, acceptedTotalCents: 0 }),
})
export type QuoteData = z.infer<typeof QuoteDataSchema>
