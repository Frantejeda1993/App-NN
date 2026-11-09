import { ArrowLeft, Copy, CopyPlus, FileDown, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge, Card, Field, Input, Select, Textarea } from '@/components/ui/form'
import { MoneyInput } from '@/components/ui/money-input'
import { useData, useMyEmail } from '@/data/DataProvider'
import type { Client, Project, Quote, Template } from '@/data/api'
import { useClients, useProjects, useQuote, useTemplates, useWorkshopSettings } from '@/data/hooks'
import { formatDateEs, todayIso } from '@/domain/dates'
import { formatEuros } from '@/domain/money'
import { bpToPercent, percentToBp } from '@/domain/percent'
import { computeQuote, type CatalogLike, type RatesLike } from '@/domain/quote'
import {
  STATUS_LABELS,
  applyStatus,
  itemFromTemplate,
  newLocalId,
  newVersionInput,
  nextStatuses,
  projectPatchForQuote,
} from '@/domain/quoteLifecycle'
import { FurnitureItemEditor, type CatalogRefs, type FurnitureDraft } from '@/features/furniture/FurnitureItemEditor'
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
import { AdjustmentsEditor, Breakdown, FreeLinesEditor, QuoteSummary } from './QuoteParts'
import { QUOTE_TONES, useQuoteCatalog } from './shared'

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
  const catalog = useQuoteCatalog()
  const projects = useProjects()
  const clients = useClients()
  const templates = useTemplates()
  const settings = useWorkshopSettings()

  if (quote === undefined || !catalog || !projects || !clients || !templates || !settings) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>
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

interface ItemEdit {
  index: number | null
  item: FurnitureItem
  errors: Record<string, string>
}

