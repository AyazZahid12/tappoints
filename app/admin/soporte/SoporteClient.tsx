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
  red: '#E53935',
  redL: 'rgba(229,57,53,0.1)',
  amber: '#F59E0B',
  amberL: 'rgba(245,158,11,0.1)',
  blue: '#1E7EC4',
  blueL: 'rgba(30,126,196,0.1)',
}

interface Mensaje {
  id: string
  negocio_id: string | null
  nombre: string
  email: string
  subject: string
  message: string
  status: 'abierto' | 'en revisión' | 'resuelto'
  priority: 'alta' | 'media' | 'baja'
  created_at: string
}

function StatusBadge({ status }: { status: string }) {
  let bg = C.amberL, color = C.amber
  if (status === 'en revisión') { bg = C.blueL; color = C.blue }
  if (status === 'resuelto') { bg = C.greenDim; color = C.green }
  const labels: Record<string, string> = { 'abierto': 'Abierto', 'en revisión': 'En revisión', 'resuelto': 'Resuelto' }
  return <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99 }}>{labels[status] || status}</span>
}

function PriorityBadge({ priority }: { priority: string }) {
  let bg = C.greenDim, color = C.green
  if (priority === 'alta') { bg = C.redL; color = C.red }
  if (priority === 'media') { bg = C.amberL; color = C.amber }
  const labels: Record<string, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' }
  return <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99 }}>{labels[priority] || priority}</span>
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

export default function SoporteClient({ mensajes: initial }: { mensajes: Mensaje[] }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>(initial)
  const [filter, setFilter] = useState<'todos' | 'abierto' | 'en revisión' | 'resuelto'>('todos')
  const [selected, setSelected] = useState<Mensaje | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const filtered = filter === 'todos' ? mensajes : mensajes.filter(m => m.status === filter)

  async function updateStatus(id: string, newStatus: 'en revisión' | 'resuelto') {
    setLoading(id)
    try {
      const res = await fetch('/api/admin/soporte', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (res.ok) {
        setMensajes(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m))
        setSelected(prev => prev && prev.id === id ? { ...prev, status: newStatus } : prev)
      }
    } finally {
      setLoading(null)
    }
  }

  const tabs: Array<'todos' | 'abierto' | 'en revisión' | 'resuelto'> = ['todos', 'abierto', 'en revisión', 'resuelto']
  const tabLabels: Record<string, string> = { todos: 'Todos', abierto: 'Abierto', 'en revisión': 'En revisión', resuelto: 'Resuelto' }

  return (
    <div className="fade-up page-pad" style={{ overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: C.text }}>Soporte</h1>
        <p style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>{mensajes.length} ticket{mensajes.length !== 1 ? 's' : ''} en total</p>
      </div>

      <div style={{ display: 'flex', gap: 4, background: C.card, borderRadius: 12, padding: 6, border: `1px solid ${C.border}`, width: 'fit-content' }}>
        {tabs.map(t => (
          <FilterTab key={t} label={tabLabels[t]} active={filter === t} onClick={() => setFilter(t)} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 14, padding: 48, border: `1px solid ${C.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
          <div style={{ fontSize: 15, color: C.muted }}>No hay tickets en esta categoría</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(m => {
            const dt = new Date(m.created_at)
            const dateStr = dt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
            return (
              <div key={m.id} style={{
                background: C.card, borderRadius: 14, padding: 20,
                border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'flex-start', gap: 16,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <PriorityBadge priority={m.priority} />
                    <StatusBadge status={m.status} />
                    <span style={{ fontSize: 12, color: C.dim }}>{dateStr}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>{m.subject}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>{m.nombre} · {m.email}</div>
                  <div style={{ fontSize: 13, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 600 }}>
                    {m.message}
                  </div>
                </div>
                <button onClick={() => { setSelected(m); setReplyText('') }} style={{
                  background: C.greenDim, color: C.green, border: 'none',
                  padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: 'inherit', flexShrink: 0,
                }}>Ver mensaje</button>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} onClick={() => setSelected(null)} />
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: 440, maxWidth: '100vw',
            background: C.card, zIndex: 301, display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{selected.subject}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <PriorityBadge priority={selected.priority} />
                    <StatusBadge status={selected.status} />
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, fontSize: 22, lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>{selected.nombre} · {selected.email}</div>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>
                {new Date(selected.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mensaje</div>
                <div style={{
                  background: C.cardAlt, borderRadius: 12, padding: 16,
                  border: `1px solid ${C.border}`,
                  fontSize: 14, color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                }}>{selected.message}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Respuesta (solo UI)</div>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Escribe una respuesta..."
                  rows={4}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10,
                    border: `1px solid ${C.border}`, fontSize: 13, color: C.text,
                    background: C.cardAlt, outline: 'none', fontFamily: 'inherit',
                    resize: 'vertical', lineHeight: 1.5,
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {selected.status !== 'en revisión' && selected.status !== 'resuelto' && (
                  <button
                    onClick={() => updateStatus(selected.id, 'en revisión')}
                    disabled={loading === selected.id}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 10,
                      background: C.blueL, color: C.blue, border: 'none',
                      cursor: loading === selected.id ? 'not-allowed' : 'pointer',
                      fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                      opacity: loading === selected.id ? 0.6 : 1,
                    }}
                  >En revisión</button>
                )}
                {selected.status !== 'resuelto' && (
                  <button
                    onClick={() => updateStatus(selected.id, 'resuelto')}
                    disabled={loading === selected.id}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 10,
                      background: C.greenDim, color: C.green, border: 'none',
                      cursor: loading === selected.id ? 'not-allowed' : 'pointer',
                      fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                      opacity: loading === selected.id ? 0.6 : 1,
                    }}
                  >Marcar resuelto</button>
                )}
                {selected.status === 'resuelto' && (
                  <div style={{ fontSize: 13, color: C.green, fontWeight: 600, padding: '10px' }}>✓ Ticket resuelto</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
