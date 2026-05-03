import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { calcularNivel } from '@/lib/types'

function err(msg: string, status = 400) {
  return NextResponse.json({ type: 'error', message: msg }, { status })
}

export async function POST(req: NextRequest) {
  const { token, nombre, telefono, programa_id } = await req.json()
  if (!token || !nombre?.trim() || !telefono?.trim()) return err('Faltan datos')

  const admin = createAdminClient()
  const nom = nombre.trim()
  const tel = telefono.trim()

  // 1. Validate token
  const { data: qr } = await admin
    .from('qr_tokens')
    .select('negocio_id, expires_at, used')
    .eq('token', token)
    .single()

  if (!qr) return err('QR inválido')
  if (qr.used) return err('QR ya utilizado')
  if (new Date(qr.expires_at) < new Date()) return err('QR expirado')

  // 2. Claim token atomically
  const { data: claimed } = await admin
    .from('qr_tokens')
    .update({ used: true })
    .eq('token', token)
    .eq('used', false)
    .select('id')

  if (!claimed || claimed.length === 0) return err('QR ya utilizado')

  // 3. Load negocio
  const { data: negocio } = await admin
    .from('negocios')
    .select('id, puntos_por_visita, puntos_para_recompensa, recompensa, plan')
    .eq('id', qr.negocio_id)
    .single()

  if (!negocio) return err('Negocio no encontrado', 404)

  // 4. Resolve program settings (from chosen program or negocio defaults)
  let puntosPorVisita = negocio.puntos_por_visita
  let puntosParaRecompensa = negocio.puntos_para_recompensa
  let recompensa = negocio.recompensa

  if (programa_id) {
    const { data: prog } = await admin
      .from('programas')
      .select('puntos_por_visita, puntos_para_recompensa, recompensa')
      .eq('id', programa_id)
      .eq('negocio_id', negocio.id)
      .single()
    if (prog) {
      puntosPorVisita = prog.puntos_por_visita
      puntosParaRecompensa = prog.puntos_para_recompensa
      recompensa = prog.recompensa
    }
  }

  // 5. Look up existing client by phone
  const { data: rows } = await admin
    .from('clientes')
    .select('id, puntos, visitas')
    .eq('negocio_id', negocio.id)
    .eq('telefono', tel)
    .order('created_at', { ascending: true })
    .limit(1)

  const cliente = rows?.[0] ?? null

  if (cliente) {
    // 6. Existing client — check 24h cooldown
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await admin
      .from('visitas')
      .select('id')
      .eq('cliente_id', cliente.id)
      .gte('created_at', since)
      .limit(1)

    if (recent && recent.length > 0) {
      // Already visited today → create pending approval request
      const { data: pendiente, error } = await admin
        .from('puntos_pendientes')
        .insert({
          negocio_id: negocio.id,
          cliente_id: cliente.id,
          nombre: nom,
          telefono: tel,
          puntos_solicitados: puntosPorVisita,
        })
        .select('id')
        .single()

      if (error || !pendiente) return err('Error al crear solicitud')
      return NextResponse.json({ type: 'pending', pendienteId: pendiente.id })
    }

    // No cooldown — award points
    const nuevos = cliente.puntos + puntosPorVisita
    await admin.from('clientes').update({
      puntos: nuevos,
      visitas: cliente.visitas + 1,
      nivel: calcularNivel(nuevos),
      ultima_visita: new Date().toISOString(),
    }).eq('id', cliente.id)

    await admin.from('visitas').insert({
      negocio_id: negocio.id,
      cliente_id: cliente.id,
      puntos_ganados: puntosPorVisita,
    })

    return await resolveReward(admin, cliente.id, negocio.id, nuevos, puntosParaRecompensa, recompensa, nom)
  }

  // 7. New client — enforce free-plan 50-client limit
  const plan = ((negocio as any).plan as string | null)?.toLowerCase().trim() || 'gratis'
  if (plan === 'gratis') {
    const { count } = await admin
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('negocio_id', negocio.id)
    if ((count ?? 0) >= 50) return NextResponse.json({ type: 'limit' }, { status: 403 })
  }

  const { data: nuevo, error: insertError } = await admin
    .from('clientes')
    .insert({
      negocio_id: negocio.id,
      nombre: nom,
      telefono: tel,
      puntos: puntosPorVisita,
      visitas: 1,
      nivel: calcularNivel(puntosPorVisita),
      ultima_visita: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !nuevo) return err('Error al registrar cliente')

  await admin.from('visitas').insert({
    negocio_id: negocio.id,
    cliente_id: nuevo.id,
    puntos_ganados: puntosPorVisita,
  })

  return await resolveReward(admin, nuevo.id, negocio.id, puntosPorVisita, puntosParaRecompensa, recompensa, nom)
}

async function resolveReward(
  admin: ReturnType<typeof createAdminClient>,
  clienteId: string,
  negocioId: string,
  puntos: number,
  puntosParaRecompensa: number,
  recompensa: string,
  nombre: string,
) {
  if (puntos >= puntosParaRecompensa) {
    const { data: existing } = await admin
      .from('cupones')
      .select('id')
      .eq('cliente_id', clienteId)
      .eq('canjeado', false)
      .limit(1)

    if (!existing || existing.length === 0) {
      const codigo = 'TPC-' + Math.random().toString(36).slice(2, 8).toUpperCase()
      await admin.from('cupones').insert({ negocio_id: negocioId, cliente_id: clienteId, codigo, recompensa, canjeado: false })
      await admin.from('clientes').update({ puntos: 0, nivel: calcularNivel(0) }).eq('id', clienteId)
      return NextResponse.json({ type: 'done', puntos: 0, nuevoCupon: true, recompensa, nivel: calcularNivel(0), nombre })
    }
  }

  return NextResponse.json({ type: 'done', puntos, nuevoCupon: false, recompensa, nivel: calcularNivel(puntos), nombre })
}
