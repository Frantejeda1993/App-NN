import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge, Card, Field, Input, Select } from '@/components/ui/form'
import type { WriteResult } from '@/data/repo'
import { formatEuros, parseEuros } from '@/domain/money'
import { notifyError, notifyWrite } from '@/lib/notify'
import { cn } from '@/lib/utils'

export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'money' | 'int' | 'decimal' | 'select' | 'url'
  options?: { value: string; label: string }[]
  hint?: string
  wide?: boolean
}

interface Item {
  id: string
  name: string
  active: boolean
  [k: string]: unknown
}

type SafeParse = (x: unknown) =>
  | { success: true; data: unknown }
  | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } }

const toText = (f: FieldDef, v: unknown): string => {
  if (v === null || v === undefined) return ''
  if (f.type === 'money') return formatEuros(v as number).replace(/\s?€/, '')
  if (f.type === 'decimal') return String(v).replace('.', ',')
  return String(v)
}

const fromText = (f: FieldDef, s: string): unknown => {
  if (f.type === 'money') return parseEuros(s) ?? Number.NaN
  if (f.type === 'int') return s.trim() === '' ? Number.NaN : Number(s)
  if (f.type === 'decimal') return s.trim() === '' ? Number.NaN : Number(s.replace(',', '.'))
  return s
}

/**
 * Lista + formulario genérico para un catálogo (materiales, cantos, herrajes).
 * Nada se borra: se desactiva, porque los presupuestos lo referencian.
 */
export function SimpleCatalogTab<T extends Item>({
  title,
  items,
  fields,
  defaults,
  summary,
  safeParse,
  onCreate,
  onUpdate,
  addLabel,
}: {
  title: string
  items: T[]
  fields: FieldDef[]
  defaults: Record<string, unknown>
  summary: (item: T) => string
  safeParse: SafeParse
  onCreate: (data: never) => WriteResult
  onUpdate: (id: string, data: never) => WriteResult
  addLabel: string
}) {
  const [editing, setEditing] = useState<{ id: string | null; values: Record<string, string> } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const open = (item: T | null) => {
    const src: Record<string, unknown> = item ?? defaults
    setErrors({})
    setEditing({ id: item?.id ?? null, values: Object.fromEntries(fields.map((f) => [f.key, toText(f, src[f.key])])) })
  }

  const save = () => {
    if (!editing) return
    const base = (editing.id ? items.find((i) => i.id === editing.id) : undefined) ?? defaults
    const data = { ...base, ...Object.fromEntries(fields.map((f) => [f.key, fromText(f, editing.values[f.key])])) }
    const parsed = safeParse(data)
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message
      setErrors(errs)
      return
    }
    try {
      const res = editing.id ? onUpdate(editing.id, parsed.data as never) : onCreate(parsed.data as never)
      notifyWrite(res, editing.id ? 'Guardado' : 'Creado')
      setEditing(null)
    } catch (e) {
      notifyError(e)
    }
  }

  const toggle = (item: T) => {
    const parsed = safeParse({ ...item, active: !item.active })
    if (parsed.success) notifyWrite(onUpdate(item.id, parsed.data as never), item.active ? 'Desactivado' : 'Reactivado')
  }

  return (
    <div className="flex flex-col gap-4">
      {editing ? (
        <Card>
          <h2 className="mb-3 font-semibold">{editing.id ? 'Editar' : addLabel}</h2>
          <form
            noValidate
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            {fields.map((f) => {
              const id = `cat-${f.key}`
              const set = (v: string) => setEditing({ ...editing, values: { ...editing.values, [f.key]: v } })
              return (
                <Field key={f.key} id={id} label={f.label} hint={f.hint} error={errors[f.key]} className={cn(f.wide && 'md:col-span-2')}>
                  {f.type === 'select' ? (
                    <Select id={id} value={editing.values[f.key]} onChange={(e) => set(e.target.value)}>
                      {f.options!.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      id={id}
                      type={f.type === 'url' ? 'url' : 'text'}
                      inputMode={f.type === 'text' || f.type === 'url' ? undefined : 'decimal'}
                      value={editing.values[f.key]}
                      onChange={(e) => set(e.target.value)}
                    />
                  )}
                </Field>
              )
            })}
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit">Guardar</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <div>
          <Button onClick={() => open(null)}>
            <Plus /> {addLabel}
          </Button>
        </div>
      )}

      <Card>
        <h2 className="mb-2 font-semibold">{title}</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay nada cargado.</p>
        ) : (
          <ul aria-label={title} className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className={cn('flex flex-wrap items-center justify-between gap-2 py-2', !item.active && 'opacity-60')}>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {item.name} {!item.active && <Badge tone="muted">Inactivo</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">{summary(item)}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => open(item)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggle(item)}>
                    {item.active ? 'Desactivar' : 'Reactivar'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
