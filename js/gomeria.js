// ═══ GOMERÍA — CUBIERTAS ═══════════════════════════════════════════════════
async function dbLoadCubiertas(){
  try{
    const { data, error } = await sb.from('cubiertas').select('*').eq('tenant_id', currentTenant.id).order('created_at', { ascending: true });
    if(error) throw error;
    return (data||[]).map(r => ({ id:r.id, medida:r.medida||'', marca:r.marca||'', segmento:r.segmento||'Media', stock:r.stock||0, minimo:r.minimo??2, costo:r.costo||0, precio_contado:r.precio_contado||0, precio_3c:r.precio_3c||0, precio_6c:r.precio_6c||0, precio_12c:r.precio_12c||0 }));
  }catch(e){ console.error('[cubiertas] load error', e); return []; }
}

async function dbUpsertCubierta(c){
  setSyncing();
  try{
    const row = { id:c.id, tenant_id: currentTenant.id, medida:c.medida, marca:c.marca, segmento:c.segmento, stock:c.stock, minimo:c.minimo??2, costo:c.costo, precio_contado:c.precio_contado, precio_3c:c.precio_3c, precio_6c:c.precio_6c, precio_12c:c.precio_12c };
    const { error } = await sb.from('cubiertas').upsert(row, { onConflict: 'id' });
    if(error) throw error;
    setSynced(); return true;
  }catch(e){ console.error('[cubiertas] upsert error', e); setSyncErr(e?.message||''); return false; }
}

async function dbDeleteCubierta(id){
  setSyncing();
  try{
    const { error } = await sb.from('cubiertas').delete().eq('id', id).eq('tenant_id', currentTenant.id);
    if(error) throw error;
    setSynced(); return true;
  }catch(e){ console.error('[cubiertas] delete error', e); setSyncErr(); return false; }
}

function _getCuotasCfg(){
  const v = dbGetConfig('gomCuotas');
  if(!v) return {};
  if(typeof v === 'string'){ try{ return JSON.parse(v)||{}; }catch(e){ return {}; } }
  return (typeof v === 'object') ? v : {};
}
function _cubCoefs(){ const c=_getCuotasCfg(); return { c3: c.c3||1.15, c6: c.c6||1.30, c12: c.c12||1.60 }; }
function _calcCuotas(contado){ const {c3,c6,c12}=_cubCoefs(); return { p3: Math.round(contado*c3), p6: Math.round(contado*c6), p12: Math.round(contado*c12) }; }

function _cubAutoCalc(){
  const contado = parseFloat(document.getElementById('cubContado')?.value)||0;
  if(!contado) return;
  const {p3,p6,p12} = _calcCuotas(contado);
  ['cubP3','cubP6','cubP12'].forEach((id,i)=>{ const el=document.getElementById(id); if(el&&!el.dataset.manual) el.value=[p3,p6,p12][i]; });
}
function _cubResetCuotas(){
  ['cubP3','cubP6','cubP12'].forEach(id=>{ const el=document.getElementById(id); if(el) delete el.dataset.manual; });
  _cubAutoCalc();
}

async function _guardarCuotasCfg(){
  const c3 = parseFloat(document.getElementById('cubC3')?.value)||1.15;
  const c6 = parseFloat(document.getElementById('cubC6')?.value)||1.30;
  const c12 = parseFloat(document.getElementById('cubC12')?.value)||1.60;
  const prev = _getCuotasCfg();
  const cambiaron = prev.c3!==c3 || prev.c6!==c6 || prev.c12!==c12;
  dbSetConfig('gomCuotas', {c3,c6,c12});
  // actualizar ejemplo
  const e = 100000;
  const el3=document.getElementById('cubEjC3'), el6=document.getElementById('cubEjC6'), el12=document.getElementById('cubEjC12');
  if(el3) el3.textContent=fmt(Math.round(e*c3));
  if(el6) el6.textContent=fmt(Math.round(e*c6));
  if(el12) el12.textContent=fmt(Math.round(e*c12));
  // recalcular cubiertas existentes si cambiaron los coeficientes
  if(cambiaron && S.cubiertas && S.cubiertas.length){
    const confirmar = confirm(`¿Actualizar los precios de cuotas de todas tus cubiertas (${S.cubiertas.length}) con los nuevos coeficientes?\n\nEsto recalcula 3c/6c/12c a partir del precio contado de cada una.`);
    if(confirmar){
      showToast('Actualizando cubiertas...');
      let actualizadas = 0;
      for(const cub of S.cubiertas){
        if(!cub.precio_contado) continue;
        const nuevo3c = Math.round(cub.precio_contado * c3);
        const nuevo6c = Math.round(cub.precio_contado * c6);
        const nuevo12c = Math.round(cub.precio_contado * c12);
        if(cub.precio_3c===nuevo3c && cub.precio_6c===nuevo6c && cub.precio_12c===nuevo12c) continue;
        cub.precio_3c = nuevo3c;
        cub.precio_6c = nuevo6c;
        cub.precio_12c = nuevo12c;
        await dbUpsertCubierta(cub);
        actualizadas++;
      }
      showToast(`✓ Coeficientes guardados — ${actualizadas} cubierta${actualizadas!==1?'s':''} actualizadas`);
      rCubiertas();
      return;
    }
  }
  showToast('Coeficientes guardados ✓');
  rCubiertas();
}

