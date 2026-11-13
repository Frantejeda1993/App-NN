import type { HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Campos: 44 px de alto en celular (táctil) y 40 px en pantalla; 16 px de letra en celular (sin zoom en iOS). */
const control = [
  // min-w-0 + max-w-full: un selector con opciones largas nunca ensancha la página (desborde en celular).
  'w-full min-w-0 max-w-full rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground shadow-xs md:text-sm',
  'transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground',
  'hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25',
  'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
  'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/25',
].join(' ')

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, 'h-11 md:h-10', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, 'min-h-24', className)} {...props} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, 'h-11 pr-2 md:h-10', className)} {...props} />
}

/** Etiqueta + control + error, accesible (el error se anuncia). */
export function Field({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm md:p-5', className)} {...props} />
}

export function Badge({
  tone = 'default',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: 'default' | 'success' | 'warning' | 'danger' | 'muted' }) {
  const tones = {
    default: 'bg-primary/12 text-primary ring-primary/20',
    success: 'bg-success/12 text-success ring-success/25',
    warning: 'bg-warning/15 text-warning ring-warning/30',
    danger: 'bg-destructive/10 text-destructive ring-destructive/20',
    muted: 'bg-muted text-muted-foreground ring-border',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
