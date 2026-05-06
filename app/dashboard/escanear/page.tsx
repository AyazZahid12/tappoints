import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import EscanearClient from './EscanearClient'

export default async function EscanearPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: negocio } = await supabase
    .from('negocios')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!negocio) redirect('/auth')

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: visitasHoy } = await supabase
    .from('visitas')
    .select('id, puntos_ganados, created_at, clientes(nombre)')
    .eq('negocio_id', negocio.id)
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(20)

  return <EscanearClient negocio={negocio} visitasIniciales={visitasHoy || []} />
}
