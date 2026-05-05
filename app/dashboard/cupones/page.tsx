import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import CuponesClient from './CuponesClient'

export default async function CuponesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id, recompensa')
    .eq('user_id', user.id)
    .single()

  if (!negocio) redirect('/dashboard')

  const { data: cupones } = await supabase
    .from('cupones')
    .select('*, clientes(nombre)')
    .eq('negocio_id', negocio.id)
    .order('created_at', { ascending: false })

  return <CuponesClient cupones={cupones || []} reward={negocio.recompensa} negocioId={negocio.id} />
}
