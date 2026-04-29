import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import ScanClient from './ScanClient'

export default async function SlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id, nombre, recompensa, puntos_para_recompensa, puntos_por_visita')
    .eq('slug', slug)
    .single()

  if (!negocio) notFound()

  return <ScanClient negocio={negocio} slug={slug} />
}
