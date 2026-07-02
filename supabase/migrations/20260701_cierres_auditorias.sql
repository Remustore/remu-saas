-- Historial de cierres de caja diarios
create table if not exists cierres_caja (
  id         bigserial primary key,
  tenant_id  uuid    not null references tenants(id) on delete cascade,
  fecha      date    not null,
  hora       text,
  total      numeric not null default 0,
  metodos    jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cierres_caja_tenant_idx
  on cierres_caja(tenant_id, created_at desc);

alter table cierres_caja enable row level security;

create policy "tenant_full_access" on cierres_caja
  for all
  using (tenant_id::text = coalesce(
    auth.jwt()->'user_metadata'->>'tenant_id',
    (auth.jwt()->>'sub')
  ))
  with check (tenant_id::text = coalesce(
    auth.jwt()->'user_metadata'->>'tenant_id',
    (auth.jwt()->>'sub')
  ));

-- Historial de auditorías de stock
create table if not exists auditorias (
  id               bigserial primary key,
  tenant_id        uuid    not null references tenants(id) on delete cascade,
  producto_id      integer,
  nombre           text    not null,
  fecha            date    not null,
  cantidad_sistema integer,
  cantidad_real    integer,
  diferencia       integer,
  motivo           text,
  created_at       timestamptz not null default now()
);

create index if not exists auditorias_tenant_idx
  on auditorias(tenant_id, fecha desc);

alter table auditorias enable row level security;

create policy "tenant_full_access" on auditorias
  for all
  using (tenant_id::text = coalesce(
    auth.jwt()->'user_metadata'->>'tenant_id',
    (auth.jwt()->>'sub')
  ))
  with check (tenant_id::text = coalesce(
    auth.jwt()->'user_metadata'->>'tenant_id',
    (auth.jwt()->>'sub')
  ));
