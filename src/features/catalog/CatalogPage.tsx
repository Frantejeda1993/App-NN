import { Database, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, Field, Input } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import { useEdgeBanding, useHardware, useMaterials, useServiceRates, useTemplates } from '@/data/hooks'
import { excelSeed, excelTemplates, pricePerM2Cents } from '@/domain/catalog'
import { formatEuros, parseEuros } from '@/domain/money'
import { notifyError, notifyWrite } from '@/lib/notify'
import { cn } from '@/lib/utils'
import {
  EdgeBandingDataSchema,
  HARDWARE_KINDS,
  HARDWARE_UNITS,
  HardwareDataSchema,
  MaterialDataSchema,
  ServiceRatesSchema,
  type ServiceRates,
} from '@/model'
import { SimpleCatalogTab } from './SimpleCatalogTab'
import { HARDWARE_KIND_LABELS, HARDWARE_UNIT_LABELS } from './labels'

const TABS = {
  materiales: 'Materiales',
  cantos: 'Cantos',
  herrajes: 'Herrajes y extras',
  tarifas: 'Tarifas',
  plantillas: 'Plantillas',
} as const
type Tab = keyof typeof TABS

const supplierFields = [
  { key: 'supplier', label: 'Proveedor', type: 'text' as const },
  { key: 'url', label: 'Link de compra', type: 'url' as const },
  { key: 'notes', label: 'Notas', type: 'text' as const, wide: true },
]

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab')
  const tab: Tab = requested && Object.hasOwn(TABS, requested) ? (requested as Tab) : 'materiales'
  const api = useData()
  const me = useMyEmail()
  const materials = useMaterials()
  const edges = useEdgeBanding()
  const hardware = useHardware()
  const rates = useServiceRates()
  // Evita duplicar el catálogo con un doble clic mientras llegan las escrituras.
  const [seeding, setSeeding] = useState(false)

  if (!materials || !edges || !hardware || !rates) return <p className="text-sm text-muted-foreground">Cargando…</p>
  const empty = materials.length === 0 && edges.length === 0 && hardware.length === 0

  const seedFromExcel = () => {
    if (seeding) return
    setSeeding(true)
    try {
      const seed = excelSeed()
      for (const m of seed.materials) api.createMaterial(m, me).committed.catch(notifyError)
      for (const e of seed.edgeBanding) api.createEdgeBanding(e, me).committed.catch(notifyError)
      for (const h of seed.hardware) api.createHardware(h, me).committed.catch(notifyError)
      // No pisar tarifas ya guardadas: solo completa el corte/canteado si nunca se configuró.
      if (!rates.exists || rates.rates.cutAndEdgePerM2Cents === ServiceRatesSchema.parse({}).cutAndEdgePerM2Cents) {
        api.saveServiceRates({ ...rates.rates, ...seed.services }, rates.exists, me).committed.catch(notifyError)
      }
      notifyWrite(
        { id: 'seed', committed: Promise.resolve() },
        `Cargados ${seed.materials.length} materiales, ${seed.hardware.length} herrajes y ${seed.edgeBanding.length} cantos`,
      )
    } catch (e) {
      notifyError(e)
      setSeeding(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1>
      {empty && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            El catálogo está vacío. Podés cargar los materiales, herrajes, cantos y la tarifa de corte de tu Excel (hoja DB) y
            después ajustarlos.
          </p>
          <Button onClick={seedFromExcel} disabled={seeding}>
            <Database /> Cargar valores iniciales
          </Button>
        </Card>
      )}
      <div role="tablist" aria-label="Catálogo" className="flex flex-wrap gap-1">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setParams(t === 'materiales' ? {} : { tab: t })}
            className={cn(
              'rounded-full px-3 py-1 text-sm',
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {TABS[t]}
          </button>
        ))}
      </div>

      {tab === 'materiales' && (
        <SimpleCatalogTab
          title="Materiales (tableros)"
          addLabel="Nuevo material"
          items={materials}
          safeParse={(x) => MaterialDataSchema.safeParse(x)}
          defaults={{ ...MaterialDataSchema.parse({ name: 'x', sheetWidthMm: 2850, sheetHeightMm: 2100, thicknessMm: 19, sheetPriceCents: 0 }), name: '' }}
          fields={[
            { key: 'name', label: 'Nombre *', type: 'text', wide: true },
            { key: 'sheetWidthMm', label: 'Ancho de placa (mm)', type: 'int' },
            { key: 'sheetHeightMm', label: 'Alto de placa (mm)', type: 'int' },
            { key: 'thicknessMm', label: 'Espesor (mm)', type: 'decimal' },
            { key: 'sheetPriceCents', label: 'Precio por placa (€)', type: 'money' },
            { key: 'wasteFactor', label: 'Factor de desperdicio', type: 'decimal', hint: '1,3 = +30 %' },
            ...supplierFields,
          ]}
          summary={(m) =>
            `${m.sheetWidthMm}×${m.sheetHeightMm} · ${m.thicknessMm} mm · ${formatEuros(m.sheetPriceCents)} la placa (${formatEuros(pricePerM2Cents(m))}/m²) · desperdicio ×${String(m.wasteFactor).replace('.', ',')}`
          }
          onCreate={(d) => api.createMaterial(d, me)}
          onUpdate={(id, d) => api.updateMaterial(id, d, me)}
        />
      )}

      {tab === 'cantos' && (
        <SimpleCatalogTab
          title="Cantos"
          addLabel="Nuevo canto"
          items={edges}
          safeParse={(x) => EdgeBandingDataSchema.safeParse(x)}
          defaults={{ ...EdgeBandingDataSchema.parse({ name: 'x', pricePerMeterCents: 0 }), name: '' }}
          fields={[
            { key: 'name', label: 'Nombre *', type: 'text', wide: true },
            { key: 'pricePerMeterCents', label: 'Precio por metro (€)', type: 'money' },
            ...supplierFields,
          ]}
          summary={(e) => `${formatEuros(e.pricePerMeterCents)}/ml${e.supplier ? ` · ${e.supplier}` : ''}`}
          onCreate={(d) => api.createEdgeBanding(d, me)}
          onUpdate={(id, d) => api.updateEdgeBanding(id, d, me)}
        />
      )}

      {tab === 'herrajes' && (
        <SimpleCatalogTab
          title="Herrajes y extras"
          addLabel="Nuevo herraje"
          items={hardware}
          safeParse={(x) => HardwareDataSchema.safeParse(x)}
          defaults={{ ...HardwareDataSchema.parse({ name: 'x', kind: 'bisagra', unit: 'u', priceCents: 0 }), name: '' }}
          fields={[
            { key: 'name', label: 'Nombre *', type: 'text', wide: true },
            { key: 'kind', label: 'Tipo', type: 'select', options: HARDWARE_KINDS.map((k) => ({ value: k, label: HARDWARE_KIND_LABELS[k] })) },
            { key: 'unit', label: 'Se cobra por', type: 'select', options: HARDWARE_UNITS.map((u) => ({ value: u, label: HARDWARE_UNIT_LABELS[u] })) },
            { key: 'priceCents', label: 'Precio (€)', type: 'money' },
            ...supplierFields,
          ]}
          summary={(h) => `${HARDWARE_KIND_LABELS[h.kind]} · ${formatEuros(h.priceCents)} por ${HARDWARE_UNIT_LABELS[h.unit]}${h.supplier ? ` · ${h.supplier}` : ''}`}
          onCreate={(d) => api.createHardware(d, me)}
          onUpdate={(id, d) => api.updateHardware(id, d, me)}
        />
      )}

      {tab === 'tarifas' && <RatesTab />}
      {tab === 'plantillas' && <TemplatesTab />}
    </section>
  )
}

