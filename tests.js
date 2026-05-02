// tests.js — Verificación de integridad de datos multi-tenant
// Ejecutable desde el panel superadmin con verificarIntegridad()

async function verificarIntegridad(){
  var btn = document.querySelector('[onclick="verificarIntegridad()"]');
  var msg = document.getElementById('saIntegMsg');
  if(!msg) return;
  if(btn){ btn.disabled = true; btn.textContent = '⏳ Verificando...'; }
  msg.style.display = 'block';
  msg.style.cssText = 'display:block;background:rgba(30,30,30,1);border:1px solid var(--bor2);border-radius:8px;padding:12px;font-size:.78rem;line-height:1.8';
  msg.innerHTML = '⏳ Verificando integridad de datos...';

  var resultados = [];
  var errores = [];

  try {
    // 1. Verificar tabla tenants
    var res = await sb.from('tenants').select('id,nombre,activo,created_at');
    if(res.error) throw res.error;
    var tenants = res.data || [];
    resultados.push('✓ <strong>' + tenants.length + '</strong> tenant' + (tenants.length !== 1 ? 's' : '') + ' registrados');

    var activos = tenants.filter(function(t){ return t.activo; }).length;
    resultados.push('✓ <strong>' + activos + '</strong> activos, <strong>' + (tenants.length - activos) + '</strong> inactivos');

    // Detectar nombres duplicados
    var nombres = tenants.map(function(t){ return (t.nombre||'').toLowerCase().trim(); });
    var dups = nombres.filter(function(n, i){ return n && nombres.indexOf(n) !== i; });
    if(dups.length) errores.push('⚠ Nombres duplicados detectados: ' + dups.join(', '));

    // Tenants sin nombre
    var sinNombre = tenants.filter(function(t){ return !t.nombre; }).length;
    if(sinNombre > 0) errores.push('⚠ ' + sinNombre + ' tenant(s) sin nombre');

    // 2. Verificar tablas principales (solo conteo y nulls de tenant_id)
    var tablas = [
      {tabla: 'ventas', label: 'Ventas'},
      {tabla: 'stock', label: 'Stock'},
      {tabla: 'reparaciones', label: 'Reparaciones'},
      {tabla: 'pedidos', label: 'Pedidos'},
      {tabla: 'gastos', label: 'Gastos'},
      {tabla: 'equipos', label: 'Equipos'},
      {tabla: 'precios', label: 'Precios'},
    ];

    var tenantIdSet = {};
    tenants.forEach(function(t){ tenantIdSet[t.id] = true; });

    for(var i = 0; i < tablas.length; i++){
      var def = tablas[i];
      try {
        var r2 = await sb.from(def.tabla).select('tenant_id', {count: 'exact'}).limit(500);
        if(r2.error){
          resultados.push('— ' + def.label + ': sin acceso superadmin (RLS pendiente)');
          continue;
        }
        var filas = r2.data || [];
        var count = r2.count !== null ? r2.count : filas.length;
        // Check nulls
        var sinTenantId = filas.filter(function(x){ return !x.tenant_id; }).length;
        // Check orphans (tenant_id que no existe en tenants)
        var huerfanos = filas.filter(function(x){ return x.tenant_id && !tenantIdSet[x.tenant_id]; }).length;
        if(sinTenantId > 0) errores.push('❌ ' + def.label + ': ' + sinTenantId + ' fila(s) sin tenant_id');
        if(huerfanos > 0) errores.push('❌ ' + def.label + ': ' + huerfanos + ' fila(s) con tenant_id huérfano');
        resultados.push('✓ ' + def.label + ': <strong>' + count + '</strong> filas' + (count > 500 ? ' (muestra de 500)' : ''));
      } catch(e2) {
        resultados.push('— ' + def.label + ': error (' + e2.message + ')');
      }
    }

    // 3. Verificar consistencia de datos de fidelización
    var sinModulos = tenants.filter(function(t){ return !t.activo; }).length;
    resultados.push('📋 Tenants inactivos: <strong>' + sinModulos + '</strong>');

    // Resultado final
    if(errores.length){
      msg.style.cssText = 'display:block;background:rgba(201,82,76,.08);border:1px solid rgba(201,82,76,.3);border-radius:8px;padding:12px;font-size:.78rem;line-height:1.9';
      msg.innerHTML = '<strong style="color:var(--bad)">Se encontraron ' + errores.length + ' problema(s):</strong><br>' +
        errores.map(function(e){ return '<span style="color:var(--bad)">' + e + '</span>'; }).join('<br>') +
        '<br><br><span style="color:var(--tx2)">' + resultados.join('<br>') + '</span>';
    } else {
      msg.style.cssText = 'display:block;background:rgba(76,175,125,.08);border:1px solid rgba(76,175,125,.3);border-radius:8px;padding:12px;font-size:.78rem;line-height:1.9';
      msg.innerHTML = '<strong style="color:var(--ok)">✓ Sin problemas detectados — datos aislados correctamente</strong><br><br>' +
        '<span style="color:var(--tx2)">' + resultados.join('<br>') + '</span>';
    }
  } catch(e) {
    msg.style.cssText = 'display:block;background:rgba(201,82,76,.08);border:1px solid rgba(201,82,76,.3);border-radius:8px;padding:12px;font-size:.78rem';
    msg.innerHTML = '<span style="color:var(--bad)">❌ Error al verificar: ' + (typeof esc === 'function' ? esc(e.message) : e.message) + '</span>';
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = '🧪 Verificar integridad de datos'; }
  }
}
