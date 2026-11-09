import { describe, expect, it } from 'vitest'
import { QuoteDataSchema } from '@/model'
import { orderText, shoppingList, type ShoppingCatalog } from './shopping'

const sup = (supplier: string, url = '') => ({ supplier, url })
const catalog: ShoppingCatalog = {
  // Placa de 2 m² a 40 €.
  materials: new Map([['m', { name: 'Melamina blanca', sheetWidthMm: 2000, sheetHeightMm: 1000, sheetPriceCents: 4000, wasteFactor: 1, ...sup('Maderas Sur') }]]),
  hardware: new Map([
    ['hinge', { name: 'Bisagra 110°', priceCents: 460, unit: 'u' as const, ...sup('Esteba', 'https://x/bisagra') }],
    ['slide', { name: 'Guía 450', priceCents: 1000, unit: 'par' as const, ...sup('Esteba') }],
    ['led', { name: 'Tira LED', priceCents: 400, unit: 'ml' as const, ...sup('') }],
  ]),
  edgeBanding: new Map([['canto', { name: 'Canto blanco', pricePerMeterCents: 200, ...sup('Maderas Sur') }]]),
}

const quote = (items: Record<string, unknown>[]) =>
  QuoteDataSchema.parse({ title: 'Cocina', items: items.map((x, i) => ({ id: `i${i}`, name: `M${i}`, widthMm: 1000, heightMm: 1000, depthMm: 250, back: null, ...x })) })

describe('shoppingList', () => {
  it('agrupa placas, cantos y herrajes por proveedor, por la cantidad de muebles', () => {
    const q = quote([
      {
        quantity: 2,
        structure: { materialId: 'm' },
        doors: { count: 1, hinges: [{ hardwareId: 'hinge', qty: 2 }] },
        drawers: { count: 3, slideHardwareId: 'slide' },
        edgeBanding: { edgeBandingId: 'canto', meters: 2.5 },
        linearExtras: [{ hardwareId: 'led', meters: 1.5 }],
        otherHardwareCents: 300,
      },
    ])
    const list = shoppingList(q, catalog)

    expect(list.groups.map((g) => g.supplier)).toEqual(['Esteba', 'Maderas Sur', 'Sin proveedor'])
    const esteba = list.groups[0]
    expect(esteba.lines).toEqual([
      { key: 'hw:hinge', kind: 'herraje', name: 'Bisagra 110°', qty: 4, unit: 'u', unitPriceCents: 460, totalCents: 1840, url: 'https://x/bisagra' },
      { key: 'hw:slide', kind: 'herraje', name: 'Guía 450', qty: 6, unit: 'par', unitPriceCents: 1000, totalCents: 6000, url: '' },
    ])
    expect(esteba.totalCents).toBe(7840)

    const maderas = list.groups[1]
    // estructura 1 m² × 2 = 2 m² → 1 placa
    expect(maderas.lines[0]).toMatchObject({ key: 'sheet:m', kind: 'placa', qty: 1, unit: 'placa', totalCents: 4000 })
    expect(maderas.lines[1]).toMatchObject({ key: 'edge:canto', kind: 'canto', qty: 5, unit: 'm', totalCents: 1000 })

    expect(list.groups[2].lines[0]).toMatchObject({ key: 'hw:led', qty: 3, unit: 'ml', totalCents: 1200 })
    expect(list.manualCents).toBe(300)
    expect(list.totalCents).toBe(7840 + 5000 + 1200 + 300)
  })

  it('suma el mismo herraje de varios muebles y solo cuenta lo aceptado', () => {
    const q = quote([
      { doors: { count: 1, hinges: [{ hardwareId: 'hinge', qty: 2 }] } },
      { doors: { count: 2, hinges: [{ hardwareId: 'hinge', qty: 4 }] } },
      { doors: { count: 1, hinges: [{ hardwareId: 'hinge', qty: 10 }] }, accepted: false },
    ])
    const line = shoppingList(q, catalog).groups[0].lines[0]
    expect(line).toMatchObject({ key: 'hw:hinge', qty: 6, totalCents: 2760 })
  })

  it('ignora referencias a artículos que ya no están en el catálogo', () => {
    const q = quote([{ hardware: [{ hardwareId: 'borrado', qty: 3 }], structure: { materialId: 'nope' } }])
    const list = shoppingList(q, catalog)
    expect(list.groups).toEqual([])
    expect(list.totalCents).toBe(0)
  })
})

describe('orderText', () => {
  it('arma un pedido para copiar y pegar', () => {
    const q = quote([{ quantity: 2, doors: { count: 1, hinges: [{ hardwareId: 'hinge', qty: 2 }] }, drawers: { count: 3, slideHardwareId: 'slide' } }])
    const group = shoppingList(q, catalog).groups[0]
    expect(orderText(group, 'Cocina')).toBe('Pedido Esteba – Cocina\n- Bisagra 110°: 4 u\n- Guía 450: 6 pares')
  })

  it('muestra decimales con coma y la unidad de las placas', () => {
    const q = quote([{ structure: { materialId: 'm' }, edgeBanding: { edgeBandingId: 'canto', meters: 2.25 } }])
    const group = shoppingList(q, catalog).groups[0]
    expect(orderText(group, 'Placard')).toBe('Pedido Maderas Sur – Placard\n- Melamina blanca: 1 placa\n- Canto blanco: 2,25 m')
  })
})