const RATE_FIELDS: { key: keyof ServiceRates; label: string; hint?: string; money: boolean }[] = [
  { key: 'cutAndEdgePerM2Cents', label: 'Corte y canteado (€ por m²)', hint: 'En el Excel: "SERVICIO TALLER M2"', money: true },
  { key: 'laborPerM2Cents', label: 'Mano de obra sugerida (€ por m²)', money: true },
  { key: 'laborPerDoorCents', label: 'Mano de obra por puerta (€)', money: true },
  { key: 'laborPerDrawerCents', label: 'Mano de obra por cajón (€)', money: true },
  { key: 'laborPerHardwareUnitCents', label: 'Mano de obra por herraje (€)', money: true },
  { key: 'materialsMultiplier', label: 'Multiplicador sobre materiales', hint: 'Ej.: 2,3 (0 = no usar)', money: false },
]

function RatesTab() {
  const state = useServiceRates()
  if (!state) return <p className="text-sm text-muted-foreground">Cargando…</p>
  // Se inicializa una vez con lo guardado; después el formulario es del usuario.
  return <RatesForm key={state.exists ? 'saved' : 'new'} state={state} />
}

function RatesForm({ state }: { state: { rates: ServiceRates; exists: boolean } }) {
  const api = useData()
  const me = useMyEmail()
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      RATE_FIELDS.map((f) => [
        f.key,
        f.money ? formatEuros(state.rates[f.key]).replace(/\s?€/, '') : String(state.rates[f.key]).replace('.', ','),
      ]),
    ),
  )
  const [error, setError] = useState<string | null>(null)

  return (
    <Card>
      <h2 className="mb-1 font-semibold">Tarifas para el cálculo sugerido</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Se usan para sugerir el precio de cada mueble; el precio final siempre lo podés escribir a mano.
      </p>
      <form
        noValidate
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          const next = Object.fromEntries(
            RATE_FIELDS.map((f) => [
              f.key,
              f.money
                ? (parseEuros(values[f.key]) ?? Number.NaN)
                : values[f.key].trim() === ''
                  ? Number.NaN
                  : Number(values[f.key].replace(',', '.')),
            ]),
          )
          const parsed = ServiceRatesSchema.safeParse(next)
          if (!parsed.success) {
            setError('Revisá los importes: deben ser números positivos.')
            return
          }
          setError(null)
          try {
            notifyWrite(api.saveServiceRates(parsed.data, state.exists, me), 'Tarifas guardadas')
          } catch (err) {
            notifyError(err)
          }
        }}
      >
        {RATE_FIELDS.map((f) => (
          <Field key={f.key} id={`rate-${f.key}`} label={f.label} hint={f.hint}>
            <Input
              id={`rate-${f.key}`}
              inputMode="decimal"
              value={values[f.key]}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            />
          </Field>
        ))}
        {error && (
          <p role="alert" className="text-sm text-destructive md:col-span-2">
            {error}
          </p>
        )}
        <div className="md:col-span-2">
          <Button type="submit">Guardar tarifas</Button>
        </div>
      </form>
    </Card>
  )
}

