import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Icon from '@/components/Icon'

const ACCENT = '#1D9E75'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: negocio } = await supabase
    .from('negocios')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!negocio) redirect('/auth')

  // Fetch metrics
  const [
    { count: totalClientes },
    { data: visitasHoy },
    { count: cuponesCanjeados },
    { data: topClientes },
    { data: actividadReciente },
    { data: visitasSemana }
  ] = await Promise.all([
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('negocio_id', negocio.id),
    supabase.from('visitas').select('id').eq('negocio_id', negocio.id)
      .gte('created_at', new Date().toISOString().split('T')[0]),
    supabase.from('cupones').select('*', { count: 'exact', head: true }).eq('negocio_id', negocio.id).eq('canjeado', true),
    supabase.from('clientes').select('id, nombre, puntos, nivel').eq('negocio_id', negocio.id).order('puntos', { ascending: false }).limit(4),
    supabase.from('visitas').select('created_at, puntos_ganados, clientes(nombre, telefono)').eq('negocio_id', negocio.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('visitas').select('created_at').eq('negocio_id', negocio.id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  // Group visits by day of week
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  const visitsByDay = [0, 0, 0, 0, 0, 0, 0]
  visitasSemana?.forEach(v => {
    const d = new Date(v.created_at).getDay()
    const idx = d === 0 ? 6 : d - 1
    visitsByDay[idx]++
  })

  const maxVisits = Math.max(...visitsByDay, 1)

  const today = new Date()
  const dateStr = today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="fade-up page-pad" style={{ overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em' }}>Dashboard</h1>
        <p style={{ color: '#0A1A1460', fontSize: 14, marginTop: 4, textTransform: 'capitalize' }}>{dateStr}</p>
      </div>

      {/* Stats grid */}
      <div className="stats-grid" style={{ display: 'grid', gap: 16 }}>
        <StatCard label="Clientes totales" value={String(totalClientes || 0)} sub="registrados" icon="users" />
        <StatCard label="Visitas hoy" value={String(visitasHoy?.length || 0)} sub="hoy" icon="trend" />
        <StatCard label="Cupones canjeados" value={String(cuponesCanjeados || 0)} sub="total" icon="coupons" />
      </div>

      {/* Chart + Top clients */}
      <div className="chart-grid" style={{ display: 'grid', gap: 16 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Visitas esta semana</div>
            <div style={{ color: '#0A1A1450', fontSize: 12, marginTop: 2 }}>{visitasSemana?.length || 0} visitas en total</div>
          </div>
          {/* Mini chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 56 }}>
            {visitsByDay.map((v, i) => (
              <div key={i} style={{
                flex: 1, background: i === new Date().getDay() - 1 ? ACCENT : ACCENT + '30',
                borderRadius: '3px 3px 0 0',
                height: `${(v / maxVisits) * 100}%`,
                minHeight: v > 0 ? 4 : 2,
                transition: 'height 0.3s ease'
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {days.map((d, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#0A1A1440' }}>{d}</div>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Top clientes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topClientes && topClientes.length > 0 ? topClientes.map((c, i) => {
              const maxPts = topClientes[0].puntos || 1
              const avatar = c.nombre.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: i === 0 ? ACCENT : ACCENT + '20',
                    color: i === 0 ? 'white' : ACCENT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0
                  }}>{avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nombre}</div>
                    <div style={{ fontSize: 11, color: '#0A1A1450' }}>{c.puntos} pts</div>
                  </div>
                  <div style={{
                    width: `${(c.puntos / maxPts) * 56}px`, height: 4,
                    background: ACCENT + '30', borderRadius: 99, overflow: 'hidden', minWidth: 4
                  }}>
                    <div style={{ width: '100%', height: '100%', background: ACCENT, borderRadius: 99 }} />
                  </div>
                </div>
              )
            }) : (
              <p style={{ fontSize: 13, color: '#0A1A1460' }}>Sin clientes aún</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Actividad reciente</div>
          <div style={{ fontSize: 12, color: '#0A1A1440' }}>Últimas {actividadReciente?.length || 0} acciones</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {actividadReciente && actividadReciente.length > 0 ? actividadReciente.map((v: any, i: number) => {
            const clienteNombre = (v.clientes as any)?.nombre || 'Cliente'
            const telefono = (v.clientes as any)?.telefono || ''
            const puntos = v.puntos_ganados || 1
            const avatar = clienteNombre.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
            const dt = new Date(v.created_at)
            const dateStr = dt.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            const timeStr = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                borderBottom: i < actividadReciente.length - 1 ? '1px solid #0A1A1408' : 'none'
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: ACCENT + '15', color: ACCENT,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700
                }}>{avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {clienteNombre}
                  </div>
                  <div style={{ fontSize: 12, color: '#0A1A1455', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ background: ACCENT + '15', color: ACCENT, fontWeight: 600, fontSize: 11, padding: '1px 7px', borderRadius: 99 }}>+{puntos} pt{puntos > 1 ? 's' : ''}</span>
                    <span>Visita registrada</span>
                    {telefono && <span style={{ color: '#0A1A1435' }}>· {telefono}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0A1A14' }}>{timeStr}</div>
                  <div style={{ fontSize: 11, color: '#0A1A1440', marginTop: 2 }}>{dateStr}</div>
                </div>
              </div>
            )
          }) : (
            <p style={{ fontSize: 13, color: '#0A1A1460', padding: '8px 0' }}>Sin actividad reciente</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: string }) {
  return (
    <div className="stat-card" style={{
      background: 'white', borderRadius: 16,
      display: 'flex', flexDirection: 'column', gap: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: ACCENT + '15', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon name={icon} size={19} color={ACCENT} />
        </div>
        <div style={{ fontSize: 11, color: ACCENT, background: ACCENT + '15', padding: '3px 8px', borderRadius: 99, fontWeight: 600 }}>
          {sub}
        </div>
      </div>
      <div>
        <div className="stat-value" style={{ fontWeight: 700, letterSpacing: '-0.04em', color: '#0A1A14' }}>{value}</div>
        <div style={{ fontSize: 13, color: '#0A1A1480', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  )
}
