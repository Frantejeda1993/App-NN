import type { HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const control =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 aria-[invalid=true]:border-destructive'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, 'h-10', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, 'min-h-20', className)} {...props} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, 'h-10', className)} {...props} />
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
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-border bg-card p-4 md:p-5', className)} {...props} />
}

export function Badge({
  tone = 'default',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: 'default' | 'warning' | 'danger' | 'muted' }) {
  const tones = {
    default: 'bg-primary/10 text-primary',
    warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    danger: 'bg-destructive/10 text-destructive',
    muted: 'bg-muted text-muted-foreground',
  }
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone], className)}
      {...props}
    />
  )
}