function TemplatesTab() {
  const api = useData()
  const me = useMyEmail()
  const templates = useTemplates()
  const materials = useMaterials()
  const hardware = useHardware()
  const [seeding, setSeeding] = useState(false)
  if (!templates || !materials || !hardware) return <p className="text-sm text-muted-foreground">Cargando…</p>

  // Carga las plantillas comunes del Excel que todavía no existan (por nombre).
  const seedTemplates = () => {
    if (seeding) return
    setSeeding(true)
    try {
      const { templates: seed, missing } = excelTemplates(materials, hardware)
      const existing = new Set(templates.map((t) => t.name.trim().toLowerCase()))
      const fresh = seed.filter((t) => !existing.has(t.name.toLowerCase()))
      for (const t of fresh) api.createTemplate(t, me).committed.catch(notifyError)
      notifyWrite(
        { id: 'seed-templates', committed: Promise.resolve() },
        fresh.length === 0 ? 'Las plantillas del Excel ya estaban cargadas' : `Cargadas ${fresh.length} plantillas del Excel`,
      )
      if (fresh.length > 0 && missing.length > 0) {
        notifyError(new Error(`Faltan en el catálogo (quedaron sin asignar): ${missing.join(', ')}`))
      }
    } catch (e) {
      notifyError(e)
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Link to="/catalogo/plantillas/nueva" className={buttonVariants()}>
          <Plus /> Nueva plantilla
        </Link>
        <Button variant="outline" onClick={seedTemplates} disabled={seeding}>
          Cargar plantillas del Excel
        </Button>
      </div>
      <Card>
        <h2 className="mb-2 font-semibold">Plantillas de mueble</h2>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Bajo mesada, alacena, placard… Guardá los muebles que más hacés.</p>
        ) : (
          <ul aria-label="Plantillas" className="flex flex-col divide-y divide-border">
            {templates.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[t.category, `${t.item.widthMm}×${t.item.heightMm}×${t.item.depthMm} mm`, `${t.item.doors.count} puertas`, `${t.item.drawers.count} cajones`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Link to={`/catalogo/plantillas/${t.id}`} className={buttonVariants({ size: 'sm', variant: 'ghost' })}>
                    Editar
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar la plantilla "${t.name}"? Los presupuestos ya hechos no cambian.`)) {
                        notifyWrite(api.deleteTemplate(t.id), 'Plantilla eliminada')
                      }
                    }}
                  >
                    Eliminar
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
