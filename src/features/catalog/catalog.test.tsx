import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FakeDataApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'
import { excelSeed } from '@/domain/catalog'

async function fill(el: HTMLElement, v: string) {
  await userEvent.clear(el)
  await userEvent.type(el, v)
}

describe('catálogo', () => {
  it('con el catálogo vacío ofrece cargar los valores del Excel', async () => {
    const api = new FakeDataApi()
    renderApp('/catalogo', api)
    await userEvent.click(await screen.findByRole('button', { name: /cargar valores iniciales/i }))

    await waitFor(() => expect(api.materials.size).toBeGreaterThan(15))
    expect(api.hardware.size).toBe(10)
    expect(api.edgeBanding.size).toBe(2)
    expect(api.serviceRates.cutAndEdgePerM2Cents).toBe(1600)
    const list = await screen.findByRole('list', { name: /materiales/i })
    expect(within(list).getByText(/melamina blanca 19mm/i).closest('li')).toHaveTextContent('20,70 €/m²')
    expect(screen.queryByRole('button', { name: /cargar valores iniciales/i })).not.toBeInTheDocument()
  })

  it('crea un material y muestra su precio por m²', async () => {
    const api = new FakeDataApi()
    renderApp('/catalogo', api)
    await userEvent.click(await screen.findByRole('button', { name: /nuevo material/i }))
    await userEvent.type(screen.getByLabelText(/^nombre/i), 'Melamina gris')
    const price = screen.getByLabelText(/precio por placa/i)
    await userEvent.clear(price)
    await userEvent.type(price, '119,70')
    await userEvent.click(screen.getByRole('button', { name: /^guardar$/i }))

    const list = await screen.findByRole('list', { name: /materiales/i })
    // 119,70 € / 5,985 m² = 20,00 €/m²
    expect(within(list).getByText('Melamina gris').closest('li')).toHaveTextContent('20,00 €/m²')
    expect([...api.materials.values()][0]).toMatchObject({ sheetPriceCents: 11970, wasteFactor: 1.3, createdBy: 'nacho@gmail.com' })
  })

  it('valida y desactiva herrajes', async () => {
    const api = new FakeDataApi()
    renderApp('/catalogo?tab=herrajes', api)
    await userEvent.click(await screen.findByRole('button', { name: /nuevo herraje/i }))
    await userEvent.clear(screen.getByLabelText(/^nombre/i))
    await userEvent.click(screen.getByRole('button', { name: /^guardar$/i }))
    expect(await screen.findByText(/obligatorio/i)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/^nombre/i), 'Tirador gola')
    await userEvent.selectOptions(screen.getByLabelText(/^tipo/i), 'tirador')
    await fill(screen.getByLabelText(/^precio/i), '3,5')
    await userEvent.click(screen.getByRole('button', { name: /^guardar$/i }))
    const list = await screen.findByRole('list', { name: /herrajes/i })
    await userEvent.click(within(list).getByRole('button', { name: /desactivar/i }))
    await waitFor(() => expect([...api.hardware.values()][0]).toMatchObject({ kind: 'tirador', priceCents: 350, active: false }))
  })

  it('guarda las tarifas', async () => {
    const api = new FakeDataApi()
    renderApp('/catalogo?tab=tarifas', api)
    const cut = await screen.findByLabelText(/corte y canteado/i)
    await userEvent.clear(cut)
    await userEvent.type(cut, '16')
    const mult = screen.getByLabelText(/multiplicador/i)
    await userEvent.clear(mult)
    await userEvent.type(mult, '2,3')
    await userEvent.click(screen.getByRole('button', { name: /guardar tarifas/i }))
    await waitFor(() => expect(api.serviceRates).toMatchObject({ cutAndEdgePerM2Cents: 1600, materialsMultiplier: 2.3 }))
  })
})

