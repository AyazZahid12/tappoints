import { createAdminClient } from '@/lib/supabase-admin'

const C = {
  bg: '#E1F5EE',
  card: '#FFFFFF',
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

function planBadge(plan: string) {
  if (plan === 'pro') return { bg: C.blueL, color: C.blue }
  if (plan === 'business') return { bg: C.purpleL, color: C.purple }
  return { bg: 'rgba(10,26,20,0.08)', color: C.muted }
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: C.card, borderRadius: 14, padding: 20,
      border: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ fontSize: 12, color: C.dim, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: color || C.text }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>}
    </div>
  )
}

export default async function AdminDashboardPage() {
  const admin = createAdminClient()

  const [
    { data: negocios },
    { count: totalClientes },
    { data: visitasData },
    { count: cuponesCanjeados },
    { data: clientesPorNegocio },
    { count: totalCupones },
  ] = await Promise.all([
    admin.from('negocios').select('id, nombre, plan, activo, created_at'),
    admin.from('clientes').select('*', { count: 'exact', head: true }),
    admin.from('visitas').select('puntos_ganados'),
    admin.from('cupones').select('*', { count: 'exact', head: true }).eq('canjeado', true),
    admin.from('clientes').select('negocio_id'),
    admin.from('cupones').select('*', { count: 'exact', head: true }),
  ])

  const totalNegocios = negocios?.length || 0
  const planGratis = negocios?.filter(n => (n?.plan ?? 'gratis') === 'gratis').length || 0
  const planPro = negocios?.filter(n => n?.plan === 'pro').length || 0
  const planBusiness = negocios?.filter(n => n?.plan === 'business').length || 0
  const mrr = Math.round(planPro * 19.99 + planBusiness * 49.99)
  const totalPuntos = visitasData?.reduce((acc, v) => acc + (v.puntos_ganados || 0), 0) || 0

  const clientesByNegocio: Record<string, number> = {}
  clientesPorNegocio?.forEach(c => {
    clientesByNegocio[c.negocio_id] = (clientesByNegocio[c.negocio_id] || 0) + 1
  })

  const alerts = negocios?.filter(n => (n?.plan ?? 'gratis') === 'gratis' && (clientesByNegocio[n.id] || 0) >= 40) || []

  const now = new Date()
  const monthLabels: string[] = []
  const monthCounts: number[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('es-ES', { month: 'short' })
    monthLabels.push(label)
    const count = negocios?.filter(n => {
      const nd = new Date(n.created_at)
      return nd.getFullYear() === d.getFullYear() && nd.getMonth() === d.getMonth()
    }).length || 0
    monthCounts.push(count)
  }

  const maxMonthCount = Math.max(...monthCounts, 1)
  const currentMonthIdx = 11

  const planTotal = totalNegocios || 1
  const planDistrib = [
    { label: 'Gratis', count: planGratis, pct: Math.round((planGratis / planTotal) * 100), color: C.muted },
    { label: 'Pro', count: planPro, pct: Math.round((planPro / planTotal) * 100), color: C.blue },
    { label: 'Business', count: planBusiness, pct: Math.round((planBusiness / planTotal) * 100), color: C.purple },
  ]

  return (
    <div className="fade-up page-pad" style={{ overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: C.text }}>Dashboard Superadmin</h1>
        <p style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>Vista global de la plataforma TapPoints</p>
      </div>

      <div className="admin-kpi-grid" style={{ display: 'grid', gap: 14 }}>
        <KpiCard label="Total negocios" value={String(totalNegocios)} sub={`${totalNegocios} registrados`} />
        <KpiCard label="Plan Gratis" value={String(planGratis)} sub={`${Math.round((planGratis / planTotal) * 100)}% del total`} />
        <KpiCard label="Plan Pro" value={String(planPro)} color={C.blue} sub="19,99€/mes c/u" />
        <KpiCard label="Plan Business" value={String(planBusiness)} color={C.purple} sub="49,99€/mes c/u" />
        <KpiCard label="MRR estimado" value={`${mrr}€`} color={C.green} sub="recurrente mensual" />
      </div>

      <div className="chart-grid" style={{ display: 'grid', gap: 16 }}>
        <div style={{ background: C.card, borderRadius: 14, padding: 24, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: C.text, marginBottom: 4 }}>Nuevos negocios por mes</div>
          <div style={{ fontSize: 12, color: C.dim, marginBottom: 20 }}>Últimos 12 meses</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {monthCounts.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{
                  width: '100%',
                  height: `${Math.max((v / maxMonthCount) * 100, v > 0 ? 6 : 2)}%`,
                  background: i === currentMonthIdx ? C.green : 'rgba(29,158,117,0.35)',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.3s ease',
                  minHeight: v > 0 ? 4 : 2,
                }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {monthLabels.map((m, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: C.dim, textTransform: 'capitalize' }}>{m}</div>
            ))}
          </div>
        </div>

        <div style={{ background: C.card, borderRadius: 14, padding: 24, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: C.text, marginBottom: 20 }}>Distribución de planes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {planDistrib.map(p => (
              <div key={p.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ fontWeight: 500, color: C.text }}>{p.label}</span>
                  <span style={{ color: C.dim }}>{p.count} negocios · {p.pct}%</span>
                </div>
                <div style={{ height: 7, background: 'rgba(10,26,20,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p.pct}%`, background: p.color, borderRadius: 99, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: C.dim }}>Total clientes</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.03em' }}>{totalClientes || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.dim }}>Puntos dados</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.03em' }}>{totalPuntos.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.dim }}>Cupones totales</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.03em' }}>{totalCupones || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.dim }}>Canjeados</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.green, letterSpacing: '-0.03em' }}>{cuponesCanjeados || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div style={{ background: C.card, borderRadius: 14, padding: 24, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: C.text, marginBottom: 4 }}>Alertas automáticas</div>
          <div style={{ fontSize: 12, color: C.dim, marginBottom: 16 }}>Negocios en plan gratuito cerca del límite de 50 clientes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map(n => {
              const clientCount = clientesByNegocio[n.id] || 0
              const pct = Math.min(Math.round((clientCount / 50) * 100), 100)
              return (
                <div key={n.id} style={{
                  background: C.amberL, borderRadius: 10, padding: '14px 16px',
                  border: `1px solid rgba(245,158,11,0.2)`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{n.nombre}</span>
                    <span style={{ fontSize: 13, color: C.amber, fontWeight: 600 }}>{clientCount}/50 clientes</span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(245,158,11,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: C.amber, borderRadius: 99 }} />
                  </div>
                  <div style={{ fontSize: 11, color: C.amber, marginTop: 6 }}>Considera contactar para ofrecer upgrade a Pro</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
