import { cn } from '@/lib/utils'

/**
 * Estado de carga: esqueleto de tarjetas (reserva el espacio, sin saltos al
 * llegar los datos). Para lectores de pantalla anuncia "Cargando…".
 * Con movimiento reducido, el brillo no se anima (ver index.css).
 */
export function Loading({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn('flex flex-col gap-3', className)}>
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="h-3 w-1/3 animate-pulse rounded-full bg-muted" />
          <div className="mt-3 h-5 w-2/3 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  )
}
