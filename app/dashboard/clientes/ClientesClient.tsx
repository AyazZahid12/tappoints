'use client'

import { useState } from 'react'
import Icon from '@/components/Icon'
import type { Cliente, Nivel } from '@/lib/types'

const ACCENT = '#1D9E75'

const TIER_COLORS: Record<Nivel, string> = {
  oro: '#F59E0B',
  plata: '#94A3B8',
  bronce: '#C2885B',
  nuevo: '#0A1A1440',
}

const TIER_LABELS: Record<Nivel, string> = {
  oro: 'Oro',
  plata: 'Plata',
  bronce: 'Bronce',
  nuevo: 'Nuevo',
}

export default function ClientesClient({ clientes, pointsForReward }: { clientes: Cliente[]; pointsForReward: number }) {
  const [search, setSearch] = useState('')

  const filtered = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.telefono?.toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    const date = new Date(d)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60)
    if (diff < 60) return `Hace ${diff} min`
    if (diff < 1440) return `Hace ${Math.floor(diff / 60)}h`
    if (diff < 2880) return 'Ayer'
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="fade-up" style={{ padding: '32px', height: '100%', display: 'flex', flexDirection: 'column', gap: 24, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em' }}>Clientes</h1>
          <p style={{ color: '#0A1A1460', fontSize: 14, marginTop: 4 }}>{clientes.length} clientes registrados</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, background: 'white',
          border: '1.5px solid #0A1A1410', borderRadius: 12, padding: '8px 14px'
        }}>
          <Icon name="search" size={15} color="#0A1A1440" />
          <input
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 13, background: 'transparent', width: 160, fontFamily: 'inherit', color: '#0A1A14' }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#0A1A1460' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>
              {search ? 'No se encontraron clientes' : 'Aún no hay clientes'}
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {!search && 'Los clientes aparecerán aquí cuando escaneen tu QR'}
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
            <thead>
              <tr>
                {['Cliente', 'Puntos', 'Visitas', 'Última visita', 'Nivel', ''].map((h, i) => (
                  <th key={i} style={{
                    textAlign: 'left', fontSize: 11, color: '#0A1A1450', fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '4px 16px 8px', background: 'transparent'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const pct = Math.min((c.puntos / pointsForReward) * 100, 100)
                const avatar = c.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                const nivel = c.nivel as Nivel
                return (
                  <tr key={c.id}>
                    <td style={{ background: 'white', padding: '14px 16px', borderRadius: '12px 0 0 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: ACCENT + '20', color: ACCENT,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, flexShrink: 0
                        }}>{avatar}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{c.nombre}</div>
                          {c.telefono && <div style={{ fontSize: 11, color: '#0A1A1450' }}>{c.telefono}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ background: 'white', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: ACCENT }}>{c.puntos}</span>
                        <div style={{ width: 60, height: 4, background: '#0A1A1410', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: ACCENT, borderRadius: 99 }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ background: 'white', padding: '14px 16px', fontSize: 13, color: '#0A1A1470' }}>{c.visitas}</td>
                    <td style={{ background: 'white', padding: '14px 16px', fontSize: 13, color: '#0A1A1470' }}>{formatDate(c.ultima_visita)}</td>
                    <td style={{ background: 'white', padding: '14px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
                        background: TIER_COLORS[nivel] + '20', color: TIER_COLORS[nivel]
                      }}>{TIER_LABELS[nivel]}</span>
                    </td>
                    <td style={{ background: 'white', padding: '14px 16px', borderRadius: '0 12px 12px 0' }}>
                      <Icon name="chevron" size={14} color="#0A1A1430" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
