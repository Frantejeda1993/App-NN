import { describe, expect, it } from 'vitest'
import { urlSchema } from './common'
import { safeHref } from '@/lib/utils'
import {
  ClientDataSchema,
  ContactDataSchema,
  FurnitureItemSchema,
  GeneralExpenseDataSchema,
  MaterialDataSchema,
  MovementDataSchema,
  ProjectDataSchema,
  QuoteDataSchema,
  SharesSchema,
  emailKeySchema,
  isoDateSchema,
} from './index'

describe('primitivas', () => {
  it('isoDate solo acepta fechas reales YYYY-MM-DD', () => {
    expect(isoDateSchema.safeParse('2026-11-07').success).toBe(true)
    expect(isoDateSchema.safeParse('2026-02-30').success).toBe(false)
    expect(isoDateSchema.safeParse('07/11/2026').success).toBe(false)
  })

  it('emailKey exige minúsculas', () => {
    expect(emailKeySchema.safeParse('nacho@gmail.com').success).toBe(true)
    expect(emailKeySchema.safeParse('Nacho@gmail.com').success).toBe(false)
  })

  it('SharesSchema exige 100 % y claves de socio o "taller"', () => {
    expect(SharesSchema.safeParse({ 'a@x.com': 6000, taller: 4000 }).success).toBe(true)
    expect(SharesSchema.safeParse({ 'a@x.com': 6000, taller: 3000 }).success).toBe(false)
    expect(SharesSchema.safeParse({ 'no-es-email': 10000 }).success).toBe(false)
  })
})

describe('clientes y contactos', () => {
  it('acepta un cliente mínimo y completa valores por defecto', () => {
    const c = ClientDataSchema.parse({ name: 'Raquel' })
    expect(c).toMatchObject({ name: 'Raquel', phone: '', source: '', nextContactAt: null })
  })

  it('rechaza un cliente sin nombre', () => {
    expect(ClientDataSchema.safeParse({ name: '  ' }).success).toBe(false)
  })

  it('contacto con canal válido', () => {
    expect(ContactDataSchema.safeParse({ date: '2026-11-07', channel: 'whatsapp', note: 'pasar presupuesto' }).success).toBe(true)
    expect(ContactDataSchema.safeParse({ date: '2026-11-07', channel: 'paloma' }).success).toBe(false)
  })
})

describe('proyectos', () => {
  const base = {
    clientId: 'c1',
    title: 'Cocina Raquel',
    shares: { 'nacho@x.com': 4000, 'nahuel@x.com': 4000, taller: 2000 },
  }

  it('acepta un proyecto con estado por defecto pendiente', () => {
    expect(ProjectDataSchema.parse(base).status).toBe('pendiente')
  })

  it('rechaza participación que no suma 100 %', () => {
    const r = ProjectDataSchema.safeParse({ ...base, shares: { 'nacho@x.com': 5000 } })
    expect(r.success).toBe(false)
  })

  it('rechaza estados desconocidos', () => {
    expect(ProjectDataSchema.safeParse({ ...base, status: 'listo' }).success).toBe(false)
  })
})

