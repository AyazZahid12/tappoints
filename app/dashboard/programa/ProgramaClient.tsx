'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Icon from '@/components/Icon'

const ACCENT = '#1D9E75'

interface NegocioPrograma {
  id: string
  puntos_por_visita: number
  puntos_para_recompensa: number
  recompensa: string
}

export default function ProgramaClient({ negocio }: { negocio: NegocioPrograma }) {
  const [pts, setPts] = useState(negocio.puntos_por_visita)
  const [forReward, setForReward] = useState(negocio.puntos_para_recompensa)
  const [reward, setReward] = useState(negocio.recompensa)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('negocios').update({
      puntos_por_visita: pts,
      puntos_para_recompensa: forReward,
      recompensa: reward,
    }).eq('id', negocio.id)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    width: 36, height: 36, borderRadius: 10, border: '1.5px solid #0A1A1415',
    background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#0A1A14',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit'
  })

  return (
    <div className="fade-up page-pad" style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em' }}>Programa de puntos</h1>
        <p style={{ color: '#0A1A1460', fontSize: 14, marginTop: 4 }}>Configura las reglas de fidelización</p>
      </div>

      <div className="programa-grid" style={{ display: 'grid', gap: 20, maxWidth: 720 }}>
        {/* Points per visit */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: ACCENT + '15',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
          }}>
            <Icon name="coin" size={20} color={ACCENT} />
          </div>
          <div style={{ fontSize: 13, color: '#0A1A1460', marginBottom: 6 }}>Puntos por visita</div>
          <div style={{ fontSize: 12, color: '#0A1A1440', marginBottom: 14 }}>Cuántos puntos gana el cliente por cada visita registrada</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setPts(Math.max(1, pts - 1))} style={btnStyle(true)}>−</button>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.04em', color: ACCENT, minWidth: 40, textAlign: 'center' }}>{pts}</div>
            <button onClick={() => setPts(pts + 1)} style={btnStyle(true)}>+</button>
          </div>
        </div>

        {/* Points for reward */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: ACCENT + '15',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
          }}>
            <Icon name="gift" size={20} color={ACCENT} />
          </div>
          <div style={{ fontSize: 13, color: '#0A1A1460', marginBottom: 6 }}>Puntos para recompensa</div>
          <div style={{ fontSize: 12, color: '#0A1A1440', marginBottom: 14 }}>Cuántos puntos necesita el cliente para obtener su recompensa</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setForReward(Math.max(1, forReward - 1))} style={btnStyle(true)}>−</button>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.04em', color: ACCENT, minWidth: 40, textAlign: 'center' }}>{forReward}</div>
            <button onClick={() => setForReward(forReward + 1)} style={btnStyle(true)}>+</button>
          </div>
        </div>

        {/* Reward description */}
        <div style={{ gridColumn: '1/-1', background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: ACCENT + '15',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
          }}>
            <Icon name="coupons" size={20} color={ACCENT} />
          </div>
          <div style={{ fontSize: 13, color: '#0A1A1460', marginBottom: 6 }}>Descripción de la recompensa</div>
          <div style={{ fontSize: 12, color: '#0A1A1440', marginBottom: 14 }}>Qué recibe el cliente al canjear sus puntos</div>
          <input
            value={reward}
            onChange={e => setReward(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10,
              border: '1.5px solid #0A1A1415', fontSize: 14, fontFamily: 'inherit',
              outline: 'none', color: '#0A1A14', background: '#FAFAFA'
            }}
            placeholder="Ej: Café gratis, 10% descuento…"
          />
        </div>
      </div>

      {/* Preview */}
      <div style={{ marginTop: 4, maxWidth: 720 }}>
        <div style={{ background: ACCENT + '12', border: `1.5px dashed ${ACCENT}40`, borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="trend" size={22} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#0A1A1460', marginBottom: 2 }}>Vista previa del programa</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0A1A14' }}>
              Cada visita = <span style={{ color: ACCENT }}>{pts} punto{pts > 1 ? 's' : ''}</span> · Con <span style={{ color: ACCENT }}>{forReward} puntos</span> obtienes: <span style={{ color: ACCENT }}>{reward || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        style={{
          marginTop: 20, display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 24px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          background: saved ? ACCENT + '30' : ACCENT, color: saved ? ACCENT : 'white',
          fontSize: 14, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.2s',
          opacity: loading ? 0.7 : 1
        }}
      >
        {saved
          ? <><Icon name="check" size={16} color={ACCENT} /> Guardado</>
          : <><Icon name="save" size={16} color="white" /> Guardar cambios</>
        }
      </button>
    </div>
  )
}
