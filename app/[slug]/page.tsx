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

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const [{ count: clientCount }, programasRaw] = await Promise.all([
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('negocio_id', negocio.id),
    serviceKey
      ? fetch(
          `https://fkyrtbwjdqyrnfiawvzz.supabase.co/rest/v1/programas?negocio_id=eq.${negocio.id}&select=id,nombre,puntos_por_visita,puntos_para_recompensa,recompensa&order=created_at.asc`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' }
        ).then(r => r.ok ? r.json() : null).catch(() => null)
      : Promise.resolve(null),
  ])

  const programas: { id: string; nombre: string; puntos_por_visita: number; puntos_para_recompensa: number; recompensa: string }[] | null =
    Array.isArray(programasRaw) ? programasRaw : null

  const plan = ((negocio as any).plan as string | null | undefined)?.toLowerCase().trim() || 'gratis'
  const isAtLimit = plan === 'gratis' && (clientCount ?? 0) >= 50

  const efectivos = programas && programas.length > 0 ? programas : [{
    id: '',
    nombre: 'Programa principal',
    puntos_por_visita: negocio.puntos_por_visita,
    puntos_para_recompensa: negocio.puntos_para_recompensa,
    recompensa: negocio.recompensa,
  }]

  return (
    <ScanClient
      negocioNombre={negocio.nombre}
      programas={efectivos}
      isAtLimit={isAtLimit}
    />
  )
}
