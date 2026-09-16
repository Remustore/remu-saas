// ═══ EQUIPOS ═══
function calcGarantiaEquipo(){
  const dias = parseInt(document.getElementById('eGarDias')?.value)||0;
  const venceEl = document.getElementById('eGarVence');
  const margenEl = document.getElementById('eMargen');
  if(venceEl){
    // La fecha real se calcula al vender, no al cargar al inventario
    venceEl.value = dias > 0 ? `${dias} días desde la venta` : '';
  }
  if(margenEl){
    const pre = parseFloat(document.getElementById('ePre')?.value)||0;
    const cos = parseFloat(document.getElementById('eCos')?.value)||0;
    if(pre > 0 && cos > 0){
      const pct = Math.round((pre - cos) / pre * 100);
      margenEl.value = pct + '% — ' + fmt(pre - cos);
      margenEl.style.color = pct > 20 ? 'var(--ok)' : pct > 0 ? 'var(--wrn)' : 'var(--bad)';
    } else {
      margenEl.value = '';
    }
  }
}

async function saveEquipo(){
  const id = document.getElementById('eId').value;
  const imei = document.getElementById('eIme').value.trim();
  if(imei && imei.length !== 15) return alert('El IMEI debe tener 15 dígitos');
  const modelo = document.getElementById('eMod').value.trim();
  if(!modelo) return alert('Ingresá el modelo del equipo');
  const snap = JSON.parse(JSON.stringify(S.equipos));
  const garDias = parseInt(document.getElementById('eGarDias').value)||0;
  // garantiaVence se calcula al vender, no al registrar en inventario
  const existente = S.equipos.find(e=>e.id===parseInt(id));
  const garVence = existente?.garantiaVence || '';
  const obj = {
    tipo: document.getElementById('eTipo').value,
    modelo,
    memoria: document.getElementById('eMem').value,
    color: document.getElementById('eCol').value,
    imei,
    bateria: parseInt(document.getElementById('eBat').value)||null,
    estadoFisico: document.getElementById('eFis').value,
    precio: parseFloat(document.getElementById('ePre').value)||0,
    costo: parseFloat(document.getElementById('eCos').value)||0,
    garantiaDias: garDias,
    garantiaVence: garVence,
    provNombre: document.getElementById('eProvNombre').value.trim(),
    provTel: document.getElementById('eProvTel').value.trim(),
    notas: document.getElementById('eNot').value
  };
  if(id){
    const i = S.equipos.findIndex(e=>e.id===parseInt(id));
    if(i>-1){ S.equipos[i]={...S.equipos[i],...obj}; await dbUpsert('equipos',S.equipos[i]); pushUndo('Editar equipo','equipos',snap); }
  }else{
    const item={id:Date.now(),...obj,estado:'disponible',fecha:tod()};
    S.equipos.push(item); await dbUpsert('equipos',item); pushUndo('Agregar equipo','equipos',snap);
  }
  closeM('mEquipo'); rEquipos(); showToast('Equipo guardado ✓');
}

async function delEquipo(id){
  if(!confirm('¿Eliminar equipo?')) return;
  const snap = JSON.parse(JSON.stringify(S.equipos));
  S.equipos = S.equipos.filter(e=>e.id!==id);
  await dbDelete('equipos',id); pushUndo('Eliminar equipo','equipos',snap); rEquipos();
}

function _veqActualizarResumen(costo){
  const res = document.getElementById('_veqResumen');
  const body = document.getElementById('_veqResumenBody');
  if(!res||!body) return;
  const precio = parseFloat(document.getElementById('_veqPre')?.value)||0;
  const tradeChk = document.getElementById('_veqTradeChk')?.checked;
  const tradeVal = tradeChk ? (parseFloat(document.getElementById('_trVal')?.value)||0) : 0;
  const cobrado = precio - tradeVal;
  const ganancia = precio - costo;
  if(!precio){ res.style.display='none'; return; }
  res.style.display='block';
  const row = (lbl,val,color='var(--tx)')=>`<div style="display:flex;justify-content:space-between;align-items:center"><span style="color:var(--tx2)">${lbl}</span><strong style="color:${color}">${val}</strong></div>`;
  const sep = `<div style="border-top:1px solid var(--bor2);margin:4px 0"></div>`;
  let html = row('Precio de venta', fmt(precio));
  if(tradeChk && tradeVal>0){
    html += row('Trade-in (equipo recibido)', '− '+fmt(tradeVal), 'var(--bad)');
    html += sep;
    html += row('Cobrado en efectivo / transf.', fmt(cobrado), 'var(--gld)');
    html += sep;
  } else {
    html += sep;
  }
  if(costo > 0){
    html += row('Costo del equipo', '− '+fmt(costo), 'var(--bad)');
    html += row('Ganancia bruta', fmt(ganancia), ganancia>0?'var(--ok)':'var(--bad)');
  }
  body.innerHTML = html;
}

