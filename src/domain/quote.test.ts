import { describe, expect, it } from 'vitest'
import { computeQuote, itemAreas, type CatalogLike, type ItemLike, type RatesLike } from './quote'

const zeroRates: RatesLike = {
  cutAndEdgePerM2Cents: 0,
  laborPerM2Cents: 0,
  laborPerDoorCents: 0,
  laborPerDrawerCents: 0,
  laborPerHardwareUnitCents: 0,
  materialsMultiplier: 0,
}

// Placa de 2 m² a 40 €.
const catalog = (waste = 1): CatalogLike => ({
  materials: new Map([
    [
      'm',
      {
        name: 'Melamina',
        sheetWidthMm: 2000,
        sheetHeightMm: 1000,
        sheetPriceCents: 4000,
        wasteFactor: waste,
      },
    ],
  ]),
  hardware: new Map([
    ['hinge', { priceCents: 460 }],
    ['slide', { priceCents: 1000 }],
    ['handle', { priceCents: 500 }],
    ['led', { priceCents: 400 }],
  ]),
  edgeBanding: new Map([['canto', { pricePerMeterCents: 200 }]]),
})

/** Caja de 1000×1000×250 sin estantes: estructura = 1 m². */
const item = (over: Partial<ItemLike> = {}): ItemLike => ({
  id: 'a',
  name: 'Caja',
  quantity: 1,
  widthMm: 1000,
  heightMm: 1000,
  depthMm: 250,
  shelves: 0,
  structure: { materialId: 'm' },
  back: null,
  fronts: { materialId: 'm' },
  doors: { count: 0, hinges: [] },
  drawers: { count: 0, slideHardwareId: null },
  edgeBanding: { edgeBandingId: null, meters: 0 },
  hardware: [],
  linearExtras: [],
  otherHardwareCents: 0,
  laborCents: null,
  complexityCents: 0,
  finalPriceCents: null,
  accepted: false,
  ...over,
})

const quote = (items: ItemLike[], over: Partial<Parameters<typeof computeQuote>[0]> = {}) => ({
  items,
  freeLines: [],
  adjustments: [],
  depositBp: 0,
  vatBp: 0,
  ...over,
})

describe('itemAreas', () => {
  it('estructura, frentes y trasera por cantidad', () => {
    const a = itemAreas(
      item({
        widthMm: 600,
        heightMm: 720,
        depthMm: 560,
        shelves: 1,
        doors: { count: 2, hinges: [] },
        back: { materialId: 'm' },
        quantity: 2,
      }),
    )
    expect(a.structure).toBeCloseTo((2 * 0.72 * 0.56 + 2 * 0.6 * 0.56 + 0.6 * 0.56) * 2)
    // Las dos puertas se reparten el frente: un frente de ancho × alto por mueble.
    expect(a.fronts).toBeCloseTo(0.6 * 0.72 * 2)
    expect(a.back).toBeCloseTo(0.6 * 0.72 * 2)
  })

  it('las divisiones suman a la estructura (alto × profundidad cada una)', () => {
    const base = itemAreas(item({ widthMm: 600, heightMm: 720, depthMm: 560 }))
    const withDividers = itemAreas(item({ widthMm: 600, heightMm: 720, depthMm: 560, dividers: 2 }))
    expect(withDividers.structure - base.structure).toBeCloseTo(2 * 0.72 * 0.56)
  })

  it('un mueble solo con cajones también tiene frente; sin puertas ni cajones no', () => {
    expect(itemAreas(item({ drawers: { count: 4, slideHardwareId: null } })).fronts).toBeCloseTo(1)
    expect(itemAreas(item()).fronts).toBe(0)
  })
})

describe('computeQuote — placas enteras', () => {
  it('dos muebles de 1 m² entran en una placa y se reparten el coste', () => {
    const r = computeQuote(quote([item({ id: 'a' }), item({ id: 'b' })]), catalog(), zeroRates)
    expect(r.sheets).toEqual([
      {
        materialId: 'm',
        name: 'Melamina',
        m2WithWaste: 2,
        sheets: 1,
        costCents: 4000,
      },
    ])
    expect(r.items.map((i) => i.materialCents)).toEqual([2000, 2000])
  })

  it('el desperdicio puede hacer saltar a otra placa', () => {
    const r = computeQuote(quote([item({ id: 'a' }), item({ id: 'b' })]), catalog(1.3), zeroRates)
    expect(r.sheets[0].sheets).toBe(2)
    expect(r.items[0].materialCents + r.items[1].materialCents).toBe(8000)
  })

  it('el reparto es proporcional a los m² y suma exacto', () => {
    const r = computeQuote(quote([item({ id: 'a' }), item({ id: 'b', quantity: 2 })]), catalog(), zeroRates)
    expect(r.sheets[0].sheets).toBe(2)
    expect(r.items.map((i) => i.materialCents)).toEqual([2667, 5333])
  })

  it('sin material o con material inexistente no cuenta placas', () => {
    const r = computeQuote(
      quote([
        item({
          structure: { materialId: null },
          fronts: { materialId: 'nope' },
        }),
      ]),
      catalog(),
      zeroRates,
    )
    expect(r.sheets).toEqual([])
    expect(r.items[0].materialCents).toBe(0)
  })
})

