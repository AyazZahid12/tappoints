'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Icon from '@/components/Icon'
import type { Cupon } from '@/lib/types'

const ACCENT = '#1D9E75'

export default function CuponesClient({
  cupones: initialCupones, reward, negocioId
}: { cupones: Cupon[]; reward: string; negocioId: string }) {
  const [cupones, setCupones] = useState(initialCupones)
  const [filter, setFilter] = useState<'todos' | 'pendientes' | 'canjeados'>('todos')
  const [validating, setValidating] = useState<string | null>(null)
  const router = useRouter()

  const filtered = cupones.filter(c =>
    filter === 'todos' ? true : filter === 'pendientes' ? !c.canjeado : c.canjeado
  )

  async function validateCoupon(id: string) {
    setValidating(id)
    const supabase = createClient()
    const { error } = await supabase
      .from('cupones')
      .update({ canjeado: true, canjeado_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setCupones(prev => prev.map(c =>
        c.id === id ? { ...c, canjeado: true, canjeado_at: new Date().toISOString() } : c
      ))
    }
    setValidating(null)
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const pendientes = cupones.filter(c => !c.canjeado).length
  const canjeados = cupones.filter(c => c.canjeado).length

  return (
    <div className="fade-up page-pad" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 20, overflow: 'hidden' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em' }}>Cupones</h1>
          <p style={{ color: '#0A1A1460', fontSize: 14, marginTop: 4 }}>
            Recompensa: <strong>{reward}</strong>
          </p>
        </div>
        {/* Filter tabs */}
        <div className="filter-tabs" style={{ display: 'flex', gap: 4, background: 'white', padding: 4, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', flexShrink: 0 }}>
          {([
            { k: 'todos', l: 'Todos' },
            { k: 'pendientes', l: 'Pendientes' },
            { k: 'canjeados', l: 'Canjeados' }
          ] as const).map(t => (
            <button key={t.k} onClick={() => setFilter(t.k)} style={{
              padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: filter === t.k ? ACCENT : 'transparent',
              color: filter === t.k ? 'white' : '#0A1A1460',
              fontSize: 13, fontWeight: 500, fontFamily: 'inherit', transition: 'all 0.15s'
            }}>{t.l}</button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'Total generados', value: cupones.length, color: '#0A1A14' },
          { label: 'Pendientes', value: pendientes, color: '#F59E0B' },
          { label: 'Canjeados', value: canjeados, color: ACCENT },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, background: 'white', borderRadius: 12, padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', gap: 10, alignItems: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, letterSpacing: '-0.04em' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#0A1A1460' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#0A1A1460' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎫</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>No hay cupones {filter !== 'todos' ? filter : ''}</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Los cupones se generan automáticamente cuando un cliente alcanza el mínimo de puntos</div>
          </div>
        ) : filtered.map(c => (
          <div key={c.id} style={{
            background: 'white', borderRadius: 14, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            opacity: c.canjeado ? 0.75 : 1
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: c.canjeado ? '#0A1A1408' : ACCENT + '15',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon name="coupons" size={18} color={c.canjeado ? '#0A1A1430' : ACCENT} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#0A1A1450' }}>{c.codigo}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                  background: c.canjeado ? '#0A1A1410' : ACCENT + '15',
                  color: c.canjeado ? '#0A1A1450' : ACCENT
                }}>{c.canjeado ? 'Canjeado' : 'Pendiente'}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{c.clientes?.nombre || '—'}</div>
              <div style={{ fontSize: 12, color: '#0A1A1450' }}>{c.recompensa}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: '#0A1A1450' }}>Generado</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{formatDate(c.created_at)}</div>
              {c.canjeado && c.canjeado_at && (
                <div style={{ fontSize: 12, color: ACCENT, marginTop: 2 }}>✓ {formatDate(c.canjeado_at)}</div>
              )}
            </div>
            {!c.canjeado && (
              <button
                onClick={() => validateCoupon(c.id)}
                disabled={validating === c.id}
                style={{
                  padding: '8px 14px', borderRadius: 8, border: 'none', background: ACCENT,
                  color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', flexShrink: 0, opacity: validating === c.id ? 0.6 : 1
                }}
              >
                {validating === c.id ? '...' : 'Validar'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
