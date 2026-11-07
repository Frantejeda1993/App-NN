import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import { useClients, useMembers, useWorkshopSettings } from '@/data/hooks'
import { todayIso } from '@/domain/dates'
import { defaultSharesFor } from '@/domain/projects'
import { notifyError, notifyWrite } from '@/lib/notify'
import { ProjectForm } from './ProjectForm'

export function ProjectNewPage() {
  const api = useData()
  const me = useMyEmail()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const clients = useClients()
  const members = useMembers()
  const settings = useWorkshopSettings()
  const preselected = params.get('cliente') ?? ''

  if (!clients || !members || !settings) return <p className="text-sm text-muted-foreground">Cargando…</p>

  return (
    <section className="flex max-w-3xl flex-col gap-4">
      <Link to="/proyectos" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Proyectos
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo proyecto</h1>
      {clients.length === 0 ? (
        <Card className="text-sm">
          Primero creá el cliente.{' '}
          <Link to="/clientes/nuevo" className="text-primary underline">
            Nuevo cliente
          </Link>
        </Card>
      ) : (
        <Card>
          <ProjectForm
            clients={clients}
            members={members}
            initial={{ clientId: clients.some((c) => c.id === preselected) ? preselected : '', requestedAt: todayIso() }}
            initialShares={defaultSharesFor(members, settings.settings.defaultShares)}
            submitLabel="Crear proyecto"
            onCancel={() => navigate(-1)}
            onSubmit={(values) => {
              try {
                const res = api.createProject({ ...values, status: 'pendiente' }, me)
                notifyWrite(res, 'Proyecto creado')
                navigate(`/proyectos/${res.id}`, { replace: true })
                return true
              } catch (e) {
                notifyError(e)
                return false
              }
            }}
          />
        </Card>
      )}
    </section>
  )
}
