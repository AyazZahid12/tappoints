import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import ScanClient from './ScanClient'

export default async function SlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id, nombre, recompensa, puntos_para_recompensa, puntos_por_visita, plan')
    .eq('slug', slug)
    .single()

  if (!negocio) notFound()

  const { count: clientCount } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .eq('negocio_id', negocio.id)

  const plan = (negocio as any).plan ?? 'gratis'
  const isAtLimit = plan === 'gratis' && (clientCount ?? 0) >= 50

  return <ScanClient negocio={negocio} slug={slug} isAtLimit={isAtLimit} />
}
