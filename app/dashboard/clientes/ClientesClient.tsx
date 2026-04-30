'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Icon from '@/components/Icon'
import type { Cliente, Nivel } from '@/lib/types'
import { calcularNivel } from '@/lib/types'

const ACCENT = '#1D9E75'

const TIER_COLORS: Record<Nivel, string> = {
  oro: '#F59E0B', plata: '#94A3B8', bronce: '#C2885B', nuevo: '#0A1A1440',
}
const TIER_LABELS: Record<Nivel, string> = {
  oro: 'Oro', plata: 'Plata', bronce: 'Bronce', nuevo: 'Nuevo',
}

interface Props {
  clientes: Cliente[]
  pointsForReward: number
  negocioId: string
  recompensa: string
}

export default function ClientesClient({ clientes: initial, pointsForReward, negocioId, recompensa }: Props) {
  const [clientes, setClientes] = useState(initial)
  const [search, setSearch] = useState('')
  // sumar puntos
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pointInput, setPointInput] = useState('1')
  const [adding, setAdding] = useState(false)
  // eliminar
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (activeId) inputRef.current?.focus()
  }, [activeId])

  const filtered = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.telefono?.toLowerCase().includes(search.toLowerCase())
  )

  function openInput(id: string) {
    setDeleteId(null)
    setActiveId(id)
    setPointInput('1')
  }

  function cancelSumar() {
    setActiveId(null)
    setPointInput('1')
  }

  async function confirm(cliente: Cliente) {
    const pts = parseInt(pointInput)
    if (!pts || pts < 1) return
    setAdding(true)

    const supabase = createClient()
    const nuevoPuntos = cliente.puntos + pts
    const nuevasVisitas = cliente.visitas + 1

    const { error: errUpdate } = await supabase.from('clientes').update({
      puntos: nuevoPuntos,
      visitas: nuevasVisitas,
      nivel: calcularNivel(nuevoPuntos),
      ultima_visita: new Date().toISOString(),
    }).eq('id', cliente.id)

    if (errUpdate) {
      console.error('[sumar] update clientes:', errUpdate)
      alert(`Error al sumar puntos: ${errUpdate.message} (${errUpdate.code})`)
      setAdding(false)
      return
    }

    const { error: errVisita } = await supabase.from('visitas').insert({
      negocio_id: negocioId,
      cliente_id: cliente.id,
      puntos_ganados: pts,
    })
    if (errVisita) console.error('[sumar] insert visita:', errVisita)

    let puntosFinales = nuevoPuntos
    if (nuevoPuntos >= pointsForReward) {
      const { data: existing } = await supabase
        .from('cupones').select('id').eq('cliente_id', cliente.id).eq('canjeado', false).limit(1)

      if (!existing || existing.length === 0) {
        const codigo = 'TPC-' + Math.random().toString(36).slice(2, 8).toUpperCase()
        await supabase.from('cupones').insert({
          negocio_id: negocioId, cliente_id: cliente.id, codigo, recompensa, canjeado: false,
        })
        await supabase.from('clientes').update({ puntos: 0, nivel: calcularNivel(0) }).eq('id', cliente.id)
        puntosFinales = 0
      }
    }

    setClientes(prev => prev.map(c =>
      c.id === cliente.id
        ? { ...c, puntos: puntosFinales, visitas: nuevasVisitas, nivel: calcularNivel(puntosFinales), ultima_visita: new Date().toISOString() }
        : c
    ))
    setActiveId(null)
    setPointInput('1')
    setAdding(false)
  }

  async function eliminar(clienteId: string) {
    setDeleting(true)
    const supabase = createClient()

    const { error: errV } = await supabase.from('visitas').delete().eq('cliente_id', clienteId)
    if (errV) console.error('[delete] visitas:', errV)

    const { error: errC } = await supabase.from('cupones').delete().eq('cliente_id', clienteId)
    if (errC) console.error('[delete] cupones:', errC)

    const { error: errCl } = await supabase.from('clientes').delete().eq('id', clienteId)
    if (errCl) {
      console.error('[delete] clientes:', errCl)
      alert(`Error al eliminar: ${errCl.message} (${errCl.code})`)
      setDeleteId(null)
      setDeleting(false)
      return
    }

    setClientes(prev => prev.filter(c => c.id !== clienteId))
    setDeleteId(null)
    setDeleting(false)
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    const date = new Date(d)
    const diff = Math.floor((Date.now() - date.getTime()) / 60000)
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
            {!search && <div style={{ fontSize: 13, marginTop: 6 }}>Los clientes aparecerán aquí cuando escaneen tu QR</div>}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
            <thead>
              <tr>
                {['Cliente', 'Puntos', 'Visitas', 'Última visita', 'Nivel', ''].map((h, i) => (
                  <th key={i} style={{
                    textAlign: 'left', fontSize: 11, color: '#0A1A1450', fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 16px 8px',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const pct = Math.min((c.puntos / pointsForReward) * 100, 100)
                const avatar = c.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                const nivel = c.nivel as Nivel
                const isActive = activeId === c.id
                const isDeleting = deleteId === c.id

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
                    <td style={{ background: 'white', padding: '10px 16px', borderRadius: '0 12px 12px 0', textAlign: 'right' }}>
                      {isDeleting ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 500, whiteSpace: 'nowrap' }}>¿Eliminar?</span>
                          <button
                            onClick={() => eliminar(c.id)}
                            disabled={deleting}
                            style={{
                              padding: '5px 10px', borderRadius: 8, border: 'none',
                              background: '#EF4444', color: 'white', fontSize: 12, fontWeight: 600,
                              cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                              opacity: deleting ? 0.6 : 1
                            }}
                          >Sí</button>
                          <button
                            onClick={() => setDeleteId(null)}
                            style={{
                              padding: '5px 10px', borderRadius: 8, border: '1.5px solid #0A1A1415',
                              background: 'transparent', fontSize: 12, fontWeight: 500,
                              cursor: 'pointer', fontFamily: 'inherit', color: '#0A1A1460'
                            }}
                          >No</button>
                        </div>
                      ) : isActive ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                          <input
                            ref={inputRef}
                            type="number"
                            min={1}
                            value={pointInput}
                            onChange={e => setPointInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') confirm(c)
                              if (e.key === 'Escape') cancelSumar()
                            }}
                            style={{
                              width: 52, padding: '5px 8px', borderRadius: 8,
                              border: `1.5px solid ${ACCENT}50`, fontSize: 13, fontWeight: 600,
                              textAlign: 'center', outline: 'none', fontFamily: 'inherit', color: '#0A1A14',
                            }}
                          />
                          <span style={{ fontSize: 11, color: '#0A1A1460', whiteSpace: 'nowrap' }}>pts</span>
                          <button
                            onClick={() => confirm(c)}
                            disabled={adding}
                            style={{
                              width: 28, height: 28, borderRadius: 8, border: 'none',
                              background: ACCENT, cursor: adding ? 'not-allowed' : 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              opacity: adding ? 0.6 : 1, flexShrink: 0
                            }}
                          >
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                          </button>
                          <button
                            onClick={cancelSumar}
                            style={{
                              width: 28, height: 28, borderRadius: 8, border: '1.5px solid #0A1A1415',
                              background: 'transparent', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}
                          >
                            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#0A1A1450" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openInput(c.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px',
                              borderRadius: 8, border: `1.5px solid ${ACCENT}30`,
                              background: ACCENT + '08', color: ACCENT,
                              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round">
                              <path d="M12 5v14M5 12h14"/>
                            </svg>
                            Sumar pts
                          </button>
                          <button
                            onClick={() => { setActiveId(null); setDeleteId(c.id) }}
                            title="Eliminar cliente"
                            style={{
                              width: 28, height: 28, borderRadius: 8, border: '1.5px solid #EF444430',
                              background: '#EF444408', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}
                          >
                            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                            </svg>
                          </button>
                        </div>
                      )}
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
