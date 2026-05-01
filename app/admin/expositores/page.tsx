import { createAdminClient } from '@/lib/supabase-admin'
import ExpositoresClient from './ExpositoresClient'

export default async function AdminExpositoresPage() {
  const admin = createAdminClient()

  let expositores: any[] = []
  try {
    const { data } = await admin
      .from('expositores_nfc')
      .select('id, negocio_id, nombre, email, address, status, requested_at, sent_at, delivered_at, negocios(nombre)')
      .order('requested_at', { ascending: false })
    expositores = data || []
  } catch {
    expositores = []
  }

  const mapped = expositores.map(e => ({
    id: e.id,
    negocioId: e.negocio_id,
    negocioNombre: (e.negocios as any)?.nombre || 'Negocio',
    nombre: e.nombre,
    email: e.email,
    address: e.address,
    status: e.status as 'pendiente' | 'enviado' | 'entregado',
    requestedAt: e.requested_at,
    sentAt: e.sent_at,
    deliveredAt: e.delivered_at,
  }))

  return <ExpositoresClient expositores={mapped} />
}
