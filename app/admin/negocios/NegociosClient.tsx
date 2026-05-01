'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase'

const C = {
  card: '#FFFFFF',
  cardAlt: '#F4FBF8',
  border: 'rgba(29,158,117,0.15)',
  text: '#0D2B1F',
  muted: '#4A7A65',
  dim: '#7BA898',
  green: '#1D9E75',
  greenDim: 'rgba(29,158,117,0.12)',
  red: '#E53935',
  redL: 'rgba(229,57,53,0.1)',
  amber: '#F59E0B',
  amberL: 'rgba(245,158,11,0.1)',
  blue: '#1E7EC4',
  blueL: 'rgba(30,126,196,0.1)',
  purple: '#7C3AED',
  purpleL: 'rgba(124,58,237,0.1)',
}

interface Negocio {
  id: string
  nombre: string
  slug: string
  plan: string
  activo: boolean
  created_at: string
  clienteCount: number
}

function PlanBadge({ plan }: { plan: string }) {
  let bg = 'rgba(10,26,20,0.08)', color = C.muted
  if (plan === 'pro') { bg = C.blueL; color = C.blue }
  if (plan === 'business') { bg = C.purpleL; color = C.purple }
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99, textTransform: 'capitalize' }}>
      {plan}
    </span>
  )
}

function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 16px', borderRadius: 99, border: 'none', cursor: 'pointer',
      background: active ? C.green : 'transparent',
      color: active ? 'white' : C.muted,
      fontSize: 13, fontWeight: active ? 600 : 400,
      fontFamily: 'inherit', transition: 'all 0.15s',
    }}>{label}</button>
  )
}

interface DetailData {
  ownerEmail: string
  lastSignIn: string
  slug: string
  clientes: { id: string; nombre: string; puntos: number; nivel: string; visitas: number; ultima_visita: string }[]
  cuponesGenerados: number
  cuponesCanjeados: number
}

const TIER_LABELS: Record<string, string> = { bronze: 'Bronce', silver: 'Plata', gold: 'Oro' }
const TIER_COLORS: Record<string, string> = { bronze: '#B45309', silver: '#6B7280', gold: '#D97706' }

