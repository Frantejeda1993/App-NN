import { ArrowLeft, Box, CopyPlus, FileDown, Plus, Save, Trash2 } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Badge, Card, Field, Input, Select, Textarea } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import type { Client, Project, Quote, Template } from '@/data/api'
import { useClients, useProjects, useQuote, useQuotes, useTemplates, useWorkshopSettings } from '@/data/hooks'
import { formatDateEs, todayIso } from '@/domain/dates'
import { bpToPercent, percentToBp } from '@/domain/percent'
import { computeQuote, type RatesLike } from '@/domain/quote'
import { shoppingList, type ShoppingCatalog } from '@/domain/shopping'
import {
  STATUS_LABELS,
  applyStatus,
  fallbackAcceptedQuote,
  isAcceptedStatus,
  itemFromTemplate,
  newLocalId,
  newVersionInput,
  nextStatuses,
  projectPatchForQuote,
} from '@/domain/quoteLifecycle'
import { Furniture3DView } from '@/features/furniture/Furniture3DView'
import type { CatalogRefs } from '@/features/furniture/FurnitureItemEditor'
import { notifyError, notifyWrite } from '@/lib/notify'
import {
  FurnitureItemSchema,
  ProjectDataSchema,
  QuoteDataSchema,
  type FurnitureItem,
  type QuoteData,
  type QuoteStatus,
  type WorkshopSettings,
} from '@/model'
import { pdfFileName, quotePdfModel } from '@/domain/quotePdf'
import { withEditedItem, type ItemEdit } from './itemEdit'
import { QuoteItemDialog } from './QuoteItemDialog'
import { QuoteItemRow } from './QuoteItemRow'
import { AdjustmentsEditor, FreeLinesEditor, QuoteSummary } from './QuoteParts'
import { ShoppingListCard } from './ShoppingListCard'
import { QUOTE_TONES, useQuoteCatalog } from './shared'
import { Loading } from '@/components/ui/loading'

const back = '/presupuestos'

/** Etiqueta del botón para pasar a cada estado. */
const ACTION_LABELS: Record<QuoteStatus, string> = {
  borrador: 'Borrador',
  enviado: 'Marcar enviado',
  aceptado: 'Aceptado (todo)',
  aceptado_parcial: 'Aceptado parcial (lo marcado)',
  rechazado: 'Rechazado',
  vencido: 'Vencido',
  finalizado: 'Finalizar',
  archivado: 'Archivar',
}

const CONFLICT_MESSAGE = 'Otro socio modificó este presupuesto mientras editabas. Descartá tus cambios para ver los suyos.'

const msOf = (q: { updatedAt: unknown }) => (q.updatedAt as { toMillis?: () => number } | null)?.toMillis?.() ?? 0

function dataOf(q: Quote): QuoteData {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, createdBy, createdAt, updatedBy, updatedAt, ...data } = q
  return structuredClone(data) as QuoteData
}

/** JSON con claves ordenadas: compara datos sin depender del orden de los campos. */
const stableKey = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : x,
  )

/** `/presupuestos/:id`: editor del presupuesto. */
export function QuoteEditorPage() {
  const { id = '' } = useParams()
  const quote = useQuote(id)
  const quotes = useQuotes()
  const catalog = useQuoteCatalog()
  const projects = useProjects()
  const clients = useClients()
  const templates = useTemplates()
  const settings = useWorkshopSettings()

  if (quote === undefined || !quotes || !catalog || !projects || !clients || !templates || !settings) {
    return <Loading />
  }
  if (quote === null) {
    return (
      <section className="flex flex-col gap-3">
        <p>No se encontró el presupuesto.</p>
        <Link to={back} className="text-primary underline">
          Volver a presupuestos
        </Link>
      </section>
    )
  }
  return (
    <Editor
      key={quote.id}
      quote={quote}
      quotes={quotes}
      refs={catalog.refs}
      maps={catalog.maps}
      rates={catalog.rates}
      projects={projects}
      clients={clients}
      templates={templates}
      validityDays={settings.settings.quoteValidityDays}
      workshop={settings.settings}
    />
  )
}

