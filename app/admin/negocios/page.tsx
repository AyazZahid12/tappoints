import { createAdminClient } from '@/lib/supabase-admin'
import NegociosClient from './NegociosClient'

export default async function AdminNegociosPage() {
  const admin = createAdminClient()

  const [{ data: negocios }, { data: clientes }] = await Promise.all([
    admin.from('negocios').select('id, nombre, slug, plan, activo, created_at').order('created_at', { ascending: false }),
    admin.from('clientes').select('negocio_id'),
  ])

  const clientesByNegocio: Record<string, number> = {}
  clientes?.forEach(c => {
    clientesByNegocio[c.negocio_id] = (clientesByNegocio[c.negocio_id] || 0) + 1
  })

  const negociosWithCount = (negocios || []).map(n => ({
    id: n.id,
    nombre: n.nombre,
    slug: n.slug || '',
    plan: (n as any)?.plan ?? 'gratis',
    activo: (n as any)?.activo ?? true,
    created_at: n.created_at,
    clienteCount: clientesByNegocio[n.id] || 0,
  }))

  return <NegociosClient negocios={negociosWithCount} />
}