function rCubiertas(){
  const cfg = _getCuotasCfg();
  const c3 = cfg.c3||1.15, c6=cfg.c6||1.30, c12=cfg.c12||1.60;
  ['cubC3','cubC6','cubC12'].forEach((id,i)=>{ const el=document.getElementById(id); if(el) el.value=[c3,c6,c12][i]; });
  const ej=100000;
  ['cubEjC3','cubEjC6','cubEjC12'].forEach((id,i)=>{ const el=document.getElementById(id); if(el) el.textContent=fmt(Math.round(ej*[c3,c6,c12][i])); });

  const q = (document.getElementById('cubQ')?.value||'').toLowerCase();
  const seg = document.getElementById('cubFSegmento')?.value||'';
  let lista = S.cubiertas.filter(c =>
    (!q || c.medida.toLowerCase().includes(q) || c.marca.toLowerCase().includes(q)) &&
    (!seg || c.segmento === seg)
  );

  const badge = document.getElementById('cubBadge');
  if(badge){ badge.textContent=S.cubiertas.length; badge.style.display=S.cubiertas.length?'':'none'; }

  // Banner de stock bajo
  const banner = document.getElementById('cubStockBanner');
  if(banner){
    const bajas = S.cubiertas.filter(c=>c.stock <= (c.minimo??2));
    if(bajas.length){
      const items = bajas.slice(0,5).map(c=>`${esc(c.medida)}${c.marca?' '+esc(c.marca):''} (${c.stock} ud${c.stock!==1?'s':''})`).join(', ');
      banner.innerHTML = `⚠ <strong>${bajas.length} cubierta${bajas.length!==1?'s':''} con stock bajo:</strong> ${items}${bajas.length>5?` y ${bajas.length-5} más`:''}`;
      banner.style.display='block';
    } else { banner.style.display='none'; }
  }

  const tbody = document.getElementById('cubTbody');
  const empty = document.getElementById('cubEmpty');
  if(!tbody) return;

  if(!lista.length){
    tbody.innerHTML='';
    if(empty) empty.style.display='';
    return;
  }
  if(empty) empty.style.display='none';

  const segColor = {Económica:'var(--ok)',Media:'var(--inf)',Premium:'var(--gld)',Deportiva:'#b08ad4',Moto:'var(--wrn)'};
  tbody.innerHTML = lista.map(c => {
    const margen = c.precio_contado > 0 && c.costo > 0 ? Math.round((c.precio_contado-c.costo)/c.precio_contado*100) : null;
    const min = c.minimo??2;
    const stockColor = c.stock <= 0 ? 'var(--bad)' : c.stock <= min ? 'var(--wrn)' : 'var(--ok)';
    return `<tr style="border-bottom:1px solid var(--bor)">
      <td style="padding:9px 8px;font-weight:700;color:var(--tx);white-space:nowrap">${esc(c.medida)}</td>
      <td style="padding:9px 8px;color:var(--tx)">${esc(c.marca)}</td>
      <td style="padding:9px 8px"><span style="font-size:.72rem;font-weight:600;color:${segColor[c.segmento]||'var(--tx2)'};background:${segColor[c.segmento]||'var(--tx2)'}18;padding:2px 8px;border-radius:10px">${esc(c.segmento)}</span></td>
      <td style="padding:9px 8px;text-align:right;font-weight:700;color:${stockColor}">${c.stock}</td>
      <td style="padding:9px 8px;text-align:right;color:var(--tx2)">${fmt(c.costo)}</td>
      <td style="padding:9px 8px;text-align:right;font-weight:700;color:var(--gld)">${fmt(c.precio_contado)}${margen!==null?`<div style="font-size:.65rem;color:var(--ok);font-weight:400">${margen}% mg</div>`:''}</td>
      <td style="padding:9px 8px;text-align:right;color:var(--tx2)">${fmt(c.precio_3c)}</td>
      <td style="padding:9px 8px;text-align:right;color:var(--tx2)">${fmt(c.precio_6c)}</td>
      <td style="padding:9px 8px;text-align:right;color:var(--tx2)">${fmt(c.precio_12c)}</td>
      <td style="padding:9px 8px;white-space:nowrap">
        <button class="btn bsm" style="color:var(--ok);border-color:rgba(76,175,125,.3);background:rgba(76,175,125,.08)" onclick="abrirVentaDesdeCubierta('${c.id}')">🛒 Vender</button>
        <button class="btn bsm" style="color:var(--inf);border-color:rgba(100,149,237,.3);background:rgba(100,149,237,.08)" onclick="abrirReposicion('${c.id}')">📦 Reponer</button>
        <button class="btn bsm" style="color:var(--tx2);border-color:rgba(100,149,237,.3);background:rgba(100,149,237,.08)" onclick="abrirPresupuestoGom('${c.id}')">📋</button>
        <button class="btn bsm be" onclick="abrirFormCubierta('${c.id}')">✎</button>
        <button class="btn bsm" style="color:var(--bad);border-color:rgba(201,82,76,.3);background:rgba(201,82,76,.08)" onclick="eliminarCubierta('${c.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');
}

async function _iniciarCubiertas(){
  S.cubiertas = await dbLoadCubiertas();
  rCubiertas();
  rGomDashboard();
}

// ─── Dashboard Gomería ────────────────────────────────────────────────────────
async function rGomDashboard(){
  const el = document.getElementById('gomDashboard');
  const alertEl = document.getElementById('gomStockAlert');
  if(!el) return;

  const hoy = tod();
  // Cargar historial de hoy
  const { data: srvHoy } = await sb.from('historial_gomeria')
    .select('precio,pago').eq('tenant_id', currentTenant.id).eq('fecha', hoy);

  const countHoy    = srvHoy?.length || 0;
  const ingresosHoy = (srvHoy||[]).reduce((s,r)=>s+(r.precio||0), 0);
  const criticos    = (S.cubiertas||[]).filter(c => c.stock <= (c.minimo??2));
  const { count: pedPend } = await sb.from('pedidos_gomeria')
    .select('*', {count:'exact', head:true})
    .eq('tenant_id', currentTenant.id).eq('estado_ped','pendiente');

  const stat = (icon, label, val, color='var(--tx)') => `
    <div style="background:var(--bg2);border:1px solid var(--bor);border-radius:10px;padding:12px 14px">
      <div style="font-size:1.1rem">${icon}</div>
      <div style="font-size:1.3rem;font-weight:800;color:${color};margin:4px 0">${val}</div>
      <div style="font-size:.72rem;color:var(--tx2)">${label}</div>
    </div>`;

  el.innerHTML =
    stat('🔧', 'Servicios hoy', countHoy, 'var(--tx)') +
    stat('💰', 'Ingresos hoy', '$'+ingresosHoy.toLocaleString('es-AR'), 'var(--ok)') +
    stat('⚠️', 'Stock crítico', criticos.length, criticos.length ? 'var(--bad)' : 'var(--ok)') +
    stat('📦', 'Pedidos pend.', pedPend||0, pedPend ? 'var(--wrn)' : 'var(--ok)');

  // Alerta detallada de stock crítico
  if(alertEl){
    if(criticos.length){
      alertEl.innerHTML = `⚠ <strong>${criticos.length} cubierta${criticos.length>1?'s':''} con stock bajo o agotado:</strong> ` +
        criticos.map(c=>`${esc(c.medida)} ${c.marca||''} (stock: ${c.stock}, mín: ${c.minimo??2})`).join(' · ');
      alertEl.style.display = 'block';
    } else {
      alertEl.style.display = 'none';
    }
  }
}

// ── Listas personalizables por tenant ────────────────────────────────────────
const _GOM_MARCAS_DEF = ['Fate','Pirelli','Bridgestone','Michelin','Goodyear','Continental','Yokohama','Toyo','Dunlop','Hankook'];
const _GOM_SERV_DEF   = ['Cambio de cubiertas','Rotación de cubiertas','Reparación de pinchadura','Alineación y balanceo','Cambio de aceite','Cambio de filtros','Reparación tren delantero','Cambio de amortiguadores'];

function _getGomMarcas(){
  const v = dbGetConfig('gomMarcas');
  if(!v) return _GOM_MARCAS_DEF;
  if(typeof v === 'string'){ try{ return JSON.parse(v)||_GOM_MARCAS_DEF; }catch(e){ return _GOM_MARCAS_DEF; } }
  return Array.isArray(v) ? v : _GOM_MARCAS_DEF;
}
function _getGomServicios(){
  const v = dbGetConfig('gomServicios');
  if(!v) return _GOM_SERV_DEF;
  if(typeof v === 'string'){ try{ return JSON.parse(v)||_GOM_SERV_DEF; }catch(e){ return _GOM_SERV_DEF; } }
  return Array.isArray(v) ? v : _GOM_SERV_DEF;
}
function _saveGomMarcas(l){ dbSetConfig('gomMarcas', l); }
function _saveGomServicios(l){ dbSetConfig('gomServicios', l); }

function abrirGomListas(){
  rGomListas();
  const cfg = _getPresupConfig();
  document.getElementById('gomPresupVigencia').value = cfg.vigencia||48;
  document.getElementById('gomPresupTel').value = cfg.tel||'';
  const el = document.getElementById('mGomListas');
  if(el) el.classList.add('open');
}
function rGomListas(){
  const marcas = _getGomMarcas();
  const servs  = _getGomServicios();
  const rowStyle = 'display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--bor2)';
  document.getElementById('gomListaMarcas').innerHTML = marcas.length
    ? marcas.map((m,i)=>`<div style="${rowStyle}"><span style="font-size:.85rem">${esc(m)}</span><button class="btn bsm be" onclick="_delGomMarca(${i})">✕</button></div>`).join('')
    : '<div style="color:var(--mut);font-size:.8rem;padding:6px 0">Sin marcas. Agregá una abajo.</div>';
  document.getElementById('gomListaServicios').innerHTML = servs.length
    ? servs.map((s,i)=>`<div style="${rowStyle}"><span style="font-size:.85rem">${esc(s)}</span><button class="btn bsm be" onclick="_delGomServicio(${i})">✕</button></div>`).join('')
    : '<div style="color:var(--mut);font-size:.8rem;padding:6px 0">Sin servicios.</div>';
}
function _delGomMarca(i){ const l=_getGomMarcas(); l.splice(i,1); _saveGomMarcas(l); rGomListas(); }
function _delGomServicio(i){ const l=_getGomServicios(); l.splice(i,1); _saveGomServicios(l); rGomListas(); }
function _addGomMarca(){
  const v=document.getElementById('gomNuevaMarca').value.trim();
  if(!v) return;
  const l=_getGomMarcas();
  if(l.map(x=>x.toLowerCase()).includes(v.toLowerCase())){ showToast('Ya está en la lista','err'); return; }
  l.push(v); _saveGomMarcas(l);
  document.getElementById('gomNuevaMarca').value='';
  rGomListas();
  showToast(`"${v}" agregada ✓`);
}
function _addGomServicio(){
  const v=document.getElementById('gomNuevoServicio').value.trim();
  if(!v) return;
  const l=_getGomServicios();
  if(l.map(x=>x.toLowerCase()).includes(v.toLowerCase())){ showToast('Ya está en la lista','err'); return; }
  l.push(v); _saveGomServicios(l);
  document.getElementById('gomNuevoServicio').value='';
  rGomListas();
  showToast(`"${v}" agregado ✓`);
}
function _confirmarNuevoTipo(){
  const v=document.getElementById('srvGomTipoCustom').value.trim();
  if(!v){ showToast('Escribí el nombre del servicio','err'); return; }
  const l=_getGomServicios();
  if(!l.map(x=>x.toLowerCase()).includes(v.toLowerCase())){ l.push(v); _saveGomServicios(l); showToast(`"${v}" guardado en tu lista ✓`); }
  const sel=document.getElementById('srvGomTipo');
  let opt=[...sel.options].find(o=>o.value===v);
  if(!opt){ opt=new Option(v,v); sel.insertBefore(opt, sel.options[sel.options.length-1]); }
  sel.value=v;
  document.getElementById('srvGomTipoOtroBox').style.display='none';
  document.getElementById('srvGomCubiertasBloque').style.display='none';
}

function abrirFormCubierta(id=null){
  const c = id ? S.cubiertas.find(x=>x.id===id) : null;
  openM('mCubierta', id); // primero reset, luego seteamos para que los selects no vuelvan a index 0
  document.getElementById('mCubTitle').textContent = c ? 'Editar cubierta' : 'Nueva cubierta';
  document.getElementById('cubId').value = c?.id||'';
  document.getElementById('cubMedida').value = c?.medida||'';
  document.getElementById('cubMarca').value = c?.marca||'';
  document.getElementById('cubMarcasSug').innerHTML = _getGomMarcas().map(m=>`<option value="${esc(m)}">`).join('');
  document.getElementById('cubSegmento').value = c?.segmento||'Media';
  document.getElementById('cubStock').value = c?.stock??0;
  document.getElementById('cubMinimo').value = c?.minimo??2;
  document.getElementById('cubCosto').value = c?.costo||'';
  document.getElementById('cubContado').value = c?.precio_contado||'';
  document.getElementById('cubP3').value = c?.precio_3c||'';
  document.getElementById('cubP6').value = c?.precio_6c||'';
  document.getElementById('cubP12').value = c?.precio_12c||'';
}

async function guardarCubierta(){
  const medida = (document.getElementById('cubMedida').value||'').trim();
  const marca = (document.getElementById('cubMarca').value||'').trim();
  if(!medida){ showToast('Ingresá la medida','err'); return; }
  const contado = parseFloat(document.getElementById('cubContado').value)||0;
  let p3 = parseFloat(document.getElementById('cubP3').value)||0;
  let p6 = parseFloat(document.getElementById('cubP6').value)||0;
  let p12 = parseFloat(document.getElementById('cubP12').value)||0;
  if(!p3 && contado){ const cp=_calcCuotas(contado); p3=cp.p3; p6=cp.p6; p12=cp.p12; }
  const existId = document.getElementById('cubId').value;
  const c = {
    id: existId || crypto.randomUUID(),
    medida, marca,
    segmento: document.getElementById('cubSegmento').value||'Media',
    stock: parseInt(document.getElementById('cubStock').value)||0,
    minimo: parseInt(document.getElementById('cubMinimo').value)||2,
    costo: parseFloat(document.getElementById('cubCosto').value)||0,
    precio_contado: contado, precio_3c: p3, precio_6c: p6, precio_12c: p12
  };
  closeM('mCubierta');
  const ok = await dbUpsertCubierta(c);
  if(!ok){ showToast('Error al guardar. Verificá conexión.','err'); return; }
  if(existId){ S.cubiertas = S.cubiertas.map(x=>x.id===existId?c:x); }
  else { S.cubiertas.push(c); }
  showToast((existId?'Cubierta actualizada':'Cubierta agregada')+' ✓');
  rCubiertas();
}

async function eliminarCubierta(id){
  if(!confirm('¿Eliminar esta cubierta del stock?')) return;
  const ok = await dbDeleteCubierta(id);
  if(!ok){ showToast('Error al eliminar','err'); return; }
  S.cubiertas = S.cubiertas.filter(c=>c.id!==id);
  showToast('Cubierta eliminada');
  rCubiertas();
}

// ═══ GOMERÍA — CLIENTES ════════════════════════════════════════════════════

async function dbLoadClientesGomeria(){
  try{
    const { data, error } = await sb.from('clientes_gomeria').select('*').eq('tenant_id', currentTenant.id).order('created_at', { ascending: true });
    if(error) throw error;
    return (data||[]).map(r=>({
      id:r.id, patente:r.patente||'', nombre:r.nombre||'', tel:r.tel||'',
      instagram:r.instagram||'', km:r.km||0, marca_veh:r.marca_veh||'', modelo:r.modelo||'', notas:r.notas||'',
      saldo:r.saldo||0
    }));
  }catch(e){ console.error('[clientesGomeria] load error', e); return []; }
}

async function dbUpsertClienteGomeria(c){
  setSyncing();
  try{
    const row = { id:c.id, tenant_id:currentTenant.id, patente:c.patente, nombre:c.nombre, tel:c.tel, instagram:c.instagram||null, km:c.km, marca_veh:c.marca_veh, modelo:c.modelo, notas:c.notas, saldo:c.saldo||0 };
    const { error } = await sb.from('clientes_gomeria').upsert(row, { onConflict: 'id' });
    if(error) throw error;
    setSynced(); return true;
  }catch(e){ console.error('[clientesGomeria] upsert error', e); setSyncErr(e?.message||''); return false; }
}

async function dbDeleteClienteGomeria(id){
  setSyncing();
  try{
    await sb.from('historial_gomeria').delete().eq('cliente_id', id).eq('tenant_id', currentTenant.id);
    const { error } = await sb.from('clientes_gomeria').delete().eq('id', id).eq('tenant_id', currentTenant.id);
    if(error) throw error;
    setSynced(); return true;
  }catch(e){ console.error('[clientesGomeria] delete error', e); setSyncErr(); return false; }
}

async function dbLoadHistorialGomeria(clienteId){
  try{
    const { data, error } = await sb.from('historial_gomeria').select('*').eq('tenant_id', currentTenant.id).eq('cliente_id', clienteId).order('fecha', { ascending: false });
    if(error) throw error;
    return (data||[]).map(r=>({
      id:r.id, cliente_id:r.cliente_id, fecha:r.fecha||'', km:r.km||0,
      tipo:r.tipo||'', medida:r.medida||'', marca:r.marca||'',
      cant_cubiertas:r.cant_cubiertas||0, km_rotacion:r.km_rotacion||0,
      precio:r.precio||0, pago:r.pago||'Efectivo', obs:r.obs||'',
      prox_servicio:r.prox_servicio||'', prox_fecha:r.prox_fecha||null, prox_km:r.prox_km||0
    }));
  }catch(e){ console.error('[historialGomeria] load error', e); return []; }
}

async function dbUpsertServicioGomeria(s){
  setSyncing();
  try{
    const row = { id:s.id, tenant_id:currentTenant.id, cliente_id:s.cliente_id||null, fecha:s.fecha, km:s.km, tipo:s.tipo, medida:s.medida, marca:s.marca, cant_cubiertas:s.cant_cubiertas, km_rotacion:s.km_rotacion, precio:s.precio, pago:s.pago, obs:s.obs, prox_servicio:s.prox_servicio||'', prox_fecha:s.prox_fecha||null, prox_km:s.prox_km||0 };
    const { error } = await sb.from('historial_gomeria').insert(row);
    if(error) throw error;
    setSynced(); return true;
  }catch(e){
    console.warn('[historialGomeria] insert con prox_* falló:', e?.message, '— reintentando sin campos nuevos');
    // Fallback: si los campos nuevos aún no existen en el schema cache, guardamos sin ellos
    try{
      const rowBase = { id:s.id, tenant_id:currentTenant.id, cliente_id:s.cliente_id, fecha:s.fecha, km:s.km, tipo:s.tipo, medida:s.medida, marca:s.marca, cant_cubiertas:s.cant_cubiertas, km_rotacion:s.km_rotacion, precio:s.precio, pago:s.pago, obs:s.obs };
      const { error:e2 } = await sb.from('historial_gomeria').insert(rowBase);
      if(e2) throw e2;
      setSynced(); return true;
    }catch(e2){ console.error('[historialGomeria] upsert error', e2); setSyncErr(e2?.message||''); return false; }
  }
}

async function dbDeleteServicioGomeria(id){
  setSyncing();
  try{
    const { error } = await sb.from('historial_gomeria').delete().eq('id', id).eq('tenant_id', currentTenant.id);
    if(error) throw error;
    setSynced(); return true;
  }catch(e){ console.error('[historialGomeria] delete error', e); setSyncErr(); return false; }
}

// ─── Pedidos (Proveedor / Cliente) → Supabase ────────────────────────────────
let _pedGomTab  = 'prov';
let _pedGomCart = [];  // items temporales antes de crear el pedido

function pedSetTab(t){
  _pedGomTab  = t;
  _pedGomCart = [];
  _pedRenderCart();
  const activo   = t==='prov' ? 'pedTabProv' : 'pedTabCli';
  const inactivo = t==='prov' ? 'pedTabCli'  : 'pedTabProv';
  document.getElementById(activo).style.cssText   += ';background:var(--gld);color:#000;font-weight:700';
  document.getElementById(inactivo).style.cssText += ';background:var(--bg2);color:var(--tx2);font-weight:400';
  document.getElementById('pedHdrProv').style.display   = t==='prov' ? 'grid' : 'none';
  document.getElementById('pedHdrCli').style.display    = t==='cli'  ? 'flex' : 'none';
  document.getElementById('pedCostoRow').style.display  = t==='prov' ? 'flex' : 'none';
  document.getElementById('pedNotasBox').style.display  = t==='cli'  ? 'block': 'none';
  document.getElementById('pedICant').value = t==='prov' ? 4 : 1;
}

function _pedAddItem(){
  const desc  = document.getElementById('pedIDesc').value.trim();
  const marca = document.getElementById('pedIMarca').value.trim();
  const cant  = parseInt(document.getElementById('pedICant').value)||1;
  const costo = parseFloat(document.getElementById('pedICosto')?.value)||0;
  if(!desc){ showToast('Ingresá medida o descripción','err'); return; }
  _pedGomCart.push({ desc, marca, cant, costo });
  document.getElementById('pedIDesc').value='';
  document.getElementById('pedIMarca').value='';
  document.getElementById('pedICant').value = _pedGomTab==='prov' ? 4 : 1;
  document.getElementById('pedICosto').value='';
  _pedRenderCart();
}

function _pedRenderCart(){
  const el = document.getElementById('pedCartList');
  const ct = document.getElementById('pedCartCount');
  if(!el) return;
  if(!_pedGomCart.length){
    el.innerHTML='<div style="font-size:.75rem;color:var(--mut);padding:4px 0">Sin ítems aún — agregá al menos uno</div>';
    if(ct) ct.textContent='';
    return;
  }
  if(ct) ct.textContent = `(${_pedGomCart.length})`;
  el.innerHTML = _pedGomCart.map((it,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg);border:1px solid var(--bor);border-radius:7px;font-size:.8rem">
      <div style="flex:1">
        <span style="font-weight:600">${esc(it.desc)}</span>${it.marca?` — ${esc(it.marca)}`:''}
        <span style="color:var(--tx2)">× ${it.cant}</span>
        ${it.costo ? `<span style="color:var(--tx2)"> · $${it.costo.toLocaleString()} c/u</span>` : ''}
      </div>
      <button onclick="_pedDelItem(${i})" style="background:none;border:none;color:var(--mut);cursor:pointer;font-size:.85rem;padding:0 4px">✕</button>
    </div>`).join('');
}

function _pedDelItem(i){ _pedGomCart.splice(i,1); _pedRenderCart(); }

function pedOnCliChange(){
  const sel   = document.getElementById('pedCliSel');
  const cid   = sel.value;
  const c     = (S.clientesGomeria||[]).find(x=>x.id===cid);
  document.getElementById('pedCliNombre').value = c ? (c.nombre||c.patente||'') : '';
  document.getElementById('pedCliTel').value    = c ? (c.tel||'') : '';
}

async function _loadPedidosGom(){
  try{
    const { data, error } = await sb.from('pedidos_gomeria')
      .select('*').eq('tenant_id', currentTenant.id)
      .eq('estado_ped','pendiente').order('created_at',{ascending:true});
    if(error) throw error;
    return data||[];
  }catch(e){ console.error('[pedidosGom] load error', e); return []; }
}

async function abrirPedidosGom(){
  // Poblar select de clientes
  const selCli = document.getElementById('pedCliSel');
  if(selCli){
    selCli.innerHTML = '<option value="">— Seleccionar cliente</option>' +
      (S.clientesGomeria||[])
        .sort((a,b)=>(a.patente||'').localeCompare(b.patente||''))
        .map(c=>`<option value="${c.id}">${esc(c.patente||'')}${c.nombre?' — '+esc(c.nombre):''}</option>`)
        .join('');
  }
  // Sugerir proveedores existentes
  const { data: prevPed } = await sb.from('pedidos_gomeria')
    .select('prov_nombre').eq('tenant_id', currentTenant.id)
    .eq('tipo','proveedor').not('prov_nombre','eq','');
  const sugg = document.getElementById('pedProvSugg');
  if(sugg && prevPed){
    const nombres = [...new Set(prevPed.map(p=>p.prov_nombre).filter(Boolean))];
    sugg.innerHTML = nombres.map(n=>`<option value="${esc(n)}">`).join('');
  }
  pedSetTab('prov');
  _pedGomCart = [];
  _pedRenderCart();
  await rPedidosGom();
  openM('mPedidosGom');
}

async function agregarPedidoGom(){
  if(!_pedGomCart.length){ showToast('Agregá al menos un ítem primero','err'); return; }
  const esP = _pedGomTab === 'prov';
  const row = {
    tenant_id: currentTenant.id,
    tipo: esP ? 'proveedor' : 'cliente',
    items: JSON.stringify(_pedGomCart),
    fecha_est: document.getElementById('pedFechaEst').value||null,
    estado_ped: 'pendiente'
  };
  if(esP){
    const prov = document.getElementById('pedProvNombre').value.trim();
    if(!prov){ showToast('Ingresá el nombre del proveedor','err'); return; }
    row.prov_nombre = prov;
    row.prov_tel    = document.getElementById('pedProvTel').value.trim();
  } else {
    const cid = document.getElementById('pedCliSel').value;
    if(!cid){ showToast('Seleccioná un cliente','err'); return; }
    row.cliente_id     = cid;
    row.cliente_nombre = document.getElementById('pedCliNombre').value;
    row.cliente_tel    = document.getElementById('pedCliTel').value;
    row.notas          = document.getElementById('pedNotasVal').value.trim();
  }
  const { error } = await sb.from('pedidos_gomeria').insert(row);
  if(error){ showToast('Error al guardar','err'); console.error(error); return; }
  _pedGomCart = [];
  _pedRenderCart();
  document.getElementById('pedProvNombre').value='';
  document.getElementById('pedProvTel').value='';
  document.getElementById('pedCliSel').value='';
  document.getElementById('pedCliNombre').value='';
  document.getElementById('pedCliTel').value='';
  document.getElementById('pedFechaEst').value='';
  showToast(esP ? 'Pedido a proveedor registrado ✓' : 'Encargo de cliente registrado ✓');
  await rPedidosGom();
}

async function rPedidosGom(){
  const el = document.getElementById('pedGomLista');
  if(!el) return;
  el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--mut);font-size:.8rem">Cargando...</div>';
  const lista = await _loadPedidosGom();
  if(!lista.length){ el.innerHTML='<div style="text-align:center;padding:20px;color:var(--mut);font-size:.82rem">Sin pedidos pendientes 🎉</div>'; return; }
  const hoy = tod();
  let html = '';

  // ── PROVEEDORES ──
  const provPeds = lista.filter(p=>p.tipo==='proveedor');
  if(provPeds.length){
    const grupos = {};
    provPeds.forEach(p=>{ const k=p.prov_nombre||'Sin proveedor'; (grupos[k]=grupos[k]||[]).push(p); });
    Object.entries(grupos).forEach(([prov, peds])=>{
      const tel      = peds.find(p=>p.prov_tel)?.prov_tel || '';
      const telNum   = tel.replace(/\D/g,'');
      const allItems = peds.flatMap(p=>{ try{ return JSON.parse(p.items||'[]'); }catch(e){ return []; } });
      const fechaMin = peds.map(p=>p.fecha_est).filter(Boolean).sort()[0];
      const vencido  = fechaMin && fechaMin < hoy;
      // Armar mensaje WA
      const negocio  = currentTenant?.nombre || 'La gomería';
      let waMsg  = `*Pedido — ${negocio}*\n📦 Para: ${prov}\n\n`;
      allItems.forEach(it=>{ waMsg += `• ${it.desc}${it.marca?' '+it.marca:''} × ${it.cant}${it.costo?' ($'+it.costo.toLocaleString()+' c/u)':''}\n`; });
      if(fechaMin) waMsg += `\nLlegada estimada: ${_fmtFechaCorta(fechaMin)}`;
      waMsg += `\nConfirmame disponibilidad y precio. Gracias!`;
      const waUrl = tel ? `https://wa.me/549${telNum}?text=${encodeURIComponent(waMsg)}` : `https://wa.me/?text=${encodeURIComponent(waMsg)}`;

      html += `<div style="border:1px solid var(--bor);border-radius:10px;overflow:hidden;margin-bottom:10px">
        <div style="padding:10px 14px;background:var(--bg2);display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div>
            <div style="font-weight:700;font-size:.88rem">📦 ${esc(prov)}</div>
            ${tel?`<div style="font-size:.72rem;color:var(--tx2)">📱 ${esc(tel)}</div>`:''}
            ${fechaMin?`<div style="font-size:.72rem;color:${vencido?'var(--bad)':'var(--tx2)'}">${vencido?'⚠ Venció':'Est.'}: ${_fmtFechaCorta(fechaMin)}</div>`:''}
          </div>
          <a href="${waUrl}" target="_blank" style="display:flex;align-items:center;gap:5px;padding:7px 12px;background:rgba(37,211,102,.12);color:#25d366;border:1px solid rgba(37,211,102,.3);border-radius:7px;font-size:.75rem;font-weight:600;text-decoration:none;flex-shrink:0">📤 Enviar todo a ${esc(prov)} por WA</a>
        </div>
        <div style="padding:8px 14px">
          ${allItems.map(it=>`<div style="font-size:.8rem;padding:4px 0;border-bottom:1px solid var(--bor2)">${esc(it.desc)}${it.marca?' — '+esc(it.marca):''} <span style="color:var(--tx2)">× ${it.cant}</span>${it.costo?` <span style="color:var(--tx2)">$${it.costo.toLocaleString()}</span>`:''}</div>`).join('')}
        </div>
        <div style="padding:8px 14px;display:flex;gap:6px;flex-wrap:wrap">
          ${peds.map(p=>`<button class="btn bsm" style="background:rgba(76,175,125,.1);color:var(--ok);border:1px solid rgba(76,175,125,.3)" onclick="recibirPedidoGom('${p.id}')">✓ Recibir pedido #${peds.indexOf(p)+1}</button>`).join('')}
          ${peds.map(p=>`<button class="btn bsm" style="color:var(--bad);border-color:rgba(201,82,76,.3);background:rgba(201,82,76,.08)" onclick="eliminarPedidoGom('${p.id}')">🗑</button>`).join('')}
        </div>
      </div>`;
    });
  }

  // ── CLIENTES ──
  const cliPeds = lista.filter(p=>p.tipo==='cliente');
  if(cliPeds.length){
    html += `<div style="font-size:.72rem;color:var(--tx2);text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin:10px 0 6px">🚗 Encargos de clientes</div>`;
    cliPeds.forEach(p=>{
      const items    = (()=>{ try{ return JSON.parse(p.items||'[]'); }catch(e){ return []; } })();
      const tel      = p.cliente_tel||'';
      const telNum   = tel.replace(/\D/g,'');
      const vencido  = p.fecha_est && p.fecha_est < hoy;
      const negocio  = currentTenant?.nombre || 'La gomería';
      const itemsStr = items.map(it=>`${it.desc}${it.marca?' '+it.marca:''} × ${it.cant}`).join(', ');
      const waMsg    = `Hola${p.cliente_nombre?' '+p.cliente_nombre:''}! 🛞\nTu encargo llegó: *${itemsStr}*.\nPasá cuando quieras a buscarlo.\n${negocio}`;
      const waUrl    = tel ? `https://wa.me/549${telNum}?text=${encodeURIComponent(waMsg)}` : '';
      html += `<div style="border:1px solid var(--bor);border-radius:10px;overflow:hidden;margin-bottom:8px">
        <div style="padding:10px 14px;background:var(--bg2);display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div>
            <div style="font-weight:700;font-size:.88rem">🚗 ${esc(p.cliente_nombre||'Cliente')}</div>
            ${p.notas?`<div style="font-size:.72rem;color:var(--tx2)">📝 ${esc(p.notas)}</div>`:''}
            ${p.fecha_est?`<div style="font-size:.72rem;color:${vencido?'var(--bad)':'var(--tx2)'}">${vencido?'⚠ Venció':'Est.'}: ${_fmtFechaCorta(p.fecha_est)}</div>`:''}
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end">
            ${waUrl?`<a href="${waUrl}" target="_blank" style="display:flex;align-items:center;gap:4px;padding:6px 10px;background:rgba(37,211,102,.12);color:#25d366;border:1px solid rgba(37,211,102,.3);border-radius:7px;font-size:.73rem;font-weight:600;text-decoration:none">📱 Avisar por WA</a>`:''}
            <button class="btn bsm" style="background:rgba(76,175,125,.1);color:var(--ok);border:1px solid rgba(76,175,125,.3)" onclick="recibirPedidoGom('${p.id}')">✓ Llegó / Entregado</button>
          </div>
        </div>
        <div style="padding:8px 14px">
          ${items.map(it=>`<div style="font-size:.8rem;padding:3px 0;border-bottom:1px solid var(--bor2)">${esc(it.desc)}${it.marca?' — '+esc(it.marca):''} <span style="color:var(--tx2)">× ${it.cant}</span></div>`).join('')}
        </div>
        <div style="padding:6px 14px">
          <button class="btn bsm" style="color:var(--bad);border-color:rgba(201,82,76,.3);background:rgba(201,82,76,.08)" onclick="eliminarPedidoGom('${p.id}')">🗑 Eliminar</button>
        </div>
      </div>`;
    });
  }
  el.innerHTML = html || '<div style="text-align:center;padding:20px;color:var(--mut);font-size:.82rem">Sin pedidos pendientes 🎉</div>';
}

