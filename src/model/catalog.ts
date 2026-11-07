import { z } from 'zod'
import { nameSchema, nonNegativeCentsSchema, textSchema, urlSchema } from './common'

const supplierFields = {
  supplier: z.string().max(100).default(''),
  url: urlSchema,
  active: z.boolean().default(true),
  notes: textSchema,
}

// ---- catalogMaterials: tableros que se compran por placa entera ---------------
export const MaterialDataSchema = z.object({
  name: nameSchema,
  sheetWidthMm: z.number().int().positive(),
  sheetHeightMm: z.number().int().positive(),
  thicknessMm: z.number().positive().max(100),
  sheetPriceCents: nonNegativeCentsSchema,
  /** Factor de desperdicio sobre los m² (1,3 = +30 %). */
  wasteFactor: z.number().min(1).max(3).default(1.3),
  ...supplierFields,
})
export type MaterialData = z.infer<typeof MaterialDataSchema>

// ---- catalogEdgeBanding: cantos, por metro lineal -----------------------------
export const EdgeBandingDataSchema = z.object({
  name: nameSchema,
  pricePerMeterCents: nonNegativeCentsSchema,
  ...supplierFields,
})
export type EdgeBandingData = z.infer<typeof EdgeBandingDataSchema>

// ---- catalogHardware: herrajes y extras ---------------------------------------
export const HARDWARE_KINDS = ['bisagra', 'guia', 'tip_on', 'tirador', 'led', 'perfil', 'zocalo', 'otro'] as const
export const HARDWARE_UNITS = ['u', 'par', 'ml'] as const
export const HardwareDataSchema = z.object({
  name: nameSchema,
  kind: z.enum(HARDWARE_KINDS),
  /** u = unidad, par = juego, ml = metro lineal. */
  unit: z.enum(HARDWARE_UNITS),
  priceCents: nonNegativeCentsSchema,
  ...supplierFields,
})
export type HardwareData = z.infer<typeof HardwareDataSchema>

// ---- settings/services: tarifas para el cálculo sugerido ----------------------
export const ServiceRatesSchema = z.object({
  /** Corte + canteado del proveedor, por m² de tablero. */
  cutAndEdgePerM2Cents: nonNegativeCentsSchema.default(1600),
  /** Mano de obra sugerida. */
  laborPerM2Cents: nonNegativeCentsSchema.default(0),
  laborPerDoorCents: nonNegativeCentsSchema.default(0),
  laborPerDrawerCents: nonNegativeCentsSchema.default(0),
  laborPerHardwareUnitCents: nonNegativeCentsSchema.default(0),
  /** Método alternativo: materiales × multiplicador (p. ej. 2,3). 0 = desactivado. */
  materialsMultiplier: z.number().min(0).max(10).default(0),
})
export type ServiceRates = z.infer<typeof ServiceRatesSchema>
