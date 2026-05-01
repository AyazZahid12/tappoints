import { createAdminClient } from '@/lib/supabase-admin'

const C = {
  card: '#FFFFFF',
  cardAlt: '#F4FBF8',
  border: 'rgba(29,158,117,0.12)',
  text: '#0D2B1F',
  muted: '#4A7A65',
  dim: '#7BA898',
  green: '#1D9E75',
  greenDim: 'rgba(29,158,117,0.12)',
  amber: '#F59E0B',
  amberL: 'rgba(245,158,11,0.1)',
  blue: '#1E7EC4',
  blueL: 'rgba(30,126,196,0.1)',
  purple: '#7C3AED',
  purpleL: 'rgba(124,58,237,0.1)',
}

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, color: C.dim, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: color || C.text }}>{value}</div>
    </div>
  )
}

function dotColor(action: string) {
  if (action.includes('Puntos') || action.includes('puntos')) return C.green
  if (action.includes('Cupón') || action.includes('cupón') || action.includes('cupon')) return C.amber
  if (action.includes('NFC') || action.includes('nfc')) return C.blue
  return C.purple
}

export default async function AdminEstadisticasPage() {
  const admin = createAdminClient()

  const [
    { count: totalVisitas },
    { data: visitasData },
    { count: totalCupones },
    { count: cuponesCanjeados },
    { data: actividadReciente },
    { data: negocios },
    { count: totalNfc },
  ] = await Promise.all([
    admin.from('visitas').select('*', { count: 'exact', head: true }),
    admin.from('visitas').select('puntos_ganados'),
    admin.from('cupones').select('*', { count: 'exact', head: true }),
    admin.from('cupones').select('*', { count: 'exact', head: true }).eq('canjeado', true),
    admin.from('visitas')
      .select('created_at, puntos_ganados, negocio_id, negocios(nombre), clientes(nombre)')
      .order('created_at', { ascending: false })
      .limit(20),
    admin.from('negocios').select('plan'),
    admin.from('expositores_nfc').select('*', { count: 'exact', head: true }),
  ])

  const totalPuntos = visitasData?.reduce((acc, v) => acc + (v.puntos_ganados || 0), 0) || 0

  const planGratis = negocios?.filter(n => (n as any)?.plan === 'gratis' || !(n as any)?.plan).length || 0
  const planPro = negocios?.filter(n => (n as any)?.plan === 'pro').length || 0
  const planBusiness = negocios?.filter(n => (n as any)?.plan === 'business').length || 0
  const totalNegocios = negocios?.length || 1

  const features = [
    { label: 'Registro de puntos', value: totalVisitas || 0, color: C.green },
    { label: 'Cupones generados', value: totalCupones || 0, color: C.green },
    { label: 'Cupones canjeados', value: cuponesCanjeados || 0, color: C.green },
    { label: 'Expositores NFC', value: totalNfc || 0, color: C.green },
  ]
  const maxFeature = Math.max(...features.map(f => f.value), 1)

  return (
    <div className="fade-up page-pad" style={{ overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: C.text }}>Estadísticas globales</h1>
        <p style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>Métricas de uso de toda la plataforma</p>
      </div>

      <div className="admin-kpi-grid" style={{ display: 'grid', gap: 14 }}>
        <KpiCard label="Total visitas" value={(totalVisitas || 0).toLocaleString()} color={C.green} />
        <KpiCard label="Total puntos dados" value={totalPuntos.toLocaleString()} color={C.green} />
        <KpiCard label="Cupones generados" value={(totalCupones || 0).toLocaleString()} color={C.green} />
        <KpiCard label="Cupones canjeados" value={(cuponesCanjeados || 0).toLocaleString()} color={C.green} />
      </div>

      <div className="chart-grid" style={{ display: 'grid', gap: 16 }}>
        <div style={{ background: C.card, borderRadius: 14, padding: 24, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: C.text }}>Funciones más usadas</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>Uso acumulado de la plataforma</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {features.map(f => (
              <div key={f.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ fontWeight: 500, color: C.text }}>{f.label}</span>
                  <span style={{ color: C.dim }}>{f.value.toLocaleString()}</span>
                </div>
                <div style={{ height: 8, background: 'rgba(10,26,20,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(f.value / maxFeature) * 100}%`, background: f.color, borderRadius: 99, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: C.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Distribución por plan</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Gratis', count: planGratis, color: C.green },
                { label: 'Pro', count: planPro, color: C.green },
                { label: 'Business', count: planBusiness, color: C.green },
              ].map(p => (
                <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{p.label}</span>
                  <span style={{ fontSize: 13, color: C.dim }}>{p.count} negocios</span>
                  <span style={{ fontSize: 12, color: p.color, fontWeight: 600, minWidth: 36, textAlign: 'right' }}>
                    {Math.round((p.count / totalNegocios) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: C.card, borderRadius: 14, padding: 24, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: C.text, marginBottom: 4 }}>Actividad reciente</div>
          <div style={{ fontSize: 12, color: C.dim, marginBottom: 16 }}>Últimas 20 acciones en la plataforma</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', maxHeight: 420 }}>
            {actividadReciente && actividadReciente.length > 0 ? actividadReciente.map((v: any, i: number) => {
              const dt = new Date(v.created_at)
              const timeStr = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
              const negocioNombre = (v.negocios as any)?.nombre || 'Negocio'
              const clienteNombre = (v.clientes as any)?.nombre || 'Cliente'
              const action = `+${v.puntos_ganados || 1} pts`
              const detail = `${clienteNombre} en ${negocioNombre}`
              const dc = dotColor(action)
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0',
                  borderBottom: i < (actividadReciente.length - 1) ? `1px solid ${C.border}` : 'none',
                }}>
                  <div style={{ marginTop: 5, flexShrink: 0 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: dc }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{action}</div>
                    <div style={{ fontSize: 11, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</div>
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, flexShrink: 0 }}>{timeStr}</div>
                </div>
              )
            }) : (
              <p style={{ fontSize: 13, color: C.dim }}>Sin actividad reciente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
