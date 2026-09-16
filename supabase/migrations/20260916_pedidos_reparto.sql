-- Pedidos de entrega para el módulo Remu Entregas (rubro: reparto)
create table if not exists pedidos_reparto (
  id         bigint primary key,
  tenant_id  uuid not null references tenants(id) on delete cascade,
  data       jsonb
);

create index if not exists pedidos_reparto_tenant_idx on pedidos_reparto(tenant_id);

alter table pedidos_reparto enable row level security;

create policy "tenant_full_access" on pedidos_reparto
  for all
  using (tenant_id::text = coalesce(
    auth.jwt()->'user_metadata'->>'tenant_id',
    (auth.jwt()->>'sub')
  ))
  with check (tenant_id::text = coalesce(
    auth.jwt()->'user_metadata'->>'tenant_id',
    (auth.jwt()->>'sub')
  ));
