import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/form'
import { MoneyInput } from '@/components/ui/money-input'
import { formatEuros } from '@/domain/money'
import type { ItemBreakdown } from '@/domain/quote'
import { Furniture3DView } from '@/features/furniture/Furniture3DView'
import { FurnitureItemEditor, type CatalogRefs, type FurnitureDraft } from '@/features/furniture/FurnitureItemEditor'
import type { ItemEdit } from './itemEdit'
import { Breakdown } from './QuoteParts'

const TABS = [
  { key: 'datos', label: 'Datos' },
  { key: '3d', label: 'Vista 3D' },
] as const
type Tab = (typeof TABS)[number]['key']

export function QuoteItemDialog({
  edit,
  onChange,
  onClose,
  onSave,
  preview,
  refs,
  materialName,
}: {
  edit: ItemEdit | null
  onChange: (next: ItemEdit) => void
  onClose: () => void
  onSave: () => void
  preview: ItemBreakdown | null
  refs: CatalogRefs
  materialName: (id: string | null) => string | undefined
}) {
  // La ventana se vuelve a montar al abrir otro mueble (ver key en el editor): arranca en "Datos".
  const [tab, setTab] = useState<Tab>('datos')
  const viewItems = useMemo(() => (edit ? [{ key: 'edit', item: edit.item }] : []), [edit])
  const isNew = edit?.itemId === null

  return (
    <Dialog
      open={edit !== null}
      onClose={onClose}
      title={isNew ? 'Nuevo mueble' : `Editar mueble${edit?.item.name ? `: ${edit.item.name}` : ''}`}
      footer={
        edit && (
          <div className="flex flex-col gap-2">
            {Object.keys(edit.errors).length > 0 && (
              <p role="alert" className="text-sm text-destructive">
                Revisá los datos del mueble: {Object.values(edit.errors).join(' · ')}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                Precio del mueble: <strong className="tabular-nums">{formatEuros(preview?.totalCents ?? 0)}</strong>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" form="qi-form">
                  {isNew ? 'Agregar mueble' : 'Guardar mueble'}
                </Button>
              </div>
            </div>
          </div>
        )
      }
    >
      {edit && (
        <>
          <div role="tablist" aria-label="Vista del mueble" className="mb-4 flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                id={`qi-tab-${t.key}`}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                aria-controls={`qi-panel-${t.key}`}
                onClick={() => setTab(t.key)}
                className={
                  tab === t.key
                    ? 'rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground'
                    : 'rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground hover:text-foreground'
                }
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === '3d' && (
            <div id="qi-panel-3d" role="tabpanel" aria-labelledby="qi-tab-3d">
              <Furniture3DView className="h-[60dvh]" items={viewItems} materialName={materialName} />
            </div>
          )}
          <form
            hidden={tab !== 'datos'}
            id="qi-form"
            role="tabpanel"
            aria-labelledby="qi-tab-datos"
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              onSave()
            }}
          >
            <FurnitureItemEditor
              value={edit.item}
              onChange={(v: FurnitureDraft) => onChange({ ...edit, item: { ...edit.item, ...v } })}
              catalog={refs}
              errors={edit.errors}
              idPrefix="qi"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Field id="qi-final" label="Precio final del mueble (€)" hint="Vacío = usar el calculado">
                <MoneyInput
                  id="qi-final"
                  nullable
                  placeholder="Calculado"
                  cents={edit.item.finalPriceCents}
                  onChange={(c) => onChange({ ...edit, item: { ...edit.item, finalPriceCents: c } })}
                />
              </Field>
              {preview && (
                <div className="rounded-lg bg-muted/50 p-3" aria-label="Vista previa del precio">
                  <Breakdown b={preview} />
                </div>
              )}
            </div>
          </form>
        </>
      )}
    </Dialog>
  )
}
