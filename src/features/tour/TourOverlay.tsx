import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { TourStep } from './steps'

const PAD = 6
const FIND_TIMEOUT_MS = 3000

const isVisible = (el: Element) => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
}

/**
 * Un paso del tour: lleva a su pantalla, resalta el elemento (oscureciendo el
 * resto) y muestra el globo con la explicación. Se monta de nuevo en cada paso.
 * Si el elemento no aparece, el globo se muestra centrado: el tour nunca se traba.
 */
export function TourOverlay({
  step,
  index,
  total,
  onNext,
  onBack,
  onClose,
}: {
  step: TourStep
  index: number
  total: number
  onNext: () => void
  onBack: () => void
  onClose: () => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const here = location.pathname + location.search
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [gaveUp, setGaveUp] = useState(false)
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const popover = useRef<HTMLDivElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const bodyId = useId()

  // Ir a la pantalla del paso y buscar el elemento a resaltar.
  useEffect(() => {
    if (here !== step.route) {
      navigate(step.route)
      return
    }
    if (!step.target) return
    const selector = step.target
    let el: Element | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const started = Date.now()
    const measure = () => {
      if (el) setRect(el.getBoundingClientRect())
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    }
    const look = () => {
      el = [...document.querySelectorAll(selector)].find(isVisible)
      if (el) {
        // Si es más alto que media pantalla, se muestra su comienzo; si no, centrado.
        const tall = el.getBoundingClientRect().height > window.innerHeight * 0.6
        el.scrollIntoView?.({ block: tall ? 'start' : 'center', inline: 'nearest' })
        measure()
      } else if (Date.now() - started < FIND_TIMEOUT_MS) {
        timer = setTimeout(look, 100)
      } else {
        setGaveUp(true)
      }
    }
    look()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [here, step, navigate])

  const ready = here === step.route && (!step.target || rect !== null || gaveUp)

  // Foco en "Siguiente" y teclado: Escape cierra, flechas navegan, Tab queda en el globo.
  useEffect(() => {
    if (!ready) return
    primary.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onNext()
      } else if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault()
        onBack()
      } else if (e.key === 'Tab' && popover.current) {
        const items = [...popover.current.querySelectorAll<HTMLElement>('button')]
        const [first, last] = [items[0], items[items.length - 1]]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        } else if (!popover.current.contains(document.activeElement)) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ready, index, onNext, onBack, onClose])

  // Dónde va el globo: junto al elemento en PC; abajo o arriba (lo opuesto al
  // elemento) en el celular; centrado si no hay elemento.
  const small = viewport.w < 640
  let style: CSSProperties
  if (!rect) {
    style = small ? { left: 12, right: 12, bottom: 12 } : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 440 }
  } else if (small) {
    style = rect.top + rect.height / 2 > viewport.h / 2 ? { left: 12, right: 12, top: 12 } : { left: 12, right: 12, bottom: 12 }
  } else {
    // Debajo si entra, si no arriba; si el elemento ocupa casi toda la pantalla, en la esquina.
    const width = 380
    const room = 280
    const left = Math.min(Math.max(rect.left, 16), viewport.w - width - 16)
    if (viewport.h - rect.bottom >= room) style = { left, top: rect.bottom + PAD + 10, width }
    else if (rect.top >= room) style = { left, bottom: viewport.h - rect.top + PAD + 10, width }
    else style = { right: 16, bottom: 16, width }
  }
  const last = index === total - 1

  return createPortal(
    <div className="fixed inset-0 z-[80]" data-tour-step={step.id} data-tour-anchored={rect ? 'true' : 'false'}>
      {/* Bloquea los clics a la app mientras dura el tour. */}
      <div className="absolute inset-0" aria-hidden onClick={(e) => e.stopPropagation()} />
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-lg outline-2 outline-offset-0 outline-primary outline transition-all duration-200"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
          }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/65" />
      )}
      {ready && (
        <div
          ref={popover}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          className="absolute max-h-[70dvh] overflow-y-auto rounded-xl border border-border bg-card p-4 text-card-foreground shadow-2xl"
          style={style}
        >
          <p className="mb-1 text-xs font-medium text-primary">
            Paso {index + 1} de {total}
          </p>
          <h2 id={titleId} className="mb-2 text-base font-semibold">
            {step.title}
          </h2>
          <div id={bodyId} className="flex flex-col gap-2 text-sm text-muted-foreground">
            {step.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>
              {last ? 'Cerrar' : 'Saltar tour'}
            </Button>
            <div className="flex gap-2">
              {index > 0 && (
                <Button size="sm" variant="outline" onClick={onBack}>
                  Atrás
                </Button>
              )}
              <Button ref={primary} size="sm" onClick={onNext}>
                {last ? 'Terminar' : 'Siguiente'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
