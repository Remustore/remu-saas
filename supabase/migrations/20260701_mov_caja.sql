-- Movimientos de caja diarios (antes guardados solo en localStorage via dbSetConfig)
create table if not exists mov_caja (
  id         bigint primary key,
  tenant_id  uuid not null references tenants(id) on delete cascade,
  data       jsonb
);

create index if not exists mov_caja_tenant_idx on mov_caja(tenant_id);

alter table mov_caja enable row level security;

create policy "tenant_full_access" on mov_caja
  for all
  using (tenant_id::text = coalesce(
    auth.jwt()->'user_metadata'->>'tenant_id',
    (auth.jwt()->>'sub')
  ))
  with check (tenant_id::text = coalesce(
    auth.jwt()->'user_metadata'->>'tenant_id',
    (auth.jwt()->>'sub')
  ));
