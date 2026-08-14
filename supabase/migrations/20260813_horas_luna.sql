create table if not exists horas_luna (
  id           bigint      primary key,
  tenant_id    uuid        not null references tenants(id) on delete cascade,
  fecha        date        not null,
  horas        numeric(4,1) not null,
  tarifa       integer     not null,
  monto        integer     not null,
  pagado       boolean     not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists horas_luna_tenant_fecha_idx
  on horas_luna(tenant_id, fecha desc);

alter table horas_luna enable row level security;

create policy "tenant_full_access" on horas_luna
  for all
  using (tenant_id::text = coalesce(
    auth.jwt()->'user_metadata'->>'tenant_id',
    (auth.jwt()->>'sub')
  ))
  with check (tenant_id::text = coalesce(
    auth.jwt()->'user_metadata'->>'tenant_id',
    (auth.jwt()->>'sub')
  ));
