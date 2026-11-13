import { DoorOpen, DoorClosed } from 'lucide-react'
import { Suspense, lazy, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { layoutItems } from '@/domain/furniture3d'
import type { FurnitureItem } from '@/model'
import { cn } from '@/lib/utils'

const Furniture3D = lazy(() => import('./Furniture3D'))

type Geometry = Pick<
  FurnitureItem,
  'widthMm' | 'heightMm' | 'depthMm' | 'shelves' | 'dividers' | 'structure' | 'back' | 'fronts' | 'doors' | 'drawers'
>

/** ¿Puede este navegador dibujar 3D? (se consulta una sola vez). */
let webgl: boolean | null = null
function hasWebGL(): boolean {
  if (webgl !== null) return webgl
  try {
    const c = document.createElement('canvas')
    const ctx = typeof WebGLRenderingContext !== 'undefined' ? (c.getContext('webgl2') ?? c.getContext('webgl')) : null
    webgl = !!ctx
    // Liberar el contexto de prueba: los navegadores limitan cuántos hay vivos.
    ctx?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    webgl = false
  }
  return webgl
}

/**
 * Vista 3D de uno o varios muebles (uno al lado del otro), con botón para abrir
 * puertas y cajones. three.js se descarga recién acá.
 */
export function Furniture3DView({
  items,
  materialName,
  className,
}: {
  items: { key: string; label?: string; item: Geometry }[]
  materialName: (materialId: string | null) => string | undefined
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const scene = useMemo(
    () =>
      layoutItems(
        items.map((i) => i.item),
        materialName,
        { open },
      ).map((l) => ({ key: items[l.index].key, label: items[l.index].label, offsetX: l.offsetX, boxes: l.boxes })),
    [items, materialName, open],
  )
  const hasDoors = items.some((i) => i.item.doors.count > 0 || i.item.drawers.count > 0)

  return (
    <div className={cn('relative h-80 w-full overflow-hidden rounded-lg border border-border bg-muted/40', className)}>
      {/* role="img" solo envuelve el dibujo (o su aviso): el botón de puertas,
          que va afuera, sigue siendo accesible para lectores de pantalla. */}
      <div role="img" aria-label="Vista 3D" className="h-full w-full">
        {!hasWebGL() ? (
          <p className="grid h-full place-items-center p-4 text-center text-sm text-muted-foreground">Este navegador no puede mostrar la vista 3D.</p>
        ) : (
          <Suspense fallback={<p className="grid h-full place-items-center text-sm text-muted-foreground">Cargando 3D…</p>}>
            <Furniture3D items={scene} />
          </Suspense>
        )}
      </div>
      {hasDoors && hasWebGL() && (
        <Button size="sm" variant="outline" className="absolute right-2 top-2 bg-card/90" aria-pressed={open} onClick={() => setOpen(!open)}>
          {open ? <DoorClosed /> : <DoorOpen />} {open ? 'Cerrar puertas' : 'Abrir puertas'}
        </Button>
      )}
      <p className="pointer-events-none absolute bottom-2 left-2 text-[11px] text-muted-foreground">Arrastrá para girar · rueda o pellizco para acercar</p>
    </div>
  )
}