export default function NegociosClient({ negocios: initialNegocios }: { negocios: Negocio[] }) {
  const [negocios, setNegocios] = useState<Negocio[]>(initialNegocios)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState<'todos' | 'gratis' | 'pro' | 'business'>('todos')
  const [filterActivo, setFilterActivo] = useState<'todos' | 'activo' | 'inactivo'>('todos')
  const [selected, setSelected] = useState<Negocio | null>(null)
  const [detailPlan, setDetailPlan] = useState('gratis')
  const [saving, setSaving] = useState(false)
  const [detailData, setDetailData] = useState<DetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  const filtered = negocios.filter(n => {
    const matchSearch = n.nombre.toLowerCase().includes(search.toLowerCase()) || n.slug.toLowerCase().includes(search.toLowerCase())
    const matchPlan = filterPlan === 'todos' || n.plan === filterPlan
    const matchActivo = filterActivo === 'todos' || (filterActivo === 'activo' ? n.activo : !n.activo)
    return matchSearch && matchPlan && matchActivo
  })

  async function openDetail(n: Negocio) {
    setSelected(n)
    setDetailPlan(n.plan)
    setDetailData(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/negocio-detail?id=${n.id}`)
      if (res.ok) setDetailData(await res.json())
    } finally {
      setDetailLoading(false)
    }
  }

  async function savePlan() {
    if (!selected) return
    setSaving(true)
    const { error } = await supabase.from('negocios').update({ plan: detailPlan }).eq('id', selected.id)
    if (!error) {
      setNegocios(prev => prev.map(n => n.id === selected.id ? { ...n, plan: detailPlan } : n))
      setSelected(prev => prev ? { ...prev, plan: detailPlan } : prev)
    }
    setSaving(false)
  }

  async function toggleActivo() {
    if (!selected) return
    setSaving(true)
    const newActivo = !selected.activo
    const { error } = await supabase.from('negocios').update({ activo: newActivo }).eq('id', selected.id)
    if (!error) {
      setNegocios(prev => prev.map(n => n.id === selected.id ? { ...n, activo: newActivo } : n))
      setSelected(prev => prev ? { ...prev, activo: newActivo } : prev)
    }
    setSaving(false)
  }

  async function deleteNegocio() {
    if (!selected) return
    if (!window.confirm(`¿Eliminar permanentemente "${selected.nombre}"? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    const res = await fetch(`/api/admin/negocio-detail?id=${selected.id}`, { method: 'DELETE' })
    if (res.ok) {
      setNegocios(prev => prev.filter(n => n.id !== selected.id))
      setSelected(null)
    }
    setDeleting(false)
  }

  function exportCsv() {
    const rows = [['ID', 'Nombre', 'Slug', 'Plan', 'Activo', 'Clientes', 'Registrado']]
    filtered.forEach(n => rows.push([n.id, n.nombre, n.slug, n.plan, String(n.activo), String(n.clienteCount), n.created_at]))
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'negocios.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fade-up page-pad" style={{ overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: C.text }}>Negocios</h1>
          <p style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>{negocios.length} negocios registrados</p>
        </div>
        <button onClick={exportCsv} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: C.green, color: 'white', border: 'none',
          padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
          fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar CSV
        </button>
      </div>

      <div style={{ background: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}`, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar negocio..."
          style={{
            flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 10,
            border: `1px solid ${C.border}`, fontSize: 13, color: C.text,
            background: C.cardAlt, outline: 'none', fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', gap: 4, background: C.cardAlt, borderRadius: 10, padding: 4 }}>
          {(['todos', 'gratis', 'pro', 'business'] as const).map(p => (
            <FilterTab key={p} label={p === 'todos' ? 'Todos los planes' : p.charAt(0).toUpperCase() + p.slice(1)} active={filterPlan === p} onClick={() => setFilterPlan(p)} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, background: C.cardAlt, borderRadius: 10, padding: 4 }}>
          {(['todos', 'activo', 'inactivo'] as const).map(a => (
            <FilterTab key={a} label={a.charAt(0).toUpperCase() + a.slice(1)} active={filterActivo === a} onClick={() => setFilterActivo(a)} />
          ))}
        </div>
      </div>

      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Negocio', 'Plan', 'Clientes', 'Registrado', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: C.dim, fontSize: 14 }}>Sin resultados</td></tr>
              ) : filtered.map((n, i) => {
                const initials = n.nombre.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                const regDate = new Date(n.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
                return (
                  <tr key={n.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background 0.1s' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', background: C.greenDim,
                          color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, flexShrink: 0,
                        }}>{initials}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{n.nombre}</div>
                          <div style={{ fontSize: 11, color: C.dim }}>/{n.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}><PlanBadge plan={n.plan} /></td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: C.text, fontWeight: 600 }}>{n.clienteCount}</td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: C.dim }}>{regDate}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: n.activo ? C.green : C.red }} />
                        <span style={{ fontSize: 12, color: n.activo ? C.green : C.red, fontWeight: 500 }}>
                          {n.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={() => openDetail(n)} style={{
                        background: C.greenDim, color: C.green, border: 'none',
                        padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                      }}>Ver detalle</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} onClick={() => setSelected(null)} />
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: 480, maxWidth: '100vw',
            background: C.card, zIndex: 301, display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', background: C.greenDim,
                  color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                }}>{selected.nombre.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{selected.nombre}</div>
                  <PlanBadge plan={selected.plan} />
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, fontSize: 20, lineHeight: 1 }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* KPI row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div style={{ background: C.cardAlt, borderRadius: 12, padding: 14, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, color: C.dim }}>Clientes</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 2 }}>{selected.clienteCount}</div>
                </div>
                <div style={{ background: C.cardAlt, borderRadius: 12, padding: 14, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, color: C.dim }}>Cupones</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 2 }}>{detailData?.cuponesGenerados ?? '—'}</div>
                </div>
                <div style={{ background: C.cardAlt, borderRadius: 12, padding: 14, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, color: C.dim }}>Canjeados</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.green, marginTop: 2 }}>{detailData?.cuponesCanjeados ?? '—'}</div>
                </div>
              </div>

              {/* Owner info */}
              <div style={{ background: C.cardAlt, borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Información del dueño</div>
                {detailLoading ? (
                  <div style={{ fontSize: 13, color: C.dim }}>Cargando...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 13, color: C.text }}><span style={{ color: C.dim }}>Email: </span>{detailData?.ownerEmail || '—'}</div>
                    <div style={{ fontSize: 13, color: C.text }}><span style={{ color: C.dim }}>Slug: </span>/{detailData?.slug || selected.slug}</div>
                    <div style={{ fontSize: 13, color: C.text }}><span style={{ color: C.dim }}>Registrado: </span>{new Date(selected.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                    <div style={{ fontSize: 13, color: C.text }}>
                      <span style={{ color: C.dim }}>Último acceso: </span>
                      {detailData?.lastSignIn ? new Date(detailData.lastSignIn).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                    <div style={{ fontSize: 13, color: C.text }}>
                      <span style={{ color: C.dim }}>Estado: </span>
                      <span style={{ color: selected.activo ? C.green : C.red, fontWeight: 600 }}>{selected.activo ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* QR */}
              {detailData?.slug && (
                <div style={{ background: C.cardAlt, borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>QR del negocio</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ padding: 10, background: 'white', borderRadius: 10, border: `1px solid ${C.border}` }}>
                      <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/${detailData.slug}`} size={100} fgColor="#0D2B1F" bgColor="white" level="H" />
                    </div>
                    <div style={{ fontSize: 12, color: C.dim }}>/{detailData.slug}</div>
                  </div>
                </div>
              )}

              {/* Clientes list */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Clientes ({detailLoading ? '…' : detailData?.clientes.length ?? 0})
                </div>
                {detailLoading ? (
                  <div style={{ fontSize: 13, color: C.dim }}>Cargando...</div>
                ) : detailData?.clientes.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.dim }}>Sin clientes</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                    {detailData?.clientes.map((c, i) => {
                      const nivel = c.nivel || 'bronze'
                      const initials = c.nombre.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                      return (
                        <div key={c.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                          borderBottom: i < (detailData.clientes.length - 1) ? `1px solid ${C.border}` : 'none',
                          background: C.card,
                        }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.greenDim, color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</div>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: (TIER_COLORS[nivel] || '#B45309') + '20', color: TIER_COLORS[nivel] || '#B45309' }}>
                              {TIER_LABELS[nivel] || nivel}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{c.puntos} pts</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Change plan */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cambiar plan</div>
                <select value={detailPlan} onChange={e => setDetailPlan(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, color: C.text, background: C.cardAlt, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                  <option value="gratis">Gratis</option>
                  <option value="pro">Pro (19,99€/mes)</option>
                  <option value="business">Business (49,99€/mes)</option>
                </select>
                <button onClick={savePlan} disabled={saving || detailPlan === selected.plan} style={{ marginTop: 10, width: '100%', padding: '10px', borderRadius: 10, background: (saving || detailPlan === selected.plan) ? C.greenDim : C.green, color: (saving || detailPlan === selected.plan) ? C.green : 'white', border: 'none', cursor: (saving || detailPlan === selected.plan) ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {saving ? 'Guardando...' : 'Guardar plan'}
                </button>
              </div>

              {/* Toggle active */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Estado del negocio</div>
                <button onClick={toggleActivo} disabled={saving} style={{ width: '100%', padding: '10px', borderRadius: 10, background: selected.activo ? C.redL : C.greenDim, color: selected.activo ? C.red : C.green, border: `1px solid ${selected.activo ? 'rgba(229,57,53,0.2)' : 'rgba(29,158,117,0.2)'}`, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {selected.activo ? 'Desactivar negocio' : 'Activar negocio'}
                </button>
              </div>

              {/* Delete */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.red, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Zona peligrosa</div>
                <button onClick={deleteNegocio} disabled={deleting} style={{ width: '100%', padding: '10px', borderRadius: 10, background: C.redL, color: C.red, border: `1px solid rgba(229,57,53,0.25)`, cursor: deleting ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', opacity: deleting ? 0.7 : 1 }}>
                  {deleting ? 'Eliminando...' : 'Eliminar negocio permanentemente'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
