-- Presupuestos de equipos y servicios (talleres de reparación / telefonía)
create table if not exists presupuestos (
  id         bigint primary key,
  tenant_id  uuid not null references tenants(id) on delete cascade,
  data       jsonb
);

create index if not exists presupuestos_tenant_idx on presupuestos(tenant_id);

alter table presupuestos enable row level security;

create policy "tenant_full_access" on presupuestos
  for all
  using (tenant_id::text = coalesce(
    auth.jwt()->'user_metadata'->>'tenant_id',
    (auth.jwt()->>'sub')
  ))
  with check (tenant_id::text = coalesce(
    auth.jwt()->'user_metadata'->>'tenant_id',
    (auth.jwt()->>'sub')
  ));