describe('movimientos', () => {
  const m = { amountCents: 50000, date: '2026-11-07', description: 'x' }

  it('cobro: requiere proyecto y caja', () => {
    expect(MovementDataSchema.safeParse({ ...m, type: 'cobro', projectId: 'p1', boxId: 'b1' }).success).toBe(true)
    expect(MovementDataSchema.safeParse({ ...m, type: 'cobro', boxId: 'b1' }).success).toBe(false)
    expect(MovementDataSchema.safeParse({ ...m, type: 'cobro', projectId: 'p1' }).success).toBe(false)
  })

  it('importe entero y positivo', () => {
    expect(MovementDataSchema.safeParse({ ...m, amountCents: 0, type: 'cobro', projectId: 'p', boxId: 'b' }).success).toBe(false)
    expect(MovementDataSchema.safeParse({ ...m, amountCents: 10.5, type: 'cobro', projectId: 'p', boxId: 'b' }).success).toBe(false)
  })

  it('gasto: pagado desde una caja O del bolsillo de un socio, no ambos', () => {
    const g = { ...m, type: 'gasto_proyecto', projectId: 'p1' }
    expect(MovementDataSchema.safeParse({ ...g, boxId: 'b1' }).success).toBe(true)
    expect(MovementDataSchema.safeParse({ ...g, paidBy: 'nacho@x.com' }).success).toBe(true)
    expect(MovementDataSchema.safeParse({ ...g, boxId: 'b1', paidBy: 'nacho@x.com' }).success).toBe(false)
    expect(MovementDataSchema.safeParse(g).success).toBe(false)
  })

  it('gasto pendiente de pago no necesita origen del dinero', () => {
    expect(
      MovementDataSchema.safeParse({ ...m, type: 'gasto_proyecto', projectId: 'p1', status: 'pendiente_pago' }).success,
    ).toBe(true)
  })

  it('gasto dividido entre proyectos: las partes deben sumar el total', () => {
    const g = { ...m, type: 'gasto_proyecto', boxId: 'b1' }
    const ok = { ...g, projectSplits: [{ projectId: 'p1', amountCents: 20000 }, { projectId: 'p2', amountCents: 30000 }] }
    const bad = { ...g, projectSplits: [{ projectId: 'p1', amountCents: 20000 }] }
    expect(MovementDataSchema.safeParse(ok).success).toBe(true)
    expect(MovementDataSchema.safeParse(bad).success).toBe(false)
  })

  it('gasto general: requiere el gasto general asociado', () => {
    expect(MovementDataSchema.safeParse({ ...m, type: 'gasto_general', generalExpenseId: 'g1', boxId: 'b1' }).success).toBe(true)
    expect(MovementDataSchema.safeParse({ ...m, type: 'gasto_general', boxId: 'b1' }).success).toBe(false)
  })

  it('retiro, aporte y reintegro: requieren socio y caja', () => {
    for (const type of ['retiro', 'aporte', 'reintegro']) {
      expect(MovementDataSchema.safeParse({ ...m, type, memberEmail: 'nacho@x.com', boxId: 'b1' }).success).toBe(true)
      expect(MovementDataSchema.safeParse({ ...m, type, boxId: 'b1' }).success).toBe(false)
    }
  })

  it('transferencia: dos cajas distintas', () => {
    expect(MovementDataSchema.safeParse({ ...m, type: 'transferencia', boxId: 'b1', toBoxId: 'b2' }).success).toBe(true)
    expect(MovementDataSchema.safeParse({ ...m, type: 'transferencia', boxId: 'b1', toBoxId: 'b1' }).success).toBe(false)
  })

  it('rechaza campos que no corresponden al tipo', () => {
    const c = { ...m, type: 'cobro', projectId: 'p1', boxId: 'b1' }
    expect(MovementDataSchema.safeParse({ ...c, memberEmail: 'nacho@x.com' }).success).toBe(false)
    expect(MovementDataSchema.safeParse({ ...c, generalExpenseId: 'g1' }).success).toBe(false)
    expect(
      MovementDataSchema.safeParse({ ...m, type: 'retiro', memberEmail: 'nacho@x.com', boxId: 'b1', projectId: 'p1' }).success,
    ).toBe(false)
    expect(
      MovementDataSchema.safeParse({ ...m, type: 'gasto_general', generalExpenseId: 'g1', boxId: 'b1', projectId: 'p1' }).success,
    ).toBe(false)
  })

  it('un proyecto no puede repetirse en el reparto', () => {
    const r = MovementDataSchema.safeParse({
      ...m,
      type: 'gasto_proyecto',
      boxId: 'b1',
      projectSplits: [{ projectId: 'p1', amountCents: 25000 }, { projectId: 'p1', amountCents: 25000 }],
    })
    expect(r.success).toBe(false)
  })

  it('un gasto pendiente no puede tener caja ni socio pagador', () => {
    const r = MovementDataSchema.safeParse({ ...m, type: 'gasto_proyecto', projectId: 'p1', status: 'pendiente_pago', boxId: 'b1' })
    expect(r.success).toBe(false)
  })

  it('solo los gastos pueden quedar pendientes de pago', () => {
    expect(
      MovementDataSchema.safeParse({ ...m, type: 'cobro', projectId: 'p', boxId: 'b', status: 'pendiente_pago' }).success,
    ).toBe(false)
  })
})