async function recibirPedidoGom(pid){
  await sb.from('pedidos_gomeria').update({estado_ped:'recibido'}).eq('id',pid).eq('tenant_id',currentTenant.id);
  showToast('Pedido marcado como recibido ✓');
  await rPedidosGom();
}

async function eliminarPedidoGom(pid){
  if(!confirm('¿Eliminar este pedido?')) return;
  await sb.from('pedidos_gomeria').delete().eq('id',pid).eq('tenant_id',currentTenant.id);
  await rPedidosGom();
}

// ─── Cierre del día gomería (Feature 3) ──────────────────────────────────────
function cierreGomeria(){
  const hoy = tod();
  const negocio = currentTenant?.nombre || 'Gomería';
  const ventasHoy = S.ventas.filter(v=>v.fecha===hoy);
  const srvHoy = (S.historialGomeria||[]).filter(h=>h.fecha===hoy);
  const total = ventasHoy.reduce((a,v)=>a+v.total,0);
  const mets={};
  ventasHoy.forEach(v=>{ const m=v.metodo||'Efectivo'; mets[m]=(mets[m]||0)+v.total; });
  const cubRow = ventasHoy.filter(v=>v.tipo==='cubierta').map(v=>`<tr><td>${esc(v.nombre)}</td><td style="text-align:center">${v.cantidad||1}</td><td style="text-align:right">${fmt(v.total)}</td></tr>`).join('');
  const srvRow = srvHoy.map(s=>`<tr><td>${esc(s.tipo)}</td><td>${esc(s.medida||'')}</td><td style="text-align:right">${s.precio?fmt(s.precio):'—'}</td></tr>`).join('');
  const pagRow = Object.entries(mets).map(([m,t])=>`<tr><td>${m}</td><td style="text-align:right;font-weight:700">${fmt(t)}</td></tr>`).join('');
  const w = window.open('','_blank','width=650,height=850');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cierre del día</title>
  <style>body{font-family:Arial,sans-serif;padding:28px;color:#222;max-width:560px;margin:auto}
  h2{margin:0 0 2px;font-size:1.3rem}p{margin:3px 0;color:#555;font-size:.88rem}
  h3{margin:18px 0 6px;font-size:.9rem;text-transform:uppercase;letter-spacing:.5px;color:#555;border-bottom:2px solid #eee;padding-bottom:4px}
  table{width:100%;border-collapse:collapse;font-size:.88rem}td{padding:6px 8px;border-bottom:1px solid #f0f0f0}
  .tot{font-size:1.25rem;font-weight:800;color:#1a1a1a}.footer{margin-top:28px;font-size:.75rem;color:#aaa;text-align:center}
  @media print{body{padding:14px}}</style></head><body>
  <h2>${negocio}</h2>
  <p>Cierre del día · ${hoy.split('-').reverse().join('/')}</p>
  ${cubRow?`<h3>🛞 Cubiertas vendidas</h3><table><tr><th style="text-align:left">Cubierta</th><th>Cant.</th><th style="text-align:right">Total</th></tr>${cubRow}</table>`:'<p style="color:#888;margin-top:12px">Sin ventas de cubiertas hoy.</p>'}
  ${srvRow?`<h3>🔧 Servicios realizados</h3><table><tr><th style="text-align:left">Servicio</th><th style="text-align:left">Detalle</th><th style="text-align:right">Precio</th></tr>${srvRow}</table>`:''}
  ${pagRow?`<h3>💵 Por forma de pago</h3><table>${pagRow}</table>`:''}
  <h3>💰 Total del día</h3>
  <div style="padding:16px;background:#f9f9f9;border-radius:8px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:.9rem;color:#555">${ventasHoy.length} venta${ventasHoy.length!==1?'s':''} · ${srvHoy.length} servicio${srvHoy.length!==1?'s':''}</span>
    <span class="tot">${fmt(total)}</span>
  </div>
  <div class="footer">Remu Gestión · remugestion.ar</div>
  <script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

// ─── Render lista clientes gomería ───────────────────────────────────────────
async function _iniciarClientesGomeria(){
  S.clientesGomeria = await dbLoadClientesGomeria();
  rClientesGomeria();
}

let _cliGomTab = 'lista';

function setCliGomTab(tab){
  _cliGomTab = tab;
  document.getElementById('cliTab_lista').classList.toggle('active', tab==='lista');
  document.getElementById('cliTab_recordatorios').classList.toggle('active', tab==='recordatorios');
  document.getElementById('cliGomTabLista').style.display = tab==='lista'?'':'none';
  document.getElementById('cliGomTabRecordatorios').style.display = tab==='recordatorios'?'':'none';
  if(tab==='recordatorios') rRecordatoriosGom();
}

function rRecordatoriosGom(){
  const el = document.getElementById('cliGomRecordatorios');
  if(!el) return;
  const hoy = tod();
  const en7d  = new Date(Date.now()+7*864e5).toISOString().slice(0,10);
  const en30d = new Date(Date.now()+30*864e5).toISOString().slice(0,10);
  const en60d = new Date(Date.now()+60*864e5).toISOString().slice(0,10);

  const registros = [];
  S.clientesGomeria.forEach(c=>{
    const hist=(S.historialGomeria||[]).filter(h=>h.cliente_id===c.id).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
    const ult=hist[0];
    if(!ult||(!ult.prox_fecha&&!ult.prox_km)) return;
    let urgencia=5;
    if(ult.prox_fecha){
      if(ult.prox_fecha<hoy) urgencia=1;
      else if(ult.prox_fecha<=en7d) urgencia=2;
      else if(ult.prox_fecha<=en30d) urgencia=3;
      else if(ult.prox_fecha<=en60d) urgencia=4;
    }
    if(ult.prox_km>0&&c.km>0&&(ult.prox_km-c.km)<=2000&&ult.prox_km>=c.km) urgencia=Math.min(urgencia,2);
    registros.push({c,ult,urgencia});
  });

  // actualizar badge
  const urgentes=registros.filter(r=>r.urgencia<=3).length;
  const badge=document.getElementById('cliRecBadge');
  if(badge){ badge.textContent=urgentes; badge.style.display=urgentes?'':'none'; }

  if(!registros.length){
    el.innerHTML='<div style="text-align:center;padding:40px;color:var(--mut);font-size:.82rem">Sin servicios próximos registrados.<br>Al registrar un servicio, podés programar el próximo.</div>';
    return;
  }

  registros.sort((a,b)=>a.urgencia-b.urgencia||(a.ult.prox_fecha||'zzz').localeCompare(b.ult.prox_fecha||'zzz'));

  const grupos=[
    {lbl:'⚠ Vencidos',items:registros.filter(r=>r.urgencia===1),color:'var(--bad)'},
    {lbl:'🔥 Esta semana',items:registros.filter(r=>r.urgencia===2),color:'var(--wrn)'},
    {lbl:'📅 Este mes',items:registros.filter(r=>r.urgencia===3),color:'var(--gld)'},
    {lbl:'🗓 Próximos 60 días',items:registros.filter(r=>r.urgencia===4),color:'var(--tx2)'},
    {lbl:'📆 Más adelante',items:registros.filter(r=>r.urgencia>=5),color:'var(--mut)'},
  ].filter(g=>g.items.length);

  el.innerHTML=grupos.map(g=>`
    <div style="margin-bottom:16px">
      <div style="font-size:.71rem;font-weight:700;color:${g.color};text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">${g.lbl} (${g.items.length})</div>
      ${g.items.map(({c,ult})=>{
        const tel=(c.tel||'').replace(/\D/g,'');
        const negocio=currentTenant?.nombre||'la gomería';
        const veh=[c.marca_veh,c.modelo].filter(Boolean).join(' ')||c.patente;
        const cuandoMsg=[ult.prox_fecha?`el ${_fmtFechaCorta(ult.prox_fecha)}`:'',ult.prox_km?`a los ${ult.prox_km.toLocaleString()} km`:''].filter(Boolean).join(' o ');
        const waMsg=`Hola${c.nombre?' '+c.nombre:''}! 👋 Te contactamos de ${negocio}. Tu vehículo ${veh} tiene pendiente: *${ult.prox_servicio||'servicio programado'}*${cuandoMsg?' para '+cuandoMsg:''}. ¡Avisanos cuando quieras coordinarlo! 🔧`;
        const waBtn=tel?`<a href="https://wa.me/549${tel}?text=${encodeURIComponent(waMsg)}" target="_blank" class="btn bsm" style="background:rgba(37,211,102,.12);color:#25d366;border:1px solid rgba(37,211,102,.3);flex-shrink:0">💬 WA</a>`:'';
        const cuando=[ult.prox_fecha?_fmtFechaCorta(ult.prox_fecha):'',ult.prox_km?ult.prox_km.toLocaleString()+' km':''].filter(Boolean).join(' · ');
        return `<div style="display:flex;align-items:center;padding:10px 12px;background:var(--bg2);border-radius:9px;margin-bottom:6px;gap:10px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-weight:700;font-size:.88rem;letter-spacing:.4px">${esc(c.patente)}</span>
              <span style="font-size:.78rem;color:var(--tx2)">${esc(c.nombre||'')}</span>
            </div>
            <div style="font-size:.76rem;color:var(--tx2);margin-top:2px">${esc(ult.prox_servicio||'servicio programado')}${cuando?' — '+cuando:''}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            ${waBtn}
            <button class="btn bsm" onclick="verHistorialGomeria('${c.id}')">Ver</button>
          </div>
        </div>`;
      }).join('')}
    </div>`).join('');
}

function rClientesGomeria(){
  const q = (document.getElementById('cliGomQ')?.value||'').toLowerCase();
  const tbody = document.getElementById('cliGomTbody');
  const empty = document.getElementById('cliGomEmpty');
  const badge = document.getElementById('cliGomBadge');
  if(!tbody) return;

  let lista = S.clientesGomeria.filter(c=>{
    if(!q) return true;
    return ((c.patente||'')+(c.nombre||'')+(c.tel||'')+(c.instagram||'')).toLowerCase().includes(q);
  });

  if(badge){ badge.textContent=S.clientesGomeria.length; badge.style.display=S.clientesGomeria.length?'':'none'; }

  // Badge de recordatorios
  const hoy = tod();
  const en60dias = new Date(Date.now()+60*24*60*60*1000).toISOString().slice(0,10);
  const urgentes = S.clientesGomeria.filter(c=>{
    const hist=(S.historialGomeria||[]).filter(h=>h.cliente_id===c.id).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
    const ult=hist[0]; if(!ult) return false;
    return (ult.prox_fecha&&ult.prox_fecha<=en60dias)||(ult.prox_km>0&&c.km>0&&(ult.prox_km-c.km)<=2000&&ult.prox_km>=c.km);
  }).length;
  const recBadge=document.getElementById('cliRecBadge');
  if(recBadge){ recBadge.textContent=urgentes; recBadge.style.display=urgentes?'':'none'; }

  // Si estamos en la pestaña recordatorios, refrescar
  if(_cliGomTab==='recordatorios'){ rRecordatoriosGom(); return; }

  if(!lista.length){ tbody.innerHTML=''; if(empty) empty.style.display=''; return; }
  if(empty) empty.style.display='none';

  tbody.innerHTML = lista.map(c=>{
    const hist = (S.historialGomeria||[]).filter(h=>h.cliente_id===c.id);
    const visitas = hist.length;
    const ultima = hist.sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''))[0];
    const proxSrv = ultima?.prox_servicio;
    const proxFecha = ultima?.prox_fecha;
    const proxKm = ultima?.prox_km;
    const alertaFecha = proxFecha && proxFecha<=en60dias;
    const alertaKm = proxKm>0 && c.km>0 && (proxKm-c.km)<=2000 && proxKm>=c.km;
    const alerta = alertaFecha||alertaKm;
    const proxHtml = proxSrv
      ? `<div style="font-size:.7rem;color:${alerta?'var(--wrn)':'var(--tx2)'};margin-top:2px">${alerta?'⏰ ':''}${esc(proxSrv)}${proxFecha?' · '+_fmtFechaCorta(proxFecha):''}${proxKm?' · '+proxKm.toLocaleString()+' km':''}</div>`
      : '';
    return `<tr style="border-bottom:1px solid var(--bor2)">
      <td style="padding:9px 8px;font-weight:700;font-size:.85rem;color:var(--tx);letter-spacing:.5px">${c.patente||'—'}</td>
      <td style="padding:9px 8px">${c.nombre||'—'}</td>
      <td style="padding:9px 8px;white-space:nowrap">
        ${c.tel?`<a href="https://wa.me/549${c.tel.replace(/\D/g,'')}" target="_blank" style="color:#25d366;text-decoration:none;font-size:.78rem">📱 ${c.tel}</a>`:''}
        ${c.instagram?(()=>{const h=c.instagram.replace(/^@/,'');return `<br><a href="https://instagram.com/${h}" target="_blank" style="color:#e1306c;text-decoration:none;font-size:.75rem">📸 @${h}</a>`;})():''}
        ${!c.tel&&!c.instagram?'—':''}
      </td>
      <td style="padding:9px 8px;color:var(--tx2);font-size:.78rem">${[c.marca_veh,c.modelo].filter(Boolean).join(' ')||'—'}</td>
      <td style="padding:9px 8px;text-align:right">${visitas}</td>
      <td style="padding:9px 8px;color:var(--tx2);font-size:.78rem">${ultima ? _fmtFechaCorta(ultima.fecha) : '—'}${proxHtml}</td>
      <td style="padding:9px 8px;text-align:right">${c.saldo>0?`<span style="color:var(--bad);font-weight:700;font-size:.82rem">$${c.saldo.toLocaleString('es-AR')}</span>`:'<span style="color:var(--mut);font-size:.78rem">—</span>'}</td>
      <td style="padding:9px 8px;display:flex;gap:6px">
        <button class="btn bsm" onclick="verFichaVehiculo('${c.id}')">🚗 Ficha</button>
        <button class="btn bsm" onclick="verHistorialGomeria('${c.id}')">📋 Historial</button>
        <button class="btn bsm be" onclick="abrirFormClienteGomeria('${c.id}')">✎</button>
        <button class="btn bsm" style="color:var(--bad);border-color:rgba(201,82,76,.3);background:rgba(201,82,76,.08)" onclick="eliminarClienteGomeria('${c.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');
}

function _fmtFechaCorta(f){
  if(!f) return '—';
  const [y,m,d] = f.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Formulario cliente ───────────────────────────────────────────────────────
function abrirFormClienteGomeria(id=null){
  const c = id ? S.clientesGomeria.find(x=>x.id===id) : null;
  document.getElementById('mCliGomTitle').textContent = c ? 'Editar cliente' : 'Nuevo cliente';
  document.getElementById('cliGomId').value = c?.id||'';
  document.getElementById('cliGomPatente').value = c?.patente||'';
  document.getElementById('cliGomNombre').value = c?.nombre||'';
  document.getElementById('cliGomTel').value = c?.tel||'';
  document.getElementById('cliGomInstagram').value = c?.instagram||'';
  document.getElementById('cliGomKm').value = c?.km||'';
  document.getElementById('cliGomMarcaVeh').value = c?.marca_veh||'';
  document.getElementById('cliGomModelo').value = c?.modelo||'';
  document.getElementById('cliGomNotas').value = c?.notas||'';
  openM('mClienteGomeria', id);
}

async function guardarClienteGomeria(){
  const patente = document.getElementById('cliGomPatente').value.trim().toUpperCase();
  if(!patente){ showToast('La patente es obligatoria','err'); return; }
  const existId = document.getElementById('cliGomId').value;
  const c = {
    id: existId || crypto.randomUUID(),
    patente,
    nombre: document.getElementById('cliGomNombre').value.trim(),
    tel: document.getElementById('cliGomTel').value.trim(),
    instagram: document.getElementById('cliGomInstagram').value.trim(),
    km: parseInt(document.getElementById('cliGomKm').value)||0,
    marca_veh: document.getElementById('cliGomMarcaVeh').value.trim(),
    modelo: document.getElementById('cliGomModelo').value.trim(),
    notas: document.getElementById('cliGomNotas').value.trim()
  };
  closeM('mClienteGomeria');
  const ok = await dbUpsertClienteGomeria(c);
  if(!ok){ showToast('Error al guardar','err'); return; }
  if(existId){ S.clientesGomeria = S.clientesGomeria.map(x=>x.id===existId?c:x); }
  else { S.clientesGomeria.push(c); }
  showToast((existId?'Cliente actualizado':'Cliente guardado')+' ✓');
  rClientesGomeria();
}

function _irAClientes(){
  const rub=(currentTenant?.rubro||'').toLowerCase();
  const esGom=rub.includes('gomeria')||rub.includes('gomería')||rub.includes('neumat')||rub.includes('cubiert');
  go(esGom?'clientesGomeria':'fichasClientes');
  const lbl=document.getElementById('qlClientesLabel');
  if(lbl) lbl.textContent=esGom?'Clientes':'Fichas de clientes';
}

async function eliminarClienteGomeria(id){
  if(!confirm('¿Eliminar este cliente y todo su historial?')) return;
  const ok = await dbDeleteClienteGomeria(id);
  if(!ok){ showToast('Error al eliminar','err'); return; }
  S.clientesGomeria = S.clientesGomeria.filter(c=>c.id!==id);
  S.historialGomeria = (S.historialGomeria||[]).filter(h=>h.cliente_id!==id);
  showToast('Cliente eliminado');
  rClientesGomeria();
}

// ─── Historial de cliente ─────────────────────────────────────────────────────
let _histGomClienteActivo = null;

// ─── Ficha completa del vehículo ──────────────────────────────────────────────
async function verFichaVehiculo(clienteId){
  const c = S.clientesGomeria.find(x=>x.id===clienteId);
  if(!c) return;
  const hist = (S.historialGomeria||[])
    .filter(h=>h.cliente_id===clienteId)
    .sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));

  let ov = document.getElementById('fichaVehOverlay');
  if(!ov){ ov=document.createElement('div'); ov.id='fichaVehOverlay';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:9990;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto';
    ov.onclick=e=>{ if(e.target===ov) ov.remove(); };
    document.body.appendChild(ov); }

  const totalGastado = hist.reduce((s,h)=>s+(h.precio||0),0);
  const proxSrv = hist[0]?.prox_servicio;
  const proxFecha = hist[0]?.prox_fecha;
  const proxKm = hist[0]?.prox_km;

  const lineaTL = h => {
    const itms = h.marca?`${esc(h.tipo||'')} — ${esc(h.marca)}`:(h.tipo||'Servicio');
    return `<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--bor2)">
      <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:0">
        <div style="width:10px;height:10px;border-radius:50%;background:var(--gld);margin-top:4px"></div>
        <div style="width:2px;flex:1;background:var(--bor2);margin-top:4px"></div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div style="font-weight:700;font-size:.85rem">${esc(h.tipo||'Servicio')}</div>
          <div style="font-size:.78rem;color:var(--gld);font-weight:600;flex-shrink:0">${h.precio?'$'+h.precio.toLocaleString():''}</div>
        </div>
        <div style="font-size:.75rem;color:var(--tx2);margin-top:2px">
          ${_fmtFechaCorta(h.fecha)}${h.km?' · '+h.km.toLocaleString()+' km':''}${h.medida?' · '+esc(h.medida):''}${h.marca?' '+esc(h.marca):''}${h.cant>1?' ('+h.cant+' u)':''}
        </div>
        ${h.obs?`<div style="font-size:.73rem;color:var(--mut);margin-top:2px">📝 ${esc(h.obs)}</div>`:''}
        ${h.prox_servicio?`<div style="font-size:.72rem;color:var(--wrn);margin-top:3px">→ Próx: ${esc(h.prox_servicio)}${h.prox_fecha?' · '+_fmtFechaCorta(h.prox_fecha):''}${h.prox_km?' · '+h.prox_km.toLocaleString()+' km':''}</div>`:''}
      </div>
    </div>`;
  };

  ov.innerHTML = `
    <div style="background:var(--sur);border:1px solid var(--bor2);border-radius:16px;width:100%;max-width:480px;max-height:90vh;display:flex;flex-direction:column">
      <div style="padding:16px 20px;border-bottom:1px solid var(--bor);display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
        <div>
          <div style="font-size:1.1rem;font-weight:800;letter-spacing:.5px">${esc(c.patente||'Sin patente')}</div>
          <div style="font-size:.78rem;color:var(--tx2)">${[c.nombre,c.marca_veh,c.modelo].filter(Boolean).join(' · ')||'Vehículo'}</div>
        </div>
        <button onclick="document.getElementById('fichaVehOverlay')?.remove()" style="background:none;border:none;color:var(--tx2);font-size:1.2rem;cursor:pointer">✕</button>
      </div>
      <div style="padding:14px 20px;overflow-y:auto;flex:1">
        <!-- Stats -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">
          <div style="background:var(--bg2);border:1px solid var(--bor);border-radius:9px;padding:10px;text-align:center">
            <div style="font-size:1.3rem;font-weight:800;color:var(--tx)">${hist.length}</div>
            <div style="font-size:.68rem;color:var(--tx2)">Visitas</div>
          </div>
          <div style="background:var(--bg2);border:1px solid var(--bor);border-radius:9px;padding:10px;text-align:center">
            <div style="font-size:1.1rem;font-weight:800;color:var(--ok)">$${totalGastado.toLocaleString('es-AR')}</div>
            <div style="font-size:.68rem;color:var(--tx2)">Total gastado</div>
          </div>
          <div style="background:var(--bg2);border:1px solid var(--bor);border-radius:9px;padding:10px;text-align:center">
            <div style="font-size:1.1rem;font-weight:800;color:var(--tx)">${c.km?c.km.toLocaleString():'-'}</div>
            <div style="font-size:.68rem;color:var(--tx2)">KM actuales</div>
          </div>
        </div>
        ${proxSrv?`<div style="padding:10px 14px;background:rgba(201,148,76,.1);border:1px solid rgba(201,148,76,.25);border-radius:9px;margin-bottom:14px;font-size:.8rem">
          <div style="font-weight:700;color:var(--wrn);margin-bottom:2px">🔔 Próximo servicio</div>
          ${esc(proxSrv)}${proxFecha?' · '+_fmtFechaCorta(proxFecha):''}${proxKm?' · '+proxKm.toLocaleString()+' km':''}
        </div>`:''}
        <!-- Timeline -->
        <div style="font-size:.72rem;color:var(--tx2);text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:8px">Historial de servicios</div>
        ${hist.length ? hist.map(lineaTL).join('') : '<div style="text-align:center;padding:20px;color:var(--mut);font-size:.82rem">Sin servicios registrados</div>'}
      </div>
      <div style="padding:12px 20px;border-top:1px solid var(--bor);display:flex;gap:8px;flex-shrink:0">
        ${c.tel?`<a href="https://wa.me/549${c.tel.replace(/\D/g,'')}" target="_blank" class="btn bsm" style="color:#25d366;border-color:rgba(37,211,102,.3);background:rgba(37,211,102,.08);text-decoration:none">📱 WA</a>`:''}
        ${c.instagram?(()=>{const h=c.instagram.replace(/^@/,'');return `<a href="https://instagram.com/${h}" target="_blank" class="btn bsm" style="color:#e1306c;border-color:rgba(225,48,108,.3);background:rgba(225,48,108,.08);text-decoration:none">📸 IG</a>`;})():''}
        <button class="btn bsm bg" onclick="document.getElementById('fichaVehOverlay')?.remove();verHistorialGomeria('${c.id}')">📋 Ver historial completo</button>
        <button class="btn bsm bg" onclick="document.getElementById('fichaVehOverlay')?.remove();abrirFormServicioGomeria('${c.id}')">+ Nuevo servicio</button>
      </div>
    </div>`;
}

async function verHistorialGomeria(clienteId){
  const c = S.clientesGomeria.find(x=>x.id===clienteId);
  if(!c) return;
  _histGomClienteActivo = c;
  document.getElementById('mHistGomTitle').textContent = `🚗 ${c.patente}`;

  // Ficha del vehículo
  const fichaEl = document.getElementById('mHistGomFicha');
  if(fichaEl){
    const veh = [c.marca_veh,c.modelo].filter(Boolean).join(' ');
    fichaEl.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
      <div>
        <div style="font-size:1.15rem;font-weight:800;letter-spacing:.6px;color:var(--tx)">${esc(c.patente)}</div>
        <div style="font-size:.84rem;color:var(--tx2);margin-top:3px">${esc(c.nombre||'Sin nombre')}${c.tel?` · <a href="https://wa.me/549${c.tel.replace(/\D/g,'')}" target="_blank" style="color:#25d366;text-decoration:none">📱 ${esc(c.tel)}</a>`:''}${c.instagram?(()=>{const h=c.instagram.replace(/^@/,'');return ` · <a href="https://instagram.com/${h}" target="_blank" style="color:#e1306c;text-decoration:none">📸 @${h}</a>`;})():''}</div>
        ${veh||c.km?`<div style="font-size:.78rem;color:var(--mut);margin-top:2px">${veh?esc(veh):''}${c.km?' · '+c.km.toLocaleString()+' km':''}</div>`:''}
      </div>
      ${c.notas?`<div style="font-size:.76rem;color:var(--mut);font-style:italic;max-width:200px;text-align:right">${esc(c.notas)}</div>`:''}
    </div>`;
  }

  const historial = await dbLoadHistorialGomeria(clienteId);
  S.historialGomeria = [...(S.historialGomeria||[]).filter(h=>h.cliente_id!==clienteId), ...historial];

  // Stats
  const statsEl = document.getElementById('mHistGomStats');
  if(statsEl){
    const totalGastado = historial.reduce((a,h)=>a+(h.precio||0),0);
    const totalCub = historial.filter(h=>h.tipo==='Cambio de cubiertas').reduce((a,h)=>a+(h.cant_cubiertas||0),0);
    const ultFecha = historial.length?_fmtFechaCorta(historial[0].fecha):'—';
    const _sc=(lbl,val)=>`<div style="background:var(--bg3,var(--bg));border:1px solid var(--bor2);border-radius:8px;padding:10px;text-align:center"><div style="font-size:.6rem;color:var(--tx2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">${lbl}</div><div style="font-size:.96rem;font-weight:800;color:var(--tx)">${val}</div></div>`;
    statsEl.innerHTML=_sc('Visitas',historial.length)+_sc('Cubiertas colocadas',totalCub)+_sc('Total gastado',fmt(totalGastado))+_sc('Última visita',ultFecha);
  }

  // Próximo servicio
  const proxEl = document.getElementById('mHistGomProximo');
  const ult = historial[0];
  if(proxEl){
    if(ult?.prox_servicio){
      const hoy=tod();
      const vencido=ult.prox_fecha&&ult.prox_fecha<hoy;
      const pronto=ult.prox_fecha&&ult.prox_fecha<=new Date(Date.now()+30*864e5).toISOString().slice(0,10);
      const color=vencido?'var(--bad)':pronto?'var(--wrn)':'var(--gld)';
      const cuando=[ult.prox_fecha?_fmtFechaCorta(ult.prox_fecha):'',ult.prox_km?'a los '+ult.prox_km.toLocaleString()+' km':''].filter(Boolean).join(' · ');
      proxEl.innerHTML=`<div style="background:${vencido?'rgba(201,82,76,.07)':'rgba(201,168,76,.06)'};border:1px solid ${color}44;border-radius:10px;padding:12px 14px">
        <div style="font-size:.67rem;text-transform:uppercase;letter-spacing:.5px;color:${color};font-weight:700;margin-bottom:4px">${vencido?'⚠ Servicio vencido':'⏰ Próximo servicio'}</div>
        <div style="font-size:.88rem;font-weight:600">${esc(ult.prox_servicio)}</div>
        ${cuando?`<div style="font-size:.78rem;color:var(--tx2);margin-top:3px">${cuando}</div>`:''}
      </div>`;
      proxEl.style.display='';
    } else { proxEl.style.display='none'; }
  }

  // WA button visibility
  const waBtn=document.getElementById('mHistGomWABtn');
  if(waBtn) waBtn.style.display=c.tel?'':'none';

  // Panel cuenta corriente
  const saldoEl = document.getElementById('mHistGomSaldo');
  if(saldoEl){
    if(c.saldo > 0){
      saldoEl.style.display = '';
      saldoEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(201,82,76,.1);border:1px solid rgba(201,82,76,.3);border-radius:9px;padding:12px 16px">
        <div>
          <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.4px;color:var(--bad);font-weight:700">Cuenta corriente pendiente</div>
          <div style="font-size:1.3rem;font-weight:900;color:var(--bad)">${fmt(c.saldo)}</div>
        </div>
        <button class="btn bsm" style="color:var(--ok);border-color:rgba(76,175,125,.4);background:rgba(76,175,125,.1)" onclick="cobrarCuentaCorriente('${c.id}')">💰 Cobrar</button>
      </div>`;
    } else {
      saldoEl.style.display = 'none';
    }
  }

  _renderHistorialGomeria(historial);
  openM('mHistorialGomeria');
}

async function cobrarCuentaCorriente(clienteId){
  const c = S.clientesGomeria.find(x=>x.id===clienteId);
  if(!c) return;
  _mostrarAjusteNum(`💰 Cobrar cuenta corriente — ${c.patente||c.nombre}`,
    `Saldo actual: ${fmt(c.saldo)}. Ingresá el monto cobrado:`,
    async (monto) => {
      if(monto <= 0 || monto > c.saldo + 0.01){ showToast('Monto inválido','err'); return; }
      const anterior = c.saldo;
      c.saldo = Math.max(0, Math.round((c.saldo - monto) * 100) / 100);
      const ok = await dbUpsertClienteGomeria(c);
      if(!ok){ c.saldo = anterior; showToast('Error al guardar','err'); return; }
      // registrar ingreso en caja
      await sb.from('mov_caja').insert({
        tenant_id: currentTenant.id, fecha: tod(), tipo:'ingreso',
        monto, descripcion:`Cobro CC — ${c.patente||c.nombre}`,
        metodo_pago:'Efectivo', origen:'gomeria'
      }).then(({error})=>{ if(error) console.warn('[movCaja] cobro CC:', error.message); });
      showToast(`✓ Cobrado ${fmt(monto)}. Saldo restante: ${fmt(c.saldo)}`);
      verHistorialGomeria(clienteId);
      rClientesGomeria();
    }
  );
}

function _mostrarAjusteNum(titulo, desc, onConfirm){
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--bor);border-radius:14px;padding:24px;width:100%;max-width:300px">
      <div style="font-weight:700;font-size:.95rem;margin-bottom:4px">${titulo}</div>
      <div style="font-size:.78rem;color:var(--mut);margin-bottom:14px">${desc}</div>
      <input id="_ajusteNumInp" type="number" min="1" placeholder="Monto" style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--bor);background:var(--bg);color:var(--tx);font-size:1rem;text-align:center;outline:none;margin-bottom:14px">
      <div style="display:flex;gap:8px">
        <button class="btn" style="flex:1" id="_ajusteNumCancel">Cancelar</button>
        <button class="btn bg" style="flex:1" id="_ajusteNumOk">Confirmar</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  const inp = ov.querySelector('#_ajusteNumInp');
  ov.querySelector('#_ajusteNumCancel').onclick = () => ov.remove();
  inp.focus();
  const apply = async () => {
    const val = parseFloat(inp.value);
    if(isNaN(val) || val <= 0){ inp.style.borderColor='var(--bad)'; return; }
    ov.remove();
    await onConfirm(val);
  };
  ov.querySelector('#_ajusteNumOk').onclick = apply;
  inp.onkeydown = e => { if(e.key==='Enter') apply(); };
}

function _waClienteGom(){
  const c=_histGomClienteActivo;
  if(!c||!c.tel) return;
  const tel=(c.tel||'').replace(/\D/g,'');
  const negocio=currentTenant?.nombre||'la gomería';
  window.open(`https://wa.me/549${tel}?text=${encodeURIComponent('Hola'+(c.nombre?' '+c.nombre:'')+' 👋 Te contactamos de '+negocio+'.')}`, '_blank');
}

const _tipoIcoGom={'Cambio de cubiertas':'🛞','Rotación de cubiertas':'🔄','Alineación':'⚙️','Balanceo':'⚙️','Alineación y balanceo':'⚙️','Reparación de pinchadura':'🩹','Cambio de válvula':'🔧','Control de presión':'💨'};

function _renderHistorialGomeria(lista){
  const el=document.getElementById('mHistGomLista');
  if(!el) return;
  if(!lista.length){ el.innerHTML='<div style="text-align:center;padding:28px;color:var(--mut);font-size:.82rem">Sin servicios registrados. Usá "+ Registrar servicio" para empezar.</div>'; return; }
  el.innerHTML=lista.map(s=>{
    const ico=_tipoIcoGom[s.tipo]||'🔧';
    const esCub=s.tipo==='Cambio de cubiertas'||s.tipo==='Rotación de cubiertas';
    const cubInfo=esCub&&s.medida?`<div style="font-size:.76rem;color:var(--tx2);margin-top:3px">🛞 ${esc(s.medida)}${s.marca?' · '+esc(s.marca):''}${s.cant_cubiertas?' · '+s.cant_cubiertas+' unid.':''}${s.km_rotacion?' · Rotac. en +'+s.km_rotacion.toLocaleString()+' km':''}</div>`:'';
    const proxRot=s.km_rotacion&&s.km?`<div style="font-size:.73rem;color:var(--gld);margin-top:2px">⏱ Próx. rotación: ~${(s.km+s.km_rotacion).toLocaleString()} km</div>`:'';
    const proxSrv=s.prox_servicio?`<div style="font-size:.73rem;color:var(--mut);margin-top:3px;border-top:1px solid var(--bor2);padding-top:5px">⏰ Programado: <strong>${esc(s.prox_servicio)}</strong>${s.prox_fecha?' · '+_fmtFechaCorta(s.prox_fecha):''}${s.prox_km?' · '+s.prox_km.toLocaleString()+' km':''}</div>`:'';
    return `<div style="border:1px solid var(--bor2);border-radius:10px;padding:12px 14px;margin-bottom:8px;background:var(--bg);display:flex;gap:12px;align-items:flex-start">
      <div style="font-size:1.25rem;margin-top:1px;flex-shrink:0">${ico}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:.87rem">${esc(s.tipo)}</div>
            ${cubInfo}${proxRot}
            ${s.obs?`<div style="font-size:.75rem;color:var(--tx2);margin-top:3px">${esc(s.obs)}</div>`:''}
            ${proxSrv}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:.77rem;color:var(--tx2)">${_fmtFechaCorta(s.fecha)}</div>
            ${s.km?`<div style="font-size:.73rem;color:var(--mut)">${s.km.toLocaleString()} km</div>`:''}
            ${s.precio?`<div style="font-weight:700;font-size:.85rem;color:var(--gld);margin-top:2px">${fmt(s.precio)}</div>`:''}
            ${s.pago?`<div style="font-size:.7rem;color:var(--mut)">${esc(s.pago)}</div>`:''}
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:7px">
          <button class="btn bsm" style="color:var(--bad);border-color:rgba(201,82,76,.3);background:rgba(201,82,76,.08);font-size:.71rem" onclick="eliminarServicioGomeria('${s.id}')">Eliminar</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function _abrirNuevoServicio(){
  if(!_histGomClienteActivo) return;
  closeM('mHistorialGomeria');
  abrirFormServicioGomeria(_histGomClienteActivo.id);
}

function cliGomSearchEnter(e){
  if(e.key!=='Enter') return;
  const q=(e.target.value||'').trim().toUpperCase();
  if(!q) return;
  const exacto=S.clientesGomeria.find(c=>(c.patente||'').toUpperCase()===q);
  if(exacto){ verHistorialGomeria(exacto.id); return; }
  const res=S.clientesGomeria.filter(c=>(c.patente+c.nombre+c.tel).toLowerCase().includes(q.toLowerCase()));
  if(res.length===1) verHistorialGomeria(res[0].id);
}

// ─── Formulario registrar servicio ───────────────────────────────────────────
function abrirFormServicioGomeria(clienteId){
  const c = S.clientesGomeria.find(x=>x.id===clienteId);
  if(!c) return;
  document.getElementById('srvGomClienteId').value = clienteId;
  const info = document.getElementById('srvGomClienteInfo');
  if(info) info.innerHTML = `<span style="font-weight:600">${c.patente}</span> · ${c.nombre||'Sin nombre'}${c.km?' · '+c.km.toLocaleString()+' km':''}`;
  document.getElementById('srvGomFecha').value = tod();
  document.getElementById('srvGomKm').value = c.km||'';
  document.getElementById('srvGomTipo').value = '';
  document.getElementById('srvGomCubiertasBloque').style.display='none';
  document.getElementById('srvGomMedida').value='';
  document.getElementById('srvGomMarca').value='';
  document.getElementById('srvGomCantCub').value='4';
  document.getElementById('srvGomKmRotacion').value='10000';
  document.getElementById('srvGomPrecio').value='';
  document.getElementById('srvGomPago').value='Efectivo';
  document.getElementById('srvGomObs').value='';
  document.getElementById('srvGomProxTipo').value='';
  document.getElementById('srvGomProxFecha').value='';
  document.getElementById('srvGomProxKm').value='';
  // Autocompletar medidas y marcas desde stock de cubiertas
  const medidas = [...new Set(S.cubiertas.map(x=>x.medida).filter(Boolean))];
  const marcas  = [...new Set(S.cubiertas.map(x=>x.marca).filter(Boolean))];
  const dlMedidas = document.getElementById('srvGomMedidasList');
  const dlMarcas  = document.getElementById('srvGomMarcasList');
  if(dlMedidas) dlMedidas.innerHTML = medidas.map(m=>`<option value="${m}">`).join('');
  if(dlMarcas)  dlMarcas.innerHTML  = marcas.map(m=>`<option value="${m}">`).join('');
  openM('mServicioGomeria');
  // openM resetea todos los inputs — seteamos los valores DESPUÉS
  document.getElementById('srvGomClienteId').value = clienteId;
  document.getElementById('srvGomFecha').value = tod();
  document.getElementById('srvGomKm').value = c.km||'';
  document.getElementById('srvGomPago').value = 'Efectivo';
  // Poblar select de tipos desde lista personalizada
  const _servs = _getGomServicios();
  document.getElementById('srvGomTipo').innerHTML =
    '<option value="">— Seleccionar —</option>' +
    _servs.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('') +
    '<option value="__otro__">Otro (nuevo)...</option>';
  document.getElementById('srvGomTipoOtroBox').style.display='none';
  // Poblar marcas desde lista personalizada + stock
  const _marcasCfg = _getGomMarcas();
  const _marcasStock = [...new Set((S.cubiertas||[]).map(x=>x.marca).filter(Boolean))];
  const _marcasTodas = [...new Set([..._marcasCfg, ..._marcasStock])];
  document.getElementById('srvGomMarcasList').innerHTML = _marcasTodas.map(m=>`<option value="${esc(m)}">`).join('');
}

function _srvGomTipoChange(){
  const tipo = document.getElementById('srvGomTipo').value;
  const bloque = document.getElementById('srvGomCubiertasBloque');
  const otroBox = document.getElementById('srvGomTipoOtroBox');
  if(bloque) bloque.style.display = (tipo==='Cambio de cubiertas'||tipo==='Rotación de cubiertas') ? '' : 'none';
  if(otroBox) otroBox.style.display = tipo==='__otro__' ? '' : 'none';
}

async function guardarServicioGomeria(){
  const clienteId = document.getElementById('srvGomClienteId').value;
  const tipo = document.getElementById('srvGomTipo').value;
  if(!clienteId){ showToast('Error: cliente no identificado. Cerrá y volvé a abrir el historial.','err'); return; }
  if(!tipo || tipo==='__otro__'){ showToast('Completá el nombre del servicio nuevo primero','err'); return; }
  const esCubierta = tipo==='Cambio de cubiertas'||tipo==='Rotación de cubiertas';
  const s = {
    id: crypto.randomUUID(),
    cliente_id: clienteId,
    fecha: document.getElementById('srvGomFecha').value || tod(),
    km: parseInt(document.getElementById('srvGomKm').value)||0,
    tipo,
    medida: esCubierta ? document.getElementById('srvGomMedida').value.trim() : '',
    marca: esCubierta ? document.getElementById('srvGomMarca').value.trim() : '',
    cant_cubiertas: esCubierta ? parseInt(document.getElementById('srvGomCantCub').value)||1 : 0,
    km_rotacion: esCubierta ? parseInt(document.getElementById('srvGomKmRotacion').value)||0 : 0,
    precio: parseFloat(document.getElementById('srvGomPrecio').value)||0,
    pago: document.getElementById('srvGomPago').value,
    obs: document.getElementById('srvGomObs').value.trim(),
    prox_servicio: document.getElementById('srvGomProxTipo').value.trim(),
    prox_fecha: document.getElementById('srvGomProxFecha').value||null,
    prox_km: parseInt(document.getElementById('srvGomProxKm').value)||0
  };
  closeM('mServicioGomeria');
  const ok = await dbUpsertServicioGomeria(s);
  if(!ok){ showToast('Error al guardar servicio','err'); return; }
  if(!S.historialGomeria) S.historialGomeria=[];
  S.historialGomeria.push(s);
  // Actualizar km del cliente si es mayor al registrado
  const c = S.clientesGomeria.find(x=>x.id===clienteId);
  if(c && s.km > (c.km||0)){
    c.km = s.km;
    await dbUpsertClienteGomeria(c);
  }
  showToast('Servicio registrado ✓');
  // Integración caja: registrar cobro en mov_caja si tiene precio
  if(s.precio > 0){
    const c = S.clientesGomeria.find(x=>x.id===clienteId);
    const desc = `Gomería — ${s.tipo}${c?(' · '+(c.patente||c.nombre||'')):''}`;
    await sb.from('mov_caja').insert({
      tenant_id: currentTenant.id,
      fecha: s.fecha,
      tipo: 'ingreso',
      monto: s.precio,
      descripcion: desc,
      metodo_pago: s.pago||'Efectivo',
      origen: 'gomeria',
      referencia_id: s.id
    }).then(({error})=>{ if(error) console.warn('[movCaja] gomería insert:', error.message); });
  }
  rClientesGomeria();
  // Volver a abrir historial actualizado
  await verHistorialGomeria(clienteId);
}

async function eliminarServicioGomeria(id){
  if(!confirm('¿Eliminar este servicio del historial?')) return;
  const ok = await dbDeleteServicioGomeria(id);
  if(!ok){ showToast('Error al eliminar','err'); return; }
  S.historialGomeria = (S.historialGomeria||[]).filter(s=>s.id!==id);
  showToast('Servicio eliminado');
  rClientesGomeria();
  if(_histGomClienteActivo) await verHistorialGomeria(_histGomClienteActivo.id);
}

async function dbUpsertPedido(p){
  setSyncing();
  const row = {
    id: p.id,
    nombre: p.nombre||'',
    tel: p.tel||'',
    producto: p.producto||'',
    precio: p.precio||0,
    fecha: p.fecha||tod(),
    notas: p.notas||'',
    estado: p.estado||'pendiente',
    tenant_id: currentTenant.id
  };
  if(p.fechaLlego) row.fechaLlego = p.fechaLlego;
  if(p.fechaEntregado) row.fechaEntregado = p.fechaEntregado;
  try{
    const { error } = await sb.from('pedidos').upsert(row, { onConflict: 'id' });
    if(error){ console.error('[pedidos] upsert error:', JSON.stringify(error)); throw error; }
    setSynced(); return true;
  }catch(e){ console.error('[pedidos] catch:', e?.message); setSyncErr(e?.message||''); return false; }
}

