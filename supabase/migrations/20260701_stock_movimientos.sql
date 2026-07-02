-- Historial de movimientos de stock (antes guardado solo en localStorage)
create table if not exists stock_movimientos (
  id           bigserial primary key,
  tenant_id    uuid    not null references tenants(id) on delete cascade,
  producto_id  integer,
  nombre       text    not null,
  cantidad     integer not null,
  tipo         text    not null, -- 'venta', 'devolucion', 'ajuste', 'auditoria'
  motivo       text,
  fecha        date    not null,
  hora         text,
  created_at   timestamptz not null default now()
);

create index if not exists stock_movimientos_tenant_idx
  on stock_movimientos(tenant_id, created_at desc);

alter table stock_movimientos enable row level security;

-- Permite acceso total a quien tenga el tenant_id correcto en su JWT
create policy "tenant_full_access" on stock_movimientos
  for all
  using (tenant_id::text = coalesce(
    auth.jwt()->'user_metadata'->>'tenant_id',
    (auth.jwt()->>'sub')
  ))
  with check (tenant_id::text = coalesce(
    auth.jwt()->'user_metadata'->>'tenant_id',
    (auth.jwt()->>'sub')
  ));
