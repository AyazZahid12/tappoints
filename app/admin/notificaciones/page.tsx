import { createAdminClient } from '@/lib/supabase-admin'
import NotificacionesClient from './NotificacionesClient'

export interface Notificacion {
  id: string
  tipo: 'registro' | 'alerta' | 'inactivo'
  titulo: string
  descripcion: string
  created_at: string
}

export default async function AdminNotificacionesPage() {
  const admin = createAdminClient()

  const [
    { data: negocios },
    { data: clientes },
    { data: visitasRecientes },
  ] = await Promise.all([
    admin.from('negocios').select('id, nombre, plan, activo, created_at').order('created_at', { ascending: false }),
    admin.from('clientes').select('negocio_id'),
    admin.from('visitas').select('negocio_id, created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const clientesByNegocio: Record<string, number> = {}
  clientes?.forEach(c => {
    clientesByNegocio[c.negocio_id] = (clientesByNegocio[c.negocio_id] || 0) + 1
  })

  const negociosConVisitasRecientes = new Set(visitasRecientes?.map(v => v.negocio_id) || [])

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const notificaciones: Notificacion[] = []

  negocios?.forEach(n => {
    const registrado = new Date(n.created_at)

    if (registrado >= sevenDaysAgo) {
      notificaciones.push({
        id: `reg-${n.id}`,
        tipo: 'registro',
        titulo: `Nuevo negocio registrado`,
        descripcion: `${n.nombre} se unió a TapPoints`,
        created_at: n.created_at,
      })
    }

    const plan = (n as any)?.plan ?? 'gratis'
    const count = clientesByNegocio[n.id] || 0
    if (plan === 'gratis' && count >= 40) {
      notificaciones.push({
        id: `alerta-${n.id}`,
        tipo: 'alerta',
        titulo: `Negocio cerca del límite`,
        descripcion: `${n.nombre} tiene ${count}/50 clientes en plan Gratis`,
        created_at: n.created_at,
      })
    }

    const esAntiguo = registrado < thirtyDaysAgo
    if (esAntiguo && !negociosConVisitasRecientes.has(n.id)) {
      notificaciones.push({
        id: `inactivo-${n.id}`,
        tipo: 'inactivo',
        titulo: `Negocio inactivo`,
        descripcion: `${n.nombre} no ha tenido actividad en los últimos 30 días`,
        created_at: n.created_at,
      })
    }
  })

  notificaciones.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return <NotificacionesClient notificaciones={notificaciones} />
}
