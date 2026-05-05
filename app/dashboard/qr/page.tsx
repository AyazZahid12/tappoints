import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import QRClient from './QRClient'

export default async function QRPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id, nombre, slug, recompensa, puntos_para_recompensa, puntos_por_visita')
    .eq('user_id', user.id)
    .single()

  if (!negocio) redirect('/dashboard')

  const { data: pendientes } = await supabase
    .from('puntos_pendientes')
    .select('id, cliente_id, nombre, telefono, puntos_solicitados, created_at, expires_at')
    .eq('negocio_id', negocio.id)
    .eq('estado', 'pendiente')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tappoints.com'

  return (
    <QRClient
      businessName={negocio.nombre}
      appUrl={appUrl}
      slug={negocio.slug}
      negocioId={negocio.id}
      recompensa={negocio.recompensa}
      pointsForReward={negocio.puntos_para_recompensa}
      initialPendientes={pendientes || []}
    />
  )
}
