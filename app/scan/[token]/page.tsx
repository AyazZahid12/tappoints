import { createServerSupabaseClient } from '@/lib/supabase-server'
import ScanClient from './ScanClient'

interface Props {
  params: Promise<{ token: string }>
}

export default async function ScanPage({ params }: Props) {
  const { token } = await params
  const supabase = await createServerSupabaseClient()

  const { data: qrToken } = await supabase
    .from('qr_tokens')
    .select('negocio_id, expires_at, used')
    .eq('token', token)
    .single()

  if (!qrToken) return <ErrorPage message="QR inválido" detail="Este código no existe." />
  if (qrToken.used) return <ErrorPage message="QR ya utilizado" detail="Este QR ya fue escaneado." />

  const expired = new Date(qrToken.expires_at) < new Date()
  if (expired) return <ErrorPage message="QR expirado" detail="El negocio debe generar un nuevo QR." />

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const [{ data: negocio }, { count: clientCount }, programasRaw] = await Promise.all([
    supabase.from('negocios').select('id, nombre, recompensa, puntos_para_recompensa, puntos_por_visita, plan').eq('id', qrToken.negocio_id).single(),
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('negocio_id', qrToken.negocio_id),
    serviceKey
      ? fetch(
          `https://fkyrtbwjdqyrnfiawvzz.supabase.co/rest/v1/programas?negocio_id=eq.${qrToken.negocio_id}&select=id,nombre,puntos_por_visita,puntos_para_recompensa,recompensa&order=created_at.asc`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' }
        ).then(r => r.ok ? r.json() : null).catch(() => null)
      : Promise.resolve(null),
  ])

  const programas: { id: string; nombre: string; puntos_por_visita: number; puntos_para_recompensa: number; recompensa: string }[] | null =
    Array.isArray(programasRaw) ? programasRaw : null

  if (!negocio) return <ErrorPage message="Negocio no encontrado" detail="Intenta de nuevo." />

  const plan = ((negocio as any).plan as string | null | undefined)?.toLowerCase().trim() || 'gratis'
  const isAtLimit = plan === 'gratis' && (clientCount ?? 0) >= 50

  const effectivePrograms = programas && programas.length > 0 ? programas : [{
    id: '',
    nombre: 'Programa principal',
    puntos_por_visita: negocio.puntos_por_visita,
    puntos_para_recompensa: negocio.puntos_para_recompensa,
    recompensa: negocio.recompensa,
  }]

  return (
    <ScanClient
      token={token}
      negocio={negocio}
      programas={effectivePrograms}
      expiresAt={qrToken.expires_at}
      isAtLimit={isAtLimit}
    />
  )
}

function ErrorPage({ message, detail }: { message: string; detail: string }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#E1F5EE',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>⛔</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0A1A14' }}>{message}</h2>
        <p style={{ fontSize: 14, color: '#0A1A1460', marginTop: 8 }}>{detail}</p>
      </div>
    </div>
  )
}
