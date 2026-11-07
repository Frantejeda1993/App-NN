import { describe, expect, it } from 'vitest'
import { EdgeBandingDataSchema, HardwareDataSchema, MaterialDataSchema } from '@/model'
import { excelSeed, parseSheetSize, parseThickness, pricePerM2Cents } from './catalog'

describe('precio por m²', () => {
  it('divide el precio de la placa por su área', () => {
    // 2850 × 2100 = 5,985 m²; 120 € → 20,05 €/m²
    expect(pricePerM2Cents({ sheetWidthMm: 2850, sheetHeightMm: 2100, sheetPriceCents: 12000 })).toBe(2005)
  })
})

describe('lectura del nombre', () => {
  it('detecta la medida de placa en el nombre', () => {
    expect(parseSheetSize('Tablero Melamina Nogal Canaletto MESURA 2440x1220x19')).toEqual({ widthMm: 2440, heightMm: 1220 })
    expect(parseSheetSize('TAAB2121 Tablero Abedul -B/BB 2500x1250x21')).toEqual({ widthMm: 2500, heightMm: 1250 })
    expect(parseSheetSize('Melamina Blanca 19mm (Estructura)')).toBeNull()
  })

  it('detecta el espesor', () => {
    expect(parseThickness('Melamina Blanca 16mm (Cajon/Int)')).toBe(16)
    expect(parseThickness('Trasera / MDF 3mm')).toBe(3)
    expect(parseThickness('Tablero Melamina Negro S3 2850x2100x19')).toBe(19)
    expect(parseThickness('Roble Hamilton Nat')).toBe(19)
  })
})

describe('carga inicial desde el Excel', () => {
  const seed = excelSeed()

  it('todos los datos son válidos para los esquemas', () => {
    for (const m of seed.materials) expect(MaterialDataSchema.safeParse(m).success).toBe(true)
    for (const e of seed.edgeBanding) expect(EdgeBandingDataSchema.safeParse(e).success).toBe(true)
    for (const h of seed.hardware) expect(HardwareDataSchema.safeParse(h).success).toBe(true)
  })

  it('respeta el precio por m² y el desperdicio de la hoja DB', () => {
    const blanca = seed.materials.find((m) => m.name.startsWith('Melamina Blanca 19mm'))!
    expect(blanca).toMatchObject({ sheetWidthMm: 2850, sheetHeightMm: 2100, thicknessMm: 19, wasteFactor: 1.3 })
    // 20,70 €/m² × 5,985 m² ≈ 123,89 €
    expect(blanca.sheetPriceCents).toBe(12389)
    expect(pricePerM2Cents(blanca)).toBe(2070)

    const nogal = seed.materials.find((m) => m.name.includes('Canaletto MESURA 2440x1220x19'))!
    expect(nogal).toMatchObject({ sheetWidthMm: 2440, sheetHeightMm: 1220, wasteFactor: 1.4 })
  })

  it('incluye herrajes, cantos y la tarifa de corte del Excel', () => {
    expect(seed.hardware.find((h) => h.name.includes('71B3550'))).toMatchObject({ kind: 'bisagra', priceCents: 460 })
    expect(seed.hardware.find((h) => h.name.includes('550 DTC'))).toMatchObject({ kind: 'guia', unit: 'par', priceCents: 2700 })
    expect(seed.hardware.find((h) => h.kind === 'led' && h.unit === 'ml')).toBeTruthy()
    expect(seed.edgeBanding.map((e) => e.pricePerMeterCents)).toEqual([178, 200])
    expect(seed.services.cutAndEdgePerM2Cents).toBe(1600)
  })
})