function abrirVentaEquipo(id){
  const e = S.equipos.find(eq=>eq.id===id);
  if(!e) return;
  const overlay = document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:350;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick=ev=>{if(ev.target===overlay)overlay.remove();};
  overlay.innerHTML=`<div style="background:var(--sur);border:1px solid var(--bor2);border-radius:14px;width:100%;max-width:420px;padding:24px;max-height:90vh;overflow-y:auto">
    <div style="font-family:var(--fh);font-size:1rem;font-weight:700;margin-bottom:4px">💸 Vender equipo</div>
    <div style="font-size:.82rem;color:var(--tx2);margin-bottom:16px">${esc(e.modelo)} ${esc(e.memoria||'')} ${e.tipo==='nuevo'?'· Nuevo':'· Usado'}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div>
        <label style="font-size:.68rem;color:var(--tx2);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">Nombre del cliente</label>
        <input id="_veqCli" placeholder="Ej: Juan García" style="width:100%;padding:9px 12px;background:var(--bg);border:1px solid var(--bor2);color:var(--tx);border-radius:8px;font-size:.88rem;font-family:var(--fb)">
      </div>
      <div>
        <label style="font-size:.68rem;color:var(--tx2);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">WhatsApp cliente</label>
        <input id="_veqTel" placeholder="Ej: 3412345678" type="tel" style="width:100%;padding:9px 12px;background:var(--bg);border:1px solid var(--bor2);color:var(--tx);border-radius:8px;font-size:.88rem;font-family:var(--fb)">
      </div>
    </div>
    <label style="font-size:.68rem;color:var(--tx2);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">Precio de venta ($)</label>
    <input id="_veqPre" type="number" value="${e.precio||0}" style="width:100%;padding:10px 12px;background:var(--bg);border:1px solid var(--bor2);color:var(--tx);border-radius:8px;font-size:.9rem;margin-bottom:10px">
    <label style="font-size:.68rem;color:var(--tx2);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">Método de pago</label>
    <select id="_veqMet" style="width:100%;padding:10px 12px;background:var(--bg);border:1px solid var(--bor2);color:var(--tx);border-radius:8px;font-size:.88rem;margin-bottom:12px">
      <option>Efectivo</option><option>Transferencia</option><option>Mercado Pago</option><option>Tarjeta débito</option><option>Tarjeta crédito</option><option>Cuotas propias</option>
    </select>
    <label style="font-size:.82rem;color:var(--tx2);display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:10px">
      <input type="checkbox" id="_veqTradeChk" onchange="document.getElementById('_veqTradeBox').style.display=this.checked?'block':'none'">
      Recibí un equipo en parte de pago (trade-in)
    </label>
    <div id="_veqTradeBox" style="display:none;background:var(--bg2);border:1px solid var(--bor2);border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);margin-bottom:10px">📱 Datos del equipo recibido — quedará en inventario como Usado</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <div>
          <label style="font-size:.65rem;color:var(--tx2);display:block;margin-bottom:3px">Modelo *</label>
          <input id="_trMod" placeholder="Ej: iPhone 11" style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--bor2);color:var(--tx);border-radius:7px;font-size:.82rem;font-family:var(--fb)">
        </div>
        <div>
          <label style="font-size:.65rem;color:var(--tx2);display:block;margin-bottom:3px">Capacidad</label>
          <select id="_trMem" style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--bor2);color:var(--tx);border-radius:7px;font-size:.82rem">
            <option>64 GB</option><option selected>128 GB</option><option>256 GB</option><option>512 GB</option><option>1 TB</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <div>
          <label style="font-size:.65rem;color:var(--tx2);display:block;margin-bottom:3px">Color</label>
          <input id="_trCol" placeholder="Negro, Blanco..." style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--bor2);color:var(--tx);border-radius:7px;font-size:.82rem;font-family:var(--fb)">
        </div>
        <div>
          <label style="font-size:.65rem;color:var(--tx2);display:block;margin-bottom:3px">IMEI (opcional)</label>
          <input id="_trImei" maxlength="15" placeholder="000000000000000" oninput="this.value=this.value.replace(/\D/g,'')" style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--bor2);color:var(--tx);border-radius:7px;font-size:.82rem;font-family:monospace">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <div>
          <label style="font-size:.65rem;color:var(--tx2);display:block;margin-bottom:3px">% Batería</label>
          <input id="_trBat" type="number" min="0" max="100" placeholder="85" style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--bor2);color:var(--tx);border-radius:7px;font-size:.82rem">
        </div>
        <div>
          <label style="font-size:.65rem;color:var(--tx2);display:block;margin-bottom:3px">Estado físico</label>
          <select id="_trFis" style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--bor2);color:var(--tx);border-radius:7px;font-size:.82rem">
            <option>Excelente</option><option>Muy bueno</option><option>Bueno</option><option>Regular</option><option>Mal estado</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <div>
          <label style="font-size:.65rem;color:var(--tx2);display:block;margin-bottom:3px">Valor asignado ($) *</label>
          <input id="_trVal" type="number" placeholder="0" style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--bor2);color:var(--tx);border-radius:7px;font-size:.82rem">
        </div>
        <div>
          <label style="font-size:.65rem;color:var(--tx2);display:block;margin-bottom:3px">Accesorios / caja</label>
          <input id="_trAcc" placeholder="Sin accesorios, con caja..." style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--bor2);color:var(--tx);border-radius:7px;font-size:.82rem;font-family:var(--fb)">
        </div>
      </div>
      <div>
        <label style="font-size:.65rem;color:var(--tx2);display:block;margin-bottom:3px">Defectos / observaciones</label>
        <input id="_trNot" placeholder="Ej: rayón en la pantalla, botón de volumen flojo..." style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--bor2);color:var(--tx);border-radius:7px;font-size:.82rem;font-family:var(--fb)">
      </div>
    </div>
    <div id="_veqResumen" style="background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.2);border-radius:10px;padding:12px 14px;margin-bottom:12px;display:none">
      <div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);margin-bottom:8px">Resumen de la operación</div>
      <div style="display:flex;flex-direction:column;gap:5px;font-size:.82rem" id="_veqResumenBody"></div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn" style="flex:1" onclick="this.closest('[style*=fixed]').remove()">Cancelar</button>
      <button class="btn bg" style="flex:1" onclick="confirmarVentaEquipo(${id},this)">Confirmar venta</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  // Actualizar resumen cuando cambia precio o trade-in
  const _costo = e.costo||0;
  const _upd = ()=>_veqActualizarResumen(_costo);
  overlay.querySelector('#_veqPre')?.addEventListener('input', _upd);
  overlay.querySelector('#_veqTradeChk')?.addEventListener('change', _upd);
  overlay.querySelector('#_trVal')?.addEventListener('input', _upd);
  _upd();
}

async function confirmarVentaEquipo(id, btn){
  const e = S.equipos.find(eq=>eq.id===id);
  if(!e) return;
  const precio = parseFloat(document.getElementById('_veqPre')?.value)||e.precio||0;
  const metodo = document.getElementById('_veqMet')?.value||'Efectivo';
  const clienteNombre = (document.getElementById('_veqCli')?.value||'').trim();
  const clienteTel = (document.getElementById('_veqTel')?.value||'').trim().replace(/\D/g,'');
  const tradeChk = document.getElementById('_veqTradeChk')?.checked;
  const tradeVal = tradeChk ? (parseFloat(document.getElementById('_trVal')?.value)||0) : 0;
  const tradeMod = tradeChk ? (document.getElementById('_trMod')?.value||'').trim() : '';
  if(tradeChk && !tradeMod){ showToast('Ingresá el modelo del equipo recibido','err'); return; }
  btn.disabled=true; btn.textContent='Guardando...';
  // Marcar equipo como vendido
  const snapEq = JSON.parse(JSON.stringify(S.equipos));
  e.estado='vendido'; e.fechaVenta=tod(); e.precioVenta=precio;
  if(clienteNombre) e.clienteNombre = clienteNombre;
  if(clienteTel) e.clienteTel = clienteTel;
  if(tradeChk && tradeMod){ e.tradeDesc = tradeMod; e.tradeVal = tradeVal; }
  // Recalcular garantiaVence desde la fecha de venta (no desde cuando se cargó al stock)
  if(e.garantiaDias > 0){
    const gv = new Date(); gv.setDate(gv.getDate() + parseInt(e.garantiaDias));
    e.garantiaVence = gv.toISOString().slice(0,10);
  }
  await dbUpsert('equipos',e);
  pushUndo('Vender equipo','equipos',snapEq);
  // Si hay trade-in, registrar el equipo recibido en el inventario como Usado
  if(tradeChk && tradeMod){
    const tradeItem = {
      id: Date.now(),
      tipo: 'usado',
      estado: 'disponible',
      modelo: tradeMod,
      memoria: document.getElementById('_trMem')?.value || '',
      color: (document.getElementById('_trCol')?.value || '').trim(),
      imei: (document.getElementById('_trImei')?.value || '').trim(),
      bateria: parseInt(document.getElementById('_trBat')?.value) || null,
      estadoFisico: document.getElementById('_trFis')?.value || 'Bueno',
      notas: [(document.getElementById('_trAcc')?.value||'').trim(), (document.getElementById('_trNot')?.value||'').trim()].filter(Boolean).join(' · '),
      costo: tradeVal,
      precio: 0,
      provNombre: clienteNombre || 'Trade-in',
      provTel: clienteTel || '',
      fechaIngreso: tod()
    };
    S.equipos.push(tradeItem);
    await dbUpsert('equipos', tradeItem);
  }
  // Registrar en ventas
  const snapV = JSON.parse(JSON.stringify(S.ventas));
  const cobrado = precio - (tradeVal||0); // efectivo real recibido
  const tradeLabel = tradeChk && tradeMod ? ` [Trade-in: ${tradeMod}]` : '';
  const venta = {
    id: Date.now()+1, tipo:'equipo',
    nombre: e.modelo + (e.memoria?' '+e.memoria:'') + (e.imei?' ['+e.imei+']':'') + (clienteNombre?' → '+clienteNombre:'') + tradeLabel,
    cantidad: 1, precio, total: cobrado,
    costo: e.costo||0, metodo, fecha: tod(),
    comPct: 0, comision: 0,
    tradeDesc: tradeMod||'', tradeVal: tradeVal||0
  };
  S.ventas.unshift(venta);
  await dbUpsert('ventas', venta);
  pushUndo('Venta equipo','ventas',snapV);
  btn.closest('[style*=fixed]').remove();
  rEquipos(); rGarantias();
  const msg = tradeChk && tradeMod
    ? `Venta registrada ✓ — ${esc(e.modelo)}\n📱 Trade-in "${tradeMod}" agregado al inventario`
    : `Venta registrada ✓ — ${esc(e.modelo)}`;
  showToast(msg);
}

function setEF(f,i){ eFilt=f; document.querySelectorAll('#etabs .tab').forEach((b,j)=>b.classList.toggle('active',i===j)); rEquipos(); }

function _diasGarantiaRestantes(vence){
  if(!vence) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const v = new Date(vence+'T00:00:00'); v.setHours(0,0,0,0);
  return Math.ceil((v - hoy) / 86400000);
}

function rEquipos(){
  const q = (document.getElementById('eQ').value||'').toLowerCase();
  const items = S.equipos.filter(e=>(eFilt==='todos'||e.tipo===eFilt||e.estado===eFilt)&&(!q||( (e.modelo||'').toLowerCase().includes(q)||(e.imei||'').includes(q)||(e.provNombre||'').toLowerCase().includes(q))));
  const tb = document.getElementById('tbE');
  if(!items.length){ tb.innerHTML=`<tr><td colspan="7">${emp('📱','Sin equipos')}</td></tr>`; return; }
  tb.innerHTML = items.map(e=>{
    const vendido = e.estado === 'vendido';
    const ganancia = (e.precio && e.costo) ? e.precio - e.costo : null;
    const margen = (ganancia !== null && e.precio) ? Math.round(ganancia / e.precio * 100) : null;

    // Columna Precio: disponible muestra costo + ganancia esperada; vendido solo precio + margen
    let precioHtml;
    if(vendido){
      precioHtml = `<strong>${fmt(e.precio)}</strong>${margen!==null?`<br><span style="font-size:.68rem;color:var(--mut)">${margen}% margen</span>`:''}`;
    } else {
      precioHtml = `<strong style="color:var(--ok)">${fmt(e.precio)}</strong>`;
      if(e.costo){
        const ganColor = ganancia >= 0 ? 'var(--ok)' : 'var(--bad)';
        precioHtml += `<br><span style="font-size:.7rem;color:var(--tx2)">Costo ${fmt(e.costo)}</span>`;
        precioHtml += `<br><span style="font-size:.7rem;font-weight:600;color:${ganColor}">Gan: ${fmt(ganancia)} (${margen}%)</span>`;
      }
    }

    // Columna Garantía: disponible → días que se darán al comprador; vendido → sin badge, solo fecha discreta
    let garHtml;
    if(vendido){
      garHtml = e.garantiaVence
        ? `<span style="font-size:.72rem;color:var(--mut)">${fD(e.garantiaVence)}</span>`
        : '<span style="color:var(--mut);font-size:.75rem">—</span>';
    } else {
      garHtml = e.garantiaDias > 0
        ? `<span style="font-size:.75rem;color:var(--ok)">🛡 ${e.garantiaDias}d</span><br><span style="font-size:.65rem;color:var(--mut)">desde la venta</span>`
        : '<span style="color:var(--mut);font-size:.75rem">Sin garantía</span>';
    }

    const tipoChip = e.tipo==='nuevo'
      ? '<span class="bx bbl" style="font-size:.65rem">🆕 Nuevo</span>'
      : '<span class="bx byw" style="font-size:.65rem">📱 Usado</span>';
    const vendidoChip = vendido ? '<br><span class="bx bgx" style="font-size:.62rem">Vendido</span>' : '';
    const notasTexto = e.notas ? esc(e.notas.length > 35 ? e.notas.slice(0,35)+'…' : e.notas) : '';

    return `<tr>
    <td><strong>${esc(e.modelo)}</strong><br><span style="font-size:.7rem;color:var(--mut)">${esc(e.memoria||'')}${e.color?' · '+esc(e.color):''}</span>${notasTexto?`<br><span style="font-size:.68rem;color:var(--mut)" title="${esc(e.notas||'')}">${notasTexto}</span>`:''}${vendidoChip}</td>
    <td class="col-hide" style="font-size:.72rem;font-family:monospace;color:var(--mut)">${esc(e.imei||'—')}</td>
    <td>${tipoChip}<br><span style="font-size:.68rem;color:var(--mut)">${esc(e.estadoFisico||'')}</span></td>
    <td>${precioHtml}</td>
    <td class="col-hide">${garHtml}</td>
    <td class="col-hide" style="font-size:.75rem">${e.provNombre?esc(e.provNombre):'<span style="color:var(--mut)">—</span>'}${e.provTel?`<br><span style="color:var(--mut);font-size:.68rem">${esc(e.provTel)}</span>`:''}</td>
    <td style="display:flex;gap:3px;flex-wrap:wrap">
      ${!vendido?`<button class="btn bs bsm" onclick="abrirVentaEquipo(${e.id})" title="Registrar venta">💸 Vender</button>`:''}
      <button class="btn be bsm" onclick="openM('mEquipo',${e.id})">✎</button>
      <button class="btn bd bsm" onclick="delEquipo(${e.id})">✕</button>
    </td></tr>`;
  }).join('');
}

// ═══ GARANTÍAS ═══
let gFilt = 'todas';
function setGF(f,i){ gFilt=f; document.querySelectorAll('#gtabs .tab').forEach((b,j)=>b.classList.toggle('active',i===j)); rGarantias(); }

function _estadoGarantia(e){
  if(e.reclamoAbierto) return 'reclamo';
  const dias = _diasGarantiaRestantes(e.garantiaVence);
  if(dias===null) return null;
  if(dias<0) return 'vencida';
  if(dias<=30) return 'por_vencer';
  return 'vigente';
}

function rGarantias(){
  const tb = document.getElementById('tbGar');
  if(!tb) return;
  // Solo equipos vendidos con garantía configurada
  let items = (S.equipos||[]).filter(e=>e.estado==='vendido'&&e.garantiaVence);
  if(gFilt!=='todas') items=items.filter(e=>_estadoGarantia(e)===gFilt);
  // Ordenar: reclamos primero, luego por días restantes ascendente
  items.sort((a,b)=>{
    const oa=a.reclamoAbierto?-1:(_diasGarantiaRestantes(a.garantiaVence)||9999);
    const ob=b.reclamoAbierto?-1:(_diasGarantiaRestantes(b.garantiaVence)||9999);
    return oa-ob;
  });
  // Actualizar badge
  const badge=document.getElementById('garantiasBadge');
  const reclamosAbiertos=(S.equipos||[]).filter(e=>e.reclamoAbierto).length;
  const porVencer=(S.equipos||[]).filter(e=>e.estado==='vendido'&&_estadoGarantia(e)==='por_vencer').length;
  const totalAlerta=reclamosAbiertos+porVencer;
  if(badge){ badge.textContent=totalAlerta; badge.style.display=totalAlerta?'':'none'; }
  if(!items.length){ tb.innerHTML=`<tr><td colspan="6">${emp('🛡️','Sin garantías registradas')}</td></tr>`; return; }
  tb.innerHTML=items.map(e=>{
    const dias=_diasGarantiaRestantes(e.garantiaVence);
    const est=_estadoGarantia(e);
    const estadoHtml=est==='reclamo'
      ?'<span class="bx brd" style="font-size:.68rem">⚠ En reclamo</span>'+(e.reclamoDesc?`<br><span style="font-size:.65rem;color:var(--mut)">${esc(e.reclamoDesc)}</span>`:'')
      :est==='vencida'
      ?'<span class="bx" style="font-size:.68rem;background:rgba(120,120,120,.15);color:var(--mut)">Vencida</span>'
      :est==='por_vencer'
      ?`<span class="bx byw" style="font-size:.68rem">⏰ ${dias}d restantes</span>`
      :`<span class="bx bbl" style="font-size:.68rem">✓ Vigente · ${dias}d</span>`;
    const acciones=est==='reclamo'
      ?`<button class="btn bg bsm" onclick="abrirResolucionGarantia(${e.id})">✓ Resolver</button>`
      :est!=='vencida'
      ?`<button class="btn brd bsm" onclick="abrirReclamoGarantia(${e.id})">⚠ Reclamo</button>`:'';
    const waBtn=e.clienteTel?`<button class="btn bs bsm" onclick="_waGarantia(${e.id})" title="Avisar por WhatsApp">💬</button>`:'';
    return `<tr>
      <td><strong>${esc(e.modelo)}</strong><br><span style="font-size:.7rem;color:var(--mut)">${esc(e.memoria||'')}${e.color?' · '+esc(e.color):''}</span></td>
      <td>${e.clienteNombre?esc(e.clienteNombre):'<span style="color:var(--mut)">—</span>'}${e.clienteTel?`<br><span style="font-size:.7rem;color:var(--mut)">${esc(e.clienteTel)}</span>`:''}</td>
      <td class="col-hide" style="font-size:.72rem;font-family:monospace;color:var(--mut)">${esc(e.imei||'—')}</td>
      <td><span style="font-size:.78rem">${e.garantiaDias||0} días</span><br><span style="font-size:.68rem;color:var(--mut)">Vence: ${fD(e.garantiaVence)}</span></td>
      <td>${estadoHtml}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap">${acciones}${waBtn}</td>
    </tr>`;
  }).join('');
}

function abrirReclamoGarantia(id){
  const e=S.equipos.find(eq=>eq.id===id); if(!e) return;
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:350;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick=ev=>{if(ev.target===ov)ov.remove();};
  ov.innerHTML=`<div style="background:var(--sur);border:1px solid var(--bor2);border-radius:14px;width:100%;max-width:400px;padding:24px">
    <div style="font-family:var(--fh);font-size:1rem;font-weight:700;margin-bottom:4px">⚠ Reclamo de garantía</div>
    <div style="font-size:.82rem;color:var(--tx2);margin-bottom:16px">${esc(e.modelo)} ${esc(e.memoria||'')} · IMEI: ${esc(e.imei||'—')}</div>
    <label style="font-size:.68rem;color:var(--tx2);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">Descripción del problema</label>
    <textarea id="_reclDesc" rows="3" placeholder="¿Qué reporta el cliente?" style="width:100%;padding:10px 12px;background:var(--bg);border:1px solid var(--bor2);color:var(--tx);border-radius:8px;font-size:.88rem;resize:vertical;margin-bottom:16px;font-family:var(--fb)"></textarea>
    <div style="display:flex;gap:8px">
      <button class="btn" style="flex:1" onclick="this.closest('[style*=fixed]').remove()">Cancelar</button>
      <button class="btn brd" style="flex:1" onclick="confirmarReclamoGarantia(${id},this)">Registrar reclamo</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
}

async function confirmarReclamoGarantia(id,btn){
  const e=S.equipos.find(eq=>eq.id===id); if(!e) return;
  const desc=(document.getElementById('_reclDesc')?.value||'').trim();
  if(!desc){ showToast('Describí el problema primero','err'); return; }
  btn.disabled=true; btn.textContent='Guardando...';
  const snap=JSON.parse(JSON.stringify(S.equipos));
  e.reclamoAbierto=true; e.reclamoDesc=desc; e.reclamoFecha=tod();
  await dbUpsert('equipos',e);
  pushUndo('Reclamo garantía','equipos',snap);
  btn.closest('[style*=fixed]').remove();
  rGarantias(); showToast('Reclamo registrado ✓');
}

