import { Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import type { EdgeBanding, Hardware, Material } from '@/data/api'
import { MoneyInput } from '@/components/ui/money-input'
import { formatEuros } from '@/domain/money'
import type { FurnitureItem } from '@/model'

/** Lo que se edita de un mueble (en plantillas no hay id ni aceptación). */
export type FurnitureDraft = Omit<FurnitureItem, 'id' | 'accepted'>

export interface CatalogRefs {
  materials: Material[]
  hardware: Hardware[]
  edgeBanding: EdgeBanding[]
}

/**
 * Editor de un mueble: medidas, materiales, puertas, cajones, cantos, herrajes y
 * extras. Se usa en plantillas y en el editor de presupuestos.
 */
export function FurnitureItemEditor({
  value,
  onChange,
  catalog,
  errors = {},
  idPrefix = 'fi',
}: {
  value: FurnitureDraft
  onChange: (next: FurnitureDraft) => void
  catalog: CatalogRefs
  errors?: Record<string, string>
  idPrefix?: string
}) {
  const set = <K extends keyof FurnitureDraft>(k: K, v: FurnitureDraft[K]) => onChange({ ...value, [k]: v })
  const id = (s: string) => `${idPrefix}-${s}`
  const keep = (ids: (string | null | undefined)[]) => new Set(ids.filter(Boolean))
  const usedMaterials = keep([value.structure.materialId, value.back?.materialId, value.fronts.materialId])
  const materials = catalog.materials.filter((m) => m.active || usedMaterials.has(m.id))
  // Cada lista ofrece solo herrajes de su tipo; uno inactivo sigue visible solo
  // en la lista donde ya está usado.
  const hw = (pred: (h: Hardware) => boolean, used: (string | null | undefined)[]) => {
    const own = keep(used)
    return catalog.hardware.filter((h) => pred(h) && (h.active || own.has(h.id)))
  }
  const hinges = hw((h) => h.kind === 'bisagra', value.doors.hinges.map((h) => h.hardwareId))
  const slides = hw((h) => h.kind === 'guia', [value.drawers.slideHardwareId])
  const perMeter = hw((h) => h.unit === 'ml', value.linearExtras.map((h) => h.hardwareId))
  const others = hw((h) => h.unit !== 'ml' && h.kind !== 'bisagra', value.hardware.map((h) => h.hardwareId))
  const edges = catalog.edgeBanding.filter((e) => e.active || e.id === value.edgeBanding.edgeBandingId)

  const materialSelect = (key: 'structure' | 'fronts' | 'back', label: string) => {
    const panel = value[key]
    return (
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <Field id={id(`${key}-mat`)} label={label}>
          <Select
            id={id(`${key}-mat`)}
            value={key === 'back' && panel === null ? '__none' : (panel?.materialId ?? '')}
            onChange={(e) => {
              const v = e.target.value
              if (key === 'back' && v === '__none') return set('back', null)
              const mat = catalog.materials.find((m) => m.id === v)
              set(key, { materialId: v || null, thicknessMm: mat?.thicknessMm ?? panel?.thicknessMm ?? 19 })
            }}
          >
            {key === 'back' && <option value="__none">Sin trasera</option>}
            <option value="">Elegí un material…</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        {panel && (
          <Field id={id(`${key}-mm`)} label="Espesor">
            <NumInput id={id(`${key}-mm`)} value={panel.thicknessMm} onChange={(n) => set(key, { ...panel, thicknessMm: n })} />
          </Field>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <Section title="Medidas">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field id={id('name')} label="Nombre del mueble *" error={errors.name} className="sm:col-span-2 lg:col-span-3">
            <Input id={id('name')} value={value.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej.: Bajo mesada 60" />
          </Field>
          <Field id={id('w')} label="Ancho (mm)" error={errors.widthMm}>
            <NumInput id={id('w')} value={value.widthMm} onChange={(n) => set('widthMm', n)} />
          </Field>
          <Field id={id('h')} label="Alto (mm)" error={errors.heightMm}>
            <NumInput id={id('h')} value={value.heightMm} onChange={(n) => set('heightMm', n)} />
          </Field>
          <Field id={id('d')} label="Profundidad (mm)" error={errors.depthMm}>
            <NumInput id={id('d')} value={value.depthMm} onChange={(n) => set('depthMm', n)} />
          </Field>
          <Field id={id('qty')} label="Cantidad" error={errors.quantity}>
            <NumInput id={id('qty')} value={value.quantity} onChange={(n) => set('quantity', n)} />
          </Field>
          <Field id={id('shelves')} label="Estantes">
            <NumInput id={id('shelves')} value={value.shelves} onChange={(n) => set('shelves', n)} />
          </Field>
          <Field id={id('dividers')} label="Divisiones">
            <NumInput id={id('dividers')} value={value.dividers} onChange={(n) => set('dividers', n)} />
          </Field>
        </div>
      </Section>

      <Section title="Materiales">
        <div className="grid gap-3 xl:grid-cols-3">
          {materialSelect('structure', 'Estructura')}
          {materialSelect('back', 'Trasera')}
          {materialSelect('fronts', 'Frentes (puertas/cajones)')}
        </div>
      </Section>

      <Section title="Puertas y cajones">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Field id={id('doors')} label="Puertas">
              <NumInput id={id('doors')} value={value.doors.count} onChange={(n) => set('doors', { ...value.doors, count: n })} />
            </Field>
            <Lines
              label="Bisagras"
              idPrefix={id('hinge')}
              options={hinges}
              lines={value.doors.hinges.map((l) => ({ hardwareId: l.hardwareId, n: l.qty }))}
              max={2}
              nLabel="Cantidad"
              onChange={(ls) => set('doors', { ...value.doors, hinges: ls.map((l) => ({ hardwareId: l.hardwareId, qty: l.n })) })}
            />
          </div>
          <div className="grid grid-cols-[6rem_1fr] gap-2 self-start">
            <Field id={id('drawers')} label="Cajones">
              <NumInput id={id('drawers')} value={value.drawers.count} onChange={(n) => set('drawers', { ...value.drawers, count: n })} />
            </Field>
            <Field id={id('slide')} label="Guía de cajón">
              <Select
                id={id('slide')}
                value={value.drawers.slideHardwareId ?? ''}
                onChange={(e) => set('drawers', { ...value.drawers, slideHardwareId: e.target.value || null })}
              >
                <option value="">Sin guía</option>
                {slides.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({formatEuros(h.priceCents)})
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Cantos, herrajes y extras">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid grid-cols-[1fr_6rem] gap-2 self-start">
            <Field id={id('edge')} label="Canto">
              <Select
                id={id('edge')}
                value={value.edgeBanding.edgeBandingId ?? ''}
                onChange={(e) => set('edgeBanding', { ...value.edgeBanding, edgeBandingId: e.target.value || null })}
              >
                <option value="">Sin canto</option>
                {edges.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id={id('edge-m')} label="Metros">
              <NumInput
                id={id('edge-m')}
                decimal
                value={value.edgeBanding.meters}
                onChange={(n) => set('edgeBanding', { ...value.edgeBanding, meters: n })}
              />
            </Field>
          </div>
          <Lines
            label="Otros herrajes (tiradores, tip-on…)"
            idPrefix={id('hw')}
            options={others}
            lines={value.hardware.map((l) => ({ hardwareId: l.hardwareId, n: l.qty }))}
            nLabel="Cantidad"
            onChange={(ls) => set('hardware', ls.map((l) => ({ hardwareId: l.hardwareId, qty: l.n })))}
          />
          <Lines
            label="Extras por metro (LED, perfil, zócalo)"
            idPrefix={id('ml')}
            options={perMeter}
            lines={value.linearExtras.map((l) => ({ hardwareId: l.hardwareId, n: l.meters }))}
            nLabel="Metros"
            decimal
            onChange={(ls) => set('linearExtras', ls.map((l) => ({ hardwareId: l.hardwareId, meters: l.n })))}
          />
        </div>
      </Section>

      <Section title="Importes a mano">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field id={id('other')} label="Otros herrajes (€)" hint="Lo que no está en el catálogo">
            <MoneyInput id={id('other')} cents={value.otherHardwareCents} onChange={(c) => set('otherHardwareCents', c ?? 0)} />
          </Field>
          <Field id={id('complexity')} label="Complejidad (€)" hint="Esquinas, piezas especiales…">
            <MoneyInput id={id('complexity')} cents={value.complexityCents} onChange={(c) => set('complexityCents', c ?? 0)} />
          </Field>
          <Field id={id('labor')} label="Mano de obra (€)" hint="Vacío = usar la sugerida">
            <MoneyInput id={id('labor')} cents={value.laborCents} nullable onChange={(c) => set('laborCents', c)} />
          </Field>
          <Field id={id('notes')} label="Notas" className="sm:col-span-2 lg:col-span-3">
            <Textarea id={id('notes')} value={value.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  )
}

function NumInput({ id, value, onChange, decimal }: { id: string; value: number; onChange: (n: number) => void; decimal?: boolean }) {
  return (
    <Input
      id={id}
      type="number"
      inputMode={decimal ? 'decimal' : 'numeric'}
      min={0}
      step={decimal ? '0.1' : '1'}
      value={Number.isFinite(value) ? value : ''}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
    />
  )
}

function Lines({
  label,
  idPrefix,
  options,
  lines,
  onChange,
  nLabel,
  max = 20,
  decimal,
}: {
  label: string
  idPrefix: string
  options: Hardware[]
  lines: { hardwareId: string; n: number }[]
  onChange: (lines: { hardwareId: string; n: number }[]) => void
  nLabel: string
  max?: number
  decimal?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2">
          <Select
            aria-label={`${label} ${i + 1}`}
            value={l.hardwareId}
            onChange={(e) => onChange(lines.map((x, j) => (j === i ? { ...x, hardwareId: e.target.value } : x)))}
          >
            {options.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({formatEuros(h.priceCents)})
              </option>
            ))}
          </Select>
          <NumInput
            id={`${idPrefix}-${i}`}
            decimal={decimal}
            value={l.n}
            onChange={(n) => onChange(lines.map((x, j) => (j === i ? { ...x, n } : x)))}
          />
          <Button variant="ghost" size="icon" aria-label={`Quitar ${label} ${i + 1}`} onClick={() => onChange(lines.filter((_, j) => j !== i))}>
            <Trash2 />
          </Button>
          <label htmlFor={`${idPrefix}-${i}`} className="sr-only">
            {nLabel} {i + 1}
          </label>
        </div>
      ))}
      {lines.length < max && options.length > 0 && (
        <div>
          <Button size="sm" variant="outline" onClick={() => onChange([...lines, { hardwareId: options[0].id, n: 1 }])}>
            <Plus /> Agregar
          </Button>
        </div>
      )}
      {options.length === 0 && <p className="text-xs text-muted-foreground">No hay opciones en el catálogo.</p>}
    </div>
  )
}
