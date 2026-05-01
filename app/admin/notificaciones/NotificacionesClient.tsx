'use client'

import { useState } from 'react'
import type { Notificacion } from './page'

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
  purple: '#7C3AED',
  purpleL: 'rgba(124,58,237,0.1)',
}

const TIPO_META: Record<string, { icon: string; bg: string; color: string; label: string }> = {
  registro: { icon: '🏪', bg: C.greenDim, color: C.green, label: 'Registro' },
  alerta: { icon: '⚠️', bg: C.amberL, color: C.amber, label: 'Alerta' },
  inactivo: { icon: '😴', bg: C.blueL, color: C.blue, label: 'Inactivo' },
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

export default function NotificacionesClient({ notificaciones }: { notificaciones: Notificacion[] }) {
  const [filter, setFilter] = useState<'todas' | 'alerta' | 'registro' | 'inactivo'>('todas')
  const [read, setRead] = useState<string[]>([])

  const filtered = filter === 'todas' ? notificaciones : notificaciones.filter(n => n.tipo === filter)
  const unreadCount = notificaciones.filter(n => !read.includes(n.id)).length

  function markRead(id: string) {
    setRead(prev => prev.includes(id) ? prev : [...prev, id])
  }

  function markAllRead() {
    setRead(notificaciones.map(n => n.id))
  }

  const tabs: Array<'todas' | 'alerta' | 'registro' | 'inactivo'> = ['todas', 'alerta', 'registro', 'inactivo']
  const tabLabels: Record<string, string> = { todas: 'Todas', alerta: 'Alertas', registro: 'Registros', inactivo: 'Inactivos' }

  return (
    <div className="fade-up page-pad" style={{ overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: C.text }}>Notificaciones</h1>
          <p style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>
            {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{
            background: C.greenDim, color: C.green, border: 'none',
            padding: '8px 18px', borderRadius: 10, cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
          }}>
            Marcar todas leídas
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, background: C.card, borderRadius: 12, padding: 6, border: `1px solid ${C.border}`, width: 'fit-content' }}>
        {tabs.map(t => (
          <FilterTab key={t} label={tabLabels[t]} active={filter === t} onClick={() => setFilter(t)} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 14, padding: 48, border: `1px solid ${C.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
          <div style={{ fontSize: 15, color: C.muted }}>No hay notificaciones en esta categoría</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(n => {
            const isRead = read.includes(n.id)
            const meta = TIPO_META[n.tipo] || TIPO_META.registro
            const dt = new Date(n.created_at)
            const timeStr = dt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) + ' ' + dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
            return (
              <div key={n.id} style={{
                background: isRead ? C.card : C.cardAlt,
                borderRadius: 14, padding: 18,
                border: `1px solid ${isRead ? C.border : 'rgba(29,158,117,0.25)'}`,
                display: 'flex', alignItems: 'flex-start', gap: 14,
                transition: 'all 0.15s',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, background: meta.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>{meta.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {!isRead && (
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{n.titulo}</span>
                    <span style={{ background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>{meta.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>{n.descripcion}</div>
                  <div style={{ fontSize: 11, color: C.dim }}>{timeStr}</div>
                </div>
                {!isRead && (
                  <button onClick={() => markRead(n.id)} style={{
                    background: C.greenDim, color: C.green, border: 'none',
                    padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, fontFamily: 'inherit', flexShrink: 0,
                  }}>Marcar leída</button>
                )}
                {isRead && (
                  <span style={{ fontSize: 11, color: C.dim, flexShrink: 0, paddingTop: 2 }}>Leída</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
