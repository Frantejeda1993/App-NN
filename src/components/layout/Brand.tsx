import logoUrl from '@/assets/logo.png'
import { cn } from '@/lib/utils'

/** Logo del taller (cuadrado con fondo crema, esquinas redondeadas). */
export function Logo({ className }: { className?: string }) {
  return <img src={logoUrl} alt="" aria-hidden className={cn('size-8 shrink-0 rounded-md object-cover', className)} />
}

/** Logo + nombre, para el menú, la cabecera del celular y el login. */
export function Brand({ className, logoClassName }: { className?: string; logoClassName?: string }) {
  return (
    <span className={cn('flex items-center gap-2 font-semibold tracking-tight', className)}>
      <Logo className={logoClassName} />
      <span>
        Taller <span className="text-primary">NN</span>
      </span>
    </span>
  )
}
