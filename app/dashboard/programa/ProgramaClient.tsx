'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

const ACCENT = '#1D9E75'

interface Programa {
  id: string
  nombre: string
  puntos_por_visita: number
  puntos_para_recompensa: number
  recompensa: string
}

interface FormState {
  nombre: string
  puntos_por_visita: number
  puntos_para_recompensa: number
  recompensa: string
}

interface Props {
  programas: Programa[]
  negocioId: string
  plan: string
}

const defaultForm = (): FormState => ({
  nombre: '', puntos_por_visita: 1, puntos_para_recompensa: 10, recompensa: '',
})

export default function ProgramaClient({ programas: initial, negocioId, plan }: Props) {
  const [programas, setProgramas] = useState<Programa[]>(initial)
  const [editId, setEditId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  const isPro = plan === 'pro' || plan === 'business'
  const maxPrograms = isPro ? 3 : 1
  const canAdd = programas.length < maxPrograms
  const showUpsell = !canAdd && !isPro

  function startEdit(p: Programa) {
    setEditId(p.id)
    setForm({ nombre: p.nombre, puntos_por_visita: p.puntos_por_visita, puntos_para_recompensa: p.puntos_para_recompensa, recompensa: p.recompensa })
    setCreating(false)
  }

  function cancelEdit() {
    setEditId(null)
    setCreating(false)
    setForm(defaultForm())
  }

  async function saveEdit() {
    if (!editId) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('programas').update({
      nombre: form.nombre,
      puntos_por_visita: form.puntos_por_visita,
      puntos_para_recompensa: form.puntos_para_recompensa,
      recompensa: form.recompensa,
    }).eq('id', editId)

    // Keep negocios columns in sync for the primary program (used by scan flow)
    if (programas[0]?.id === editId) {
      await supabase.from('negocios').update({
        puntos_por_visita: form.puntos_por_visita,
        puntos_para_recompensa: form.puntos_para_recompensa,
        recompensa: form.recompensa,
      }).eq('id', negocioId)
    }

    setProgramas(prev => prev.map(p => p.id === editId ? { ...p, ...form } : p))
    setEditId(null)
    setSaving(false)
    setSavedId(editId)
    setTimeout(() => setSavedId(null), 2500)
  }

  async function saveCreate() {
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('programas')
      .insert({
        negocio_id: negocioId,
        nombre: form.nombre,
        puntos_por_visita: form.puntos_por_visita,
        puntos_para_recompensa: form.puntos_para_recompensa,
        recompensa: form.recompensa,
      })
      .select('id, nombre, puntos_por_visita, puntos_para_recompensa, recompensa')
      .single()
    if (data) setProgramas(prev => [...prev, data])
    setCreating(false)
    setForm(defaultForm())
    setSaving(false)
  }

  async function deletePrograma(id: string) {
    if (!window.confirm('¿Eliminar este programa? Esta acción no se puede deshacer.')) return
    const supabase = createClient()
    await supabase.from('programas').delete().eq('id', id)
    setProgramas(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="fade-up page-pad" style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em' }}>Programas de fidelización</h1>
        <p style={{ color: '#0A1A1460', fontSize: 14, marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {programas.length}/{maxPrograms} programa{maxPrograms > 1 ? 's' : ''} activo{programas.length !== 1 ? 's' : ''}
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99,
            background: isPro ? 'rgba(30,126,196,0.12)' : ACCENT + '15',
            color: isPro ? '#1E7EC4' : ACCENT,
          }}>
            Plan {isPro ? 'Pro' : 'Gratis'}
          </span>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
        {programas.map((p, idx) =>
          editId === p.id ? (
            <ProgramForm
              key={p.id}
              form={form}
              setForm={setForm}
              onSave={saveEdit}
              onCancel={cancelEdit}
              saving={saving}
              title={`Editando: ${p.nombre}`}
            />
          ) : (
            <ProgramCard
              key={p.id}
              programa={p}
              isFirst={idx === 0}
              canDelete={programas.length > 1}
              saved={savedId === p.id}
              onEdit={() => startEdit(p)}
              onDelete={() => deletePrograma(p.id)}
            />
          )
        )}

        {creating && (
          <ProgramForm
            form={form}
            setForm={setForm}
            onSave={saveCreate}
            onCancel={cancelEdit}
            saving={saving}
            title="Nuevo programa"
          />
        )}

        {!creating && !editId && (
          showUpsell ? (
            <div style={{
              borderRadius: 16, padding: '20px 24px',
              border: '2px dashed rgba(29,158,117,0.25)',
              background: ACCENT + '06',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 16, flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 32 }}>⭐</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1A14', marginBottom: 3 }}>
                    Función exclusiva del Plan Pro
                  </div>
                  <div style={{ fontSize: 13, color: '#0A1A1460' }}>
                    Crea hasta 3 programas de fidelización simultáneos
                  </div>
                </div>
              </div>
              <a href="/planes" style={{
                background: ACCENT, color: 'white', fontWeight: 700,
                fontSize: 13, padding: '10px 20px', borderRadius: 10,
                textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                Ver planes
              </a>
            </div>
          ) : (
            <button
              onClick={() => { setCreating(true); setForm(defaultForm()) }}
              style={{
                width: '100%', padding: 16, borderRadius: 16,
                border: '2px dashed rgba(10,26,20,0.12)',
                background: 'transparent', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, color: '#0A1A1460',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>+</span> Añadir programa
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ─── Program card (display mode) ───────────────────────────────────────────────

function ProgramCard({ programa, isFirst, canDelete, saved, onEdit, onDelete }: {
  programa: Programa; isFirst: boolean; canDelete: boolean; saved: boolean
  onEdit: () => void; onDelete: () => void
}) {
  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: 24,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: `1.5px solid ${isFirst ? ACCENT + '35' : 'rgba(10,26,20,0.06)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0A1A14' }}>{programa.nombre}</span>
            {isFirst && (
              <span style={{ fontSize: 10, fontWeight: 600, background: ACCENT + '15', color: ACCENT, padding: '2px 8px', borderRadius: 99 }}>
                Principal
              </span>
            )}
          </div>
          {saved && <div style={{ fontSize: 12, color: ACCENT, marginTop: 3 }}>✓ Cambios guardados</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onEdit} style={{
            padding: '6px 14px', borderRadius: 8,
            border: `1.5px solid ${ACCENT}30`, background: ACCENT + '10',
            color: ACCENT, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Editar
          </button>
          {canDelete && (
            <button onClick={onDelete} style={{
              padding: '6px 10px', borderRadius: 8,
              border: '1.5px solid rgba(229,57,53,0.2)',
              background: 'rgba(229,57,53,0.07)',
              color: '#E53935', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}>✕</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ background: ACCENT + '10', borderRadius: 10, padding: '10px 16px', flex: 1, minWidth: 110 }}>
          <div style={{ fontSize: 11, color: '#0A1A1460', marginBottom: 2 }}>Puntos / visita</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: ACCENT, letterSpacing: '-0.03em' }}>{programa.puntos_por_visita}</div>
        </div>
        <div style={{ background: ACCENT + '10', borderRadius: 10, padding: '10px 16px', flex: 1, minWidth: 110 }}>
          <div style={{ fontSize: 11, color: '#0A1A1460', marginBottom: 2 }}>Puntos recompensa</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: ACCENT, letterSpacing: '-0.03em' }}>{programa.puntos_para_recompensa}</div>
        </div>
        <div style={{ background: '#F8FFFE', borderRadius: 10, padding: '10px 16px', flex: 2, minWidth: 160, border: `1px solid ${ACCENT}15` }}>
          <div style={{ fontSize: 11, color: '#0A1A1460', marginBottom: 2 }}>Recompensa</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1A14' }}>🎁 {programa.recompensa}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Program form (edit / create mode) ────────────────────────────────────────

function ProgramForm({ form, setForm, onSave, onCancel, saving, title }: {
  form: FormState; setForm: (f: FormState) => void
  onSave: () => void; onCancel: () => void; saving: boolean; title: string
}) {
  const canSave = form.nombre.trim().length > 0 && form.recompensa.trim().length > 0

  const stepper: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 8, border: '1.5px solid #0A1A1415',
    background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#0A1A14',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
  }
  const input: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1.5px solid #0A1A1415', fontSize: 14, fontFamily: 'inherit',
    outline: 'none', color: '#0A1A14', background: '#FAFAFA',
  }

  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: 24,
      boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
      border: `1.5px solid ${ACCENT}40`,
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1A14', marginBottom: 20 }}>{title}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: '#0A1A1460', display: 'block', marginBottom: 6 }}>
            Nombre del programa <span style={{ color: '#E53935' }}>*</span>
          </label>
          <input
            value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Café, Menús, Tarjeta VIP…"
            style={input}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#0A1A1460', display: 'block', marginBottom: 8 }}>Puntos por visita</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" onClick={() => setForm({ ...form, puntos_por_visita: Math.max(1, form.puntos_por_visita - 1) })} style={stepper}>−</button>
              <div style={{ fontSize: 28, fontWeight: 700, color: ACCENT, minWidth: 32, textAlign: 'center' }}>{form.puntos_por_visita}</div>
              <button type="button" onClick={() => setForm({ ...form, puntos_por_visita: form.puntos_por_visita + 1 })} style={stepper}>+</button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#0A1A1460', display: 'block', marginBottom: 8 }}>Puntos para recompensa</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" onClick={() => setForm({ ...form, puntos_para_recompensa: Math.max(1, form.puntos_para_recompensa - 1) })} style={stepper}>−</button>
              <div style={{ fontSize: 28, fontWeight: 700, color: ACCENT, minWidth: 32, textAlign: 'center' }}>{form.puntos_para_recompensa}</div>
              <button type="button" onClick={() => setForm({ ...form, puntos_para_recompensa: form.puntos_para_recompensa + 1 })} style={stepper}>+</button>
            </div>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: '#0A1A1460', display: 'block', marginBottom: 6 }}>
            Descripción de la recompensa <span style={{ color: '#E53935' }}>*</span>
          </label>
          <input
            value={form.recompensa}
            onChange={e => setForm({ ...form, recompensa: e.target.value })}
            placeholder="Ej: Café gratis, 10% descuento…"
            style={input}
          />
        </div>

        <div style={{ background: ACCENT + '10', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#0A1A14' }}>
          Cada visita = <strong style={{ color: ACCENT }}>{form.puntos_por_visita} pts</strong>
          {' · '}Con <strong style={{ color: ACCENT }}>{form.puntos_para_recompensa} pts</strong>: <strong style={{ color: ACCENT }}>{form.recompensa || '—'}</strong>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onSave}
            disabled={saving || !canSave}
            style={{
              flex: 1, padding: '11px', borderRadius: 10, border: 'none',
              background: ACCENT, color: 'white', fontSize: 14, fontWeight: 600,
              cursor: (saving || !canSave) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: (saving || !canSave) ? 0.55 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {saving ? 'Guardando...' : 'Guardar programa'}
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '11px 20px', borderRadius: 10,
              border: '1.5px solid #0A1A1415', background: 'transparent',
              color: '#0A1A1460', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
