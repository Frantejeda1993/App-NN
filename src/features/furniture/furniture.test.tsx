import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FurnitureItemSchema } from '@/model'
import { Furniture3DView } from './Furniture3DView'
import { FurnitureItemEditor, type CatalogRefs, type FurnitureDraft } from './FurnitureItemEditor'

function draft(over: Record<string, unknown> = {}): FurnitureDraft {
  return FurnitureItemSchema.omit({ id: true, accepted: true }).parse({
    name: 'Bajo mesada',
    widthMm: 600,
    heightMm: 720,
    depthMm: 560,
    ...over,
  })
}

const EMPTY_CATALOG: CatalogRefs = { materials: [], hardware: [], edgeBanding: [] }

function Harness({ initial, onChange, errors }: { initial: FurnitureDraft; onChange: (d: FurnitureDraft) => void; errors?: Record<string, string> }) {
  const [value, setValue] = useState(initial)
  return (
    <FurnitureItemEditor
      value={value}
      catalog={EMPTY_CATALOG}
      errors={errors}
      onChange={(next) => {
        onChange(next)
        setValue(next)
      }}
    />
  )
}

describe('FurnitureItemEditor', () => {
  it('edita nombre y medidas', async () => {
    const onChange = vi.fn()
    render(<Harness initial={draft()} onChange={onChange} />)

    const name = screen.getByLabelText(/nombre del mueble/i)
    await userEvent.clear(name)
    await userEvent.type(name, 'Alacena')
    const width = screen.getByLabelText('Ancho (mm)')
    await userEvent.clear(width)
    await userEvent.type(width, '800')

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Alacena', widthMm: 800, heightMm: 720 }))
  })

  it('vaciar una medida avisa y no guarda un 0', async () => {
    const onChange = vi.fn()
    render(<Harness initial={draft()} onChange={onChange} />)

    const width = screen.getByLabelText('Ancho (mm)')
    await userEvent.clear(width)

    expect(width).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent(/ingresá un número/i)
    expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ widthMm: 0 }))

    // Al salir del campo vuelve a mostrar el valor que sigue guardado.
    await userEvent.tab()
    expect(width).toHaveValue(600)
    expect(width).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('al corregir la medida desaparece el aviso', async () => {
    const onChange = vi.fn()
    render(<Harness initial={draft()} onChange={onChange} />)
    const depth = screen.getByLabelText('Profundidad (mm)')
    await userEvent.clear(depth)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await userEvent.type(depth, '450')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ depthMm: 450 }))
  })

  it('muestra los errores de validación que recibe', () => {
    render(<Harness initial={draft({ name: 'x' })} onChange={vi.fn()} errors={{ name: 'Falta el nombre', heightMm: 'La medida debe ser mayor a 0' }} />)
    expect(screen.getByText('Falta el nombre')).toBeInTheDocument()
    expect(screen.getByText('La medida debe ser mayor a 0')).toBeInTheDocument()
  })

  it('un importe inválido se marca y no cambia el valor', async () => {
    const onChange = vi.fn()
    render(<Harness initial={draft({ complexityCents: 1000 })} onChange={onChange} />)
    const complexity = screen.getByLabelText('Complejidad (€)')
    await userEvent.clear(complexity)
    await userEvent.type(complexity, '12,345')
    expect(complexity).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent(/importe inválido/i)
    // El último valor válido tecleado fue "12,34".
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ complexityCents: 1234 }))
  })
})

describe('Furniture3DView', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.doUnmock('./Furniture3D')
    vi.resetModules()
  })

  it('sin WebGL (jsdom) muestra el aviso y no el botón de puertas', () => {
    render(<Furniture3DView items={[{ key: 'a', item: draft({ doors: { count: 2 } }) }]} materialName={() => undefined} />)
    expect(screen.getByRole('img', { name: 'Vista 3D' })).toHaveTextContent(/este navegador no puede mostrar la vista 3d/i)
    expect(screen.queryByRole('button', { name: /abrir puertas/i })).not.toBeInTheDocument()
  })

  it('con WebGL el botón queda fuera de la imagen y el contexto de prueba se libera', async () => {
    vi.resetModules()
    vi.doMock('./Furniture3D', () => ({ default: () => <canvas data-testid="scene" /> }))
    const loseContext = vi.fn()
    vi.stubGlobal('WebGLRenderingContext', function WebGLRenderingContext() {})
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      getExtension: (name: string) => (name === 'WEBGL_lose_context' ? { loseContext } : null),
    } as unknown as RenderingContext)
    const { Furniture3DView: View } = await import('./Furniture3DView')

    render(<View items={[{ key: 'a', item: draft({ doors: { count: 2 } }) }]} materialName={() => undefined} />)

    const img = screen.getByRole('img', { name: 'Vista 3D' })
    const button = screen.getByRole('button', { name: /abrir puertas/i })
    expect(img).not.toContainElement(button)
    expect(await screen.findByTestId('scene')).toBeInTheDocument()
    expect(loseContext).toHaveBeenCalledTimes(1)

    await userEvent.click(button)
    expect(screen.getByRole('button', { name: /cerrar puertas/i })).toHaveAttribute('aria-pressed', 'true')
  })
})
