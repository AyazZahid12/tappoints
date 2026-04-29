import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ProgramaClient from './ProgramaClient'

export default async function ProgramaPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id, puntos_por_visita, puntos_para_recompensa, recompensa')
    .eq('user_id', user.id)
    .single()

  if (!negocio) redirect('/auth')

  return <ProgramaClient negocio={negocio} />
}
