// ═══ REPARTO — PEDIDOS DE ENTREGA ═══
let _repFiltro = 'todos';
let _repAddItems = [];

// ── Render principal ──────────────────────────────────────────────────────────
function rPedidosReparto(){
  const sec = document.getElementById('sec-pedidosReparto');
  if(!sec) return;
  const hoy = tod();
  let lista = (S.pedidosReparto||[]);
  if(_repFiltro === 'hoy') lista = lista.filter(p => p.fecha === hoy);
  else if(_repFiltro !== 'todos') lista = lista.filter(p => p.estado === _repFiltro);
  lista = [...lista].sort((a,b)=>{
    const ord = { pendiente:0, en_camino:1, entregado:2, cancelado:3 };
    if((ord[a.estado]||0) !== (ord[b.estado]||0)) return (ord[a.estado]||0) - (ord[b.estado]||0);
    return (b.id||0) - (a.id||0);
  });

  const hoyPeds      = (S.pedidosReparto||[]).filter(p => p.fecha === hoy);
  const cPendiente   = hoyPeds.filter(p => p.estado === 'pendiente').length;
  const cEnCamino    = hoyPeds.filter(p => p.estado === 'en_camino').length;
  const cEntregado   = hoyPeds.filter(p => p.estado === 'entregado').length;
  const totalHoy     = hoyPeds.filter(p => p.estado === 'entregado').reduce((s,p)=>s+(p.total||0),0);

  sec.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
      <h2 style="margin:0;font-size:1.1rem">Pedidos del día</h2>
      <button class="btn bg" onclick="openNuevoPedidoRep()">+ Nuevo pedido</button>
      <div style="margin-left:auto;display:flex;gap:5px;flex-wrap:wrap">
        ${[['todos','Todos'],['hoy','Hoy'],['pendiente','Pendientes'],['en_camino','En camino'],['entregado','Entregados']]
          .map(([f,l])=>`<button class="btn bsm ${_repFiltro===f?'bg2':''}" onclick="_repSetFiltro('${f}')">${l}</button>`).join('')}
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      <div style="background:var(--bg2);border-radius:8px;padding:8px 14px;font-size:.82rem">🕐 <b>${cPendiente}</b> pendiente${cPendiente!==1?'s':''}</div>
      <div style="background:var(--bg2);border-radius:8px;padding:8px 14px;font-size:.82rem">🚗 <b>${cEnCamino}</b> en camino</div>
      <div style="background:var(--bg2);border-radius:8px;padding:8px 14px;font-size:.82rem">✅ <b>${cEntregado}</b> entregado${cEntregado!==1?'s':''}</div>
      ${totalHoy>0?`<div style="background:var(--bg2);border-radius:8px;padding:8px 14px;font-size:.82rem;color:var(--ok)">💰 <b>${fmt(totalHoy)}</b> cobrado</div>`:''}
    </div>
    ${lista.length
      ? `<div style="display:flex;flex-direction:column;gap:8px">${lista.map(_repRow).join('')}</div>`
      : `<div style="color:var(--mut);text-align:center;padding:40px 0;font-size:.9rem">Sin pedidos${_repFiltro!=='todos'?' en este filtro':''}</div>`}
  `;
}

function _repSetFiltro(f){ _repFiltro = f; rPedidosReparto(); }

function _repRow(p){
  const estados = {
    pendiente: { label:'Pendiente', cls:'bbl', icon:'🕐' },
    en_camino: { label:'En camino', cls:'byw', icon:'🚗' },
    entregado: { label:'Entregado', cls:'bgr', icon:'✅' },
    cancelado:  { label:'Cancelado',  cls:'bgx', icon:'❌' }
  };
  const est  = estados[p.estado] || estados.pendiente;
  const tel  = (p.tel||'').replace(/\D/g,'');
  const mUrl = p.direccion ? `https://maps.google.com/?q=${encodeURIComponent(p.direccion)}` : '';
  const items = p.items||[];
  return `<div style="background:var(--bg2);border-radius:10px;padding:12px 14px;display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start">
    <div style="flex:1;min-width:180px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span class="bx ${est.cls}" style="font-size:.72rem">${est.icon} ${est.label}</span>
        ${p.hora_estimada?`<span style="font-size:.78rem;color:var(--mut)">⏰ ${esc(p.hora_estimada)}</span>`:''}
        <span style="font-size:.75rem;color:var(--mut);margin-left:auto">${p.fecha||''}</span>
      </div>
      <div style="font-weight:600;font-size:.93rem">${esc(p.cliente||'Sin nombre')}</div>
      ${p.direccion?`<div style="font-size:.8rem;color:var(--tx2);margin-top:2px">📍 ${esc(p.direccion)}</div>`:''}
      ${items.length?`<div style="font-size:.78rem;color:var(--mut);margin-top:3px">📦 ${items.map(i=>`${esc(i.nombre||'')} ×${i.cantidad}`).join(', ')} — <b>${fmt(p.total||0)}</b></div>`:''}
      ${p.notas?`<div style="font-size:.78rem;color:var(--mut);margin-top:2px;font-style:italic">📝 ${esc(p.notas)}</div>`:''}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:5px;align-self:center">
      ${mUrl?`<a href="${mUrl}" target="_blank" rel="noopener" class="btn bg2 bsm" style="text-decoration:none">📍 Maps</a>`:''}
      ${tel&&p.estado==='pendiente'?`<button class="btn byw bsm" onclick="cambiarEstadoRep(${p.id},'en_camino')">🚗 En camino</button>`:''}
      ${p.estado==='en_camino'?`<button class="btn bsm" style="background:var(--ok);color:#fff" onclick="cambiarEstadoRep(${p.id},'entregado')">✅ Entregado</button>`:''}
      ${tel?`<button class="btn bs bsm" title="WA: en camino" onclick="enviarWARep(${p.id},'camino')">🚗💬</button>`:''}
      ${tel?`<button class="btn bs bsm" title="WA: entregado" onclick="enviarWARep(${p.id},'entregado')">✅💬</button>`:''}
      <button class="btn be bsm" onclick="openNuevoPedidoRep(${p.id})">✎</button>
      <button class="btn bd bsm" onclick="deletePedidoReparto(${p.id})">✕</button>
    </div>
  </div>`;
}