function abrirResolucionGarantia(id){
  const e=S.equipos.find(eq=>eq.id===id); if(!e) return;
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:350;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick=ev=>{if(ev.target===ov)ov.remove();};
  ov.innerHTML=`<div style="background:var(--sur);border:1px solid var(--bor2);border-radius:14px;width:100%;max-width:400px;padding:24px">
    <div style="font-family:var(--fh);font-size:1rem;font-weight:700;margin-bottom:4px">✓ Resolver reclamo</div>
    <div style="font-size:.82rem;color:var(--tx2);margin-bottom:4px">${esc(e.modelo)} · ${esc(e.reclamoDesc||'')}</div>
    <div style="font-size:.72rem;color:var(--mut);margin-bottom:14px">Reclamo: ${fD(e.reclamoFecha||tod())}</div>
    <label style="font-size:.68rem;color:var(--tx2);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">Resolución aplicada</label>
    <select id="_reclRes" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--bor2);background:var(--bg);color:var(--tx);font-size:.88rem;margin-bottom:10px">
      <option>Reparación sin costo</option>
      <option>Cambio de equipo</option>
      <option>Devolución de dinero</option>
      <option>Sin cobertura (fuera de garantía)</option>
    </select>
    <label style="font-size:.68rem;color:var(--tx2);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">Costo para el negocio ($) — opcional</label>
    <input type="number" id="_reclCosto" placeholder="0" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--bor2);background:var(--bg);color:var(--tx);font-size:.9rem;margin-bottom:16px">
    <div style="display:flex;gap:8px">
      <button class="btn" style="flex:1" onclick="this.closest('[style*=fixed]').remove()">Cancelar</button>
      <button class="btn bg" style="flex:1" onclick="confirmarResolucionGarantia(${id},this)">Confirmar resolución</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
}

async function confirmarResolucionGarantia(id,btn){
  const e=S.equipos.find(eq=>eq.id===id); if(!e) return;
  const resolucion=document.getElementById('_reclRes')?.value;
  const costo=parseFloat(document.getElementById('_reclCosto')?.value)||0;
  btn.disabled=true; btn.textContent='Guardando...';
  const snap=JSON.parse(JSON.stringify(S.equipos));
  e.reclamoAbierto=false; e.reclamoResolucion=resolucion;
  e.reclamoResolucionFecha=tod(); e.reclamoCosto=costo;
  await dbUpsert('equipos',e);
  pushUndo('Resolver garantía','equipos',snap);
  // Si hubo costo y no es "sin cobertura", registrar como gasto en Caja
  const esSinCobertura = resolucion && (resolucion.toLowerCase().includes('sin cobertura') || resolucion.toLowerCase().includes('sin costo') || resolucion.toLowerCase().includes('gratis'));
  if(costo > 0 && !esSinCobertura){
    const snapG=JSON.parse(JSON.stringify(S.gastos));
    const imeiLabel = e.imei ? ` [${e.imei}]` : '';
    const clienteLabel = e.clienteNombre ? ` — ${e.clienteNombre}` : '';
    const gasto={
      id: Date.now(),
      concepto: `Garantía: ${resolucion} — ${e.modelo}${imeiLabel}${clienteLabel}`,
      tipo: 'variable',
      monto: costo,
      fecha: tod(),
      frecuencia: 'unico',
      notas: `Reclamo: ${e.reclamoDesc||''}. Resolución: ${resolucion}.`
    };
    S.gastos.unshift(gasto);
    await dbUpsert('gastos', gasto);
    pushUndo('Gasto garantía','gastos',snapG);
  }
  btn.closest('[style*=fixed]').remove();
  rGarantias();
  if(costo > 0 && !esSinCobertura){
    showToast(`Reclamo resuelto ✓ — Gasto de ${fmt(costo)} registrado en Caja`);
  } else {
    showToast('Reclamo resuelto ✓');
  }
}

function _waGarantia(id){
  const e=S.equipos.find(eq=>eq.id===id); if(!e||!e.clienteTel) return;
  const biz=currentTenant?.nombre||'el local';
  const msg=`¡Hola ${e.clienteNombre||''}! Te recordamos desde *${biz}* que la garantía de tu *${e.modelo}* vence el *${fD(e.garantiaVence)}*. Si notás algún inconveniente, contactanos antes de esa fecha. ¡Saludos! 🛡️`;
  const tel=(e.clienteTel+'').replace(/\D/g,'');
  window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ═══ PRESUPUESTOS DE EQUIPOS ═══
let _presFilt = 'todos';

function setPF(f,i){ _presFilt=f; document.querySelectorAll('#prestabs .tab').forEach((b,j)=>b.classList.toggle('active',i===j)); rPresupuestos(); }

function _estadoPres(p){
  const LABELS = { borrador:'📝 Borrador', enviado:'📤 Enviado', aceptado:'✅ Aceptado', rechazado:'❌ Rechazado', vencido:'⏰ Vencido' };
  const COLORS = { borrador:'var(--tx2)', enviado:'var(--inf)', aceptado:'var(--ok)', rechazado:'var(--bad)', vencido:'var(--mut)' };
  return { label: LABELS[p.estado]||p.estado, color: COLORS[p.estado]||'var(--tx2)' };
}

function rPresupuestos(){
  if(!S.presupuestos) S.presupuestos=[];
  const lista = _presFilt==='todos' ? S.presupuestos : S.presupuestos.filter(p=>p.estado===_presFilt);
  const sorted = [...lista].sort((a,b)=>(b.id||0)-(a.id||0));

  const enviados = S.presupuestos.filter(p=>p.estado==='enviado').length;
  const badge = document.getElementById('presBadge');
  if(badge){ badge.textContent=enviados; badge.style.display=enviados>0?'':'none'; }

  const tb = document.getElementById('tbPres');
  if(!tb) return;
  if(!sorted.length){ tb.innerHTML=`<tr><td colspan="6" style="text-align:center;padding:18px;color:var(--mut)">Sin presupuestos${_presFilt!=='todos'?' en este estado':''}</td></tr>`; return; }
  tb.innerHTML = sorted.map(p=>{
    const esServicio = p.tipo === 'servicio';
    const eq = !esServicio ? S.equipos.find(e=>e.id===p.equipo_id) : null;
    const st = _estadoPres(p);
    const tipoChip = esServicio
      ? `<span style="font-size:.65rem;background:rgba(201,148,76,.15);color:var(--wrn);border-radius:4px;padding:1px 6px;font-weight:600">🔧 Servicio</span>`
      : `<span style="font-size:.65rem;background:rgba(100,149,237,.12);color:var(--inf);border-radius:4px;padding:1px 6px;font-weight:600">📱 Equipo</span>`;
    const descripcion = esServicio
      ? `${esc(p.dispositivo||'—')} — ${esc(p.servicio||'—')}`
      : esc(p.equipo_modelo||'—');
    const puedeConvertirVenta = !esServicio && eq && eq.estado==='disponible' && p.estado==='aceptado';
    const puedeConvertirRep = esServicio && p.estado==='aceptado';
    return `<tr>
      <td>${tipoChip}<br><strong>${descripcion}</strong>${p.notas?`<br><span style="font-size:.72rem;color:var(--tx2)">${esc(p.notas.slice(0,40))}</span>`:''}</td>
      <td>${esc(p.cliente||'—')}${p.tel?`<br><span style="font-size:.72rem;color:var(--tx2)">${esc(p.tel)}</span>`:''}</td>
      <td class="col-hide">${fD(p.fecha)||'—'}</td>
      <td>
        <strong style="color:var(--ok)">${fmt(p.precio_contado||0)}</strong>
        ${p.notas_cuotas?`<br><span style="font-size:.7rem;color:var(--tx2)">${esc(p.notas_cuotas)}</span>`:''}
      </td>
      <td><span style="font-size:.78rem;font-weight:600;color:${st.color}">${st.label}</span></td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${p.tel?`<button class="btn bs bsm" onclick="enviarPresupuestoWA(${p.id})" title="Enviar por WhatsApp">📲</button>`:''}
          ${puedeConvertirVenta?`<button class="btn bgh bsm" onclick="convertirPresupuestoVenta(${p.id})" title="Convertir a venta">💰</button>`:''}
          ${puedeConvertirRep?`<button class="btn bgh bsm" onclick="convertirPresupuestoRep(${p.id})" title="Crear orden de reparación">🔧</button>`:''}
          <button class="btn be bsm" onclick="editarPresupuesto(${p.id})">✎</button>
          <button class="btn bd bsm" onclick="eliminarPresupuesto(${p.id})">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function abrirNuevoPresupuesto(tipo){ _abrirModalPresupuesto(null, tipo||'equipo'); }
function editarPresupuesto(id){ _abrirModalPresupuesto(id); }

function _presToggleTipo(tipo){
  const eqBlock = document.getElementById('_presEqBlock');
  const srvBlock = document.getElementById('_presSrvBlock');
  const cuotasBlock = document.getElementById('_presCuotasBlock');
  document.querySelectorAll('#mPres .tipo-btn').forEach(b=>b.classList.toggle('bgh', b.dataset.tipo===tipo));
  if(eqBlock) eqBlock.style.display = tipo==='equipo' ? '' : 'none';
  if(srvBlock) srvBlock.style.display = tipo==='servicio' ? '' : 'none';
  if(cuotasBlock) cuotasBlock.style.display = tipo==='equipo' ? '' : 'none';
  const input = document.getElementById('_presTipo'); if(input) input.value = tipo;
}

function _abrirModalPresupuesto(id, tipoInicial){
  const p = id ? (S.presupuestos||[]).find(x=>x.id===id) : null;
  const tipo = tipoInicial || p?.tipo || 'equipo';
  const eqDisp = (S.equipos||[]).filter(e=>e.estado==='disponible');
  const eqOpts = eqDisp.map(e=>`<option value="${e.id}" data-precio="${e.precio}" data-costo="${e.costo}" ${p&&p.equipo_id===e.id?'selected':''}>${esc(e.modelo)} ${esc(e.memoria||'')} ${e.tipo==='usado'?'(Usado)':''} — ${fmt(e.precio)}</option>`).join('');
  const estOpts = ['borrador','enviado','aceptado','rechazado','vencido'].map(s=>`<option value="${s}" ${(p?.estado||'borrador')===s?'selected':''}>${_estadoPres({estado:s}).label}</option>`).join('');

  const html = `<div style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:310;display:flex;align-items:center;justify-content:center;padding:16px" id="mPres" onclick="if(event.target.id==='mPres')closeMPres()">
    <div style="background:var(--sur);border:1px solid var(--bor2);border-radius:14px;width:100%;max-width:480px;max-height:92vh;overflow-y:auto">
      <div style="padding:16px 20px;border-bottom:1px solid var(--bor);font-family:var(--fh);font-weight:700;font-size:1.05rem">${p?'✎ Editar':'📝 Nuevo'} presupuesto</div>
      <div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">
        <input type="hidden" id="_presTipo" value="${tipo}">

        <!-- Toggle tipo -->
        <div style="display:flex;gap:6px;background:var(--bg);border-radius:9px;padding:4px">
          <button type="button" class="btn bsm tipo-btn ${tipo==='equipo'?'bgh':''}" data-tipo="equipo" onclick="_presToggleTipo('equipo')" style="flex:1;justify-content:center">📱 Venta de equipo</button>
          <button type="button" class="btn bsm tipo-btn ${tipo==='servicio'?'bgh':''}" data-tipo="servicio" onclick="_presToggleTipo('servicio')" style="flex:1;justify-content:center">🔧 Servicio técnico</button>
        </div>

        <!-- EQUIPO: selector de inventario -->
        <div id="_presEqBlock" style="display:${tipo==='equipo'?'':'none'}">
          <label style="font-size:.72rem;color:var(--tx2);font-weight:600">EQUIPO DEL INVENTARIO *</label>
          <select id="_presEq" style="width:100%;margin-top:4px" onchange="_presAutoFill()" ${p&&p.tipo==='equipo'?'disabled':''}>
            <option value="">— Seleccioná un equipo —</option>
            ${eqOpts}
          </select>
          ${p&&p.tipo==='equipo'?`<div style="font-size:.7rem;color:var(--tx2);margin-top:3px">${esc(p.equipo_modelo||'')}</div>`:''}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
            <div>
              <label style="font-size:.72rem;color:var(--tx2);font-weight:600">PRECIO CONTADO *</label>
              <input id="_presCont" type="number" placeholder="0" value="${p?.precio_contado||''}" style="width:100%;margin-top:4px">
            </div>
            <div id="_presCuotasBlock">
              <label style="font-size:.72rem;color:var(--tx2);font-weight:600">CUOTAS (opcional)</label>
              <input id="_presCuotas" placeholder="3x $75.000" value="${esc(p?.notas_cuotas||'')}" style="width:100%;margin-top:4px">
            </div>
          </div>
        </div>

        <!-- SERVICIO: dispositivo + servicio + precio -->
        <div id="_presSrvBlock" style="display:${tipo==='servicio'?'':'none'}">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <label style="font-size:.72rem;color:var(--tx2);font-weight:600">DISPOSITIVO *</label>
              <input id="_presDisp" placeholder="Ej: iPhone 12, Samsung A30" value="${esc(p?.dispositivo||'')}" style="width:100%;margin-top:4px">
            </div>
            <div>
              <label style="font-size:.72rem;color:var(--tx2);font-weight:600">SERVICIO *</label>
              <input id="_presSrv" placeholder="Ej: Cambio de pantalla" value="${esc(p?.servicio||'')}" style="width:100%;margin-top:4px" list="_srvSugg">
              <datalist id="_srvSugg">
                <option>Cambio de pantalla</option><option>Cambio de batería</option><option>Conector de carga</option>
                <option>Cámara frontal</option><option>Cámara trasera</option><option>Botones</option>
                <option>Formateo / Software</option><option>Diagnóstico</option><option>Tapa trasera</option>
              </datalist>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
            <div>
              <label style="font-size:.72rem;color:var(--tx2);font-weight:600">PRECIO COBRADO *</label>
              <input id="_presContSrv" type="number" placeholder="0" value="${p?.tipo==='servicio'?p.precio_contado||'':''}" style="width:100%;margin-top:4px" oninput="_presCalcMargenSrv()">
            </div>
            <div>
              <label style="font-size:.72rem;color:var(--tx2);font-weight:600">COSTO REPUESTO</label>
              <input id="_presCostoRep" type="number" placeholder="0" value="${esc(p?.costo_rep||'')}" style="width:100%;margin-top:4px" oninput="_presCalcMargenSrv()">
            </div>
          </div>
          <div id="_presMargenSrv" style="font-size:.75rem;color:var(--tx2);margin-top:5px"></div>
        </div>

        <!-- Datos del cliente (comunes) -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:.72rem;color:var(--tx2);font-weight:600">CLIENTE *</label>
            <input id="_presCli" placeholder="Nombre" value="${esc(p?.cliente||'')}" style="width:100%;margin-top:4px">
          </div>
          <div>
            <label style="font-size:.72rem;color:var(--tx2);font-weight:600">WHATSAPP</label>
            <input id="_presTel" placeholder="Sin 0 ni 15" value="${esc(p?.tel||'')}" style="width:100%;margin-top:4px">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:.72rem;color:var(--tx2);font-weight:600">ESTADO</label>
            <select id="_presEst" style="width:100%;margin-top:4px">${estOpts}</select>
          </div>
        </div>
        <div>
          <label style="font-size:.72rem;color:var(--tx2);font-weight:600">NOTAS</label>
          <textarea id="_presNotas" rows="2" placeholder="Observaciones..." style="width:100%;margin-top:4px;resize:vertical">${esc(p?.notas||'')}</textarea>
        </div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--bor);display:flex;justify-content:flex-end;gap:8px">
        <button class="btn" onclick="closeMPres()">Cancelar</button>
        <button class="btn bgh" onclick="guardarPresupuesto(${id||'null'})">Guardar</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function _presCalcMargenSrv(){
  const precio = parseFloat(document.getElementById('_presContSrv')?.value)||0;
  const costo  = parseFloat(document.getElementById('_presCostoRep')?.value)||0;
  const el = document.getElementById('_presMargenSrv');
  if(!el) return;
  if(!precio){ el.textContent=''; return; }
  const gan = precio - costo;
  const pct = Math.round(gan/precio*100);
  el.innerHTML = `Ganancia: <strong style="color:${pct>=30?'var(--ok)':'var(--bad)'}">${fmt(gan)} (${pct}%)</strong>`;
}

function _presAutoFill(){
  const sel = document.getElementById('_presEq');
  const opt = sel?.options[sel.selectedIndex];
  if(opt && opt.dataset.precio){
    const el = document.getElementById('_presCont');
    if(el && !el.value) el.value = opt.dataset.precio;
  }
}

function closeMPres(){ document.getElementById('mPres')?.remove(); }

async function guardarPresupuesto(id){
  const tipo = document.getElementById('_presTipo')?.value || 'equipo';
  const cliente = (document.getElementById('_presCli')?.value||'').trim();
  if(!cliente){ showToast('Ingresá el nombre del cliente','err'); return; }

  if(!S.presupuestos) S.presupuestos=[];
  let obj;

  if(tipo === 'servicio'){
    const dispositivo = (document.getElementById('_presDisp')?.value||'').trim();
    const servicio    = (document.getElementById('_presSrv')?.value||'').trim();
    const precio_contado = parseFloat(document.getElementById('_presContSrv')?.value)||0;
    if(!dispositivo){ showToast('Ingresá el dispositivo','err'); return; }
    if(!servicio){ showToast('Ingresá el servicio','err'); return; }
    if(!precio_contado){ showToast('Ingresá el precio','err'); return; }
    obj = {
      id: id || Date.now(), tipo: 'servicio', fecha: tod(),
      dispositivo, servicio, precio_contado,
      costo_rep: parseFloat(document.getElementById('_presCostoRep')?.value)||0,
      cliente, tel: (document.getElementById('_presTel')?.value||'').replace(/\D/g,''),
      notas: (document.getElementById('_presNotas')?.value||'').trim(),
      estado: document.getElementById('_presEst')?.value||'borrador'
    };
  } else {
    const eqSel = document.getElementById('_presEq');
    const equipo_id = eqSel?.value ? parseInt(eqSel.value) : (id ? (S.presupuestos.find(p=>p.id===id)?.equipo_id||null) : null);
    const eq = equipo_id ? S.equipos.find(e=>e.id===equipo_id) : null;
    const equipo_modelo = eq ? `${eq.modelo||''} ${eq.memoria||''}`.trim() : (id ? S.presupuestos.find(p=>p.id===id)?.equipo_modelo||'' : '');
    const precio_contado = parseFloat(document.getElementById('_presCont')?.value)||0;
    if(!equipo_modelo){ showToast('Seleccioná un equipo','err'); return; }
    if(!precio_contado){ showToast('Ingresá el precio contado','err'); return; }
    obj = {
      id: id || Date.now(), tipo: 'equipo', fecha: tod(),
      equipo_id, equipo_modelo, precio_contado,
      notas_cuotas: (document.getElementById('_presCuotas')?.value||'').trim(),
      cliente, tel: (document.getElementById('_presTel')?.value||'').replace(/\D/g,''),
      notas: (document.getElementById('_presNotas')?.value||'').trim(),
      estado: document.getElementById('_presEst')?.value||'borrador'
    };
  }

  if(id){ const idx=S.presupuestos.findIndex(p=>p.id===id); if(idx>-1) S.presupuestos[idx]=obj; else S.presupuestos.push(obj); }
  else S.presupuestos.push(obj);
  await dbUpsert('presupuestos', obj);
  closeMPres(); rPresupuestos();
  showToast('Presupuesto guardado ✓');
}

function enviarPresupuestoWA(id){
  const p = (S.presupuestos||[]).find(x=>x.id===id);
  if(!p || !p.tel) return;
  const biz = currentTenant?.nombre || 'Nosotros';
  const lines = [`¡Hola${p.cliente?' '+p.cliente:''}! 👋 Te paso el presupuesto solicitado:\n`];
  if(p.tipo === 'servicio'){
    lines.push(`📱 Equipo: *${p.dispositivo}*`);
    lines.push(`🔧 Servicio: *${p.servicio}*`);
    lines.push(`💵 Precio: *${fmt(p.precio_contado)}*`);
  } else {
    lines.push(`📱 *${p.equipo_modelo}*`);
    lines.push(`💵 Contado: *${fmt(p.precio_contado)}*`);
    if(p.notas_cuotas) lines.push(`💳 ${p.notas_cuotas}`);
  }
  if(p.notas) lines.push(`\n📝 ${p.notas}`);
  lines.push(`\nPresupuesto válido por 48 hs. ¡Cualquier consulta estoy a disposición!`);
  lines.push(`— *${biz}*`);
  window.open(`https://wa.me/${p.tel}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  if(p.estado==='borrador'){ p.estado='enviado'; dbUpsert('presupuestos',p); rPresupuestos(); }
}

function convertirPresupuestoVenta(id){
  const p = (S.presupuestos||[]).find(x=>x.id===id);
  if(!p || !p.equipo_id) return;
  const eq = S.equipos.find(e=>e.id===p.equipo_id);
  if(!eq){ showToast('El equipo ya no está disponible','err'); return; }
  eq._precioPresup = p.precio_contado;
  eq._clientePresup = p.cliente;
  eq._telPresup = p.tel;
  abrirVentaEquipo(p.equipo_id);
}

function convertirPresupuestoRep(id){
  const p = (S.presupuestos||[]).find(x=>x.id===id);
  if(!p) return;
  // Pre-cargar el modal de nueva reparación con los datos del presupuesto
  openM('mTaller', null);
  setTimeout(()=>{
    const set = (elId, val) => { const el=document.getElementById(elId); if(el) el.value=val; };
    set('tCli', p.cliente||'');
    set('tTel', p.tel||'');
    set('tEq',  p.dispositivo||'');
    set('tFal', p.servicio||'');
    set('tPre', p.precio_contado||'');
    set('tCosRep', p.costo_rep||'');
    calcGanTaller();
    const titulo = document.getElementById('mTallerTitle');
    if(titulo) titulo.textContent = '🔧 Nueva reparación desde presupuesto';
  }, 80);
}

async function eliminarPresupuesto(id){
  _confirmarModal('¿Eliminar este presupuesto?', async ()=>{
    S.presupuestos = (S.presupuestos||[]).filter(p=>p.id!==id);
    await dbDelete('presupuestos', id);
    rPresupuestos();
    showToast('Presupuesto eliminado ✓');
  });
}

// ═══ VENTAS ═══
function popVSels(){
  const catF = document.getElementById('vCatFilt')?.value||'';
  const prodOpts = S.stock.filter(s=>s.cantidad>0&&(!catF||s.categoria===catF));
  const optsHtml = prodOpts.map(s=>`<option value="${s.id}" data-precio="${s.precio}" data-costo="${s.costo}">${esc(s.nombre)} (×${s.cantidad})</option>`).join('');
  document.getElementById('vProd').innerHTML = (optsHtml||'') + '<option value="__nuevo__">➕ Agregar producto nuevo...</option>';
  autoFillPrecio();
  document.getElementById('vEq').innerHTML = S.equipos.filter(e=>e.estado==='disponible').map(e=>`<option value="${e.id}">${esc(e.modelo)} ${esc(e.memoria)}${e.tipo==='usado'?' (Usado)':''} — ${fmt(e.precio)}</option>`).join('')||'<option>Sin equipos</option>';
}

function uVUI(){
  const t = document.getElementById('vTipo').value;
  document.getElementById('vPR').style.display = t==='producto'?'':'none';
  document.getElementById('vER').style.display = t==='equipo'?'':'none';
  document.getElementById('vSR').style.display = t==='servicio'?'':'none';
}

function autoFillPrecio(){
  const sel = document.getElementById('vProd');
  const opt = sel.options[sel.selectedIndex];
  if(!opt || !opt.value) return;
  if(opt.value === '__nuevo__'){
    // Reset select to avoid staying on __nuevo__
    sel.selectedIndex = 0;
    // Populate category select in modal
    const cats = getCategorias();
    const npCat = document.getElementById('npCat');
    if(npCat) npCat.innerHTML = cats.map(c=>'<option value="'+c+'">'+c+'</option>').join('');
    // Pre-select current category filter
    const filtCat = document.getElementById('vCatFilt')?.value;
    if(filtCat && npCat) npCat.value = filtCat;
    // Clear fields
    document.getElementById('npNombre').value = '';
    document.getElementById('npPrecio').value = '';
    document.getElementById('npCosto').value = '';
    document.getElementById('npStock').value = '0';
    openM('mNuevoProd', null);
    return;
  }
  const precio = opt.getAttribute('data-precio');
  if(precio && parseFloat(precio) > 0){
    document.getElementById('vPre').value = precio;
    calcComision();
  }
}

function filtrarProdVenta(){
  const catF = document.getElementById('vCatFilt')?.value||'';
  const prodOpts = S.stock.filter(s=>s.cantidad>0&&(!catF||s.categoria===catF));
  const optsHtml = prodOpts.map(s=>`<option value="${s.id}" data-precio="${s.precio}" data-costo="${s.costo}">${s.nombre} (×${s.cantidad})</option>`).join('');
  document.getElementById('vProd').innerHTML = (optsHtml||'') + '<option value="__nuevo__">➕ Agregar producto nuevo...</option>';
  autoFillPrecio();
}

function calcComision(){
  const pre = parseFloat(document.getElementById('vPre').value)||0;
  const cant = parseFloat(document.getElementById('vCant').value)||1;
  const pct = parseFloat(document.getElementById('vCom').value)||0;
  document.getElementById('vComCalc').value = Math.round(pre*cant*pct/100);
}

async function saveVenta(){
  const id = document.getElementById('vId').value;
  const tipo = document.getElementById('vTipo').value;
  const cant = parseInt(document.getElementById('vCant').value)||1;
  const precio = parseFloat(document.getElementById('vPre').value)||0;
  const fecha = document.getElementById('vFec').value||tod();
  const metodo = document.getElementById('vMet').value;
  const snap = JSON.parse(JSON.stringify(S.ventas));
  if(id){
    const i = S.ventas.findIndex(v=>v.id===parseInt(id));
    if(i>-1){ S.ventas[i]={...S.ventas[i],precio,total:S.ventas[i].cantidad*precio,metodo,fecha}; await dbUpsert('ventas',S.ventas[i]); pushUndo('Editar venta','ventas',snap); }
  }else{
    let nombre='',costoU=0,productoId=null;
    if(tipo==='producto'){
      const pid=parseInt(document.getElementById('vProd').value); const p=S.stock.find(s=>s.id===pid);
      if(!p) return alert('Seleccioná un producto'); if(p.cantidad<cant) return alert('Stock insuficiente');
      p.cantidad-=cant; p.vendidos=(p.vendidos||0)+cant; nombre=p.nombre; costoU=p.costo||0; productoId=pid; await dbUpsert('stock',p);
      registrarMovStock(p.id, p.nombre, -cant, 'venta', 'Venta registrada');
    }else if(tipo==='equipo'){
      const eid=parseInt(document.getElementById('vEq').value); const eq=S.equipos.find(e=>e.id===eid);
      if(!eq) return alert('Seleccioná un equipo'); eq.estado='vendido'; nombre=eq.modelo+' '+eq.memoria; costoU=eq.costo||0; await dbUpsert('equipos',eq);
    }else{ nombre=document.getElementById('vSDesc').value||'Servicio'; }
    const comPct = tipo==='equipo'?(parseFloat(document.getElementById('vCom').value)||0):0;
    const comision = tipo==='equipo'?Math.round(precio*cant*comPct/100):0;
    const item = {id:Date.now(),tipo,nombre,productoId,cantidad:cant,precio,total:cant*precio,costo:costoU*cant,metodo,fecha,comPct,comision};
    S.ventas.unshift(item); await dbUpsert('ventas',item); pushUndo('Registrar venta','ventas',snap);
  }
  closeM('mVenta'); rVentas(); showToast('Venta registrada ✓');
}

async function delVenta(id){
  if(!confirm('¿Eliminar esta venta? El stock se reintegrará automáticamente.')) return;
  const venta = S.ventas.find(v=>v.id===id);
  const snap = JSON.parse(JSON.stringify(S.ventas));
  const snapStock = JSON.parse(JSON.stringify(S.stock));
  // Reintegrar stock si era venta de producto
  if(venta && venta.tipo==='producto'){
    const prod = (venta.productoId ? S.stock.find(s=>s.id===venta.productoId) : null) || S.stock.find(s=>s.nombre===venta.nombre);
    if(prod){
      prod.cantidad += (venta.cantidad||1);
      prod.vendidos = Math.max(0,(prod.vendidos||0)-(venta.cantidad||1));
      await dbUpsert('stock', prod);
      registrarMovStock(prod.id, prod.nombre, +(venta.cantidad||1), 'devolucion', 'Venta cancelada');
    }
  }
  // Reintegrar equipo si era venta de equipo
  if(venta && venta.tipo==='equipo'){
    const eq = S.equipos.find(e=>e.modelo+' '+e.memoria===venta.nombre);
    if(eq){ eq.estado='disponible'; await dbUpsert('equipos',eq); }
  }
  S.ventas = S.ventas.filter(v=>v.id!==id);
  await dbDelete('ventas',id);
  pushUndo('Eliminar venta','ventas',snap);
  rVentas(); rStock();
}

function _ventaRow(v){
  const cuotasBadge = v.tipo==='cubierta'&&v.cuotas&&v.cuotas!=='contado'
    ? `<br><span style="font-size:.69rem;color:var(--ok)">🛞 ${v.cuotas==='3c'?'3 cuotas':v.cuotas==='6c'?'6 cuotas':'12 cuotas'}</span>` : '';
  // Desglose para ventas de equipos con trade-in
  let desglose = '';
  if(v.tipo==='equipo'){
    const ganancia = (v.precio||0) - (v.costo||0);
    const tieneTradeIn = v.tradeVal > 0;
    if(tieneTradeIn){
      desglose = `<br><span style="font-size:.69rem;color:var(--mut)">Lista: ${fmt(v.precio)} &nbsp;·&nbsp; Trade-in: -${fmt(v.tradeVal)} &nbsp;·&nbsp; </span><span style="font-size:.69rem;color:var(--ok)">Ganancia: ${fmt(ganancia)}</span>`;
    } else if(v.costo > 0){
      desglose = `<br><span style="font-size:.69rem;color:var(--ok)">Ganancia: ${fmt(ganancia)}</span>`;
    }
  }
  // Columna "Total" muestra lo cobrado en efectivo
  const totalDisplay = v.tipo==='equipo' && v.tradeVal > 0
    ? `<strong style="color:var(--gld)">${fmt(v.total)}</strong><br><span style="font-size:.65rem;color:var(--mut)">+${fmt(v.tradeVal)} en especie</span>`
    : `<strong style="color:var(--gld)">${fmt(v.tipo==='equipo'&&v.comision?v.comision:v.total)}</strong>`;
  return `<tr>
    <td>${fD(v.fecha)}</td>
    <td>${esc(v.nombre)}${desglose}${v.tipo==='equipo'&&v.comision?`<br><span style="font-size:.69rem;color:var(--ok)">Comisión ${v.comPct||0}%: ${fmt(v.comision)}</span>`:''}${cuotasBadge}</td>
    <td class="col-hide">${v.cantidad}</td><td class="col-hide">${fmt(v.precio)}</td>
    <td>${totalDisplay}</td>
    <td class="col-hide"><span class="bx bg2">${esc(v.metodo)}</span></td>
    <td style="display:flex;gap:3px"><button class="btn be bsm" onclick="openM('mVenta',${v.id})">✎</button><button class="btn bd bsm" onclick="delVenta(${v.id})">✕</button></td>
  </tr>`;
}
function _mostrarVentasAntiguas(){
  const row = document.getElementById('trVerMasVentas');
  if(!row) return;
  const frag = document.createDocumentFragment();
  (window._ventasAntiguas||[]).forEach(v=>{
    const tmp = document.createElement('tbody');
    tmp.innerHTML = _ventaRow(v);
    frag.appendChild(tmp.firstElementChild);
  });
  row.parentNode.insertBefore(frag, row);
  row.remove();
}
function rVentas(){
  const tb = document.getElementById('tbV');
  if(!S.ventas.length){ tb.innerHTML=`<tr><td colspan="7">${emp('💰','Sin ventas')}</td></tr>`; return; }
  const sorted = [...S.ventas].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  const corte = new Date(); corte.setDate(corte.getDate()-7); corte.setHours(0,0,0,0);
  const recientes = sorted.filter(v=>!v.fecha||new Date(v.fecha+'T00:00:00')>=corte);
  const antiguas  = sorted.filter(v=>v.fecha && new Date(v.fecha+'T00:00:00')<corte);
  window._ventasAntiguas = antiguas;
  let html = recientes.map(_ventaRow).join('');
  if(antiguas.length){
    html += `<tr id="trVerMasVentas"><td colspan="7" style="text-align:center;padding:8px 0">
      <button class="btn bg2 bsm" onclick="_mostrarVentasAntiguas()">Ver ${antiguas.length} venta${antiguas.length!==1?'s':''} anterior${antiguas.length!==1?'es':''} ▼</button>
    </td></tr>`;
  }
  tb.innerHTML = html;
}

// ═══ TALLER ═══
const ESTS = [{k:'recibido',l:'Recibido',c:'bbl'},{k:'proceso',l:'En proceso',c:'byw'},{k:'listo',l:'✓ Listo',c:'bgr'},{k:'entregado',l:'Entregado',c:'bgx'},{k:'sin_reparacion',l:'❌ Cancelado',c:'bgx'}];
let _tallerEntregadoExpanded = false;

const GUIAS_REP = {
  bateria: { k:['bateria','batería','no carga','carga lenta','no enciende'], t:'🔋 Cambio de batería', p:['Quitar tornillos pentalobe','Calentar bordes 30 seg para abrir','Desconectar batería ANTES que todo','Quitar adhesivo con paciencia','Colocar nueva batería y conectar','Testear carga y porcentaje','Cerrar y verificar sellos'] },
  pantalla: { k:['pantalla','display','vidrio','touch','rota','rajada','no se ve'], t:'📱 Cambio de pantalla', p:['Quitar tornillos pentalobe','Calentar bordes para separar','Desconectar batería primero','Desconectar flex de pantalla','Transferir cámara y sensor FaceID','Conectar nueva pantalla y testear touch','Armar y verificar Face ID'] },
  conector: { k:['conector','puerto','lightning','tipo c','no carga','pin','usb'], t:'🔌 Cambio de conector', p:['Desarmar equipo','Quitar placa con cuidado','Dessoldar conector viejo','Soldar nuevo conector','Testear con diferentes cables','Armar y verificar'] },
  camara: { k:['camara','cámara','foto','lente','borrosa','no enfoca'], t:'📸 Cambio de cámara', p:['Abrir equipo','Desconectar batería','Quitar módulo de cámara','Conectar nueva cámara','Testear foto y video antes de cerrar','Armar y verificar'] },
  microfono: { k:['microfono','micrófono','no se escucha','audio','no escucha'], t:'🎤 Reparación de micrófono', p:['Abrir equipo','Limpiar conector','Verificar hardware vs software','Reemplazar módulo si necesario','Testear llamada y grabación'] },
};

function sugerirGuia(val){
  const v = val.toLowerCase();
  const box = document.getElementById('guiaRep');
  const tit = document.getElementById('guiaTitulo');
  const pasos = document.getElementById('guiaPasos');
  if(!box) return;
  
  for(const [, g] of Object.entries(GUIAS_REP)){
    if(g.k.some(k=>v.includes(k))){
      tit.textContent = g.t;
      pasos.innerHTML = g.p.map(p=>`<li style="margin-bottom:4px">${p}</li>`).join('');
      box.style.display = 'block';
      return;
    }
  }
  box.style.display = 'none';
}

function autocompleteCliTurno(val){
  const box = document.getElementById('turnoCliSugg');
  if(!box) return;
  if(!val || val.length < 1){ box.style.display='none'; return; }
  const q = val.toLowerCase();
  const clientes = new Map();
  const addCli = (nombre, tel, servicio) => {
    if(!nombre) return;
    if(!nombre.toLowerCase().includes(q)) return;
    if(!clientes.has(nombre)) clientes.set(nombre, {tel:tel||'', servicio:''});
    if(servicio && !clientes.get(nombre).servicio) clientes.get(nombre).servicio = servicio;
  };
  (S.ventas||[]).forEach(v=>addCli(v.cliente, v.tel, ''));
  (S.reparaciones||[]).forEach(r=>addCli(r.cliente, r.tel, ''));
  if(getTurnos) getTurnos()
    .slice().sort((a,b)=>(b.fecha+b.hora).localeCompare(a.fecha+a.hora))
    .forEach(t=>addCli(t.cliente, t.tel, t.servicioNombre||''));
  const lista = [...clientes.entries()].slice(0,8);
  if(!lista.length){ box.style.display='none'; return; }
  box.style.display='block';
  box.innerHTML = lista.map(([nombre, {tel, servicio}])=>`
    <div onclick="selCliTurno('${esc(nombre).replace(/'/g,'\\\'').replace(/"/g,'&quot;')}','${esc(tel).replace(/'/g,'\\\'').replace(/"/g,'&quot;')}')"
      style="padding:9px 12px;cursor:pointer;border-bottom:1px solid var(--bor)"
      onmouseover="this.style.background='var(--car)'" onmouseout="this.style.background=''">
      <div style="font-size:.83rem;color:var(--tx)">${esc(nombre)}</div>
      <div style="font-size:.72rem;color:var(--mut);margin-top:2px">${tel?esc(tel):''}${servicio?' · '+esc(servicio):''}</div>
    </div>`).join('');
}
function selCliTurno(nombre, tel){
  const inp = document.getElementById('turnoCli');
  const box = document.getElementById('turnoCliSugg');
  if(inp) inp.value = nombre;
  if(box) box.style.display='none';
  if(tel){ const telInp = document.getElementById('turnoTel'); if(telInp && !telInp.value) telInp.value = tel; }
  mostrarFichaLinkTurno(nombre);

  // Pre-seleccionar servicio y empleado del último turno del cliente
  const historial = (getTurnos ? getTurnos() : [])
    .filter(t => (t.cliente||'').toLowerCase() === nombre.toLowerCase())
    .sort((a,b) => (b.fecha+b.hora).localeCompare(a.fecha+a.hora));
  if(!historial.length) return;
  const ultimo = historial[0];
  if(ultimo.servicioId){
    const srvSel = document.getElementById('turnoServicio');
    if(srvSel){
      const opt = [...srvSel.options].find(o=>String(o.value)===String(ultimo.servicioId));
      if(opt){ srvSel.value = opt.value; updateDuracionTurno(); }
    }
  }
  if(ultimo.empleadoId){
    const empSel = document.getElementById('turnoEmpleado');
    if(empSel){
      const opt = [...empSel.options].find(o=>String(o.value)===String(ultimo.empleadoId));
      if(opt) empSel.value = opt.value;
    }
  }
}

function mostrarFichaLinkTurno(nombre){
  const r = (currentTenant?.rubro||'').toLowerCase();
  const esSalonR = /barber|salon|belleza|peluq|manicur/i.test(r);
  const linkBox = document.getElementById('turnoFichaLink');
  if(!linkBox) return;
  if(!esSalonR || !nombre || nombre.length < 2){ linkBox.style.display='none'; return; }
  const ficha = getFichaCli(nombre);
  const colorTxt = ficha.colorCodigo ? `🎨 ${ficha.colorCodigo}` : '';
  const alergiaTxt = ficha.alergias ? `⚠️ ${ficha.alergias}` : '';
  const badges = [colorTxt, alergiaTxt].filter(Boolean).join(' · ');
  linkBox.style.display = 'block';
  linkBox.innerHTML = `<button type="button" onclick="abrirFichaCli('${nombre.replace(/'/g,"\\'")}');"
    style="background:none;border:none;padding:0;cursor:pointer;font-size:.75rem;color:var(--gld);font-family:var(--fb)">📋 Ver ficha${badges?` · ${badges}`:''}</button>`;
}
// Close turno autocomplete on outside click
document.addEventListener('click', function(e){
  const box = document.getElementById('turnoCliSugg');
  if(box && !box.contains(e.target) && e.target.id !== 'turnoCli') box.style.display='none';
});

function autocompleteCli(val){
  const box = document.getElementById('cliSugg');
  if(!val || val.length < 2){ box.style.display='none'; return; }
  const q = val.toLowerCase();
  const nombres = [...new Set([
    ...S.reparaciones.map(r=>r.cliente),
    ...(S.ventas||[]).map(v=>v.cliente)
  ].filter(c=>c&&c.toLowerCase().includes(q)))].slice(0,6);
  if(!nombres.length){ box.style.display='none'; return; }
  box.style.display='block';
  box.innerHTML = nombres.map(c=>`<div data-nombre="${esc(c)}" onclick="selCli(this.dataset.nombre)" style="padding:9px 12px;cursor:pointer;font-size:.83rem;border-bottom:1px solid var(--bor)">${esc(c)}</div>`).join('');
}
function selCli(nombre){
  document.getElementById('tCli').value = nombre;
  document.getElementById('cliSugg').style.display='none';
  const prev = [...S.reparaciones,...(S.ventas||[])].find(r=>r.cliente===nombre);
  if(prev && prev.tel) document.getElementById('tTel').value = prev.tel;
}

// Show ficha alerta in turno form
document.addEventListener('change', function(e){
  if(e.target.id==='turnoCli') checkFichaAlerta(e.target.value);
});

function calcGanTaller(){
  const pre = parseFloat(document.getElementById('tPre')?.value||0);
  const cosRep = parseFloat(document.getElementById('tCosRep')?.value||0);
  const flete = parseFloat(document.getElementById('tFlete')?.value||0);
  const sena = parseFloat(document.getElementById('tSena')?.value||0);
  const gan = pre - cosRep - flete;
  const pct = pre > 0 ? Math.round(gan/pre*100) : 0;
  const saldo = pre - sena;
  
  const ganVal = document.getElementById('tGanVal');
  const ganPct = document.getElementById('tGanPct');
  const ganBox = document.getElementById('tGanBox');
  const ganAlert = document.getElementById('tGanAlert');
  const saldoBox = document.getElementById('tSaldoBox');
  
  if(saldoBox) saldoBox.textContent = saldo > 0 ? 'Falta: ' + fmt(saldo) : saldo === 0 ? '✓ Pagado' : 'Exceso: ' + fmt(Math.abs(saldo));
  if(saldoBox) saldoBox.style.color = saldo <= 0 ? 'var(--ok)' : 'var(--wrn)';
  
  if(pre > 0){
    if(ganBox) ganBox.style.display='block';
    if(ganVal) ganVal.textContent = fmt(gan);
    if(ganVal) ganVal.style.color = gan>=0?'var(--ok)':'var(--bad)';
    if(ganPct) ganPct.textContent = pct+'%';
    if(ganPct) ganPct.style.color = pct>=50?'var(--ok)':pct>=30?'var(--wrn)':'var(--bad)';
    if(ganAlert){
      const minPrecio30 = cosRep + flete > 0 ? Math.ceil((cosRep+flete)/0.70) : 0;
      const sugerencia = pct < 30 && minPrecio30 > pre ? ` — Para 30%: ${fmt(minPrecio30)}` : '';
      ganAlert.textContent = (pct>=50?'✓ Buen margen':pct>=30?'⚠ Margen regular':'✕ Margen bajo') + sugerencia;
      ganAlert.style.background = pct>=50?'rgba(76,175,125,.15)':pct>=30?'rgba(201,148,76,.15)':'rgba(201,82,76,.15)';
      ganAlert.style.color = pct>=50?'var(--ok)':pct>=30?'var(--wrn)':'var(--bad)';
    }
  } else {
    if(ganBox) ganBox.style.display='none';
  }
}

async function saveTaller(){
  const id=document.getElementById('tId').value;
  const cli=document.getElementById('tCli').value.trim(); if(!cli) return alert('Ingresá el nombre del cliente');
  const snap=JSON.parse(JSON.stringify(S.reparaciones));
  const oldEstado = id ? (S.reparaciones.find(r=>r.id===parseInt(id))?.estado||'') : '';
  const costoRep=parseFloat(document.getElementById('tCosRep').value)||0;
  const flete=parseFloat(document.getElementById('tFlete').value)||0;
  const pre=parseFloat(document.getElementById('tPre').value)||0;
  const ganancia=pre-costoRep-flete; const margen=pre>0?Math.round(ganancia/pre*100):0;
  const obj={
    cliente:cli,
    tel:document.getElementById('tTel').value,
    pass:document.getElementById('tPass')?.value||'',
    tipoPass:document.getElementById('tTipoPass')?.value||'',
    equipo:document.getElementById('tEq').value,
    imei:document.getElementById('tIme').value,
    sena:parseFloat(document.getElementById('tSena')?.value)||0,
    falla:document.getElementById('tFal').value,
    presupuesto:pre,costoRep,flete,ganancia,margen,
    estado:document.getElementById('tEst').value,
    notas:document.getElementById('tNot').value,
    garantiaDias:parseInt(document.getElementById('tGarantia')?.value||30),
    fechaEnt:document.getElementById('tFechaEnt')?.value||'',
    diagnostico:document.getElementById('tDiagnostico')?.value||'',
    golpes:document.getElementById('tGolpes')?.value||'',
    humedad:document.getElementById('tHumedad')?.value||'',
    estPantalla:document.getElementById('tEstPantalla')?.value||'',
    estFisico:document.getElementById('tEstFisico')?.value||'excelente',
    accesorios:document.getElementById('tAccesorios')?.value||''
  };
  // Auto-registrar fecha de entrega si se marca como entregado sin fecha
  if(obj.estado==='entregado'&&!obj.fechaEnt) obj.fechaEnt=tod();
  if(id){
    const i=S.reparaciones.findIndex(r=>r.id===parseInt(id));
    if(i>-1){S.reparaciones[i]={...S.reparaciones[i],...obj};await dbUpsert('reparaciones',S.reparaciones[i]);pushUndo('Editar trabajo','reparaciones',snap);}
  }else{
    const item={id:Date.now(),...obj,historial:[{estado:obj.estado,nota:'Ingreso',fecha:tod()}],fecha:tod()};
    S.reparaciones.unshift(item);await dbUpsert('reparaciones',item);pushUndo('Nuevo trabajo','reparaciones',snap);
  }
  closeM('mTaller'); rTaller(); showToast('Trabajo guardado ✓');
  if(obj.estado==='listo' && oldEstado!=='listo'){
    const saved = id ? S.reparaciones.find(r=>r.id===parseInt(id)) : S.reparaciones[0];
    if(saved) showWA(saved);
  }
}

async function delRep(id){
  if(!confirm('¿Eliminar trabajo?')) return;
  const snap=JSON.parse(JSON.stringify(S.reparaciones));
  S.reparaciones=S.reparaciones.filter(r=>r.id!==id);await dbDelete('reparaciones',id);pushUndo('Eliminar trabajo','reparaciones',snap);rTaller();
}

function _toggleAvMetodo(){
  const ns = document.getElementById('avEst').value;
  const box = document.getElementById('avMetodoBox');
  if(box) box.style.display = ns === 'entregado' ? 'block' : 'none';
}

function openAv(id){
  avId=id; const r=S.reparaciones.find(r=>r.id===id);
  const est=ESTS.find(e=>e.k===r.estado);
  document.getElementById('avInfo').innerHTML=`<strong style="color:var(--tx)">${esc(r.cliente)}</strong> — ${esc(r.equipo||'trabajo')}<br>Estado actual: <span class="bx ${esc(est?.c||'bgx')}">${esc(est?.l||r.estado)}</span>`;
  document.getElementById('avEst').value=r.estado;document.getElementById('avNot').value='';document.getElementById('waH').style.display='none';
  _toggleAvMetodo();
  openM('mAv',null);
}

async function confAv(){
  const r=S.reparaciones.find(r=>r.id===avId);if(!r)return;
  const snap=JSON.parse(JSON.stringify(S.reparaciones));
  const ns=document.getElementById('avEst').value;
  r.estado=ns;r.historial=r.historial||[];r.historial.push({estado:ns,nota:document.getElementById('avNot').value,fecha:tod()});
  if(ns==='entregado'){
    if(!r.fechaEnt) r.fechaEnt=tod();
    const metodo = document.getElementById('avMetodo')?.value || 'Efectivo';
    r.metodoPago = metodo;
    r.metodo = metodo; // para compatibilidad con cierre diario
  }
  await dbUpsert('reparaciones',r);pushUndo('Avance taller','reparaciones',snap);
  closeM('mAv');rTaller();rCajas();if(ns==='listo')showWA(r);
}

function showWA(r){
  const bizName = currentTenant?.nombre || 'el negocio';
  const diag = r.diagnostico ? `\n\n🔧 *Qué se hizo:* ${r.diagnostico}` : '';
  const garantia = r.costoRep > 0 ? '\n\n✅ *Garantía:* 30 días por la reparación' : '';
  const msg=`Hola ${r.cliente} 👋\n\nTe avisamos desde *${bizName}* que tu equipo (*${r.equipo||'trabajo'}*) ya está *listo para retirar* ✅${diag}\n\n${r.presupuesto?`💰 *Total: ${fmt(r.presupuesto)}*\n`:''}${garantia}\n\nPodés pasar a buscarlo cuando quieras.\n\n¡Gracias por elegirnos! 🙌`;
  document.getElementById('waMB').textContent=msg;
  const tel=(r.tel||'').replace(/\D/g,'');
  document.getElementById('waLink').onclick=()=>window.open(`https://wa.me/549${tel}?text=${encodeURIComponent(msg)}`,'_blank');
  openM('mWA',null);
}

function cpWA(){ navigator.clipboard.writeText(document.getElementById('waMB').textContent).then(()=>alert('¡Copiado!')); }

function buscarTaller(q){
  const box = document.getElementById('tallerBusqueda');
  if(!q || q.length < 2){ box.style.display='none'; return; }
  const q2 = q.toLowerCase();
  const results = S.reparaciones.filter(r=>
    r.cliente?.toLowerCase().includes(q2) ||
    r.imei?.toLowerCase().includes(q2) ||
    r.equipo?.toLowerCase().includes(q2) ||
    r.tel?.includes(q2)
  );
  box.style.display = 'block';
  if(!results.length){
    box.innerHTML = '<div class="card" style="padding:12px;font-size:.82rem;color:var(--mut)">Sin resultados para "' + q + '"</div>';
    return;
  }
  const estados = {recibido:'bbl',proceso:'byw',listo:'bgr',entregado:'bgx'};
  box.innerHTML = '<div class="card" style="padding:12px">' +
    '<div style="font-size:.68rem;color:var(--mut);text-transform:uppercase;letter-spacing:.7px;margin-bottom:10px">' + results.length + ' resultado(s)</div>' +
    results.map(r=>`<div style="padding:8px 0;border-bottom:1px solid var(--bor);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
      <div>
        <div style="font-weight:600;font-size:.85rem">${esc(r.cliente)} — ${esc(r.equipo||'—')}</div>
        <div style="font-size:.75rem;color:var(--tx2);margin-top:2px">${esc(r.falla||'')} · ${fD(r.fecha)} ${r.imei?'· IMEI: '+esc(r.imei):''}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <span class="bx ${estados[r.estado]||'bgx'}">${r.estado}</span>
        <button class="btn be bsm" onclick="openM('mTaller',${r.id})">✎</button>
        ${r.tel?`<button class="btn bs bsm" onclick="showWA(S.reparaciones.find(x=>x.id===${r.id}))">📲</button>`:''}
      </div>
    </div>`).join('') + '</div>';
}

function verEstadisticasTaller(){
  const reps = S.reparaciones.filter(r=>r.estado==='entregado' && r.fecha);
  if(!reps.length){ showToast('Sin datos suficientes aún'); return; }

  // Tiempo promedio por tipo de trabajo
  const tiempos = {};
  reps.forEach(r=>{
    if(!r.falla || !r.fecha) return;
    const key = r.falla.slice(0,30);
    if(!tiempos[key]) tiempos[key] = {total:0, count:0};
    // Approximate: use created date vs delivered (we use fecha as received)
    tiempos[key].total += 2; // placeholder since we don't track delivery date separately
    tiempos[key].count++;
  });

  // Stats reales
  const totalReps = reps.length;
  const totalFact = reps.reduce((a,r)=>a+r.presupuesto,0);
  const totalGan = reps.reduce((a,r)=>a+(r.ganancia||0),0);
  const margenProm = totalFact > 0 ? Math.round(totalGan/totalFact*100) : 0;

  // Trabajos por tipo
  const porTipo = {};
  S.reparaciones.forEach(r=>{
    const tipo = r.falla?.split(' ').slice(0,3).join(' ') || 'Sin descripción';
    porTipo[tipo] = (porTipo[tipo]||0)+1;
  });
  const topTipos = Object.entries(porTipo).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Tiempo en taller por trabajo activo
  const activos = S.reparaciones.filter(r=>r.estado!=='entregado'&&r.fecha);
  const tiemposProm = activos.map(r=>({
    cliente: r.cliente,
    equipo: r.equipo,
    dias: Math.floor((new Date()-new Date(r.fecha+'T00:00:00'))/86400000)
  })).sort((a,b)=>b.dias-a.dias);

  const overlay = document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:350;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto';
  overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
  overlay.innerHTML=`<div style="background:var(--sur);border:1px solid var(--bor2);border-radius:14px;width:100%;max-width:500px;max-height:85vh;overflow-y:auto">
    <div style="padding:16px 20px;border-bottom:1px solid var(--bor);display:flex;justify-content:space-between;align-items:center">
      <div style="font-family:var(--fh);font-size:1rem;font-weight:700">📊 Estadísticas del taller</div>
      <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:var(--tx2);font-size:1.2rem;cursor:pointer">✕</button>
    </div>
    <div style="padding:16px 20px">
      <div class="g2" style="margin-bottom:16px">
        <div class="stat"><div class="sl">Trabajos entregados</div><div class="sv">${totalReps}</div></div>
        <div class="stat"><div class="sl">Facturado total</div><div class="sv" style="font-size:1.1rem;color:var(--gld)">${fmt(totalFact)}</div></div>
        <div class="stat"><div class="sl">Ganancia total</div><div class="sv" style="font-size:1.1rem;color:var(--ok)">${fmt(totalGan)}</div></div>
        <div class="stat"><div class="sl">Margen promedio</div><div class="sv" style="color:${margenProm>=40?'var(--ok)':margenProm>=25?'var(--wrn)':'var(--bad)'}">${margenProm}%</div></div>
      </div>

      <div style="font-size:.72rem;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px">🔝 Trabajos más frecuentes</div>
      ${topTipos.map(([tipo,cant])=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bor);font-size:.82rem">
        <span>${tipo}</span><span style="color:var(--gld);font-weight:600">${cant}</span>
      </div>`).join('')}

      ${tiemposProm.length?`<div style="font-size:.72rem;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.7px;margin-top:14px;margin-bottom:8px">⏱ Trabajos activos — días en taller</div>
      ${tiemposProm.slice(0,5).map(t=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bor);font-size:.82rem">
        <span>${esc(t.cliente)} — ${esc(t.equipo||'—')}</span>
        <span style="color:${t.dias>5?'var(--bad)':t.dias>2?'var(--wrn)':'var(--ok)'};font-weight:600">${t.dias}d</span>
      </div>`).join('')}`:''}
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function rEstadoLink(){
  const box = document.getElementById('estadoLinkBox');
  if(!box || !currentTenant) return;
  const link = window.location.origin + window.location.pathname + '?estado=' + currentTenant.id;
  box.innerHTML = `<div class="card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:12px 16px">
    <div>
      <div style="font-size:.78rem;font-weight:600;margin-bottom:2px">🔍 Link para que tus clientes consulten el estado de su equipo</div>
      <div style="font-size:.7rem;color:var(--tx2);word-break:break-all">${link}</div>
    </div>
    <div style="display:flex;gap:7px;flex-shrink:0">
      <button class="btn bgh bsm" onclick="navigator.clipboard.writeText('${link}');showToast('Link copiado ✓')">Copiar</button>
      <button class="btn bs bsm" onclick="window.open('${link}','_blank')">Ver →</button>
    </div>
  </div>`;
}

// Calcula y devuelve el chip HTML de garantía para una reparación
function _garantiaChip(r){
  if(!r.garantiaDias || r.garantiaDias === 0) return '';
  // La garantía de una reparación empieza al momento de la entrega.
  // No mostrar chip hasta que el trabajo esté entregado.
  if(r.estado !== 'entregado') return '';
  const fechaBase = r.fechaEnt || r.fecha;
  if(!fechaBase) return '';
  const vence = new Date(fechaBase + 'T00:00:00');
  vence.setDate(vence.getDate() + r.garantiaDias);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const diasRestantes = Math.floor((vence - hoy) / 86400000);
  const fechaStr = fD(vence.toISOString().slice(0,10));
  if(diasRestantes < 0){
    return `<div style="font-size:.68rem;margin-top:3px;padding:2px 7px;border-radius:4px;background:rgba(201,82,76,.13);color:var(--bad);border:1px solid rgba(201,82,76,.28);font-weight:600">
      🛡 Garantía vencida — ${fechaStr}
    </div>`;
  } else if(diasRestantes <= 7){
    return `<div style="font-size:.68rem;margin-top:3px;padding:2px 7px;border-radius:4px;background:rgba(201,148,76,.13);color:var(--wrn);border:1px solid rgba(201,148,76,.3);font-weight:600">
      🛡 Vence en ${diasRestantes}d — ${fechaStr}
    </div>`;
  } else {
    return `<div style="font-size:.68rem;margin-top:3px;padding:2px 7px;border-radius:4px;background:rgba(76,175,125,.08);color:var(--ok);border:1px solid rgba(76,175,125,.2)">
      🛡 Garantía hasta ${fechaStr}
    </div>`;
  }
}

function _repParada(r){
  const ACTIVOS = ['recibido','proceso','listo'];
  if(!ACTIVOS.includes(r.estado)) return false;
  const dias = r.fecha ? Math.floor((new Date()-new Date(r.fecha+'T00:00:00'))/86400000) : 0;
  return dias >= 7;
}

function _recordarClienteWA(id){
  const r = S.reparaciones.find(x=>x.id===id); if(!r||!r.tel) return;
  const biz = currentTenant?.nombre || 'el negocio';
  const dias = r.fecha ? Math.floor((new Date()-new Date(r.fecha+'T00:00:00'))/86400000) : 0;
  const ESTL = {recibido:'esperando diagnóstico',proceso:'en proceso de reparación',listo:'listo para retirar ✅'};
  const msg = `Hola ${r.cliente} 👋\n\nQueríamos avisarte desde *${biz}* que tu equipo (*${r.equipo||'trabajo'}*) lleva *${dias} días* en nuestro taller${r.falla?` por: ${r.falla}`:''} y está *${ESTL[r.estado]||r.estado}*.\n\n${r.presupuesto?`💰 Presupuesto: ${fmt(r.presupuesto)}\n\n`:''}¿Necesitás alguna info o podemos avanzar? Respondé este mensaje 🙏\n\n— *${biz}*`;
  const tel = (r.tel+'').replace(/\D/g,'');
  window.open(`https://wa.me/549${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  // Registrar el aviso en el registro
  r.ultimoAviso = tod();
  dbUpsert('reparaciones', r);
}

