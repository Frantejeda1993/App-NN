import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import { notifyError, notifyWrite } from '@/lib/notify'
import { ClientForm } from './ClientForm'

export function ClientNewPage() {
  const api = useData()
  const me = useMyEmail()
  const navigate = useNavigate()

  return (
    <section className="flex max-w-3xl flex-col gap-4">
      <Link to="/clientes" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Clientes
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo cliente</h1>
      <Card>
        <ClientForm
          submitLabel="Crear cliente"
          onCancel={() => navigate('/clientes')}
          onSubmit={(values) => {
            try {
              const res = api.createClient(values, me)
              notifyWrite(res, 'Cliente creado')
              navigate(`/clientes/${res.id}`, { replace: true })
            } catch (e) {
              notifyError(e)
            }
          }}
        />
      </Card>
    </section>
  )
}