function Editor({
  quote,
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
  refs: CatalogRefs
  maps: CatalogLike
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
  const editable = draft.status === 'borrador'
  const acceptable = ['enviado', 'vencido', 'aceptado', 'aceptado_parcial'].includes(draft.status)
  const project = projects.find((p) => p.id === draft.projectId) ?? null
  const client = clients.find((c) => c.id === (draft.clientId ?? project?.clientId))

  /** Valida, guarda con totales y (si hace falta) actualiza el proyecto. */
  const write = (next: QuoteData, message: string) => {
    if (conflict) {
      notifyError(new Error('Otro socio modificó este presupuesto mientras editabas. Descartá tus cambios para ver los suyos.'))
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
      setLastWritten(stableKey(parsed.data))
      notifyWrite(api.updateQuote(quote.id, parsed.data, me), message)
      const p = parsed.data.projectId ? projects.find((x) => x.id === parsed.data.projectId) : undefined
      const patch = p ? projectPatchForQuote(p, { id: quote.id, ...parsed.data }) : null
      if (p && patch) notifyWrite(api.updateProject(p.id, ProjectDataSchema.parse({ ...p, ...patch }), me), 'Proyecto actualizado')
      setDraftState(parsed.data)
      setDirty(false)
      return true
    } catch (e) {
      notifyError(e)
      return false
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
    try {
      const res = api.createQuote(newVersionInput({ ...dataOf(quote), id: quote.id }, today, validityDays), me)
      notifyWrite(res, `Versión ${quote.version + 1} creada`)
      navigate(`/presupuestos/${res.id}`)
    } catch (e) {
      notifyError(e)
    }
  }

  const [pdfBusy, setPdfBusy] = useState(false)
  const downloadPdf = async () => {
    if (pdfBusy) return
    setPdfBusy(true)
    try {
      const model = quotePdfModel({ quote: draft, totals, catalog: maps, workshop, client: client ?? null, today })
      const { downloadQuotePdf } = await import('./pdf')
      await downloadQuotePdf(model, pdfFileName(draft, client?.name ?? null))
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
  const startItem = (item: FurnitureItem, index: number | null) => setItemEdit({ index, item: structuredClone(item), errors: {} })
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
      const errs: Record<string, string> = {}
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message
      setItemEdit({ ...itemEdit, errors: errs })
      return
    }
    const items = [...draft.items]
    if (itemEdit.index === null) items.push(parsed.data)
    else items[itemEdit.index] = parsed.data
    setDraft({ ...draft, items })
    setItemEdit(null)
  }

  // Vista previa: el presupuesto con el mueble en edición incluido (las placas se
  // comparten entre muebles, así que el precio depende de todo el presupuesto).
  const preview = useMemo(() => {
    if (!itemEdit) return null
    const items = [...draft.items]
    if (itemEdit.index === null) items.push(itemEdit.item)
    else items[itemEdit.index] = itemEdit.item
    try {
      return computeQuote({ ...draft, items }, maps, rates).items[itemEdit.index ?? items.length - 1]
    } catch {
      return null
    }
  }, [itemEdit, draft, maps, rates])

  const activeTemplates = templates
  const allAccepted = draft.items.every((i) => i.accepted) && draft.freeLines.every((l) => l.accepted)

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
          <Button size="sm" variant="outline" onClick={downloadPdf} disabled={pdfBusy || itemEdit !== null}>
            <FileDown /> {pdfBusy ? 'Generando…' : 'Descargar PDF'}
          </Button>
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <div className="grid gap-3 md:grid-cols-2">
              <Field id="q-title" label="Título *">
                <Input
                  id="q-title"
                  value={draft.title}
                  disabled={!editable}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </Field>
              <Field id="q-project" label="Proyecto">
                <Select
                  id="q-project"
                  value={draft.projectId ?? ''}
                  disabled={!editable}
                  onChange={(e) => {
                    const p = projects.find((x) => x.id === e.target.value)
                    setDraft({
                      ...draft,
                      projectId: p?.id ?? null,
                      clientId: p?.clientId ?? draft.clientId,
                    })
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
              <h2 className="font-semibold">Muebles</h2>
              {editable && !itemEdit && (
                <div className="flex flex-wrap gap-2">
                  {activeTemplates.length > 0 && (
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
                      {activeTemplates.map((t) => (
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

            {draft.items.length === 0 && !itemEdit && <p className="text-sm text-muted-foreground">Todavía no hay muebles.</p>}
            <ul aria-label="Muebles del presupuesto" className="flex flex-col divide-y divide-border">
              {draft.items.map((it, i) => {
                const b = totals.items[i]
                const open = openItem === it.id
                return (
                  <li key={it.id} className="py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {acceptable && (
                          <input
                            type="checkbox"
                            aria-label={`Aceptado: ${it.name}`}
                            checked={it.accepted}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                items: draft.items.map((x, j) => (j === i ? { ...x, accepted: e.target.checked } : x)),
                              })
                            }
                          />
                        )}
                        <button
                          type="button"
                          className="min-w-0 text-left"
                          onClick={() => setOpenItem(open ? null : it.id)}
                          aria-expanded={open}
                        >
                          <p className="truncate text-sm font-medium">
                            {it.quantity > 1 && `${it.quantity} × `}
                            {it.name}
                            {!it.accepted && draft.status !== 'borrador' && (
                              <span className="ml-2 text-xs text-muted-foreground">(no aceptado)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {it.widthMm} × {it.heightMm} × {it.depthMm} mm
                            {it.doors.count > 0 && ` · ${it.doors.count} puerta${it.doors.count === 1 ? '' : 's'}`}
                            {it.drawers.count > 0 && ` · ${it.drawers.count} cajón${it.drawers.count === 1 ? '' : 'es'}`}
                          </p>
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="mr-2 text-sm font-medium tabular-nums">{formatEuros(b?.totalCents ?? 0)}</span>
                        {editable && !itemEdit && (
                          <>
                            <Button size="icon" variant="ghost" aria-label={`Editar ${it.name}`} onClick={() => startItem(it, i)}>
                              <Pencil />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Duplicar ${it.name}`}
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  items: [
                                    ...draft.items,
                                    {
                                      ...structuredClone(it),
                                      id: newLocalId(),
                                    },
                                  ],
                                })
                              }
                            >
                              <Copy />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Quitar ${it.name}`}
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  items: draft.items.filter((_, j) => j !== i),
                                })
                              }
                            >
                              <Trash2 />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {open && b && (
                      <div className="mt-2 rounded-lg bg-muted/50 p-3">
                        <Breakdown b={b} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            {itemEdit && (
              <div className="mt-3 rounded-xl border border-primary/40 p-3 md:p-4">
                <h3 className="mb-3 font-semibold">{itemEdit.index === null ? 'Nuevo mueble' : 'Editar mueble'}</h3>
                <form
                  noValidate
                  className="flex flex-col gap-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    saveItem()
                  }}
                >
                  <FurnitureItemEditor
                    value={itemEdit.item}
                    onChange={(v: FurnitureDraft) =>
                      setItemEdit({
                        ...itemEdit,
                        item: { ...itemEdit.item, ...v },
                      })
                    }
                    catalog={refs}
                    errors={itemEdit.errors}
                    idPrefix="qi"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field id="qi-final" label="Precio final del mueble (€)" hint="Vacío = usar el calculado">
                      <MoneyInput
                        id="qi-final"
                        nullable
                        placeholder="Calculado"
                        cents={itemEdit.item.finalPriceCents}
                        onChange={(c) =>
                          setItemEdit({
                            ...itemEdit,
                            item: { ...itemEdit.item, finalPriceCents: c },
                          })
                        }
                      />
                    </Field>
                    {preview && (
                      <div className="rounded-lg bg-muted/50 p-3" aria-label="Vista previa del precio">
                        <Breakdown b={preview} />
                      </div>
                    )}
                  </div>
                  {Object.keys(itemEdit.errors).length > 0 && (
                    <p role="alert" className="text-sm text-destructive">
                      Revisá los datos del mueble: {Object.values(itemEdit.errors).join(' · ')}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit">{itemEdit.index === null ? 'Agregar mueble' : 'Guardar mueble'}</Button>
                    <Button variant="outline" onClick={() => setItemEdit(null)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </div>
            )}
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
              <AdjustmentsEditor
                items={draft.adjustments}
                readOnly={!editable}
                onChange={(adjustments) => setDraft({ ...draft, adjustments })}
              />
            </Card>
          )}

          <Card>
            <h2 className="mb-2 font-semibold">Condiciones</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field id="q-deposit" label="Seña (%)">
                <Input
                  id="q-deposit"
                  type="number"
                  min={0}
                  max={100}
                  step="1"
                  disabled={!editable}
                  value={bpToPercent(draft.depositBp)}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (Number.isFinite(n) && n >= 0 && n <= 100) setDraft({ ...draft, depositBp: percentToBp(n) })
                  }}
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
                <Textarea
                  id="q-terms"
                  disabled={!editable}
                  value={draft.terms}
                  onChange={(e) => setDraft({ ...draft, terms: e.target.value })}
                />
              </Field>
              <Field id="q-notes" label="Observaciones" className="md:col-span-2">
                <Textarea
                  id="q-notes"
                  disabled={!editable}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </Field>
            </div>
          </Card>
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