async function _recordarTodosWA(){
  const paradas = S.reparaciones.filter(_repParada);
  if(!paradas.length){ showToast('No hay trabajos parados','err'); return; }
  const conTel = paradas.filter(r=>r.tel);
  if(!conTel.length){ showToast('Ningún trabajo parado tiene teléfono cargado','err'); return; }
  _confirmarModal(`Enviar recordatorio WA a ${conTel.length} cliente${conTel.length!==1?'s':''} con trabajos parados?`, ()=>{
    conTel.forEach((r,i) => setTimeout(()=>_recordarClienteWA(r.id), i*400));
    showToast(`Enviando ${conTel.length} recordatorios... ✓`);
  });
}

function rTaller(){
  rEstadoLink();

  // Banner de trabajos parados
  const paradas = S.reparaciones.filter(_repParada);
  const bannerEl = document.getElementById('tallerBanner');
  if(bannerEl){
    if(paradas.length){
      const conTel = paradas.filter(r=>r.tel).length;
      bannerEl.style.display='';
      bannerEl.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;background:rgba(251,191,36,.09);border:1px solid rgba(251,191,36,.3);border-radius:9px;padding:10px 14px;margin-bottom:14px">
        <span style="font-size:.83rem;color:var(--wrn);font-weight:600">⏰ ${paradas.length} trabajo${paradas.length!==1?'s':''} sin movimiento hace 7+ días</span>
        ${conTel?`<button class="btn bsm" style="background:rgba(37,211,102,.15);color:#25D366;border-color:rgba(37,211,102,.4)" onclick="_recordarTodosWA()">📲 Avisar a todos (${conTel})</button>`:''}
      </div>`;
    } else {
      bannerEl.style.display='none';
      bannerEl.innerHTML='';
    }
  }

  document.getElementById('kan').innerHTML=ESTS.map(est=>{
    let reps = S.reparaciones.filter(r=>r.estado===est.k);
    if(!reps.length && est.k==='sin_reparacion') return ''; // ocultar columna cancelado si está vacía

    // Columna Entregado: mostrar solo últimas 10 si no está expandida
    let hayMas = false;
    let totalEntregado = reps.length;
    if(est.k==='entregado' && !_tallerEntregadoExpanded && reps.length > 10){
      reps = [...reps].sort((a,b)=>(b.id||0)-(a.id||0)).slice(0,10);
      hayMas = true;
    }

    return`<div class="kc"><div class="kct">${est.l} <span style="color:var(--mut)">(${totalEntregado})</span></div>
    ${reps.length?reps.map(r=>{
      const diasEnTaller = r.fecha ? Math.floor((new Date()-new Date(r.fecha+'T00:00:00'))/86400000) : 0;
      const parada = _repParada(r);
      const diasColor = parada?'var(--wrn)':diasEnTaller>5?'var(--bad)':diasEnTaller>2?'var(--wrn)':'var(--mut)';
      const diasUltimoAviso = r.ultimoAviso ? Math.floor((new Date()-new Date(r.ultimoAviso+'T00:00:00'))/86400000) : null;
      return`<div class="kk" style="${parada?'border-left:2px solid var(--wrn)':''}"><div class="kn">${r.cliente}</div>
      <div class="kd">${r.equipo||'—'}${r.imei?` <span style="font-size:.65rem;color:var(--mut)">· ${r.imei.slice(-6)}</span>`:''}</div>
      ${r.falla?`<div class="kd" style="margin-top:2px;font-style:italic">"${r.falla.slice(0,40)}"</div>`:''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;flex-wrap:wrap;gap:3px">
        <span style="font-size:.68rem;color:${diasColor}">${fD(r.fecha)}${diasEnTaller>0?` · ${diasEnTaller}d`:''}</span>
        ${r.presupuesto?`<span style="font-size:.74rem;color:var(--gld);font-weight:600">${fmt(r.presupuesto)}</span>`:''}
      </div>
      ${parada?`<div style="font-size:.68rem;margin-top:3px;padding:2px 7px;border-radius:4px;background:rgba(251,191,36,.1);color:var(--wrn);border:1px solid rgba(251,191,36,.25);display:flex;justify-content:space-between;align-items:center">
        <span>⏰ ${diasEnTaller}d sin mover${diasUltimoAviso!==null?` · Aviso hace ${diasUltimoAviso}d`:''}</span>
        ${r.tel?`<span style="cursor:pointer;text-decoration:underline" onclick="event.stopPropagation();_recordarClienteWA(${r.id})">📲 Recordar</span>`:''}
      </div>`:''}
      ${r.ganancia!=null&&r.presupuesto?`<div style="font-size:.7rem;margin-top:3px;padding:3px 6px;border-radius:4px;background:${r.margen>=50?'rgba(74,222,128,.12)':r.margen>=30?'rgba(250,204,21,.12)':'rgba(248,113,113,.12)'};color:${r.margen>=50?'var(--ok)':r.margen>=30?'var(--wrn)':'var(--bad)'};font-weight:600">
        Gan: ${fmt(r.ganancia)} · ${r.margen}% ${r.margen>=50?'✓':r.margen>=30?'⚠':'✕'}${r.metodoPago?` <span style="font-weight:400;color:var(--tx2)">${r.metodoPago}</span>`:''}
      </div>`:''}
      ${_garantiaChip(r)}
      <div class="ka">
        ${est.k!=='sin_reparacion'?`<button class="btn bgh bsm" onclick="openAv(${r.id})">Avanzar</button>`:''}
        <button class="btn be bsm" onclick="openM('mTaller',${r.id})">✎</button>
        ${r.tel&&!parada?`<button class="btn bs bsm" onclick="showWA(S.reparaciones.find(x=>x.id===${r.id}))">📲</button>`:''}
        ${r.estado==='recibido'?`<button class="btn bgh bsm" onclick="generarPresupuestoPDF(${r.id})">📋</button>`:''}
        <button class="btn bgh bsm" onclick="generarOrdenTrabajoPDF(${r.id})" title="Orden de trabajo">📄</button>
        <button class="btn bgh bsm" onclick="generarEtiquetaTaller(${r.id})" title="Imprimir etiqueta">🏷️</button>
        <button class="btn bd bsm" onclick="delRep(${r.id})">✕</button>
      </div>
      </div>`;
    }).join(''):`<div style="color:var(--mut);font-size:.74rem;padding:7px 0">Sin órdenes</div>`}
    ${hayMas?`<div style="text-align:center;padding:8px 0"><button class="btn bsm" style="font-size:.75rem;color:var(--tx2)" onclick="_tallerEntregadoExpanded=true;rTaller()">Ver todos (${totalEntregado}) →</button></div>`:''}
    ${est.k==='entregado'&&_tallerEntregadoExpanded&&totalEntregado>10?`<div style="text-align:center;padding:8px 0"><button class="btn bsm" style="font-size:.75rem;color:var(--tx2)" onclick="_tallerEntregadoExpanded=false;rTaller()">↑ Mostrar menos</button></div>`:''}</div>`;
  }).join('');
}

// ═══ PEDIDOS (Taller) ═══
let _pedFiltro = 'todos';
let _pedItemsCount = 0;

// Devuelve la lista de ítems de un pedido. Compatibilidad con pedidos viejos
// que solo tenían un campo "producto"+"precio" (sin lista de ítems).
function _pedidoItems(p){
  if(p.items && p.items.length) return p.items;
  return [{nombre:p.producto||'', cantidad:1, precio:p.precio||0}];
}
function _pedidoTotal(p){
  return _pedidoItems(p).reduce((a,it)=>a+(it.cantidad||1)*(it.precio||0), 0);
}

function _pedItemRowHtml(idx, nombre, cantidad, precio){
  return `<div class="ped-item-row" data-idx="${idx}" style="display:flex;gap:6px;margin-bottom:6px;align-items:center">
    <input class="ped-item-nombre" placeholder="Producto" value="${esc(nombre||'')}" oninput="_recalcTotalPedido()" style="flex:3">
    <input type="number" class="ped-item-cant" placeholder="Cant" value="${cantidad||1}" min="1" oninput="_recalcTotalPedido()" style="flex:1;min-width:55px">
    <input type="number" class="ped-item-precio" placeholder="Precio c/u" value="${precio||0}" min="0" oninput="_recalcTotalPedido()" style="flex:1.5;min-width:80px">
    <button type="button" class="btn bd bsm" onclick="quitarItemPedido(${idx})">✕</button>
  </div>`;
}

function agregarItemPedido(nombre, cantidad, precio){
  const cont = document.getElementById('pedItemsList');
  const idx = _pedItemsCount++;
  cont.insertAdjacentHTML('beforeend', _pedItemRowHtml(idx, nombre, cantidad, precio));
  _recalcTotalPedido();
}

function quitarItemPedido(idx){
  const row = document.querySelector(`.ped-item-row[data-idx="${idx}"]`);
  if(row) row.remove();
  if(!document.querySelectorAll('.ped-item-row').length) agregarItemPedido();
  _recalcTotalPedido();
}

function _recalcTotalPedido(){
  let total = 0;
  document.querySelectorAll('.ped-item-row').forEach(row=>{
    const cant = parseFloat(row.querySelector('.ped-item-cant').value)||0;
    const precio = parseFloat(row.querySelector('.ped-item-precio').value)||0;
    total += cant*precio;
  });
  const disp = document.getElementById('pedTotalDisplay');
  if(disp) disp.textContent = fmt(total);
}

function _leerItemsPedido(){
  const items = [];
  document.querySelectorAll('.ped-item-row').forEach(row=>{
    const nombre = (row.querySelector('.ped-item-nombre').value||'').trim();
    const cantidad = parseFloat(row.querySelector('.ped-item-cant').value)||1;
    const precio = parseFloat(row.querySelector('.ped-item-precio').value)||0;
    if(nombre) items.push({nombre, cantidad, precio});
  });
  return items;
}

function _onPedTipoChange(){
  const tipo = document.getElementById('pedTipo').value;
  const lbl = document.getElementById('pedNombreLbl');
  const telLbl = document.querySelector('#pedTelWrap label');
  if(tipo==='proveedor'){
    lbl.textContent = 'Proveedor';
    if(telLbl) telLbl.textContent = 'WhatsApp del proveedor (sin 0, sin 15)';
  } else {
    lbl.textContent = 'Nombre del cliente';
    if(telLbl) telLbl.textContent = 'WhatsApp (sin 0, sin 15)';
  }
}

function enviarPedidoWA(id){
  const p = S.pedidos.find(x => String(x.id) === String(id));
  if(!p || !p.tel) return;
  const items = _pedidoItems(p);
  const lineas = items.map(it=>`• ${it.nombre}${(it.cantidad||1)>1?' x'+it.cantidad:''}${it.precio>0?' — '+fmt(it.precio*(it.cantidad||1)):''}`).join('\n');
  const negocio = currentTenant?.nombre || '';
  const msg = `Hola! Te paso un pedido${negocio?' de '+negocio:''}:\n\n${lineas}\n\nGracias!`;
  window.open(`https://wa.me/${p.tel}?text=${encodeURIComponent(msg)}`, '_blank');
}

function rPedidos(){
  const todos = S.pedidos;
  const filtered = _pedFiltro === 'todos' ? todos : todos.filter(p => p.estado === _pedFiltro);

  // Sort: pendiente → llego → entregado; dentro de cada grupo por fecha desc
  const ORD = { pendiente:0, llego:1, entregado:2 };
  filtered.sort((a,b) => {
    const d = (ORD[a.estado]||0) - (ORD[b.estado]||0);
    return d !== 0 ? d : (b.fecha||'').localeCompare(a.fecha||'');
  });

  // Badge con pedidos activos (pendiente + llego)
  const activos = todos.filter(p => p.estado !== 'entregado').length;
  const badge = document.getElementById('pedidosBadge');
  if(badge){ badge.textContent = activos; badge.style.display = activos ? '' : 'none'; }

  const el = document.getElementById('pedidosList');
  if(!el) return;

  if(!filtered.length){
    el.innerHTML = `<div class="card">${emp('📋', _pedFiltro === 'todos' ? 'No hay pedidos aún. Creá el primero.' : 'No hay pedidos en este estado.')}</div>`;
    return;
  }

  const EI = {
    pendiente: { label:'⏳ Pendiente', bg:'rgba(201,148,76,.12)', color:'var(--wrn)', bdr:'rgba(201,148,76,.3)' },
    llego:     { label:'📦 Llegó',      bg:'rgba(76,142,201,.12)', color:'var(--inf)', bdr:'rgba(76,142,201,.3)' },
    entregado: { label:'✅ Entregado',  bg:'rgba(76,175,125,.1)',  color:'var(--ok)',  bdr:'rgba(76,175,125,.25)' }
  };

  el.innerHTML = filtered.map(p => {
    const esProveedor = p.tipo === 'proveedor';
    const ei = Object.assign({}, EI[p.estado] || EI.pendiente);
    if(esProveedor && p.estado==='entregado') ei.label = '✅ Recibido';
    const waHref = p.tel ? `<a href="https://wa.me/${p.tel}" target="_blank" style="color:var(--ok);text-decoration:none">📱 ${esc(p.tel)}</a>` : '';
    const btnFinal = esProveedor ? '✅ Recibido' : '✅ Entregado';
    const btnEnviarWA = (esProveedor && p.tel)
      ? `<button class="btn bsm" style="background:rgba(76,175,125,.15);color:var(--ok);border:1px solid rgba(76,175,125,.3)" onclick="enviarPedidoWA('${p.id}')">📲 Enviar pedido</button>`
      : '';
    const btns = p.estado === 'pendiente'
      ? `${btnEnviarWA}
         <button class="btn bsm" style="background:rgba(76,142,201,.15);color:var(--inf);border:1px solid rgba(76,142,201,.3)" onclick="marcarPedidoLlego('${p.id}')">📦 Llegó</button>
         <button class="btn be bsm" onclick="editarPedido('${p.id}')">✎</button>
         <button class="btn bd bsm" onclick="eliminarPedido('${p.id}')">✕</button>`
      : p.estado === 'llego'
      ? `${btnEnviarWA}
         <button class="btn bsm" style="background:rgba(76,175,125,.15);color:var(--ok);border:1px solid rgba(76,175,125,.3)" onclick="marcarPedidoEntregado('${p.id}')">${btnFinal}</button>
         <button class="btn bd bsm" onclick="eliminarPedido('${p.id}')">✕</button>`
      : `<button class="btn bd bsm" onclick="eliminarPedido('${p.id}')">✕</button>`;

    const items = _pedidoItems(p);
    const itemsHtml = items.map(it=>`<div>📦 ${esc(it.nombre)}${(it.cantidad||1)>1?' ×'+it.cantidad:''}${it.precio>0?' — '+fmt(it.precio*(it.cantidad||1)):''}</div>`).join('');
    const total = _pedidoTotal(p);

    return `<div class="card" style="margin-bottom:10px;border-left:3px solid ${ei.bdr}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
            <span style="font-weight:700;font-size:.95rem">${esc(p.nombre)}</span>
            ${esProveedor ? `<span style="padding:2px 8px;border-radius:10px;font-size:.7rem;font-weight:600;background:rgba(201,168,76,.12);color:var(--gld);border:1px solid rgba(201,168,76,.3)">📦 Proveedor</span>` : ''}
            <span style="padding:2px 8px;border-radius:10px;font-size:.7rem;font-weight:600;background:${ei.bg};color:${ei.color};border:1px solid ${ei.bdr}">${ei.label}</span>
          </div>
          <div style="font-size:.88rem;color:var(--tx);margin-bottom:5px">${itemsHtml}</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:.78rem;color:var(--tx2)">
            ${waHref ? `<span>${waHref}</span>` : ''}
            <span>📅 ${fD(p.fecha)}</span>
            ${total > 0 ? `<span style="color:var(--gld);font-weight:600">${fmt(total)}</span>` : ''}
            ${p.notas ? `<span style="color:var(--mut)">💬 ${esc(p.notas)}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;align-items:center">${btns}</div>
      </div>
    </div>`;
  }).join('');
}

function setPedFiltro(filtro, btn){
  _pedFiltro = filtro;
  document.querySelectorAll('#sec-pedidos .tab').forEach(t => t.classList.remove('active'));
  if(btn) btn.classList.add('active');
  rPedidos();
}

function abrirNuevoPedido(){
  document.getElementById('pedId').value       = '';
  document.getElementById('pedTipo').value     = 'cliente';
  document.getElementById('pedNombre').value   = '';
  document.getElementById('pedTel').value      = '';
  document.getElementById('pedFecha').value    = tod();
  document.getElementById('pedNotas').value    = '';
  document.getElementById('pedItemsList').innerHTML = '';
  _pedItemsCount = 0;
  agregarItemPedido();
  _onPedTipoChange();
  document.getElementById('mPedidoTitle').textContent = '📋 Nuevo pedido';
  openM('mPedido');
}

async function guardarPedido(){
  const id     = document.getElementById('pedId').value;
  const tipo   = document.getElementById('pedTipo').value || 'cliente';
  const nombre = (document.getElementById('pedNombre').value||'').trim();
  const telRaw = (document.getElementById('pedTel').value||'').replace(/\D/g,'');
  const tel    = telRaw ? (telRaw.startsWith('54') ? telRaw : telRaw.startsWith('0') ? '54' + telRaw.slice(1) : '54' + telRaw) : '';
  const fecha  = document.getElementById('pedFecha').value || tod();
  const notas  = (document.getElementById('pedNotas').value||'').trim();
  const items  = _leerItemsPedido();

  if(!nombre){ showToast(tipo==='proveedor' ? 'Ingresá el nombre del proveedor' : 'Ingresá el nombre del cliente'); return; }
  if(!items.length){ showToast('Agregá al menos un ítem'); return; }

  const precio   = items.reduce((a,it)=>a+(it.cantidad||1)*(it.precio||0), 0);
  const producto = items.map(it=>it.nombre).join(', ');

  if(id){
    const idx = S.pedidos.findIndex(p => String(p.id) === String(id));
    if(idx >= 0){
      S.pedidos[idx] = { ...S.pedidos[idx], tipo, nombre, tel, items, producto, precio, fecha, notas };
      await dbUpsertPedido(S.pedidos[idx]);
    }
  } else {
    const item = { id: Date.now(), tipo, nombre, tel, items, producto, precio, fecha, notas, estado:'pendiente', created_at: new Date().toISOString() };
    S.pedidos.unshift(item);
    await dbUpsertPedido(item);
  }
  closeM('mPedido');
  rPedidos();
  showToast(id ? 'Pedido actualizado ✓' : 'Pedido creado ✓');
}

function editarPedido(id){
  const p = S.pedidos.find(x => String(x.id) === String(id));
  if(!p) return;
  document.getElementById('pedId').value       = p.id;
  document.getElementById('pedTipo').value     = p.tipo||'cliente';
  document.getElementById('pedNombre').value   = p.nombre||'';
  document.getElementById('pedTel').value      = p.tel||'';
  document.getElementById('pedFecha').value    = p.fecha||tod();
  document.getElementById('pedNotas').value    = p.notas||'';
  document.getElementById('pedItemsList').innerHTML = '';
  _pedItemsCount = 0;
  _pedidoItems(p).forEach(it=>agregarItemPedido(it.nombre, it.cantidad, it.precio));
  _onPedTipoChange();
  document.getElementById('mPedidoTitle').textContent = '✎ Editar pedido';
  document.getElementById('mPedido').classList.add('open');
}

async function marcarPedidoLlego(id){
  const p = S.pedidos.find(x => String(x.id) === String(id));
  if(!p) return;
  p.estado = 'llego';
  p.fechaLlego = tod();
  await dbUpsertPedido(p);
  rPedidos();

  if(p.tel){
    const negocio = currentTenant?.nombre || 'la tienda';
    const itemsTxt = _pedidoItems(p).map(it=>it.nombre).join(', ');
    const msg = `Hola ${p.nombre}! Te avisamos que tu pedido (${itemsTxt}) llegó a ${negocio}. Pasá cuando quieras a retirarlo! 📦`;
    setTimeout(() => window.open(`https://wa.me/${p.tel}?text=${encodeURIComponent(msg)}`, '_blank'), 400);
    showToast('¡Llegó! Abriendo WhatsApp…');
  } else {
    showToast('Pedido marcado como llegado ✓');
  }
}

// Encargo de cliente entregado: se registra como venta (suma a Ventas/caja)
// y descuenta stock SOLO si el ítem ya existe en el inventario con stock suficiente.
// Si no hay match (era una compra especial que nunca se cargó al stock), no se toca el inventario.
async function _entregarPedidoCliente(p){
  const items = _pedidoItems(p);
  for(let i=0; i<items.length; i++){
    const it = items[i];
    if(!it.nombre) continue;
    const cantidad = it.cantidad||1;
    let costo = 0;
    const match = (S.stock||[]).find(s=>(s.nombre||'').trim().toLowerCase()===it.nombre.trim().toLowerCase());
    if(match && match.cantidad >= cantidad){
      match.cantidad -= cantidad;
      match.vendidos = (match.vendidos||0) + cantidad;
      costo = (match.costo||0) * cantidad;
      await dbUpsert('stock', match);
      registrarMovStock(match.id, match.nombre, -cantidad, 'venta', 'Pedido entregado: '+p.nombre);
    }
    const venta = {id:Date.now()+i, tipo:'producto', nombre:it.nombre, cantidad, precio:it.precio||0, total:cantidad*(it.precio||0), costo, metodo:'Efectivo', fecha:tod(), comPct:0, comision:0};
    const okVp = await dbUpsert('ventas', venta);
    if(okVp) S.ventas.unshift(venta);
  }
  if(typeof rVentas==='function') rVentas();
  if(typeof rStock==='function') rStock();
}

// Pedido a proveedor recibido: los ítems se suman al stock (o se crean si no existían).
async function _recibirPedidoProveedor(p){
  const items = _pedidoItems(p);
  for(const it of items){
    if(!it.nombre) continue;
    const cantidad = it.cantidad||1;
    const match = (S.stock||[]).find(s=>(s.nombre||'').trim().toLowerCase()===it.nombre.trim().toLowerCase());
    if(match){
      match.cantidad = (match.cantidad||0) + cantidad;
      if(it.precio>0) match.costo = it.precio;
      await dbUpsert('stock', match);
      registrarMovStock(match.id, match.nombre, cantidad, 'ajuste', 'Recibido de proveedor: '+p.nombre);
    } else {
      const nuevo = {id:Date.now()+Math.floor(Math.random()*1000), tenant_id: currentTenant.id, nombre:it.nombre, categoria:'General', cantidad, minimo:3, precio:0, costo:it.precio||0, vendidos:0, notas:'Agregado desde pedido a proveedor'};
      const okN = await dbUpsert('stock', nuevo);
      if(okN) S.stock.push(nuevo);
      registrarMovStock(nuevo.id, nuevo.nombre, cantidad, 'ajuste', 'Recibido de proveedor: '+p.nombre);
    }
  }
  if(typeof rStock==='function') rStock();
}

async function marcarPedidoEntregado(id){
  const p = S.pedidos.find(x => String(x.id) === String(id));
  if(!p) return;
  const estadoOrig = p.estado;
  const fechaOrig  = p.fechaEntregado;
  p.estado = 'entregado';
  p.fechaEntregado = tod();

  if(p.tipo === 'proveedor'){
    await _recibirPedidoProveedor(p);
    const ok = await dbUpsertPedido(p);
    if(!ok){ p.estado = estadoOrig; p.fechaEntregado = fechaOrig; showToast('Error al guardar — verificá tu conexión','err'); return; }
    rPedidos();
    showToast('Pedido recibido — stock actualizado ✓');
  } else {
    await _entregarPedidoCliente(p);
    const ok = await dbUpsertPedido(p);
    if(!ok){ p.estado = estadoOrig; p.fechaEntregado = fechaOrig; showToast('Error al guardar — verificá tu conexión','err'); return; }
    rPedidos();
    showToast('Pedido entregado — registrado en ventas ✓');
  }
}

function eliminarPedido(id){
  _confirmarModal('¿Eliminar este pedido?', async () => {
    S.pedidos = S.pedidos.filter(p => String(p.id) !== String(id));
    await dbDelete('pedidos', id);
    rPedidos();
    showToast('Pedido eliminado ✓');
  });
}

