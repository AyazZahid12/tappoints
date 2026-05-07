import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ProgramaClient from './ProgramaClient'

export default async function ProgramaPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id, puntos_por_visita, puntos_para_recompensa, recompensa, plan')
    .eq('user_id', user.id)
    .single()

  if (!negocio) redirect('/dashboard')

  const plan = ((negocio as any).plan as string | null | undefined)?.toLowerCase().trim() || 'gratis'

  let { data: programas } = await supabase
    .from('programas')
    .select('id, nombre, puntos_por_visita, puntos_para_recompensa, recompensa')
    .eq('negocio_id', negocio.id)
    .order('created_at', { ascending: true })

  if (!programas || programas.length === 0) {
    const { data: seeded } = await supabase
      .from('programas')
      .insert({
        negocio_id: negocio.id,
        nombre: 'Programa principal',
        puntos_por_visita: negocio.puntos_por_visita,
        puntos_para_recompensa: negocio.puntos_para_recompensa,
        recompensa: negocio.recompensa,
      })
      .select('id, nombre, puntos_por_visita, puntos_para_recompensa, recompensa')
      .single()
    programas = seeded ? [seeded] : []
  }

  return <ProgramaClient programas={programas ?? []} negocioId={negocio.id} plan={plan} />
}