// ── Modal nuevo/editar ────────────────────────────────────────────────────────
function openNuevoPedidoRep(id){
  const p = id ? (S.pedidosReparto||[]).find(x=>x.id===id) : null;
  document.getElementById('_repMTitle').textContent = p ? 'Editar pedido' : 'Nuevo pedido';
  document.getElementById('_repId').value    = id || '';
  document.getElementById('_repCli').value   = p?.cliente || '';
  document.getElementById('_repTel').value   = p?.tel || '';
  document.getElementById('_repDir').value   = p?.direccion || '';
  document.getElementById('_repHora').value  = p?.hora_estimada || '';
  document.getElementById('_repNotas').value = p?.notas || '';
  _repAddItems = p ? JSON.parse(JSON.stringify(p.items||[])) : [{ nombre:'', cantidad:1, precio:0 }];
  if(!_repAddItems.length) _repAddItems.push({ nombre:'', cantidad:1, precio:0 });
  _repRenderItems();
  _repCalcTotal();
  openM('mPedidoRep', id || null);
}

function _repRenderItems(){
  const cont = document.getElementById('_repItems');
  if(!cont) return;
  cont.innerHTML = _repAddItems.map((it, i) => `
    <div style="display:grid;grid-template-columns:1fr 60px 95px 28px;gap:5px;margin-bottom:5px;align-items:center">
      <input style="font-size:.82rem;padding:5px 7px;border:1px solid var(--bdr);border-radius:6px;background:var(--bg);color:var(--tx)"
        placeholder="Producto / descripción" value="${esc(it.nombre||'')}"
        oninput="_repAddItems[${i}].nombre=this.value">
      <input type="number" min="1" style="font-size:.82rem;padding:5px 7px;border:1px solid var(--bdr);border-radius:6px;background:var(--bg);color:var(--tx);text-align:center"
        placeholder="Cant." value="${it.cantidad||1}"
        oninput="_repAddItems[${i}].cantidad=parseFloat(this.value)||1;_repCalcTotal()">
      <input type="number" min="0" style="font-size:.82rem;padding:5px 7px;border:1px solid var(--bdr);border-radius:6px;background:var(--bg);color:var(--tx)"
        placeholder="$ Precio" value="${it.precio||''}"
        oninput="_repAddItems[${i}].precio=parseFloat(this.value)||0;_repCalcTotal()">
      <button class="btn bd bsm" onclick="_repQuitarItem(${i})"
        style="height:28px;width:28px;display:flex;align-items:center;justify-content:center;padding:0">✕</button>
    </div>
  `).join('');
}

