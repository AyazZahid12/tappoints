import { createAdminClient } from '@/lib/supabase-admin'
import SoporteClient from './SoporteClient'

export default async function AdminSoportePage() {
  const admin = createAdminClient()

  let mensajes: any[] = []
  try {
    const { data } = await admin
      .from('soporte_mensajes')
      .select('id, negocio_id, nombre, email, subject, message, status, priority, created_at')
      .order('created_at', { ascending: false })
    mensajes = data || []
  } catch {
    mensajes = []
  }

  return <SoporteClient mensajes={mensajes} />
}
