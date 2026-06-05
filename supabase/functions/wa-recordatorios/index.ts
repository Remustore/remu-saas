import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WA_TOKEN    = Deno.env.get('WA_TOKEN') || ''
const WA_PHONE_ID = Deno.env.get('WA_PHONE_ID') || ''
const SB_URL      = Deno.env.get('SUPABASE_URL') || ''
const SB_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

function manana(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function formatearTel(tel: string): string {
  const n = tel.replace(/\D/g, '')
  if(n.startsWith('549')) return n
  if(n.startsWith('54'))  return '549' + n.slice(2)
  if(n.startsWith('0'))   return '549' + n.slice(1)
  return '549' + n
}

async function enviarRecordatorio(
  tel: string, nombre: string, hora: string, negocio: string
): Promise<boolean> {
  const phone = formatearTel(tel)
  if(phone.length < 10) return false
  const horaFmt = hora.substring(0, 5)
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: 'recordatorio_turno',
            language: { code: 'es_AR' },
            components: [{
              type: 'body',
              parameters: [
                { type: 'text', text: nombre  },
                { type: 'text', text: horaFmt },
                { type: 'text', text: negocio }
              ]
            }]
          }
        })
      }
    )
    if(!res.ok){
      const err = await res.json().catch(()=>({}))
      console.warn('[wa-recordatorio] error para', phone, JSON.stringify(err))
    }
    return res.ok
  } catch(e){
    console.warn('[wa-recordatorio] fetch error:', e)
    return false
  }
}

Deno.serve(async () => {
  if(!WA_TOKEN || !WA_PHONE_ID || !SB_URL || !SB_KEY){
    return new Response(JSON.stringify({ ok:false, error:'Faltan secrets' }), { status:500 })
  }

  const sb = createClient(SB_URL, SB_KEY)
  const fecha = manana()

  // Turnos confirmados para mañana con teléfono
  const { data: turnos, error: tErr } = await sb
    .from('turnos_solicitudes')
    .select('nombre, tel, hora, tenant_id')
    .eq('fecha', fecha)
    .eq('estado', 'confirmado')
    .not('tel', 'is', null)
    .neq('tel', '')

  if(tErr){
    return new Response(JSON.stringify({ ok:false, error: tErr.message }), { status:500 })
  }

  if(!turnos?.length){
    return new Response(JSON.stringify({ ok:true, fecha, enviados:0, mensaje:'Sin turnos mañana' }))
  }

  // Nombres de los negocios
  const tenantIds = [...new Set(turnos.map(t => t.tenant_id))]
  const { data: tenants } = await sb
    .from('tenants')
    .select('id, nombre')
    .in('id', tenantIds)

  const negMap: Record<string, string> = {}
  for(const t of tenants || []) negMap[t.id] = t.nombre

  let enviados = 0
  let fallidos = 0

  for(const t of turnos){
    const ok = await enviarRecordatorio(
      t.tel,
      t.nombre || 'Cliente',
      t.hora,
      negMap[t.tenant_id] || 'el salón'
    )
    if(ok){ enviados++ } else { fallidos++ }
  }

  console.log(`[wa-recordatorios] ${fecha} — enviados: ${enviados}, fallidos: ${fallidos}`)

  return new Response(
    JSON.stringify({ ok:true, fecha, total: turnos.length, enviados, fallidos }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
