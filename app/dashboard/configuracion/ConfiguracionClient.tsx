'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Icon from '@/components/Icon'

const ACCENT = '#1D9E75'

interface NegocioConfig {
  id: string
  nombre: string
  descripcion: string | null
  slug: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '1.5px solid #0A1A1415', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', color: '#0A1A14', background: '#FAFAFA',
  boxSizing: 'border-box',
}

export default function ConfiguracionClient({ negocio }: { negocio: NegocioConfig }) {
  const [nombre, setNombre] = useState(negocio.nombre)
  const [descripcion, setDescripcion] = useState(negocio.descripcion || '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!nombre.trim()) { setError('El nombre del negocio no puede estar vacío.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('negocios').update({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
    }).eq('id', negocio.id)

    setLoading(false)
    if (err) { setError(`Error al guardar: ${err.message}`); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="fade-up page-pad" style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em' }}>Configuración del negocio</h1>
        <p style={{ color: '#0A1A1460', fontSize: 14, marginTop: 4 }}>Gestiona la información básica de tu negocio</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560, width: '100%' }}>
        {/* Business name */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: ACCENT + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="coin" size={19} color={ACCENT} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1A14' }}>Nombre del negocio</div>
              <div style={{ fontSize: 12, color: '#0A1A1455', marginTop: 1 }}>Aparece en la pantalla del cliente al escanear</div>
            </div>
          </div>
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            style={inputStyle}
            placeholder="Nombre de tu negocio"
            maxLength={80}
          />
        </div>

        {/* Description */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: ACCENT + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="program" size={19} color={ACCENT} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1A14' }}>Descripción</div>
              <div style={{ fontSize: 12, color: '#0A1A1455', marginTop: 1 }}>Una línea sobre tu negocio (opcional)</div>
            </div>
          </div>
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            placeholder="Ej: Cafetería especializada en café de origen · Abierto de 8h a 20h"
            maxLength={200}
          />
          <div style={{ fontSize: 11, color: '#0A1A1438', textAlign: 'right', marginTop: 4 }}>{descripcion.length}/200</div>
        </div>

        {/* Slug (read-only info) */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#0A1A1408', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="qr" size={19} color="#0A1A1455" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1A14' }}>Identificador (slug)</div>
              <div style={{ fontSize: 12, color: '#0A1A1455', marginTop: 1 }}>No se puede cambiar — forma parte de tu URL pública</div>
            </div>
          </div>
          <div style={{ ...inputStyle, background: '#F5F5F5', color: '#0A1A1460', userSelect: 'all', cursor: 'default', display: 'block' }}>
            {negocio.slug}
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#991B1B' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '13px 24px', borderRadius: 12, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: saved ? ACCENT + '30' : ACCENT,
            color: saved ? ACCENT : 'white',
            fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
            transition: 'all 0.2s', opacity: loading ? 0.7 : 1,
          }}
        >
          {saved
            ? <><Icon name="check" size={16} color={ACCENT} /> Guardado</>
            : <><Icon name="save" size={16} color="white" /> Guardar cambios</>
          }
        </button>
      </div>
    </div>
  )
}
