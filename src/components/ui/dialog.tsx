import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Button } from './button'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Ventana emergente modal. Escape o la ✕ cierran (cancelan); un clic afuera no,
 * para no perder un formulario a medio cargar. Mantiene el foco adentro, bloquea
 * el scroll de la página y al cerrar devuelve el foco a donde estaba.
 * En el celular ocupa toda la pantalla.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  /** Botones fijos abajo (siempre visibles aunque el contenido scrollee). */
  footer?: ReactNode
  className?: string
}) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Foco en el primer campo del formulario; si no hay, en lo primero enfocable (nunca en la ✕).
    const body = panel.current?.querySelector<HTMLElement>('[data-dialog-body]')
    const first =
      body?.querySelector<HTMLElement>('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])') ??
      body?.querySelector<HTMLElement>(FOCUSABLE) ??
      panel.current
    first?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
      } else if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
        if (items.length === 0) return
        const [head, tail] = [items[0], items[items.length - 1]]
        if (e.shiftKey && document.activeElement === head) {
          e.preventDefault()
          tail.focus()
        } else if (!e.shiftKey && document.activeElement === tail) {
          e.preventDefault()
          head.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    // Velo pizarra (no negro puro) con desenfoque leve: indica que el fondo está en pausa.
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-sidebar/60 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'flex max-h-dvh w-full flex-col bg-card text-card-foreground shadow-lg outline-none sm:max-h-[92dvh] sm:max-w-4xl sm:rounded-2xl sm:border sm:border-border',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-3">
          <h2 id={titleId} className="font-display text-xl tracking-tight">
            {title}
          </h2>
          <Button size="icon" variant="ghost" aria-label="Cerrar" onClick={onClose}>
            <X />
          </Button>
        </div>
        <div data-dialog-body className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer && (
          <div className="border-t border-border bg-muted/40 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:rounded-b-2xl">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}