describe('computeQuote — desglose por mueble', () => {
  const full = item({
    quantity: 2,
    doors: { count: 2, hinges: [{ hardwareId: 'hinge', qty: 4 }] },
    drawers: { count: 2, slideHardwareId: 'slide' },
    hardware: [{ hardwareId: 'handle', qty: 2 }],
    linearExtras: [{ hardwareId: 'led', meters: 1.5 }],
    otherHardwareCents: 300,
    edgeBanding: { edgeBandingId: 'canto', meters: 3 },
  })
  const rates: RatesLike = {
    cutAndEdgePerM2Cents: 1000,
    laborPerM2Cents: 1000,
    laborPerDoorCents: 500,
    laborPerDrawerCents: 700,
    laborPerHardwareUnitCents: 100,
    materialsMultiplier: 2.3,
  }

  it('herrajes, corte, canto y mano de obra sugerida', () => {
    const r = computeQuote(quote([full]), catalog(), rates)
    const b = r.items[0]
    // m²: estructura 1×2 + frente (puertas y cajones lo comparten) 1×2 = 4
    expect(b.m2).toBe(4)
    expect(b.hardwareCents).toBe((1840 + 2000 + 1000 + 600) * 2 + 300)
    expect(b.cutCents).toBe(4000)
    expect(b.edgeCents).toBe(1200)
    expect(b.laborSuggestedCents).toBe(4000 + (1000 + 1400 + 600) * 2)
    expect(b.laborCents).toBe(b.laborSuggestedCents)
    // 4 m² → 2 placas
    expect(b.materialCents).toBe(8000)
    expect(b.totalCents).toBe(8000 + 4000 + 1200 + 11180 + 10000)
  })

  it('la mano de obra a mano reemplaza la sugerida y la complejidad suma', () => {
    const b = computeQuote(quote([{ ...full, laborCents: 5000, complexityCents: 700 }]), catalog(), rates).items[0]
    expect(b.laborCents).toBe(5000)
    expect(b.totalCents).toBe(b.computedCents)
    expect(b.computedCents).toBe(8000 + 4000 + 1200 + 11180 + 5000 + 700)
  })

  it('el precio final a mano manda sobre el calculado', () => {
    const b = computeQuote(quote([{ ...full, finalPriceCents: 99900 }]), catalog(), rates).items[0]
    expect(b.totalCents).toBe(99900)
    expect(b.computedCents).not.toBe(99900)
  })

  it('el multiplicador es solo referencia: no cambia el total', () => {
    const r = computeQuote(quote([full]), catalog(), rates)
    expect(r.multiplierRefCents).toBe(Math.round(8000 * 2.3))
    expect(r.totalCents).toBe(r.items[0].totalCents)
  })
})

describe('computeQuote — totales', () => {
  it('líneas libres, ajustes, IVA, seña y total aceptado', () => {
    const r = computeQuote(
      quote([item({ id: 'a', finalPriceCents: 10000, accepted: true }), item({ id: 'b', finalPriceCents: 20000, accepted: false })], {
        freeLines: [
          { amountCents: 5000, accepted: true },
          { amountCents: 1000, accepted: false },
        ],
        adjustments: [{ amountCents: -2000 }],
        vatBp: 2100,
        depositBp: 5000,
      }),
      catalog(),
      zeroRates,
    )
    expect(r.itemsCents).toBe(30000)
    expect(r.freeLinesCents).toBe(6000)
    expect(r.adjustmentsCents).toBe(-2000)
    expect(r.subtotalCents).toBe(34000)
    expect(r.vatCents).toBe(7140)
    expect(r.totalCents).toBe(41140)
    // aceptado: 15000 de 36000 → el descuento se prorratea: −2000 × 15/36 = −833.
    // 14167 + 21 % (2975) = 17142
    expect(r.acceptedTotalCents).toBe(17142)
    // La seña es sobre lo aceptado, no sobre el total.
    expect(r.depositCents).toBe(8571)
  })

  it('aceptado entero: el total aceptado es el total y la seña es sobre el total', () => {
    const r = computeQuote(
      quote([item({ id: 'a', finalPriceCents: 10000, accepted: true })], { adjustments: [{ amountCents: -1000 }], depositBp: 3000 }),
      catalog(),
      zeroRates,
    )
    expect(r.acceptedTotalCents).toBe(r.totalCents)
    expect(r.depositCents).toBe(2700)
  })

  it('un descuento grande nunca deja el total aceptado en negativo', () => {
    const r = computeQuote(
      quote([item({ id: 'a', finalPriceCents: 100000, accepted: false }), item({ id: 'b', finalPriceCents: 20000, accepted: true })], {
        adjustments: [{ amountCents: -30000 }],
      }),
      catalog(),
      zeroRates,
    )
    // −30000 × 20000/120000 = −5000 → 15000
    expect(r.acceptedTotalCents).toBe(15000)
    expect(r.acceptedTotalCents).toBeGreaterThanOrEqual(0)
  })

  it('el IVA sobre importes negativos redondea igual que sobre positivos', () => {
    const pos = computeQuote(quote([], { freeLines: [{ amountCents: 250, accepted: true }], vatBp: 1000 }), catalog(), zeroRates)
    const neg = computeQuote(quote([], { adjustments: [{ amountCents: -250 }], vatBp: 1000 }), catalog(), zeroRates)
    expect(pos.vatCents).toBe(25)
    expect(neg.vatCents).toBe(-25)
  })

  it('presupuesto vacío da todo cero', () => {
    const r = computeQuote(quote([]), catalog(), zeroRates)
    expect(r.totalCents).toBe(0)
    expect(r.sheets).toEqual([])
    expect(r.multiplierRefCents).toBe(0)
  })
})
