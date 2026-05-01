'use client'

import { useState } from 'react'

const C = {
  card: '#FFFFFF',
  cardAlt: '#F4FBF8',
  border: 'rgba(29,158,117,0.15)',
  text: '#0D2B1F',
  muted: '#4A7A65',
  dim: '#7BA898',
  green: '#1D9E75',
  greenDim: 'rgba(29,158,117,0.12)',
  amber: '#F59E0B',
  amberL: 'rgba(245,158,11,0.1)',
  blue: '#1E7EC4',
  blueL: 'rgba(30,126,196,0.1)',
}

interface Expositor {
  id: string
  negocioId: string
  negocioNombre: string
  nombre: string
  email: string
  address: string
  status: 'pendiente' | 'enviado' | 'entregado'
  requestedAt: string
  sentAt: string | null
  deliveredAt: string | null
}

function StatusBadge({ status }: { status: string }) {
  let bg = C.amberL, color = C.amber
  if (status === 'enviado') { bg = C.blueL; color = C.blue }
  if (status === 'entregado') { bg = C.greenDim; color = C.green }
  const labels: Record<string, string> = { pendiente: 'Pendiente', enviado: 'Enviado', entregado: 'Entregado' }
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99 }}>
      {labels[status] || status}
    </span>
  )
}

function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const C2 = { green: '#1D9E75', muted: '#4A7A65' }
  return (
    <button onClick={onClick} style={{
      padding: '6px 16px', borderRadius: 99, border: 'none', cursor: 'pointer',
      background: active ? C2.green : 'transparent',
      color: active ? 'white' : C2.muted,
      fontSize: 13, fontWeight: active ? 600 : 400,
      fontFamily: 'inherit', transition: 'all 0.15s',
    }}>{label}</button>
  )
}

export default function ExpositoresClient({ expositores: initial }: { expositores: Expositor[] }) {
  const [expositores, setExpositores] = useState<Expositor[]>(initial)
  const [filter, setFilter] = useState<'todos' | 'pendiente' | 'enviado' | 'entregado'>('todos')
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = filter === 'todos' ? expositores : expositores.filter(e => e.status === filter)

  async function updateStatus(id: string, newStatus: 'enviado' | 'entregado') {
    setLoading(id)
    try {
      const res = await fetch('/api/admin/nfc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (res.ok) {
        setExpositores(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e))
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fade-up page-pad" style={{ overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: C.text }}>Expositores NFC</h1>
        <p style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>Gestión de solicitudes de expositores NFC</p>
      </div>

      <div style={{ display: 'flex', gap: 4, background: C.card, borderRadius: 12, padding: 6, border: `1px solid ${C.border}`, width: 'fit-content' }}>
        {(['todos', 'pendiente', 'enviado', 'entregado'] as const).map(f => (
          <FilterTab
            key={f}
            label={f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
            active={filter === f}
            onClick={() => setFilter(f)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 14, padding: 48, border: `1px solid ${C.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 15, color: C.muted }}>No hay expositores en esta categoría</div>
        </div>
      ) : (
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.cardAlt }}>
                  {['Negocio', 'Email', 'Dirección', 'Fecha solicitud', 'Estado', 'Acción'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const reqDate = new Date(e.requestedAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  const isLoading = loading === e.id
                  return (
                    <tr key={e.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{e.negocioNombre}</div>
                        <div style={{ fontSize: 11, color: C.dim }}>{e.nombre}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: C.muted }}>{e.email}</td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: C.dim, maxWidth: 200 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.address}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: C.dim, whiteSpace: 'nowrap' }}>{reqDate}</td>
                      <td style={{ padding: '14px 16px' }}><StatusBadge status={e.status} /></td>
                      <td style={{ padding: '14px 16px' }}>
                        {e.status === 'pendiente' && (
                          <button
                            onClick={() => updateStatus(e.id, 'enviado')}
                            disabled={isLoading}
                            style={{
                              background: C.blueL, color: C.blue, border: 'none',
                              padding: '6px 14px', borderRadius: 8, cursor: isLoading ? 'not-allowed' : 'pointer',
                              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                              opacity: isLoading ? 0.6 : 1,
                            }}
                          >{isLoading ? '...' : 'Marcar enviado'}</button>
                        )}
                        {e.status === 'enviado' && (
                          <button
                            onClick={() => updateStatus(e.id, 'entregado')}
                            disabled={isLoading}
                            style={{
                              background: C.greenDim, color: C.green, border: 'none',
                              padding: '6px 14px', borderRadius: 8, cursor: isLoading ? 'not-allowed' : 'pointer',
                              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                              opacity: isLoading ? 0.6 : 1,
                            }}
                          >{isLoading ? '...' : 'Marcar entregado'}</button>
                        )}
                        {e.status === 'entregado' && (
                          <span style={{ fontSize: 12, color: C.green }}>✓ Completado</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
