import { Box, Copy, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatEuros } from '@/domain/money'
import type { ItemBreakdown } from '@/domain/quote'
import type { FurnitureItem } from '@/model'
import { Breakdown } from './QuoteParts'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export interface QuoteItemRowProps {
  item: FurnitureItem
  breakdown: ItemBreakdown | undefined
  /** Muestra la casilla "aceptado" (presupuesto enviado). */
  acceptable: boolean
  /** Muestra editar / duplicar / quitar (borrador). */
  editable: boolean
  /** El presupuesto es un borrador (no se marca "no aceptado"). */
  isDraft: boolean
  open: boolean
  onToggleOpen: () => void
  onAcceptedChange: (accepted: boolean) => void
  onView3d: () => void
  onEdit: () => void
  onDuplicate: () => void
  onRemove: () => void
}

/** Un mueble de la lista del presupuesto (con su desglose desplegable). */
export function QuoteItemRow({
  item: it,
  breakdown: b,
  acceptable,
  editable,
  isDraft,
  open,
  onToggleOpen,
  onAcceptedChange,
  onView3d,
  onEdit,
  onDuplicate,
  onRemove,
}: QuoteItemRowProps) {
  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {acceptable && (
            <input
              type="checkbox"
              aria-label={`Aceptado: ${it.name}`}
              checked={it.accepted}
              onChange={(e) => onAcceptedChange(e.target.checked)}
            />
          )}
          <button type="button" className="min-w-0 text-left" onClick={onToggleOpen} aria-expanded={open}>
            <p className="truncate text-sm font-medium">
              {it.quantity > 1 && `${it.quantity} × `}
              {it.name}
              {!it.accepted && !isDraft && <span className="ml-2 text-xs text-muted-foreground">(no aceptado)</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {it.widthMm} × {it.heightMm} × {it.depthMm} mm
              {it.doors.count > 0 && ` · ${plural(it.doors.count, 'puerta', 'puertas')}`}
              {it.drawers.count > 0 && ` · ${plural(it.drawers.count, 'cajón', 'cajones')}`}
            </p>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-2 text-sm font-medium tabular-nums">{formatEuros(b?.totalCents ?? 0)}</span>
          <Button size="icon" variant="ghost" aria-label={`Ver ${it.name} en 3D`} onClick={onView3d}>
            <Box />
          </Button>
          {editable && (
            <>
              <Button size="icon" variant="ghost" aria-label={`Editar ${it.name}`} onClick={onEdit}>
                <Pencil />
              </Button>
              <Button size="icon" variant="ghost" aria-label={`Duplicar ${it.name}`} onClick={onDuplicate}>
                <Copy />
              </Button>
              <Button size="icon" variant="ghost" aria-label={`Quitar ${it.name}`} onClick={onRemove}>
                <Trash2 />
              </Button>
            </>
          )}
        </div>
      </div>
      {open && b && (
        <div className="mt-2 rounded-lg bg-muted/50 p-3">
          <Breakdown b={b} />
        </div>
      )}
    </li>
  )
}