describe('plantillas de mueble', () => {
  function seedCatalog() {
    const api = new FakeDataApi()
    api.createMaterial({ name: 'Melamina blanca 19', sheetWidthMm: 2850, sheetHeightMm: 2100, thicknessMm: 19, sheetPriceCents: 12389 }, 'nacho@gmail.com')
    api.createHardware({ name: 'Bisagra 110', kind: 'bisagra', unit: 'u', priceCents: 460 }, 'nacho@gmail.com')
    api.createHardware({ name: 'Guía 450', kind: 'guia', unit: 'par', priceCents: 2338 }, 'nacho@gmail.com')
    return api
  }

  it('crea una plantilla con materiales, puertas, bisagras y cajones', async () => {
    const api = seedCatalog()
    const mat = [...api.materials.values()][0]
    const guia = [...api.hardware.values()].find((h) => h.kind === 'guia')!
    renderApp('/catalogo/plantillas/nueva', api)

    await userEvent.type(await screen.findByLabelText(/nombre de la plantilla/i), 'Bajo mesada 2 puertas')
    await userEvent.type(screen.getByLabelText(/categoría/i), 'Cocina')
    await userEvent.selectOptions(screen.getByLabelText(/^estructura/i), mat.id)
    await fill(screen.getByLabelText(/^puertas$/i), '2')
    await userEvent.click(within(screen.getByText('Bisagras').parentElement!).getByRole('button', { name: /agregar/i }))
    await fill(screen.getByLabelText('Cantidad 1'), '4')
    await fill(screen.getByLabelText(/^cajones$/i), '1')
    await userEvent.selectOptions(screen.getByLabelText(/guía de cajón/i), guia.id)
    await userEvent.click(screen.getByRole('button', { name: /crear plantilla/i }))

    await waitFor(() => expect(api.templates.size).toBe(1))
    const t = [...api.templates.values()][0]
    expect(t).toMatchObject({ name: 'Bajo mesada 2 puertas', category: 'Cocina' })
    expect(t.item).toMatchObject({
      name: 'Bajo mesada 2 puertas',
      widthMm: 600,
      structure: { materialId: mat.id, thicknessMm: 19 },
      doors: { count: 2, hinges: [{ qty: 4 }] },
      drawers: { count: 1, slideHardwareId: guia.id },
      laborCents: null,
    })
    expect(await screen.findByRole('list', { name: 'Plantillas' })).toHaveTextContent('Bajo mesada 2 puertas')
  })

  it('no guarda medidas en 0 y se puede eliminar', async () => {
    const api = seedCatalog()
    renderApp('/catalogo/plantillas/nueva', api)
    await userEvent.type(await screen.findByLabelText(/nombre de la plantilla/i), 'Alacena')
    await fill(screen.getByLabelText(/ancho \(mm\)/i), '0')
    await userEvent.click(screen.getByRole('button', { name: /crear plantilla/i }))
    expect((await screen.findAllByText(/la medida debe ser mayor a 0/i)).length).toBeGreaterThan(0)

    await fill(screen.getByLabelText(/ancho \(mm\)/i), '800')
    await userEvent.click(screen.getByRole('button', { name: /crear plantilla/i }))
    await waitFor(() => expect(api.templates.size).toBe(1))

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const list = await screen.findByRole('list', { name: 'Plantillas' })
    await userEvent.click(within(list).getByRole('button', { name: /eliminar/i }))
    await waitFor(() => expect(api.templates.size).toBe(0))
  })

  it('carga las plantillas del Excel una sola vez, enlazadas al catálogo', async () => {
    const api = new FakeDataApi()
    const seed = excelSeed()
    for (const m of seed.materials) api.createMaterial(m, 'nacho@gmail.com')
    for (const h of seed.hardware) api.createHardware(h, 'nacho@gmail.com')
    renderApp('/catalogo?tab=plantillas', api)

    const btn = await screen.findByRole('button', { name: /cargar plantillas del excel/i })
    await userEvent.click(btn)
    const list = await screen.findByRole('list', { name: /plantillas/i })
    expect(within(list).getByText('Bajo cocina 60')).toBeInTheDocument()
    const count = api.templates.size
    expect(count).toBeGreaterThanOrEqual(12)
    const bajo = [...api.templates.values()].find((t) => t.name === 'Bajo cocina 60')!
    expect(api.materials.get(bajo.item.structure.materialId!)?.name).toMatch(/melamina blanca 19mm/i)

    // Ya cargadas: el botón desaparece.
    await waitFor(() => expect(screen.queryByRole('button', { name: /cargar plantillas del excel/i })).not.toBeInTheDocument())
    expect(api.templates.size).toBe(count)
  })
})
