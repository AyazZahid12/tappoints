export type Nivel = 'nuevo' | 'bronce' | 'plata' | 'oro'

export interface Negocio {
  id: string
  user_id: string
  nombre: string
  slug: string
  puntos_por_visita: number
  puntos_para_recompensa: number
  recompensa: string
  created_at: string
}

export interface Cliente {
  id: string
  negocio_id: string
  nombre: string
  telefono: string
  puntos: number
  visitas: number
  nivel: Nivel
  ultima_visita: string | null
  created_at: string
}

export interface Visita {
  id: string
  negocio_id: string
  cliente_id: string
  puntos_ganados: number
  created_at: string
}

export interface Cupon {
  id: string
  negocio_id: string
  cliente_id: string
  codigo: string
  recompensa: string
  canjeado: boolean
  canjeado_at: string | null
  created_at: string
  clientes?: { nombre: string }
}

export function calcularNivel(puntos: number): Nivel {
  if (puntos >= 40) return 'oro'
  if (puntos >= 20) return 'plata'
  if (puntos >= 10) return 'bronce'
  return 'nuevo'
}
