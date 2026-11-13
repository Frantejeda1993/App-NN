import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge, Card, Field, Select, Textarea } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import type { Movement } from '@/data/api'
import { useGeneralExpenses, useMovementHistory, useMovements } from '@/data/hooks'
import { formatDateEs } from '@/domain/dates'
import { formatEuros } from '@/domain/money'
import { diffMovement, displaySign, memberDebts } from '@/domain/wallet'
import { notifyError, notifyWrite } from '@/lib/notify'
import { MovementDataSchema, type MovementData } from '@/model'
import { Amount } from './Amount'
import { MovementForm } from './MovementForm'
import { ACTION_LABELS, FIELD_LABELS, TYPE_LABELS } from './labels'
import { useWalletNames } from './useWalletNames'
import { Loading } from '@/components/ui/loading'

type Mode = 'view' | 'edit' | 'delete' | 'pay'

export function MovementDetailPage() {
  const { id = '' } = useParams()
  const api = useData()
  const me = useMyEmail()
  const movements = useMovements()
  const history = useMovementHistory(id)
  const generalExpenses = useGeneralExpenses()
  const names = useWalletNames()
  const [mode, setModeState] = useState<Mode>('view')
  // Versión que se estaba viendo al empezar a editar/pagar/eliminar: si otro
  // socio la cambia mientras tanto, no se pisa su cambio.
  const [baseVersion, setBaseVersion] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  /** Último intento de edición rechazado por el servidor (para no perderlo). */
  const [draft, setDraft] = useState<MovementData | null>(null)
  const [payWith, setPayWith] = useState('')
  const movement = movements?.find((m) => m.id === id)
  const debts = useMemo(() => memberDebts(movements ?? []), [movements])

  if (!movements || names.loading || !generalExpenses) return <Loading />
  if (!movement) {
    return (
      <section className="flex flex-col gap-3">
        <p>No se encontró el movimiento.</p>
        <Link to="/billetera" className="text-primary underline">
          Volver a la billetera
        </Link>
      </section>
    )
  }

  const setMode = (next: Mode) => {
    setBaseVersion(next === 'view' ? null : movement.version)
    setModeState(next)
  }

  const run = (fn: () => ReturnType<typeof api.updateMovement>, msg: string, attempted?: MovementData) => {
    if (baseVersion !== null && baseVersion !== movement.version) {
      notifyError(new Error('Otro socio modificó este movimiento mientras lo editabas. Cancelá y revisá sus cambios.'))
      return false
    }
    const modeBefore = mode
    try {
      const res = fn()
      notifyWrite(res, msg)
      // Si el servidor lo rechaza (conflicto que todavía no había llegado a este
      // dispositivo, sin permiso…), se reabre lo que se estaba haciendo con lo
      // escrito, en lugar de perderlo.
      res.committed.catch(() => {
        if (attempted) setDraft(attempted)
        setBaseVersion(null)
        setModeState(modeBefore)
      })
      setMode('view')
      return true
    } catch (e) {
      notifyError(e)
      return false
    }
  }

  const value = (field: string, v: unknown): string => {
    if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) return '—'
    switch (field) {
      case 'amountCents':
        return formatEuros(v as number)
      case 'date':
        return formatDateEs(v as string)
      case 'boxId':
      case 'toBoxId':
        return names.boxName(v as string)
      case 'paidBy':
      case 'memberEmail':
        return names.memberName(v as string)
      case 'projectId':
        return names.projectName(v as string)
      case 'type':
        return TYPE_LABELS[v as Movement['type']]
      case 'status':
        return v === 'pagado' ? 'Pagado' : 'Pendiente de pago'
      case 'deleted':
        return v ? 'Sí' : 'No'
      case 'projectSplits':
        return (v as { projectId: string; amountCents: number }[])
          .map((s) => `${names.projectName(s.projectId)} ${formatEuros(s.amountCents)}`)
          .join(', ')
      default:
        return String(v)
    }
  }

  const data = MovementDataSchema.safeParse(movement)

  return (
    <section className="flex max-w-3xl flex-col gap-4">
      <Link to="/billetera" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Billetera
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{TYPE_LABELS[movement.type]}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Amount cents={movement.amountCents} sign={displaySign(movement)} className="text-lg" />
            {movement.status === 'pendiente_pago' && <Badge tone="warning">Pendiente de pago</Badge>}
            {movement.deleted && <Badge tone="danger">Eliminado</Badge>}
          </div>
        </div>
        {!movement.deleted && mode === 'view' && (
          <div className="flex flex-wrap gap-2">
            {movement.status === 'pendiente_pago' && <Button onClick={() => setMode('pay')}>Marcar pagado</Button>}
            <Button variant="outline" onClick={() => setMode('edit')}>
              <Pencil /> Editar
            </Button>
            <Button variant="outline" onClick={() => setMode('delete')}>
              <Trash2 /> Eliminar
            </Button>
          </div>
        )}
      </div>

      {movement.deleted && (
        <Card className="text-sm">
          <span className="font-medium">Motivo de la baja:</span> {movement.deletedReason || '—'}
        </Card>
      )}

      {mode === 'edit' && data.success ? (
        <Card>
          <MovementForm
            boxes={names.boxes!}
            members={names.members!}
            projects={names.projects!}
            debts={debts}
            generalExpenses={generalExpenses ?? []}
            initial={draft ?? data.data}
            submitLabel="Guardar cambios"
            onCancel={() => {
              setDraft(null)
              setMode('view')
            }}
            onSubmit={(next) => {
              const ok = run(() => api.updateMovement(movement, next, me), 'Movimiento actualizado', next)
              if (ok) setDraft(null)
              return ok
            }}
          />
        </Card>
      ) : (
        <Card>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {(['date', 'projectId', 'projectSplits', 'boxId', 'toBoxId', 'paidBy', 'memberEmail', 'category', 'description'] as const)
              .filter((f) => {
                const v = movement[f]
                return Array.isArray(v) ? v.length > 0 : v !== null && v !== ''
              })
              .map((f) => (
                <div key={f}>
                  <dt className="text-muted-foreground">{FIELD_LABELS[f]}</dt>
                  <dd className="whitespace-pre-wrap">{value(f, movement[f])}</dd>
                </div>
              ))}
            <div>
              <dt className="text-muted-foreground">Registrado por</dt>
              <dd>{names.memberName(movement.createdBy)}</dd>
            </div>
          </dl>
        </Card>
      )}

      {mode === 'edit' && !data.success && (
        <Card className="text-sm text-destructive">
          Este movimiento tiene datos inconsistentes y no se puede editar desde el formulario. Podés eliminarlo y cargarlo de nuevo.
        </Card>
      )}

      {mode === 'pay' && data.success && (
        <Card>
          <h2 className="mb-2 font-semibold">¿Con qué se pagó?</h2>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const [kind, ref] = payWith.split(':')
              const next: MovementData = {
                ...data.data,
                status: 'pagado',
                boxId: kind === 'box' ? ref : null,
                paidBy: kind === 'member' ? ref : null,
              }
              run(() => api.updateMovement(movement, next, me), 'Marcado como pagado')
            }}
          >
            <Field id="pay-with" label="Pagado desde" className="min-w-56 flex-1">
              <Select id="pay-with" value={payWith} onChange={(e) => setPayWith(e.target.value)}>
                <option value="">Elegí…</option>
                <optgroup label="Caja del taller">
                  {names.boxes!.filter((b) => b.active).map((b) => (
                    <option key={b.id} value={`box:${b.id}`}>
                      {b.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Bolsillo de un socio">
                  {names.members!.filter((m) => m.active).map((m) => (
                    <option key={m.email} value={`member:${m.email}`}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </Field>
            <Button type="submit" disabled={!payWith}>
              Confirmar pago
            </Button>
            <Button variant="outline" onClick={() => setMode('view')}>
              Cancelar
            </Button>
          </form>
        </Card>
      )}

      {mode === 'delete' && (
        <Card>
          <h2 className="mb-1 font-semibold">Eliminar movimiento</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            No se borra: queda tachado, deja de contar en los saldos y se guarda quién lo eliminó y por qué.
          </p>
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              run(() => api.deleteMovement(movement, reason, me), 'Movimiento eliminado')
            }}
          >
            <Field id="delete-reason" label="Motivo *">
              <Textarea id="delete-reason" placeholder="Ej.: cargado dos veces" value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={!reason.trim()} className="bg-destructive hover:bg-destructive/90">
                Eliminar
              </Button>
              <Button variant="outline" onClick={() => setMode('view')}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-semibold">Historial</h2>
        {!history ? (
          <Loading />
        ) : (
          <ol aria-label="Historial del movimiento" className="flex flex-col gap-3">
            {[...history].reverse().map((h) => {
              const changes = h.before ? diffMovement(h.before, h.after) : []
              return (
                <li key={h.id} className="border-l-2 border-primary/40 pl-3 text-sm">
                  <p>
                    <span className="font-medium">{ACTION_LABELS[h.action]}</span> por {names.memberName(h.by)}
                    {h.at && <span className="text-muted-foreground"> · {h.at.toLocaleString('es-ES')}</span>}
                  </p>
                  {changes.length > 0 && (
                    <ul className="mt-1 text-muted-foreground">
                      {changes
                        .filter((c) => c.field !== 'deleted')
                        .map((c) => (
                          <li key={c.field}>
                            {FIELD_LABELS[c.field]}: {value(c.field, c.before)} → {value(c.field, c.after)}
                          </li>
                        ))}
                      {h.action === 'delete' && typeof h.after.deletedReason === 'string' && <li>Motivo: {h.after.deletedReason}</li>}
                    </ul>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </Card>
    </section>
  )
}