function _repAgregarItem(){
  _repAddItems.push({ nombre:'', cantidad:1, precio:0 });
  _repRenderItems();
  _repCalcTotal();
}

function _repQuitarItem(i){
  _repAddItems.splice(i,1);
  if(!_repAddItems.length) _repAddItems.push({ nombre:'', cantidad:1, precio:0 });
  _repRenderItems();
  _repCalcTotal();
}

function _repCalcTotal(){
  const total = _repAddItems.reduce((s,it) => s + (parseFloat(it.cantidad)||0)*(parseFloat(it.precio)||0), 0);
  const el = document.getElementById('_repTotal');
  if(el) el.textContent = fmt(total);
}

async function guardarPedidoReparto(){
  const cliente = (document.getElementById('_repCli')?.value||'').trim();
  if(!cliente){ showToast('Ingresá el nombre del cliente','err'); return; }
  const dir = (document.getElementById('_repDir')?.value||'').trim();
  if(!dir){ showToast('Ingresá la dirección','err'); return; }

  const rawId = document.getElementById('_repId')?.value;
  const idNum  = rawId ? parseInt(rawId) : Date.now();
  const items  = _repAddItems.filter(it => (it.nombre||'').trim());
  const total  = items.reduce((s,it) => s+(parseFloat(it.cantidad)||0)*(parseFloat(it.precio)||0),0);
  const existing = rawId ? (S.pedidosReparto||[]).find(p=>p.id===idNum) : null;

  const obj = {
    id:             idNum,
    fecha:          existing?.fecha || tod(),
    cliente,
    tel:            (document.getElementById('_repTel')?.value||'').replace(/\D/g,''),
    direccion:      dir,
    hora_estimada:  (document.getElementById('_repHora')?.value||'').trim(),
    notas:          (document.getElementById('_repNotas')?.value||'').trim(),
    items,
    total,
    estado:         existing?.estado || 'pendiente'
  };

  if(!S.pedidosReparto) S.pedidosReparto = [];
  const idx = S.pedidosReparto.findIndex(p=>p.id===idNum);
  if(idx>-1) S.pedidosReparto[idx] = obj; else S.pedidosReparto.push(obj);

  await dbUpsert('pedidos_reparto', obj);
  closeM('mPedidoRep');
  rPedidosReparto();
  showToast(rawId ? 'Pedido actualizado ✓' : 'Pedido creado ✓');
}

// ── Acciones ──────────────────────────────────────────────────────────────────
async function cambiarEstadoRep(id, nuevoEstado){
  const p = (S.pedidosReparto||[]).find(x=>x.id===id);
  if(!p) return;
  p.estado = nuevoEstado;
  await dbUpsert('pedidos_reparto', p);
  rPedidosReparto();
  const msgs = { en_camino:'🚗 En camino', entregado:'✅ Entregado', cancelado:'Pedido cancelado' };
  showToast(msgs[nuevoEstado]||'Estado actualizado');
}

async function deletePedidoReparto(id){
  if(!confirm('¿Eliminar este pedido?')) return;
  S.pedidosReparto = (S.pedidosReparto||[]).filter(p=>p.id!==id);
  await dbDelete('pedidos_reparto', id);
  rPedidosReparto();
  showToast('Pedido eliminado ✓');
}