describe('gastos generales', () => {
  it('fijo con día del mes y reparto válido', () => {
    const r = GeneralExpenseDataSchema.safeParse({
      name: 'Alquiler',
      kind: 'fijo',
      category: 'Taller',
      amountCents: 25000,
      dayOfMonth: 1,
      shares: { 'nacho@x.com': 5000, 'nahuel@x.com': 5000 },
    })
    expect(r.success).toBe(true)
  })

  it('un gasto fijo necesita día del mes', () => {
    const r = GeneralExpenseDataSchema.safeParse({
      name: 'Alquiler',
      kind: 'fijo',
      category: 'Taller',
      amountCents: 25000,
      shares: { taller: 10000 },
    })
    expect(r.success).toBe(false)
  })
})

describe('catálogo', () => {
  it('material con placa y desperdicio ≥ 1', () => {
    const base = { name: 'Melamina blanca 19', sheetWidthMm: 2850, sheetHeightMm: 2100, thicknessMm: 19, sheetPriceCents: 12000 }
    expect(MaterialDataSchema.parse(base).wasteFactor).toBe(1.3)
    expect(MaterialDataSchema.safeParse({ ...base, wasteFactor: 0.9 }).success).toBe(false)
  })
})

describe('presupuestos', () => {
  it('un mueble mínimo completa los valores por defecto', () => {
    const f = FurnitureItemSchema.parse({ id: 'f1', name: 'Bajo mesada', widthMm: 600, heightMm: 720, depthMm: 560 })
    expect(f).toMatchObject({ quantity: 1, shelves: 0, doors: { count: 0, hinges: [] }, drawers: { count: 0 }, accepted: true })
    expect(f.laborCents).toBeNull()
    expect(f.finalPriceCents).toBeNull()
  })

  it('rechaza medidas no positivas', () => {
    expect(FurnitureItemSchema.safeParse({ id: 'f1', name: 'x', widthMm: 0, heightMm: 720, depthMm: 560 }).success).toBe(false)
  })

  it('presupuesto con muebles, líneas libres y ajustes con signo', () => {
    const q = QuoteDataSchema.parse({
      title: 'Cocina v1',
      projectId: 'p1',
      items: [{ id: 'f1', name: 'Alacena', widthMm: 800, heightMm: 700, depthMm: 350 }],
      freeLines: [{ id: 'l1', description: 'Retirada de horno', amountCents: 17500 }],
      adjustments: [{ id: 'a1', reason: 'Descuento', amountCents: -10000 }],
    })
    expect(q.status).toBe('borrador')
    expect(q.version).toBe(1)
    expect(q.vatBp).toBe(0)
  })

  it('los ids de muebles deben ser únicos', () => {
    const item = { id: 'f1', name: 'A', widthMm: 1, heightMm: 1, depthMm: 1 }
    expect(QuoteDataSchema.safeParse({ title: 'x', items: [item, item] }).success).toBe(false)
  })
})

describe('enlaces del catálogo', () => {
  it('solo acepta http(s) o vacío', () => {
    for (const ok of ['https://www.esteba.com/es/bisagra', 'http://proveedor.es', '']) expect(urlSchema.safeParse(ok).success).toBe(true)
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<b>x</b>', 'ftp://x.es', 'no es un enlace']) {
      expect(urlSchema.safeParse(bad).success).toBe(false)
    }
  })

  it('safeHref descarta lo que no sea http(s) aunque ya esté guardado', () => {
    expect(safeHref('https://esteba.com/x')).toBe('https://esteba.com/x')
    expect(safeHref('javascript:alert(1)')).toBeUndefined()
    expect(safeHref(' javascript:alert(1)')).toBeUndefined()
    expect(safeHref('data:text/html,x')).toBeUndefined()
    expect(safeHref('')).toBeUndefined()
    expect(safeHref('basura')).toBeUndefined()
  })
})