function Editor({
  quote,
  quotes,
  refs,
  maps,
  rates,
  projects,
  clients,
  templates,
  validityDays,
  workshop,
}: {
  quote: Quote
  quotes: Quote[]
  refs: CatalogRefs
  maps: ShoppingCatalog
  rates: RatesLike
  projects: Project[]
  clients: Client[]
  templates: Template[]
  validityDays: number
  workshop: WorkshopSettings
}) {
  const api = useData()
  const me = useMyEmail()
  const navigate = useNavigate()
  const today = todayIso()

  const [draft, setDraftState] = useState<QuoteData>(() => dataOf(quote))
  const [dirty, setDirty] = useState(false)
  // Versión del servidor sobre la que se está editando y lo último que escribimos
  // nosotros (para no confundir nuestro propio guardado con un cambio de otro socio).
  const [baseMs, setBaseMs] = useState(() => msOf(quote))
  const [lastWritten, setLastWritten] = useState<string | null>(null)
  const [itemEdit, setItemEdit] = useState<ItemEdit | null>(null)
  const [openItem, setOpenItem] = useState<string | null>(null)
  const [view3d, setView3d] = useState<{ title: string; items: { key: string; label?: string; item: FurnitureItem }[] } | null>(null)
  // Texto de la seña mientras se escribe (vacío o inválido no pisa el valor guardado).
  const [depositText, setDepositText] = useState<string | null>(null)
  const creatingVersion = useRef(false)
  const materialName = useCallback((id: string | null) => (id ? maps.materials.get(id)?.name : undefined), [maps])

  const serverMs = msOf(quote)
  if (serverMs !== baseMs) {
    const mine = lastWritten !== null && stableKey(dataOf(quote)) === lastWritten
    if (!dirty || mine) {
      setBaseMs(serverMs)
      if (!dirty) setDraftState(dataOf(quote))
    }
  }
  const conflict = dirty && serverMs !== baseMs

  const setDraft = (next: QuoteData) => {
    setDraftState(next)
    setDirty(true)
  }

  const totals = useMemo(() => computeQuote(draft, maps, rates), [draft, maps, rates])
  const shopping = useMemo(() => shoppingList(draft, maps), [draft, maps])
  const editable = draft.status === 'borrador'
  const acceptable = ['enviado', 'vencido', 'aceptado', 'aceptado_parcial'].includes(draft.status)
  const project = projects.find((p) => p.id === draft.projectId) ?? null
  const client = clients.find((c) => c.id === (draft.clientId ?? project?.clientId))

  /** El proyecto a actualizar junto con el presupuesto (mismo lote), si hace falta. */
  const projectUpdate = (next: QuoteData) => {
    const p = next.projectId ? projects.find((x) => x.id === next.projectId) : undefined
    if (!p) return undefined
    const patch = projectPatchForQuote(
      p,
      { id: quote.id, ...next },
      { previousStatus: draft.status, fallbackAcceptedId: fallbackAcceptedQuote(quotes, p.id, quote.id) },
    )
    return patch ? { id: p.id, next: ProjectDataSchema.parse({ ...p, ...patch }) } : undefined
  }

  /**
   * Valida y guarda con totales; el proyecto (si cambia) va en el mismo lote.
   * `message` null = guardado silencioso (solo avisa si falla).
   */
  const write = (next: QuoteData, message: string | null) => {
    if (conflict) {
      notifyError(new Error(CONFLICT_MESSAGE))
      return false
    }
    const t = computeQuote(next, maps, rates)
    const parsed = QuoteDataSchema.safeParse({
      ...next,
      totals: {
        subtotalCents: t.subtotalCents,
        totalCents: t.totalCents,
        acceptedTotalCents: t.acceptedTotalCents,
      },
    })
    if (!parsed.success) {
      const i = parsed.error.issues[0]
      const where =
        {
          freeLines: 'Líneas libres',
          adjustments: 'Ajustes',
          items: 'Muebles',
          title: 'Título',
        }[String(i.path[0])] ?? String(i.path[0])
      notifyError(new Error(`${where}: ${i.message}`))
      return false
    }
    try {
      const project = projectUpdate(parsed.data)
      // El servidor lo guarda con rev + 1: así lo reconocemos como nuestro cuando llega.
      const written = { ...parsed.data, rev: parsed.data.rev + 1 }
      setLastWritten(stableKey(written))
      const res = api.updateQuote(quote.id, parsed.data, me, project)
      if (message) notifyWrite(res, project ? `${message} · proyecto actualizado` : message)
      else res.committed.catch(notifyError)
      setDraftState(written)
      setDirty(false)
      return true
    } catch (e) {
      notifyError(e)
      return false
    }
  }

  /**
   * Marcar compras guarda SOLO la lista de compras sobre lo que está en el
   * servidor: nunca se cuelan otros cambios sin guardar del borrador.
   */
  const togglePurchased = (key: string, bought: boolean) => {
    if (conflict) return notifyError(new Error(CONFLICT_MESSAGE))
    const base = dataOf(quote)
    const purchased = bought ? [...new Set([...base.purchased, key])] : base.purchased.filter((k) => k !== key)
    try {
      const res = api.updateQuote(quote.id, { ...base, purchased }, me)
      res.committed.catch(notifyError)
      setLastWritten(stableKey({ ...base, purchased, rev: base.rev + 1 }))
      setDraftState((d) => ({ ...d, purchased, rev: base.rev + 1 }))
    } catch (e) {
      notifyError(e)
    }
  }

  const changeStatus = (to: QuoteStatus) => {
    if (itemEdit) return notifyError(new Error('Terminá de editar el mueble antes de cambiar el estado.'))
    try {
      write(applyStatus(draft, to, today), `Estado: ${STATUS_LABELS[to]}`)
    } catch (e) {
      notifyError(e)
    }
  }

  const newVersion = () => {
    if (dirty) return notifyError(new Error('Guardá o descartá los cambios antes de crear una versión nueva.'))
    if (creatingVersion.current) return
    creatingVersion.current = true
    try {
      const res = api.createQuote(newVersionInput({ ...dataOf(quote), id: quote.id }, today, validityDays), me)
      notifyWrite(res, `Versión ${quote.version + 1} creada`)
      navigate(`/presupuestos/${res.id}`)
    } catch (e) {
      creatingVersion.current = false
      notifyError(e)
    }
  }

  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfWith3d, setPdfWith3d] = useState(true)
  const downloadPdf = async () => {
    if (pdfBusy) return
    setPdfBusy(true)
    try {
      const model = quotePdfModel({ quote: draft, totals, catalog: maps, workshop, client: client ?? null, today })
      const shown = draft.status === 'borrador' ? draft.items : draft.items.filter((i) => i.accepted)
      const [{ downloadQuotePdf }, image3d] = await Promise.all([
        import('./pdf'),
        pdfWith3d && shown.length > 0
          ? import('@/features/furniture/render3d').then((r) => r.renderFurniturePng(shown, materialName))
          : Promise.resolve(null),
      ])
      await downloadQuotePdf(model, pdfFileName(draft, client?.name ?? null), image3d)
    } catch (e) {
      notifyError(e)
    } finally {
      setPdfBusy(false)
    }
  }

  const remove = () => {
    if (!window.confirm(`¿Eliminar el borrador "${draft.title}"? No se puede deshacer.`)) return
    notifyWrite(api.deleteQuote(quote.id), 'Presupuesto eliminado')
    navigate(back)
  }

  // ---- muebles ----
  const startItem = (item: FurnitureItem, itemId: string | null) => setItemEdit({ itemId, item: structuredClone(item), errors: {} })
  const blankItem = () =>
    startItem(
      {
        ...FurnitureItemSchema.parse({
          id: newLocalId(),
          name: 'x',
          widthMm: 600,
          heightMm: 720,
          depthMm: 560,
        }),
        name: '',
      },
      null,
    )

  const saveItem = () => {
    if (!itemEdit) return
    const parsed = FurnitureItemSchema.safeParse(itemEdit.item)
    if (!parsed.success) {
      const errs = Object.fromEntries(
        [...parsed.error.issues].reverse().map((i) => [String(i.path[0]), i.message] as const),
      )
      setItemEdit({ ...itemEdit, errors: errs })
      return
    }
    setDraft({ ...draft, items: withEditedItem(draft.items, itemEdit, parsed.data) })
    setItemEdit(null)
  }

  // Vista previa: el presupuesto con el mueble en edición incluido (las placas se
  // comparten entre muebles, así que el precio depende de todo el presupuesto).
  const preview = useMemo(() => {
    if (!itemEdit) return null
    const items = withEditedItem(draft.items, itemEdit, itemEdit.item)
    const idx = items.findIndex((x) => x.id === itemEdit.item.id)
    try {
      return computeQuote({ ...draft, items }, maps, rates).items[idx] ?? null
    } catch {
      return null
    }
  }, [itemEdit, draft, maps, rates])

  const updateItem = (id: string, fn: (it: FurnitureItem) => FurnitureItem) =>
    setDraft({ ...draft, items: draft.items.map((x) => (x.id === id ? fn(x) : x)) })

  const allAccepted = draft.items.every((i) => i.accepted) && draft.freeLines.every((l) => l.accepted)
  const depositValid = (s: string) => s.trim() !== '' && Number.isFinite(Number(s)) && Number(s) >= 0 && Number(s) <= 100
  const depositError = depositText !== null && !depositValid(depositText) ? 'Un número entre 0 y 100' : undefined

  return (
    <section className="flex max-w-6xl flex-col gap-4 pb-20">
      <Link to={back} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Presupuestos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {draft.title || 'Presupuesto'} <span className="text-base font-normal text-muted-foreground">v{draft.version}</span>
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge tone={QUOTE_TONES[draft.status]}>{STATUS_LABELS[draft.status]}</Badge>
            {project && (
              <Link to={`/proyectos/${project.id}`} className="text-primary hover:underline">
                {project.title}
              </Link>
            )}
            {client && <span>{client.name}</span>}
            {draft.sentAt && <span>Enviado {formatDateEs(draft.sentAt)}</span>}
            {draft.acceptedAt && <span>Aceptado {formatDateEs(draft.acceptedAt)}</span>}
            {draft.parentQuoteId && (
              <Link to={`/presupuestos/${draft.parentQuoteId}`} className="hover:underline">
                Versión anterior
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextStatuses(draft.status).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={s === 'archivado' || s === 'rechazado' || s === 'vencido' ? 'outline' : 'default'}
              onClick={() => changeStatus(s)}
            >
              {ACTION_LABELS[s]}
            </Button>
          ))}
          <div className="flex items-center gap-2 rounded-md border border-border px-2">
            <Button size="sm" variant="ghost" className="-mx-1" onClick={downloadPdf} disabled={pdfBusy || itemEdit !== null}>
              <FileDown /> {pdfBusy ? 'Generando…' : 'Descargar PDF'}
            </Button>
            {draft.items.length > 0 && (
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <input type="checkbox" checked={pdfWith3d} onChange={(e) => setPdfWith3d(e.target.checked)} /> Incluir vista 3D
              </label>
            )}
          </div>
          {draft.status !== 'borrador' && (
            <Button size="sm" variant="outline" onClick={newVersion}>
              <CopyPlus /> Nueva versión
            </Button>
          )}
          {draft.status === 'borrador' && (
            <Button size="sm" variant="ghost" onClick={remove}>
              <Trash2 /> Eliminar
            </Button>
          )}
        </div>
      </div>

      {!editable && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {acceptable
            ? 'Ya se envió: el contenido no se cambia (creá una nueva versión). Podés marcar qué aceptó el cliente y usar «Aceptado parcial».'
            : 'Este presupuesto ya no se edita. Para cambiarlo, creá una nueva versión.'}
        </p>
      )}

      {/* minmax(0,1fr) también en celular: si no, la columna crece con el texto más largo de los selectores. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <div className="grid gap-3 md:grid-cols-2">
              <Field id="q-title" label="Título *">
                <Input id="q-title" value={draft.title} disabled={!editable} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </Field>
              <Field id="q-project" label="Proyecto">
                <Select
                  id="q-project"
                  value={draft.projectId ?? ''}
                  disabled={!editable}
                  onChange={(e) => {
                    const p = projects.find((x) => x.id === e.target.value)
                    setDraft({ ...draft, projectId: p?.id ?? null, clientId: p?.clientId ?? draft.clientId })
                  }}
                >
                  <option value="">Sin proyecto</option>
                  {projects
                    .filter((p) => p.status !== 'archivado' || p.id === draft.projectId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                </Select>
              </Field>
              {!project && (
                <Field id="q-client" label="Cliente">
                  <Select
                    id="q-client"
                    value={draft.clientId ?? ''}
                    disabled={!editable}
                    onChange={(e) => setDraft({ ...draft, clientId: e.target.value || null })}
                  >
                    <option value="">Sin cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">Muebles</h2>
                {draft.items.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const shown = draft.status === 'borrador' ? draft.items : draft.items.filter((i) => i.accepted)
                      setView3d({
                        title: draft.status === 'borrador' ? 'Todos los muebles' : 'Muebles aceptados',
                        items: shown.map((i) => ({ key: i.id, label: `${i.quantity > 1 ? `${i.quantity} × ` : ''}${i.name}`, item: i })),
                      })
                    }}
                  >
                    <Box /> Ver todos en 3D
                  </Button>
                )}
              </div>
              {editable && (
                <div className="flex flex-wrap gap-2">
                  {templates.length > 0 && (
                    <Select
                      aria-label="Agregar desde plantilla"
                      className="w-auto"
                      value=""
                      onChange={(e) => {
                        const t = templates.find((x) => x.id === e.target.value)
                        if (t) startItem(itemFromTemplate(t.item), null)
                      }}
                    >
                      <option value="">Agregar desde plantilla…</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.category ? `${t.category} · ` : ''}
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  )}
                  <Button size="sm" variant="outline" onClick={blankItem}>
                    <Plus /> Mueble en blanco
                  </Button>
                </div>
              )}
            </div>

            {draft.items.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay muebles.</p>}
            <ul aria-label="Muebles del presupuesto" className="flex flex-col divide-y divide-border">
              {draft.items.map((it, i) => (
                <QuoteItemRow
                  key={it.id}
                  item={it}
                  breakdown={totals.items[i]}
                  acceptable={acceptable}
                  editable={editable}
                  isDraft={draft.status === 'borrador'}
                  open={openItem === it.id}
                  onToggleOpen={() => setOpenItem(openItem === it.id ? null : it.id)}
                  onAcceptedChange={(accepted) => updateItem(it.id, (x) => ({ ...x, accepted }))}
                  onView3d={() => setView3d({ title: it.name, items: [{ key: it.id, item: it }] })}
                  onEdit={() => startItem(it, it.id)}
                  onDuplicate={() => setDraft({ ...draft, items: [...draft.items, { ...structuredClone(it), id: newLocalId() }] })}
                  onRemove={() => setDraft({ ...draft, items: draft.items.filter((x) => x.id !== it.id) })}
                />
              ))}
            </ul>

            <QuoteItemDialog
              key={itemEdit ? (itemEdit.itemId ?? 'nuevo') : 'cerrado'}
              edit={itemEdit}
              onChange={setItemEdit}
              onClose={() => setItemEdit(null)}
              onSave={saveItem}
              preview={preview}
              refs={refs}
              materialName={materialName}
            />

            <Dialog open={view3d !== null} onClose={() => setView3d(null)} title={view3d ? `Vista 3D: ${view3d.title}` : ''}>
              {view3d && <Furniture3DView className="h-[70dvh]" items={view3d.items} materialName={materialName} />}
            </Dialog>
          </Card>

          {(editable || draft.freeLines.length > 0) && (
            <Card>
              <h2 className="mb-2 font-semibold">Líneas libres</h2>
              <FreeLinesEditor
                lines={draft.freeLines}
                readOnly={!editable}
                acceptable={acceptable}
                onChange={(freeLines) => setDraft({ ...draft, freeLines })}
              />
            </Card>
          )}

          {(editable || draft.adjustments.length > 0) && (
            <Card>
              <h2 className="mb-2 font-semibold">Ajustes</h2>
              <AdjustmentsEditor items={draft.adjustments} readOnly={!editable} onChange={(adjustments) => setDraft({ ...draft, adjustments })} />
            </Card>
          )}

          <Card>
            <h2 className="mb-2 font-semibold">Condiciones</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field id="q-deposit" label="Seña (%)" error={depositError}>
                <Input
                  id="q-deposit"
                  type="number"
                  min={0}
                  max={100}
                  step="1"
                  disabled={!editable}
                  aria-invalid={!!depositError}
                  value={depositText ?? String(bpToPercent(draft.depositBp))}
                  onChange={(e) => {
                    const s = e.target.value
                    setDepositText(s)
                    // Vacío o fuera de rango: no se guarda (antes un campo vacío quedaba en 0 %).
                    if (depositValid(s)) setDraft({ ...draft, depositBp: percentToBp(Number(s)) })
                  }}
                  onBlur={() => setDepositText(null)}
                />
              </Field>
              <Field id="q-valid" label="Válido hasta">
                <Input
                  id="q-valid"
                  type="date"
                  disabled={!editable}
                  value={draft.validUntil ?? ''}
                  onChange={(e) => setDraft({ ...draft, validUntil: e.target.value || null })}
                />
              </Field>
              <Field id="q-terms" label="Condiciones de pago y plazo" className="md:col-span-2">
                <Textarea id="q-terms" disabled={!editable} value={draft.terms} onChange={(e) => setDraft({ ...draft, terms: e.target.value })} />
              </Field>
              <Field id="q-notes" label="Observaciones" className="md:col-span-2">
                <Textarea id="q-notes" disabled={!editable} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </Field>
            </div>
          </Card>
          {isAcceptedStatus(draft.status) && (
            <ShoppingListCard
              list={shopping}
              title={draft.title}
              projectId={draft.projectId}
              purchased={draft.purchased}
              onTogglePurchased={togglePurchased}
            />
          )}
        </div>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <Card>
            <h2 className="mb-2 font-semibold">Resumen</h2>
            <QuoteSummary totals={totals} depositBp={draft.depositBp} partial={!allAccepted} />
          </Card>
        </aside>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:left-60">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
            <p className={conflict ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
              {conflict ? 'Otro socio cambió este presupuesto. Descartá para ver sus cambios.' : 'Cambios sin guardar'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDraftState(dataOf(quote))
                  setBaseMs(serverMs)
                  setDirty(false)
                  setItemEdit(null)
                  setDepositText(null)
                }}
              >
                Descartar
              </Button>
              <Button disabled={conflict || itemEdit !== null} onClick={() => write(draft, 'Presupuesto guardado')}>
                <Save /> Guardar presupuesto
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