function enviarWARep(id, tipo){
  const p = (S.pedidosReparto||[]).find(x=>x.id===id);
  if(!p || !p.tel){ showToast('El pedido no tiene teléfono','err'); return; }
  const negocio = (typeof currentTenant!=='undefined'&&currentTenant) ? (currentTenant.nombre||'Nosotros') : 'Nosotros';
  const hola = `¡Hola${p.cliente?' '+p.cliente:''}!`;
  let msg;
  if(tipo === 'camino'){
    msg = `${hola} 🚗 Tu pedido está *en camino*.`;
    if(p.hora_estimada) msg += `\n⏰ Llegamos aproximadamente a las *${p.hora_estimada}*.`;
    msg += `\n\nCualquier consulta escribinos 📩 — *${negocio}*`;
  } else {
    msg = `${hola} ✅ Tu pedido fue *entregado* con éxito.\nGracias por elegirnos 🙏\n\n*${negocio}*`;
  }
  window.open(`https://wa.me/54${p.tel}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ── Resumen ───────────────────────────────────────────────────────────────────
function rResumenReparto(){
  const sec = document.getElementById('sec-resumenReparto');
  if(!sec) return;
  const todos = S.pedidosReparto||[];
  const hoy = tod();

  const hoyPeds      = todos.filter(p=>p.fecha===hoy);
  const entregadosHoy= hoyPeds.filter(p=>p.estado==='entregado');
  const pendientesHoy= hoyPeds.filter(p=>p.estado==='pendiente'||p.estado==='en_camino');
  const totalHoy     = entregadosHoy.reduce((s,p)=>s+(p.total||0),0);

  // Últimos 7 días
  const dias7 = [];
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    const f = d.toISOString().slice(0,10);
    const pds = todos.filter(p=>p.fecha===f&&p.estado==='entregado');
    dias7.push({
      fecha: f,
      label: d.toLocaleDateString('es-AR',{weekday:'short',day:'numeric'}),
      total: pds.reduce((s,p)=>s+(p.total||0),0),
      count: pds.length
    });
  }
  const maxTotal = Math.max(...dias7.map(d=>d.total),1);

  // Top clientes
  const clienteMap = {};
  todos.filter(p=>p.estado==='entregado').forEach(p=>{
    const k = p.cliente||'Sin nombre';
    clienteMap[k] = (clienteMap[k]||0) + (p.total||0);
  });
  const topCli = Object.entries(clienteMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

  sec.innerHTML = `
    <h2 style="margin:0 0 16px;font-size:1.1rem">Resumen de entregas</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:20px">
      <div style="background:var(--bg2);border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:1.6rem;font-weight:700">${entregadosHoy.length}</div>
        <div style="font-size:.78rem;color:var(--mut)">Entregados hoy</div>
      </div>
      <div style="background:var(--bg2);border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:1.6rem;font-weight:700">${pendientesHoy.length}</div>
        <div style="font-size:.78rem;color:var(--mut)">Pendientes hoy</div>
      </div>
      <div style="background:var(--bg2);border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:1.6rem;font-weight:700;color:var(--ok)">${fmt(totalHoy)}</div>
        <div style="font-size:.78rem;color:var(--mut)">Cobrado hoy</div>
      </div>
      <div style="background:var(--bg2);border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:1.6rem;font-weight:700">${todos.filter(p=>p.estado==='entregado').length}</div>
        <div style="font-size:.78rem;color:var(--mut)">Total histórico</div>
      </div>
    </div>

    <div style="background:var(--bg2);border-radius:10px;padding:14px;margin-bottom:14px">
      <div style="font-size:.85rem;font-weight:600;margin-bottom:10px">Entregas últimos 7 días</div>
      <div style="display:flex;gap:6px;align-items:flex-end;height:80px">
        ${dias7.map(d=>`
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
            <div style="font-size:.7rem;color:var(--mut)">${d.count||''}</div>
            <div style="width:100%;background:var(--acc);border-radius:3px 3px 0 0;
              height:${Math.round((d.total/maxTotal)*56)+4}px;min-height:4px;
              opacity:${d.fecha===hoy?1:0.5}"></div>
            <div style="font-size:.65rem;color:var(--mut);white-space:nowrap;overflow:hidden;max-width:100%">${d.label}</div>
          </div>
        `).join('')}
      </div>
    </div>

    ${topCli.length?`
    <div style="background:var(--bg2);border-radius:10px;padding:14px">
      <div style="font-size:.85rem;font-weight:600;margin-bottom:10px">Top clientes</div>
      ${topCli.map(([cli,tot])=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--bdr);font-size:.85rem">
          <span>${esc(cli)}</span><span style="font-weight:600;color:var(--ok)">${fmt(tot)}</span>
        </div>
      `).join('')}
    </div>`:''}
  `;
}
