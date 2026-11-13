import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, Field, Input } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import type { Template } from '@/data/api'
import { useEdgeBanding, useHardware, useMaterials, useTemplates } from '@/data/hooks'
import { FurnitureItemEditor, type CatalogRefs, type FurnitureDraft } from '@/features/furniture/FurnitureItemEditor'
import { notifyError, notifyWrite } from '@/lib/notify'
import { TemplateDataSchema } from '@/model'
import { Loading } from '@/components/ui/loading'

const back = '/catalogo?tab=plantillas'

/** Nombres legibles para el resumen de errores (cualquier campo del mueble). */
const FIELD_NAMES: Record<string, string> = {
  name: 'Nombre',
  widthMm: 'Ancho',
  heightMm: 'Alto',
  depthMm: 'Profundidad',
  quantity: 'Cantidad',
  shelves: 'Estantes',
  dividers: 'Divisiones',
  structure: 'Estructura',
  back: 'Trasera',
  fronts: 'Frentes',
  doors: 'Puertas / bisagras',
  drawers: 'Cajones',
  edgeBanding: 'Canto',
  hardware: 'Otros herrajes',
  linearExtras: 'Extras por metro',
  otherHardwareCents: 'Otros herrajes (€)',
  complexityCents: 'Complejidad',
  laborCents: 'Mano de obra',
  notes: 'Notas',
}

/** `/catalogo/plantillas/nueva` y `/catalogo/plantillas/:id`. */
export function TemplateEditorPage() {
  const { id } = useParams()
  const templates = useTemplates()
  const materials = useMaterials()
  const hardware = useHardware()
  const edgeBanding = useEdgeBanding()

  if (!templates || !materials || !hardware || !edgeBanding) return <Loading />
  const existing = id ? templates.find((t) => t.id === id) : undefined
  if (id && !existing) {
    return (
      <section className="flex flex-col gap-3">
        <p>No se encontró la plantilla.</p>
        <Link to={back} className="text-primary underline">
          Volver a plantillas
        </Link>
      </section>
    )
  }
  return <Editor key={existing?.id ?? 'new'} existing={existing} catalog={{ materials, hardware, edgeBanding }} />
}

function Editor({ existing, catalog }: { existing?: Template; catalog: CatalogRefs }) {
  const api = useData()
  const me = useMyEmail()
  const navigate = useNavigate()
  const [name, setName] = useState(existing?.name ?? '')
  const [category, setCategory] = useState(existing?.category ?? '')
  const [item, setItem] = useState<FurnitureDraft>(
    () => existing?.item ?? { ...TemplateDataSchema.shape.item.parse({ name: 'x', widthMm: 600, heightMm: 720, depthMm: 560 }), name: '' },
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  function save() {
    const parsed = TemplateDataSchema.safeParse({ name, category, item: { ...item, name: item.name || name } })
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      for (const i of parsed.error.issues) {
        const key = i.path[0] === 'item' ? String(i.path[1]) : String(i.path[0])
        errs[key] ??= i.message
      }
      setErrors(errs)
      return
    }
    try {
      notifyWrite(
        existing ? api.updateTemplate(existing.id, parsed.data, me) : api.createTemplate(parsed.data, me),
        existing ? 'Plantilla guardada' : 'Plantilla creada',
      )
      navigate(back)
    } catch (e) {
      notifyError(e)
    }
  }

  return (
    <section className="flex max-w-4xl flex-col gap-4">
      <Link to={back} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Plantillas
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{existing ? 'Editar plantilla' : 'Nueva plantilla'}</h1>
      <Card>
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Field id="tpl-name" label="Nombre de la plantilla *" error={errors.name}>
              <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Bajo mesada 2 puertas" />
            </Field>
            <Field id="tpl-category" label="Categoría" hint="Cocina, dormitorio, baño…">
              <Input id="tpl-category" value={category} onChange={(e) => setCategory(e.target.value)} />
            </Field>
          </div>
          <FurnitureItemEditor value={item} onChange={setItem} catalog={catalog} errors={errors} idPrefix="tpl" />
          {Object.keys(errors).length > 0 && (
            <div role="alert" className="text-sm text-destructive">
              <p>Revisá estos datos:</p>
              <ul className="list-disc pl-5">
                {Object.entries(errors).map(([k, msg]) => (
                  <li key={k}>
                    {FIELD_NAMES[k] ?? k}: {msg}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit">{existing ? 'Guardar cambios' : 'Crear plantilla'}</Button>
            <Button variant="outline" onClick={() => navigate(back)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </section>
  )
}
