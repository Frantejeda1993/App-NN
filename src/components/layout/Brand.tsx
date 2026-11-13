import logoUrl from '@/assets/logo.png'
import { cn } from '@/lib/utils'

/** Logo del taller (cuadrado con fondo crema, esquinas redondeadas). */
export function Logo({ className }: { className?: string }) {
  return <img src={logoUrl} alt="" aria-hidden className={cn('size-8 shrink-0 rounded-lg object-cover shadow-sm', className)} />
}

/** Logo + nombre, para el menú, la cabecera del celular y el login. */
export function Brand({
  className,
  logoClassName,
  onDark = false,
}: {
  className?: string
  logoClassName?: string
  /** Sobre el menú pizarra: el "NN" en nogal claro para que se lea. */
  onDark?: boolean
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <Logo className={logoClassName} />
      <span className="font-display text-[1.15em] leading-none tracking-tight">
        Taller <span className={onDark ? 'text-sidebar-primary' : 'text-primary'}>NN</span>
      </span>
    </span>
  )
}
