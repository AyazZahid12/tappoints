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

  const visitasIniciales = (visitasHoy || []).map(v => ({
    id: v.id,
    puntos_ganados: v.puntos_ganados,
    created_at: v.created_at,
    clientes: Array.isArray(v.clientes)
      ? (v.clientes[0] ? { nombre: String(v.clientes[0].nombre) } : null)
      : v.clientes
        ? { nombre: String((v.clientes as { nombre: unknown }).nombre) }
        : null,
  }))

  return <EscanearClient negocio={negocio} visitasIniciales={visitasIniciales} />
}
