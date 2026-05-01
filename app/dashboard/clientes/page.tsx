import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ClientesClient from './ClientesClient'

export default async function ClientesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id, puntos_para_recompensa, recompensa, plan')
    .eq('user_id', user.id)
    .single()

  if (!negocio) redirect('/auth')

  const { data: clientes } = await supabase
    .from('clientes')
    .select('*')
    .eq('negocio_id', negocio.id)
    .order('puntos', { ascending: false })

  const plan = (negocio as any).plan ?? 'gratis'

  return (
    <ClientesClient
      clientes={clientes || []}
      pointsForReward={negocio.puntos_para_recompensa}
      negocioId={negocio.id}
      recompensa={negocio.recompensa}
      plan={plan}
    />
  )
}
